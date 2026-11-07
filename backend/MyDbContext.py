from contextlib import asynccontextmanager
from typing import Annotated
from dotenv import load_dotenv
from fastapi import Depends, FastAPI
from sqlmodel import SQLModel, Session, create_engine
import os

load_dotenv()

database_url = os.getenv(
    "DATABASE_URL",
    "mssql+pyodbc://@localhost/EcoRAEE_DB?driver=ODBC+Driver+17+for+SQL+Server&trusted_connection=yes&TrustServerCertificate=yes"
)

engine = create_engine(database_url, echo=False)

@asynccontextmanager
async def create_all_tables(app: FastAPI):
    # Las tablas principales se crean con Scripts/01_DDL.sql en SQL Server
    # create_all asegura que cualquier tabla faltante exista sin alterar las actuales
    try:
        SQLModel.metadata.create_all(engine)
    except Exception as e:
        print(f"Aviso de conexión inicial a BD: {e}")
    yield

def get_session():
    with Session(engine) as session:
        yield session

SessionDep = Annotated[Session, Depends(get_session)]

