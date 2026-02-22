import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const menuItems = [
  { path: "/dashboard", label: "Dashboard", icon: "🏠", roles: ["admin", "jefe", "empleado"] },
  { path: "/mapa", label: "Mapa de Puestos", icon: "🗺️", roles: ["admin", "jefe", "empleado"] },
  { path: "/mis-reservas", label: "Mis Reservas", icon: "📋", roles: ["admin", "jefe", "empleado"] },
  { path: "/areas", label: "Gestión de Áreas", icon: "📍", roles: ["admin"] },
  { path: "/puestos", label: "Gestión de Puestos", icon: "🪑", roles: ["admin"] },
  { path: "/admin/usuarios", label: "Lista de Reservas", icon: "📊", roles: ["admin"] },
  { path: "/admin/asignaciones", label: "Re-asignar Puestos", icon: "🔄", roles: ["admin", "jefe"] },
  { path: "/admin/parametros", label: "Parametrización", icon: "⚙️", roles: ["admin"] },
];

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const username = localStorage.getItem("username") || "Usuario";
  const userRole = localStorage.getItem("userRole") || "empleado";

  const roleConfig = {
    admin: { label: "Administrador", color: "text-cyan-100", chip: "bg-cyan-500/15 border-cyan-300/30" },
    jefe: { label: "Jefe", color: "text-violet-100", chip: "bg-violet-500/15 border-violet-300/30" },
    empleado: { label: "Empleado", color: "text-slate-100", chip: "bg-slate-500/15 border-slate-300/30" },
  };

  const currentRole = roleConfig[userRole] || roleConfig.empleado;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-950/55 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-72 transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="h-full p-4 lg:p-5 bg-[#040b1c] border-r border-slate-700/50 shadow-2xl shadow-slate-950/30">
          <div className="h-full rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/95 to-[#0a1733] p-4 flex flex-col">
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.35 }}
              className="mb-6"
            >
              <div className="rounded-2xl p-4 border border-slate-600/50 bg-slate-900/60 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white text-slate-900 flex items-center justify-center shadow-sm">
                    <span className="font-black tracking-widest">ABC</span>
                  </div>
                  <div>
                    <p className="text-slate-50 font-bold text-sm">ABC Desk Booking</p>
                    <p className="mt-0.5 text-xs text-slate-300">Panel corporativo de operación</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <nav className="space-y-1.5 flex-1 overflow-y-auto pr-1">
              {menuItems.map((item, index) => {
                const isActive = location.pathname === item.path;

                return (
                  <motion.div
                    key={item.path}
                    initial={{ x: -12, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.04 * index }}
                  >
                    <Link to={item.path} onClick={onClose} className="block">
                      <motion.div
                        whileHover={{ x: 3 }}
                        whileTap={{ scale: 0.98 }}
                        className={`
                          group relative overflow-hidden rounded-xl px-3 py-3 transition-all duration-200
                          ${
                            isActive
                              ? "bg-white text-slate-900 shadow-lg"
                              : "text-slate-200 hover:bg-white/10"
                          }
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-7 h-7 rounded-md flex items-center justify-center ${isActive ? "bg-slate-100" : "bg-white/10"}`}>
                            {item.icon}
                          </span>
                          <span className="font-semibold text-sm tracking-wide">{item.label}</span>
                          {isActive && (
                            <motion.span
                              layoutId="sidebar-active-dot"
                              className="ml-auto h-2 w-2 rounded-full bg-slate-900"
                            />
                          )}
                        </div>
                      </motion.div>
                    </Link>
                  </motion.div>
                );
              })}
            </nav>

            <motion.div
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="mt-5"
            >
              <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3.5">
                <p className="text-slate-100 text-sm font-semibold truncate">{username}</p>
                <span className={`mt-2 inline-flex px-2 py-1 rounded-full border text-xs font-medium ${currentRole.chip} ${currentRole.color}`}>
                  {currentRole.label}
                </span>
                <p className="text-[11px] text-slate-400 mt-3">ABC Desk Booking · v1.0</p>
              </div>
            </motion.div>
          </div>
        </div>
      </aside>
    </>
  );
}
