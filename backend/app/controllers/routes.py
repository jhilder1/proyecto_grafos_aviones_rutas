from fastapi import APIRouter, HTTPException
from app.services.data_loader import DataLoader
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
    """
    Retorna la representación completa de la red de rutas.
    """
    if not grafo_global:
        raise HTTPException(status_code=500, detail="El grafo no pudo ser cargado.")
    return grafo_global.to_dict()

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
