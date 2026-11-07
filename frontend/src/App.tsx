import React from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/organisms/NavBar";
import DashboardPage from "./pages/DashboardPage";
import DispositivosPage from "./pages/DispositivosPage";
import SolicitudesLotesPage from "./pages/SolicitudesLotesPage";
import RedFlujoPage from "./pages/RedFlujoPage";
import UsuariosOrgPage from "./pages/UsuariosOrgPage";
import AuthPage from "./pages/AuthPage";

const LayoutContent: React.FC = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === "/auth";

  return (
    <div className="min-h-screen bg-[#090e17] flex flex-col font-sans text-slate-100">
      {!isAuthPage && <Navbar />}
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dispositivos" element={<DispositivosPage />} />
          <Route path="/logistica" element={<SolicitudesLotesPage />} />
          <Route path="/red-flujo" element={<RedFlujoPage />} />
          <Route path="/usuarios" element={<UsuariosOrgPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="*" element={<DashboardPage />} />
        </Routes>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <LayoutContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

