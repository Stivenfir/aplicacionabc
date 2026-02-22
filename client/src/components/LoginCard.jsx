import { motion } from "framer-motion";

export default function LoginCard({
  username,
  setUsername,
  password,
  setPassword,
  loading,
  error,
  successMessage,
  onSubmit,
}) {
  return (
    <div className="relative [perspective:1400px]">
      <motion.div
        initial={{ opacity: 0, x: 24, rotateY: -8, scale: 0.98 }}
        animate={{ opacity: 1, x: 0, rotateY: 0, scale: 1 }}
        whileHover={{ rotateY: 4, rotateX: 2 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative [transform-style:preserve-3d]"
      >
        <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-cyan-500/35 via-indigo-500/20 to-fuchsia-500/30 blur-2xl" />

        <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.35)] p-8 border border-white/50 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-fuchsia-600" />
          <div className="absolute -right-16 -top-16 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl" />
          <div className="absolute -left-12 -bottom-20 w-52 h-52 bg-cyan-400/10 rounded-full blur-2xl" />

          <div className="flex items-start justify-between mb-6 relative">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold shadow-lg shadow-blue-600/30">
                ABC
              </div>
              <div>
                <h3 className="text-2xl font-extrabold text-gray-800 leading-tight">Iniciar Sesión</h3>
                <p className="text-sm text-gray-500">Acceso corporativo seguro</p>
              </div>
            </div>
            <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">SSL</span>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
            >
              {error}
            </motion.div>
          )}

          {successMessage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-center"
            >
              {successMessage}
            </motion.div>
          )}

          <form onSubmit={onSubmit} className="space-y-5 relative">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Usuario Corporativo</label>
              <div className="relative">
                <span className="absolute left-3 top-3.5 text-gray-400 select-none">👤</span>
                <motion.input
                  whileFocus={{ scale: 1.01 }}
                  aria-label="Usuario corporativo"
                  autoComplete="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-white/80"
                  placeholder="tu.usuario"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Contraseña</label>
              <div className="relative">
                <span className="absolute left-3 top-3.5 text-gray-400 select-none">🔒</span>
                <motion.input
                  whileFocus={{ scale: 1.01 }}
                  aria-label="Contraseña"
                  autoComplete="current-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-white/80"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.99 }}
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold py-3 rounded-xl transition duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-blue-600/30"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/60 border-t-white animate-spin" />
                  Autenticando...
                </span>
              ) : (
                "Ingresar"
              )}
            </motion.button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">¿Problemas para ingresar? Contacta a <b>TI</b></p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
