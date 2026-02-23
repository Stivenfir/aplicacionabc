import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Login from "./pages/Login";
import Dashboard from "./pages/admin/Dashboard";
import LD_Dashboard from "./pages/leader/Dashboard";
import CM_Dashboard from "./pages/custom/Dashboard";
import Mapa from "./pages/Mapa";
import Areas from "./pages/Areas";
import { isAuthed } from "./auth";
import { pageVariants, pageTransition } from "./animations/pageTransitions";
import DashboardLayout from "./layouts/DashboardLayout";
import L_DashboardLayout from "./layouts/DashboardLayoutLeader";
import C_DashboardLayout from "./layouts/DashboardLayoutCustom";
import Puestos from "./pages/Puestos";
import MisReservas from "./pages/MisReservas"; // ⬅️ Agregar import 
import ListaReservas from "./pages/admin/ListaReservas";
import ReasignacionesConstruccion from "./pages/admin/ReasignacionesConstruccion";

function PrivateRoute({ children }) {
  return isAuthed() ? children : <Navigate to="/login" replace />;
}

function RoleBasedLayout({ children }) {
  const userRole = localStorage.getItem("userRole") || "empleado";

  if (userRole === "admin") {
    return <DashboardLayout>{children}</DashboardLayout>;
  }

  if (userRole === "jefe") {
    return <L_DashboardLayout>{children}</L_DashboardLayout>;
  }

  return <C_DashboardLayout>{children}</C_DashboardLayout>;
}

function AnimatedPage({ children }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      className="min-h-screen"
    >
      {children}
    </motion.div>
  );
}

function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/login"
          element={
            <AnimatedPage>
              <Login />
            </AnimatedPage>
          }
        />

        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            </PrivateRoute>
          }
        />

        <Route
          path="/l_dashboard"
          element={
            <PrivateRoute>
              <L_DashboardLayout>
                <LD_Dashboard />
              </L_DashboardLayout>
            </PrivateRoute>
          }
        />

        <Route
          path="/c_dashboard"
          element={
            <PrivateRoute>
              <C_DashboardLayout>
                <CM_Dashboard />
              </C_DashboardLayout>
            </PrivateRoute>
          }
        />

        <Route
          path="/mapa"
          element={
            <PrivateRoute>
              <RoleBasedLayout>
                <Mapa />
              </RoleBasedLayout>
            </PrivateRoute>
          }
        />

        <Route
          path="/areas"
          element={
            <PrivateRoute>
              <AnimatedPage>
                <Areas />
              </AnimatedPage>
            </PrivateRoute>
          }
        />

        <Route
          path="/puestos"
          element={
            <PrivateRoute>
              <AnimatedPage>
                <Puestos />
              </AnimatedPage>
            </PrivateRoute>
          }
        />

        <Route
          path="/mis-reservas"
          element={
            <PrivateRoute>
              <RoleBasedLayout>
                <MisReservas />
              </RoleBasedLayout>
            </PrivateRoute>
          }
        />


        <Route
          path="/admin/asignaciones"
          element={
            <PrivateRoute>
              <DashboardLayout>
                <ReasignacionesConstruccion />
              </DashboardLayout>
            </PrivateRoute>
          }
        />

        <Route
          path="/admin/usuarios"
          element={
            <PrivateRoute>
              <DashboardLayout>
                <ListaReservas />
              </DashboardLayout>
            </PrivateRoute>
          }
        />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />

      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
