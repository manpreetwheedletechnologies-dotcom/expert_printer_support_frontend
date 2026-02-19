import { Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import LandingPage from "./pages/LandingPage";
import PrinterBot from "./components/PrinterBot";
import Preloader from "./components/Preloader";
import NotFound from "./components/NotFound";

function App() {
  const [loading, setLoading] = useState(true);
   const [botMinimized, setBotMinimized] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000); // 2 seconds preloader

    return () => clearTimeout(timer);
  }, []);

  if (loading) return <Preloader />;

  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="*" element={<NotFound />} />
        {/* Add more routes here */}
      </Routes>

      {/* 👇 Chatbot renders on ALL pages */}
      <PrinterBot isMinimized={botMinimized} setIsMinimized={setBotMinimized} />
    </>
  );
}

export default App;
