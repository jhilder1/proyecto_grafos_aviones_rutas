from fastapi import APIRouter, HTTPException
from app.services.data_loader import DataLoader
from app.services.itinerary_service import construir_itinerario
from app.services.algoritmos import Algoritmos
import os

router = APIRouter()

# Cargamos el grafo en memoria al iniciar (Singleton simple para este alcance)
JSON_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "network.json")
try:
    grafo_global = DataLoader.load_graph_from_json(JSON_PATH)
except Exception as e:
    print(f"Error cargando el grafo: {e}")
    grafo_global = None

@router.get("/network")
async def get_network():
    try:
        if not grafo_global:
            raise HTTPException(status_code=500, detail="El grafo no pudo ser cargado.")

        return grafo_global.to_dict()

    except Exception as e:
        print("ERROR EN /network:", e)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/airport/{iata}")
async def get_airport(iata: str):
    """
    Retorna la información de un aeropuerto en específico.
    """
    if not grafo_global:
        raise HTTPException(status_code=500, detail="El grafo no pudo ser cargado.")
        
    vertice = grafo_global.obtener_vertice(iata.upper())
    if not vertice:
        raise HTTPException(status_code=404, detail="Aeropuerto no encontrado.")
        
    return vertice.to_dict()

@router.get("/route")
async def get_route(origen: str, destino: str, criterio: str = "distancia"):
    
    if not grafo_global:
        raise HTTPException(status_code=500, detail="Error cargando grafo")

    origen = origen.upper()
    destino = destino.upper()

    if origen not in grafo_global.vertices or destino not in grafo_global.vertices:
        raise HTTPException(status_code=404, detail="Origen o destino inválido")

    # 🔹 Dijkstra
    dist, pred, path = Algoritmos.dijkstra_simple(grafo_global, origen, destino, criterio)

    if not path:
        raise HTTPException(status_code=404, detail="No hay ruta")

    # 🔹 Itinerario
    itinerario, resumen = construir_itinerario(grafo_global, path, criterio)

    return {
        "ruta": path,
        "itinerario": itinerario,
        "resumen": resumen
    }
