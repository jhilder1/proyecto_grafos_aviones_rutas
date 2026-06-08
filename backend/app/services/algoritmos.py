"""
Algorithm module for SkyRoute Planner.

Provides graph traversal and optimization routines used by the API:
- `dijkstra_simple` for single-source shortest path with optional filters.
- `maximizar_destinos` to maximize the number of visited destinations under
    budget or time constraints using DFS with pruning.
"""


class Algoritmos:

  
    @staticmethod
    def dijkstra_simple(grafo, inicio_id, destino_id, criterio="distancia",
                        excluir_secundarios=False, tipos_preferidos=None):
        """
        Find the shortest path between two airports using Dijkstra's algorithm.

        Rationale: Dijkstra is suitable for finding the minimum-cost path when
        edge weights are non-negative. The implementation supports different
        optimization criteria (distance, cost, time) and optional filters such
        as excluding non-hub airports or limiting allowed aircraft types.

        Args:
            grafo: `Grafo` instance containing vertices and edges.
            inicio_id: IATA code of the origin airport.
            destino_id: IATA code of the destination airport.
            criterio: Optimization criterion - "distancia", "costo", or "tiempo".
            excluir_secundarios: If True, skip non-hub airports (except origin/destination).
            tipos_preferidos: Optional list of preferred aircraft types (None = all).

        Returns:
            tuple: (distances dict, predecessors dict, shortest path list).
        """
        # Build the set of valid vertices considering secondary airport filter
        todos = []
        for v_id, v in grafo.vertices.items():
            if excluir_secundarios and not v.esHub:
                # Always include origin and destination even if secondary
                if v_id != inicio_id and v_id != destino_id:
                    continue
            todos.append(v_id)

        dist = {v_id: float("inf") for v_id in todos}
        pred = {v_id: None for v_id in todos}

        if inicio_id not in dist or destino_id not in dist:
            return dist, pred, []

        dist[inicio_id] = 0
        no_visitados = set(todos)
        mapa_vertices = grafo.vertices
        config_aeronaves = grafo.config_global.get("aeronaves", {})

        while no_visitados:
            # Select unvisited vertex with minimum distance
            u = min(no_visitados, key=lambda v_id: dist[v_id])
            if dist[u] == float("inf"):
                break

            no_visitados.remove(u)

            if u == destino_id:
                break

            vertice_actual = mapa_vertices.get(u)
            if vertice_actual is None:
                continue

            for arista in vertice_actual.adyacencias:
                # Skip disabled edges
                if hasattr(arista, "activa") and not arista.activa:
                    continue

                destino_vertice = arista.vertice_destino
                vecino_id = destino_vertice.identificador

                if vecino_id not in no_visitados:
                    continue

                # Calculate edge weight considering transport type filter
                peso = arista.get_peso(criterio, config_aeronaves, tipos_preferidos)

                nueva_dist = dist[u] + peso
                if nueva_dist < dist[vecino_id]:
                    dist[vecino_id] = nueva_dist
                    pred[vecino_id] = u

        # Reconstruct the shortest path
        path = []
        if dist.get(destino_id, float("inf")) != float("inf"):
            actual = destino_id
            while actual is not None:
                path.insert(0, actual)
                actual = pred.get(actual)

        return dist, pred, path


    @staticmethod
    def maximizar_destinos(grafo, origen_id, limite, tipo_limite,
                           excluir_secundarios=False, tipos_preferidos=None):
        """
        Search for a route that visits the maximum number of distinct destinations
        under a budget or time constraint.

        Approach: This is a constrained combinatorial search. The implementation
        uses Depth-First Search (DFS) with backtracking and pruning to explore
        candidate itineraries and discard branches that exceed the resource limit
        (budget in USD or time in minutes).

        Args:
            grafo: `Grafo` instance.
            origen_id: IATA code of the starting airport.
            limite: Numeric resource limit (budget or time).
            tipo_limite: Either "presupuesto" (budget) or "tiempo" (time).
            excluir_secundarios: If True, skip secondary (non-hub) airports.
            tipos_preferidos: Allowed aircraft types (None = all).

        Returns:
            dict with keys: ruta, tramos, costo_total, tiempo_total,
                           distancia_total, tipos_usados
        """
        config_aeronaves = grafo.config_global.get("aeronaves", {})
        todos_tipos = set(config_aeronaves.keys())

        # Filter allowed types based on user preference
        if tipos_preferidos:
            tipos_permitidos = set(tipos_preferidos) & todos_tipos
        else:
            tipos_permitidos = todos_tipos

        # Best solution found so far
        mejor = {
            "ruta": [origen_id],
            "tramos": [],
            "costo_total": 0,
            "tiempo_total": 0,
            "distancia_total": 0,
            "tipos_usados": set()
        }

        def es_mejor(ruta_actual, tipos_usados_actual, costo, tiempo):
            """Determines if the current path is better than the best found."""
            len_actual = len(ruta_actual)
            len_mejor = len(mejor["ruta"])

            if len_actual > len_mejor:
                return True
            if len_actual == len_mejor:
                # Prefer solutions that use all transport types
                usa_todos_actual = tipos_usados_actual >= tipos_permitidos
                usa_todos_mejor = mejor["tipos_usados"] >= tipos_permitidos
                if usa_todos_actual and not usa_todos_mejor:
                    return True
                # If tied on type coverage, prefer lower cost/time
                if tipo_limite == "presupuesto" and costo < mejor["costo_total"]:
                    return True
                if tipo_limite == "tiempo" and tiempo < mejor["tiempo_total"]:
                    return True
            return False

        def dfs(actual_id, costo_acum, tiempo_acum, dist_acum,
                visitados, ruta, tramos, tipos_usados):
            """Recursive DFS exploring all valid paths."""
            # Check if current solution is better
            if es_mejor(ruta, tipos_usados, costo_acum, tiempo_acum):
                mejor["ruta"] = ruta[:]
                mejor["tramos"] = [t.copy() for t in tramos]
                mejor["costo_total"] = costo_acum
                mejor["tiempo_total"] = tiempo_acum
                mejor["distancia_total"] = dist_acum
                mejor["tipos_usados"] = tipos_usados.copy()

            vertice = grafo.vertices.get(actual_id)
            if not vertice:
                return

            for arista in vertice.adyacencias:
                # Skip disabled edges
                if hasattr(arista, "activa") and not arista.activa:
                    continue

                destino = arista.vertice_destino
                destino_id = destino.identificador

                # Skip already visited airports (no repeated stops)
                if destino_id in visitados:
                    continue

                # Skip secondary airports if excluded
                if excluir_secundarios and not destino.esHub:
                    continue

                # Try each available aircraft type on this route
                for tipo in arista.aeronaves:
                    if tipo not in tipos_permitidos:
                        continue
                    if tipo not in config_aeronaves:
                        continue

                    costo_km = config_aeronaves[tipo]["costoKm"]
                    tiempo_km = config_aeronaves[tipo]["tiempoKm"]

                    # costoBase == 0 → ruta subsidiada (gratuita)
                    # costoBase != 0 → ruta normal: costo = distancia × costo_por_km
                    if arista.costoBase == 0:
                        costo_tramo = 0
                        es_subsidiada = True
                    else:
                        costo_tramo = arista.distanciaKm * costo_km
                        es_subsidiada = False
                        
                    tiempo_tramo = arista.distanciaKm * tiempo_km

                    nuevo_costo = costo_acum + costo_tramo
                    nuevo_tiempo = tiempo_acum + tiempo_tramo

                    # Prune: check if constraint is violated
                    if tipo_limite == "presupuesto" and nuevo_costo > limite:
                        continue
                    if tipo_limite == "tiempo" and nuevo_tiempo > limite:
                        continue

                    # Explore this branch
                    tramo = {
                        "origen": actual_id,
                        "destino": destino_id,
                        "aeronave": tipo,
                        "distancia": arista.distanciaKm,
                        "costo": round(costo_tramo, 2),
                        "tiempo": round(tiempo_tramo, 2),
                        "costo_acumulado": round(nuevo_costo, 2),
                        "tiempo_acumulado": round(nuevo_tiempo, 2)
                    }

                    visitados.add(destino_id)
                    ruta.append(destino_id)
                    tramos.append(tramo)
                    nuevos_tipos = tipos_usados | {tipo}

                    dfs(destino_id, nuevo_costo, nuevo_tiempo,
                        dist_acum + arista.distanciaKm,
                        visitados, ruta, tramos, nuevos_tipos)

                    # Backtrack
                    ruta.pop()
                    tramos.pop()
                    visitados.remove(destino_id)

        # Start DFS from origin
        visitados_inicial = {origen_id}
        dfs(origen_id, 0, 0, 0, visitados_inicial, [origen_id], [], set())

        # Convert tipos_usados set to list for JSON serialization
        mejor["tipos_usados"] = list(mejor["tipos_usados"])
        return mejor