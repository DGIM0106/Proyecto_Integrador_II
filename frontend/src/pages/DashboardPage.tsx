import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Cpu,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Boxes,
  Database,
  Bell,
  Plus,
  Check,
  Trash2,
  ArrowRight,
  Activity,
} from "lucide-react";
import apiClient from "../api/client";
import type { Centro } from "../types";
import Button from "../components/atoms/Button";
import Input from "../components/atoms/Input";

interface DashboardData {
  kpis: {
    total_dispositivos: number;
    dispositivos_evaluados: number;
    dispositivos_pendientes_evaluar: number;
    dispositivos_cerrados: number;
    porcentaje_trazabilidad_cerrada: number;
    total_solicitudes: number;
    total_lotes: number;
    stock_total_inventario: number;
    alertas_activas: number;
  };
  distribucion_clasificacion: Record<string, number>;
  consulta_2_centro_estado: {
    codigo_centro: string;
    nombre_centro: string;
    estado_actual: string;
    cantidad_dispositivos: number;
  }[];
  consulta_3_categoria_clasificacion: {
    nombre_categoria: string;
    clasificacion_asignada: string;
    total_dispositivos: number;
  }[];
  consulta_5_pendientes_evaluacion: {
    id_dispositivo: number;
    num_serie: string;
    marca: string;
    modelo: string;
    nombre_categoria: string;
    codigo_lote: string;
    centro_recepcion: string;
  }[];
  alertas: {
    id_alerta: number;
    fecha_generacion: string;
    nivel_criticidad: string;
    mensaje: string;
    estado_alerta: string;
    id_centro: number;
    nombre_centro: string;
  }[];
  auditoria: {
    id_auditoria: number;
    fecha_accion: string;
    tabla_afectada: string;
    tipo_operacion: string;
    detalle: string;
    id_usuario: number;
    nombre_usuario: string;
  }[];
}

const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [centros, setCentros] = useState<Centro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estado para nueva alerta
  const [mensajeAlerta, setMensajeAlerta] = useState("");
  const [criticidadAlerta, setCriticidadAlerta] = useState("Alta");
  const [centroAlerta, setCentroAlerta] = useState<number>(1);
  const [creatingAlert, setCreatingAlert] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashRes, catRes] = await Promise.all([
        apiClient.get<DashboardData>("/red/dashboard"),
        apiClient.get("/catalogos/centros"),
      ]);
      setData(dashRes.data);
      setCentros(catRes.data);
      if (catRes.data.length > 0) {
        setCentroAlerta(catRes.data[0].id_centro);
      }
    } catch (err) {
      console.error("Error cargando dashboard:", err);
      setError("No se pudo conectar con el backend local en http://localhost:8000.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleCrearAlerta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensajeAlerta.trim()) return;
    try {
      setCreatingAlert(true);
      await apiClient.post("/red/alertas", {
        nivel_criticidad: criticidadAlerta,
        mensaje: mensajeAlerta,
        estado_alerta: "Activa",
        id_centro: centroAlerta,
      });
      setMensajeAlerta("");
      await loadDashboard();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al crear alerta");
    } finally {
      setCreatingAlert(false);
    }
  };

  const handleCambiarEstadoAlerta = async (id_alerta: number, nuevoEstado: string) => {
    try {
      await apiClient.put(`/red/alertas/${id_alerta}`, {
        estado_alerta: nuevoEstado,
      });
      await loadDashboard();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEliminarAlerta = async (id_alerta: number) => {
    try {
      await apiClient.delete(`/red/alertas/${id_alerta}`);
      await loadDashboard();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && !data) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="h-36 rounded-3xl bg-slate-900/60 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-28 rounded-2xl bg-slate-900/60 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto my-16 p-6 rounded-2xl bg-rose-950/40 border border-rose-800 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
        <p className="text-sm font-semibold text-rose-200">{error}</p>
        <Button onClick={loadDashboard} variant="danger" size="sm">
          Reintentar Conexión
        </Button>
      </div>
    );
  }

  const { kpis, distribucion_clasificacion } = data;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-8 animate-fade-in">
      {/* Banner Principal */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border border-emerald-500/25 p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
              <Database className="w-3.5 h-3.5" />
              SQL Server Local · EcoRAEE_DB Conectado
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Centro de Control y Trazabilidad{" "}
              <span className="text-emerald-400">EcoRAEE Cloud</span>
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Monitoreo en tiempo real del ciclo de vida de Residuos de Aparatos
              Eléctricos y Electrónicos (RAEE), ejecución de consultas analíticas
              SQL Server (<code className="text-emerald-300">04_consultas.sql</code>) y
              control de alertas e inventario por centro.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/dispositivos">
              <Button variant="primary" size="md">
                <span>Gestionar Dispositivos</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/red-flujo">
              <Button variant="secondary" size="md">
                <span>Ejecutar Flujo Máximo</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Tarjetas de Indicadores KPI (Consulta 4 de 04_consultas.sql incluida) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">
              Equipos Registrados
            </span>
            <Cpu className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-white">{kpis.total_dispositivos}</p>
          <p className="text-xs text-slate-400">
            En <strong className="text-slate-200">{kpis.total_lotes}</strong> lotes y{" "}
            <strong className="text-slate-200">{kpis.total_solicitudes}</strong> solicitudes
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">
              Trazabilidad Cerrada
            </span>
            <CheckCircle2 className="w-5 h-5 text-teal-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-emerald-400">
              {kpis.porcentaje_trazabilidad_cerrada}%
            </p>
            <span className="text-xs text-slate-400">
              ({kpis.dispositivos_cerrados} de {kpis.total_dispositivos} cerrados)
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all"
              style={{ width: `${Math.min(100, kpis.porcentaje_trazabilidad_cerrada)}%` }}
            />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">
              Evaluación Técnica
            </span>
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-white">{kpis.dispositivos_evaluados}</p>
            <span className="text-xs text-amber-400 font-semibold">
              {kpis.dispositivos_pendientes_evaluar} pendientes
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Clasificados según norma de economía circular
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">
              Stock en Centros & Alertas
            </span>
            <Boxes className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-3">
            <p className="text-3xl font-black text-white">{kpis.stock_total_inventario}</p>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              {kpis.alertas_activas} alertas activas
            </span>
          </div>
          <p className="text-xs text-slate-400">Unidades consolidadas en INVENTARIO</p>
        </div>
      </div>

      {/* Distribución por Destino Circular */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold text-white">
              Distribución por Clasificación Circular (EVALUACION_TECNICA)
            </h2>
            <p className="text-xs text-slate-400">
              Rutas de tratamiento asignadas por los técnicos clasificadores
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { key: "Reutilizacion", label: "Reutilización Directa", color: "text-emerald-400 border-emerald-500/30 bg-emerald-950/30" },
            { key: "Reacondicionamiento", label: "Reacondicionamiento", color: "text-cyan-400 border-cyan-500/30 bg-cyan-950/30" },
            { key: "Reciclaje", label: "Reciclaje de Materiales", color: "text-indigo-400 border-indigo-500/30 bg-indigo-950/30" },
            { key: "Disposicion Final", label: "Disposición Controlada", color: "text-rose-400 border-rose-500/30 bg-rose-950/30" },
            { key: "Pendiente", label: "Pendiente de Evaluar", color: "text-amber-400 border-amber-500/30 bg-amber-950/30" },
          ].map((item) => (
            <div
              key={item.key}
              className={`p-4 rounded-xl border ${item.color} flex flex-col justify-between`}
            >
              <span className="text-xs font-semibold opacity-90">{item.label}</span>
              <span className="text-2xl font-black mt-2">
                {distribucion_clasificacion[item.key] ?? 0}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tablas de Consultas SQL Server (04_consultas.sql) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Consulta 2: Estado actual por Centro */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Script 04_consultas.sql · Consulta #2
            </span>
            <h3 className="text-base font-extrabold text-white">
              Dispositivos por Centro y Último Estado del Historial
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 px-3">Centro</th>
                  <th className="py-2.5 px-3">Último Estado (Subconsulta MAX)</th>
                  <th className="py-2.5 px-3 text-right">Equipos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {data.consulta_2_centro_estado.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/50">
                    <td className="py-2.5 px-3 font-medium text-slate-200">
                      <span className="text-emerald-400 font-mono mr-1.5">
                        [{row.codigo_centro}]
                      </span>
                      {row.nombre_centro}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 font-semibold">
                        {row.estado_actual}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-white">
                      {row.cantidad_dispositivos}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Consulta 3: Categoría vs Clasificación Técnica */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Script 04_consultas.sql · Consulta #3
            </span>
            <h3 className="text-base font-extrabold text-white">
              Equipos por Categoría RAEE y Clasificación Técnica
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 px-3">Categoría RAEE</th>
                  <th className="py-2.5 px-3">Clasificación Asignada</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {data.consulta_3_categoria_clasificacion.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/50">
                    <td className="py-2.5 px-3 font-medium text-slate-200">
                      {row.nombre_categoria}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full font-semibold ${
                          row.clasificacion_asignada === "PENDIENTE DE EVALUAR"
                            ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                        }`}
                      >
                        {row.clasificacion_asignada}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-white">
                      {row.total_dispositivos}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Consulta 5: Dispositivos pendientes de evaluación técnica */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Script 04_consultas.sql · Consulta #5 (WHERE NOT EXISTS en EVALUACION_TECNICA)
            </span>
            <h3 className="text-base font-extrabold text-white">
              Equipos Pendientes de Evaluación Técnica ({data.consulta_5_pendientes_evaluacion.length})
            </h3>
          </div>
          <Link to="/dispositivos">
            <Button variant="outline" size="sm">
              Ir a Evaluar Equipos
            </Button>
          </Link>
        </div>
        <div className="overflow-x-auto max-h-64">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-900">
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 px-3">ID</th>
                <th className="py-2 px-3">N° Serie</th>
                <th className="py-2 px-3">Marca / Modelo</th>
                <th className="py-2 px-3">Categoría</th>
                <th className="py-2 px-3">Lote</th>
                <th className="py-2 px-3">Centro de Recepción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data.consulta_5_pendientes_evaluacion.map((d) => (
                <tr key={d.id_dispositivo} className="hover:bg-slate-900/50">
                  <td className="py-2 px-3 font-mono text-slate-400">#{d.id_dispositivo}</td>
                  <td className="py-2 px-3 font-mono font-bold text-emerald-400">
                    {d.num_serie}
                  </td>
                  <td className="py-2 px-3 text-white font-medium">
                    {d.marca} {d.modelo}
                  </td>
                  <td className="py-2 px-3 text-slate-300">{d.nombre_categoria}</td>
                  <td className="py-2 px-3 font-mono text-slate-300">{d.codigo_lote}</td>
                  <td className="py-2 px-3 text-slate-300">{d.centro_recepcion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gestión de Alertas Operativas y Bitácora de Auditoría */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Alertas (Tabla ALERTA) */}
        <div className="lg:col-span-6 glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-extrabold text-white">
                Alertas Operativas en Centros (Tabla ALERTA)
              </h3>
            </div>
          </div>

          <form onSubmit={handleCrearAlerta} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-5">
              <Input
                value={mensajeAlerta}
                onChange={(e) => setMensajeAlerta(e.target.value)}
                placeholder="Mensaje de alerta operativa..."
                required
              />
            </div>
            <div className="sm:col-span-3">
              <select
                value={criticidadAlerta}
                onChange={(e) => setCriticidadAlerta(e.target.value)}
                className="w-full px-2.5 py-2.5 bg-slate-900 border border-slate-700 text-xs text-white rounded-xl"
              >
                <option value="Baja">Criticidad: Baja</option>
                <option value="Media">Criticidad: Media</option>
                <option value="Alta">Criticidad: Alta</option>
                <option value="Critica">Criticidad: Crítica</option>
              </select>
            </div>
            <div className="sm:col-span-4 flex gap-1.5">
              <select
                value={centroAlerta}
                onChange={(e) => setCentroAlerta(Number(e.target.value))}
                className="w-full px-2.5 py-2.5 bg-slate-900 border border-slate-700 text-xs text-white rounded-xl"
              >
                {centros.map((c) => (
                  <option key={c.id_centro} value={c.id_centro}>
                    {c.codigo_centro}
                  </option>
                ))}
              </select>
              <Button type="submit" size="sm" isLoading={creatingAlert}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </form>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {data.alertas.map((a) => (
              <div
                key={a.id_alerta}
                className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        a.nivel_criticidad === "Critica" || a.nivel_criticidad === "Alta"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      {a.nivel_criticidad}
                    </span>
                    <span className="text-xs font-semibold text-emerald-400">
                      {a.nombre_centro}
                    </span>
                    <span className="text-[11px] text-slate-400">· {a.estado_alerta}</span>
                  </div>
                  <p className="text-xs text-slate-200">{a.mensaje}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {a.estado_alerta !== "Resuelta" && (
                    <button
                      onClick={() => handleCambiarEstadoAlerta(a.id_alerta, "Resuelta")}
                      title="Marcar como Resuelta"
                      className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/30 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleEliminarAlerta(a.id_alerta)}
                    title="Eliminar Alerta"
                    className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400 hover:bg-rose-500/30 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bitácora de Auditoría Transaccional (Tabla AUDITORIA) */}
        <div className="lg:col-span-6 glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-extrabold text-white">
                Bitácora de Auditoría (Tabla AUDITORIA)
              </h3>
              <p className="text-xs text-slate-400">
                Registro automático de operaciones INSERT, UPDATE y DELETE
              </p>
            </div>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {data.auditoria.map((aud) => (
              <div
                key={aud.id_auditoria}
                className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 text-xs space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                        aud.tipo_operacion === "INSERT"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : aud.tipo_operacion === "UPDATE"
                          ? "bg-cyan-500/20 text-cyan-300"
                          : "bg-rose-500/20 text-rose-300"
                      }`}
                    >
                      {aud.tipo_operacion}
                    </span>
                    <span className="font-mono font-bold text-slate-200">
                      {aud.tabla_afectada}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Por: <strong className="text-slate-200">{aud.nombre_usuario}</strong>
                  </span>
                </div>
                <p className="text-slate-300">{aud.detalle}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

