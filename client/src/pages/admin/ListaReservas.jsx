import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

function pick(row, keys, fallback = "-") {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return fallback;
}

function toDateKey(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const parsed = new Date(raw.includes("T") ? raw : `${raw}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;

  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDate(value) {
  const key = toDateKey(value);
  if (!key) return "-";
  const [y, m, d] = key.split("-");
  return `${d}/${m}/${y}`;
}

function getPuestoKey(row) {
  const id = Number(pick(row, ["IdPuestoTrabajo", "IDPuestoTrabajo", "idPuestoTrabajo"], ""));
  if (Number.isFinite(id) && id > 0) return `id:${id}`;

  const noPuesto = pick(row, ["NoPuesto", "NumeroPuesto", "Puesto"], "");
  if (noPuesto !== "") return `np:${String(noPuesto)}`;

  return "Sin puesto";
}

export default function ListaReservas() {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [puestoSeleccionado, setPuestoSeleccionado] = useState("");

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API}/api/reservas/todas`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        setReservas(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e.message || "Error cargando reservas");
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, []);

  const hoy = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const reservasDelDia = useMemo(() => {
    return reservas
      .filter((r) => toDateKey(pick(r, ["FechaReserva", "fechaReserva"], "")) === hoy)
      .sort((a, b) => String(pick(a, ["NombreEmpleado", "Empleado", "Usuario"], "")).localeCompare(String(pick(b, ["NombreEmpleado", "Empleado", "Usuario"], ""))));
  }, [reservas, hoy]);

  const puestosDisponibles = useMemo(() => {
    const map = new Map();

    reservas.forEach((r) => {
      const key = getPuestoKey(r);
      const labelNoPuesto = pick(r, ["NoPuesto", "NumeroPuesto", "Puesto"], "Sin número");
      const idPuesto = pick(r, ["IdPuestoTrabajo", "IDPuestoTrabajo", "idPuestoTrabajo"], "N/D");
      if (!map.has(key)) {
        map.set(key, { key, label: `Puesto ${labelNoPuesto} (ID ${idPuesto})` });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [reservas]);

  const historialPuesto = useMemo(() => {
    if (!puestoSeleccionado) return [];

    return reservas
      .filter((r) => getPuestoKey(r) === puestoSeleccionado)
      .sort((a, b) => {
        const da = toDateKey(pick(a, ["FechaReserva", "fechaReserva"], "")) || "";
        const db = toDateKey(pick(b, ["FechaReserva", "fechaReserva"], "")) || "";
        return db.localeCompare(da);
      });
  }, [reservas, puestoSeleccionado]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900">📋 Lista de Reservas</h1>
          <p className="text-sm text-gray-600 mt-1">
            Reservas del día con el usuario que la hizo + historial por puesto.
          </p>
        </div>

        {loading && <div className="bg-white rounded-xl border border-gray-200 p-6">Cargando reservas...</div>}
        {error && <div className="bg-red-50 text-red-700 rounded-xl border border-red-200 p-6">{error}</div>}

        {!loading && !error && (
          <>
            <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Reservas de hoy ({formatDate(hoy)})</h2>
              {reservasDelDia.length === 0 ? (
                <p className="text-gray-500">No hay reservas registradas para hoy.</p>
              ) : (
                <div className="overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2 pr-4">Usuario</th>
                        <th className="py-2 pr-4">Puesto</th>
                        <th className="py-2 pr-4">Área</th>
                        <th className="py-2 pr-4">Piso</th>
                        <th className="py-2 pr-4">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reservasDelDia.map((r, idx) => (
                        <tr key={`${pick(r, ["IdEmpleadoPuestoTrabajo", "id"], idx)}`} className="border-b last:border-b-0">
                          <td className="py-2 pr-4">{pick(r, ["NombreEmpleado", "Empleado", "Usuario", "LoginEmpleado"])}</td>
                          <td className="py-2 pr-4">#{pick(r, ["NoPuesto", "NumeroPuesto", "Puesto"])}</td>
                          <td className="py-2 pr-4">{pick(r, ["NombreArea", "Area"])}</td>
                          <td className="py-2 pr-4">{pick(r, ["NumeroPiso", "IdPiso", "IDPiso"])}</td>
                          <td className="py-2 pr-4">{String(pick(r, ["ReservaActiva"], "1")) === "1" ? "Activa" : "Cancelada"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.section>

            <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Historial por puesto</h2>
                <select
                  value={puestoSeleccionado}
                  onChange={(e) => setPuestoSeleccionado(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Selecciona un puesto</option>
                  {puestosDisponibles.map((p) => (
                    <option key={p.key} value={p.key}>{p.label}</option>
                  ))}
                </select>
              </div>

              {!puestoSeleccionado ? (
                <p className="text-gray-500">Selecciona un puesto para ver su historial.</p>
              ) : historialPuesto.length === 0 ? (
                <p className="text-gray-500">No hay historial para este puesto.</p>
              ) : (
                <div className="overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2 pr-4">Fecha</th>
                        <th className="py-2 pr-4">Usuario</th>
                        <th className="py-2 pr-4">Área</th>
                        <th className="py-2 pr-4">Piso</th>
                        <th className="py-2 pr-4">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historialPuesto.map((r, idx) => (
                        <tr key={`hist-${pick(r, ["IdEmpleadoPuestoTrabajo", "id"], idx)}`} className="border-b last:border-b-0">
                          <td className="py-2 pr-4">{formatDate(pick(r, ["FechaReserva", "fechaReserva"]))}</td>
                          <td className="py-2 pr-4">{pick(r, ["NombreEmpleado", "Empleado", "Usuario", "LoginEmpleado"])}</td>
                          <td className="py-2 pr-4">{pick(r, ["NombreArea", "Area"])}</td>
                          <td className="py-2 pr-4">{pick(r, ["NumeroPiso", "IdPiso", "IDPiso"])}</td>
                          <td className="py-2 pr-4">{String(pick(r, ["ReservaActiva"], "1")) === "1" ? "Activa" : "Cancelada"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.section>
          </>
        )}
      </div>
    </div>
  );
}
