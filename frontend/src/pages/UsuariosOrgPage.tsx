import React, { useEffect, useState, useCallback } from "react";
import { Users, Building2, Shield, Plus, Trash2 } from "lucide-react";
import apiClient from "../api/client";
import type { User, Organizacion, Rol } from "../types";
import Button from "../components/atoms/Button";
import Input from "../components/atoms/Input";
import FormField from "../components/molecules/FormField";

const UsuariosOrgPage: React.FC = () => {
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [organizaciones, setOrganizaciones] = useState<Organizacion[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Nueva organización
  const [ruc, setRuc] = useState("");
  const [razonSocial, setRazonSocial] = useState("");

  // Nuevo usuario
  const [nombreUser, setNombreUser] = useState("");
  const [correoUser, setCorreoUser] = useState("");
  const [idOrgUser, setIdOrgUser] = useState<number>(1);
  const [idRolUser, setIdRolUser] = useState<number>(2);

  const cargarTodo = useCallback(async () => {
    try {
      const [uRes, oRes, rRes] = await Promise.all([
        apiClient.get<User[]>("/auth/users"),
        apiClient.get<Organizacion[]>("/auth/organizaciones"),
        apiClient.get<Rol[]>("/auth/roles"),
      ]);
      setUsuarios(uRes.data);
      setOrganizaciones(oRes.data);
      setRoles(rRes.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    cargarTodo();
  }, [cargarTodo]);

  const handleCrearOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await apiClient.post("/auth/organizaciones", {
        ruc,
        razon_social: razonSocial,
      });
      setRuc("");
      setRazonSocial("");
      await cargarTodo();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Error al crear organización.");
    }
  };

  const handleEliminarOrg = async (id: number) => {
    try {
      await apiClient.delete(`/auth/organizaciones/${id}`);
      await cargarTodo();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "No se puede eliminar la organización.");
    }
  };

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await apiClient.post("/auth/register", {
        nombre: nombreUser,
        correo: correoUser,
        id_organizacion: idOrgUser,
        id_rol: idRolUser,
      });
      setNombreUser("");
      setCorreoUser("");
      await cargarTodo();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Error al crear usuario.");
    }
  };

  const handleEliminarUsuario = async (id: number) => {
    try {
      await apiClient.delete(`/auth/users/${id}`);
      await cargarTodo();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "No se puede eliminar el usuario.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
          <Users className="w-7 h-7 text-emerald-400" />
          Administración de Actores, Usuarios, Organizaciones y Roles
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Gestión de entidades USUARIO, ORGANIZACION (con validación CK_ORGANIZACION_RUC de
          13 dígitos) y ROL en SQL Server.
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Usuarios */}
        <div className="lg:col-span-7 glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-extrabold text-white">
              Usuarios del Ecosistema (Tabla USUARIO)
            </h2>
          </div>

          <form
            onSubmit={handleCrearUsuario}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800"
          >
            <FormField label="Nombre Completo">
              <Input
                value={nombreUser}
                onChange={(e) => setNombreUser(e.target.value)}
                placeholder="Ej. Carlos Andrade"
                required
              />
            </FormField>
            <FormField label="Correo Único">
              <Input
                type="email"
                value={correoUser}
                onChange={(e) => setCorreoUser(e.target.value)}
                placeholder="carlos.andrade@ecoraee.ec"
                required
              />
            </FormField>
            <FormField label="Organización">
              <select
                value={idOrgUser}
                onChange={(e) => setIdOrgUser(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 text-xs text-white rounded-xl"
              >
                {organizaciones.map((o) => (
                  <option key={o.id_organizacion} value={o.id_organizacion}>
                    {o.razon_social}
                  </option>
                ))}
              </select>
            </FormField>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <FormField label="Rol Asignado">
                  <select
                    value={idRolUser}
                    onChange={(e) => setIdRolUser(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 text-xs text-white rounded-xl"
                  >
                    {roles.map((r) => (
                      <option key={r.id_rol} value={r.id_rol}>
                        {r.nombre_rol}
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

          <div className="space-y-2.5">
            {usuarios.map((u) => (
              <div
                key={u.id_usuario}
                className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-bold text-white">{u.nombre}</p>
                  <p className="text-xs text-slate-400">{u.correo}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{u.razon_social}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                    {u.nombre_rol}
                  </span>
                  <button
                    onClick={() => handleEliminarUsuario(u.id_usuario)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Organizaciones y Roles */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-cyan-400" />
              <h2 className="text-base font-extrabold text-white">
                Organizaciones (Tabla ORGANIZACION)
              </h2>
            </div>

            <form onSubmit={handleCrearOrg} className="space-y-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
              <FormField label="RUC (Exactamente 13 dígitos - CK_ORGANIZACION_RUC)">
                <Input
                  value={ruc}
                  onChange={(e) => setRuc(e.target.value)}
                  placeholder="1790099988001"
                  maxLength={13}
                  required
                />
              </FormField>
              <div className="flex gap-2">
                <Input
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                  placeholder="Razón Social de la Organización..."
                  required
                />
                <Button type="submit" size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </form>

            <div className="space-y-2">
              {organizaciones.map((o) => (
                <div
                  key={o.id_organizacion}
                  className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-white">{o.razon_social}</p>
                    <p className="font-mono text-emerald-400">RUC: {o.ruc}</p>
                  </div>
                  <button
                    onClick={() => handleEliminarOrg(o.id_organizacion)}
                    className="text-slate-400 hover:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-extrabold text-white">
                Roles y Matriz de Separación de Funciones (Tabla ROL)
              </h2>
            </div>
            {roles.map((r) => (
              <div
                key={r.id_rol}
                className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs flex items-center justify-between"
              >
                <span className="font-bold text-white">
                  #{r.id_rol} · {r.nombre_rol}
                </span>
                <span className="text-emerald-400 font-semibold">Activo</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsuariosOrgPage;

