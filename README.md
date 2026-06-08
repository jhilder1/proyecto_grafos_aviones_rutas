# SkyRoute Planner

A small project that models a flight network and provides planning features
for finding optimal itineraries and simulating trips.

## Project layout

- `backend/` - FastAPI backend that holds the `Grafo` model, planning algorithms,
  and REST API endpoints used by the frontend.
  - `main.py` - FastAPI app entrypoint.
  - `app/controllers/routes.py` - API routes for fetching the network and planning.
  - `app/models/` - `Vertice`, `Arista` and `Grafo` classes representing the graph.
  - `app/services/` - `algoritmos.py` (planning algorithms), `data_loader.py`, and
    `itinerary_service.py` for building detailed itineraries.
  - `data/network.json` - Example network data used by the backend.

- `frontend/` - React + Vite frontend for visualizing the network and interacting
  with planning features.
  - `src/components/` - React components for the graph, planning panel, simulator, etc.
  - `src/services/api.js` - Small wrapper for backend REST calls.

## Key endpoints (backend)

- `GET /api/network` - Returns the full graph JSON used by the frontend.
- `POST /api/network/upload` - Upload a new network JSON and reload.
- `GET /api/airport/{iata}` - Get details about an airport.
- `GET /api/airport/{iata}/neighbors` - Get reachable neighbors with cost/time options.
- `POST /api/plan/maximize` - Plan itinerary to maximize destinations (by budget or time).
- `POST /api/plan/route` - Plan best route according to selected criteria (distance/cost/time).
- `POST /api/route/toggle` - Enable/disable a specific route.
- `POST /api/config/update` - Update aircraft configuration in `network.json`.

## Running locally

Backend (Python, FastAPI + Uvicorn):

1. Create and activate a virtual environment.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
cd backend
uvicorn main:app --reload --port 8000
```

Frontend (Node + Vite):

```bash
cd frontend
npm install
npm run dev
```

Open the frontend URL printed by Vite (usually `http://localhost:5173`) and
ensure the backend is running on `http://localhost:8000`.

## What I changed (brief)

- Added English docstrings and header comments to backend Python modules and
  major frontend components to improve code readability and maintainability.
- Created this README with a high-level overview and run instructions.

If you want, I can:
- Continue adding more detailed inline comments inside the React components.
- Translate UI labels to English as part of internationalization.
- Generate an API reference file documenting request/response schemas.

Which next step would you like me to take?
