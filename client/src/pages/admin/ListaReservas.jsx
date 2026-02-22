import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";
let puestosCatalogoCache = null;

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

  const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const compact = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;

  const latam = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (latam) return `${latam[3]}-${latam[2]}-${latam[1]}`;

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

function getPuestoLabel(row) {
  return String(pick(row, ["NoPuesto", "NumeroPuesto", "Puesto"], "Sin número"));
}

function getPuestoKey(row) {
  const id = getPuestoId(row);
  if (id) return `id:${id}`;
  return `np:${getPuestoLabel(row)}`;
}

function getAreaLabel(row) {
  return String(pick(row, ["NombreArea", "Area"], "Sin área"));
}

function getPisoLabel(row) {
  return String(pick(row, ["NumeroPiso", "IdPiso", "IDPiso"], "Sin piso"));
}

function esNombreValido(nombre, row) {
  const texto = String(nombre || "").trim();
  if (!texto || texto.length < 3) return false;

  const area = getAreaLabel(row);
  const soloNumeros = /^\d+$/.test(texto);
  const valorTecnico = /^(si|no|activa|cancelada|null|undefined)$/i.test(texto);
  const esArea = area && texto.toLowerCase() === String(area).trim().toLowerCase();
  const pareceCargoGenerico = /^(operativo|area|piso|puesto)$/i.test(texto);

  return !soloNumeros && !valorTecnico && !esArea && !pareceCargoGenerico;
}

function getUsuarioLabel(row, nombresPorEmpleado = null) {
  const camposPrioritarios = [
    "NombreEmpleado",
    "NombreCompleto",
    "NomEmpleado",
    "Nombre",
    "UsuarioNombre",
    "Nombres",
    "ApellidosNombres",
    "NomUsu",
    "UserName",
    "LoginEmpleado",
    "Login",
    "Usr",
    "Empleado",
    "Usuario",
  ];

  for (const key of camposPrioritarios) {
    const value = pick(row, [key], "");
    if (esNombreValido(value, row)) return String(value).trim();
  }

  const idEmpleado = Number(pick(row, ["IdEmpleado", "IDEmpleado", "idEmpleado"], ""));
  if (Number.isFinite(idEmpleado) && idEmpleado > 0 && nombresPorEmpleado?.has(idEmpleado)) {
    return nombresPorEmpleado.get(idEmpleado);
  }

  const candidatoDinamico = Object.entries(row || {}).find(([key, value]) => {
    if (!value || typeof value !== "string") return false;
    const k = String(key || "").toLowerCase();
    const v = value.trim();
    if (!/(nom|emple|usu|user|login)/i.test(k)) return false;
    if (/(id|codigo|cod|area|piso|puesto)/i.test(k)) return false;
    return esNombreValido(v, row);
  });

  if (candidatoDinamico) return String(candidatoDinamico[1]).trim();
  return "Sin nombre";
}

function mergePreferCurrent(current, fallback) {
  const output = { ...(fallback || {}), ...(current || {}) };
  ["NoPuesto", "NombreArea", "NumeroPiso", "IdPiso", "IdAreaPiso"].forEach((key) => {
    const cur = current?.[key];
    if (cur === undefined || cur === null || String(cur).trim() === "") {
      if (fallback?.[key] !== undefined) output[key] = fallback[key];
    }
  });
  return output;
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\n") || text.includes('"')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadCsv(filename, rows) {
  if (!rows.length) return;
  const content = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function construirCatalogoPuestosRapido(token) {
  if (puestosCatalogoCache) return puestosCatalogoCache;

  const resPisos = await fetch(`${API}/api/pisos`);
  const pisos = resPisos.ok ? await resPisos.json() : [];
  const listaPisos = Array.isArray(pisos) ? pisos : [];

  const mapaPisos = new Map();
  listaPisos.forEach((p) => mapaPisos.set(Number(p.IDPiso), p));

  const areasPorPiso = await Promise.all(
    listaPisos.map(async (piso) => {
      const idPiso = Number(piso.IDPiso);
      if (!idPiso) return [];
      const resAreas = await fetch(`${API}/api/areas/piso/${idPiso}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resAreas.ok) return [];
      const areas = await resAreas.json();
      return (Array.isArray(areas) ? areas : [])
        .filter((a) => a?.IdAreaPiso)
        .map((a) => ({ ...a, __idPiso: idPiso }));
    }),
  );

  const areasFlat = areasPorPiso.flat();
  const puestosPorArea = await Promise.all(
    areasFlat.map(async (area) => {
      const resPuestos = await fetch(`${API}/api/puestos/area/${area.IdAreaPiso}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resPuestos.ok) return [];

      const puestos = await resPuestos.json();
      const listaPuestos = Array.isArray(puestos) ? puestos : [];
      return listaPuestos.map((puesto) => {
        const idPuesto = Number(puesto?.IdPuestoTrabajo);
        if (!idPuesto) return null;
        const pisoCatalogo = mapaPisos.get(Number(area.__idPiso));
        return {
          IdPuestoTrabajo: idPuesto,
          NoPuesto: puesto?.NoPuesto ?? puesto?.NumeroPuesto ?? null,
          NombreArea: area?.NombreArea ?? null,
          IdAreaPiso: area?.IdAreaPiso ?? null,
          IdPiso: Number(area.__idPiso),
          NumeroPiso: pisoCatalogo?.NumeroPiso ?? Number(area.__idPiso),
        };
      });
    }),
  );

  const mapaPuestos = new Map();
  puestosPorArea.flat().filter(Boolean).forEach((p) => mapaPuestos.set(Number(p.IdPuestoTrabajo), p));
  puestosCatalogoCache = mapaPuestos;
  return mapaPuestos;
}

export default function ListaReservas() {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enriqueciendo, setEnriqueciendo] = useState(false);
  const [error, setError] = useState("");
  const [filtroArea, setFiltroArea] = useState("TODAS");
  const [filtroPiso, setFiltroPiso] = useState("TODOS");
  const [fechaSeleccionada, setFechaSeleccionada] = useState(getTodayKey());
  const [historialModal, setHistorialModal] = useState({ open: false, puestoKey: "" });

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      setError("");

      try {
        const token = localStorage.getItem("token");
        const resReservas = await fetch(`${API}/api/reservas/todas`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resReservas.ok) throw new Error(`HTTP ${resReservas.status}`);

        const data = await resReservas.json();
        const reservasBase = Array.isArray(data) ? data : [];

        setReservas(reservasBase);
        setLoading(false);

        const necesitaEnriquecer = reservasBase.some((r) => {
          const faltaPuesto = String(pick(r, ["NoPuesto", "NumeroPuesto", "Puesto"], "")).trim() === "";
          const faltaArea = String(pick(r, ["NombreArea", "Area"], "")).trim() === "";
          const faltaPiso = String(pick(r, ["NumeroPiso", "IdPiso", "IDPiso"], "")).trim() === "";
          return (faltaPuesto || faltaArea || faltaPiso) && getPuestoId(r);
        });
        if (!necesitaEnriquecer) return;

        setEnriqueciendo(true);
        const mapaPuestos = await construirCatalogoPuestosRapido(token);
        setReservas(reservasBase.map((r) => mergePreferCurrent(r, mapaPuestos.get(getPuestoId(r)))));
      } catch (e) {
        setError(e.message || "Error cargando reservas");
      } finally {
        setLoading(false);
        setEnriqueciendo(false);
      }
    };

    cargar();
  }, []);

  const nombresPorEmpleado = useMemo(() => {
    const mapa = new Map();
    reservas.forEach((r) => {
      const idEmpleado = Number(pick(r, ["IdEmpleado", "IDEmpleado", "idEmpleado"], ""));
      if (!Number.isFinite(idEmpleado) || idEmpleado <= 0) return;
      const nombreDetectado = getUsuarioLabel(r);
      if (nombreDetectado && nombreDetectado !== "Sin nombre" && !mapa.has(idEmpleado)) mapa.set(idEmpleado, nombreDetectado);
    });
    return mapa;
  }, [reservas]);

  const areasDisponibles = useMemo(() => {
    return Array.from(new Set(reservas.map((r) => getAreaLabel(r)))).sort((a, b) => a.localeCompare(b));
  }, [reservas]);

  const pisosDisponibles = useMemo(() => {
    return Array.from(new Set(reservas.map((r) => getPisoLabel(r)))).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true }),
    );
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
      .sort((a, b) => getUsuarioLabel(a, nombresPorEmpleado).localeCompare(getUsuarioLabel(b, nombresPorEmpleado)));
  }, [reservasFiltradas, fechaSeleccionada, nombresPorEmpleado]);

  const historialByPuesto = useMemo(() => {
    const map = new Map();
    reservasFiltradas.forEach((r) => {
      const key = getPuestoKey(r);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    });

    map.forEach((rows, key) => {
      rows.sort((a, b) => {
        const da = toDateKey(pick(a, ["FechaReserva", "fechaReserva"], "")) || "";
        const db = toDateKey(pick(b, ["FechaReserva", "fechaReserva"], "")) || "";
        return db.localeCompare(da);
      });
      map.set(key, rows);
    });

    return map;
  }, [reservasFiltradas]);

  const puestosDisponibles = useMemo(() => {
    return Array.from(historialByPuesto.entries())
      .map(([key, rows]) => {
        const row = rows[0] || {};
        return {
          key,
          label: `Puesto ${getPuestoLabel(row)} (ID ${pick(row, ["IdPuestoTrabajo", "IDPuestoTrabajo", "idPuestoTrabajo"], "N/D")})`,
          cantidad: rows.length,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [historialByPuesto]);

  const historialPuestoModal = historialByPuesto.get(historialModal.puestoKey) || [];
  const totalActivasFecha = reservasPorFecha.filter((r) => getEstadoLabel(r) === "Activa").length;

  const abrirHistorial = (puestoKey) => setHistorialModal({ open: true, puestoKey });
  const cerrarHistorial = () => setHistorialModal({ open: false, puestoKey: "" });

  const exportarReservasFecha = () => {
    if (!reservasPorFecha.length) return;
    downloadCsv(`reservas_${fechaSeleccionada}.csv`, [
      ["Fecha", "Usuario", "Puesto", "Área", "Piso", "Estado"],
      ...reservasPorFecha.map((r) => [
        formatDate(pick(r, ["FechaReserva", "fechaReserva"])),
        getUsuarioLabel(r, nombresPorEmpleado),
        `#${getPuestoLabel(r)}`,
        getAreaLabel(r),
        getPisoLabel(r),
        getEstadoLabel(r),
      ]),
    ]);
  };

  const exportarHistorialPuesto = () => {
    if (!historialPuestoModal.length) return;
    downloadCsv(`historial_puesto_${historialModal.puestoKey.replace(/[:#]/g, "_")}.csv`, [
      ["Fecha", "Usuario", "Puesto", "Área", "Piso", "Estado"],
      ...historialPuestoModal.map((r) => [
        formatDate(pick(r, ["FechaReserva", "fechaReserva"])),
        getUsuarioLabel(r, nombresPorEmpleado),
        `#${getPuestoLabel(r)}`,
        getAreaLabel(r),
        getPisoLabel(r),
        getEstadoLabel(r),
      ]),
    ]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900">📊 Centro de Reservas Corporativo</h1>
              <p className="text-sm text-slate-600 mt-1">
                Panel ejecutivo para seguimiento de reservas y trazabilidad por puesto.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-inner">
              <button onClick={() => setFechaSeleccionada((prev) => moveDate(prev, -1))} className="px-2 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100">◀</button>
              <input type="date" value={fechaSeleccionada} onChange={(e) => setFechaSeleccionada(e.target.value)} className="px-2 py-1 rounded-md border border-slate-300 bg-white text-slate-800" />
              <button onClick={() => setFechaSeleccionada((prev) => moveDate(prev, 1))} className="px-2 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100">▶</button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              ["Hoy", getTodayKey()],
              ["Ayer", moveDate(getTodayKey(), -1)],
              ["Mañana", moveDate(getTodayKey(), 1)],
            ].map(([label, value]) => (
              <button key={label} onClick={() => setFechaSeleccionada(value)} className={`px-3 py-1.5 text-xs rounded-full border ${fechaSeleccionada === value ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-700 border-slate-200"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading && <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-md text-slate-600">Cargando reservas...</div>}
        {error && <div className="bg-red-50 text-red-700 rounded-2xl border border-red-200 p-6 shadow-md">{error}</div>}

        {!loading && !error && (
          <>
            {enriqueciendo && <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">Afinando datos de piso/área/puesto...</div>}

            <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-5 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50">
                  <p className="text-xs uppercase tracking-wider text-slate-500">Reservas en fecha</p><p className="text-3xl font-black text-slate-900">{reservasPorFecha.length}</p>
                </div>
                <div className="p-5 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
                  <p className="text-xs uppercase tracking-wider text-emerald-700">Activas en fecha</p><p className="text-3xl font-black text-emerald-800">{totalActivasFecha}</p>
                </div>
                <div className="p-5 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
                  <p className="text-xs uppercase tracking-wider text-indigo-700">Total filtrado</p><p className="text-3xl font-black text-indigo-800">{reservasFiltradas.length}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Filtrar por Área</label>
                  <select value={filtroArea} onChange={(e) => setFiltroArea(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800">
                    <option value="TODAS">Todas las áreas</option>{areasDisponibles.map((area) => <option key={area} value={area}>{area}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Filtrar por Piso</label>
                  <select value={filtroPiso} onChange={(e) => setFiltroPiso(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800">
                    <option value="TODOS">Todos los pisos</option>{pisosDisponibles.map((piso) => <option key={piso} value={piso}>Piso {piso}</option>)}
                  </select>
                </div>
              </div>
            </motion.section>

            <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-lg">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">🗓️ Reservas por fecha</h2>
                  <p className="text-sm text-slate-500">Fecha seleccionada: {formatDate(fechaSeleccionada)}</p>
                </div>
                <button onClick={exportarReservasFecha} disabled={!reservasPorFecha.length} className="px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm disabled:opacity-50">⬇️ Descargar CSV</button>
              </div>

              {reservasPorFecha.length === 0 ? (
                <p className="text-slate-500">No hay reservas para esta fecha con los filtros seleccionados.</p>
              ) : (
                <div className="overflow-auto rounded-xl border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr className="text-left text-slate-700">
                        <th className="py-3 px-4">Usuario</th><th className="py-3 px-4">Puesto</th><th className="py-3 px-4">Área</th><th className="py-3 px-4">Piso</th><th className="py-3 px-4">Estado</th><th className="py-3 px-4">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reservasPorFecha.map((r, idx) => {
                        const estado = getEstadoLabel(r);
                        const puestoKey = getPuestoKey(r);
                        return (
                          <tr key={`${pick(r, ["IdEmpleadoPuestoTrabajo", "id"], idx)}`} className="border-t border-slate-100">
                            <td className="py-3 px-4 text-slate-800 font-medium">{getUsuarioLabel(r, nombresPorEmpleado)}</td>
                            <td className="py-3 px-4">#{getPuestoLabel(r)}</td>
                            <td className="py-3 px-4">{getAreaLabel(r)}</td>
                            <td className="py-3 px-4">{getPisoLabel(r)}</td>
                            <td className="py-3 px-4"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${estado === "Activa" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{estado}</span></td>
                            <td className="py-3 px-4"><button onClick={() => abrirHistorial(puestoKey)} className="px-2.5 py-1.5 text-xs rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Ver historial</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.section>

            <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900">🧾 Explorador de Historial por Puesto</h2>
                <span className="text-sm text-slate-500">{puestosDisponibles.length} puestos con registros</span>
              </div>
              {puestosDisponibles.length === 0 ? (
                <p className="text-slate-500">No hay puestos con historial en los filtros actuales.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {puestosDisponibles.map((p) => (
                    <button key={p.key} onClick={() => abrirHistorial(p.key)} className="text-left p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition">
                      <p className="font-semibold text-slate-900">{p.label}</p>
                      <p className="text-xs text-slate-500 mt-1">{p.cantidad} registro(s)</p>
                    </button>
                  ))}
                </div>
              )}
            </motion.section>
          </>
        )}
      </div>

      <AnimatePresence>
        {historialModal.open && (
          <motion.div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={cerrarHistorial} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-slate-200 shadow-2xl" onClick={(e) => e.stopPropagation()} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}>
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Historial completo del puesto</h3>
                  <p className="text-sm text-slate-500">{puestosDisponibles.find((x) => x.key === historialModal.puestoKey)?.label || "Puesto"}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={exportarHistorialPuesto} disabled={!historialPuestoModal.length} className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-50">⬇️ CSV</button>
                  <button onClick={cerrarHistorial} className="px-3 py-2 text-sm rounded-lg bg-slate-900 text-white hover:bg-slate-800">Cerrar</button>
                </div>
              </div>
              <div className="p-6 overflow-auto max-h-[70vh]">
                {!historialPuestoModal.length ? (
                  <p className="text-slate-500">Sin registros de historial para este puesto.</p>
                ) : (
                  <div className="overflow-auto rounded-xl border border-slate-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr className="text-left text-slate-700">
                          <th className="py-3 px-4">Fecha</th><th className="py-3 px-4">Usuario</th><th className="py-3 px-4">Área</th><th className="py-3 px-4">Piso</th><th className="py-3 px-4">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historialPuestoModal.map((r, idx) => {
                          const estado = getEstadoLabel(r);
                          return (
                            <tr key={`hist-${idx}-${pick(r,["IdEmpleadoPuestoTrabajo","id"],idx)}`} className="border-t border-slate-100">
                              <td className="py-3 px-4">{formatDate(pick(r, ["FechaReserva", "fechaReserva"]))}</td>
                              <td className="py-3 px-4 font-medium">{getUsuarioLabel(r, nombresPorEmpleado)}</td>
                              <td className="py-3 px-4">{getAreaLabel(r)}</td>
                              <td className="py-3 px-4">{getPisoLabel(r)}</td>
                              <td className="py-3 px-4"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${estado === "Activa" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{estado}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
