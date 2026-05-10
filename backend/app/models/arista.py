class Arista:
    def __init__(self, vertice_destino, distanciaKm=0, aeronaves=None, costoBase=0, estanciaMinima=0):
        self.vertice_destino = vertice_destino
        self.distanciaKm = distanciaKm
        self.aeronaves = aeronaves if aeronaves is not None else []
        self.costoBase = costoBase
        self.estanciaMinima = estanciaMinima
        self.activa = True  # For route interruption support (R4)

    def get_peso(self, criterio, config_aeronaves, tipos_preferidos=None):
        """
        Calculates the edge weight based on the given criterion.
        
        Args:
            criterio: "distancia", "costo", or "tiempo"
            config_aeronaves: Aircraft configuration dict with costoKm and tiempoKm
            tipos_preferidos: List of allowed aircraft types (None = all)
        
        Returns:
            float: The minimum weight for this edge considering the criterion
        """
        if criterio == "distancia":
            return self.distanciaKm

        if not self.aeronaves:
            return float("inf")

        mejor = float("inf")

        for tipo in self.aeronaves:
            # Filter by preferred transport types
            if tipos_preferidos and tipo not in tipos_preferidos:
                continue

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
