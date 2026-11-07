from typing import Optional
from sqlmodel import SQLModel, Field


class ModelOrganizacion(SQLModel, table=True):
    __tablename__ = "ORGANIZACION"

    id_organizacion: Optional[int] = Field(default=None, primary_key=True)
    ruc: str = Field(max_length=13, unique=True)
    razon_social: str = Field(max_length=150)


class ModelRol(SQLModel, table=True):
    __tablename__ = "ROL"

    id_rol: Optional[int] = Field(default=None, primary_key=True)
    nombre_rol: str = Field(max_length=50, unique=True)


class ModelUsuario(SQLModel, table=True):
    __tablename__ = "USUARIO"

    id_usuario: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=100)
    correo: str = Field(max_length=100, unique=True)
    id_organizacion: int = Field(foreign_key="ORGANIZACION.id_organizacion")
    id_rol: int = Field(foreign_key="ROL.id_rol")


class OrganizacionCreate(SQLModel):
    ruc: str
    razon_social: str


class OrganizacionUpdate(SQLModel):
    ruc: Optional[str] = None
    razon_social: Optional[str] = None


class UsuarioLogin(SQLModel):
    correo: str


class UsuarioCreate(SQLModel):
    nombre: str
    correo: str
    id_organizacion: int
    id_rol: int


class UsuarioUpdate(SQLModel):
    nombre: Optional[str] = None
    correo: Optional[str] = None
    id_organizacion: Optional[int] = None
    id_rol: Optional[int] = None

