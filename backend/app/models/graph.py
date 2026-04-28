class Arista:
    def __init__(self, vertice_destino, distanciaKm=0, aeronaves=None, costoBase=0, estanciaMinima=0):
        self.vertice_destino = vertice_destino
        self.distanciaKm = distanciaKm
        self.aeronaves = aeronaves if aeronaves is not None else []
        self.costoBase = costoBase
        self.estanciaMinima = estanciaMinima

    def getPeso(self):
        return self.distanciaKm

class Vertice:
    def __init__(self, identificador, nombre="", ciudad="", pais="", zonaHoraria="", esHub=False, 
                 costoAlojamiento=0, costoAlimentacion=0, actividades=None, trabajos=None):
        self.identificador = identificador # ID (IATA)
        self.nombre = nombre
        self.ciudad = ciudad
        self.pais = pais
        self.zonaHoraria = zonaHoraria
        self.esHub = esHub
        self.costoAlojamiento = costoAlojamiento
        self.costoAlimentacion = costoAlimentacion
        self.actividades = actividades if actividades is not None else []
        self.trabajos = trabajos if trabajos is not None else []
        self.adyacencias = []

    def agregar_adyacencia(self, arista):
        self.adyacencias.append(arista)
        
    def to_dict(self):
        return {
            "id": self.identificador,
            "nombre": self.nombre,
            "ciudad": self.ciudad,
            "pais": self.pais,
            "zonaHoraria": self.zonaHoraria,
            "esHub": self.esHub,
            "costoAlojamiento": self.costoAlojamiento,
            "costoAlimentacion": self.costoAlimentacion,
            "actividades": self.actividades,
            "trabajos": self.trabajos
        }

class Grafo:
    def __init__(self):
        self.vertices = {} # Usamos un diccionario para busqueda rapida por IATA
        self.config_global = {
            "aeronaves": {},
            "presupuestoMinimoPorc": 35,
            "intervaloAlojamiento": 20,
            "intervaloAlimentacion": 8
        }

    def agregar_vertice(self, vertice):
        if vertice.identificador not in self.vertices:
            self.vertices[vertice.identificador] = vertice

    def obtener_vertice(self, identificador):
        return self.vertices.get(identificador)

    def set_config(self, config):
        if not config: return
        self.config_global["aeronaves"] = config.get("aeronaves", self.config_global["aeronaves"])
        self.config_global["presupuestoMinimoPorc"] = config.get("presupuestoMinimoPorc", 35)
        self.config_global["intervaloAlojamiento"] = config.get("intervaloAlojamiento", 20)
        self.config_global["intervaloAlimentacion"] = config.get("intervaloAlimentacion", 8)

    def imprimir_grafo(self):
        for identificador, v in self.vertices.items():
            print("***************************")
            print(v.identificador, "-", v.nombre)
            for a in v.adyacencias:
                print(f" -> {a.vertice_destino.identificador} ({a.distanciaKm} km, {a.aeronaves})")
        print("-------------------------------------")
        
    def to_dict(self):
        """Convierte el grafo a un formato amigable para el frontend (nodos y aristas)"""
        nodos = [v.to_dict() for v in self.vertices.values()]
        aristas = []
        
        for v in self.vertices.values():
            for a in v.adyacencias:
                aristas.append({
                    "source": v.identificador,
                    "target": a.vertice_destino.identificador,
                    "distanciaKm": a.distanciaKm,
                    "aeronaves": a.aeronaves,
                    "costoBase": a.costoBase,
                    "estanciaMinima": a.estanciaMinima
                })
                
        return {"nodes": nodos, "edges": aristas, "config": self.config_global}
