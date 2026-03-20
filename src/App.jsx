import { Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";

// ── Existing pages ─────────────────────────────────────────────────────────
import LandingPage  from "./pages/LandingPage";
import SupportPage  from "./pages/SupportPage";
import Fdbkpage     from "./pages/Fdbkpage";
import ServicePage  from "./pages/ServicePage";
import NotFound     from "./components/NotFound";
import Preloader    from "./components/Preloader";

// ── Auth & dashboard ───────────────────────────────────────────────────────
import LoginPage          from "./pages/LoginPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AgentDashboardPage from "./pages/AgentDashboardPage";
import ProtectedRoute     from "./components/ProtectedRoute";

function App() {
  const [loading, setLoading] = useState(true);

  // onComplete is called by Preloader once every image has loaded.
  // The 6s cap inside Preloader means this will always fire — no infinite spinner.
  const handlePreloaderDone = () => setLoading(false);

  if (loading) return <Preloader onComplete={handlePreloaderDone} />;

  return (
    <Routes>
      {/* ── Public routes ─────────────────────────────────────────────── */}
      <Route path="/"         element={<LandingPage />} />
      <Route path="/support"  element={<SupportPage />} />
      <Route path="/feedback" element={<Fdbkpage />} />
      <Route path="/services" element={<ServicePage />} />

      {/* ── Auth ──────────────────────────────────────────────────────── */}
      <Route path="/login" element={<LoginPage />} />

      {/* ── Protected dashboards (role-gated) ─────────────────────────── */}
      <Route path="/dashboard/admin" element={
        <ProtectedRoute allowedRole="admin">
          <AdminDashboardPage />
        </ProtectedRoute>
      }/>

      <Route path="/dashboard/agent" element={
        <ProtectedRoute allowedRole="agent">
          <AgentDashboardPage />
        </ProtectedRoute>
      }/>

      <Route path="/dashboard" element={
        <ProtectedRoute>
          <AdminDashboardPage />
        </ProtectedRoute>
      }/>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;