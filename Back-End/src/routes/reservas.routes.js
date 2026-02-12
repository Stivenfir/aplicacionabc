import { Router } from "express";        
import { authenticateToken } from '../middleware/auth.middleware.js';        
        
const router = Router();        
        
// Función GetData para comunicarse con la API externa        
async function GetData(P) {        
  return new Promise(resolve => {        
    var OptPet = {        
      method: 'POST',        
      headers: {        
        'Content-Type': 'application/x-www-form-urlencoded',        
        TK: process.env.API_TOKEN        
      },        
      body: P.replace('/\n/g', "\\n")        
    }        
    fetch(process.env.EXTERNAL_API_URL, OptPet).then(response => response.text()).then(Rta => {        
      resolve(Rta)        
    }).catch(error => { console.error("Error", error); });        
  });        
}        
        

function toSqlDateYYYYMMDD(value) {
  if (!value) return null;

  const fecha = new Date(`${value}T00:00:00`);
  if (Number.isNaN(fecha.getTime())) return null;

  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}


function normalizeAreaId(rawArea) {
  const parsed = Number(rawArea);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function esPuestoDisponible(puesto) {
  return String(puesto?.Disponible || "").trim().toUpperCase() === "SI";
}

function esPuestoMapeado(puesto) {
  return puesto?.TieneMapeo === true ||
    puesto?.TieneMapeo === 1 ||
    String(puesto?.TieneMapeo || "").trim() === "1";
}

function esPuestoReservable(puesto) {
  return esPuestoDisponible(puesto) && esPuestoMapeado(puesto);
}

const FESTIVOS_FIJOS_MMDD = new Set([
  "01-01", // Año Nuevo
  "05-01", // Día del Trabajo
  "07-20", // Independencia
  "08-07", // Batalla de Boyacá
  "12-08", // Inmaculada Concepción
  "12-25", // Navidad
]);

function toLocalDateFromYYYYMMDD(value) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isDomingo(fecha) {
  return fecha?.getDay?.() === 0;
}

function isFestivo(fecha) {
  if (!fecha) return false;

  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const dd = String(fecha.getDate()).padStart(2, '0');
  const mmdd = `${mm}-${dd}`;
  if (FESTIVOS_FIJOS_MMDD.has(mmdd)) return true;

  const ymd = `${fecha.getFullYear()}-${mm}-${dd}`;
  const festivosCustom = String(process.env.FESTIVOS_YYYYMMDD || "")
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

  return festivosCustom.includes(ymd);
}

function getHoraInicioReserva() {
  const parsed = Number(process.env.HORA_INICIO_RESERVA || 8);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 23 ? parsed : 8;
}

function getInicioJornadaReserva(fecha) {
  if (!fecha) return null;
  const dt = new Date(fecha);
  dt.setHours(getHoraInicioReserva(), 0, 0, 0);
  return dt;
}


function logAuditoria(accion, usuario, detalles) {        
  const timestamp = new Date().toISOString();        
  const logEntry = { timestamp, accion, usuario, ...detalles };        
  console.log('[AUDIT]', JSON.stringify(logEntry));        
}        
        
// GET - Obtener las 1000 reservas más recientes de un empleado         
router.get("/empleado", authenticateToken, async (req, res) => {      
  const idEmpleado = req.user.idEmpleado;  // ✅ Del token JWT      
  const usuario = req.user.username;      
        
  logAuditoria('CONSULTAR_RESERVAS_EMPLEADO', usuario, { idEmpleado });      
        
  try {      
    var Rta = await GetData(`ConsultaReservas=@P%3D0,@IdEmpleado%3D${idEmpleado}`);      
          
    // Validar formato PHP      
    if (!Rta || Rta.trim().startsWith('Array') || Rta.trim().startsWith(':')) {      
      logAuditoria('CONSULTAR_RESERVAS_EMPLEADO', usuario, {      
        idEmpleado,      
        resultado: 'error',      
        error: 'Formato inválido de BD'      
      });      
      return res.status(503).json({      
        message: "Servicio de base de datos devolvió formato inválido"      
      });      
    }      
          
    var S = Rta.trim();      
    var D = JSON.parse(S.trim())["data"];      
          
    if (!Array.isArray(D)) {      
      return res.json([]);      
    }      
          
    logAuditoria('CONSULTAR_RESERVAS_EMPLEADO', usuario, {      
      idEmpleado,      
      resultado: 'success',      
      cantidad: D.length      
    });      
          
    return res.json(D);      
  } catch (error) {      
    console.error('Error al obtener reservas del empleado:', error);      
    logAuditoria('CONSULTAR_RESERVAS_EMPLEADO', usuario, {      
      idEmpleado,      
      resultado: 'error',      
      error: error.message      
    });      
    return res.status(500).json({ message: error.message });      
  }      
});     
        

// GET - Obtener pisos habilitados para el área del usuario (sin consultas SQL directas)
router.get("/pisos-habilitados", authenticateToken, async (req, res) => {
  const usuario = req.user.username;
  const idArea = req.user.idArea;

  try {
    const hoySql = toSqlDateYYYYMMDD(new Date().toISOString().split("T")[0]);
    if (!hoySql) {
      return res.json({ pisos: [], scope: "area" });
    }

    const Rta = await GetData(`ConsultaReservas=@P%3D2,@Fecha%3D'${hoySql}',@IdArea%3D${idArea}`);

    if (!Rta || Rta.trim().startsWith('Array') || Rta.trim().startsWith(':')) {
      logAuditoria('CONSULTAR_PISOS_HABILITADOS', usuario, {
        idArea,
        scope: 'area',
        resultado: 'error',
        error: 'Servicio de base de datos devolvió formato inválido'
      });
      return res.json({ pisos: [], scope: "area" });
    }

    const data = JSON.parse(Rta.trim())["data"];
    const puestos = (Array.isArray(data) ? data : []).filter(esPuestoReservable);

    const pisosMap = new Map();
    for (const puesto of puestos) {
      const idPiso = Number(puesto.IdPiso);
      if (!idPiso) continue;
      const actual = pisosMap.get(idPiso) || {
        IDPiso: idPiso,
        NumeroPiso: puesto.IdPiso,
        Bodega: null,
        TotalPuestosArea: 0,
      };
      actual.TotalPuestosArea += 1;
      pisosMap.set(idPiso, actual);
    }

    const pisos = Array.from(pisosMap.values()).sort((a, b) =>
      (Number(a.Bodega) || 0) - (Number(b.Bodega) || 0) ||
      (Number(a.NumeroPiso) || 0) - (Number(b.NumeroPiso) || 0),
    );

    logAuditoria('CONSULTAR_PISOS_HABILITADOS', usuario, {
      idArea,
      scope: 'area',
      resultado: 'success',
      cantidad: pisos.length,
    });

    return res.json({ pisos, scope: "area" });
  } catch (error) {
    console.error('Error al obtener pisos habilitados:', error);
    logAuditoria('CONSULTAR_PISOS_HABILITADOS', usuario, {
      idArea,
      scope: 'area',
      resultado: 'error',
      error: error.message,
    });
    return res.status(500).json({ message: error.message });
  }
});

// GET - Obtener puestos disponibles para una fecha específica      
router.get("/disponibles/:fecha", authenticateToken, async (req, res) => {            
  const { fecha } = req.params;      
  const { idPiso } = req.query;      
  const usuario = req.user.username;  
  const idArea = req.user.idArea;
            
  try {  
    const fechaSql = toSqlDateYYYYMMDD(fecha);
    if (!fechaSql) {
      return res.status(400).json({ message: "Fecha inválida. Usa formato YYYY-MM-DD" });
    }

    const fechaLocal = toLocalDateFromYYYYMMDD(fecha);
    if (!fechaLocal) {
      return res.status(400).json({ message: "Fecha inválida. Usa formato YYYY-MM-DD" });
    }

    if (isDomingo(fechaLocal) || isFestivo(fechaLocal)) {
      return res.json([]);
    }

    // ✅ MODIFICAR: Pasar @IdArea al stored procedure  
    var Rta = await GetData(`ConsultaReservas=@P%3D2,@Fecha%3D'${fechaSql}'${idArea ? `,@IdArea%3D${idArea}` : ''}`);  
            
    if (!Rta || Rta.trim().startsWith('Array') || Rta.trim().startsWith(':')) {            
      console.error('Error de BD:', Rta);          
      logAuditoria('CONSULTAR_PUESTOS_DISPONIBLES', usuario, {            
        fecha,      
        idPiso,  
        idArea,
        resultado: 'error',            
        error: 'Servicio de base de datos devolvió formato inválido'            
      });            
      return res.status(503).json({            
        message: "Servicio de base de datos devolvió formato inválido"            
      });            
    }            
            
    var S = Rta.trim();            
    var D = JSON.parse(S.trim())["data"];            
            
    if (!Array.isArray(D)) {            
      return res.json([]);            
    }      

    D = D.filter(esPuestoReservable);
      
    // ✅ Eliminar duplicados basándose en IdPuestoTrabajo    
    const puestosUnicos = [];    
    const idsVistos = new Set();    
        
    for (const puesto of D) {    
      if (!idsVistos.has(puesto.IdPuestoTrabajo)) {    
        idsVistos.add(puesto.IdPuestoTrabajo);    
        puestosUnicos.push(puesto);    
      }    
    }    
        
    D = puestosUnicos;    
      
    // ✅ Filtrar por IdPiso si se especificó en query params      
    if (idPiso && Array.isArray(D)) {      
      D = D.filter(puesto => puesto.IdPiso == idPiso);      
    }      

    // Orden estable para asignación automática (el frontend toma el primero)
    D.sort((a, b) => {
      const pisoA = Number(a.IdPiso) || 0;
      const pisoB = Number(b.IdPiso) || 0;
      if (pisoA !== pisoB) return pisoA - pisoB;

      const puestoA = Number(a.NoPuesto);
      const puestoB = Number(b.NoPuesto);
      if (!Number.isNaN(puestoA) && !Number.isNaN(puestoB) && puestoA !== puestoB) {
        return puestoA - puestoB;
      }

      return (Number(a.IdPuestoTrabajo) || 0) - (Number(b.IdPuestoTrabajo) || 0);
    });
            
    logAuditoria('CONSULTAR_PUESTOS_DISPONIBLES', usuario, {            
      fecha,      
      idPiso,  
      idArea,
      resultado: 'success',            
      cantidad: D.length            
    });            
            
    return res.json(D);            
  } catch (error) {            
    console.error('Error al obtener puestos disponibles:', error);            
    logAuditoria('CONSULTAR_PUESTOS_DISPONIBLES', usuario, {            
      fecha,      
      idPiso,  
      idArea,
      resultado: 'error',            
      error: error.message            
    });            
    return res.status(500).json({ message: error.message });            
  }            
});

// GET - Obtener disponibilidad de puestos por área en un piso  
router.get("/disponibilidad-area", authenticateToken, async (req, res) => {  
  const { idPiso } = req.query;  
  const idArea = req.user.idArea;  
  const usuario = req.user.username;  
  
  try {  
    const hoySql = toSqlDateYYYYMMDD(new Date().toISOString().split("T")[0]);
    if (!hoySql) {
      return res.json({ cantidadPuestos: 0 });
    }

    var Rta = await GetData(`ConsultaReservas=@P%3D2,@Fecha%3D'${hoySql}',@IdArea%3D${idArea}`);  
      
    if (!Rta || Rta.trim().startsWith('Array') || Rta.trim().startsWith(':')) {  
      return res.json({ cantidadPuestos: 0 });  
    }  
  
    var S = Rta.trim();  
    var D = JSON.parse(S.trim())["data"];  
    const puestos = (Array.isArray(D) ? D : []).filter(esPuestoReservable);
    const cantidadPuestos = puestos.filter((p) => String(p.IdPiso) === String(idPiso)).length;
  
    logAuditoria('CONSULTAR_DISPONIBILIDAD_AREA', usuario, {  
      idArea,  
      idPiso,  
      resultado: 'success'  
    });  
  
    return res.json({  
      cantidadPuestos
    });  
  } catch (error) {  
    console.error('Error al obtener disponibilidad:', error);  
    return res.json({ cantidadPuestos: 0 });  
  }  
});
        
// POST - Crear nueva reserva (✅ CON VALIDACIONES DE FECHA Y RESERVA ÚNICA)  
router.post("/", authenticateToken, async (req, res) => {        
  const { idPuestoTrabajo, fecha } = req.body;  
  const idEmpleado = req.user.idEmpleado;  
  const usuario = req.user.username;        
  const idArea = normalizeAreaId(req.user.idArea);
        
  // Validar parámetros        
  if (!idPuestoTrabajo || !fecha) {        
    return res.status(400).json({        
      error: "idPuestoTrabajo y fecha son requeridos"        
    });        
  }  
    
  const fechaSql = toSqlDateYYYYMMDD(fecha);
  if (!fechaSql) {
    return res.status(400).json({ error: "Formato de fecha inválido. Usa YYYY-MM-DD" });
  }

  const fechaReservaLocal = toLocalDateFromYYYYMMDD(fecha);
  if (!fechaReservaLocal) {
    return res.status(400).json({ error: "Formato de fecha inválido. Usa YYYY-MM-DD" });
  }

  if (isDomingo(fechaReservaLocal) || isFestivo(fechaReservaLocal)) {
    return res.status(400).json({
      error: "No se pueden crear reservas en domingos o días festivos",
    });
  }

  // ✅ VALIDACIÓN 1: Reserva mínima con 1 día de antelación (no hoy ni pasadas)
  const fechaReserva = new Date(`${fecha}T00:00:00`);  
  const hoy = new Date();  
  hoy.setHours(0, 0, 0, 0);  
  fechaReserva.setHours(0, 0, 0, 0);  
  
  if (fechaReserva <= hoy) {  
    logAuditoria('CREAR_RESERVA', usuario, {  
      idEmpleado,  
      fecha,  
      resultado: 'error',  
      error: 'Intento de reservar sin antelación mínima (hoy o pasada)'  
    });  
    return res.status(400).json({  
      error: "La reserva debe realizarse con al menos 1 día de anticipación"  
    });  
  }  
        
  logAuditoria('CREAR_RESERVA', usuario, {        
    idEmpleado,        
    idPuestoTrabajo,        
    fecha        
  });        
        
  try {  
    // ✅ VALIDACIÓN 2: Verificar reserva única por día  
    const reservasEmpleado = await GetData(`ConsultaReservas=@P%3D0,@IdEmpleado%3D${idEmpleado}`);  
  
    if (reservasEmpleado && !reservasEmpleado.trim().startsWith('Array') && !reservasEmpleado.trim().startsWith(':')) {  
      const reservasData = JSON.parse(reservasEmpleado.trim())["data"];  
        
      if (Array.isArray(reservasData)) {  
        const reservaExistente = reservasData.find(r => {  
          const fechaReservaExistente = new Date(r.FechaReserva);  
          fechaReservaExistente.setHours(0, 0, 0, 0);  
          return fechaReservaExistente.getTime() === fechaReserva.getTime() && r.ReservaActiva;  
        });  
          
        if (reservaExistente) {  
          logAuditoria('CREAR_RESERVA', usuario, {  
            idEmpleado,  
            fecha,  
            resultado: 'error',  
            error: 'Ya tiene una reserva activa para esta fecha'  
          });  
          return res.status(400).json({  
            error: "Ya tienes una reserva activa para esta fecha"  
          });  
        }  
      }  
    }  
        
    // ✅ VALIDACIÓN 3: El puesto debe seguir disponible y mapeado para la fecha solicitada
    const rtaDisponibles = await GetData(
      `ConsultaReservas=@P%3D2,@Fecha%3D'${fechaSql}'${idArea ? `,@IdArea%3D${idArea}` : ''}`,
    );

    if (!rtaDisponibles || rtaDisponibles.trim().startsWith('Array') || rtaDisponibles.trim().startsWith(':')) {
      return res.status(503).json({ message: "No fue posible validar disponibilidad del puesto" });
    }

    const dataDisponibles = JSON.parse(rtaDisponibles.trim())["data"];
    const disponibles = (Array.isArray(dataDisponibles) ? dataDisponibles : [])
      .filter(esPuestoReservable)
      .filter((p) => Number(p?.IdPuestoTrabajo) === Number(idPuestoTrabajo));

    if (!disponibles.length) {
      logAuditoria('CREAR_RESERVA', usuario, {
        idEmpleado,
        idPuestoTrabajo,
        fecha,
        idArea,
        resultado: 'error',
        error: 'Puesto no disponible para la fecha solicitada',
      });
      return res.status(400).json({
        error: "El puesto seleccionado ya no está disponible para esa fecha. Actualiza y vuelve a intentar.",
      });
    }

    // Crear la reserva  
    var Rta = await GetData(`EditReservas=@P%3D0,@IdEmpleado%3D${idEmpleado},@IdPuestoTrabajo%3D${idPuestoTrabajo},@Fecha%3D'${fechaSql}'`);        
        
    if (!Rta || Rta.trim().startsWith('Array') || Rta.trim().startsWith(':')) {        
      console.error('Error de BD:', Rta);      
      logAuditoria('CREAR_RESERVA', usuario, {        
        idEmpleado,        
        idPuestoTrabajo,        
        resultado: 'error',        
        error: 'Servicio de base de datos devolvió formato inválido'        
      });        
      return res.status(503).json({        
        message: "Servicio de base de datos devolvió formato inválido"        
      });        
    }        
        
    var S = Rta.trim();        
    var D = JSON.parse(S.trim());        
        
    logAuditoria('CREAR_RESERVA', usuario, {        
      idEmpleado,        
      idPuestoTrabajo,        
      resultado: 'success'        
    });        
        
    return res.json(D);        
  } catch (error) {        
    console.error('Error al crear reserva:', error);        
    logAuditoria('CREAR_RESERVA', usuario, {        
      idEmpleado,        
      idPuestoTrabajo,        
      resultado: 'error',        
      error: error.message        
    });        
    return res.status(500).json({ message: error.message });        
  }        
});        
        
// PUT - Cancelar una reserva        
router.put("/:idReserva/cancelar", authenticateToken, async (req, res) => {        
  const { idReserva } = req.params;        
  const { observacion, emergencia } = req.body;  // ✅ observacion + flag emergencia    
  const idEmpleado = req.user.idEmpleado;  // ✅ Del token JWT    
  const usuario = req.user.username;        
        
  // Validar parámetros        
  if (!observacion) {        
    return res.status(400).json({        
      error: "observacion es requerida"        
    });        
  }        
        
  logAuditoria('CANCELAR_RESERVA', usuario, {        
    idReserva,        
    idEmpleado,        
    observacion        
  });        
        
  try {        
    const reservasEmpleado = await GetData(`ConsultaReservas=@P%3D0,@IdEmpleado%3D${idEmpleado}`);
    if (!reservasEmpleado || reservasEmpleado.trim().startsWith('Array') || reservasEmpleado.trim().startsWith(':')) {
      return res.status(503).json({ message: "No fue posible validar la reserva antes de cancelar" });
    }

    const dataReservas = JSON.parse(reservasEmpleado.trim())["data"];
    const reserva = (Array.isArray(dataReservas) ? dataReservas : []).find(
      (r) => Number(r?.IdEmpleadoPuestoTrabajo) === Number(idReserva),
    );

    if (!reserva) {
      return res.status(404).json({ error: "Reserva no encontrada" });
    }

    if (!reserva?.ReservaActiva) {
      return res.status(400).json({ error: "La reserva ya no está activa" });
    }

    const fechaBase = String(reserva?.FechaReserva || '').split(' ')[0];
    const fechaReserva = toLocalDateFromYYYYMMDD(fechaBase);
    const inicioJornada = getInicioJornadaReserva(fechaReserva);

    if (inicioJornada) {
      const limiteCancelacion = new Date(inicioJornada.getTime() - 60 * 60 * 1000);
      const fueraDeTiempo = new Date() > limiteCancelacion;
      const esEmergencia = emergencia === true || emergencia === 1 || String(emergencia).toLowerCase() === 'true';

      if (fueraDeTiempo && !esEmergencia) {
        return res.status(400).json({
          code: "CANCELACION_FUERA_DE_TIEMPO",
          error: "La cancelación normal debe hacerse al menos 1 hora antes del inicio de la jornada",
        });
      }
    }

    // SP_EditReservas con @P=1 para cancelar reserva        
    var Rta = await GetData(`EditReservas=@P%3D1,@IdEmpleadoPuestoTrabajo%3D${idReserva},@Obs%3D'${encodeURIComponent(observacion)}',@IdEmpleado%3D${idEmpleado}`);        
        
    // ✅ Validar formato PHP inválido      
    if (!Rta || Rta.trim().startsWith('Array') || Rta.trim().startsWith(':')) {        
      console.error('Error de BD:', Rta);      
      logAuditoria('CANCELAR_RESERVA', usuario, {        
        idReserva,        
        resultado: 'error',        
        error: 'Servicio de base de datos devolvió formato inválido'        
      });        
      return res.status(503).json({        
        message: "Servicio de base de datos devolvió formato inválido"        
      });        
    }        
        
    var S = Rta.trim();        
    var D = JSON.parse(S.trim());        
        
    logAuditoria('CANCELAR_RESERVA', usuario, {        
      idReserva,        
      resultado: 'success'        
    });        
        
    return res.json(D);        
  } catch (error) {        
    console.error('Error al cancelar reserva:', error);        
    logAuditoria('CANCELAR_RESERVA', usuario, {        
      idReserva,        
      resultado: 'error',        
      error: error.message        
    });        
    return res.status(500).json({ message: error.message });        
  }        
});        
      
// GET - Obtener todas las reservas (5000 más recientes) - Solo para admin        
router.get("/todas", authenticateToken, async (req, res) => {        
  const usuario = req.user.username;        
        
  try {        
    // SP_ConsultaReservas con @P=1 para obtener todas las reservas        
    var Rta = await GetData(`ConsultaReservas=@P%3D1,@IdEmpleado%3D0`);        
        
    // ✅ Validar formato PHP inválido      
    if (!Rta || Rta.trim().startsWith('Array') || Rta.trim().startsWith(':')) {        
      console.error('Error de BD:', Rta);      
      logAuditoria('CONSULTAR_TODAS_RESERVAS', usuario, {        
        resultado: 'error',        
        error: 'Servicio de base de datos devolvió formato inválido'        
      });        
      return res.status(503).json({        
        message: "Servicio de base de datos devolvió formato inválido"        
      });        
    }        
        
    var S = Rta.trim();        
    var D = JSON.parse(S.trim())["data"];        
        
    if (!Array.isArray(D)) {        
      return res.json([]);        
    }
       logAuditoria('CONSULTAR_TODAS_RESERVAS', usuario, {        
      resultado: 'success',        
      cantidad: D.length        
    });        
        
    return res.json(D);        
  } catch (error) {        
    console.error('Error al obtener todas las reservas:', error);        
    logAuditoria('CONSULTAR_TODAS_RESERVAS', usuario, {        
      resultado: 'error',        
      error: error.message        
    });        
    return res.status(500).json({ message: error.message });        
  }        
});        
        
export default router;
