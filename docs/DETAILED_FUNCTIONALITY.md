# SkyRoute Planner — Detailed Step-by-Step Functionality

This document explains, step-by-step, how the backend and frontend work together.
It is written in English and complements the inline docstrings added to source files.

---

## Backend Overview

Core responsibilities:
- Load a flight network from `data/network.json` into an in-memory `Grafo` model.
- Provide REST endpoints for visualization, planning requests, configuration updates and route toggling.
- Execute planning algorithms (Dijkstra for shortest path, DFS/backtracking to maximize visited destinations).
- Construct detailed itineraries with cost/time breakdowns.

Key files:
- `backend/main.py` — creates the FastAPI `app`, configures CORS, and mounts the router.
- `backend/app/controllers/routes.py` — defines API endpoints and request models.
- `backend/app/services/data_loader.py` — loads `network.json` into `Grafo`, constructs `Vertice` and `Arista` objects.
- `backend/app/models/vertice.py` — `Vertice` class representing airports.
- `backend/app/models/arista.py` — `Arista` (edge) class encapsulating route attributes and weight calculation.
- `backend/app/models/graph.py` — `Grafo` class with convenience methods to serialize the graph for the frontend.
- `backend/app/services/algoritmos.py` — algorithms: `dijkstra_simple` and `maximizar_destinos`.
- `backend/app/services/itinerary_service.py` — builds a detailed itinerary from a computed path.

Detailed request flow:

1. Startup: `main.py` imports the router; `routes.py` attempts to load `network.json` using `DataLoader.load_graph_from_json` into `grafo_global`.

2. Frontend requests graph data:
   - `GET /api/network` returns `grafo_global.to_dict()` which provides a `nodes` array and an `edges` array plus `config`.
   - Nodes include airport metadata (name, city, country, isHub, costs). Edges include distance, aircraft types, base cost, and whether a route is active.

3. Airport details & neighbors:
   - `GET /api/airport/{iata}` returns a specific `Vertice` data plus computed lists: `aeronaves_operando` and `rutas_salientes`.
   - `GET /api/airport/{iata}/neighbors` returns each outgoing edge with per-aircraft computed `costo` and `tiempo` using global aircraft configuration. This endpoint is used by the "free exploration" UI.

4. Planning endpoints:
   - `POST /api/plan/route` accepts origin, destination and criteria. For each requested criterion (`distancia`, `costo`, `tiempo`) it runs `Algoritmos.dijkstra_simple`.
     - `dijkstra_simple` builds a filtered vertex set (if `excluirSecundarios` is True it removes non-hub airports except origin/destination), then runs Dijkstra using `Arista.get_peso()` which computes edge weight per criterion and available aircraft.
     - If a path is found, `itinerary_service.construir_itinerario` selects the best aircraft per segment based on the chosen criterion and returns segment-level cost/time/distance along with a summary.

   - `POST /api/plan/maximize` accepts an origin and either a budget or a time limit and runs `Algoritmos.maximizar_destinos` twice (once for budget, once for time) to compute itineraries that visit the most destinations:
     - The algorithm uses DFS with backtracking and pruning: it explores possible next edges, tries allowed aircraft on each edge, accumulates cost/time, and prunes branches that exceed the limit.
     - Keeps the best solution according to: maximize number of visited nodes, then prefer coverage of aircraft types, then minimize resource usage in tie-breakers.

5. Configuration and toggles:
   - `POST /api/config/update` updates the `configuracionGlobal.aeronaves` section of `network.json` and reloads `grafo_global`.
   - `POST /api/route/toggle` sets the `.activa` flag on an `Arista` to enable/disable a route. Disabled routes are ignored by algorithms and rendered visually as blocked.

Algorithm design notes:
- Cost/time per edge depends on aircraft type; `costoBase == 0` indicates a subsidized (free) route in which per-km cost is ignored.
- The system permits filtering by allowed aircraft types so clients can request routes that only use specific aircraft.
- DFS-based maximization is exponential in worst-case; pruning via resource checks and visited sets avoids revisiting nodes and infeasible branches.

---

## Frontend Overview

Core responsibilities:
- Visualize the flight network as an interactive force-directed graph.
- Provide UI panels for planning requests, step-by-step exploration, simulation of traveler movement, and final reporting.
- Call backend endpoints via `src/services/api.js` and translate responses into visual state.

Key files/components:
- `frontend/src/main.jsx` — React entry point mounting `App`.
- `frontend/src/App.jsx` — top-level app: loads graph data, holds global state (selected airport, itinerary, simulation state), composes child components.
- `frontend/src/services/api.js` — wrapper functions: `fetchNetworkData`, `fetchAirportDetails`, `planBestRoute`, `planMaximizeDestinations`, `toggleRouteStatus`, `uploadNetworkData`, `updateConfig`, `fetchAirportNeighbors`.
- `frontend/src/components/NetworkGraph.jsx` — renders the force-directed map using `react-force-graph-2d`. Responsible for:
  - Custom node/edge drawing, highlighting routes, marking blocked routes, and showing traveler progress on active leg.
  - Handling node and link click events and centering/zooming the view.
- `frontend/src/components/PlanningPanel.jsx` — collects user inputs for planning (origin/destination/criteria) and calls planning endpoints.
- `frontend/src/components/ItineraryResults.jsx` — shows results returned by planning endpoints (either maximize or per-criterion route results). Supports highlighting a result on the graph and starting simulation from a chosen route.
- `frontend/src/components/DestinationPicker.jsx` — used in free exploration (R2.3). It fetches neighbors for the current airport and enforces local rules (e.g., subsidized distance cap, budget/time availability) and provides system suggestions.
- `frontend/src/components/TripSimulator.jsx` — animates traveler movement along the selected itinerary. It updates a `travelerProgress` value (0–100) and triggers leg completion and interruptions.
- `frontend/src/components/AirportStayPanel.jsx` — handles mandatory biological obligations (meals, sleep), optional activities, and temporary jobs while staying at an airport.
- `frontend/src/components/ConfigPanel.jsx` — UI for editing aircraft configuration and saving it back to the backend.
- `frontend/src/components/AirportSidebar.jsx` — shows airport metadata, outgoing routes, available aircraft, activities and jobs.

Detailed interaction flow:

1. App startup
   - `App.jsx` calls `fetchNetworkData()` to load `nodes`, `links`, and `config`. It passes that data to `NetworkGraph` for visualization and stores `nodes` for side panels.

2. User selects an airport in the graph
   - `NetworkGraph` emits `onNodeClick`. `App` fetches details if needed (`fetchAirportDetails`) and displays `AirportSidebar`.

3. Planning a route (pre-planned mode)
   - User enters origin, destination and criteria in `PlanningPanel`.
   - `planBestRoute` posts to `/api/plan/route`. Received results are shown in `ItineraryResults` where each criterion has a tab with the route, segments and summary.
   - The user can click to highlight a route on the graph or start a simulation; `ItineraryResults` calls a parent handler to set `activeItinerary` and `highlightedRoute`.

4. Maximizing destinations (budget/time)
   - User uses `PlanningPanel` to request maximum destinations for budget or time. `planMaximizeDestinations` posts to `/api/plan/maximize`.
   - Backend returns two itineraries (budget and time optimizations). The UI displays both, allows selection and simulation.

5. Free step-by-step exploration (R2.3)
   - While in free mode, `DestinationPicker` calls `/api/airport/{iata}/neighbors` to get per-aircraft options for each outgoing route.
   - The component enforces rules such as subsidized distance caps, budget/time checks, and suggests the best destination per internal scoring.
   - On confirm, the UI applies the chosen leg to the traveler state and may open `AirportStayPanel` after arrival.

6. Simulation and interruptions (R4)
   - `TripSimulator` animates progress along a leg and updates `travelerProgress` for the graph visualization.
   - If the user toggles a route (calls `toggleRouteStatus` or backend toggles occur), the simulator/graph reflect the route being blocked and the traveler can be interrupted and returned to origin.

7. Configuration updates
   - `ConfigPanel` allows editing aircraft `costoKm` and `tiempoKm`. On save, `updateConfig` posts to `/api/config/update`, which writes to `network.json` and reloads `grafo_global`.
   - The frontend should re-fetch `GET /api/network` after a successful update to reflect new costs and recalculations.

Visualization conventions
- Active itinerary edges and nodes are highlighted (gold). Blocked routes are shown in red and dashed. The traveler position is rendered as a moving particle plus a glowing marker on the active leg.
- Node size differentiates hubs from secondary airports.

---

## Implementation notes and next recommendations

1. Inline comments: I added module/class-level docstrings and header comments in many files. If you prefer, I can continue to add line-by-line inline comments inside complex functions (e.g., inside `algoritmos.maximizar_destinos`) explaining each step and variable.

2. API reference: I can produce an `API_REFERENCE.md` documenting request/response JSON schemas for each endpoint, which helps frontend/back-end contract clarity.

3. Internationalization: UI text is currently Spanish in many components; if you want documentation and code comments in English only, I can also migrate UI strings to English.

4. Tests: Consider adding unit tests for `Algoritmos` functions (small graphs) to prevent regressions.

---

Files created/updated:
- [docs/DETAILED_FUNCTIONALITY.md](docs/DETAILED_FUNCTIONALITY.md)
- multiple backend and frontend modules were annotated with English docstrings and header comments.

If you want, I will now:
- Add detailed inline comments inside `algoritmos.py` and the most complex frontend components, OR
- Generate the API reference file.

Which option do you prefer?