import React, { createContext, useContext, useState, useEffect } from "react";
import type { User } from "../types";

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const DEFAULT_DEMO_USER: User = {
  id_usuario: 1,
  nombre: "Anthony Romo",
  correo: "anthony.romo@ecoraee.ec",
  id_rol: 1,
  nombre_rol: "Administrador del Sistema",
  id_organizacion: 1,
  razon_social: "Empresa Publica Metropolitana de Gestion Integral",
  ruc: "1790012345001",
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem("ecoraee_user");
      return savedUser ? JSON.parse(savedUser) : DEFAULT_DEMO_USER;
    } catch {
      return DEFAULT_DEMO_USER;
    }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem("ecoraee_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("ecoraee_user");
    }
  }, [user]);

  const login = (userData: User) => {
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("ecoraee_user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
};

