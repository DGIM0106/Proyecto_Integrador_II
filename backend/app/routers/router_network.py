from datetime import datetime, timezone
from decimal import Decimal
from fastapi import APIRouter, HTTPException, status
from sqlmodel import select, desc
from MyDbContext import SessionDep
from models.model_catalogs import ModelCentro, ModelCategoria, ModelEstadoCatalogo
from models.model_users import ModelUsuario
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
)
from models.model_network import (
    ModelNodo,
    ModelArista,
    ModelEscenario,
    ModelIndicador,
    ModelAlerta,
    ModelAuditoria,
    NodoCreate,
    AristaCreate,
    AlertaCreate,
    AlertaUpdate,
    MaxFlowRequest,
)
from services.flow_service import edmonds_karp_max_flow, get_formalized_business_rules
from services.audit_service import registrar_auditoria

red = APIRouter(prefix="/red", tags=["Modelo Matemático de Red y Reportes"])

CRITICIDADES_VALIDAS = {"Baja", "Media", "Alta", "Critica"}
ESTADOS_ALERTA_VALIDOS = {"Activa", "En Atencion", "Resuelta"}


@red.get("/grafo")
def obtener_grafo_y_flujo(session: SessionDep):
    nodos_raw = session.exec(select(ModelNodo)).all()
    aristas_raw = session.exec(select(ModelArista)).all()
    escenarios = session.exec(select(ModelEscenario)).all()
    indicadores = session.exec(select(ModelIndicador)).all()

    nodes = [
        {
            "id_nodo": n.id_nodo,
            "tipo_nodo": n.tipo_nodo,
            "capacidad_nodo": float(n.capacidad_nodo),
        }
        for n in nodos_raw
    ]
    edges = [
        {
            "id_arista": a.id_arista,
            "distancia_km": float(a.distancia_km),
            "tiempo_estimado_min": a.tiempo_estimado_min,
            "id_nodo_origen": a.id_nodo_origen,
            "id_nodo_destino": a.id_nodo_destino,
        }
        for a in aristas_raw
    ]

    flujo_base = edmonds_karp_max_flow(nodes, edges, factor_capacidad=1.0)
    flujo_expansion = edmonds_karp_max_flow(nodes, edges, factor_capacidad=1.35)
    flujo_contingencia = edmonds_karp_max_flow(nodes, edges, factor_capacidad=0.70)

    return {
        "nodos": nodes,
        "aristas": edges,
        "escenarios": [e.model_dump() for e in escenarios],
        "indicadores": [
            {
                **i.model_dump(),
                "valor_meta": float(i.valor_meta),
                "valor_actual": float(i.valor_actual),
            }
            for i in indicadores
        ],
        "analisis_flujo_actual": flujo_base,
        "comparacion_escenarios": [
            {
                "nombre": "Escenario 1: Capacidad Operativa Base (100%)",
                "factor": 1.0,
                "flujo_maximo": flujo_base["flujo_maximo"],
                "aristas_saturadas": sum(1 for a in flujo_base["flujo_por_arista"] if a["saturada"]),
                "capacidad_corte_minimo": flujo_base["corte_minimo"]["capacidad_corte"],
            },
            {
                "nombre": "Escenario 2: Ampliación de Flota y Turnos (+35%)",
                "factor": 1.35,
                "flujo_maximo": flujo_expansion["flujo_maximo"],
                "aristas_saturadas": sum(1 for a in flujo_expansion["flujo_por_arista"] if a["saturada"]),
                "capacidad_corte_minimo": flujo_expansion["corte_minimo"]["capacidad_corte"],
            },
            {
                "nombre": "Escenario 3: Restricción / Cuello de Botella Vial (-30%)",
                "factor": 0.70,
                "flujo_maximo": flujo_contingencia["flujo_maximo"],
                "aristas_saturadas": sum(1 for a in flujo_contingencia["flujo_por_arista"] if a["saturada"]),
                "capacidad_corte_minimo": flujo_contingencia["corte_minimo"]["capacidad_corte"],
            },
        ],
        "reglas_discretas": get_formalized_business_rules(),
    }


@red.post("/flujo-maximo")
def ejecutar_simulacion_flujo(data: MaxFlowRequest, session: SessionDep):
    nodos_raw = session.exec(select(ModelNodo)).all()
    aristas_raw = session.exec(select(ModelArista)).all()

    nodes = [
        {
            "id_nodo": n.id_nodo,
            "tipo_nodo": n.tipo_nodo,
            "capacidad_nodo": float(n.capacidad_nodo),
        }
        for n in nodos_raw
    ]
    edges = [
        {
            "id_arista": a.id_arista,
            "distancia_km": float(a.distancia_km),
            "tiempo_estimado_min": a.tiempo_estimado_min,
            "id_nodo_origen": a.id_nodo_origen,
            "id_nodo_destino": a.id_nodo_destino,
        }
        for a in aristas_raw
    ]

    resultado = edmonds_karp_max_flow(
        nodes,
        edges,
        source_id=data.id_nodo_origen,
        sink_id=data.id_nodo_sumidero,
        factor_capacidad=data.factor_capacidad,
    )

    if data.guardar_escenario:
        codigo = (
            data.codigo_escenario.strip()
            if data.codigo_escenario and data.codigo_escenario.strip()
            else f"ESC-FLOW-{datetime.now().strftime('%H%M%S')}"
        )
        res_texto = (
            f"Flujo máximo: {resultado['flujo_maximo']} t/periodo "
            f"(Factor {data.factor_capacidad}x, Corte mín: {resultado['corte_minimo']['capacidad_corte']})"
        )[:150]

        existente = session.exec(
            select(ModelEscenario).where(ModelEscenario.codigo_escenario == codigo)
        ).first()
        if existente:
            existente.resultado = res_texto
            session.add(existente)
            esc_obj = existente
        else:
            esc_obj = ModelEscenario(codigo_escenario=codigo, resultado=res_texto)
            session.add(esc_obj)
        session.commit()
        session.refresh(esc_obj)
        resultado["escenario_guardado"] = esc_obj.model_dump()

    return resultado


@red.post("/nodos", status_code=status.HTTP_201_CREATED)
def crear_nodo(data: NodoCreate, session: SessionDep):
    if data.capacidad_nodo <= 0:
        raise HTTPException(
            status_code=400,
            detail="La capacidad del nodo debe ser mayor que 0 (CK_NODO_CAPACIDAD).",
        )
    nuevo = ModelNodo(
        tipo_nodo=data.tipo_nodo.strip(),
        capacidad_nodo=Decimal(str(round(data.capacidad_nodo, 2))),
    )
    session.add(nuevo)
    session.commit()
    session.refresh(nuevo)
    return {
        "id_nodo": nuevo.id_nodo,
        "tipo_nodo": nuevo.tipo_nodo,
        "capacidad_nodo": float(nuevo.capacidad_nodo),
    }


@red.delete("/nodos/{id_nodo}")
def eliminar_nodo(id_nodo: int, session: SessionDep):
    nodo = session.get(ModelNodo, id_nodo)
    if not nodo:
        raise HTTPException(status_code=404, detail="Nodo no encontrado.")
    try:
        session.delete(nodo)
        session.commit()
        return {"message": "Nodo eliminado correctamente."}
    except Exception:
        session.rollback()
        raise HTTPException(
            status_code=409,
            detail="No se puede eliminar el nodo porque tiene aristas conectadas (FK_ARISTA_ORIGEN / FK_ARISTA_DESTINO).",
        )


@red.post("/aristas", status_code=status.HTTP_201_CREATED)
def crear_arista(data: AristaCreate, session: SessionDep):
    if data.id_nodo_origen == data.id_nodo_destino:
        raise HTTPException(
            status_code=400,
            detail="Violación de CK_ARISTA_NODOS_DISTINTOS: El nodo origen y destino deben ser distintos.",
        )
    if data.distancia_km <= 0 or data.tiempo_estimado_min <= 0:
        raise HTTPException(
            status_code=400,
            detail="La distancia y el tiempo estimado deben ser mayores a 0 (CK_ARISTA_DISTANCIA / CK_ARISTA_TIEMPO).",
        )

    n_orig = session.get(ModelNodo, data.id_nodo_origen)
    n_dest = session.get(ModelNodo, data.id_nodo_destino)
    if not n_orig or not n_dest:
        raise HTTPException(status_code=404, detail="Nodo origen o destino no existe.")

    nueva = ModelArista(
        distancia_km=Decimal(str(round(data.distancia_km, 2))),
        tiempo_estimado_min=data.tiempo_estimado_min,
        id_nodo_origen=data.id_nodo_origen,
        id_nodo_destino=data.id_nodo_destino,
    )
    session.add(nueva)
    session.commit()
    session.refresh(nueva)
    return {
        "id_arista": nueva.id_arista,
        "distancia_km": float(nueva.distancia_km),
        "tiempo_estimado_min": nueva.tiempo_estimado_min,
        "id_nodo_origen": nueva.id_nodo_origen,
        "id_nodo_destino": nueva.id_nodo_destino,
    }


@red.delete("/aristas/{id_arista}")
def eliminar_arista(id_arista: int, session: SessionDep):
    arista = session.get(ModelArista, id_arista)
    if not arista:
        raise HTTPException(status_code=404, detail="Arista no encontrada.")
    session.delete(arista)
    session.commit()
    return {"message": "Arista eliminada correctamente."}


@red.get("/dashboard")
def obtener_dashboard_y_consultas_sql(session: SessionDep):
    """
    Ejecuta y consolida las consultas analíticas definidas en Scripts/04_consultas.sql
    junto con los indicadores clave de desempeño (KPIs), alertas y auditoría.
    """
    dispositivos_all = session.exec(select(ModelDispositivo)).all()
    tratamientos_all = session.exec(select(ModelTratamiento)).all()
    evaluaciones_all = session.exec(select(ModelEvaluacionTecnica)).all()
    solicitudes_all = session.exec(select(ModelSolicitud)).all()
    lotes_all = session.exec(select(ModelLote)).all()
    centros_all = session.exec(select(ModelCentro)).all()
    categorias_all = session.exec(select(ModelCategoria)).all()
    estados_all = session.exec(select(ModelEstadoCatalogo)).all()
    historiales_all = session.exec(select(ModelHistorialEstados)).all()
    inventarios_all = session.exec(select(ModelInventario)).all()
    alertas_all = session.exec(select(ModelAlerta).order_by(desc(ModelAlerta.fecha_generacion))).all()
    auditorias_all = session.exec(select(ModelAuditoria).order_by(desc(ModelAuditoria.fecha_accion)).limit(25)).all()
    usuarios_map = {u.id_usuario: u.nombre for u in session.exec(select(ModelUsuario)).all()}

    centros_map = {c.id_centro: c for c in centros_all}
    categorias_map = {cat.id_categoria: cat.nombre_categoria for cat in categorias_all}
    estados_map = {e.id_estado: e.nombre_estado for e in estados_all}
    lotes_map = {l.id_lote: l for l in lotes_all}
    sols_map = {s.id_solicitud: s for s in solicitudes_all}
    eval_por_disp = {ev.id_dispositivo: ev for ev in evaluaciones_all}

    # Último estado por dispositivo (Consulta 2 de 04_consultas.sql)
    ultimo_estado_disp = {}
    for h in sorted(historiales_all, key=lambda x: (x.id_dispositivo, x.id_secuencia)):
        ultimo_estado_disp[h.id_dispositivo] = h.id_estado

    # Consulta 2: Dispositivos por Centro y Estado Actual
    agrupado_centro_estado = {}
    for d in dispositivos_all:
        lote = lotes_map.get(d.id_lote)
        sol = sols_map.get(lote.id_solicitud) if lote else None
        centro = centros_map.get(sol.id_centro) if sol else None
        id_est = ultimo_estado_disp.get(d.id_dispositivo, 1)
        nombre_est = estados_map.get(id_est, "Recibido en Centro")
        key = (
            centro.codigo_centro if centro else "SIN-CEN",
            centro.nombre_centro if centro else "Sin Centro",
            nombre_est,
        )
        agrupado_centro_estado[key] = agrupado_centro_estado.get(key, 0) + 1

    consulta_2_centro_estado = [
        {
            "codigo_centro": k[0],
            "nombre_centro": k[1],
            "estado_actual": k[2],
            "cantidad_dispositivos": cant,
        }
        for k, cant in sorted(agrupado_centro_estado.items(), key=lambda x: (x[0][1], -x[1]))
    ]

    # Consulta 3: Dispositivos por Categoría y Clasificación Técnica
    agrupado_cat_clasif = {}
    for d in dispositivos_all:
        nom_cat = categorias_map.get(d.id_categoria, "Sin Categoría")
        ev = eval_por_disp.get(d.id_dispositivo)
        clasif = ev.clasificacion_tecnica if ev else "PENDIENTE DE EVALUAR"
        key = (nom_cat, clasif)
        agrupado_cat_clasif[key] = agrupado_cat_clasif.get(key, 0) + 1

    consulta_3_categoria_clasificacion = [
        {
            "nombre_categoria": k[0],
            "clasificacion_asignada": k[1],
            "total_dispositivos": cant,
        }
        for k, cant in sorted(agrupado_cat_clasif.items(), key=lambda x: (x[0][0], -x[1]))
    ]

    # Consulta 4: Porcentaje de trazabilidad cerrada
    total_ingresados = len(dispositivos_all)
    total_cerrados = len(tratamientos_all)
    pct_cerrada = round((total_cerrados / total_ingresados) * 100.0, 2) if total_ingresados > 0 else 0.0

    # Consulta 5: Equipos pendientes de evaluación técnica (WHERE NOT EXISTS en EVALUACION_TECNICA)
    consulta_5_pendientes = []
    for d in sorted(dispositivos_all, key=lambda x: x.id_dispositivo):
        if d.id_dispositivo not in eval_por_disp:
            lote = lotes_map.get(d.id_lote)
            sol = sols_map.get(lote.id_solicitud) if lote else None
            centro = centros_map.get(sol.id_centro) if sol else None
            consulta_5_pendientes.append({
                "id_dispositivo": d.id_dispositivo,
                "num_serie": d.num_serie,
                "marca": d.marca,
                "modelo": d.modelo,
                "nombre_categoria": categorias_map.get(d.id_categoria, ""),
                "codigo_lote": lote.codigo_lote if lote else "",
                "centro_recepcion": centro.nombre_centro if centro else "",
            })

    # Distribución por clasificación técnica
    conteo_clasificaciones = {
        "Reutilizacion": 0,
        "Reacondicionamiento": 0,
        "Reciclaje": 0,
        "Disposicion Final": 0,
        "Pendiente": len(consulta_5_pendientes),
    }
    for ev in evaluaciones_all:
        if ev.clasificacion_tecnica in conteo_clasificaciones:
            conteo_clasificaciones[ev.clasificacion_tecnica] += 1

    return {
        "kpis": {
            "total_dispositivos": total_ingresados,
            "dispositivos_evaluados": len(evaluaciones_all),
            "dispositivos_pendientes_evaluar": len(consulta_5_pendientes),
            "dispositivos_cerrados": total_cerrados,
            "porcentaje_trazabilidad_cerrada": pct_cerrada,
            "total_solicitudes": len(solicitudes_all),
            "total_lotes": len(lotes_all),
            "stock_total_inventario": sum(i.stock_actual for i in inventarios_all),
            "alertas_activas": sum(1 for a in alertas_all if a.estado_alerta != "Resuelta"),
        },
        "distribucion_clasificacion": conteo_clasificaciones,
        "consulta_2_centro_estado": consulta_2_centro_estado,
        "consulta_3_categoria_clasificacion": consulta_3_categoria_clasificacion,
        "consulta_5_pendientes_evaluacion": consulta_5_pendientes,
        "alertas": [
            {
                **a.model_dump(),
                "nombre_centro": centros_map[a.id_centro].nombre_centro if a.id_centro in centros_map else f"Centro #{a.id_centro}",
            }
            for a in alertas_all
        ],
        "auditoria": [
            {
                **aud.model_dump(),
                "nombre_usuario": usuarios_map.get(aud.id_usuario, f"Usuario #{aud.id_usuario}"),
            }
            for aud in auditorias_all
        ],
    }


@red.post("/alertas", status_code=status.HTTP_201_CREATED)
def crear_alerta(data: AlertaCreate, session: SessionDep):
    if data.nivel_criticidad not in CRITICIDADES_VALIDAS:
        raise HTTPException(status_code=400, detail="Criticidad inválida (Baja, Media, Alta, Critica).")
    if data.estado_alerta not in ESTADOS_ALERTA_VALIDOS:
        raise HTTPException(status_code=400, detail="Estado de alerta inválido (Activa, En Atencion, Resuelta).")

    alerta = ModelAlerta(
        fecha_generacion=datetime.now(timezone.utc),
        nivel_criticidad=data.nivel_criticidad,
        mensaje=data.mensaje.strip(),
        estado_alerta=data.estado_alerta,
        id_centro=data.id_centro,
    )
    session.add(alerta)
    session.commit()
    session.refresh(alerta)
    return alerta


@red.put("/alertas/{id_alerta}")
def actualizar_alerta(id_alerta: int, data: AlertaUpdate, session: SessionDep):
    alerta = session.get(ModelAlerta, id_alerta)
    if not alerta:
        raise HTTPException(status_code=404, detail="Alerta no encontrada.")
    if data.estado_alerta not in ESTADOS_ALERTA_VALIDOS:
        raise HTTPException(status_code=400, detail="Estado de alerta inválido.")
    alerta.estado_alerta = data.estado_alerta
    if data.nivel_criticidad is not None:
        alerta.nivel_criticidad = data.nivel_criticidad
    if data.mensaje is not None:
        alerta.mensaje = data.mensaje.strip()
    session.add(alerta)
    session.commit()
    session.refresh(alerta)
    return alerta


@red.delete("/alertas/{id_alerta}")
def eliminar_alerta(id_alerta: int, session: SessionDep):
    alerta = session.get(ModelAlerta, id_alerta)
    if not alerta:
        raise HTTPException(status_code=404, detail="Alerta no encontrada.")
    session.delete(alerta)
    session.commit()
    return {"message": "Alerta eliminada correctamente."}
