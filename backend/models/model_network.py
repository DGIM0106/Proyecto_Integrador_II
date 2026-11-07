from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from sqlmodel import SQLModel, Field


class ModelNodo(SQLModel, table=True):
    __tablename__ = "NODO"

    id_nodo: Optional[int] = Field(default=None, primary_key=True)
    tipo_nodo: str = Field(max_length=50)
    capacidad_nodo: Decimal = Field(max_digits=10, decimal_places=2)


class ModelArista(SQLModel, table=True):
    __tablename__ = "ARISTA"

    id_arista: Optional[int] = Field(default=None, primary_key=True)
    distancia_km: Decimal = Field(max_digits=8, decimal_places=2)
    tiempo_estimado_min: int
    id_nodo_origen: int = Field(foreign_key="NODO.id_nodo")
    id_nodo_destino: int = Field(foreign_key="NODO.id_nodo")


class ModelEscenario(SQLModel, table=True):
    __tablename__ = "ESCENARIO"

    id_escenario: Optional[int] = Field(default=None, primary_key=True)
    codigo_escenario: str = Field(max_length=30, unique=True)
    resultado: str = Field(max_length=150)


class ModelIndicador(SQLModel, table=True):
    __tablename__ = "INDICADOR"

    id_indicador: Optional[int] = Field(default=None, primary_key=True)
    nombre_indicador: str = Field(max_length=100)
    valor_meta: Decimal = Field(max_digits=12, decimal_places=2)
    valor_actual: Decimal = Field(max_digits=12, decimal_places=2)
    periodo: str = Field(max_length=20)
    id_escenario: int = Field(foreign_key="ESCENARIO.id_escenario")


class ModelAlerta(SQLModel, table=True):
    __tablename__ = "ALERTA"

    id_alerta: Optional[int] = Field(default=None, primary_key=True)
    fecha_generacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    nivel_criticidad: str = Field(max_length=20)
    mensaje: str = Field(max_length=250)
    estado_alerta: str = Field(default="Activa", max_length=30)
    id_centro: int = Field(foreign_key="CENTRO.id_centro")


class ModelAuditoria(SQLModel, table=True):
    __tablename__ = "AUDITORIA"

    id_auditoria: Optional[int] = Field(default=None, primary_key=True)
    fecha_accion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    tabla_afectada: str = Field(max_length=60)
    tipo_operacion: str = Field(max_length=20)
    detalle: str
    id_usuario: int = Field(foreign_key="USUARIO.id_usuario")


class NodoCreate(SQLModel):
    tipo_nodo: str
    capacidad_nodo: float


class AristaCreate(SQLModel):
    distancia_km: float
    tiempo_estimado_min: int
    id_nodo_origen: int
    id_nodo_destino: int


class AlertaCreate(SQLModel):
    nivel_criticidad: str
    mensaje: str
    estado_alerta: str = "Activa"
    id_centro: int


class AlertaUpdate(SQLModel):
    estado_alerta: str
    nivel_criticidad: Optional[str] = None
    mensaje: Optional[str] = None


class MaxFlowRequest(SQLModel):
    id_nodo_origen: Optional[int] = None
    id_nodo_sumidero: Optional[int] = None
    factor_capacidad: float = 1.0
    guardar_escenario: bool = False
    codigo_escenario: Optional[str] = None
