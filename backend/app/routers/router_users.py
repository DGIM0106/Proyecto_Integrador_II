from fastapi import APIRouter, HTTPException, status
from sqlmodel import select
from MyDbContext import SessionDep
from models.model_users import (
    ModelOrganizacion,
    ModelRol,
    ModelUsuario,
    OrganizacionCreate,
    OrganizacionUpdate,
    UsuarioCreate,
    UsuarioLogin,
    UsuarioUpdate,
)
from services.audit_service import registrar_auditoria

auth = APIRouter(prefix="/auth", tags=["Autenticación y Usuarios"])


def _enrich_user(session: SessionDep, user: ModelUsuario) -> dict:
    rol = session.get(ModelRol, user.id_rol)
    org = session.get(ModelOrganizacion, user.id_organizacion)
    return {
        "id_usuario": user.id_usuario,
        "nombre": user.nombre,
        "correo": user.correo,
        "id_rol": user.id_rol,
        "nombre_rol": rol.nombre_rol if rol else "Sin Rol",
        "id_organizacion": user.id_organizacion,
        "razon_social": org.razon_social if org else "Sin Organización",
        "ruc": org.ruc if org else "",
    }


@auth.get("/users")
def listar_usuarios(session: SessionDep):
    users = session.exec(select(ModelUsuario)).all()
    return [_enrich_user(session, u) for u in users]


@auth.post("/login")
def login_usuario(session: SessionDep, data: UsuarioLogin):
    correo_clean = data.correo.strip().lower()
    users = session.exec(select(ModelUsuario)).all()
    user = next((u for u in users if u.correo.lower() == correo_clean), None)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El correo ingresado no se encuentra registrado en EcoRAEE Cloud.",
        )

    enriched = _enrich_user(session, user)
    return {
        "message": "Inicio de sesión exitoso",
        "user": enriched,
    }


@auth.post("/register", status_code=status.HTTP_201_CREATED)
def registrar_usuario(session: SessionDep, data: UsuarioCreate):
    existente = session.exec(
        select(ModelUsuario).where(ModelUsuario.correo == data.correo.strip())
    ).first()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya se encuentra registrado.",
        )

    org = session.get(ModelOrganizacion, data.id_organizacion)
    if not org:
        raise HTTPException(status_code=404, detail="La organización seleccionada no existe.")

    rol = session.get(ModelRol, data.id_rol)
    if not rol:
        raise HTTPException(status_code=404, detail="El rol seleccionado no existe.")

    nuevo = ModelUsuario(
        nombre=data.nombre.strip(),
        correo=data.correo.strip(),
        id_organizacion=data.id_organizacion,
        id_rol=data.id_rol,
    )
    session.add(nuevo)
    session.commit()
    session.refresh(nuevo)

    registrar_auditoria(
        session,
        tabla_afectada="USUARIO",
        tipo_operacion="INSERT",
        detalle=f"Registro de usuario {nuevo.nombre} ({nuevo.correo}) con rol {rol.nombre_rol}",
        id_usuario=nuevo.id_usuario,
    )
    session.commit()

    return _enrich_user(session, nuevo)


@auth.put("/users/{id_usuario}")
def actualizar_usuario(id_usuario: int, data: UsuarioUpdate, session: SessionDep):
    user = session.get(ModelUsuario, id_usuario)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    if data.nombre is not None:
        user.nombre = data.nombre.strip()
    if data.correo is not None:
        otro = session.exec(
            select(ModelUsuario).where(
                ModelUsuario.correo == data.correo.strip(),
                ModelUsuario.id_usuario != id_usuario,
            )
        ).first()
        if otro:
            raise HTTPException(status_code=400, detail="Ese correo ya pertenece a otro usuario.")
        user.correo = data.correo.strip()
    if data.id_organizacion is not None:
        user.id_organizacion = data.id_organizacion
    if data.id_rol is not None:
        user.id_rol = data.id_rol

    session.add(user)
    registrar_auditoria(
        session,
        tabla_afectada="USUARIO",
        tipo_operacion="UPDATE",
        detalle=f"Actualización de datos del usuario ID {id_usuario} ({user.nombre})",
        id_usuario=id_usuario,
    )
    session.commit()
    session.refresh(user)
    return _enrich_user(session, user)


@auth.delete("/users/{id_usuario}")
def eliminar_usuario(id_usuario: int, session: SessionDep):
    user = session.get(ModelUsuario, id_usuario)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    try:
        session.delete(user)
        session.commit()
        return {"message": f"Usuario '{user.nombre}' eliminado correctamente."}
    except Exception:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede eliminar este usuario porque tiene evaluaciones o registros de auditoría asociados (Integridad Referencial FK).",
        )


@auth.get("/roles")
def listar_roles(session: SessionDep):
    return session.exec(select(ModelRol)).all()


@auth.get("/organizaciones")
def listar_organizaciones(session: SessionDep):
    return session.exec(select(ModelOrganizacion)).all()


@auth.post("/organizaciones", status_code=status.HTTP_201_CREATED)
def crear_organizacion(data: OrganizacionCreate, session: SessionDep):
    ruc = data.ruc.strip()
    if len(ruc) != 13 or not ruc.isdigit():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El RUC debe tener exactamente 13 dígitos numéricos (CK_ORGANIZACION_RUC).",
        )
    existente = session.exec(
        select(ModelOrganizacion).where(ModelOrganizacion.ruc == ruc)
    ).first()
    if existente:
        raise HTTPException(status_code=400, detail="Ya existe una organización con ese RUC.")

    org = ModelOrganizacion(ruc=ruc, razon_social=data.razon_social.strip())
    session.add(org)
    session.commit()
    session.refresh(org)
    return org


@auth.put("/organizaciones/{id_organizacion}")
def actualizar_organizacion(id_organizacion: int, data: OrganizacionUpdate, session: SessionDep):
    org = session.get(ModelOrganizacion, id_organizacion)
    if not org:
        raise HTTPException(status_code=404, detail="Organización no encontrada.")

    if data.ruc is not None:
        ruc = data.ruc.strip()
        if len(ruc) != 13 or not ruc.isdigit():
            raise HTTPException(status_code=400, detail="El RUC debe tener exactamente 13 dígitos.")
        org.ruc = ruc
    if data.razon_social is not None:
        org.razon_social = data.razon_social.strip()

    session.add(org)
    session.commit()
    session.refresh(org)
    return org


@auth.delete("/organizaciones/{id_organizacion}")
def eliminar_organizacion(id_organizacion: int, session: SessionDep):
    org = session.get(ModelOrganizacion, id_organizacion)
    if not org:
        raise HTTPException(status_code=404, detail="Organización no encontrada.")
    try:
        session.delete(org)
        session.commit()
        return {"message": "Organización eliminada correctamente."}
    except Exception:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede eliminar la organización porque tiene usuarios asociados.",
        )

