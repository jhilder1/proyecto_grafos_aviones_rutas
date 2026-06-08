from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.services.data_loader import DataLoader
from app.services.itinerary_service import construir_itinerario
from app.services.algoritmos import Algoritmos
import os
import json

router = APIRouter()

# Load graph into memory at startup (simple singleton for this scope)
JSON_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "network.json")
try:
    grafo_global = DataLoader.load_graph_from_json(JSON_PATH)
except Exception as e:
    print(f"Error loading graph: {e}")
    grafo_global = None


# ── Request Models ──────────────────────────────────────────────

class MaxDestinosRequest(BaseModel):
    origen: str
    presupuesto: float
    tiempoDisponible: float  # hours
    excluirSecundarios: bool = False
    tiposTransporte: Optional[List[str]] = None


class MejorRutaRequest(BaseModel):
    origen: str
    destino: str
    criterios: List[str]  # ["distancia", "costo", "tiempo"]
    excluirSecundarios: bool = False
    tiposTransporte: Optional[List[str]] = None


class RouteToggleRequest(BaseModel):
    origen: str
    destino: str
    activa: bool


class ConfigUpdateRequest(BaseModel):
    aeronaves: Dict[str, Dict[str, float]]


# ── Endpoints ───────────────────────────────────────────────────

@router.get("/network")
async def get_network():
    """Returns the full graph data for visualization."""
    try:
        if not grafo_global:
            raise HTTPException(status_code=500, detail="El grafo no pudo ser cargado.")
        return grafo_global.to_dict()
    except Exception as e:
        print("ERROR EN /network:", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/network/upload")
async def upload_network(data: Dict[str, Any]):
    """Receives a full JSON network structure, saves it, and reloads."""
    global grafo_global
    try:
        with open(JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        grafo_global = DataLoader.load_graph_from_json(JSON_PATH)
        return {"message": "Network uploaded and reloaded successfully"}
    except Exception as e:
        print("ERROR EN /network/upload:", e)
        raise HTTPException(status_code=500, detail=f"Error processing network data: {str(e)}")


@router.post("/config/update")
async def update_config(req: ConfigUpdateRequest):
    """Updates the aircraft configuration in the JSON file and memory."""
    global grafo_global
    try:
        if not os.path.exists(JSON_PATH):
            raise FileNotFoundError("network.json not found")
        
        with open(JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        if "configuracionGlobal" not in data:
            data["configuracionGlobal"] = {}
            
        data["configuracionGlobal"]["aeronaves"] = req.aeronaves
        
        with open(JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
            
        grafo_global = DataLoader.load_graph_from_json(JSON_PATH)
        return {"message": "Configuration updated successfully"}
    except Exception as e:
        print("ERROR EN /config/update:", e)
        raise HTTPException(status_code=500, detail=f"Error updating configuration: {str(e)}")


@router.get("/airport/{iata}")
async def get_airport(iata: str):
    """Returns detailed information about a specific airport."""
    if not grafo_global:
        raise HTTPException(status_code=500, detail="El grafo no pudo ser cargado.")
    vertice = grafo_global.obtener_vertice(iata.upper())
    if not vertice:
        raise HTTPException(status_code=404, detail="Aeropuerto no encontrado.")
    data = vertice.to_dict()
    data["aeronaves_operando"] = grafo_global.obtener_aeronaves_desde(iata.upper())
    data["rutas_salientes"] = grafo_global.obtener_rutas_desde(iata.upper())
    return data


@router.get("/airport/{iata}/neighbors")
async def get_airport_neighbors(iata: str):
    """
    R2.3: Returns all reachable destinations from an airport with detailed
    cost/time information per aircraft type for the free exploration mode.
    """
    if not grafo_global:
        raise HTTPException(status_code=500, detail="El grafo no pudo ser cargado.")
    vertice = grafo_global.obtener_vertice(iata.upper())
    if not vertice:
        raise HTTPException(status_code=404, detail="Aeropuerto no encontrado.")

    config_aeronaves = grafo_global.config_global.get("aeronaves", {})
    neighbors = []

    for arista in vertice.adyacencias:
        if hasattr(arista, "activa") and not arista.activa:
            continue

        dest = arista.vertice_destino
        opciones_aeronave = []
        for tipo in arista.aeronaves:
            if tipo not in config_aeronaves:
                continue
            costo_km = config_aeronaves[tipo]["costoKm"]
            tiempo_km = config_aeronaves[tipo]["tiempoKm"]
            
            # costoBase == 0 → ruta subsidiada (gratuita)
            # costoBase != 0 → costo = distancia × costo_por_km
            costo_calc = 0 if arista.costoBase == 0 else arista.distanciaKm * costo_km
            
            opciones_aeronave.append({
                "tipo": tipo,
                "costo": round(costo_calc, 2),
                "tiempo": round(arista.distanciaKm * tiempo_km, 2)
            })

        neighbors.append({
            "destino_id": dest.identificador,
            "nombre": dest.nombre,
            "ciudad": dest.ciudad,
            "pais": dest.pais,
            "esHub": dest.esHub,
            "distanciaKm": arista.distanciaKm,
            "costoBase": arista.costoBase,
            "estanciaMinima": arista.estanciaMinima,
            "opciones_aeronave": opciones_aeronave
        })

    return {"origen": iata.upper(), "destinos": neighbors}


@router.post("/plan/maximize")
async def plan_maximize_destinations(req: MaxDestinosRequest):
    """
    R2.2a & R2.2b: Proposes two itineraries:
    a) Max destinations within budget
    b) Max destinations within time
    """
    if not grafo_global:
        raise HTTPException(status_code=500, detail="Error cargando grafo")

    origen = req.origen.upper()
    if origen not in grafo_global.vertices:
        raise HTTPException(status_code=404, detail=f"Aeropuerto origen '{origen}' no encontrado")

    tipos = req.tiposTransporte if req.tiposTransporte else None

    # a) Maximize destinations by budget (cost constraint)
    resultado_presupuesto = Algoritmos.maximizar_destinos(
        grafo_global, origen,
        limite=req.presupuesto,
        tipo_limite="presupuesto",
        excluir_secundarios=req.excluirSecundarios,
        tipos_preferidos=tipos
    )

    # b) Maximize destinations by time (time constraint, in minutes)
    tiempo_minutos = req.tiempoDisponible * 60
    resultado_tiempo = Algoritmos.maximizar_destinos(
        grafo_global, origen,
        limite=tiempo_minutos,
        tipo_limite="tiempo",
        excluir_secundarios=req.excluirSecundarios,
        tipos_preferidos=tipos
    )
    
    print("\n===== MAXIMIZAR POR TIEMPO =====")
    print(f"Tiempo límite: {tiempo_minutos}")
    print(f"Tiempo encontrado: {resultado_tiempo['tiempo_total']}")
    print(f"Ruta: {resultado_tiempo['ruta']}")
    print("=================================\n")

    return {
        "itinerario_presupuesto": {
            "ruta": resultado_presupuesto["ruta"],
            "tramos": resultado_presupuesto["tramos"],
            "resumen": {
                "total_destinos": len(resultado_presupuesto["ruta"]) - 1,
                "total_costo": round(resultado_presupuesto["costo_total"], 2),
                "total_tiempo": round(resultado_presupuesto["tiempo_total"], 2),
                "total_distancia": round(resultado_presupuesto["distancia_total"], 2),
                "tipos_usados": resultado_presupuesto["tipos_usados"]
            }
        },
        "itinerario_tiempo": {
            "ruta": resultado_tiempo["ruta"],
            "tramos": resultado_tiempo["tramos"],
            "resumen": {
                "total_destinos": len(resultado_tiempo["ruta"]) - 1,
                "total_costo": round(resultado_tiempo["costo_total"], 2),
                "total_tiempo": round(resultado_tiempo["tiempo_total"], 2),
                "total_distancia": round(resultado_tiempo["distancia_total"], 2),
                "tipos_usados": resultado_tiempo["tipos_usados"]
            }
        }
    }


@router.post("/plan/route")
async def plan_best_route(req: MejorRutaRequest):
    """
    R2 criteria-based route planning:
    Calculates the best route for each selected criterion.
    """
    if not grafo_global:
        raise HTTPException(status_code=500, detail="Error cargando grafo")

    origen = req.origen.upper()
    destino = req.destino.upper()

    if origen not in grafo_global.vertices:
        raise HTTPException(status_code=404, detail=f"Aeropuerto origen '{origen}' no encontrado")
    if destino not in grafo_global.vertices:
        raise HTTPException(status_code=404, detail=f"Aeropuerto destino '{destino}' no encontrado")

    tipos = req.tiposTransporte if req.tiposTransporte else None
    resultados = []

    # Calculate one route per selected criterion
    for criterio in req.criterios:
        if criterio not in ["distancia", "costo", "tiempo"]:
            continue

        dist, pred, path = Algoritmos.dijkstra_simple(
            grafo_global, origen, destino, criterio,
            excluir_secundarios=req.excluirSecundarios,
            tipos_preferidos=tipos
        )

        if not path:
            resultados.append({
                "criterio": criterio,
                "ruta": [],
                "itinerario": [],
                "resumen": {
                    "total_distancia": 0,
                    "total_costo": 0,
                    "total_tiempo": 0,
                    "total_destinos": 0,
                    "tipos_usados": []
                },
                "mensaje": f"No se encontro ruta de {origen} a {destino} con el criterio '{criterio}'"
            })
            continue

        itinerario, resumen = construir_itinerario(
            grafo_global, path, criterio, tipos_preferidos=tipos
        )

        resultados.append({
            "criterio": criterio,
            "ruta": path,
            "itinerario": itinerario,
            "resumen": resumen
        })

    return {"resultados": resultados}


@router.post("/route/toggle")
async def toggle_route(req: RouteToggleRequest):
    """
    R4: Interrupts or restores a specific route.
    """
    if not grafo_global:
        raise HTTPException(status_code=500, detail="Error cargando grafo")

    origen = req.origen.upper()
    destino = req.destino.upper()

    vertice_origen = grafo_global.obtener_vertice(origen)
    if not vertice_origen:
        raise HTTPException(status_code=404, detail=f"Origen '{origen}' no encontrado")

    # Find the edge
    arista = next((a for a in vertice_origen.adyacencias if a.vertice_destino.identificador == destino), None)
    if not arista:
        raise HTTPException(status_code=404, detail=f"Ruta {origen} -> {destino} no encontrada")

    arista.activa = req.activa
    return {"status": "success", "origen": origen, "destino": destino, "activa": arista.activa}


# Legacy endpoint kept for compatibility
@router.get("/route")
async def get_route(origen: str, destino: str, criterio: str = "distancia"):
    if not grafo_global:
        raise HTTPException(status_code=500, detail="Error cargando grafo")

    origen = origen.upper()
    destino = destino.upper()

    if origen not in grafo_global.vertices or destino not in grafo_global.vertices:
        raise HTTPException(status_code=404, detail="Origen o destino invalido")

    dist, pred, path = Algoritmos.dijkstra_simple(grafo_global, origen, destino, criterio)

    if not path:
        raise HTTPException(status_code=404, detail="No hay ruta")

    itinerario, resumen = construir_itinerario(grafo_global, path, criterio)

    return {
        "ruta": path,
        "itinerario": itinerario,
        "resumen": resumen
    }
