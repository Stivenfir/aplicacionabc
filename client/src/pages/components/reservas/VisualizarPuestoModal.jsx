// client/src/pages/components/reservas/VisualizarPuestoModal.jsx  
import { useRef, useEffect, useState } from "react";  
import { motion } from "framer-motion";  
  
export default function VisualizarPuestoModal({  
  puestoAsignado,  
  pisoSeleccionado,  
  onClose  
}) {  
  const canvasRef = useRef(null);  
  const imagenRef = useRef(null);  
  const containerRef = useRef(null);  
  const [planoUrl, setPlanoUrl] = useState(null);  
  const [loading, setLoading] = useState(true);  
  const [zoomLevel, setZoomLevel] = useState(1);  
  const [delimitaciones, setDelimitaciones] = useState([]);  
  const [puestosArea, setPuestosArea] = useState([]);  
    
  const API = import.meta.env.VITE_API_URL || "http://localhost:3000";  
  
  // Cargar plano del piso  
  useEffect(() => {  
    const cargarPlano = async () => {  
      try {  
        const token = localStorage.getItem("token");  
        const res = await fetch(`${API}/api/pisos/plano/${pisoSeleccionado.IDPiso}`, {  
          headers: { Authorization: `Bearer ${token}` }  
        });  
        const data = await res.json();  
          
        if (data.success) {  
          setPlanoUrl(`${API}${data.ruta}`);  
        }  
      } catch (error) {  
        console.error("Error al cargar plano:", error);  
      } finally {  
        setLoading(false);  
      }  
    };  
  
    if (pisoSeleccionado?.IDPiso) {  
      cargarPlano();  
    }  
  }, [pisoSeleccionado]);  
  
  // Cargar delimitaciones y puestos del área  
  useEffect(() => {  
    const cargarDatos = async () => {  
      try {  
        const token = localStorage.getItem("token");  
          
        // Cargar delimitaciones del área  
        if (puestoAsignado?.IdAreaPiso) {  
          const resDelim = await fetch(  
            `${API}/api/areas/piso/${puestoAsignado.IdAreaPiso}/delimitaciones`,  
            { headers: { Authorization: `Bearer ${token}` } }  
          );  
          const dataDelim = await resDelim.json();  
          setDelimitaciones(dataDelim);  
  
          // Cargar todos los puestos del área  
          const resPuestos = await fetch(  
            `${API}/api/puestos/area/${puestoAsignado.IdAreaPiso}`,  
            { headers: { Authorization: `Bearer ${token}` } }  
          );  
          const dataPuestos = await resPuestos.json();  
          setPuestosArea(dataPuestos);  
        }  
      } catch (error) {  
        console.error("Error al cargar datos:", error);  
      }  
    };  
  
    cargarDatos();  
  }, [puestoAsignado]);  
  
  // Dibujar mapa con puesto destacado  
  const dibujarMapa = () => {  
    if (!canvasRef.current || !imagenRef.current) return;  
  
    const canvas = canvasRef.current;  
    const ctx = canvas.getContext("2d");  
    ctx.clearRect(0, 0, canvas.width, canvas.height);  
  
    // 1. Dibujar delimitaciones del área  
    delimitaciones.forEach((delim) => {  
      ctx.strokeStyle = "#3B82F6";  
      ctx.lineWidth = 3;  
      ctx.fillStyle = "rgba(59, 130, 246, 0.1)";  
        
      ctx.fillRect(  
        Number(delim.PosicionX),  
        Number(delim.PosicionY),  
        Number(delim.Ancho),  
        Number(delim.Alto)  
      );  
      ctx.strokeRect(  
        Number(delim.PosicionX),  
        Number(delim.PosicionY),  
        Number(delim.Ancho),  
        Number(delim.Alto)  
      );  
    });  
  
    // 2. Dibujar otros puestos del área en gris  
    puestosArea.forEach(p => {  
      if (p.UbicacionX && p.UbicacionY && p.IdPuestoTrabajo !== puestoAsignado.IdPuestoTrabajo) {  
        ctx.beginPath();  
        ctx.arc(Number(p.UbicacionX), Number(p.UbicacionY), 8, 0, 2 * Math.PI);  
        ctx.fillStyle = "#D1D5DB";  
        ctx.fill();  
        ctx.strokeStyle = "#9CA3AF";  
        ctx.lineWidth = 2;  
        ctx.stroke();  
  
        ctx.fillStyle = "#6B7280";  
        ctx.font = "bold 10px Arial";  
        ctx.textAlign = "center";  
        ctx.textBaseline = "middle";  
        ctx.fillText(p.NoPuesto, Number(p.UbicacionX), Number(p.UbicacionY));  
      }  
    });  
  
    // 3. Dibujar puesto asignado destacado con animación  
    if (puestoAsignado?.UbicacionX && puestoAsignado?.UbicacionY) {  
      const x = Number(puestoAsignado.UbicacionX);  
      const y = Number(puestoAsignado.UbicacionY);  
  
      // Círculo pulsante de fondo  
      ctx.shadowColor = 'rgba(34, 197, 94, 0.5)';  
      ctx.shadowBlur = 20;  
      ctx.beginPath();  
      ctx.arc(x, y, 20, 0, 2 * Math.PI);  
      ctx.fillStyle = "rgba(34, 197, 94, 0.2)";  
      ctx.fill();  
  
      // Puesto principal  
      ctx.shadowBlur = 10;  
      ctx.beginPath();  
      ctx.arc(x, y, 12, 0, 2 * Math.PI);  
      ctx.fillStyle = "#22C55E";  
      ctx.fill();  
      ctx.strokeStyle = "#16A34A";  
      ctx.lineWidth = 3;  
      ctx.stroke();  
  
      // Número del puesto  
      ctx.shadowColor = 'transparent';  
      ctx.fillStyle = "#FFFFFF";  
      ctx.font = "bold 14px Arial";  
      ctx.textAlign = "center";  
      ctx.textBaseline = "middle";  
      ctx.fillText(puestoAsignado.NoPuesto, x, y);  
  
      // Etiqueta "TU PUESTO"  
      ctx.fillStyle = "#16A34A";  
      ctx.font = "bold 12px Arial";  
      ctx.fillText("TU PUESTO", x, y - 35);  
  
      // Flecha indicadora  
      ctx.strokeStyle = "#16A34A";  
      ctx.lineWidth = 2;  
      ctx.beginPath();  
      ctx.moveTo(x, y - 25);  
      ctx.lineTo(x - 5, y - 30);  
      ctx.moveTo(x, y - 25);  
      ctx.lineTo(x + 5, y - 30);  
      ctx.stroke();  
    }  
  };  
  
  useEffect(() => {  
    if (canvasRef.current && imagenRef.current && planoUrl) {  
      dibujarMapa();  
    }  
  }, [delimitaciones, puestosArea, puestoAsignado, planoUrl]);  
  
  return (  
    <div  
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"  
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
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-2xl">  
          <div className="flex items-center justify-between">  
            <div>  
              <h3 className="text-2xl font-bold text-gray-900">  
                🗺️ Ubicación de tu Puesto  
              </h3>  
              <p className="text-sm text-gray-600 mt-1">  
                Puesto #{puestoAsignado?.NoPuesto} • Piso {pisoSeleccionado?.NumeroPiso} • Bodega {pisoSeleccionado?.Bodega}  
              </p>  
            </div>  
  
            <div className="flex items-center gap-2">  
              <button  
                onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}  
                className="px-3 py-2 bg-white hover:bg-gray-100 rounded-lg text-sm font-medium transition shadow-sm"  
              >  
                🔍−  
              </button>  
              <span className="text-sm text-gray-600 font-medium">  
                {Math.round(zoomLevel * 100)}%  
              </span>  
              <button  
                onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))}  
                className="px-3 py-2 bg-white hover:bg-gray-100 rounded-lg text-sm font-medium transition shadow-sm"  
              >  
                🔍+  
              </button>  
              <button  
                onClick={onClose}  
                className="w-10 h-10 rounded-full hover:bg-white/80 flex items-center justify-center transition text-gray-600 hover:text-gray-900"  
              >  
                <span className="text-2xl">✕</span>  
              </button>  
            </div>  
          </div>  
        </div>  
  
        {/* Contenido */}  
        <div className="flex-1 overflow-y-auto p-6">  
          {loading ? (  
            <div className="flex flex-col items-center justify-center h-full">  
              <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-4"></div>  
              <p className="text-gray-600 font-medium">Cargando mapa del piso...</p>  
            </div>  
          ) : (  
            <div   
              ref={containerRef}  
              className="h-full max-h-[65vh] overflow-x-auto overflow-y-scroll rounded-xl border-2 border-gray-200"  
              style={{   
                display: 'flex',   
                justifyContent: 'flex-start',   
                alignItems: 'flex-start',  
                backgroundColor: '#F9FAFB'  
              }}  
            >  
              <div style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}>  
                <div className="relative inline-block">  
                  <img  
                    ref={imagenRef}  
                    src={planoUrl}  
                    alt="Plano del piso"  
                    className="block max-w-none h-auto"  
                    onLoad={(e) => {  
                      if (canvasRef.current) {  
                        const naturalWidth = e.target.naturalWidth || e.target.width;  
                        const naturalHeight = e.target.naturalHeight || e.target.height;  

                        canvasRef.current.width = naturalWidth;  
                        canvasRef.current.height = naturalHeight;  
                        canvasRef.current.style.width = `${naturalWidth}px`;  
                        canvasRef.current.style.height = `${naturalHeight}px`;  
                        dibujarMapa();  
                      }  
                    }}  
                  />  
                  <canvas  
                    ref={canvasRef}  
                    className="absolute top-0 left-0 pointer-events-none"  
                  />  
                </div>  
              </div>  
            </div>  
          )}  
        </div>  
  
        {/* Footer con instrucciones */}  
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl sticky bottom-0">  
          <div className="flex items-start gap-4">  
            <div className="flex-1 grid grid-cols-3 gap-4">  
              <div className="flex items-center gap-2">  
                <div className="w-4 h-4 rounded-full bg-green-500"></div>  
                <span className="text-sm text-gray-700">Tu puesto asignado</span>  
              </div>  
              <div className="flex items-center gap-2">  
                <div className="w-4 h-4 rounded-full bg-gray-400"></div>  
                <span className="text-sm text-gray-700">Otros puestos del área</span>  
              </div>  
              <div className="flex items-center gap-2">  
                <div className="w-4 h-4 border-2 border-blue-500 bg-blue-100"></div>  
                <span className="text-sm text-gray-700">Delimitación del área</span>  
              </div>  
            </div>  
          </div>  
        </div>  
      </motion.div>  
    </div>  
  );  
}
