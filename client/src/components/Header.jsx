import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { clearToken } from "../auth";

export default function Header({ onMenuClick }) {
  const navigate = useNavigate();

  const logout = () => {
    clearToken();
    localStorage.removeItem("username");
    localStorage.removeItem("userRole");
    navigate("/login");
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="bg-white/95 backdrop-blur border-b border-slate-200 sticky top-0 z-40 shadow-sm"
    >
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </motion.button>

          <div>
            <h1 className="text-2xl leading-none font-extrabold text-slate-900">ABC Desk Booking</h1>
            <p className="text-xs text-slate-500 mt-1">Panel corporativo de operación</p>
          </div>
        </div>

        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={logout}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition font-semibold shadow-sm"
        >
          Cerrar sesión
        </motion.button>
      </div>
    </motion.header>
  );
}
