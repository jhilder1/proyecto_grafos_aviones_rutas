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


    