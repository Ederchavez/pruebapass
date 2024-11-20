import { initializeApp } from "https://www.gstatic.com/firebasejs/9.19.1/firebase-app.js";
import { getDatabase, ref, push, query, orderByKey, limitToLast, get, set } from "https://www.gstatic.com/firebasejs/9.19.1/firebase-database.js";

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCm2XNaOodQCc5q5xBJOq2_zbwypXDvBcw",
    authDomain: "webpass2024.firebaseapp.com",
    databaseURL: "https://webpass2024-default-rtdb.firebaseio.com",
    projectId: "webpass2024",
    storageBucket: "webpass2024.appspot.com",
    messagingSenderId: "288778804676",
    appId: "1:288778804676:web:e0d5c24eab50b9674f9891",
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Obtener el estado actual de la alarma desde la base de datos
async function obtenerEstadoAlarma() {
    try {
        const registrosRef = ref(db, "registros");
        const q = query(registrosRef, orderByKey(), limitToLast(1));
        const snapshot = await get(q);

        if (snapshot.exists()) {
            const [ultimoRegistro] = Object.values(snapshot.val());
            return ultimoRegistro.estado; // true o false
        }
        return false; // Por defecto, desactivada si no hay registros
    } catch (error) {
        console.error("Error al obtener el estado de la alarma:", error);
    }
}

// Cambiar el estado de la alarma y guardar un nuevo registro
async function cambiarEstadoAlarma() {
    try {
        const estadoActual = await obtenerEstadoAlarma();
        const nuevoEstado = !estadoActual;

        const usuario = sessionStorage.getItem("username");
        if (!usuario) {
            alert("No hay un usuario autenticado.");
            return;
        }

        // Guardar el nuevo estado como un registro en la base de datos
        const registrosRef = ref(db, "registros");
        await push(registrosRef, {
            estado: nuevoEstado,
            fecha: new Date().toISOString(),
            usuario_id: usuario,
        });

        actualizarEstadoVisual(nuevoEstado);
    } catch (error) {
        console.error("Error al cambiar el estado de la alarma:", error);
    }
}

// Actualizar el estado visual en el panel de control
async function actualizarEstadoVisual() {
    try {
        const estado = await obtenerEstadoAlarma();
        const estadoTexto = document.getElementById("estadoTexto");
        const toggleButton = document.getElementById("toggleAlarma");

        estadoTexto.textContent = estado ? "Activada" : "Desactivada";
        estadoTexto.style.color = estado ? "green" : "red";

        toggleButton.textContent = estado ? "Desactivar Alarma" : "Activar Alarma";
    } catch (error) {
        console.error("Error al actualizar el estado visual:", error);
    }
}
async function configurarProgramacionAlarma(horaInicio, horaFin) {
    try {
        const usuario = sessionStorage.getItem("username");
        if (!usuario) {
            alert("No hay un usuario autenticado.");
            return;
        }

        // Create Date objects with current date and local time
        const fechaActual = new Date();
        const [inicioHora, inicioMinuto] = horaInicio.split(':').map(Number);
        const [finHora, finMinuto] = horaFin.split(':').map(Number);

        // Set hours and minutes while keeping the current date
        const horaInicioLocal = new Date(fechaActual);
        horaInicioLocal.setHours(inicioHora, inicioMinuto, 0, 0);

        const horaFinLocal = new Date(fechaActual);
        horaFinLocal.setHours(finHora, finMinuto, 0, 0);

        // Guardar la configuración de programación en la base de datos
        const scheduleRef = ref(db, "programacion_alarma");
        await set(scheduleRef, {
            horaInicio: horaInicio, // Keep original input for display
            horaFin: horaFin, // Keep original input for display
            horaInicioUTC: horaInicioLocal.toISOString(), // Store in UTC for consistent comparison
            horaFinUTC: horaFinLocal.toISOString(), // Store in UTC for consistent comparison
            usuario_id: usuario,
            activo: true
        });

        alert("Programación de alarma guardada exitosamente.");
        verificarProgramacionAlarma(); // Iniciar verificación inmediata
    } catch (error) {
        console.error("Error al configurar la programación de la alarma:", error);
    }
}

// Update verificarProgramacionAlarma to use UTC times
async function verificarProgramacionAlarma() {
    try {
        const scheduleRef = ref(db, "programacion_alarma");
        const snapshot = await get(scheduleRef);

        if (snapshot.exists()) {
            const programacion = snapshot.val();
            
            if (!programacion.activo) return;

            // Get current time in Colombian time zone
            const fechaActual = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }));
            const horaActual = fechaActual.getHours();
            const minutosActuales = fechaActual.getMinutes();

            const [inicioHora, inicioMinuto] = programacion.horaInicio.split(':').map(Number);
            const [finHora, finMinuto] = programacion.horaFin.split(':').map(Number);

            const estadoActual = await obtenerEstadoAlarma();
            let nuevoEstado;

            // Detailed logging for debugging
            console.log("Hora Actual:", horaActual);
            console.log("Minutos Actuales:", minutosActuales);
            console.log("Hora Inicio:", inicioHora);
            console.log("Minuto Inicio:", inicioMinuto);
            console.log("Hora Fin:", finHora);
            console.log("Minuto Fin:", finMinuto);

            // Comprehensive time range checking
            if (inicioHora < finHora) {
                // Simple case: within same day
                nuevoEstado = (horaActual > inicioHora || 
                               (horaActual === inicioHora && minutosActuales >= inicioMinuto)) && 
                              (horaActual < finHora || 
                               (horaActual === finHora && minutosActuales < finMinuto));
            } else if (inicioHora > finHora) {
                // Crossing midnight
                nuevoEstado = (horaActual > inicioHora || 
                               (horaActual === inicioHora && minutosActuales >= inicioMinuto)) || 
                              (horaActual < finHora || 
                               (horaActual === finHora && minutosActuales < finMinuto));
            } else {
                // Edge case: exact same hour
                nuevoEstado = (horaActual === inicioHora && 
                               minutosActuales >= inicioMinuto && 
                               minutosActuales < finMinuto);
            }

            console.log("Estado Actual:", estadoActual);
            console.log("Nuevo Estado:", nuevoEstado);

            // Only change if state is different
            if (estadoActual !== nuevoEstado) {
                const registrosRef = ref(db, "registros");
                await push(registrosRef, {
                    estado: nuevoEstado,
                    fecha: new Date().toISOString(),
                    usuario_id: "Sistema",
                    tipo: "Programación Automática"
                });

                actualizarEstadoVisual();
            }
        }
    } catch (error) {
        console.error("Error al verificar la programación de la alarma:", error);
    }
}
// Evento para manejar la programación
document.getElementById("scheduleForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const horaInicio = document.getElementById("horaInicio").value;
    const horaFin = document.getElementById("horaFin").value;
    
    console.log("Hora Inicio:", horaInicio); // Debugging log
    console.log("Hora Fin:", horaFin);       // Debugging log
    
    await configurarProgramacionAlarma(horaInicio, horaFin);
});

// Ejecutar verificación cada 5 minutos
setInterval(verificarProgramacionAlarma, 5 * 60 * 1000);

// Ejecutar verificación inicial al cargar
verificarProgramacionAlarma();


// Historial de registros
async function mostrarHistorial() {
    try {
        const registrosRef = ref(db, "registros");
        const snapshot = await get(registrosRef);

        if (snapshot.exists()) {
            const registros = snapshot.val();
            let historialHTML = `
                <h3>Historial de Registros</h3>
                <table border="1">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Estado</th>
                            <th>Usuario</th>
                        </tr>
                    </thead>
                    <tbody>`;

            Object.values(registros).forEach((registro) => {
                // Convert UTC timestamp to Colombia local time
                const fechaLocal = new Date(registro.fecha).toLocaleString('es-CO', {
                    timeZone: 'America/Bogota',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                });

                historialHTML += `
                    <tr>
                        <td>${fechaLocal}</td>
                        <td>${registro.estado ? "Activada" : "Desactivada"}</td>
                        <td>${registro.usuario_id}</td>
                    </tr>`;
            });

            historialHTML += "</tbody></table>";
            document.getElementById("historial").innerHTML = historialHTML;
        } else {
            alert("No hay registros en el historial.");
        }
    } catch (error) {
        console.error("Error al consultar el historial:", error);
    }
}


// Manejar el cierre de sesión
function cerrarSesion() {
    sessionStorage.clear();
    window.location.href = "Index.html";
}

// Asignar eventos a los botones
document.getElementById("toggleAlarma").addEventListener("click", cambiarEstadoAlarma);
document.getElementById("consultarHistorial").addEventListener("click", mostrarHistorial);
document.getElementById("logout").addEventListener("click", cerrarSesion);

// Inicializar el estado visual al cargar el panel
actualizarEstadoVisual();
