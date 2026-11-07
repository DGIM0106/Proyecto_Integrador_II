from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field


class ModelSolicitud(SQLModel, table=True):
    __tablename__ = "SOLICITUD"

    id_solicitud: Optional[int] = Field(default=None, primary_key=True)
    codigo_solicitud: str = Field(max_length=30, unique=True)
    fecha_solicitud: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    estado_recoleccion: str = Field(max_length=30)
    id_centro: int = Field(foreign_key="CENTRO.id_centro")


class ModelLote(SQLModel, table=True):
    __tablename__ = "LOTE"

    id_lote: Optional[int] = Field(default=None, primary_key=True)
    codigo_lote: str = Field(max_length=30, unique=True)
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    id_solicitud: int = Field(foreign_key="SOLICITUD.id_solicitud")


class ModelDispositivo(SQLModel, table=True):
    __tablename__ = "DISPOSITIVO"

    id_dispositivo: Optional[int] = Field(default=None, primary_key=True)
    num_serie: str = Field(max_length=60, unique=True)
    marca: str = Field(max_length=50)
    modelo: str = Field(max_length=60)
    id_categoria: int = Field(foreign_key="CATEGORIA.id_categoria")
    id_lote: int = Field(foreign_key="LOTE.id_lote")


class ModelEvaluacionTecnica(SQLModel, table=True):
    __tablename__ = "EVALUACION_TECNICA"

    id_evaluacion: Optional[int] = Field(default=None, primary_key=True)
    fecha_evaluacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    diagnostico: str = Field(max_length=250)
    clasificacion_tecnica: str = Field(max_length=40)
    id_dispositivo: int = Field(foreign_key="DISPOSITIVO.id_dispositivo", unique=True)
    id_condicion: int = Field(foreign_key="CONDICION.id_condicion")
    id_usuario_evaluador: int = Field(foreign_key="USUARIO.id_usuario")


class ModelHistorialEstados(SQLModel, table=True):
    __tablename__ = "HISTORIAL_ESTADOS"

    id_dispositivo: int = Field(foreign_key="DISPOSITIVO.id_dispositivo", primary_key=True)
    id_secuencia: int = Field(primary_key=True)
    id_estado: int = Field(foreign_key="ESTADO_CATALOGO.id_estado")
    fecha_cambio: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    observacion: Optional[str] = Field(default=None, max_length=250)


class ModelTransferenciaMovimiento(SQLModel, table=True):
    __tablename__ = "TRANSFERENCIA_MOVIMIENTO"

    num_movimiento: Optional[int] = Field(default=None, primary_key=True)
    fecha_movimiento: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    estado_transferencia: str = Field(max_length=30)
    id_centro_origen: int = Field(foreign_key="CENTRO.id_centro")
    id_centro_destino: int = Field(foreign_key="CENTRO.id_centro")
    id_dispositivo: int = Field(foreign_key="DISPOSITIVO.id_dispositivo")


class ModelTratamiento(SQLModel, table=True):
    __tablename__ = "TRATAMIENTO"

    id_tratamiento: Optional[int] = Field(default=None, primary_key=True)
    resultado: str = Field(max_length=100)
    destino: str = Field(max_length=100)
    fecha_cierre: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    id_dispositivo: int = Field(foreign_key="DISPOSITIVO.id_dispositivo", unique=True)


class ModelEvidencia(SQLModel, table=True):
    __tablename__ = "EVIDENCIA"

    id_evidencia: Optional[int] = Field(default=None, primary_key=True)
    tipo_archivo: str = Field(max_length=30)
    url_archivo: str = Field(max_length=255)
    id_tratamiento: int = Field(foreign_key="TRATAMIENTO.id_tratamiento")


class ModelInventario(SQLModel, table=True):
    __tablename__ = "INVENTARIO"

    id_inventario: Optional[int] = Field(default=None, primary_key=True)
    stock_actual: int = Field(default=0)
    fecha_actualizacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    id_centro: int = Field(foreign_key="CENTRO.id_centro")
    id_categoria: int = Field(foreign_key="CATEGORIA.id_categoria")


# --- Schemas de entrada y validacion ---

class SolicitudCreate(SQLModel):
    codigo_solicitud: str
    estado_recoleccion: str = "Pendiente"
    id_centro: int
    id_usuario: Optional[int] = 1


class SolicitudUpdate(SQLModel):
    estado_recoleccion: Optional[str] = None
    id_centro: Optional[int] = None
    id_usuario: Optional[int] = 1


class LoteCreate(SQLModel):
    codigo_lote: str
    id_solicitud: int
    id_usuario: Optional[int] = 1


class DispositivoCreate(SQLModel):
    num_serie: str
    marca: str
    modelo: str
    id_categoria: int
    id_lote: int
    observacion_inicial: Optional[str] = "Recepción inicial del equipo en centro"
    id_usuario: Optional[int] = 1


class DispositivoUpdate(SQLModel):
    num_serie: Optional[str] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    id_categoria: Optional[int] = None
    id_lote: Optional[int] = None
    id_usuario: Optional[int] = 1


class EvaluacionCreate(SQLModel):
    diagnostico: str
    clasificacion_tecnica: str
    id_dispositivo: int
    id_condicion: int
    id_usuario_evaluador: int


class EvaluacionUpdate(SQLModel):
    diagnostico: Optional[str] = None
    clasificacion_tecnica: Optional[str] = None
    id_condicion: Optional[int] = None
    id_usuario_evaluador: int


class TransferenciaCreate(SQLModel):
    estado_transferencia: str = "En Transito"
    id_centro_origen: int
    id_centro_destino: int
    id_dispositivo: int
    id_usuario: Optional[int] = 1


class TransferenciaUpdate(SQLModel):
    estado_transferencia: str
    id_usuario: Optional[int] = 1


class InventarioUpdate(SQLModel):
    stock_actual: int
    id_centro: int
    id_categoria: int
    id_usuario: Optional[int] = 1
