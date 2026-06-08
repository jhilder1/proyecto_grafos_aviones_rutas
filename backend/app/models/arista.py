class Arista:
    """Represents a directed edge (route) between two airports.

    Attributes:
        vertice_destino: Destination `Vertice` object.
        distanciaKm: Distance in kilometers.
        aeronaves: List of aircraft types operating this route.
        costoBase: Base cost (0 indicates subsidized/free route).
        estanciaMinima: Minimum required layover time.
        activa: Whether the route is active (supports toggling).
    """

    def __init__(self, vertice_destino, distanciaKm=0, aeronaves=None, costoBase=0, estanciaMinima=0):
        self.vertice_destino = vertice_destino
        self.distanciaKm = distanciaKm
        self.aeronaves = aeronaves if aeronaves is not None else []
        self.costoBase = costoBase
        self.estanciaMinima = estanciaMinima
        self.activa = True  # For route interruption support (R4)

    def get_peso(self, criterio, config_aeronaves, tipos_preferidos=None):
        """
        Calculate the edge weight according to the selected optimization criterion.

        Args:
            criterio: One of "distancia", "costo", or "tiempo".
            config_aeronaves: Mapping of aircraft types to per-km cost/time values.
            tipos_preferidos: Optional list of allowed aircraft types.

        Returns:
            float: The minimal weight found for this edge under the filters,
                   or `inf` when no valid aircraft is available.
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
                    # costoBase == 0 indicates a subsidized (free) route
                    # otherwise cost = distance * cost_per_km
                    valor = 0 if self.costoBase == 0 else self.distanciaKm * costo_km
                elif criterio == "tiempo":
                    valor = self.distanciaKm * tiempo_km
                else:
                    continue

                mejor = min(mejor, valor)

        return mejor
