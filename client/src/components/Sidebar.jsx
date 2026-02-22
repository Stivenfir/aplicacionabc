import { Link, useLocation } from "react-router-dom";    
import { motion, AnimatePresence } from "framer-motion";    
    
const menuItems = [  
  { path: "/dashboard", label: "Dashboard", icon: "🏠", roles: ["admin", "jefe", "empleado"] },  
  { path: "/mapa", label: "Mapa de Puestos", icon: "🗺️", roles: ["admin", "jefe", "empleado"] },  
  { path: "/mis-reservas", label: "Mis Reservas", icon: "📋", roles: ["admin", "jefe", "empleado"] },  
    
  // Sección Admin  
  { path: "/areas", label: "Gestión de Áreas", icon: "📍", roles: ["admin"] },
  { path: "/puestos", label: "Gestión de Puestos", icon: "🪑", roles: ["admin"] },   
  { path: "/admin/usuarios", label: "Lista de Reservas", icon: "📋", roles: ["admin"] },  
  { path: "/admin/asignaciones", label: "Re-asignar Puestos", icon: "🔄", roles: ["admin", "jefe"] },  
  { path: "/admin/parametros", label: "Parametrización", icon: "⚙️", roles: ["admin"] },  
];  
    
export default function Sidebar({ isOpen, onClose }) {    
  const location = useLocation();    
    
  // Obtener datos del usuario desde localStorage  
  const username = localStorage.getItem("username") || "Usuario";  
  const userRole = localStorage.getItem("userRole") || "empleado";  
    

  const roleConfig = {  
    admin: { label: "Administrador", color: "text-blue-600", bgColor: "bg-blue-50" },  
    jefe: { label: "Jefe", color: "text-indigo-600", bgColor: "bg-indigo-50" },  
    empleado: { label: "Empleado", color: "text-gray-600", bgColor: "bg-gray-50" }  
  };  
    
  const currentRole = roleConfig[userRole] || roleConfig.empleado;  
    
  return (    
    <>    
      {/* Overlay para mobile */}    
      <AnimatePresence>    
        {isOpen && (    
          <motion.div    
            initial={{ opacity: 0 }}    
            animate={{ opacity: 1 }}    
            exit={{ opacity: 0 }}    
            transition={{ duration: 0.2 }}    
            className="fixed inset-0 bg-black/30 z-40 lg:hidden"    
            onClick={onClose}    
          />    
        )}    
      </AnimatePresence>    
    
      {/* Sidebar - VISIBLE en desktop, oculto en mobile */}    
      <aside    
        className={`    
          fixed lg:static inset-y-0 left-0 z-50    
          w-64 bg-white border-r border-gray-200 shadow-lg    
          transform transition-transform duration-300 ease-in-out    
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}    
        `}    
      >    
        <div className="p-6 h-full flex flex-col">    
          {/* Logo */}    
          <motion.div    
            initial={{ scale: 0.9, opacity: 0 }}    
            animate={{ scale: 1, opacity: 1 }}    
            transition={{ delay: 0.1 }}    
            className="mb-6"    
          >    
            <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">    
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center font-bold text-white shadow-md">    
                ABC    
              </div>    
              <div>    
                <h2 className="text-lg font-bold text-gray-900">ABC Corp</h2>    
                <p className="text-xs text-gray-600">Desk Booking</p>    
              </div>    
            </div>    
          </motion.div>    
              
          {/* Navigation */}    
          <nav className="space-y-2 flex-1">    
            {menuItems.map((item, index) => {    
              const isActive = location.pathname === item.path;    
              return (    
                <motion.div    
                  key={item.path}    
                  initial={{ x: -20, opacity: 0 }}    
                  animate={{ x: 0, opacity: 1 }}    
                  transition={{ delay: 0.1 * (index + 1) }}    
                >    
                  <Link    
                    to={item.path}    
                    onClick={onClose}    
                    className="block"    
                  >    
                    <motion.div    
                      whileHover={{ x: 4, scale: 1.02 }}    
                      whileTap={{ scale: 0.98 }}    
                      className={`    
                        flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200    
                        ${isActive     
                          ? "bg-blue-600 text-white shadow-md"     
                          : "text-gray-700 hover:bg-gray-100"    
                        }    
                      `}    
                    >    
                      <span className="text-2xl">{item.icon}</span>    
                      <span className="font-medium">{item.label}</span>    
                      {isActive && (    
                        <motion.div    
                          layoutId="activeIndicator"    
                          className="ml-auto w-2 h-2 rounded-full bg-white"    
                        />    
                      )}    
                    </motion.div>    
                  </Link>    
                </motion.div>    
              );    
            })}    
          </nav>    
    
          {/* NUEVO: Perfil de usuario - Abajo del sidebar */}  
          <motion.div  
            initial={{ y: 20, opacity: 0 }}  
            animate={{ y: 0, opacity: 1 }}  
            transition={{ delay: 0.5 }}  
            className="mt-auto"  
          >  
            {/* Separador visual */}  
            <div className="border-t border-gray-200 mb-4" />  
              
            {/* Card de perfil */}  
            <motion.div  
              whileHover={{ scale: 1.02 }}  
              className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-blue-50 border border-gray-200 shadow-sm"  
            >  
              <div className="flex items-center gap-3">  
                {/* Avatar con icono de usuario */}  
                <div className="relative">  
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-md">  
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">  
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />  
                    </svg>  
                  </div>  
                  {/* Indicador de estado online */}  
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />  
                </div>  
                  
                {/* Info del usuario */}  
                <div className="flex-1 min-w-0">  
                  <p className="text-sm font-semibold text-gray-900 truncate">  
                    {username}  
                  </p>  
                  <div className="flex items-center gap-1 mt-0.5">  
                    <span className={`text-xs px-2 py-0.5 rounded-full ${currentRole.bgColor} ${currentRole.color} font-medium`}>  
                      {currentRole.label}  
                    </span>  
                  </div>  
                </div>  
              </div>  
            </motion.div>  
  
            {/* Footer info */}  
            <div className="text-xs text-gray-500 text-center mt-4">  
              <p className="font-medium text-gray-700">Sistema v1.0</p>  
              <p className="mt-1">© 2026 ABC Corporation</p>  
            </div>  
          </motion.div>  
        </div>    
      </aside>    
    </>    
  );    
}