class Vertice:
    """Represents an airport (vertex) in the flight network graph.

    Attributes:
        identificador: IATA airport code used as the unique id.
        nombre, ciudad, pais: Human readable metadata.
        esHub: Boolean indicating if the airport is a hub.
        adyacencias: List of outgoing edges (`Arista` instances).
        activa: Whether the vertex is active (used for future features).
    """

    def __init__(self, identificador, nombre="", ciudad="", pais="", zonaHoraria="", esHub=False, 
                 costoAlojamiento=0, costoAlimentacion=0, actividades=None, trabajos=None,
                 aerolineas=None, activa=True):
        self.identificador = identificador  # ID (IATA)
        self.nombre = nombre
        self.ciudad = ciudad
        self.pais = pais
        self.zonaHoraria = zonaHoraria
        self.esHub = esHub
        self.costoAlojamiento = costoAlojamiento
        self.costoAlimentacion = costoAlimentacion
        self.actividades = actividades if actividades is not None else []
        self.trabajos = trabajos if trabajos is not None else []
        self.aerolineas = aerolineas if aerolineas is not None else []
        self.adyacencias = []
        self.activa = activa

    def agregar_adyacencia(self, arista):
        """Append an outgoing edge (`Arista`) to this vertex."""
        self.adyacencias.append(arista)
        
    def to_dict(self):
        """Return a JSON-serializable representation used by the frontend."""
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
            "trabajos": self.trabajos,
            "aerolineas": self.aerolineas
        }