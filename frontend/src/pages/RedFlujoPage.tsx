import React, { useEffect, useState, useCallback } from "react";
import {
  Network,
  Play,
  Plus,
  Trash2,
  GitBranch,
  Flame,
  CheckCircle2,
  Binary,
} from "lucide-react";
import apiClient from "../api/client";
import Button from "../components/atoms/Button";
import Input from "../components/atoms/Input";
import FormField from "../components/molecules/FormField";

const RedFlujoPage: React.FC = () => {
  const [grafoData, setGrafoData] = useState<any>(null);
  const [simulacionActiva, setSimulacionActiva] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Parámetros del simulador Edmonds-Karp
  const [nodoOrigen, setNodoOrigen] = useState<number>(1);
  const [nodoSumidero, setNodoSumidero] = useState<number>(3);
  const [factorCap, setFactorCap] = useState<number>(1.0);
  const [guardarEsc, setGuardarEsc] = useState<boolean>(false);
  const [codEscenario, setCodEscenario] = useState<string>("ESC-2026-SIM-01");

  // Nuevo Nodo / Nueva Arista
  const [tipoNodo, setTipoNodo] = useState("");
  const [capNodo, setCapNodo] = useState<number>(45);
  const [aristaOrig, setAristaOrig] = useState<number>(1);
  const [aristaDest, setAristaDest] = useState<number>(3);
  const [distKm, setDistKm] = useState<number>(32.5);
  const [tiempoMin, setTiempoMin] = useState<number>(50);

  const cargarRed = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/red/grafo");
      setGrafoData(res.data);
      setSimulacionActiva(res.data.analisis_flujo_actual);
      if (res.data.nodos.length > 0) {
        setNodoOrigen(res.data.nodos[0].id_nodo);
        setNodoSumidero(res.data.nodos[res.data.nodos.length - 1].id_nodo);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarRed();
  }, [cargarRed]);

  const handleEjecutarFlujo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiClient.post("/red/flujo-maximo", {
        id_nodo_origen: nodoOrigen,
        id_nodo_sumidero: nodoSumidero,
        factor_capacidad: factorCap,
        guardar_escenario: guardarEsc,
        codigo_escenario: codEscenario,
      });
      setSimulacionActiva(res.data);
      if (guardarEsc) {
        await cargarRed();
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al calcular flujo máximo");
    }
  };

  const handleCrearNodo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post("/red/nodos", {
        tipo_nodo: tipoNodo,
        capacidad_nodo: capNodo,
      });
      setTipoNodo("");
      await cargarRed();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al crear nodo");
    }
  };

  const handleEliminarNodo = async (id_nodo: number) => {
    try {
      await apiClient.delete(`/red/nodos/${id_nodo}`);
      await cargarRed();
    } catch (err: any) {
      alert(err.response?.data?.detail || "No se puede eliminar un nodo con aristas activas");
    }
  };

  const handleCrearArista = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post("/red/aristas", {
        id_nodo_origen: aristaOrig,
        id_nodo_destino: aristaDest,
        distancia_km: distKm,
        tiempo_estimado_min: tiempoMin,
      });
      await cargarRed();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al crear arista");
    }
  };

  const handleEliminarArista = async (id_arista: number) => {
    try {
      await apiClient.delete(`/red/aristas/${id_arista}`);
      await cargarRed();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al eliminar arista");
    }
  };

  if (loading || !grafoData) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="h-44 rounded-3xl bg-slate-900/60 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-8 animate-fade-in">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
          <Network className="w-7 h-7 text-emerald-400" />
          Modelo Matemático de Red Logística · Flujo Máximo y Corte Mínimo
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Grafo dirigido G = (V, E) alimentado desde las tablas NODO, ARISTA, ESCENARIO e
          INDICADOR de SQL Server. Algoritmo de Edmonds-Karp (RF-MD-03, RF-MD-04, RF-MD-05).
        </p>
      </div>

      {/* Simulador de Flujo Máximo y Resultados */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controles del Algoritmo */}
        <div className="lg:col-span-5 glass-card rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-extrabold text-white">
              Ejecutar Algoritmo de Edmonds-Karp
            </h2>
          </div>

          <form onSubmit={handleEjecutarFlujo} className="space-y-4">
            <FormField label="Nodo Fuente / Origen (s)">
              <select
                value={nodoOrigen}
                onChange={(e) => setNodoOrigen(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 text-xs text-white rounded-xl"
              >
                {grafoData.nodos.map((n: any) => (
                  <option key={n.id_nodo} value={n.id_nodo}>
                    Nodo #{n.id_nodo}: {n.tipo_nodo} (Cap: {n.capacidad_nodo} t)
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Nodo Sumidero / Destino Final (t)">
              <select
                value={nodoSumidero}
                onChange={(e) => setNodoSumidero(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 text-xs text-white rounded-xl"
              >
                {grafoData.nodos.map((n: any) => (
                  <option key={n.id_nodo} value={n.id_nodo}>
                    Nodo #{n.id_nodo}: {n.tipo_nodo} (Cap: {n.capacidad_nodo} t)
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label={`Factor de Capacidad de Red (${Math.round(factorCap * 100)}%)`}
              hint="Permite simular escenarios de expansión (+35%) o contingencia vial (-30%)"
            >
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={factorCap}
                onChange={(e) => setFactorCap(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </FormField>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="chkGuardar"
                checked={guardarEsc}
                onChange={(e) => setGuardarEsc(e.target.checked)}
                className="accent-emerald-500"
              />
              <label htmlFor="chkGuardar" className="text-xs text-slate-300">
                Persistir resultado en tabla <code className="text-emerald-400">ESCENARIO</code>
              </label>
            </div>

            {guardarEsc && (
              <Input
                value={codEscenario}
                onChange={(e) => setCodEscenario(e.target.value)}
                placeholder="Código de escenario (Ej. ESC-2026-EXP)"
              />
            )}

            <Button type="submit" className="w-full" size="md">
              <Play className="w-4 h-4" />
              <span>Calcular Flujo Máximo y Corte Mínimo</span>
            </Button>
          </form>
        </div>

        {/* Resultados del Algoritmo */}
        <div className="lg:col-span-7 glass-card rounded-2xl p-6 space-y-5">
          {simulacionActiva && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30">
                  <span className="text-[11px] font-bold uppercase text-emerald-300">
                    Flujo Máximo Total |f*|
                  </span>
                  <p className="text-3xl font-black text-white mt-1">
                    {simulacionActiva.flujo_maximo}{" "}
                    <span className="text-sm font-normal text-emerald-300">t/periodo</span>
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30">
                  <span className="text-[11px] font-bold uppercase text-rose-300">
                    Capacidad Corte Mínimo c(S,T)
                  </span>
                  <p className="text-3xl font-black text-white mt-1">
                    {simulacionActiva.corte_minimo.capacidad_corte}{" "}
                    <span className="text-sm font-normal text-rose-300">t/periodo</span>
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[11px] font-bold uppercase text-cyan-300">
                    Cuellos de Botella
                  </span>
                  <p className="text-3xl font-black text-white mt-1">
                    {simulacionActiva.corte_minimo.aristas_criticas.length}{" "}
                    <span className="text-sm font-normal text-slate-400">arista(s)</span>
                  </p>
                </div>
              </div>

              {/* Flujo por Arista */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Detalle de Flujo f(u,v) y Saturación por Arista Dirigida
                </h3>
                {simulacionActiva.flujo_por_arista.map((a: any) => (
                  <div
                    key={a.id_arista}
                    className={`p-3.5 rounded-xl border ${
                      a.en_corte_minimo
                        ? "bg-rose-950/25 border-rose-500/40"
                        : "bg-slate-900/80 border-slate-800"
                    } space-y-2`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="font-bold text-white">
                        [{a.id_arista}] {a.nombre_origen} → {a.nombre_destino}
                        <span className="text-slate-400 font-normal ml-2">
                          ({a.distancia_km} km · {a.tiempo_estimado_min} min)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-emerald-300">
                          {a.flujo} / {a.capacidad} t ({a.porcentaje_uso}%)
                        </span>
                        {a.en_corte_minimo && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold flex items-center gap-1">
                            <Flame className="w-3 h-3" />
                            Corte Mínimo (Cuello de Botella)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          a.en_corte_minimo ? "bg-rose-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(100, a.porcentaje_uso)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Caminos aumentantes y partición (S, T) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1.5">
                  <span className="font-bold text-emerald-400 block">
                    Caminos Aumentantes (BFS):
                  </span>
                  {simulacionActiva.rutas_aumentantes.map((r: any, idx: number) => (
                    <p key={idx} className="text-slate-300">
                      #{idx + 1}: {r.camino_nombres.join(" → ")} (
                      <strong className="text-white">+{r.flujo_aportado} t</strong>)
                    </p>
                  ))}
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1.5">
                  <span className="font-bold text-cyan-400 block">
                    Partición del Corte Mínimo (S, T):
                  </span>
                  <p className="text-slate-300">
                    <strong>Conjunto S:</strong>{" "}
                    {simulacionActiva.corte_minimo.conjunto_S
                      .map((n: any) => n.tipo_nodo)
                      .join(", ")}
                  </p>
                  <p className="text-slate-300">
                    <strong>Conjunto T:</strong>{" "}
                    {simulacionActiva.corte_minimo.conjunto_T
                      .map((n: any) => n.tipo_nodo)
                      .join(", ")}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Comparación de Escenarios (RF-MD-05) e Indicadores (INDICADOR) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-extrabold text-white">
            Comparación de Escenarios de Capacidad (RF-MD-05)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 px-3">Escenario Evaluado</th>
                  <th className="py-2 px-3 text-right">Flujo Máx.</th>
                  <th className="py-2 px-3 text-right">Aristas Saturadas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {grafoData.comparacion_escenarios.map((esc: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-900/50">
                    <td className="py-2.5 px-3 font-medium text-white">{esc.nombre}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                      {esc.flujo_maximo} t
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-rose-300">
                      {esc.aristas_saturadas}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-extrabold text-white">
            Escenarios e Indicadores Persistidos (Tablas ESCENARIO & INDICADOR)
          </h3>
          <div className="space-y-2.5">
            {grafoData.indicadores.map((ind: any) => (
              <div
                key={ind.id_indicador}
                className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-white">{ind.nombre_indicador}</p>
                  <p className="text-slate-400">Periodo: {ind.periodo}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-emerald-400">
                    Actual: {ind.valor_actual}
                  </span>
                  <span className="block text-[11px] text-slate-400">
                    Meta: {ind.valor_meta}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gestión CRUD de Nodos y Aristas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-extrabold text-white">
            Nodos de la Red (Tabla NODO)
          </h3>
          <form onSubmit={handleCrearNodo} className="flex gap-2">
            <Input
              value={tipoNodo}
              onChange={(e) => setTipoNodo(e.target.value)}
              placeholder="Nombre / Tipo de Nodo..."
              required
            />
            <Input
              type="number"
              step="0.5"
              value={capNodo}
              onChange={(e) => setCapNodo(Number(e.target.value))}
              placeholder="Cap."
              className="w-28"
              required
            />
            <Button type="submit" size="sm">
              <Plus className="w-4 h-4" />
            </Button>
          </form>
          <div className="space-y-2">
            {grafoData.nodos.map((n: any) => (
              <div
                key={n.id_nodo}
                className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-emerald-400 mr-2">
                    Nodo #{n.id_nodo}
                  </span>
                  <span className="font-bold text-white">{n.tipo_nodo}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-300 font-mono">
                    Cap: {n.capacidad_nodo} t
                  </span>
                  <button
                    onClick={() => handleEliminarNodo(n.id_nodo)}
                    className="text-slate-500 hover:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-extrabold text-white">
            Aristas Dirigidas (Tabla ARISTA)
          </h3>
          <form onSubmit={handleCrearArista} className="grid grid-cols-5 gap-2">
            <select
              value={aristaOrig}
              onChange={(e) => setAristaOrig(Number(e.target.value))}
              className="px-2 py-2 bg-slate-900 border border-slate-700 text-xs text-white rounded-xl"
            >
              {grafoData.nodos.map((n: any) => (
                <option key={n.id_nodo} value={n.id_nodo}>
                  Orig #{n.id_nodo}
                </option>
              ))}
            </select>
            <select
              value={aristaDest}
              onChange={(e) => setAristaDest(Number(e.target.value))}
              className="px-2 py-2 bg-slate-900 border border-slate-700 text-xs text-white rounded-xl"
            >
              {grafoData.nodos.map((n: any) => (
                <option key={n.id_nodo} value={n.id_nodo}>
                  Dest #{n.id_nodo}
                </option>
              ))}
            </select>
            <Input
              type="number"
              step="0.1"
              value={distKm}
              onChange={(e) => setDistKm(Number(e.target.value))}
              placeholder="km"
            />
            <Input
              type="number"
              value={tiempoMin}
              onChange={(e) => setTiempoMin(Number(e.target.value))}
              placeholder="min"
            />
            <Button type="submit" size="sm">
              <Plus className="w-4 h-4" />
            </Button>
          </form>
          <div className="space-y-2">
            {grafoData.aristas.map((a: any) => (
              <div
                key={a.id_arista}
                className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-cyan-300">
                    Arista #{a.id_arista}:
                  </span>{" "}
                  <span className="text-white font-semibold">
                    Nodo #{a.id_nodo_origen} → Nodo #{a.id_nodo_destino}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400">
                    {a.distancia_km} km · {a.tiempo_estimado_min} min
                  </span>
                  <button
                    onClick={() => handleEliminarArista(a.id_arista)}
                    className="text-slate-500 hover:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reglas de Negocio Formalizadas en Matemática Discreta (RF-MD-01) */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Binary className="w-5 h-5 text-emerald-400" />
          <div>
            <h2 className="text-base font-extrabold text-white">
              Formalización Lógica de Reglas de Negocio (RF-MD-01)
            </h2>
            <p className="text-xs text-slate-400">
              Proposiciones y fórmulas booleanas verificadas activamente en el backend y SQL Server
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {grafoData.reglas_discretas.map((regla: any) => (
            <div
              key={regla.codigo}
              className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                  {regla.codigo}
                </span>
                <span className="font-mono font-bold text-cyan-300 text-sm">
                  {regla.formula}
                </span>
              </div>
              <p className="font-bold text-white">{regla.titulo}</p>
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                {regla.implementacion_sql_api}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RedFlujoPage;

