"""
Main FastAPI application for the SkyRoute Planner backend.

This module creates the FastAPI `app`, configures CORS for the
frontend, and mounts the API router. The file also exposes a
small root endpoint and a Uvicorn entry point for local runs.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.controllers.routes import router

app = FastAPI(
    title="SkyRoute Planner API",
    description="API for managing and visualizing the flight network.",
    version="1.0.0"
)

# Configure CORS to allow requests from the frontend (React)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción se debe especificar el dominio exacto
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar las rutas del controlador
app.include_router(router, prefix="/api")

@app.get("/")
def read_root():
    """Simple root endpoint providing a short usage hint."""
    return {"message": "Welcome to SkyRoute Planner API. Use /api/network to fetch the graph."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000)
