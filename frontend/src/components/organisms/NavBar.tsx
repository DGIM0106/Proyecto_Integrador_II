import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Recycle,
  LayoutDashboard,
  Cpu,
  Truck,
  Network,
  Users,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import Avatar from "../atoms/Avatar";
import Button from "../atoms/Button";
import { useAuth } from "../../context/AuthContext";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard & SQL", icon: LayoutDashboard },
  { path: "/dispositivos", label: "Dispositivos & Trazabilidad", icon: Cpu },
  { path: "/logistica", label: "Solicitudes, Lotes & Stock", icon: Truck },
  { path: "/red-flujo", label: "Red de Flujo Máximo", icon: Network },
  { path: "/usuarios", label: "Actores & Roles", icon: Users },
];

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-emerald-500/15 px-4 sm:px-6 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform eco-glow">
            <Recycle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg font-extrabold tracking-tight text-white">
              EcoRAEE <span className="text-emerald-400">Cloud</span>
            </span>
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Economía Circular · Parte II Local
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-1 overflow-x-auto py-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm"
                    : "text-slate-300 hover:text-white hover:bg-slate-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
              <Link
                to="/auth"
                title="Cambiar de usuario o rol"
                className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
              >
                <Avatar name={user.nombre} size="sm" />
                <div className="hidden md:block text-left">
                  <p className="text-xs font-bold text-slate-100 leading-tight">
                    {user.nombre}
                  </p>
                  <p className="text-[10px] font-medium text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    {user.nombre_rol}
                  </p>
                </div>
              </Link>
              <button
                onClick={() => {
                  logout();
                  navigate("/auth");
                }}
                title="Cambiar Sesión / Salir"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link to="/auth">
              <Button variant="primary" size="sm">
                Iniciar Sesión
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;

