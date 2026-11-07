import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from MyDbContext import create_all_tables
from app.routers import (
    router_users,
    router_catalogs,
    router_solicitudes,
    router_dispositivos,
    router_network,
)

app = FastAPI(
    title="EcoRAEE Cloud API - Desarrollo Local (Parte II)",
    description="API REST para la gestión, trazabilidad y optimización de Residuos de Aparatos Eléctricos y Electrónicos (RAEE)",
    version="1.0.0",
    lifespan=create_all_tables,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

app.include_router(router_users.auth)
app.include_router(router_catalogs.catalogos)
app.include_router(router_solicitudes.solicitudes)
app.include_router(router_dispositivos.dispositivos)
app.include_router(router_network.red)


@app.get("/")
def root():
    return {
        "sistema": "EcoRAEE Cloud API",
        "etapa": "Parte II - Ejecución Local Integrada (SQL Server + FastAPI + React)",
        "estado": "Operativo",
    }

