from typing import Optional
from sqlmodel import SQLModel, Field


class ModelTipoCentro(SQLModel, table=True):
    __tablename__ = "TIPO_CENTRO"

    id_tipo_centro: Optional[int] = Field(default=None, primary_key=True)
    nombre_tipo: str = Field(max_length=50, unique=True)


class ModelCentro(SQLModel, table=True):
    __tablename__ = "CENTRO"

    id_centro: Optional[int] = Field(default=None, primary_key=True)
    codigo_centro: str = Field(max_length=20, unique=True)
    nombre_centro: str = Field(max_length=100)
    direccion: str = Field(max_length=200)
    id_tipo_centro: int = Field(foreign_key="TIPO_CENTRO.id_tipo_centro")


class ModelCategoria(SQLModel, table=True):
    __tablename__ = "CATEGORIA"

    id_categoria: Optional[int] = Field(default=None, primary_key=True)
    nombre_categoria: str = Field(max_length=100, unique=True)


class ModelCondicion(SQLModel, table=True):
    __tablename__ = "CONDICION"

    id_condicion: Optional[int] = Field(default=None, primary_key=True)
    descripcion_condicion: str = Field(max_length=100, unique=True)


class ModelEstadoCatalogo(SQLModel, table=True):
    __tablename__ = "ESTADO_CATALOGO"

    id_estado: Optional[int] = Field(default=None, primary_key=True)
    nombre_estado: str = Field(max_length=40, unique=True)


class CentroCreate(SQLModel):
    codigo_centro: str
    nombre_centro: str
    direccion: str
    id_tipo_centro: int


class CentroUpdate(SQLModel):
    codigo_centro: Optional[str] = None
    nombre_centro: Optional[str] = None
    direccion: Optional[str] = None
    id_tipo_centro: Optional[int] = None


class CategoriaCreate(SQLModel):
    nombre_categoria: str

