export interface User {
  id_usuario: number;
  nombre: string;
  correo: string;
  id_rol: number;
  nombre_rol: string;
  id_organizacion: number;
  razon_social: string;
  ruc?: string;
}

export interface Rol {
  id_rol: number;
  nombre_rol: string;
}

export interface Organizacion {
  id_organizacion: number;
  ruc: string;
  razon_social: string;
}

export interface TipoCentro {
  id_tipo_centro: number;
  nombre_tipo: string;
}

export interface Centro {
  id_centro: number;
  codigo_centro: string;
  nombre_centro: string;
  direccion: string;
  id_tipo_centro: number;
  nombre_tipo_centro?: string;
}

export interface Categoria {
  id_categoria: number;
  nombre_categoria: string;
}

export interface Condicion {
  id_condicion: number;
  descripcion_condicion: string;
}

export interface EstadoCatalogo {
  id_estado: number;
  nombre_estado: string;
}

export interface CatalogosResumen {
  tipos_centro: TipoCentro[];
  centros: Centro[];
  categorias: Categoria[];
  condiciones: Condicion[];
  estados_catalogo: EstadoCatalogo[];
  organizaciones: Organizacion[];
  roles: Rol[];
}

export interface EvaluacionResumen {
  id_evaluacion: number;
  fecha_evaluacion: string;
  diagnostico: string;
  clasificacion_tecnica: string;
  id_dispositivo: number;
  id_condicion: number;
  descripcion_condicion: string;
  id_usuario_evaluador: number;
  nombre_evaluador: string;
}

export interface EvidenciaItem {
  id_evidencia: number;
  tipo_archivo: string;
  url_archivo: string;
  id_tratamiento: number;
}

export interface TratamientoResumen {
  id_tratamiento: number;
  resultado: string;
  destino: string;
  fecha_cierre: string;
  id_dispositivo: number;
  evidencias: EvidenciaItem[];
}

export interface Dispositivo {
  id_dispositivo: number;
  num_serie: string;
  marca: string;
  modelo: string;
  id_categoria: number;
  nombre_categoria: string;
  id_lote: number;
  codigo_lote: string;
  id_solicitud?: number;
  codigo_solicitud: string;
  id_centro_origen?: number;
  nombre_centro: string;
  codigo_centro: string;
  id_estado_actual: number;
  estado_actual: string;
  fecha_ultimo_estado?: string;
  total_eventos_historial: number;
  evaluacion: EvaluacionResumen | null;
  tratamiento: TratamientoResumen | null;
}

export interface HistorialPaso {
  id_secuencia: number;
  id_estado: number;
  nombre_estado: string;
  fecha_cambio: string;
  observacion: string;
}

export interface Transferencia {
  num_movimiento: number;
  fecha_movimiento: string;
  estado_transferencia: string;
  id_centro_origen: number;
  nombre_centro_origen: string;
  codigo_centro_origen?: string;
  id_centro_destino: number;
  nombre_centro_destino: string;
  codigo_centro_destino?: string;
  id_dispositivo: number;
  num_serie?: string;
  marca?: string;
  modelo?: string;
}

export interface DispositivoDetalle {
  id_dispositivo: number;
  num_serie: string;
  marca: string;
  modelo: string;
  id_categoria: number;
  nombre_categoria: string;
  id_lote: number;
  codigo_lote: string;
  codigo_solicitud: string;
  nombre_centro_recepcion: string;
  id_centro_recepcion?: number;
  historial_estados: HistorialPaso[];
  evaluacion_tecnica: EvaluacionResumen | null;
  transferencias: Transferencia[];
  tratamiento: TratamientoResumen | null;
}

export interface Lote {
  id_lote: number;
  codigo_lote: string;
  fecha_creacion: string;
  id_solicitud: number;
  codigo_solicitud?: string;
  estado_recoleccion?: string;
  id_centro?: number;
  nombre_centro?: string;
  total_dispositivos: number;
}

export interface Solicitud {
  id_solicitud: number;
  codigo_solicitud: string;
  fecha_solicitud: string;
  estado_recoleccion: string;
  id_centro: number;
  nombre_centro: string;
  codigo_centro: string;
  lotes: Lote[];
  total_lotes: number;
  total_dispositivos: number;
}

export interface InventarioItem {
  id_inventario: number;
  stock_actual: number;
  fecha_actualizacion: string;
  id_centro: number;
  codigo_centro: string;
  nombre_centro: string;
  id_categoria: number;
  nombre_categoria: string;
}

