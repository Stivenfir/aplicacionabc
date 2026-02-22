import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { setToken } from "../auth";
import AnimatedBackground from "../components/AnimatedBackground";
import LoginCard from "../components/LoginCard";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const navigate = useNavigate();
  const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const response = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      let data = null;
      try {
        data = await response.json();
      } catch (errorJson) {
        console.error("Error:", errorJson);
      }

      if (response.ok) {
        setToken(data?.token);
        localStorage.setItem("username", username);
        setSuccessMessage(`✔ Bienvenido, ${username}`);

        switch (data?.user?.role) {
          case "1":
            setTimeout(() => navigate("/dashboard"), 900);
            break;
          case "2":
            setTimeout(() => navigate("/l_dashboard"), 900);
            break;
          default:
            setTimeout(() => navigate("/c_dashboard"), 900);
        }
      } else {
        setError(data?.message || "Usuario o contraseña incorrectos");
      }
    } catch {
      setError("No se pudo conectar con el servidor. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      <AnimatedBackground />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-20 w-[520px] h-[520px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -bottom-36 -right-20 w-[560px] h-[560px] rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <header className="relative z-10 w-full p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="text-2xl font-black text-white"
          >
            ABC Desk Booking
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-sm text-blue-200/90"
          >
            Sistema de Reserva de Puestos
          </motion.div>
        </div>
      </header>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="max-w-6xl w-full grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -22 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            className="text-white space-y-6"
          >
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200 bg-white/10 border border-white/20 rounded-full px-3 py-1">
              Plataforma Empresarial
            </div>

            <h2 className="text-5xl md:text-6xl font-black leading-tight">
              Reserva tu puesto
              <span className="block bg-gradient-to-r from-cyan-300 via-blue-300 to-fuchsia-300 bg-clip-text text-transparent">
                con experiencia premium
              </span>
            </h2>

            <p className="text-xl text-blue-100/90 max-w-xl">
              Hot-desking corporativo con trazabilidad, disponibilidad y control operativo en tiempo real.
            </p>

            <div className="grid grid-cols-3 gap-3 max-w-xl">
              {[
                ["99.9%", "Disponibilidad"],
                ["24/7", "Monitoreo"],
                ["+10k", "Reservas"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-xl border border-white/20 bg-white/10 backdrop-blur px-3 py-3">
                  <p className="text-xl font-black text-white">{value}</p>
                  <p className="text-xs text-blue-200/90">{label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <LoginCard
            username={username}
            setUsername={setUsername}
            password={password}
            setPassword={setPassword}
            loading={loading}
            error={error}
            successMessage={successMessage}
            onSubmit={handleLogin}
          />
        </div>
      </div>

      <footer className="relative z-10 w-full p-6">
        <div className="max-w-7xl mx-auto text-center text-blue-200/80 text-sm">© 2026 ABC Corporation · Desk Booking System v1.0</div>
      </footer>
    </div>
  );
}
