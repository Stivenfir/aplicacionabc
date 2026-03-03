import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const cards = [
  {
    to: "/mapa",
    title: "Mapa de puestos",
    description: "Visualiza disponibilidad en tiempo real y encuentra tu espacio ideal para hoy.",
    icon: "🗺️",
    accent: "from-cyan-500 to-blue-600",
  },
  {
    to: "/mis-reservas",
    title: "Mis reservas",
    description: "Consulta, ajusta y da seguimiento a todas tus reservas activas.",
    icon: "📋",
    accent: "from-violet-500 to-indigo-600",
  },
];

const quickStats = [
  { label: "Estado del sistema", value: "Operativo", hint: "Sin interrupciones", icon: "✅" },
  { label: "Experiencia", value: "3D Premium", hint: "Diseño moderno", icon: "✨" },
  { label: "Flujo diario", value: "Optimizado", hint: "Reserva en segundos", icon: "⚡" },
];

export default function CM_Dashboard() {
  const hoy = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <motion.section
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-[#0b1630] via-[#0f2248] to-[#17325c] p-7 md:p-9 text-white shadow-xl"
      >
        <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-blue-400/15 blur-3xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase text-blue-100 border border-white/20 rounded-full px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-blue-200" />
              ABC Desk Booking
            </p>
            <h1 className="mt-4 text-3xl md:text-5xl font-black leading-tight">Bienvenido a tu espacio</h1>
            <p className="mt-3 text-slate-200 md:text-lg">
              Gestiona tu jornada con una experiencia visual más moderna, profesional y rápida.
            </p>
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur px-5 py-4 min-w-[280px]">
            <p className="text-xs uppercase tracking-wider text-slate-200">Fecha del sistema</p>
            <p className="mt-2 text-base font-semibold capitalize">{hoy}</p>
            <div className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-lg border border-white/25 bg-white/10">
              <span className="text-xs font-black tracking-[0.2em] text-white">ABC DESK BOOKING</span>
            </div>
          </div>
        </div>
      </motion.section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickStats.map((stat, index) => (
          <motion.article
            key={stat.label}
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 * index, duration: 0.35 }}
            whileHover={{ y: -3 }}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-lg transition"
          >
            <p className="text-2xl">{stat.icon}</p>
            <p className="text-xs uppercase tracking-wide text-slate-500 mt-2">{stat.label}</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{stat.value}</p>
            <p className="text-sm text-slate-600 mt-1">{stat.hint}</p>
          </motion.article>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {cards.map((card, index) => (
          <motion.div
            key={card.to}
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.08 * (index + 1), duration: 0.35 }}
          >
            <Link to={card.to} className="block group h-full">
              <motion.article
                whileHover={{ y: -5, rotateX: 2 }}
                whileTap={{ scale: 0.99 }}
                style={{ transformPerspective: 1200 }}
                className="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-xl transition relative overflow-hidden"
              >
                <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${card.accent}`} />
                <div className="flex items-start justify-between mb-4">
                  <span className="text-5xl">{card.icon}</span>
                  <span className="text-slate-400 group-hover:text-cyan-600 transition">→</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 group-hover:text-cyan-700 transition">{card.title}</h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{card.description}</p>
              </motion.article>
            </Link>
          </motion.div>
        ))}
      </section>
    </div>
  );
}
