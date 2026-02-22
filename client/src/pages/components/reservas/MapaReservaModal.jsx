import { useState, useRef, useEffect } from "react";  
import { motion } from "framer-motion";  

function pickFirst(raw, keys) {
  for (const key of keys) {
    if (raw?.[key] !== undefined && raw?.[key] !== null && raw?.[key] !== "") {
      return raw[key];
    }
  }
  return null;
}

function getReservaCoords(raw) {
  const xRaw = pickFirst(raw, [
    "UbicacionX",
    "ubicacionX",
    "PosicionX",
    "posicionX",
  ]);
  const yRaw = pickFirst(raw, [
    "UbicacionY",
    "ubicacionY",
    "PosicionY",
    "posicionY",
  ]);

  const x = Number(xRaw);
  const y = Number(yRaw);
  const coordsValidas = Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0;
  const esEsquinaPorDefecto = coordsValidas && x === 0 && y === 0;
  const hasCoords = coordsValidas && !esEsquinaPorDefecto;

  return {
    hasCoords,
    x: hasCoords ? x : null,
    y: hasCoords ? y : null,
  };
}

function getReservaPuestoLabel(raw) {
  return pickFirst(raw, [
    "NoPuesto",
    "NumeroPuesto",
    "Puesto",
    "IdPuestoTrabajo",
    "IDPuestoTrabajo",
  ]);
}

function getReservaIdPuesto(raw) {
  const idRaw = pickFirst(raw, ["IdPuestoTrabajo", "IDPuestoTrabajo", "idPuestoTrabajo"]);
  const id = Number(idRaw);
  return Number.isFinite(id) ? id : null;
}

function toDisplayPoint(valueX, valueY, metrics) {
  const x = Number(valueX);
  const y = Number(valueY);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !metrics) return null;

  const coordenadasNormalizadas = x >= 0 && y >= 0 && x <= 1 && y <= 1;
  if (coordenadasNormalizadas) {
    return {
      x: x * metrics.displayWidth,
      y: y * metrics.displayHeight,
      source: "normalized",
    };
  }

  const yaEnDisplay = x >= 0 && y >= 0 && x <= metrics.displayWidth && y <= metrics.displayHeight;
  if (yaEnDisplay) {
    return { x, y, source: "display" };
  }

  const dentroNatural = x >= 0 && y >= 0 && x <= metrics.naturalWidth && y <= metrics.naturalHeight;
  if (dentroNatural && (metrics.naturalWidth !== metrics.displayWidth || metrics.naturalHeight !== metrics.displayHeight)) {
    return {
      x: (x * metrics.displayWidth) / metrics.naturalWidth,
      y: (y * metrics.displayHeight) / metrics.naturalHeight,
      source: "natural",
    };
  }

  return { x, y, source: "raw" };
}

function toDisplayRect(rect, metrics) {
  const x = Number(rect?.PosicionX);
  const y = Number(rect?.PosicionY);
  const w = Number(rect?.Ancho);
  const h = Number(rect?.Alto);
  if (![x, y, w, h].every(Number.isFinite) || !metrics) return null;

  const rectDisplay = x >= 0 && y >= 0 && x + w <= metrics.displayWidth && y + h <= metrics.displayHeight;
  if (rectDisplay) {
    return { x, y, w, h, source: "display" };
  }

  const rectNatural = x >= 0 && y >= 0 && x + w <= metrics.naturalWidth && y + h <= metrics.naturalHeight;
  if (rectNatural && (metrics.naturalWidth !== metrics.displayWidth || metrics.naturalHeight !== metrics.displayHeight)) {
    return {
      x: (x * metrics.displayWidth) / metrics.naturalWidth,
      y: (y * metrics.displayHeight) / metrics.naturalHeight,
      w: (w * metrics.displayWidth) / metrics.naturalWidth,
      h: (h * metrics.displayHeight) / metrics.naturalHeight,
      source: "natural",
    };
  }

  return { x, y, w, h, source: "raw" };
}

function syncCanvasWithImage(canvas, image) {
  if (!canvas || !image) return null;

  const naturalWidth = image.naturalWidth || image.clientWidth || image.width || 0;
  const naturalHeight = image.naturalHeight || image.clientHeight || image.height || 0;
  if (!naturalWidth || !naturalHeight) return null;

  // Usar tamaño intrínseco del plano para mantener la misma referencia
  // que se utiliza al guardar coordenadas en otros módulos.
  const displayWidth = naturalWidth;
  const displayHeight = naturalHeight;

  canvas.width = displayWidth;
  canvas.height = displayHeight;
  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;

  return { displayWidth, displayHeight, naturalWidth, naturalHeight };
}
  
export default function MapaReservaModal({  
  reserva,  
  pisoSeleccionado,  
  areaAsignada,  
  onClose  
}) {  
  const [reservaRender, setReservaRender] = useState(reserva || null);
  const [pisoEfectivo, setPisoEfectivo] = useState(pisoSeleccionado || null);
  const [planoUrl, setPlanoUrl] = useState(null);  
  const [loading, setLoading] = useState(true);  
  const [loadingUbicacion, setLoadingUbicacion] = useState(false);
  const [delimitacionesArea, setDelimitacionesArea] = useState([]);
  const canvasRef = useRef(null);  
  const imagenRef = useRef(null);  
  const API = import.meta.env.VITE_API_URL || "http://localhost:3000";  

  useEffect(() => {
    setReservaRender(reserva || null);
  }, [reserva]);

  useEffect(() => {
    setPisoEfectivo(pisoSeleccionado || null);
  }, [pisoSeleccionado]);
  
  useEffect(() => {  
    if (pisoEfectivo?.IDPiso) {  
      setLoading(true);
      cargarPlano();  
      return;
    }

    setPlanoUrl(null);
    setLoading(false);
  }, [pisoEfectivo]);  


  const areaIdObjetivo = Number(
    reservaRender?.IdArea ?? reserva?.IdArea ?? areaAsignada?.IdArea,
  );
  const areaPisoIdObjetivo = Number(
    reservaRender?.IdAreaPiso ?? reserva?.IdAreaPiso ?? areaAsignada?.IdAreaPiso,
  );

  useEffect(() => {
    const resolverUbicacionReserva = async () => {
      if (!reserva) return;

      if (!pisoEfectivo?.IDPiso) {
        return;
      }

      const idPuesto = getReservaIdPuesto(reserva);
      if (!idPuesto) return;

      const token = localStorage.getItem("token");
      if (!token) return;

      setLoadingUbicacion(true);
      try {
        const resAreas = await fetch(`${API}/api/areas/piso/${pisoEfectivo.IDPiso}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resAreas.ok) return;

        const areas = await resAreas.json();
        const areasValidas = (Array.isArray(areas) ? areas : []).filter((a) => a?.IdAreaPiso);
        if (!areasValidas.length) return;

        const respuestasPuestos = await Promise.all(
          areasValidas.map((area) =>
            fetch(`${API}/api/puestos/area/${area.IdAreaPiso}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
              .then((r) => (r.ok ? r.json() : []))
              .catch(() => []),
          ),
        );

        const puestos = respuestasPuestos.flat().filter(Boolean);
        const puesto = puestos.find((p) => Number(p?.IdPuestoTrabajo) === idPuesto);
        if (!puesto) return;

        setReservaRender((prev) => ({
          ...(prev || {}),
          ...puesto,
          NoPuesto: getReservaPuestoLabel(prev) ?? getReservaPuestoLabel(puesto),
          // Siempre priorizamos coordenadas actuales del catálogo de puestos.
          UbicacionX: puesto?.UbicacionX,
          UbicacionY: puesto?.UbicacionY,
        }));
      } finally {
        setLoadingUbicacion(false);
      }
    };

    resolverUbicacionReserva();
  }, [API, pisoEfectivo, reserva]);
  
  useEffect(() => {
    const cargarDelimitacionesArea = async () => {
      if (!pisoEfectivo?.IDPiso) {
        setDelimitacionesArea([]);
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        setDelimitacionesArea([]);
        return;
      }

      try {
        const resAreas = await fetch(`${API}/api/areas/piso/${pisoEfectivo.IDPiso}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!resAreas.ok) {
          setDelimitacionesArea([]);
          return;
        }

        const areas = await resAreas.json();
        const listado = Array.isArray(areas) ? areas : [];

        const areaEncontrada = listado.find((a) => {
          if (Number.isFinite(areaPisoIdObjetivo) && areaPisoIdObjetivo > 0) {
            return Number(a?.IdAreaPiso) === areaPisoIdObjetivo;
          }
          if (Number.isFinite(areaIdObjetivo) && areaIdObjetivo > 0) {
            return Number(a?.IdArea) === areaIdObjetivo;
          }
          if (reservaRender?.IdAreaPiso != null) {
            return String(a?.IdAreaPiso) === String(reservaRender?.IdAreaPiso);
          }
          return false;
        });

        if (!areaEncontrada?.IdAreaPiso) {
          setDelimitacionesArea([]);
          return;
        }

        const resDel = await fetch(
          `${API}/api/areas/piso/${areaEncontrada.IdAreaPiso}/delimitaciones`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (!resDel.ok) {
          setDelimitacionesArea([]);
          return;
        }

        const dataDel = await resDel.json();
        const delimitacionesRaw = Array.isArray(dataDel) ? dataDel : [];

        const delimitacionesFiltradas = delimitacionesRaw.filter((d) => {
          if (Number.isFinite(areaPisoIdObjetivo) && areaPisoIdObjetivo > 0 && d?.IdAreaPiso != null) {
            return Number(d.IdAreaPiso) === areaPisoIdObjetivo;
          }
          if (Number.isFinite(areaIdObjetivo) && areaIdObjetivo > 0 && d?.IdArea != null) {
            return Number(d.IdArea) === areaIdObjetivo;
          }
          return true;
        });

        setDelimitacionesArea(delimitacionesFiltradas.length ? delimitacionesFiltradas : delimitacionesRaw);

        if (!areaAsignada?.NombreArea && areaEncontrada?.NombreArea) {
          setReservaRender((prev) => ({ ...(prev || {}), NombreArea: areaEncontrada.NombreArea }));
        }
      } catch {
        setDelimitacionesArea([]);
      }
    };

    cargarDelimitacionesArea();
  }, [API, pisoEfectivo, areaIdObjetivo, areaPisoIdObjetivo, reservaRender?.IdAreaPiso, areaAsignada?.NombreArea]);

  useEffect(() => {
    const inferirPisoDesdePuesto = async () => {
      if (pisoEfectivo?.IDPiso || !reservaRender) return;

      const idPuesto = getReservaIdPuesto(reservaRender);
      const fechaBase = String(reservaRender?.FechaReserva || "").trim().split(" ")[0];
      if (!idPuesto) return;

      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        // 1) Buscar el puesto en catálogo real (pisos -> áreas -> puestos), sin depender de disponibilidad diaria.
        const resPisos = await fetch(`${API}/api/pisos`);
        const pisos = resPisos.ok ? await resPisos.json() : [];
        const listaPisos = Array.isArray(pisos) ? pisos : [];

        for (const piso of listaPisos) {
          const resAreas = await fetch(`${API}/api/areas/piso/${piso.IDPiso}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!resAreas.ok) continue;

          const areas = await resAreas.json();
          const listaAreas = Array.isArray(areas) ? areas : [];

          const respuestas = await Promise.all(
            listaAreas
              .filter((a) => a?.IdAreaPiso)
              .map((a) =>
                fetch(`${API}/api/puestos/area/${a.IdAreaPiso}`, {
                  headers: { Authorization: `Bearer ${token}` },
                })
                  .then((r) => (r.ok ? r.json() : []))
                  .catch(() => []),
              ),
          );

          const puestos = respuestas.flat().filter(Boolean);
          const puesto = puestos.find((x) => Number(x?.IdPuestoTrabajo) === Number(idPuesto));

          if (puesto) {
            setPisoEfectivo({
              IDPiso: Number(piso.IDPiso),
              NumeroPiso: piso.NumeroPiso ?? piso.IDPiso,
              Bodega: piso.Bodega ?? null,
            });

            setReservaRender((prev) => ({
              ...(prev || {}),
              ...puesto,
              IdPiso: Number(piso.IDPiso),
              NumeroPiso: piso.NumeroPiso ?? piso.IDPiso,
            }));
            return;
          }
        }

        // 2) Fallback: intentar resolver por disponibles de la fecha si existe.
        if (!fechaBase) return;

        const resDisp = await fetch(`${API}/api/reservas/disponibles/${fechaBase}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resDisp.ok) return;

        const disponibles = await resDisp.json();
        const puesto = (Array.isArray(disponibles) ? disponibles : []).find(
          (x) => Number(x?.IdPuestoTrabajo) === Number(idPuesto),
        );
        if (!puesto?.IdPiso) return;

        const pisoCatalogo = (Array.isArray(listaPisos) ? listaPisos : []).find(
          (x) => Number(x?.IDPiso) === Number(puesto.IdPiso),
        );

        setPisoEfectivo({
          IDPiso: Number(puesto.IdPiso),
          NumeroPiso: pisoCatalogo?.NumeroPiso ?? puesto.IdPiso,
          Bodega: pisoCatalogo?.Bodega ?? null,
        });

        setReservaRender((prev) => ({ ...(prev || {}), ...puesto }));
      } catch {
        // noop
      }
    };

    inferirPisoDesdePuesto();
  }, [API, pisoEfectivo, reservaRender]);

  const cargarPlano = async () => {  
    try {  
      const res = await fetch(`${API}/api/pisos/plano/${pisoEfectivo.IDPiso}`);  
      const data = await res.json();  
        
      if (data.success && data.ruta) {  
        setPlanoUrl(`${API}${data.ruta}`);  
      }  
    } catch (error) {  
      console.error("Error al cargar plano:", error);  
    } finally {  
      setLoading(false);  
    }  
  };  
  
  const dibujarPuestoAsignado = () => {
    const coords = getReservaCoords(reservaRender);
    const canvas = canvasRef.current;
    const imagen = imagenRef.current;

    if (!canvas || !imagen) return;

    const metrics = syncCanvasWithImage(canvas, imagen);
    if (!metrics) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const delimitacionesValidas = (Array.isArray(delimitacionesArea) ? delimitacionesArea : [])
      .map((d) => {
        const rectDisplay = toDisplayRect(d, metrics);
        const rawX = Number(d?.PosicionX);
        const rawY = Number(d?.PosicionY);
        const rawW = Number(d?.Ancho);
        const rawH = Number(d?.Alto);

        if (!rectDisplay || ![rawX, rawY, rawW, rawH].every(Number.isFinite)) return null;

        return {
          ...rectDisplay,
          rawX,
          rawY,
          rawW,
          rawH,
        };
      })
      .filter((d) => d && [d.x, d.y, d.w, d.h, d.rawX, d.rawY, d.rawW, d.rawH].every(Number.isFinite));

    const puntoBasePreview = coords.hasCoords ? toDisplayPoint(coords.x, coords.y, metrics) : null;
    const delimitacionesParaDibujar = (() => {
      if (!delimitacionesValidas.length || !puntoBasePreview) return delimitacionesValidas;

      const contenedoras = delimitacionesValidas.filter((d) =>
        puntoBasePreview.x >= d.x &&
        puntoBasePreview.x <= d.x + d.w &&
        puntoBasePreview.y >= d.y &&
        puntoBasePreview.y <= d.y + d.h,
      );

      if (!contenedoras.length) return delimitacionesValidas;

      // Si hay varias delimitaciones que contienen el punto, usar la más específica
      // (área mínima) para evitar resaltar rectángulos macro que dan sensación de descuadre.
      const masEspecifica = contenedoras
        .map((d) => ({ ...d, area: d.w * d.h }))
        .sort((a, b) => a.area - b.area)[0];

      return masEspecifica ? [masEspecifica] : contenedoras;
    })();

    delimitacionesParaDibujar.forEach((d) => {
      ctx.fillStyle = "rgba(251, 191, 36, 0.16)";
      ctx.strokeStyle = "rgba(245, 158, 11, 0.95)";
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 6]);
      ctx.fillRect(d.x, d.y, d.w, d.h);
      ctx.strokeRect(d.x, d.y, d.w, d.h);
      ctx.setLineDash([]);
    });

    if (!coords.hasCoords) return;

    // Mantener la misma referencia que en módulos que ya funcionan:
    // usar conversión directa display/natural sin reproyectar por delimitación,
    // porque esa reproyección terminaba moviendo el punto real del puesto.
    const puntoBase = toDisplayPoint(coords.x, coords.y, metrics);
    let x = puntoBase?.x ?? (coords.x * metrics.displayWidth) / metrics.naturalWidth;
    let y = puntoBase?.y ?? (coords.y * metrics.displayHeight) / metrics.naturalHeight;

    x = Math.max(0, Math.min(metrics.displayWidth, x));
    y = Math.max(0, Math.min(metrics.displayHeight, y));

    // Marcador súper visible para que no se pierda en el plano
    ctx.shadowColor = "rgba(220, 38, 38, 0.55)";
    ctx.shadowBlur = 14;

    ctx.beginPath();
    ctx.arc(x, y, 20, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(220, 38, 38, 0.95)";
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, 9, 0, 2 * Math.PI);
    ctx.fillStyle = "#DC2626";
    ctx.fill();

    ctx.shadowColor = "transparent";
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, 2 * Math.PI);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();

    const etiqueta = `Puesto #${getReservaPuestoLabel(reservaRender) ?? "?"}`;
    ctx.font = "bold 12px Arial";
    const textW = ctx.measureText(etiqueta).width;
    const boxW = textW + 14;
    const boxH = 24;
    const boxX = Math.max(4, Math.min(metrics.displayWidth - boxW - 4, x - boxW / 2));
    const boxY = Math.max(4, y - 44);

    ctx.fillStyle = "rgba(17, 24, 39, 0.92)";
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(etiqueta, boxX + 7, boxY + boxH / 2);

    ctx.beginPath();
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x, boxY + boxH);
    ctx.strokeStyle = "rgba(17, 24, 39, 0.92)";
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  useEffect(() => {
    if (planoUrl) {
      dibujarPuestoAsignado();
    }
  }, [planoUrl, reservaRender, delimitacionesArea]);

  useEffect(() => {
    if (!planoUrl) return;

    const onResize = () => dibujarPuestoAsignado();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [planoUrl, reservaRender, delimitacionesArea]);
  
  const coordsReserva = getReservaCoords(reservaRender);
  const puestoLabel = getReservaPuestoLabel(reservaRender) ?? "N/D";

  return (  
    <div  
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"  
      onClick={onClose}  
    >  
      <motion.div  
        initial={{ opacity: 0, scale: 0.95 }}  
        animate={{ opacity: 1, scale: 1 }}  
        exit={{ opacity: 0, scale: 0.95 }}  
        onClick={(e) => e.stopPropagation()}  
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col"  
      >  
        {/* Header */}  
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-2xl">  
          <div>  
            <h3 className="text-xl font-bold text-gray-900">  
              ✅ Puesto Asignado  
            </h3>  
            <p className="text-sm text-gray-600 mt-1">  
              {reservaRender?.NombreArea || areaAsignada?.NombreArea || `Área ${areaAsignada?.IdArea || "N/D"}`} • Puesto #{puestoLabel}
            </p>  
          </div>  
          <button  
            onClick={onClose}  
            className="w-10 h-10 rounded-full hover:bg-white/80 flex items-center justify-center transition text-gray-600 hover:text-gray-900"  
          >  
            <span className="text-2xl">✕</span>  
          </button>
        </div>  
  
        {/* Contenido */}  
        <div className="flex-1 overflow-y-auto p-6">  
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">  
            <p className="text-sm text-green-800 font-medium">  
              🎉 Tu reserva ha sido confirmada. Este es tu puesto asignado en el plano.  
            </p>  
          </div>  

          {loadingUbicacion && (
            <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm">
              Buscando coordenadas reales del puesto reservado...
            </div>
          )}
  
          {loading ? (  
            <div className="flex justify-center py-16">  
              <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>  
            </div>  
          ) : !pisoEfectivo?.IDPiso ? (
            <div className="p-4 rounded-xl bg-yellow-50 border border-yellow-200 text-yellow-800">
              Esta reserva no trae piso asociado. No podemos ubicarla en un plano sin adivinar piso.
            </div>
          ) : !planoUrl ? (
            <div className="p-4 rounded-xl bg-yellow-50 border border-yellow-200 text-yellow-800">
              No se encontró plano para este piso.
            </div>
          ) : (  
            <div>
              {!coordsReserva.hasCoords ? (
                <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm">
                  Este registro no tiene coordenadas guardadas, pero puedes ubicarte por piso y área.
                </div>
              ) : null}
              <div className="max-h-[65vh] overflow-auto rounded-xl border-2 border-gray-300 bg-gray-50 shadow-lg">
                <div className="relative inline-block w-full">
                  <img
                    ref={imagenRef}
                    src={planoUrl}
                    alt="Plano del piso"
                    className="block max-w-none h-auto"
                    onLoad={() => {
                      dibujarPuestoAsignado();
                    }}
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0 pointer-events-none z-10"
                  />
                </div>
              </div>
            </div>
          )}  
        </div>  
  
        {/* Footer */}  
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">  
          <motion.button  
            whileHover={{ scale: 1.02 }}  
            whileTap={{ scale: 0.98 }}  
            onClick={onClose}  
            className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition font-semibold shadow-lg"  
          >  
            Entendido  
          </motion.button>  
        </div>  
      </motion.div>  
    </div>  
  );  
}
