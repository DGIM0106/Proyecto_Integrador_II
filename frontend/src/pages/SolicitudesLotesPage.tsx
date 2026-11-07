import React, { useEffect, useState, useCallback } from "react";
import {
  Truck,
  Package,
  Boxes,
  Building,
  Plus,
  Trash2,
  CheckCircle,
} from "lucide-react";
import apiClient from "../api/client";
import { useAuth } from "../context/AuthContext";
import type {
  Solicitud,
  Lote,
  CatalogosResumen,
  InventarioItem,
  Transferencia,
} from "../types";
import Button from "../components/atoms/Button";
import Input from "../components/atoms/Input";
import FormField from "../components/molecules/FormField";

const ESTADOS_REC = ["Pendiente", "Asignada", "En Recoleccion", "Finalizada"];

const SolicitudesLotesPage: React.FC = () => {
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [catalogos, setCatalogos] = useState<CatalogosResumen | null>(null);
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Nueva Solicitud
  const [codSolicitud, setCodSolicitud] = useState("SOL-2026-005");
  const [estadoSol, setEstadoSol] = useState("Pendiente");
  const [idCentroSol, setIdCentroSol] = useState<number>(1);

  // Nuevo Lote
  const [codLote, setCodLote] = useState("LOT-2026-04");
  const [idSolLote, setIdSolLote] = useState<number>(1);

  // Ajuste de Inventario
  const [idCentroInv, setIdCentroInv] = useState<number>(1);
  const [idCatInv, setIdCatInv] = useState<number>(2);
  const [stockInv, setStockInv] = useState<number>(20);

  // Nuevo Centro
  const [codCentro, setCodCentro] = useState("");
  const [nomCentro, setNomCentro] = useState("");
  const [dirCentro, setDirCentro] = useState("");
  const [tipoCentro, setTipoCentro] = useState<number>(1);

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      const [solRes, lotRes, catRes, invRes, trRes] = await Promise.all([
        apiClient.get<Solicitud[]>("/solicitudes/"),
        apiClient.get<Lote[]>("/solicitudes/lotes"),
        apiClient.get<CatalogosResumen>("/catalogos/resumen"),
        apiClient.get<InventarioItem[]>("/catalogos/inventario"),
        apiClient.get<Transferencia[]>("/dispositivos/transferencias/all"),
      ]);
      setSolicitudes(solRes.data);
      setLotes(lotRes.data);
      setCatalogos(catRes.data);
      setInventario(invRes.data);
      setTransferencias(trRes.data);

      setCodSolicitud(`SOL-2026-00${solRes.data.length + 1}`);
      setCodLote(`LOT-2026-0${lotRes.data.length + 1}`);
      if (solRes.data.length > 0) setIdSolLote(solRes.data[0].id_solicitud);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleCrearSolicitud = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await apiClient.post("/solicitudes/", {
        codigo_solicitud: codSolicitud,
        estado_recoleccion: estadoSol,
        id_centro: idCentroSol,
        id_usuario: user?.id_usuario || 1,
      });
      await cargarDatos();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Error al crear solicitud.");
    }
  };

  const handleCambiarEstadoSol = async (id_solicitud: number, nuevoEstado: string) => {
    try {
      await apiClient.put(`/solicitudes/${id_solicitud}`, {
        estado_recoleccion: nuevoEstado,
        id_usuario: user?.id_usuario || 1,
      });
      await cargarDatos();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al actualizar solicitud");
    }
  };

  const handleEliminarSol = async (id_solicitud: number) => {
    try {
      await apiClient.delete(`/solicitudes/${id_solicitud}`);
      await cargarDatos();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "No se puede eliminar la solicitud.");
    }
  };

  const handleCrearLote = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await apiClient.post("/solicitudes/lotes", {
        codigo_lote: codLote,
        id_solicitud: idSolLote,
        id_usuario: user?.id_usuario || 1,
      });
      await cargarDatos();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Error al crear lote.");
    }
  };

  const handleEliminarLote = async (id_lote: number) => {
    try {
      await apiClient.delete(`/solicitudes/lotes/${id_lote}`);
      await cargarDatos();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "No se puede eliminar el lote.");
    }
  };

  const handleGuardarInventario = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await apiClient.post("/catalogos/inventario", {
        id_centro: idCentroInv,
        id_categoria: idCatInv,
        stock_actual: stockInv,
        id_usuario: user?.id_usuario || 1,
      });
      await cargarDatos();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Error al actualizar inventario.");
    }
  };

  const handleConfirmarEntrega = async (num_movimiento: number) => {
    try {
      await apiClient.put(`/dispositivos/transferencias/${num_movimiento}`, {
        estado_transferencia: "Entregado",
        id_usuario: user?.id_usuario || 3,
      });
      await cargarDatos();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al confirmar recepción.");
    }
  };

  const handleCrearCentro = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await apiClient.post("/catalogos/centros", {
        codigo_centro: codCentro,
        nombre_centro: nomCentro,
        direccion: dirCentro,
        id_tipo_centro: tipoCentro,
      });
      setCodCentro("");
      setNomCentro("");
      setDirCentro("");
      await cargarDatos();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Error al crear centro.");
    }
  };

  const handleEliminarCentro = async (id_centro: number) => {
    try {
      await apiClient.delete(`/catalogos/centros/${id_centro}`);
      await cargarDatos();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "No se puede eliminar el centro.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
          <Truck className="w-7 h-7 text-emerald-400" />
          Solicitudes de Recolección, Lotes, Centros e Inventario
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Operaciones CRUD sobre SOLICITUD, LOTE, CENTRO, INVENTARIO y
          TRANSFERENCIA_MOVIMIENTO en SQL Server.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-rose-300 font-bold hover:underline cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Solicitudes y Lotes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Solicitudes */}
        <div className="lg:col-span-7 glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-extrabold text-white">
              Solicitudes de Recolección (Tabla SOLICITUD)
            </h2>
          </div>

          <form
            onSubmit={handleCrearSolicitud}
            className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800"
          >
            <div className="sm:col-span-4">
              <Input
                value={codSolicitud}
                onChange={(e) => setCodSolicitud(e.target.value)}
                placeholder="SOL-2026-005"
                required
              />
            </div>
            <div className="sm:col-span-4">
              <select
                value={idCentroSol}
                onChange={(e) => setIdCentroSol(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 text-xs text-white rounded-xl"
              >
                {catalogos?.centros.map((c) => (
                  <option key={c.id_centro} value={c.id_centro}>
                    {c.nombre_centro}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-4 flex gap-2">
              <select
                value={estadoSol}
                onChange={(e) => setEstadoSol(e.target.value)}
                className="w-full px-2.5 py-2.5 bg-slate-900 border border-slate-700 text-xs text-white rounded-xl"
              >
                {ESTADOS_REC.map((es) => (
                  <option key={es} value={es}>
                    {es}
                  </option>
                ))}
              </select>
              <Button type="submit" size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </form>

          <div className="space-y-2.5">
            {solicitudes.map((s) => (
              <div
                key={s.id_solicitud}
                className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-emerald-400">
                      {s.codigo_solicitud}
                    </span>
                    <span className="text-xs font-semibold text-white">
                      {s.nombre_centro}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {s.total_lotes} lote(s) · {s.total_dispositivos} dispositivo(s) ·{" "}
                    {new Date(s.fecha_solicitud).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={s.estado_recoleccion}
                    onChange={(e) => handleCambiarEstadoSol(s.id_solicitud, e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 text-xs font-semibold text-emerald-300 rounded-lg"
                  >
                    {ESTADOS_REC.map((es) => (
                      <option key={es} value={es}>
                        {es}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleEliminarSol(s.id_solicitud)}
                    title="Eliminar Solicitud"
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lotes */}
        <div className="lg:col-span-5 glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-extrabold text-white">
              Lotes de Equipos (Tabla LOTE)
            </h2>
          </div>

          <form
            onSubmit={handleCrearLote}
            className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800"
          >
            <div className="sm:col-span-5">
              <Input
                value={codLote}
                onChange={(e) => setCodLote(e.target.value)}
                placeholder="LOT-2026-04"
                required
              />
            </div>
            <div className="sm:col-span-7 flex gap-2">
              <select
                value={idSolLote}
                onChange={(e) => setIdSolLote(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 text-xs text-white rounded-xl"
              >
                {solicitudes.map((s) => (
                  <option key={s.id_solicitud} value={s.id_solicitud}>
                    {s.codigo_solicitud} ({s.codigo_centro})
                  </option>
                ))}
              </select>
              <Button type="submit" size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </form>

          <div className="space-y-2.5">
            {lotes.map((l) => (
              <div
                key={l.id_lote}
                className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <span className="font-mono text-xs font-bold text-cyan-300">
                    {l.codigo_lote}
                  </span>
                  <span className="text-xs text-slate-300 ml-2">
                    → {l.codigo_solicitud}
                  </span>
                  <p className="text-[11px] text-slate-400">
                    {l.nombre_centro} ·{" "}
                    <strong className="text-white">{l.total_dispositivos}</strong>{" "}
                    equipos
                  </p>
                </div>
                <button
                  onClick={() => handleEliminarLote(l.id_lote)}
                  title="Eliminar Lote"
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Inventario por Centro y Movimientos de Transferencia */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Inventario */}
        <div className="lg:col-span-6 glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-extrabold text-white">
              Control de Inventario por Centro (Tabla INVENTARIO)
            </h2>
          </div>

          <form
            onSubmit={handleGuardarInventario}
            className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800"
          >
            <div className="sm:col-span-4">
              <select
                value={idCentroInv}
                onChange={(e) => setIdCentroInv(Number(e.target.value))}
                className="w-full px-2.5 py-2.5 bg-slate-900 border border-slate-700 text-xs text-white rounded-xl"
              >
                {catalogos?.centros.map((c) => (
                  <option key={c.id_centro} value={c.id_centro}>
                    {c.codigo_centro}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-5">
              <select
                value={idCatInv}
                onChange={(e) => setIdCatInv(Number(e.target.value))}
                className="w-full px-2.5 py-2.5 bg-slate-900 border border-slate-700 text-xs text-white rounded-xl"
              >
                {catalogos?.categorias.map((cat) => (
                  <option key={cat.id_categoria} value={cat.id_categoria}>
                    {cat.nombre_categoria}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-3 flex gap-1.5">
              <Input
                type="number"
                value={stockInv}
                onChange={(e) => setStockInv(Number(e.target.value))}
                placeholder="Stock"
                required
              />
              <Button type="submit" size="sm">
                OK
              </Button>
            </div>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 px-3">Centro</th>
                  <th className="py-2 px-3">Categoría</th>
                  <th className="py-2 px-3 text-right">Stock Actual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {inventario.map((inv) => (
                  <tr key={inv.id_inventario} className="hover:bg-slate-900/50">
                    <td className="py-2.5 px-3 font-medium text-white">
                      <span className="font-mono text-emerald-400 mr-1">
                        [{inv.codigo_centro}]
                      </span>
                      {inv.nombre_centro}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{inv.nombre_categoria}</td>
                    <td className="py-2.5 px-3 text-right font-black text-emerald-300">
                      {inv.stock_actual} u.
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Movimientos de Transferencia */}
        <div className="lg:col-span-6 glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-extrabold text-white">
                Historial de Transferencias (TRANSFERENCIA_MOVIMIENTO)
              </h2>
              <p className="text-xs text-slate-400">
                RN-06: Confirmar entrega ajusta atómicamente origen y destino
              </p>
            </div>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {transferencias.map((t) => (
              <div
                key={t.num_movimiento}
                className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-400">
                      {t.num_serie}
                    </span>
                    <span className="text-slate-300">
                      ({t.marca} {t.modelo})
                    </span>
                  </div>
                  <p className="text-slate-300 mt-1">
                    <strong>{t.nombre_centro_origen}</strong> →{" "}
                    <strong className="text-cyan-300">{t.nombre_centro_destino}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
                      t.estado_transferencia === "Entregado"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {t.estado_transferencia}
                  </span>
                  {t.estado_transferencia === "En Transito" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleConfirmarEntrega(t.num_movimiento)}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Confirmar</span>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Centros de Acopio y Tratamiento (Tabla CENTRO) */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Building className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-extrabold text-white">
            Red de Centros de Acopio y Plantas de Valorización (Tabla CENTRO)
          </h2>
        </div>

        <form
          onSubmit={handleCrearCentro}
          className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800 items-end"
        >
          <div className="md:col-span-2">
            <FormField label="Código">
              <Input
                value={codCentro}
                onChange={(e) => setCodCentro(e.target.value)}
                placeholder="CEN-AMB-01"
                required
              />
            </FormField>
          </div>
          <div className="md:col-span-3">
            <FormField label="Nombre del Centro">
              <Input
                value={nomCentro}
                onChange={(e) => setNomCentro(e.target.value)}
                placeholder="Centro Acopio Ambato"
                required
              />
            </FormField>
          </div>
          <div className="md:col-span-4">
            <FormField label="Dirección">
              <Input
                value={dirCentro}
                onChange={(e) => setDirCentro(e.target.value)}
                placeholder="Av. Bolivariana, Ambato"
                required
              />
            </FormField>
          </div>
          <div className="md:col-span-3 flex gap-2">
            <div className="flex-1">
              <FormField label="Tipo Centro">
                <select
                  value={tipoCentro}
                  onChange={(e) => setTipoCentro(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 text-xs text-white rounded-xl"
                >
                  {catalogos?.tipos_centro.map((tc) => (
                    <option key={tc.id_tipo_centro} value={tc.id_tipo_centro}>
                      {tc.nombre_tipo}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
            <Button type="submit" size="md">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {catalogos?.centros.map((c) => (
            <div
              key={c.id_centro}
              className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between gap-2"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-400">
                    {c.codigo_centro}
                  </span>
                  <button
                    onClick={() => handleEliminarCentro(c.id_centro)}
                    className="text-slate-500 hover:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-sm font-bold text-white mt-1">{c.nombre_centro}</p>
                <p className="text-xs text-slate-400 mt-0.5">{c.direccion}</p>
              </div>
              <span className="text-[11px] font-semibold text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 rounded-lg w-fit">
                {c.nombre_tipo_centro}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SolicitudesLotesPage;
