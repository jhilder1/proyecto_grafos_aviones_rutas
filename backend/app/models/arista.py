class Arista:
    def __init__(self ,vertice_destino, distanciaKm=0, aeronaves=None, costoBase=0, estanciaMinima=0):
        self.vertice_destino = vertice_destino
        self.distanciaKm = distanciaKm
        self.aeronaves = aeronaves if aeronaves is not None else []
        self.costoBase = costoBase
        self.estanciaMinima = estanciaMinima

    def get_peso(self, criterio, config_aeronaves):
        if criterio == "distancia":
            return self.distanciaKm

        if not self.aeronaves:
            return float("inf")

        mejor = float("inf")

        for tipo in self.aeronaves:
            if tipo in config_aeronaves:
                costo_km = config_aeronaves[tipo]["costoKm"]
                tiempo_km = config_aeronaves[tipo]["tiempoKm"]

                if criterio == "costo":
                    valor = self.distanciaKm * costo_km
                elif criterio == "tiempo":
                    valor = self.distanciaKm * tiempo_km
                else:
                    continue

                mejor = min(mejor, valor)

        return mejor
