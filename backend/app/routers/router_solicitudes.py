from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status
from sqlmodel import select, desc
from MyDbContext import SessionDep
from models.model_catalogs import ModelCentro
from models.model_traceability import (
    ModelSolicitud,
    ModelLote,
    ModelDispositivo,
    SolicitudCreate,
    SolicitudUpdate,
    LoteCreate,
)
from services.audit_service import registrar_auditoria

solicitudes = APIRouter(prefix="/solicitudes", tags=["Solicitudes y Lotes"])

ESTADOS_SOLICITUD_VALIDOS = {"Pendiente", "Asignada", "En Recoleccion", "Finalizada"}


@solicitudes.get("/")
def listar_solicitudes(session: SessionDep):
    centros = {c.id_centro: c for c in session.exec(select(ModelCentro)).all()}
    lotes_all = session.exec(select(ModelLote)).all()
    dispositivos_all = session.exec(select(ModelDispositivo)).all()

    disp_por_lote = {}
    for d in dispositivos_all:
        disp_por_lote[d.id_lote] = disp_por_lote.get(d.id_lote, 0) + 1

    lotes_por_sol = {}
    for l in lotes_all:
        lotes_por_sol.setdefault(l.id_solicitud, []).append({
            **l.model_dump(),
            "total_dispositivos": disp_por_lote.get(l.id_lote, 0),
        })

    sols = session.exec(select(ModelSolicitud).order_by(desc(ModelSolicitud.id_solicitud))).all()
    resultado = []
    for s in sols:
        c = centros.get(s.id_centro)
        lotes_sol = lotes_por_sol.get(s.id_solicitud, [])
        total_equipos = sum(item["total_dispositivos"] for item in lotes_sol)
        resultado.append({
            **s.model_dump(),
            "nombre_centro": c.nombre_centro if c else f"Centro #{s.id_centro}",
            "codigo_centro": c.codigo_centro if c else "",
            "lotes": lotes_sol,
            "total_lotes": len(lotes_sol),
            "total_dispositivos": total_equipos,
        })
    return resultado


@solicitudes.post("/", status_code=status.HTTP_201_CREATED)
def crear_solicitud(data: SolicitudCreate, session: SessionDep):
    if data.estado_recoleccion not in ESTADOS_SOLICITUD_VALIDOS:
        raise HTTPException(
            status_code=400,
            detail=f"Estado inválido. Valores permitidos (CK_SOLICITUD_ESTADO): {', '.join(ESTADOS_SOLICITUD_VALIDOS)}",
        )

    existente = session.exec(
        select(ModelSolicitud).where(ModelSolicitud.codigo_solicitud == data.codigo_solicitud.strip())
    ).first()
    if existente:
        raise HTTPException(status_code=400, detail="El código de solicitud ya se encuentra registrado.")

    centro = session.get(ModelCentro, data.id_centro)
    if not centro:
        raise HTTPException(status_code=404, detail="El centro de recepción indicado no existe.")

    nueva = ModelSolicitud(
        codigo_solicitud=data.codigo_solicitud.strip(),
        fecha_solicitud=datetime.now(timezone.utc),
        estado_recoleccion=data.estado_recoleccion,
        id_centro=data.id_centro,
    )
    session.add(nueva)
    registrar_auditoria(
        session,
        tabla_afectada="SOLICITUD",
        tipo_operacion="INSERT",
        detalle=f"Creación de solicitud {nueva.codigo_solicitud} en centro {centro.nombre_centro}",
        id_usuario=data.id_usuario or 1,
    )
    session.commit()
    session.refresh(nueva)
    return nueva


@solicitudes.put("/{id_solicitud}")
def actualizar_solicitud(id_solicitud: int, data: SolicitudUpdate, session: SessionDep):
    sol = session.get(ModelSolicitud, id_solicitud)
    if not sol:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada.")

    if data.estado_recoleccion is not None:
        if data.estado_recoleccion not in ESTADOS_SOLICITUD_VALIDOS:
            raise HTTPException(
                status_code=400,
                detail=f"Estado inválido. Valores permitidos: {', '.join(ESTADOS_SOLICITUD_VALIDOS)}",
            )
        sol.estado_recoleccion = data.estado_recoleccion

    if data.id_centro is not None:
        centro = session.get(ModelCentro, data.id_centro)
        if not centro:
            raise HTTPException(status_code=404, detail="Centro no encontrado.")
        sol.id_centro = data.id_centro

    session.add(sol)
    registrar_auditoria(
        session,
        tabla_afectada="SOLICITUD",
        tipo_operacion="UPDATE",
        detalle=f"Actualización de solicitud {sol.codigo_solicitud} a estado '{sol.estado_recoleccion}'",
        id_usuario=data.id_usuario or 1,
    )
    session.commit()
    session.refresh(sol)
    return sol


@solicitudes.delete("/{id_solicitud}")
def eliminar_solicitud(id_solicitud: int, session: SessionDep):
    sol = session.get(ModelSolicitud, id_solicitud)
    if not sol:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada.")
    try:
        codigo = sol.codigo_solicitud
        session.delete(sol)
        registrar_auditoria(
            session,
            tabla_afectada="SOLICITUD",
            tipo_operacion="DELETE",
            detalle=f"Eliminación de solicitud {codigo}",
            id_usuario=1,
        )
        session.commit()
        return {"message": f"Solicitud {codigo} eliminada correctamente."}
    except Exception:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede eliminar la solicitud porque tiene lotes vinculados (FK_LOTE_SOLICITUD).",
        )


@solicitudes.get("/lotes")
def listar_lotes(session: SessionDep):
    sols = {s.id_solicitud: s for s in session.exec(select(ModelSolicitud)).all()}
    centros = {c.id_centro: c for c in session.exec(select(ModelCentro)).all()}
    dispositivos = session.exec(select(ModelDispositivo)).all()

    conteo = {}
    for d in dispositivos:
        conteo[d.id_lote] = conteo.get(d.id_lote, 0) + 1

    lotes = session.exec(select(ModelLote).order_by(desc(ModelLote.id_lote))).all()
    resultado = []
    for l in lotes:
        sol = sols.get(l.id_solicitud)
        centro = centros.get(sol.id_centro) if sol else None
        resultado.append({
            **l.model_dump(),
            "codigo_solicitud": sol.codigo_solicitud if sol else f"SOL #{l.id_solicitud}",
            "estado_recoleccion": sol.estado_recoleccion if sol else "",
            "id_centro": sol.id_centro if sol else None,
            "nombre_centro": centro.nombre_centro if centro else "",
            "total_dispositivos": conteo.get(l.id_lote, 0),
        })
    return resultado


@solicitudes.post("/lotes", status_code=status.HTTP_201_CREATED)
def crear_lote(data: LoteCreate, session: SessionDep):
    existente = session.exec(
        select(ModelLote).where(ModelLote.codigo_lote == data.codigo_lote.strip())
    ).first()
    if existente:
        raise HTTPException(status_code=400, detail="El código de lote ya existe (UQ_LOTE_CODIGO).")

    sol = session.get(ModelSolicitud, data.id_solicitud)
    if not sol:
        raise HTTPException(status_code=404, detail="La solicitud asociada no existe.")

    nuevo = ModelLote(
        codigo_lote=data.codigo_lote.strip(),
        fecha_creacion=datetime.now(timezone.utc),
        id_solicitud=data.id_solicitud,
    )
    session.add(nuevo)
    registrar_auditoria(
        session,
        tabla_afectada="LOTE",
        tipo_operacion="INSERT",
        detalle=f"Creación de lote {nuevo.codigo_lote} vinculado a solicitud {sol.codigo_solicitud}",
        id_usuario=data.id_usuario or 1,
    )
    session.commit()
    session.refresh(nuevo)
    return nuevo


@solicitudes.delete("/lotes/{id_lote}")
def eliminar_lote(id_lote: int, session: SessionDep):
    lote = session.get(ModelLote, id_lote)
    if not lote:
        raise HTTPException(status_code=404, detail="Lote no encontrado.")
    try:
        codigo = lote.codigo_lote
        session.delete(lote)
        registrar_auditoria(
            session,
            tabla_afectada="LOTE",
            tipo_operacion="DELETE",
            detalle=f"Eliminación de lote {codigo}",
            id_usuario=1,
        )
        session.commit()
        return {"message": f"Lote {codigo} eliminado correctamente."}
    except Exception:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede eliminar el lote porque contiene dispositivos registrados (FK_DISPOSITIVO_LOTE).",
        )
