import json
import os
from app.models.graph import Grafo
from app.models.vertice import Vertice
from app.models.arista import Arista


class DataLoader:
    @staticmethod
    def load_graph_from_json(file_path: str) -> Grafo:
        grafo = Grafo()
        
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"El archivo {file_path} no existe.")
            
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        # Cargar configuración global si existe
        if "configuracionGlobal" in data:
            grafo.set_config(data["configuracionGlobal"])
            
        # 1. Cargar Vértices (Aeropuertos)
        for aero_data in data.get("nodos", []):
            vertice = Vertice(
                identificador=aero_data["id"],
                nombre=aero_data.get("nombre", ""),
                ciudad=aero_data.get("ciudad", ""),
                pais=aero_data.get("pais", ""),
                zonaHoraria=aero_data.get("zonaHoraria", ""),
                esHub=aero_data.get("esHub", False),
                costoAlojamiento=aero_data.get("costoAlojamiento", 0),
                costoAlimentacion=aero_data.get("costoAlimentacion", 0),
                actividades=aero_data.get("actividades", []),
                trabajos=aero_data.get("trabajos", [])
            )
            grafo.agregar_vertice(vertice)
            
        # 2. Cargar Aristas (Rutas)
        for ruta_data in data.get("aristas", []):
            origen_id = ruta_data["origen"]
            destino_id = ruta_data["destino"]
            distanciaKm = ruta_data.get("distanciaKm", 0)
            aeronaves = ruta_data.get("aeronaves", [])
            costoBase = ruta_data.get("costoBase", 0)
            estanciaMinima = ruta_data.get("estanciaMinima", 0)
            
            origen_vertice = grafo.obtener_vertice(origen_id)
            destino_vertice = grafo.obtener_vertice(destino_id)
            
            if origen_vertice and destino_vertice:
                arista = Arista(
                    vertice_destino=destino_vertice,
                    distanciaKm=distanciaKm,
                    aeronaves=aeronaves,
                    costoBase=costoBase,
                    estanciaMinima=estanciaMinima
                )
                origen_vertice.agregar_adyacencia(arista)
                
        return grafo
