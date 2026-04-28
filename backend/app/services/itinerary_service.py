
def construir_itinerario(grafo, path, criterio):
    itinerario = []
        
    total_distancia = 0
    total_costo = 0
    total_tiempo = 0

    config_aeronaves = grafo.config_global.get("aeronaves", {})

    for i in range(len(path) - 1):
        origen_id = path[i]
        destino_id = path[i + 1]
        vertice = grafo.vertices.get(origen_id)
        if not vertice:
            continue

        # 🔍 Buscar la arista correcta
        arista = next(
            (a for a in vertice.adyacencias
            if a.vertice_destino.identificador == destino_id),
            None
        )

        if arista is None:
            continue

        # 🔥 Elegir mejor aeronave según criterio
        mejor_aeronave = None
        mejor_valor = float("inf")
        mejor_costo = 0
        mejor_tiempo = 0

        for tipo in arista.aeronaves:
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

        # 📦 Construir tramo
        tramo = {
            "origen": origen_id,
            "destino": destino_id,
            "aeronave": mejor_aeronave,
            "distancia": arista.distanciaKm,
            "costo": round(mejor_costo, 2),
            "tiempo": round(mejor_tiempo, 2)
        }

        itinerario.append(tramo)

        # 📊 Acumulados
        total_distancia += arista.distanciaKm
        total_costo += mejor_costo
        total_tiempo += mejor_tiempo

    # 📊 Resumen final
    resumen = {
        "total_distancia": round(total_distancia, 2),
        "total_costo": round(total_costo, 2),
        "total_tiempo": round(total_tiempo, 2)
    }

    return itinerario, resumen