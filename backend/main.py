from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.controllers.routes import router

app = FastAPI(
    title="SkyRoute Planner API",
    description="API para la gestión y visualización de la red de rutas aéreas.",
    version="1.0.0"
)

# Configuración de CORS para permitir peticiones desde el frontend (React)
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
    return {"message": "Bienvenido a SkyRoute Planner API. Usa /api/network para obtener el grafo."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
