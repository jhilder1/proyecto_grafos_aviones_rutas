class Grafo:
    def __init__(self):
        self.vertices = {} # Dictionary for fast IATA lookup
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

    def obtener_aeronaves_desde(self, identificador):
        """Returns the set of aircraft types operating from a given airport."""
        vertice = self.vertices.get(identificador)
        if not vertice:
            return []
        tipos = set()
        for arista in vertice.adyacencias:
            for tipo in arista.aeronaves:
                tipos.add(tipo)
        return sorted(list(tipos))

    def obtener_rutas_desde(self, identificador):
        """Returns summarized route info from a given airport."""
        vertice = self.vertices.get(identificador)
        if not vertice:
            return []
        rutas = []
        for arista in vertice.adyacencias:
            rutas.append({
                "destino": arista.vertice_destino.identificador,
                "distanciaKm": arista.distanciaKm,
                "aeronaves": arista.aeronaves
            })
        return rutas

    def imprimir_grafo(self):
        for identificador, v in self.vertices.items():
            print("***************************")
            print(v.identificador, "-", v.nombre)
            for a in v.adyacencias:
                print(f" -> {a.vertice_destino.identificador} ({a.distanciaKm} km, {a.aeronaves})")
        print("-------------------------------------")
        
    def to_dict(self):
        """Converts the graph to a frontend-friendly format (nodes and edges)"""
        nodos = []
        for v in self.vertices.values():
            nodo_dict = v.to_dict()
            nodo_dict["aeronaves_operando"] = self.obtener_aeronaves_desde(v.identificador)
            nodo_dict["rutas_salientes"] = self.obtener_rutas_desde(v.identificador)
            nodos.append(nodo_dict)

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