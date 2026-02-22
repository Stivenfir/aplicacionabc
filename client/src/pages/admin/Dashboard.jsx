import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const cards = [
  {
    to: "/mapa",
    title: "Mapa de puestos",
    description: "Visualiza la ocupación en tiempo real y reserva en segundos.",
    icon: "🗺️",
    accent: "from-cyan-500 to-blue-600",
  },
  {
    to: "/areas",
    title: "Gestión de Áreas",
    description: "Administra pisos, áreas y delimitaciones de forma centralizada.",
    icon: "📍",
    accent: "from-violet-500 to-indigo-600",
  },
  {
    to: "/mis-reservas",
    title: "Mis reservas",
    description: "Consulta historial y controla tus reservas activas fácilmente.",
    icon: "📋",
    accent: "from-emerald-500 to-teal-600",
  },
];

const quickStats = [
  { label: "Estado plataforma", value: "Operativa", hint: "Rendimiento estable", icon: "✅" },
  { label: "Módulo principal", value: "Reservas", hint: "Control diario activo", icon: "📈" },
  { label: "Experiencia", value: "Premium", hint: "Interfaz corporativa", icon: "✨" },
];

export default function Dashboard() {
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
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-7 md:p-9 text-white shadow-2xl"
      >
        <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 w-64 h-64 rounded-full bg-violet-500/20 blur-3xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase text-cyan-200/90 bg-cyan-400/10 border border-cyan-300/25 rounded-full px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-cyan-300" />
              ABC Desk Booking
            </p>
            <h1 className="mt-4 text-3xl md:text-5xl font-black leading-tight">
              Bienvenido al panel principal
            </h1>
            <p className="mt-3 text-slate-200 md:text-lg">
              Gestiona reservas, áreas y puestos desde una experiencia moderna, rápida y profesional.
            </p>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md px-5 py-4 min-w-[250px]">
            <p className="text-xs uppercase tracking-wider text-slate-200">Fecha del sistema</p>
            <p className="mt-2 text-base font-semibold capitalize">{hoy}</p>
            <div className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-lg border border-white/20 bg-white/10">
              <span className="text-sm font-extrabold tracking-[0.2em] text-white">ABC</span>
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
            whileHover={{ y: -4 }}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-xl transition"
          >
            <p className="text-2xl">{stat.icon}</p>
            <p className="text-xs uppercase tracking-wide text-slate-500 mt-2">{stat.label}</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{stat.value}</p>
            <p className="text-sm text-slate-600 mt-1">{stat.hint}</p>
          </motion.article>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {cards.map((card, index) => (
          <motion.div
            key={card.to}
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.08 * (index + 1), duration: 0.35 }}
          >
            <Link to={card.to} className="block group h-full">
              <motion.article
                whileHover={{ y: -6, rotateX: 2 }}
                whileTap={{ scale: 0.99 }}
                className="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-2xl transition relative overflow-hidden"
                style={{ transformPerspective: 1200 }}
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
