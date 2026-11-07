from datetime import datetime, timezone
from sqlmodel import Session
from models.model_network import ModelAuditoria


def registrar_auditoria(
    session: Session,
    tabla_afectada: str,
    tipo_operacion: str,
    detalle: str,
    id_usuario: int = 1,
):
    """
    Registra una entrada en la tabla AUDITORIA para mantener la trazabilidad
    de las operaciones INSERT, UPDATE y DELETE del sistema.
    """
    try:
        auditoria = ModelAuditoria(
            fecha_accion=datetime.now(timezone.utc),
            tabla_afectada=tabla_afectada,
            tipo_operacion=tipo_operacion,
            detalle=detalle,
            id_usuario=id_usuario or 1,
        )
        session.add(auditoria)
    except Exception as e:
        print(f"Aviso al registrar auditoria: {e}")
