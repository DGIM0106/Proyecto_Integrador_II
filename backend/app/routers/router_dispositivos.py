from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Form, File, UploadFile
from sqlmodel import select, desc
from MyDbContext import SessionDep
from models.model_users import ModelUsuario, ModelRol
from models.model_catalogs import (
    ModelCentro,
    ModelCategoria,
    ModelCondicion,
    ModelEstadoCatalogo,
)
from models.model_traceability import (
    ModelSolicitud,
    ModelLote,
    ModelDispositivo,
    ModelEvaluacionTecnica,
    ModelHistorialEstados,
    ModelTransferenciaMovimiento,
    ModelTratamiento,
    ModelEvidencia,
    ModelInventario,
    DispositivoCreate,
    DispositivoUpdate,
    EvaluacionCreate,
    EvaluacionUpdate,
    TransferenciaCreate,
    TransferenciaUpdate,
)
from services.s3_service import upload_evidence_file, delete_evidence_file
from services.audit_service import registrar_auditoria

dispositivos = APIRouter(prefix="/dispositivos", tags=["Dispositivos y Trazabilidad RAEE"])

CLASIFICACIONES_VALIDAS = {
    "Reutilizacion",
    "Reacondicionamiento",
    "Reciclaje",
    "Disposicion Final",
}

ESTADOS_TRANSFERENCIA_VALIDOS = {"En Transito", "Entregado", "Cancelado"}


def _agregar_estado_historial(
    session: SessionDep,
    id_dispositivo: int,
    id_estado: int,
    observacion: str,
):
    historial_actual = session.exec(
        select(ModelHistorialEstados)
        .where(ModelHistorialEstados.id_dispositivo == id_dispositivo)
        .order_by(desc(ModelHistorialEstados.id_secuencia))
    ).first()
    nueva_secuencia = (historial_actual.id_secuencia + 1) if historial_actual else 1

    nuevo_hist = ModelHistorialEstados(
        id_dispositivo=id_dispositivo,
        id_secuencia=nueva_secuencia,
        id_estado=id_estado,
        fecha_cambio=datetime.now(timezone.utc),
        observacion=observacion[:250] if observacion else None,
    )
    session.add(nuevo_hist)


def _ajustar_inventario(session: SessionDep, id_centro: int, id_categoria: int, delta: int):
    inv = session.exec(
        select(ModelInventario).where(
            ModelInventario.id_centro == id_centro,
            ModelInventario.id_categoria == id_categoria,
        )
    ).first()
    ahora = datetime.now(timezone.utc)
    if inv:
        nuevo_stock = max(0, inv.stock_actual + delta)
        inv.stock_actual = nuevo_stock
        inv.fecha_actualizacion = ahora
        session.add(inv)
    elif delta > 0:
        nuevo_inv = ModelInventario(
            stock_actual=delta,
            fecha_actualizacion=ahora,
            id_centro=id_centro,
            id_categoria=id_categoria,
        )
        session.add(nuevo_inv)


@dispositivos.get("/")
def listar_dispositivos(session: SessionDep):
    categorias = {c.id_categoria: c.nombre_categoria for c in session.exec(select(ModelCategoria)).all()}
    lotes = {l.id_lote: l for l in session.exec(select(ModelLote)).all()}
    solicitudes_map = {s.id_solicitud: s for s in session.exec(select(ModelSolicitud)).all()}
    centros = {c.id_centro: c for c in session.exec(select(ModelCentro)).all()}
    estados_cat = {e.id_estado: e.nombre_estado for e in session.exec(select(ModelEstadoCatalogo)).all()}
    condiciones = {c.id_condicion: c.descripcion_condicion for c in session.exec(select(ModelCondicion)).all()}
    usuarios = {u.id_usuario: u.nombre for u in session.exec(select(ModelUsuario)).all()}

    evaluaciones = {
        ev.id_dispositivo: ev for ev in session.exec(select(ModelEvaluacionTecnica)).all()
    }
    tratamientos = {
        t.id_dispositivo: t for t in session.exec(select(ModelTratamiento)).all()
    }
    evidencias_all = session.exec(select(ModelEvidencia)).all()
    evidencias_por_trat = {}
    for evi in evidencias_all:
        evidencias_por_trat.setdefault(evi.id_tratamiento, []).append(evi.model_dump())

    # Obtener último estado de cada dispositivo
    historiales = session.exec(
        select(ModelHistorialEstados).order_by(
            ModelHistorialEstados.id_dispositivo,
            ModelHistorialEstados.id_secuencia,
        )
    ).all()
    ultimo_hist = {}
    conteo_pasos = {}
    for h in historiales:
        ultimo_hist[h.id_dispositivo] = h
        conteo_pasos[h.id_dispositivo] = conteo_pasos.get(h.id_dispositivo, 0) + 1

    dispositivos_list = session.exec(
        select(ModelDispositivo).order_by(desc(ModelDispositivo.id_dispositivo))
    ).all()

    resultado = []
    for d in dispositivos_list:
        lote = lotes.get(d.id_lote)
        sol = solicitudes_map.get(lote.id_solicitud) if lote else None
        centro = centros.get(sol.id_centro) if sol else None
        ult = ultimo_hist.get(d.id_dispositivo)
        ev = evaluaciones.get(d.id_dispositivo)
        trat = tratamientos.get(d.id_dispositivo)

        resultado.append({
            **d.model_dump(),
            "nombre_categoria": categorias.get(d.id_categoria, "Sin Categoría"),
            "codigo_lote": lote.codigo_lote if lote else f"Lote #{d.id_lote}",
            "id_solicitud": sol.id_solicitud if sol else None,
            "codigo_solicitud": sol.codigo_solicitud if sol else "",
            "id_centro_origen": centro.id_centro if centro else None,
            "nombre_centro": centro.nombre_centro if centro else "Centro no asignado",
            "codigo_centro": centro.codigo_centro if centro else "",
            "id_estado_actual": ult.id_estado if ult else 1,
            "estado_actual": estados_cat.get(ult.id_estado, "Recibido en Centro") if ult else "Recibido en Centro",
            "fecha_ultimo_estado": ult.fecha_cambio if ult else None,
            "total_eventos_historial": conteo_pasos.get(d.id_dispositivo, 0),
            "evaluacion": {
                **ev.model_dump(),
                "descripcion_condicion": condiciones.get(ev.id_condicion, ""),
                "nombre_evaluador": usuarios.get(ev.id_usuario_evaluador, f"Usuario #{ev.id_usuario_evaluador}"),
            } if ev else None,
            "tratamiento": {
                **trat.model_dump(),
                "evidencias": evidencias_por_trat.get(trat.id_tratamiento, []),
            } if trat else None,
        })
    return resultado


@dispositivos.get("/transferencias/all")
def listar_todas_transferencias(session: SessionDep):
    centros = {c.id_centro: c for c in session.exec(select(ModelCentro)).all()}
    disps = {d.id_dispositivo: d for d in session.exec(select(ModelDispositivo)).all()}
    movs = session.exec(
        select(ModelTransferenciaMovimiento).order_by(desc(ModelTransferenciaMovimiento.num_movimiento))
    ).all()

    resultado = []
    for m in movs:
        c_orig = centros.get(m.id_centro_origen)
        c_dest = centros.get(m.id_centro_destino)
        d = disps.get(m.id_dispositivo)
        resultado.append({
            **m.model_dump(),
            "nombre_centro_origen": c_orig.nombre_centro if c_orig else f"Centro #{m.id_centro_origen}",
            "codigo_centro_origen": c_orig.codigo_centro if c_orig else "",
            "nombre_centro_destino": c_dest.nombre_centro if c_dest else f"Centro #{m.id_centro_destino}",
            "codigo_centro_destino": c_dest.codigo_centro if c_dest else "",
            "num_serie": d.num_serie if d else "",
            "marca": d.marca if d else "",
            "modelo": d.modelo if d else "",
        })
    return resultado


@dispositivos.get("/{id_dispositivo}")
def obtener_detalle_trazabilidad(id_dispositivo: int, session: SessionDep):
    d = session.get(ModelDispositivo, id_dispositivo)
    if not d:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado.")

    cat = session.get(ModelCategoria, d.id_categoria)
    lote = session.get(ModelLote, d.id_lote)
    sol = session.get(ModelSolicitud, lote.id_solicitud) if lote else None
    centro = session.get(ModelCentro, sol.id_centro) if sol else None

    estados_cat = {e.id_estado: e.nombre_estado for e in session.exec(select(ModelEstadoCatalogo)).all()}
    centros_map = {c.id_centro: c for c in session.exec(select(ModelCentro)).all()}
    condiciones = {c.id_condicion: c.descripcion_condicion for c in session.exec(select(ModelCondicion)).all()}
    usuarios = {u.id_usuario: u.nombre for u in session.exec(select(ModelUsuario)).all()}

    historiales = session.exec(
        select(ModelHistorialEstados)
        .where(ModelHistorialEstados.id_dispositivo == id_dispositivo)
        .order_by(ModelHistorialEstados.id_secuencia)
    ).all()

    linea_tiempo = [
        {
            "id_secuencia": h.id_secuencia,
            "id_estado": h.id_estado,
            "nombre_estado": estados_cat.get(h.id_estado, f"Estado #{h.id_estado}"),
            "fecha_cambio": h.fecha_cambio,
            "observacion": h.observacion or "Sin observación",
        }
        for h in historiales
    ]

    ev = session.exec(
        select(ModelEvaluacionTecnica).where(ModelEvaluacionTecnica.id_dispositivo == id_dispositivo)
    ).first()

    transferencias = session.exec(
        select(ModelTransferenciaMovimiento)
        .where(ModelTransferenciaMovimiento.id_dispositivo == id_dispositivo)
        .order_by(ModelTransferenciaMovimiento.fecha_movimiento)
    ).all()

    trat = session.exec(
        select(ModelTratamiento).where(ModelTratamiento.id_dispositivo == id_dispositivo)
    ).first()

    evidencias = []
    if trat:
        evidencias = session.exec(
            select(ModelEvidencia).where(ModelEvidencia.id_tratamiento == trat.id_tratamiento)
        ).all()

    return {
        **d.model_dump(),
        "nombre_categoria": cat.nombre_categoria if cat else "",
        "codigo_lote": lote.codigo_lote if lote else "",
        "codigo_solicitud": sol.codigo_solicitud if sol else "",
        "nombre_centro_recepcion": centro.nombre_centro if centro else "",
        "id_centro_recepcion": centro.id_centro if centro else None,
        "historial_estados": linea_tiempo,
        "evaluacion_tecnica": {
            **ev.model_dump(),
            "descripcion_condicion": condiciones.get(ev.id_condicion, ""),
            "nombre_evaluador": usuarios.get(ev.id_usuario_evaluador, ""),
        } if ev else None,
        "transferencias": [
            {
                **m.model_dump(),
                "nombre_centro_origen": centros_map[m.id_centro_origen].nombre_centro if m.id_centro_origen in centros_map else "",
                "nombre_centro_destino": centros_map[m.id_centro_destino].nombre_centro if m.id_centro_destino in centros_map else "",
            }
            for m in transferencias
        ],
        "tratamiento": {
            **trat.model_dump(),
            "evidencias": [e.model_dump() for e in evidencias],
        } if trat else None,
    }


@dispositivos.post("/", status_code=status.HTTP_201_CREATED)
def registrar_dispositivo(data: DispositivoCreate, session: SessionDep):
    # RN-01: Identificador único de serie
    serie_clean = data.num_serie.strip().upper()
    existente = session.exec(
        select(ModelDispositivo).where(ModelDispositivo.num_serie == serie_clean)
    ).first()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Violación de RN-01 / UQ_DISPOSITIVO_SERIE: El número de serie '{serie_clean}' ya se encuentra registrado.",
        )

    cat = session.get(ModelCategoria, data.id_categoria)
    if not cat:
        raise HTTPException(status_code=404, detail="La categoría seleccionada no existe (FK_DISPOSITIVO_CATEGORIA).")

    lote = session.get(ModelLote, data.id_lote)
    if not lote:
        raise HTTPException(status_code=404, detail="El lote seleccionado no existe (FK_DISPOSITIVO_LOTE).")

    sol = session.get(ModelSolicitud, lote.id_solicitud)

    nuevo = ModelDispositivo(
        num_serie=serie_clean,
        marca=data.marca.strip(),
        modelo=data.modelo.strip(),
        id_categoria=data.id_categoria,
        id_lote=data.id_lote,
    )
    session.add(nuevo)
    session.flush()

    # RN-01: Crear primer registro de estado en HISTORIAL_ESTADOS (Estado 1: Recibido en Centro)
    _agregar_estado_historial(
        session,
        id_dispositivo=nuevo.id_dispositivo,
        id_estado=1,
        observacion=data.observacion_inicial or f"Ingreso inicial en lote {lote.codigo_lote}",
    )

    # RN-06: Actualizar inventario del centro de recepción de forma atómica
    if sol:
        _ajustar_inventario(session, sol.id_centro, data.id_categoria, delta=1)

    registrar_auditoria(
        session,
        tabla_afectada="DISPOSITIVO",
        tipo_operacion="INSERT",
        detalle=f"Registro de dispositivo {nuevo.num_serie} ({nuevo.marca} {nuevo.modelo}) en lote {lote.codigo_lote}",
        id_usuario=data.id_usuario or 1,
    )
    session.commit()
    session.refresh(nuevo)
    return nuevo


@dispositivos.put("/{id_dispositivo}")
def actualizar_dispositivo(id_dispositivo: int, data: DispositivoUpdate, session: SessionDep):
    disp = session.get(ModelDispositivo, id_dispositivo)
    if not disp:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado.")

    if data.num_serie is not None:
        serie_clean = data.num_serie.strip().upper()
        dup = session.exec(
            select(ModelDispositivo).where(
                ModelDispositivo.num_serie == serie_clean,
                ModelDispositivo.id_dispositivo != id_dispositivo,
            )
        ).first()
        if dup:
            raise HTTPException(status_code=400, detail="Ese número de serie ya pertenece a otro dispositivo.")
        disp.num_serie = serie_clean

    if data.marca is not None:
        disp.marca = data.marca.strip()
    if data.modelo is not None:
        disp.modelo = data.modelo.strip()
    if data.id_categoria is not None:
        disp.id_categoria = data.id_categoria
    if data.id_lote is not None:
        disp.id_lote = data.id_lote

    session.add(disp)
    registrar_auditoria(
        session,
        tabla_afectada="DISPOSITIVO",
        tipo_operacion="UPDATE",
        detalle=f"Actualización de datos del dispositivo ID {id_dispositivo} ({disp.num_serie})",
        id_usuario=data.id_usuario or 1,
    )
    session.commit()
    session.refresh(disp)
    return disp


@dispositivos.delete("/{id_dispositivo}")
def eliminar_dispositivo(id_dispositivo: int, session: SessionDep):
    disp = session.get(ModelDispositivo, id_dispositivo)
    if not disp:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado.")

    try:
        # Eliminar dependencias si el usuario solicita eliminar el dispositivo
        ev = session.exec(
            select(ModelEvaluacionTecnica).where(ModelEvaluacionTecnica.id_dispositivo == id_dispositivo)
        ).first()
        if ev:
            session.delete(ev)

        movs = session.exec(
            select(ModelTransferenciaMovimiento).where(ModelTransferenciaMovimiento.id_dispositivo == id_dispositivo)
        ).all()
        for m in movs:
            session.delete(m)

        trat = session.exec(
            select(ModelTratamiento).where(ModelTratamiento.id_dispositivo == id_dispositivo)
        ).first()
        if trat:
            evis = session.exec(
                select(ModelEvidencia).where(ModelEvidencia.id_tratamiento == trat.id_tratamiento)
            ).all()
            for e in evis:
                delete_evidence_file(e.url_archivo)
                session.delete(e)
            session.delete(trat)

        serie = disp.num_serie
        session.delete(disp)
        registrar_auditoria(
            session,
            tabla_afectada="DISPOSITIVO",
            tipo_operacion="DELETE",
            detalle=f"Eliminación de dispositivo {serie} (ID {id_dispositivo})",
            id_usuario=1,
        )
        session.commit()
        return {"message": f"Dispositivo {serie} eliminado correctamente."}
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"No se pudo eliminar el dispositivo por restricciones de integridad: {str(e)}",
        )


@dispositivos.post("/evaluaciones", status_code=status.HTTP_201_CREATED)
def registrar_evaluacion_tecnica(data: EvaluacionCreate, session: SessionDep):
    disp = session.get(ModelDispositivo, data.id_dispositivo)
    if not disp:
        raise HTTPException(status_code=404, detail="El dispositivo a evaluar no existe.")

    # Validar clasificación técnica (CK_EVAL_CLASIFICACION)
    if data.clasificacion_tecnica not in CLASIFICACIONES_VALIDAS:
        raise HTTPException(
            status_code=400,
            detail=f"Violación de CK_EVAL_CLASIFICACION: La clasificación '{data.clasificacion_tecnica}' no es válida. Use: {', '.join(CLASIFICACIONES_VALIDAS)}",
        )

    # RN-02: Solo un técnico autorizado o administrador puede registrar una evaluación técnica
    evaluador = session.get(ModelUsuario, data.id_usuario_evaluador)
    if not evaluador:
        raise HTTPException(status_code=404, detail="El usuario evaluador no existe.")
    rol_eval = session.get(ModelRol, evaluador.id_rol)
    if rol_eval and rol_eval.nombre_rol not in ("Tecnico Clasificador", "Administrador del Sistema"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Violación de RN-02: El usuario '{evaluador.nombre}' tiene rol '{rol_eval.nombre_rol}'. Solo un Técnico Clasificador autorizado puede registrar evaluaciones técnicas.",
        )

    # Verificar UQ_EVAL_DISPOSITIVO
    existente = session.exec(
        select(ModelEvaluacionTecnica).where(ModelEvaluacionTecnica.id_dispositivo == data.id_dispositivo)
    ).first()
    if existente:
        raise HTTPException(
            status_code=400,
            detail="Este dispositivo ya cuenta con una evaluación técnica registrada (UQ_EVAL_DISPOSITIVO). Puede editarla.",
        )

    nueva_eval = ModelEvaluacionTecnica(
        fecha_evaluacion=datetime.now(timezone.utc),
        diagnostico=data.diagnostico.strip(),
        clasificacion_tecnica=data.clasificacion_tecnica,
        id_dispositivo=data.id_dispositivo,
        id_condicion=data.id_condicion,
        id_usuario_evaluador=data.id_usuario_evaluador,
    )
    session.add(nueva_eval)

    # Actualizar historial de estados a 2 (En Evaluación) si estaba en 1, y luego a 3 (Evaluado / Clasificado)
    ult = session.exec(
        select(ModelHistorialEstados)
        .where(ModelHistorialEstados.id_dispositivo == data.id_dispositivo)
        .order_by(desc(ModelHistorialEstados.id_secuencia))
    ).first()
    if not ult or ult.id_estado == 1:
        _agregar_estado_historial(
            session,
            id_dispositivo=data.id_dispositivo,
            id_estado=2,
            observacion=f"Inspección técnica realizada por {evaluador.nombre}",
        )
        session.flush()

    _agregar_estado_historial(
        session,
        id_dispositivo=data.id_dispositivo,
        id_estado=3,
        observacion=f"Clasificado como {data.clasificacion_tecnica}: {data.diagnostico.strip()}",
    )

    registrar_auditoria(
        session,
        tabla_afectada="EVALUACION_TECNICA",
        tipo_operacion="INSERT",
        detalle=f"Evaluación técnica de equipo {disp.num_serie} -> {data.clasificacion_tecnica}",
        id_usuario=data.id_usuario_evaluador,
    )
    session.commit()
    session.refresh(nueva_eval)
    return nueva_eval


@dispositivos.put("/evaluaciones/{id_evaluacion}")
def actualizar_evaluacion_tecnica(id_evaluacion: int, data: EvaluacionUpdate, session: SessionDep):
    ev = session.get(ModelEvaluacionTecnica, id_evaluacion)
    if not ev:
        raise HTTPException(status_code=404, detail="Evaluación técnica no encontrada.")

    evaluador = session.get(ModelUsuario, data.id_usuario_evaluador)
    if not evaluador:
        raise HTTPException(status_code=404, detail="Usuario evaluador no encontrado.")
    rol_eval = session.get(ModelRol, evaluador.id_rol)
    if rol_eval and rol_eval.nombre_rol not in ("Tecnico Clasificador", "Administrador del Sistema"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Violación de RN-02: Solo un Técnico Clasificador autorizado puede cambiar la clasificación técnica.",
        )

    if data.clasificacion_tecnica is not None:
        if data.clasificacion_tecnica not in CLASIFICACIONES_VALIDAS:
            raise HTTPException(status_code=400, detail="Clasificación técnica no válida.")
        ev.clasificacion_tecnica = data.clasificacion_tecnica
    if data.diagnostico is not None:
        ev.diagnostico = data.diagnostico.strip()
    if data.id_condicion is not None:
        ev.id_condicion = data.id_condicion
    ev.id_usuario_evaluador = data.id_usuario_evaluador

    session.add(ev)
    registrar_auditoria(
        session,
        tabla_afectada="EVALUACION_TECNICA",
        tipo_operacion="UPDATE",
        detalle=f"Actualización de evaluación ID {id_evaluacion} a clasificación {ev.clasificacion_tecnica}",
        id_usuario=data.id_usuario_evaluador,
    )
    session.commit()
    session.refresh(ev)
    return ev


@dispositivos.post("/transferencias", status_code=status.HTTP_201_CREATED)
def registrar_transferencia(data: TransferenciaCreate, session: SessionDep):
    # RN-03 y CK_MOV_CENTROS_DISTINTOS: Origen y destino deben ser distintos y válidos
    if data.id_centro_origen == data.id_centro_destino:
        raise HTTPException(
            status_code=400,
            detail="Violación de RN-03 / CK_MOV_CENTROS_DISTINTOS: El centro de origen y el centro de destino no pueden ser el mismo.",
        )

    if data.estado_transferencia not in ESTADOS_TRANSFERENCIA_VALIDOS:
        raise HTTPException(
            status_code=400,
            detail=f"Estado de transferencia inválido. Use: {', '.join(ESTADOS_TRANSFERENCIA_VALIDOS)}",
        )

    disp = session.get(ModelDispositivo, data.id_dispositivo)
    if not disp:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado.")

    c_orig = session.get(ModelCentro, data.id_centro_origen)
    c_dest = session.get(ModelCentro, data.id_centro_destino)
    if not c_orig or not c_dest:
        raise HTTPException(status_code=404, detail="Centro de origen o destino no existe.")

    mov = ModelTransferenciaMovimiento(
        fecha_movimiento=datetime.now(timezone.utc),
        estado_transferencia=data.estado_transferencia,
        id_centro_origen=data.id_centro_origen,
        id_centro_destino=data.id_centro_destino,
        id_dispositivo=data.id_dispositivo,
    )
    session.add(mov)

    # RN-06: Actualizar inventario de origen y destino de manera atómica
    if data.estado_transferencia == "Entregado":
        _ajustar_inventario(session, data.id_centro_origen, disp.id_categoria, delta=-1)
        _ajustar_inventario(session, data.id_centro_destino, disp.id_categoria, delta=1)
        _agregar_estado_historial(
            session,
            id_dispositivo=data.id_dispositivo,
            id_estado=5,
            observacion=f"Transferencia entregada de {c_orig.nombre_centro} a {c_dest.nombre_centro}",
        )
    else:
        _agregar_estado_historial(
            session,
            id_dispositivo=data.id_dispositivo,
            id_estado=4,
            observacion=f"En tránsito desde {c_orig.nombre_centro} hacia {c_dest.nombre_centro}",
        )

    registrar_auditoria(
        session,
        tabla_afectada="TRANSFERENCIA_MOVIMIENTO",
        tipo_operacion="INSERT",
        detalle=f"Transferencia de equipo {disp.num_serie}: {c_orig.codigo_centro} -> {c_dest.codigo_centro} ({data.estado_transferencia})",
        id_usuario=data.id_usuario or 1,
    )
    session.commit()
    session.refresh(mov)
    return mov


@dispositivos.put("/transferencias/{num_movimiento}")
def actualizar_estado_transferencia(num_movimiento: int, data: TransferenciaUpdate, session: SessionDep):
    mov = session.get(ModelTransferenciaMovimiento, num_movimiento)
    if not mov:
        raise HTTPException(status_code=404, detail="Transferencia no encontrada.")

    if data.estado_transferencia not in ESTADOS_TRANSFERENCIA_VALIDOS:
        raise HTTPException(status_code=400, detail="Estado de transferencia inválido.")

    estado_anterior = mov.estado_transferencia
    mov.estado_transferencia = data.estado_transferencia
    session.add(mov)

    disp = session.get(ModelDispositivo, mov.id_dispositivo)
    c_dest = session.get(ModelCentro, mov.id_centro_destino)

    if estado_anterior != "Entregado" and data.estado_transferencia == "Entregado" and disp:
        # RN-06: Transacción atómica de inventario origen/destino al confirmar entrega
        _ajustar_inventario(session, mov.id_centro_origen, disp.id_categoria, delta=-1)
        _ajustar_inventario(session, mov.id_centro_destino, disp.id_categoria, delta=1)
        _agregar_estado_historial(
            session,
            id_dispositivo=disp.id_dispositivo,
            id_estado=5,
            observacion=f"Recepción confirmada en {c_dest.nombre_centro if c_dest else 'destino'}",
        )

    registrar_auditoria(
        session,
        tabla_afectada="TRANSFERENCIA_MOVIMIENTO",
        tipo_operacion="UPDATE",
        detalle=f"Movimiento #{num_movimiento} actualizado de '{estado_anterior}' a '{data.estado_transferencia}'",
        id_usuario=data.id_usuario or 1,
    )
    session.commit()
    session.refresh(mov)
    return mov


@dispositivos.post("/tratamientos", status_code=status.HTTP_201_CREATED)
def cerrar_trazabilidad_con_tratamiento(
    session: SessionDep,
    id_dispositivo: int = Form(...),
    resultado: str = Form(...),
    destino: str = Form(...),
    id_usuario: int = Form(1),
    archivo_evidencia: Optional[UploadFile] = File(None),
    tipo_archivo_manual: Optional[str] = Form("PDF"),
    url_archivo_manual: Optional[str] = Form(None),
):
    disp = session.get(ModelDispositivo, id_dispositivo)
    if not disp:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado.")

    existente = session.exec(
        select(ModelTratamiento).where(ModelTratamiento.id_dispositivo == id_dispositivo)
    ).first()
    if existente:
        raise HTTPException(
            status_code=400,
            detail="Este dispositivo ya tiene un tratamiento y cierre de trazabilidad registrado (UQ_TRATAMIENTO_DISPOSITIVO).",
        )

    # RN-04: Un dispositivo clasificado como Disposicion Final no puede asignarse a un beneficiario / donación
    ev = session.exec(
        select(ModelEvaluacionTecnica).where(ModelEvaluacionTecnica.id_dispositivo == id_dispositivo)
    ).first()
    if ev and ev.clasificacion_tecnica == "Disposicion Final":
        palabras_beneficiario = ("donacion", "donación", "beneficiario", "escuela", "colegio", "fundacion", "fundación")
        texto_check = f"{resultado} {destino}".lower()
        if any(p in texto_check for p in palabras_beneficiario):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Violación de RN-04: Un dispositivo clasificado como 'Disposicion Final' (no recuperable) no puede asignarse a una entidad beneficiaria o donación.",
            )

    # RN-08: El cierre de trazabilidad requiere destino final, fecha de confirmación y evidencia válida
    if not destino.strip() or not resultado.strip():
        raise HTTPException(
            status_code=400,
            detail="Violación de RN-08: El cierre de trazabilidad requiere especificar resultado y destino final.",
        )

    # Procesar archivo de evidencia (local en /uploads o URL simulada S3)
    if archivo_evidencia and archivo_evidencia.filename:
        try:
            tipo_archivo, url_archivo = upload_evidence_file(
                file_obj=archivo_evidencia.file,
                filename=archivo_evidencia.filename,
                content_type=archivo_evidencia.content_type or "application/octet-stream",
            )
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=str(ve))
    else:
        tipo_archivo = (tipo_archivo_manual or "PDF").upper()
        if tipo_archivo not in ("PDF", "JPG", "PNG", "DOCX"):
            raise HTTPException(
                status_code=400,
                detail="Violación de CK_EVIDENCIA_TIPO: El tipo de archivo debe ser PDF, JPG, PNG o DOCX.",
            )
        url_archivo = (
            url_archivo_manual.strip()
            if url_archivo_manual and url_archivo_manual.strip()
            else f"http://localhost:8000/uploads/acta_cierre_{disp.num_serie.lower()}.{tipo_archivo.lower()}"
        )

    ahora = datetime.now(timezone.utc)
    nuevo_trat = ModelTratamiento(
        resultado=resultado.strip(),
        destino=destino.strip(),
        fecha_cierre=ahora,
        id_dispositivo=id_dispositivo,
    )
    session.add(nuevo_trat)
    session.flush()

    nueva_evidencia = ModelEvidencia(
        tipo_archivo=tipo_archivo,
        url_archivo=url_archivo,
        id_tratamiento=nuevo_trat.id_tratamiento,
    )
    session.add(nueva_evidencia)

    # Avanzar historial de estados al estado 6: 'Cerrado / Trazabilidad Completa'
    _agregar_estado_historial(
        session,
        id_dispositivo=id_dispositivo,
        id_estado=6,
        observacion=f"Trazabilidad cerrada. Resultado: {resultado.strip()} | Destino: {destino.strip()}",
    )

    registrar_auditoria(
        session,
        tabla_afectada="TRATAMIENTO",
        tipo_operacion="INSERT",
        detalle=f"Cierre de trazabilidad de equipo {disp.num_serie} en destino '{destino.strip()}' con evidencia {tipo_archivo}",
        id_usuario=id_usuario,
    )
    session.commit()
    session.refresh(nuevo_trat)
    session.refresh(nueva_evidencia)

    return {
        **nuevo_trat.model_dump(),
        "evidencia": nueva_evidencia.model_dump(),
    }
