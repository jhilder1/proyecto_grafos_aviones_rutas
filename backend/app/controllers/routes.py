from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.services.data_loader import DataLoader
from app.services.itinerary_service import construir_itinerario
from app.services.algoritmos import Algoritmos
import os

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
