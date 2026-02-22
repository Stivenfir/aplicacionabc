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
      transition={{ duration: 0.45 }}
      className="bg-white/90 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-40 shadow-lg"
    >
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.95 }}
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-all duration-200"
          >
            <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </motion.button>

          <motion.div
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="flex items-center gap-3"
          >
            <div className="w-14 h-12 rounded-xl bg-white shadow-md border border-slate-200 flex items-center justify-center px-1">
              <img src="/abc-logo-wordmark.svg" alt="ABC" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">ABC Desk Booking</h1>
              <p className="text-xs text-slate-600">Panel corporativo de operación</p>
            </div>
          </motion.div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={logout}
          className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-xl transition-all duration-200 font-semibold shadow-md"
        >
          Cerrar sesión
        </motion.button>
      </div>
    </motion.header>
  );
}
