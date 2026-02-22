import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

function pick(row, keys, fallback = "") {
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

function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function moveDate(dateKey, deltaDays) {
  const base = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(base.getTime())) return dateKey;
  base.setDate(base.getDate() + deltaDays);
  return toDateKey(base.toISOString()) || dateKey;
}

function getEstadoLabel(row) {
  return String(pick(row, ["ReservaActiva"], "1")) === "1" ? "Activa" : "Cancelada";
}

function getPuestoId(row) {
  const id = Number(pick(row, ["IdPuestoTrabajo", "IDPuestoTrabajo", "idPuestoTrabajo"], ""));
  return Number.isFinite(id) && id > 0 ? id : null;
}

function getPuestoKey(row) {
  const id = getPuestoId(row);
  if (id) return `id:${id}`;

  const noPuesto = pick(row, ["NoPuesto", "NumeroPuesto", "Puesto"], "");
  if (noPuesto !== "") return `np:${String(noPuesto)}`;

  return "Sin puesto";
}

function getAreaLabel(row) {
  return String(pick(row, ["NombreArea", "Area"], "Sin área"));
}

function getPisoLabel(row) {
  return String(pick(row, ["NumeroPiso", "IdPiso", "IDPiso"], "Sin piso"));
}

function getPuestoLabel(row) {
  return String(pick(row, ["NoPuesto", "NumeroPuesto", "Puesto"], "Sin número"));
}

function getUsuarioLabel(row) {
  const nombre = pick(
    row,
    [
      "NombreEmpleado",
      "NomEmpleado",
      "Empleado",
      "Nombre",
      "Usuario",
      "UserName",
      "LoginEmpleado",
      "Login",
      "Usr",
    ],
    "",
  );

  if (nombre) return String(nombre);

  const idEmpleado = pick(row, ["IdEmpleado", "IDEmpleado", "idEmpleado"], "");
  if (idEmpleado !== "") return `Empleado #${idEmpleado}`;

  return "Sin usuario";
}

function mergePreferCurrent(current, fallback) {
  const output = { ...(fallback || {}), ...(current || {}) };

  // Si current trae vacío para campos clave, conservar fallback enriquecido.
  ["NoPuesto", "NombreArea", "NumeroPiso", "IdPiso", "IdAreaPiso"].forEach((key) => {
    const cur = current?.[key];
    if (cur === undefined || cur === null || String(cur).trim() === "") {
      if (fallback?.[key] !== undefined) output[key] = fallback[key];
    }
  });

  return output;
}

async function construirCatalogoPuestos(token) {
  const resPisos = await fetch(`${API}/api/pisos`);
  const pisos = resPisos.ok ? await resPisos.json() : [];
  const listaPisos = Array.isArray(pisos) ? pisos : [];

  const mapaPisos = new Map();
  listaPisos.forEach((p) => {
    mapaPisos.set(Number(p.IDPiso), p);
  });

  const mapaPuestos = new Map();

  for (const piso of listaPisos) {
    const idPiso = Number(piso.IDPiso);
    if (!idPiso) continue;

    const resAreas = await fetch(`${API}/api/areas/piso/${idPiso}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resAreas.ok) continue;

    const areas = await resAreas.json();
    const listaAreas = Array.isArray(areas) ? areas : [];

    for (const area of listaAreas) {
      if (!area?.IdAreaPiso) continue;

      const resPuestos = await fetch(`${API}/api/puestos/area/${area.IdAreaPiso}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resPuestos.ok) continue;

      const puestos = await resPuestos.json();
      const listaPuestos = Array.isArray(puestos) ? puestos : [];

      listaPuestos.forEach((puesto) => {
        const idPuesto = Number(puesto?.IdPuestoTrabajo);
        if (!idPuesto) return;

        const pisoCatalogo = mapaPisos.get(idPiso);

        mapaPuestos.set(idPuesto, {
          IdPuestoTrabajo: idPuesto,
          NoPuesto: puesto?.NoPuesto ?? puesto?.NumeroPuesto ?? null,
          NombreArea: area?.NombreArea ?? null,
          IdAreaPiso: area?.IdAreaPiso ?? null,
          IdPiso: idPiso,
          NumeroPiso: pisoCatalogo?.NumeroPiso ?? idPiso,
        });
      });
    }
  }

  return mapaPuestos;
}

export default function ListaReservas() {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [puestoSeleccionado, setPuestoSeleccionado] = useState("");
  const [filtroArea, setFiltroArea] = useState("TODAS");
  const [filtroPiso, setFiltroPiso] = useState("TODOS");
  const [fechaSeleccionada, setFechaSeleccionada] = useState(getTodayKey());

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token");

        const [resReservas, mapaPuestos] = await Promise.all([
          fetch(`${API}/api/reservas/todas`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          construirCatalogoPuestos(token),
        ]);

        if (!resReservas.ok) {
          throw new Error(`HTTP ${resReservas.status}`);
        }

        const data = await resReservas.json();
        const reservasBase = Array.isArray(data) ? data : [];

        const enriquecidas = reservasBase.map((r) => {
          const idPuesto = getPuestoId(r);
          const catalogo = idPuesto ? mapaPuestos.get(idPuesto) : null;
          return mergePreferCurrent(r, catalogo);
        });

        setReservas(enriquecidas);
      } catch (e) {
        setError(e.message || "Error cargando reservas");
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, []);

  const areasDisponibles = useMemo(() => {
    const values = new Set(reservas.map((r) => getAreaLabel(r)));
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [reservas]);

  const pisosDisponibles = useMemo(() => {
    const values = new Set(reservas.map((r) => getPisoLabel(r)));
    return Array.from(values).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [reservas]);

  const reservasFiltradas = useMemo(() => {
    return reservas.filter((r) => {
      const areaOk = filtroArea === "TODAS" || getAreaLabel(r) === filtroArea;
      const pisoOk = filtroPiso === "TODOS" || getPisoLabel(r) === filtroPiso;
      return areaOk && pisoOk;
    });
  }, [reservas, filtroArea, filtroPiso]);

  const reservasPorFecha = useMemo(() => {
    return reservasFiltradas
      .filter((r) => toDateKey(pick(r, ["FechaReserva", "fechaReserva"], "")) === fechaSeleccionada)
      .sort((a, b) => getUsuarioLabel(a).localeCompare(getUsuarioLabel(b)));
  }, [reservasFiltradas, fechaSeleccionada]);

  const puestosDisponibles = useMemo(() => {
    const map = new Map();

    reservasFiltradas.forEach((r) => {
      const key = getPuestoKey(r);
      const labelNoPuesto = getPuestoLabel(r);
      const idPuesto = pick(r, ["IdPuestoTrabajo", "IDPuestoTrabajo", "idPuestoTrabajo"], "N/D");
      if (!map.has(key)) {
        map.set(key, { key, label: `Puesto ${labelNoPuesto} (ID ${idPuesto})` });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [reservasFiltradas]);

  useEffect(() => {
    if (!puestoSeleccionado) return;
    const stillExists = puestosDisponibles.some((p) => p.key === puestoSeleccionado);
    if (!stillExists) setPuestoSeleccionado("");
  }, [puestoSeleccionado, puestosDisponibles]);

  const historialPuesto = useMemo(() => {
    if (!puestoSeleccionado) return [];

    return reservasFiltradas
      .filter((r) => getPuestoKey(r) === puestoSeleccionado)
      .sort((a, b) => {
        const da = toDateKey(pick(a, ["FechaReserva", "fechaReserva"], "")) || "";
        const db = toDateKey(pick(b, ["FechaReserva", "fechaReserva"], "")) || "";
        return db.localeCompare(da);
      });
  }, [reservasFiltradas, puestoSeleccionado]);

  const totalActivasFecha = reservasPorFecha.filter((r) => getEstadoLabel(r) === "Activa").length;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">📋 Centro de Reservas</h1>
              <p className="text-sm text-slate-600 mt-1">
                Control por piso &gt; área &gt; puesto, con calendario operativo y trazabilidad de usuario.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <button
                onClick={() => setFechaSeleccionada((prev) => moveDate(prev, -1))}
                className="px-2 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-700"
              >
                ◀
              </button>
              <input
                type="date"
                value={fechaSeleccionada}
                onChange={(e) => setFechaSeleccionada(e.target.value)}
                className="px-2 py-1 rounded-md border border-slate-300 bg-white text-slate-800"
              />
              <button
                onClick={() => setFechaSeleccionada((prev) => moveDate(prev, 1))}
                className="px-2 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-700"
              >
                ▶
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm text-slate-600">
            Cargando reservas...
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-700 rounded-2xl border border-red-200 p-6 shadow-sm">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Reservas en fecha</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{reservasPorFecha.length}</p>
                </div>
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50">
                  <p className="text-xs uppercase tracking-wide text-emerald-700">Activas en fecha</p>
                  <p className="text-2xl font-bold text-emerald-800 mt-1">{totalActivasFecha}</p>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Total filtrado</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{reservasFiltradas.length}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Filtrar por Área</label>
                  <select
                    value={filtroArea}
                    onChange={(e) => setFiltroArea(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800"
                  >
                    <option value="TODAS">Todas las áreas</option>
                    {areasDisponibles.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Filtrar por Piso</label>
                  <select
                    value={filtroPiso}
                    onChange={(e) => setFiltroPiso(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800"
                  >
                    <option value="TODOS">Todos los pisos</option>
                    {pisosDisponibles.map((piso) => (
                      <option key={piso} value={piso}>
                        Piso {piso}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Reservas por fecha</h2>
              <p className="text-sm text-slate-500 mb-3">Fecha seleccionada: {formatDate(fechaSeleccionada)}</p>
              {reservasPorFecha.length === 0 ? (
                <p className="text-slate-500">No hay reservas para esta fecha con los filtros seleccionados.</p>
              ) : (
                <div className="overflow-auto rounded-xl border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-slate-700">
                        <th className="py-3 px-4">Usuario</th>
                        <th className="py-3 px-4">Puesto</th>
                        <th className="py-3 px-4">Área</th>
                        <th className="py-3 px-4">Piso</th>
                        <th className="py-3 px-4">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reservasPorFecha.map((r, idx) => {
                        const estado = getEstadoLabel(r);
                        return (
                          <tr
                            key={`${pick(r, ["IdEmpleadoPuestoTrabajo", "id"], idx)}`}
                            className="border-t border-slate-100"
                          >
                            <td className="py-3 px-4 text-slate-800">{getUsuarioLabel(r)}</td>
                            <td className="py-3 px-4 text-slate-800">#{getPuestoLabel(r)}</td>
                            <td className="py-3 px-4 text-slate-700">{getAreaLabel(r)}</td>
                            <td className="py-3 px-4 text-slate-700">{getPisoLabel(r)}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-semibold ${estado === "Activa" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                              >
                                {estado}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Historial por puesto</h2>
                <select
                  value={puestoSeleccionado}
                  onChange={(e) => setPuestoSeleccionado(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800"
                >
                  <option value="">Selecciona un puesto</option>
                  {puestosDisponibles.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              {!puestoSeleccionado ? (
                <p className="text-slate-500">Selecciona un puesto para ver su historial.</p>
              ) : historialPuesto.length === 0 ? (
                <p className="text-slate-500">No hay historial para este puesto con los filtros actuales.</p>
              ) : (
                <div className="overflow-auto rounded-xl border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-slate-700">
                        <th className="py-3 px-4">Fecha</th>
                        <th className="py-3 px-4">Usuario</th>
                        <th className="py-3 px-4">Área</th>
                        <th className="py-3 px-4">Piso</th>
                        <th className="py-3 px-4">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historialPuesto.map((r, idx) => {
                        const estado = getEstadoLabel(r);
                        return (
                          <tr
                            key={`hist-${pick(r, ["IdEmpleadoPuestoTrabajo", "id"], idx)}`}
                            className="border-t border-slate-100"
                          >
                            <td className="py-3 px-4 text-slate-800">{formatDate(pick(r, ["FechaReserva", "fechaReserva"]))}</td>
                            <td className="py-3 px-4 text-slate-800">{getUsuarioLabel(r)}</td>
                            <td className="py-3 px-4 text-slate-700">{getAreaLabel(r)}</td>
                            <td className="py-3 px-4 text-slate-700">{getPisoLabel(r)}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-semibold ${estado === "Activa" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                              >
                                {estado}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
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
