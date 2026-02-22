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
    <div className="relative min-h-screen overflow-hidden bg-[#050B1A]">
      <AnimatedBackground />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.25),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.2),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(34,197,94,0.15),transparent_35%)]" />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
          className="absolute top-[12%] left-[8%] w-28 h-28 border border-cyan-300/30 rounded-2xl [transform:rotateX(55deg)_rotateY(-20deg)]"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[14%] right-[10%] w-36 h-36 border border-fuchsia-300/25 rounded-full [transform:rotateX(65deg)_rotateY(20deg)]"
        />
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
              Reserva tu puesto de
              <span className="block bg-gradient-to-r from-cyan-300 via-blue-300 to-fuchsia-300 bg-clip-text text-transparent">
                trabajo
              </span>
            </h2>

            <p className="text-xl text-blue-100/90 max-w-xl">
              Hot-desking empresarial con trazabilidad, disponibilidad y control.
            </p>
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
