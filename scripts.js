// Credenciales de conexión a Supabase
const URL_NUBE = "https://esxgquwzsktdeatgytod.supabase.co";
const LLAVE_NUBE = "sb_publishable_iYRdjTYpTs1c9-zxK_Po8Q_xVm4h7nh";

const conexionSupabase = window.supabase.createClient(URL_NUBE, LLAVE_NUBE);

// CONTRASEÑA DEL ADMINISTRADOR
const CONTRASEÑA_ADMIN = "Pastoral2026";

const formAsistencia = document.getElementById('formAutoasistencia');
const mensajeDiv = document.getElementById('mensaje');

// Cambiar entre pestañas del Menú con protección de contraseña
function cambiarPantalla(pantalla) {
    if (mensajeDiv) mensajeDiv.style.display = "none";

    if (pantalla === 'asistencia') {
        desactivarTodasLasPantallas();
        document.getElementById('sec-asistencia').classList.add('active');
        document.getElementById('btnNavAsistencia').classList.add('active');
    } else if (pantalla === 'registro') {
        desactivarTodasLasPantallas();
        document.getElementById('sec-registro').classList.add('active');
        document.getElementById('btnNavRegistro').classList.add('active');
    } else if (pantalla === 'lista') {
        const intentoClave = prompt(" Introduce la contraseña de Administrador para ver la lista historial:");
        
        if (intentoClave === CONTRASEÑA_ADMIN) {
            desactivarTodasLasPantallas();
            document.getElementById('sec-lista').classList.add('active');
            document.getElementById('btnNavLista').classList.add('active');
            cargarHistorialAsistencias(); // Llamamos al historial completo
        } else if (intentoClave !== null) {
            alert("❌ Contraseña incorrecta. No tienes acceso a la lista de asistencia.");
        }
    }
}

function desactivarTodasLasPantallas() {
    document.querySelectorAll('.seccion').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
}

// OBTENER FECHA ACTUAL EN FORMATO LOCAL YYYY-MM-DD
function obtenerFechaLocal() {
    const t = new Date();
    const offset = t.getTimezoneOffset();
    const loct = new Date(t.getTime() - (offset * 60 * 1000));
    return loct.toISOString().split('T')[0];
}

// ==========================================
// ACCIÓN 1: REGISTRARSE (EVITANDO DUPLICADOS POR NOMBRE)
// ==========================================
const formRegistro = document.getElementById('formRegistroJoven');
if (formRegistro) {
    formRegistro.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombreInput = document.getElementById('nombreRegistro').value.trim();
        const edadInput = parseInt(document.getElementById('edadRegistro').value);
        mostrarMensaje("Verificando registro...", "success");

        try {
            const { data: jovenExistente, error: errorBusqueda } = await conexionSupabase
                .from('jovenes')
                .select('codigo_unico')
                .ilike('nombre', nombreInput);

            if (errorBusqueda) throw errorBusqueda;

            if (jovenExistente.length > 0) {
                mostrarMensaje(
                    ` ¡Ya estás registrado/a en la Pastoral!<br>` +
                    `Hola <b>${nombreInput}</b>, tu código único de siempre es:<br>` +
                    `<span style="font-size: 32px; color: #3498db; display:block; margin:10px 0; letter-spacing: 3px;">>>${jovenExistente[0].codigo_unico} <<</span>` +
                    `Úsalo hoy mismo para marcar tu asistencia en la pestaña de Login.`, 
                    "success"
                );
                formRegistro.reset();
                return;
            }

            let codigoGenerado = "";
            let esUnico = false;

            while (!esUnico) {
                codigoGenerado = Math.floor(1000 + Math.random() * 9000).toString();
                const { data } = await conexionSupabase
                    .from('jovenes')
                    .select('codigo_unico')
                    .eq('codigo_unico', codigoGenerado);
                if (data.length === 0) esUnico = true;
            }

            const { error } = await conexionSupabase
                .from('jovenes')
                .insert([{ codigo_unico: codigoGenerado, nombre: nombreInput, edad: edadInput }]);

            if (error) throw error;

            mostrarMensaje(
                ` ¡Inscripción Exitosa!<br><br>` +
                `Bienvenido/a <b>${nombreInput}</b> a la Pastoral. Tu código único es:<br>` +
                `<span style="font-size: 32px; color: #2ecc71; display:block; margin:10px 0; letter-spacing: 3px;"> ${codigoGenerado} </span>` +
                `Guárdalo muy bien para iniciar sesión cada domingo.`, 
                "success"
            );
            
            formRegistro.reset();
        } catch (error) {
            console.error(error);
            mostrarMensaje("Error al procesar: " + error.message, "error");
        }
    });
}

// ==========================================
// ACCIÓN 2: LOGIN Y CONTROL DE ASISTENCIA POR DOMINGO
// ==========================================
if (formAsistencia) {
    formAsistencia.addEventListener('submit', async (e) => {
        e.preventDefault();
        const codigoInput = document.getElementById('codigoAsistencia').value.trim();
        mostrarMensaje("Autenticando...", "success");

        try {
            const { data: joven, error: errorJoven } = await conexionSupabase
                .from('jovenes')
                .select('nombre, codigo_unico')
                .eq('codigo_unico', codigoInput);

            if (errorJoven) throw errorJoven;

            if (joven.length === 0) {
                mostrarMensaje(" Código incorrecto o no registrado. Pídele al administrador tu código.", "error");
                return;
            }

            const datosJoven = joven[0];
            const fechaHoy = obtenerFechaLocal();

            // Bloqueo diario: Busca si ya hay asistencia del muchacho HOY
            const { data: asistenciaExistente } = await conexionSupabase
                .from('asistencia')
                .select('id')
                .eq('joven_codigo', datosJoven.codigo_unico)
                .eq('fecha', fechaHoy);

            if (asistenciaExistente.length > 0) {
                mostrarMensaje(` ¡Hola <b>${datosJoven.nombre}</b>!<br>Ya registraste tu asistencia para este encuentro de hoy. ¡Nos vemos el próximo domingo! `, "success");
                formAsistencia.reset();
                return;
            }

            // Guardar asistencia si no ha marcado hoy
            const { error: errorInsert } = await conexionSupabase
                .from('asistencia')
                .insert([{ joven_codigo: datosJoven.codigo_unico, fecha: fechaHoy }]);

            if (errorInsert) throw errorInsert;

            mostrarMensaje(`>>¡Login Exitoso!<<<br>Asistencia guardada. ¡Bienvenido/a al encuentro, <b>${datosJoven.nombre}</b>! `, "success");
            formAsistencia.reset();
        } catch (error) {
            console.error(error);
            mostrarMensaje("Error de conexión: " + error.message, "error");
        }
    });
}

// ==========================================
// ACCIÓN 3: VER HISTORIAL COMPLETO DE ASISTENCIAS (NUEVO RETOQUE)
// ==========================================
async function cargarHistorialAsistencias() {
    const listaUl = document.getElementById('listaUsuarios');
    if (!listaUl) return;
    
    listaUl.innerHTML = "<li>Cargando historial completo desde la nube...</li>";

    try {
        // RETOQUE CLAVE: Quitamos el filtro ".eq('fecha', fechaHoy)" para traer TODOS los domingos guardados
        // Y usamos ".order('fecha', { ascending: false })" para que los domingos más recientes salgan arriba
        const { data, error } = await conexionSupabase
            .from('asistencia')
            .select(`
                fecha,
                jovenes ( nombre, edad )
            `)
            .order('fecha', { ascending: false })
            .order('id', { ascending: false });

        if (error) throw error;

        listaUl.innerHTML = ""; 

        if (data.length === 0) {
            listaUl.innerHTML = `<p class="sin-datos">No hay ninguna asistencia registrada en el sistema todavía.</p>`;
            return;
        }

        data.forEach(item => {
            if (item.jovenes) {
                const li = document.createElement('li');
                
                // Formateamos la fecha para que se lea más amigable
                // Si el registro es de un domingo pasado, ahí quedará guardado e impreso en pantalla
                li.innerHTML = `
                    <div>
                        <span> ${item.jovenes.nombre}</span>
                        <br><small style="color: #7f8c8d; font-weight: bold;"> Encuentro: ${item.fecha}</small>
                    </div>
                    <span class="id-tag" style="background-color: #f1c40f; color: #fff;">${item.jovenes.edad} años</span>
                `;
                listaUl.appendChild(li);
            }
        });

    } catch (error) {
        console.error(error);
        listaUl.innerHTML = `<li style="border-left: 5px solid #e74c3c;">Error al cargar datos: ${error.message}</li>`;
    }
}

function mostrarMensaje(texto, tipo) {
    if (!mensajeDiv) return;
    mensajeDiv.innerHTML = texto;
    mensajeDiv.className = tipo;
    mensajeDiv.style.display = "block";
}
