import { motion } from "framer-motion";

export default function ReasignacionesConstruccion() {
  return (
    <div className="max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-white to-amber-50 p-8 md:p-10 shadow-sm"
      >
        <div className="absolute -top-20 -right-10 w-56 h-56 rounded-full bg-amber-300/30 blur-3xl" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-bold tracking-widest text-amber-700">
            MÓDULO EN CONSTRUCCIÓN
          </div>

          <h1 className="mt-4 text-3xl md:text-4xl font-black text-slate-900">Re-asignar Puestos</h1>
          <p className="mt-2 text-slate-600 text-base md:text-lg">
            Estamos preparando esta funcionalidad para que puedas re-asignar puestos con mayor control.
          </p>

          <div className="mt-8 flex items-end gap-2 h-16">
            {[0, 1, 2, 3, 4].map((item) => (
              <motion.div
                key={item}
                className="w-3 rounded-full bg-amber-500"
                animate={{ height: [10, 28, 16, 36, 10] }}
                transition={{ duration: 1.3, repeat: Infinity, delay: item * 0.1, ease: "easeInOut" }}
              />
            ))}
            <span className="ml-3 text-sm text-amber-700 font-semibold">Próximamente</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
