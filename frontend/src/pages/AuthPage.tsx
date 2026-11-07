import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Recycle, ShieldCheck, UserPlus, LogIn, Building2 } from "lucide-react";
import apiClient from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { User, Rol, Organizacion } from "../types";
import Button from "../components/atoms/Button";
import Input from "../components/atoms/Input";
import FormField from "../components/molecules/FormField";

const AuthPage: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [correoLogin, setCorreoLogin] = useState(user?.correo || "anthony.romo@ecoraee.ec");
  const [nombreReg, setNombreReg] = useState("");
  const [correoReg, setCorreoReg] = useState("");
  const [idOrgReg, setIdOrgReg] = useState<number>(1);
  const [idRolReg, setIdRolReg] = useState<number>(2);

  const [usersList, setUsersList] = useState<User[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [organizaciones, setOrganizaciones] = useState<Organizacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [uRes, catRes] = await Promise.all([
          apiClient.get<User[]>("/auth/users"),
          apiClient.get("/catalogos/resumen"),
        ]);
        setUsersList(uRes.data);
        setRoles(catRes.data.roles || []);
        setOrganizaciones(catRes.data.organizaciones || []);
      } catch (err) {
        console.error("Error cargando usuarios:", err);
      }
    };
    loadData();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!correoLogin.trim()) {
      setError("Ingresa un correo institucional válido.");
      return;
    }
    try {
      setLoading(true);
      const res = await apiClient.post("/auth/login", { correo: correoLogin });
      login(res.data.user);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Error al iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSelect = (u: User) => {
    login(u);
    navigate("/");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!nombreReg.trim() || !correoReg.trim()) {
      setError("Completa el nombre completo y el correo electrónico.");
      return;
    }
    try {
      setLoading(true);
      const res = await apiClient.post<User>("/auth/register", {
        nombre: nombreReg,
        correo: correoReg,
        id_organizacion: idOrgReg,
        id_rol: idRolReg,
      });
      login(res.data);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.detail || "No se pudo registrar el usuario.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Panel Izquierdo: Formulario */}
        <div className="lg:col-span-6 glass-panel rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg eco-glow">
                <Recycle className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white tracking-tight">
                  EcoRAEE <span className="text-emerald-400">Cloud</span>
                </h1>
                <p className="text-xs text-slate-400">
                  Control de Acceso Basado en Roles (RBAC · RF-INT-01)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  mode === "login"
                    ? "bg-emerald-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError(null);
                }}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  mode === "register"
                    ? "bg-emerald-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Nuevo Actor / Usuario
              </button>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs font-medium">
                {error}
              </div>
            )}

            {mode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <FormField
                  label="Correo Institucional Registrado"
                  hint="Ingresa tu correo registrado en la tabla USUARIO de EcoRAEE_DB"
                >
                  <Input
                    type="email"
                    value={correoLogin}
                    onChange={(e) => setCorreoLogin(e.target.value)}
                    placeholder="ejemplo@ecoraee.ec"
                    required
                  />
                </FormField>
                <Button type="submit" isLoading={loading} className="w-full" size="lg">
                  Ingresar a la Plataforma
                </Button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <FormField label="Nombre Completo">
                  <Input
                    type="text"
                    value={nombreReg}
                    onChange={(e) => setNombreReg(e.target.value)}
                    placeholder="Ej. María Fernanda Gómez"
                    required
                  />
                </FormField>
                <FormField label="Correo Institucional (Único)">
                  <Input
                    type="email"
                    value={correoReg}
                    onChange={(e) => setCorreoReg(e.target.value)}
                    placeholder="maria.gomez@ecoraee.ec"
                    required
                  />
                </FormField>
                <FormField label="Organización (FK_USUARIO_ORGANIZACION)">
                  <select
                    value={idOrgReg}
                    onChange={(e) => setIdOrgReg(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 text-slate-100 text-sm rounded-xl outline-none focus:border-emerald-500"
                  >
                    {organizaciones.map((o) => (
                      <option key={o.id_organizacion} value={o.id_organizacion}>
                        {o.razon_social} (RUC: {o.ruc})
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Rol en el Ecosistema (FK_USUARIO_ROL)">
                  <select
                    value={idRolReg}
                    onChange={(e) => setIdRolReg(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 text-slate-100 text-sm rounded-xl outline-none focus:border-emerald-500"
                  >
                    {roles.map((r) => (
                      <option key={r.id_rol} value={r.id_rol}>
                        {r.nombre_rol}
                      </option>
                    ))}
                  </select>
                </FormField>
                <Button type="submit" isLoading={loading} className="w-full" size="lg">
                  Registrar Usuario en SQL Server
                </Button>
              </form>
            )}
          </div>

          <div className="pt-6 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Base de Datos: SQL Server (EcoRAEE_DB)</span>
            <span className="text-emerald-400 font-semibold">Entorno Local Activo</span>
          </div>
        </div>

        {/* Panel Derecho: Selección Rápida de Integrantes / Roles para Demo */}
        <div className="lg:col-span-6 glass-card rounded-3xl p-6 sm:p-8 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              Acceso Rápido por Rol (Datos 02_DML.sql)
            </div>
            <h2 className="text-lg font-extrabold text-white">
              Selecciona un Integrante / Actor del Sistema
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Haz clic en cualquiera de los usuarios cargados en{" "}
              <code className="text-emerald-400">EcoRAEE_DB</code> para probar las
              validaciones de permisos y reglas de negocio (como{" "}
              <strong className="text-white">RN-02</strong>: solo Técnicos Clasificadores o
              Administradores pueden registrar evaluaciones técnicas).
            </p>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {usersList.map((u) => {
                const isSelected = user?.id_usuario === u.id_usuario;
                return (
                  <button
                    key={u.id_usuario}
                    onClick={() => handleQuickSelect(u)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-emerald-950/60 border-emerald-500/60 shadow-md"
                        : "bg-slate-900/70 border-slate-800 hover:border-emerald-500/40 hover:bg-slate-900"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white truncate">
                          {u.nombre}
                        </span>
                        {isSelected && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500 text-slate-950 rounded-full">
                            Activo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate">{u.correo}</p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1 truncate">
                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                        {u.razon_social}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 text-emerald-300 border border-slate-700 shrink-0">
                      {u.nombre_rol}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

