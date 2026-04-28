class Vertice:
    def __init__(self, identificador, nombre="", ciudad="", pais="", zonaHoraria="", esHub=False, 
                 costoAlojamiento=0, costoAlimentacion=0, actividades=None, trabajos=None, activa=True):
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
        self.activa = activa

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