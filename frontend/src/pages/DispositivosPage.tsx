import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Cpu,
  Plus,
  Search,
  Eye,
  ClipboardCheck,
  Truck,
  FileCheck2,
  Pencil,
  Trash2,
  X,
  ExternalLink,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from "lucide-react";
import apiClient from "../api/client";
import { useAuth } from "../context/AuthContext";
import type {
  Dispositivo,
  DispositivoDetalle,
  CatalogosResumen,
  Lote,
} from "../types";
import Button from "../components/atoms/Button";
import Input from "../components/atoms/Input";
import FormField from "../components/molecules/FormField";

const CLASIFICACIONES = [
  "Reutilizacion",
  "Reacondicionamiento",
  "Reciclaje",
  "Disposicion Final",
];

const DispositivosPage: React.FC = () => {
  const { user } = useAuth();
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [catalogos, setCatalogos] = useState<CatalogosResumen | null>(null);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<number>(0);
  const [clasifFilter, setClasifFilter] = useState<string>("TODOS");

  // Modales activos
  const [modalCrearEditar, setModalCrearEditar] = useState<Dispositivo | "NEW" | null>(null);
  const [modalTrazabilidad, setModalTrazabilidad] = useState<DispositivoDetalle | null>(null);
  const [modalEvaluar, setModalEvaluar] = useState<Dispositivo | null>(null);
  const [modalTransferir, setModalTransferir] = useState<Dispositivo | null>(null);
  const [modalCerrar, setModalCerrar] = useState<Dispositivo | null>(null);

  // Estado formulario Crear / Editar Dispositivo
  const [numSerie, setNumSerie] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [idCategoria, setIdCategoria] = useState<number>(2);
  const [idLote, setIdLote] = useState<number>(1);
  const [obsInicial, setObsInicial] = useState("Ingreso y verificación física en recepción");

  // Estado formulario Evaluación Técnica
  const [diagnostico, setDiagnostico] = useState("");
  const [clasificacion, setClasificacion] = useState("Reutilizacion");
  const [idCondicion, setIdCondicion] = useState<number>(1);

  // Estado formulario Transferencia
  const [idCentroOrigen, setIdCentroOrigen] = useState<number>(1);
  const [idCentroDestino, setIdCentroDestino] = useState<number>(3);
  const [estadoTransf, setEstadoTransf] = useState("Entregado");

  // Estado formulario Cierre y Evidencia
  const [resultadoTrat, setResultadoTrat] = useState("");
  const [destinoTrat, setDestinoTrat] = useState("");
  const [archivoEvidencia, setArchivoEvidencia] = useState<File | null>(null);
  const [tipoManual, setTipoManual] = useState("PDF");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const cargarTodo = useCallback(async () => {
    try {
      setLoading(true);
      const [dispRes, catRes, lotRes] = await Promise.all([
        apiClient.get<Dispositivo[]>("/dispositivos/"),
        apiClient.get<CatalogosResumen>("/catalogos/resumen"),
        apiClient.get<Lote[]>("/solicitudes/lotes"),
      ]);
      setDispositivos(dispRes.data);
      setCatalogos(catRes.data);
      setLotes(lotRes.data);
    } catch (err) {
      console.error("Error cargando dispositivos:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarTodo();
  }, [cargarTodo]);

  const dispositivosFiltrados = useMemo(() => {
    return dispositivos.filter((d) => {
      if (catFilter !== 0 && d.id_categoria !== catFilter) return false;
      if (clasifFilter === "PENDIENTE" && d.evaluacion !== null) return false;
      if (
        clasifFilter !== "TODOS" &&
        clasifFilter !== "PENDIENTE" &&
        d.evaluacion?.clasificacion_tecnica !== clasifFilter
      ) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          d.num_serie.toLowerCase().includes(q) ||
          d.marca.toLowerCase().includes(q) ||
          d.modelo.toLowerCase().includes(q) ||
          d.codigo_lote.toLowerCase().includes(q) ||
          d.nombre_centro.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [dispositivos, catFilter, clasifFilter, search]);

  const abrirModalNuevo = () => {
    setFormError(null);
    setNumSerie(`SN-ECO-${Math.floor(100 + Math.random() * 900)}`);
    setMarca("");
    setModelo("");
    setIdCategoria(catalogos?.categorias[0]?.id_categoria || 1);
    setIdLote(lotes[0]?.id_lote || 1);
    setObsInicial("Ingreso en centro de acopio local");
    setModalCrearEditar("NEW");
  };

  const abrirModalEditar = (d: Dispositivo) => {
    setFormError(null);
    setNumSerie(d.num_serie);
    setMarca(d.marca);
    setModelo(d.modelo);
    setIdCategoria(d.id_categoria);
    setIdLote(d.id_lote);
    setModalCrearEditar(d);
  };

  const handleGuardarDispositivo = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!numSerie.trim() || !marca.trim() || !modelo.trim()) {
      setFormError("Todos los campos del dispositivo son obligatorios.");
      return;
    }
    try {
      setSubmitting(true);
      if (modalCrearEditar === "NEW") {
        await apiClient.post("/dispositivos/", {
          num_serie: numSerie,
          marca,
          modelo,
          id_categoria: idCategoria,
          id_lote: idLote,
          observacion_inicial: obsInicial,
          id_usuario: user?.id_usuario || 1,
        });
      } else if (modalCrearEditar) {
        await apiClient.put(`/dispositivos/${modalCrearEditar.id_dispositivo}`, {
          num_serie: numSerie,
          marca,
          modelo,
          id_categoria: idCategoria,
          id_lote: idLote,
          id_usuario: user?.id_usuario || 1,
        });
      }
      setModalCrearEditar(null);
      await cargarTodo();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || "Error al guardar el dispositivo.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEliminarDispositivo = async (d: Dispositivo) => {
    if (!window.confirm(`¿Eliminar el dispositivo ${d.num_serie} (${d.marca} ${d.modelo})?`)) {
      return;
    }
    try {
      await apiClient.delete(`/dispositivos/${d.id_dispositivo}`);
      await cargarTodo();
    } catch (err: any) {
      alert(err.response?.data?.detail || "No se pudo eliminar el dispositivo.");
    }
  };

  const abrirTrazabilidad = async (id_dispositivo: number) => {
    try {
      const res = await apiClient.get<DispositivoDetalle>(`/dispositivos/${id_dispositivo}`);
      setModalTrazabilidad(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const abrirEvaluar = (d: Dispositivo) => {
    setFormError(null);
    setDiagnostico(d.evaluacion?.diagnostico || "");
    setClasificacion(d.evaluacion?.clasificacion_tecnica || "Reutilizacion");
    setIdCondicion(d.evaluacion?.id_condicion || 1);
    setModalEvaluar(d);
  };

  const handleGuardarEvaluacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalEvaluar) return;
    setFormError(null);
    if (!diagnostico.trim()) {
      setFormError("Ingresa un diagnóstico técnico válido.");
      return;
    }
    try {
      setSubmitting(true);
      if (modalEvaluar.evaluacion) {
        await apiClient.put(`/dispositivos/evaluaciones/${modalEvaluar.evaluacion.id_evaluacion}`, {
          diagnostico,
          clasificacion_tecnica: clasificacion,
          id_condicion: idCondicion,
          id_usuario_evaluador: user?.id_usuario || 2,
        });
      } else {
        await apiClient.post("/dispositivos/evaluaciones", {
          diagnostico,
          clasificacion_tecnica: clasificacion,
          id_dispositivo: modalEvaluar.id_dispositivo,
          id_condicion: idCondicion,
          id_usuario_evaluador: user?.id_usuario || 2,
        });
      }
      setModalEvaluar(null);
      await cargarTodo();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || "Error al registrar evaluación técnica.");
    } finally {
      setSubmitting(false);
    }
  };

  const abrirTransferir = (d: Dispositivo) => {
    setFormError(null);
    const orig = d.id_centro_origen || 1;
    setIdCentroOrigen(orig);
    setIdCentroDestino(orig === 3 ? 1 : 3);
    setEstadoTransf("Entregado");
    setModalTransferir(d);
  };

  const handleGuardarTransferencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTransferir) return;
    setFormError(null);
    try {
      setSubmitting(true);
      await apiClient.post("/dispositivos/transferencias", {
        estado_transferencia: estadoTransf,
        id_centro_origen: idCentroOrigen,
        id_centro_destino: idCentroDestino,
        id_dispositivo: modalTransferir.id_dispositivo,
        id_usuario: user?.id_usuario || 3,
      });
      setModalTransferir(null);
      await cargarTodo();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || "Error al registrar transferencia.");
    } finally {
      setSubmitting(false);
    }
  };

  const abrirCerrar = (d: Dispositivo) => {
    setFormError(null);
    const clasif = d.evaluacion?.clasificacion_tecnica;
    if (clasif === "Reutilizacion") {
      setResultadoTrat("Donación Educativa Operativa");
      setDestinoTrat("Escuela Comunitaria / Laboratorio Académico");
    } else if (clasif === "Reacondicionamiento") {
      setResultadoTrat("Reacondicionamiento Certificado");
      setDestinoTrat("Centro de Innovación Tecnológica UIDE");
    } else if (clasif === "Disposicion Final") {
      setResultadoTrat("Confinamiento Controlado en Celda de Seguridad");
      setDestinoTrat("Gestor Ambiental Autorizado Inga");
    } else {
      setResultadoTrat("Valorización y Recuperación de Metales/Plásticos");
      setDestinoTrat("Planta de Reciclaje Metalúrgico Nacional");
    }
    setArchivoEvidencia(null);
    setTipoManual("PDF");
    setModalCerrar(d);
  };

  const handleGuardarCierre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalCerrar) return;
    setFormError(null);
    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("id_dispositivo", String(modalCerrar.id_dispositivo));
      formData.append("resultado", resultadoTrat);
      formData.append("destino", destinoTrat);
      formData.append("id_usuario", String(user?.id_usuario || 1));
      formData.append("tipo_archivo_manual", tipoManual);
      if (archivoEvidencia) {
        formData.append("archivo_evidencia", archivoEvidencia);
      }
      await apiClient.post("/dispositivos/tratamientos", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setModalCerrar(null);
      await cargarTodo();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || "Error al cerrar la trazabilidad.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Cpu className="w-7 h-7 text-emerald-400" />
            Gestión y Trazabilidad de Dispositivos RAEE
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Registro individual por lote, evaluación técnica (RN-02), transferencias
            atómicas (RN-03 / RN-06) y cierre con evidencia (RN-04 / RN-08).
          </p>
        </div>
        <Button onClick={abrirModalNuevo} variant="primary" size="md">
          <Plus className="w-4 h-4" />
          <span>Registrar Dispositivo</span>
        </Button>
      </div>

      {/* Barra de Filtros */}
      <div className="glass-card rounded-2xl p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        <div className="md:col-span-5 relative">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por N° de serie, marca, modelo, lote o centro..."
            className="pl-9"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </div>
        <div className="md:col-span-4">
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(Number(e.target.value))}
            className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 text-xs text-slate-100 rounded-xl"
          >
            <option value={0}>Todas las Categorías RAEE</option>
            {catalogos?.categorias.map((c) => (
              <option key={c.id_categoria} value={c.id_categoria}>
                {c.nombre_categoria}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-3">
          <select
            value={clasifFilter}
            onChange={(e) => setClasifFilter(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 text-xs text-slate-100 rounded-xl"
          >
            <option value="TODOS">Todas las Clasificaciones</option>
            <option value="PENDIENTE">Pendientes de Evaluar</option>
            {CLASIFICACIONES.map((cl) => (
              <option key={cl} value={cl}>
                {cl}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de Dispositivos */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-slate-900/60 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dispositivosFiltrados.map((d) => {
            const isCerrado = d.tratamiento !== null || d.id_estado_actual === 6;
            return (
              <div
                key={d.id_dispositivo}
                className="glass-card rounded-2xl p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          {d.num_serie}
                        </span>
                        <span className="font-mono text-xs text-slate-400">
                          Lote: {d.codigo_lote}
                        </span>
                      </div>
                      <h3 className="text-base font-extrabold text-white mt-1.5">
                        {d.marca} <span className="text-slate-300">{d.modelo}</span>
                      </h3>
                      <p className="text-xs text-slate-400">{d.nombre_categoria}</p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                          isCerrado
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                        }`}
                      >
                        {isCerrado ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        {d.estado_actual}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {d.nombre_centro}
                      </span>
                    </div>
                  </div>

                  {/* Resumen Evaluación y Tratamiento */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                        Evaluación Técnica
                      </span>
                      {d.evaluacion ? (
                        <div>
                          <span className="font-bold text-emerald-300">
                            {d.evaluacion.clasificacion_tecnica}
                          </span>
                          <p className="text-[11px] text-slate-400 truncate">
                            {d.evaluacion.diagnostico}
                          </p>
                        </div>
                      ) : (
                        <span className="text-amber-400 font-semibold">
                          Sin evaluar aún
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                        Destino Final / Cierre
                      </span>
                      {d.tratamiento ? (
                        <div>
                          <span className="font-bold text-teal-300 truncate block">
                            {d.tratamiento.destino}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {d.tratamiento.evidencias.length} evidencia(s) adjunta(s)
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500">En proceso logístico</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Botones de Acción del Ciclo de Vida */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      onClick={() => abrirTrazabilidad(d.id_dispositivo)}
                      variant="secondary"
                      size="sm"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Trazabilidad ({d.total_eventos_historial})</span>
                    </Button>
                    <Button
                      onClick={() => abrirEvaluar(d)}
                      variant="secondary"
                      size="sm"
                    >
                      <ClipboardCheck className="w-3.5 h-3.5 text-amber-400" />
                      <span>Evaluar</span>
                    </Button>
                    <Button
                      onClick={() => abrirTransferir(d)}
                      variant="secondary"
                      size="sm"
                    >
                      <Truck className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Transferir</span>
                    </Button>
                    {!d.tratamiento && (
                      <Button
                        onClick={() => abrirCerrar(d)}
                        variant="outline"
                        size="sm"
                      >
                        <FileCheck2 className="w-3.5 h-3.5" />
                        <span>Cerrar Ciclo</span>
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => abrirModalEditar(d)}
                      title="Editar Dispositivo"
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleEliminarDispositivo(d)}
                      title="Eliminar Dispositivo"
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Crear / Editar Dispositivo */}
      {modalCrearEditar && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-white">
                {modalCrearEditar === "NEW"
                  ? "Registrar Nuevo Dispositivo RAEE (RN-01)"
                  : `Editar Dispositivo ${modalCrearEditar.num_serie}`}
              </h2>
              <button
                onClick={() => setModalCrearEditar(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleGuardarDispositivo} className="space-y-4">
              <FormField
                label="Número de Serie Único (UQ_DISPOSITIVO_SERIE)"
                hint="RN-01: Todo dispositivo debe poseer un identificador único"
              >
                <Input
                  value={numSerie}
                  onChange={(e) => setNumSerie(e.target.value)}
                  placeholder="SN-DELL-031"
                  required
                />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Marca">
                  <Input
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                    placeholder="Ej. Dell, HP, Samsung"
                    required
                  />
                </FormField>
                <FormField label="Modelo">
                  <Input
                    value={modelo}
                    onChange={(e) => setModelo(e.target.value)}
                    placeholder="Ej. Latitude 5420"
                    required
                  />
                </FormField>
              </div>
              <FormField label="Categoría RAEE (FK_DISPOSITIVO_CATEGORIA)">
                <select
                  value={idCategoria}
                  onChange={(e) => setIdCategoria(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 text-sm text-white rounded-xl"
                >
                  {catalogos?.categorias.map((c) => (
                    <option key={c.id_categoria} value={c.id_categoria}>
                      {c.nombre_categoria}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Lote de Recepción (FK_DISPOSITIVO_LOTE)">
                <select
                  value={idLote}
                  onChange={(e) => setIdLote(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 text-sm text-white rounded-xl"
                >
                  {lotes.map((l) => (
                    <option key={l.id_lote} value={l.id_lote}>
                      {l.codigo_lote} ({l.nombre_centro || l.codigo_solicitud})
                    </option>
                  ))}
                </select>
              </FormField>
              {modalCrearEditar === "NEW" && (
                <FormField label="Observación Inicial para Historial de Estados">
                  <Input
                    value={obsInicial}
                    onChange={(e) => setObsInicial(e.target.value)}
                    placeholder="Ingreso en centro..."
                  />
                </FormField>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setModalCrearEditar(null)}
                >
                  Cancelar
                </Button>
                <Button type="submit" isLoading={submitting}>
                  Guardar en SQL Server
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Línea de Tiempo de Trazabilidad (Consulta 1 de 04_consultas.sql) */}
      {modalTrazabilidad && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Consulta #1 de 04_consultas.sql · Trazabilidad Completa
                </span>
                <h2 className="text-xl font-black text-white">
                  {modalTrazabilidad.marca} {modalTrazabilidad.modelo} (
                  <span className="text-emerald-400 font-mono">
                    {modalTrazabilidad.num_serie}
                  </span>
                  )
                </h2>
                <p className="text-xs text-slate-400">
                  Lote: {modalTrazabilidad.codigo_lote} · Centro Recepción:{" "}
                  {modalTrazabilidad.nombre_centro_recepcion}
                </p>
              </div>
              <button
                onClick={() => setModalTrazabilidad(null)}
                className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Línea de Tiempo HISTORIAL_ESTADOS */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Secuencia de Estados (Tabla HISTORIAL_ESTADOS)
              </h3>
              <div className="space-y-2.5 border-l-2 border-emerald-500/40 ml-3 pl-4">
                {modalTrazabilidad.historial_estados.map((h) => (
                  <div
                    key={h.id_secuencia}
                    className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-300">
                        Paso #{h.id_secuencia}: {h.nombre_estado}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {new Date(h.fecha_cambio).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200">{h.observacion}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Transferencias Logísticas */}
            {modalTrazabilidad.transferencias.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Movimientos entre Centros (Tabla TRANSFERENCIA_MOVIMIENTO)
                </h3>
                {modalTrazabilidad.transferencias.map((t) => (
                  <div
                    key={t.num_movimiento}
                    className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-white">
                        {t.nombre_centro_origen}
                      </span>{" "}
                      →{" "}
                      <span className="font-bold text-cyan-300">
                        {t.nombre_centro_destino}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                      {t.estado_transferencia}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Tratamiento y Evidencia S3 / Local */}
            {modalTrazabilidad.tratamiento && (
              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                  Cierre de Trazabilidad y Evidencias (TRATAMIENTO & EVIDENCIA)
                </h3>
                <p className="text-xs text-slate-200">
                  <strong>Resultado:</strong> {modalTrazabilidad.tratamiento.resultado}
                </p>
                <p className="text-xs text-slate-200">
                  <strong>Destino Circular:</strong> {modalTrazabilidad.tratamiento.destino}
                </p>
                <div className="pt-2 flex flex-wrap gap-2">
                  {modalTrazabilidad.tratamiento.evidencias.map((ev) => (
                    <a
                      key={ev.id_evidencia}
                      href={ev.url_archivo}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold hover:bg-emerald-600/30"
                    >
                      <span>Evidencia [{ev.tipo_archivo}]</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: Evaluación Técnica (RN-02) */}
      {modalEvaluar && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-white">
                  Evaluación Técnica · {modalEvaluar.num_serie}
                </h2>
                <p className="text-xs text-slate-400">
                  Evaluador actual:{" "}
                  <strong className="text-emerald-300">{user?.nombre}</strong> (
                  {user?.nombre_rol})
                </p>
              </div>
              <button
                onClick={() => setModalEvaluar(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {user &&
              user.nombre_rol !== "Tecnico Clasificador" &&
              user.nombre_rol !== "Administrador del Sistema" && (
                <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-xs text-amber-200 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>
                    Aviso RN-02: Tu rol actual es <strong>{user.nombre_rol}</strong>. El
                    backend rechazará la operación si no eres Técnico Clasificador o
                    Administrador.
                  </span>
                </div>
              )}

            {formError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleGuardarEvaluacion} className="space-y-4">
              <FormField label="Condición Física / Operativa (FK_EVAL_CONDICION)">
                <select
                  value={idCondicion}
                  onChange={(e) => setIdCondicion(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 text-sm text-white rounded-xl"
                >
                  {catalogos?.condiciones.map((c) => (
                    <option key={c.id_condicion} value={c.id_condicion}>
                      {c.descripcion_condicion}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Clasificación Técnica Circular (CK_EVAL_CLASIFICACION)">
                <select
                  value={clasificacion}
                  onChange={(e) => setClasificacion(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 text-sm text-white rounded-xl"
                >
                  {CLASIFICACIONES.map((cl) => (
                    <option key={cl} value={cl}>
                      {cl}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Diagnóstico Técnico Detallado">
                <Input
                  value={diagnostico}
                  onChange={(e) => setDiagnostico(e.target.value)}
                  placeholder="Ej. Fuente de poder operativa, requiere reemplazo de SSD..."
                  required
                />
              </FormField>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setModalEvaluar(null)}
                >
                  Cancelar
                </Button>
                <Button type="submit" isLoading={submitting}>
                  Guardar Evaluación
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Transferencia entre Centros (RN-03 y RN-06) */}
      {modalTransferir && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-white">
                Transferir Equipo · {modalTransferir.num_serie}
              </h2>
              <button
                onClick={() => setModalTransferir(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleGuardarTransferencia} className="space-y-4">
              <FormField label="Centro de Origen (FK_MOV_ORIGEN)">
                <select
                  value={idCentroOrigen}
                  onChange={(e) => setIdCentroOrigen(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 text-sm text-white rounded-xl"
                >
                  {catalogos?.centros.map((c) => (
                    <option key={c.id_centro} value={c.id_centro}>
                      [{c.codigo_centro}] {c.nombre_centro}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                label="Centro de Destino (FK_MOV_DESTINO)"
                hint="CK_MOV_CENTROS_DISTINTOS: El origen y el destino deben ser distintos"
              >
                <select
                  value={idCentroDestino}
                  onChange={(e) => setIdCentroDestino(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 text-sm text-white rounded-xl"
                >
                  {catalogos?.centros.map((c) => (
                    <option key={c.id_centro} value={c.id_centro}>
                      [{c.codigo_centro}] {c.nombre_centro}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                label="Estado de Transferencia (CK_MOV_ESTADO)"
                hint="RN-06: Al marcar 'Entregado' se actualiza atómicamente el INVENTARIO de origen y destino"
              >
                <select
                  value={estadoTransf}
                  onChange={(e) => setEstadoTransf(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 text-sm text-white rounded-xl"
                >
                  <option value="En Transito">En Tránsito</option>
                  <option value="Entregado">Entregado (Actualiza Inventario)</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </FormField>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setModalTransferir(null)}
                >
                  Cancelar
                </Button>
                <Button type="submit" isLoading={submitting}>
                  Registrar Movimiento
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Cierre de Trazabilidad y Carga de Evidencia (RN-04 y RN-08) */}
      {modalCerrar && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-white">
                  Cerrar Trazabilidad y Subir Evidencia · {modalCerrar.num_serie}
                </h2>
                <p className="text-xs text-slate-400">
                  Clasificación actual:{" "}
                  <strong className="text-emerald-300">
                    {modalCerrar.evaluacion?.clasificacion_tecnica || "Sin evaluar"}
                  </strong>
                </p>
              </div>
              <button
                onClick={() => setModalCerrar(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleGuardarCierre} className="space-y-4">
              <FormField label="Resultado del Tratamiento (Tabla TRATAMIENTO)">
                <Input
                  value={resultadoTrat}
                  onChange={(e) => setResultadoTrat(e.target.value)}
                  placeholder="Ej. Donación Educativa Operativa / Recuperación de Cobre"
                  required
                />
              </FormField>

              <FormField
                label="Entidad / Destino Final Confirmado (RN-04 y RN-08)"
                hint="RN-04: Si el equipo está en 'Disposicion Final', no puede asignarse a beneficiarios o donación"
              >
                <Input
                  value={destinoTrat}
                  onChange={(e) => setDestinoTrat(e.target.value)}
                  placeholder="Ej. Colegio Técnico San José / Planta Metalúrgica"
                  required
                />
              </FormField>

              <FormField
                label="Archivo de Evidencia Técnica o Acta (PDF, JPG, PNG, DOCX)"
                hint="Se almacena localmente en /uploads (y preparado para bucket AWS S3)"
              >
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.docx"
                  onChange={(e) =>
                    setArchivoEvidencia(e.target.files ? e.target.files[0] : null)
                  }
                  className="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
                />
              </FormField>

              {!archivoEvidencia && (
                <FormField label="Tipo de Evidencia (si se genera acta automática)">
                  <select
                    value={tipoManual}
                    onChange={(e) => setTipoManual(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 text-xs text-white rounded-xl"
                  >
                    <option value="PDF">PDF (Acta / Certificado)</option>
                    <option value="JPG">JPG (Fotografía Técnica)</option>
                    <option value="PNG">PNG (Imagen de Verificación)</option>
                    <option value="DOCX">DOCX (Informe Técnico)</option>
                  </select>
                </FormField>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setModalCerrar(null)}
                >
                  Cancelar
                </Button>
                <Button type="submit" isLoading={submitting}>
                  Confirmar Cierre de Trazabilidad
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DispositivosPage;

