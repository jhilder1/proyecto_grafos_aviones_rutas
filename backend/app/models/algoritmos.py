class Algoritmos:
    @staticmethod
    def dijkstra_simple(grafo, inicio_id, destino_id, criterio="distancia"):
        todos = list(grafo.vertices.keys())

        dist = {v_id: float("inf") for v_id in todos}
        pred = {v_id: None for v_id in todos}

        if inicio_id not in dist or destino_id not in dist:
            return dist, pred, []

        dist[inicio_id] = 0
        no_visitados = set(todos)
        mapa_vertices = grafo.vertices

        print("=== Iteracion inicial ===")
        for v_id in todos:
            costo = "inf" if dist[v_id] == float("inf") else dist[v_id]
            print(f"{v_id}: ({costo}, {pred[v_id]})")
        print()

        while no_visitados:
            u = min(no_visitados, key=lambda v_id: dist[v_id])
            if dist[u] == float("inf"):
                break

            print(f"Procesando vertice {u} con distancia {dist[u]}")
            no_visitados.remove(u)

            if u == destino_id:
                print(f"\nDestino {destino_id} alcanzado. Fin de la busqueda.\n")
                break

            vertice_actual = mapa_vertices.get(u)
            if vertice_actual is None:
                continue

            for arista in vertice_actual.adyacencias:
                if hasattr(arista, "activa") and not arista.activa:
                    continue

                destino_vertice = arista.vertice_destino
                vecino_id = getattr(destino_vertice, "identificador", None)
                if vecino_id is None:
                    vecino_id = getattr(destino_vertice, "id", None)

                if vecino_id not in no_visitados:
                    continue

                nueva_dist = dist[u] + arista.get_peso(criterio, grafo.config_global.get("aeronaves", {}))
                if nueva_dist < dist[vecino_id]:
                    dist[vecino_id] = nueva_dist
                    pred[vecino_id] = u
                    print(f"  Actualizado {vecino_id}: viene de {u}, nuevo costo = {nueva_dist}")

            print("\nEtiquetas actuales:")
            for v_id in todos:
                costo = "inf" if dist[v_id] == float("inf") else dist[v_id]
                print(f"{v_id}: ({costo}, {pred[v_id]})")
            print()

        path = []
        if dist[destino_id] != float("inf"):
            actual = destino_id
            while actual is not None:
                path.insert(0, actual)
                actual = pred[actual]

        ruta = " -> ".join(str(n) for n in path) if path else "sin ruta"
        print(f"Camino mas corto de {inicio_id} a {destino_id}: {ruta}")
        print(f"Distancia total: {dist[destino_id]}")

        return dist, pred, path

    @staticmethod
    def a_estrella(grafo, vertice_inicio, vertice_fin):
        # Implementación del algoritmo A* para encontrar la ruta más corta con heurística
        pass

    @staticmethod
    def bellman_ford(grafo, vertice_inicio, vertice_fin):
        # Implementación del algoritmo de Bellman-Ford para encontrar la ruta más corta en grafos con pesos negativos
        pass

    @staticmethod
    def floyd_warshall(grafo):
        # Implementación del algoritmo de Floyd-Warshall para encontrar las rutas más cortas entre todos los pares de vértices
        pass