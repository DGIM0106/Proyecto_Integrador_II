from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status
from sqlmodel import select
from MyDbContext import SessionDep
from models.model_catalogs import (
    ModelTipoCentro,
    ModelCentro,
    ModelCategoria,
    ModelCondicion,
    ModelEstadoCatalogo,
    CentroCreate,
    CentroUpdate,
    CategoriaCreate,
)
from models.model_users import ModelOrganizacion, ModelRol
from models.model_traceability import ModelInventario, InventarioUpdate
from services.audit_service import registrar_auditoria

catalogos = APIRouter(prefix="/catalogos", tags=["Catálogos e Inventario"])


@catalogos.get("/resumen")
def obtener_todos_catalogos(session: SessionDep):
    tipos_centro = session.exec(select(ModelTipoCentro)).all()
    tipo_map = {t.id_tipo_centro: t.nombre_tipo for t in tipos_centro}

    centros_raw = session.exec(select(ModelCentro)).all()
    centros = [
        {
            **c.model_dump(),
            "nombre_tipo_centro": tipo_map.get(c.id_tipo_centro, "General"),
        }
        for c in centros_raw
    ]

    return {
        "tipos_centro": tipos_centro,
        "centros": centros,
        "categorias": session.exec(select(ModelCategoria)).all(),
        "condiciones": session.exec(select(ModelCondicion)).all(),
        "estados_catalogo": session.exec(select(ModelEstadoCatalogo)).all(),
        "organizaciones": session.exec(select(ModelOrganizacion)).all(),
        "roles": session.exec(select(ModelRol)).all(),
    }


@catalogos.get("/centros")
def listar_centros(session: SessionDep):
    tipos = {t.id_tipo_centro: t.nombre_tipo for t in session.exec(select(ModelTipoCentro)).all()}
    centros = session.exec(select(ModelCentro)).all()
    return [
        {
            **c.model_dump(),
            "nombre_tipo_centro": tipos.get(c.id_tipo_centro, "General"),
        }
        for c in centros
    ]


@catalogos.post("/centros", status_code=status.HTTP_201_CREATED)
def crear_centro(data: CentroCreate, session: SessionDep):
    existente = session.exec(
        select(ModelCentro).where(ModelCentro.codigo_centro == data.codigo_centro.strip())
    ).first()
    if existente:
        raise HTTPException(status_code=400, detail="El código de centro ya existe.")

    nuevo = ModelCentro(
        codigo_centro=data.codigo_centro.strip(),
        nombre_centro=data.nombre_centro.strip(),
        direccion=data.direccion.strip(),
        id_tipo_centro=data.id_tipo_centro,
    )
    session.add(nuevo)
    session.commit()
    session.refresh(nuevo)
    return nuevo


@catalogos.put("/centros/{id_centro}")
def actualizar_centro(id_centro: int, data: CentroUpdate, session: SessionDep):
    centro = session.get(ModelCentro, id_centro)
    if not centro:
        raise HTTPException(status_code=404, detail="Centro no encontrado.")

    if data.codigo_centro is not None:
        centro.codigo_centro = data.codigo_centro.strip()
    if data.nombre_centro is not None:
        centro.nombre_centro = data.nombre_centro.strip()
    if data.direccion is not None:
        centro.direccion = data.direccion.strip()
    if data.id_tipo_centro is not None:
        centro.id_tipo_centro = data.id_tipo_centro

    session.add(centro)
    session.commit()
    session.refresh(centro)
    return centro


@catalogos.delete("/centros/{id_centro}")
def eliminar_centro(id_centro: int, session: SessionDep):
    centro = session.get(ModelCentro, id_centro)
    if not centro:
        raise HTTPException(status_code=404, detail="Centro no encontrado.")
    try:
        session.delete(centro)
        session.commit()
        return {"message": "Centro eliminado correctamente."}
    except Exception:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede eliminar el centro porque tiene solicitudes, inventario o transferencias asociadas.",
        )


@catalogos.get("/categorias")
def listar_categorias(session: SessionDep):
    return session.exec(select(ModelCategoria)).all()


@catalogos.post("/categorias", status_code=status.HTTP_201_CREATED)
def crear_categoria(data: CategoriaCreate, session: SessionDep):
    existente = session.exec(
        select(ModelCategoria).where(ModelCategoria.nombre_categoria == data.nombre_categoria.strip())
    ).first()
    if existente:
        raise HTTPException(status_code=400, detail="La categoría ya existe.")
    cat = ModelCategoria(nombre_categoria=data.nombre_categoria.strip())
    session.add(cat)
    session.commit()
    session.refresh(cat)
    return cat


@catalogos.delete("/categorias/{id_categoria}")
def eliminar_categoria(id_categoria: int, session: SessionDep):
    cat = session.get(ModelCategoria, id_categoria)
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada.")
    try:
        session.delete(cat)
        session.commit()
        return {"message": "Categoría eliminada correctamente."}
    except Exception:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede eliminar la categoría porque tiene dispositivos o registros de inventario asociados (FK_DISPOSITIVO_CATEGORIA / FK_INVENTARIO_CATEGORIA).",
        )


@catalogos.get("/inventario")
def listar_inventario(session: SessionDep):
    centros = {c.id_centro: c for c in session.exec(select(ModelCentro)).all()}
    categorias = {cat.id_categoria: cat for cat in session.exec(select(ModelCategoria)).all()}
    items = session.exec(select(ModelInventario)).all()

    resultado = []
    for inv in items:
        c = centros.get(inv.id_centro)
        cat = categorias.get(inv.id_categoria)
        resultado.append({
            "id_inventario": inv.id_inventario,
            "stock_actual": inv.stock_actual,
            "fecha_actualizacion": inv.fecha_actualizacion,
            "id_centro": inv.id_centro,
            "codigo_centro": c.codigo_centro if c else "",
            "nombre_centro": c.nombre_centro if c else f"Centro #{inv.id_centro}",
            "id_categoria": inv.id_categoria,
            "nombre_categoria": cat.nombre_categoria if cat else f"Categoría #{inv.id_categoria}",
        })
    return resultado


@catalogos.post("/inventario")
def actualizar_o_crear_inventario(data: InventarioUpdate, session: SessionDep):
    if data.stock_actual < 0:
        raise HTTPException(
            status_code=400,
            detail="El stock actual no puede ser negativo (CK_INVENTARIO_STOCK >= 0).",
        )

    existente = session.exec(
        select(ModelInventario).where(
            ModelInventario.id_centro == data.id_centro,
            ModelInventario.id_categoria == data.id_categoria,
        )
    ).first()

    ahora = datetime.now(timezone.utc)
    if existente:
        existente.stock_actual = data.stock_actual
        existente.fecha_actualizacion = ahora
        session.add(existente)
        op = "UPDATE"
        obj = existente
    else:
        obj = ModelInventario(
            stock_actual=data.stock_actual,
            fecha_actualizacion=ahora,
            id_centro=data.id_centro,
            id_categoria=data.id_categoria,
        )
        session.add(obj)
        op = "INSERT"

    registrar_auditoria(
        session,
        tabla_afectada="INVENTARIO",
        tipo_operacion=op,
        detalle=f"Actualización de inventario en centro {data.id_centro}, categoría {data.id_categoria} a stock={data.stock_actual}",
        id_usuario=data.id_usuario or 1,
    )
    session.commit()
    session.refresh(obj)
    return obj
