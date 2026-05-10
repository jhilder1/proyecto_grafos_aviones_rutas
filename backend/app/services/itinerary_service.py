"""
Itinerary construction service.
Builds detailed flight itineraries from algorithm-computed paths.
"""


def construir_itinerario(grafo, path, criterio, tipos_preferidos=None):
    """
    Constructs a detailed itinerary from a computed path.
    
    For each segment, selects the best aircraft based on the optimization
    criterion and calculates cost, time, and distance.
    
    Args:
        grafo: Graph object
        path: List of IATA codes representing the route
        criterio: Optimization criterion - "distancia", "costo", or "tiempo"
        tipos_preferidos: List of allowed aircraft types (None = all)
    
    Returns:
        tuple: (itinerary list, summary dict)
    """
    itinerario = []
    total_distancia = 0
    total_costo = 0
    total_tiempo = 0
    tipos_usados = set()

    config_aeronaves = grafo.config_global.get("aeronaves", {})

    for i in range(len(path) - 1):
        origen_id = path[i]
        destino_id = path[i + 1]
        vertice = grafo.vertices.get(origen_id)
        if not vertice:
            continue

        # Find the correct edge
        arista = next(
            (a for a in vertice.adyacencias
             if a.vertice_destino.identificador == destino_id),
            None
        )

        if arista is None:
            continue

        # Select best aircraft based on criterion
        mejor_aeronave = None
        mejor_valor = float("inf")
        mejor_costo = 0
        mejor_tiempo = 0

        for tipo in arista.aeronaves:
            # Filter by preferred transport types
            if tipos_preferidos and tipo not in tipos_preferidos:
                continue
            if tipo not in config_aeronaves:
                continue

            costo_km = config_aeronaves[tipo]["costoKm"]
            tiempo_km = config_aeronaves[tipo]["tiempoKm"]

            costo = arista.distanciaKm * costo_km
            tiempo = arista.distanciaKm * tiempo_km

            if criterio == "costo":
                valor = costo
            elif criterio == "tiempo":
                valor = tiempo
            else:  # distancia
                valor = arista.distanciaKm

            if valor < mejor_valor:
                mejor_valor = valor
                mejor_aeronave = tipo
                mejor_costo = costo
                mejor_tiempo = tiempo

        if mejor_aeronave:
            tipos_usados.add(mejor_aeronave)

        total_distancia += arista.distanciaKm
        total_costo += mejor_costo
        total_tiempo += mejor_tiempo

        # Build leg details
        tramo = {
            "origen": origen_id,
            "destino": destino_id,
            "aeronave": mejor_aeronave,
            "distancia": arista.distanciaKm,
            "costo": round(mejor_costo, 2),
            "tiempo": round(mejor_tiempo, 2),
            "costo_acumulado": round(total_costo, 2),
            "tiempo_acumulado": round(total_tiempo, 2)
        }

        itinerario.append(tramo)

    resumen = {
        "total_distancia": round(total_distancia, 2),
        "total_costo": round(total_costo, 2),
        "total_tiempo": round(total_tiempo, 2),
        "total_destinos": len(path) - 1,
        "tipos_usados": list(tipos_usados)
    }

    return itinerario, resumen