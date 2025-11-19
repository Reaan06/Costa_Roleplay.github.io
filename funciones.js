/*
    funciones.js
    - Propósito: comportamientos del frontend (navegación entre secciones, UI, generador de
        partículas, manejo de formularios y el sistema de "libro" para la normativa).
    - Estructura: este archivo está organizado en secciones con separadores (Navegación,
        Partículas, Login/Registro, Normativa, etc.).
    - Dependencias: las interacciones con el servidor usan `api/*.php` (login/register/get_user/logout).
        Asegúrate de servir el sitio desde un servidor (no `file://`) para que las llamadas fetch funcionen.
    - Seguridad: la validación principal ocurre en el servidor; el cliente realiza validaciones UX.
*/

// ===== Navegación entre secciones =====
// Función para mostrar/ocultar secciones en `index.html`.
// Nota: al separar páginas, muchas interacciones de login se hacen en páginas independientes.
function mostrarSeccion(idSeccion) {
    // Ocultar todas las secciones
    const secciones = document.querySelectorAll('.seccion');
    secciones.forEach(seccion => {
        seccion.classList.remove('activa');
    });

    // Mostrar la sección seleccionada
    const seccionActual = document.getElementById(idSeccion);
    if (seccionActual) {
        seccionActual.classList.add('activa');
        window.scrollTo(0, 0);
    }

    // Cerrar menú hamburguesa si está abierto
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.querySelector('.nav-menu');
    if (hamburger && navMenu) {
        hamburger.classList.remove('activo');
        navMenu.classList.remove('activo');
    }
}

// ===== Menú Hamburguesa =====
document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.querySelector('.nav-menu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('activo');
            navMenu.classList.toggle('activo');
        });

        // Cerrar menú al hacer click en un enlace
        const navLinks = navMenu.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                hamburger.classList.remove('activo');
                navMenu.classList.remove('activo');
            });
        });
    }

    // Crear partículas en el hero (si el contenedor existe en la página)
    generarParticulas();

    // Cerrar modal de conceptos al hacer click fuera
    const modal = document.getElementById('modalConceptos');
    if (modal) {
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                cerrarDetalleConcepto();
            }
        });
    }
});

// ===== Login / Registro (páginas separadas) =====
// Cuando la página actual contiene un formulario de login/registro, se le añaden
// los handlers adecuados. Los formularios usan las APIs en `api/*.php`.
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const btnLogout = document.getElementById('btnLogout');
    const btnLogoutProfile = document.getElementById('btnLogoutProfile');
    const userArea = document.getElementById('userArea');
    const userGreeting = document.getElementById('userGreeting');

    // Actualizar estado de login en la UI (barra de navegación)
    function updateLoginStateFromServerUI() {
        fetch('api/get_user.php', { credentials: 'same-origin' })
        .then(r => r.json())
        .then(data => {
            if (data && data.logged) {
                if (userArea) userArea.style.display = 'flex';
                if (userGreeting) userGreeting.textContent = `Hola, ${data.user}`;
            } else {
                if (userArea) userArea.style.display = 'none';
                if (userGreeting) userGreeting.textContent = '';
            }
        })
        .catch(err => {
            console.warn('No se pudo comprobar sesión en servidor', err);
        });
    }

    // Handler para formulario de login (página login.html)
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const user = (loginForm.loginUser && loginForm.loginUser.value) ? loginForm.loginUser.value.trim() : '';
            const pass = (loginForm.loginPass && loginForm.loginPass.value) ? loginForm.loginPass.value : '';
            if (!user || !pass) { alert('Ingresa usuario y contraseña'); return; }

            fetch('api/login.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ user, pass }),
                credentials: 'same-origin'
            })
            .then(r => r.json())
            .then(data => {
                if (data && data.success) {
                    // Redirigir al perfil o a la página inicio
                    window.location.href = 'profile.html';
                } else {
                    alert(data.message || 'Credenciales inválidas');
                }
            })
            .catch(err => { console.error(err); alert('Error de conexión'); });
        });
    }

    // Handler para formulario de registro (página register.html)
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const user = (registerForm.regUser && registerForm.regUser.value) ? registerForm.regUser.value.trim() : '';
            const pass = (registerForm.regPass && registerForm.regPass.value) ? registerForm.regPass.value : '';
            const pass2 = (registerForm.regPass2 && registerForm.regPass2.value) ? registerForm.regPass2.value : '';
            const msgEl = document.getElementById('registerMessage');

            if (!user || !pass || !pass2) { if (msgEl) msgEl.textContent = 'Completa todos los campos'; return; }
            if (pass !== pass2) { if (msgEl) msgEl.textContent = 'Las contraseñas no coinciden'; return; }

            fetch('api/register.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ user, pass }),
                credentials: 'same-origin'
            })
            .then(r => r.json())
            .then(data => {
                if (data && data.success) {
                    if (msgEl) { msgEl.style.color = 'lightgreen'; msgEl.textContent = 'Cuenta creada. Redirigiendo al inicio de sesión...'; }
                    setTimeout(() => window.location.href = 'login.html', 1200);
                } else {
                    if (msgEl) { msgEl.style.color = 'salmon'; msgEl.textContent = data.message || 'Error al crear cuenta'; }
                }
            })
            .catch(err => { console.error(err); if (msgEl) msgEl.textContent = 'Error de conexión'; });
        });
    }

    // Logout (desde barra o perfil)
    function doLogoutAndRedirect() {
        fetch('api/logout.php', { method: 'POST', credentials: 'same-origin' })
        .then(r => r.json())
        .then(() => {
            // Si estamos en profile.html, redirigir a login
            if (window.location.pathname.endsWith('profile.html')) {
                window.location.href = 'login.html';
            } else {
                // actualizar UI
                updateLoginStateFromServerUI();
            }
        })
        .catch(err => { console.error(err); updateLoginStateFromServerUI(); });
    }

    if (btnLogout) btnLogout.addEventListener('click', doLogoutAndRedirect);
    // El botón 'btnLogoutProfile' puede existir en profile.html; ya se obtuvo arriba si existe.
    if (typeof btnLogoutProfile !== 'undefined' && btnLogoutProfile) btnLogoutProfile.addEventListener('click', doLogoutAndRedirect);

    // Si estamos en profile.html, cargar datos de usuario
    if (document.getElementById('profileBox')) {
        fetch('api/get_user.php', { credentials: 'same-origin' })
        .then(r => r.json())
        .then(data => {
            if (data && data.logged) {
                document.getElementById('profileGreeting').textContent = `Bienvenido, ${data.user}`;
                document.getElementById('profileInfo').textContent = `Usuario conectado: ${data.user}`;
            } else {
                // No autenticado: redirigimos a login
                window.location.href = 'login.html';
            }
        })
        .catch(err => { console.error(err); window.location.href = 'login.html'; });
    }

    // Actualizar estado de UI en la barra si existe
    updateLoginStateFromServerUI();
});

// ===== Generador de Partículas =====
function generarParticulas() {
    const particulasContainer = document.getElementById('particulas');
    if (!particulasContainer) return;

    for (let i = 0; i < 50; i++) {
        const particula = document.createElement('div');
        particula.className = 'particula';
        
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * window.innerHeight;
        const delay = Math.random() * 5;
        const duration = 15 + Math.random() * 10;
        
        particula.style.left = x + 'px';
        particula.style.top = y + 'px';
        particula.style.animation = `flotar ${duration}s linear ${delay}s infinite`;
        
        particulasContainer.appendChild(particula);
    }
}

// ===== Tabs de Normativa =====
function mostrarTab(idTab) {
    // Ocultar todos los tabs
    const tabs = document.querySelectorAll('.tab-contenido');
    tabs.forEach(tab => {
        tab.classList.remove('activo');
    });

    // Desactivar todos los botones
    const botones = document.querySelectorAll('.tab-btn');
    botones.forEach(boton => {
        boton.classList.remove('activo');
    });

    // Mostrar el tab seleccionado
    const tabActual = document.getElementById(idTab);
    if (tabActual) {
        tabActual.classList.add('activo');
    }

    // Activar el botón correspondiente
    event.target.classList.add('activo');
}

// ===== Envío de Formulario =====
function enviarMensaje(event) {
    event.preventDefault();
    
    // Obtener los valores del formulario
    const nombre = event.target.querySelector('input[type="text"]').value;
    const email = event.target.querySelector('input[type="email"]').value;
    const mensaje = event.target.querySelector('textarea').value;

    // Validar que no estén vacíos
    if (!nombre || !email || !mensaje) {
        alert('Por favor, completa todos los campos');
        return;
    }

    // Mostrar confirmación
    alert(`¡Gracias ${nombre}! Tu mensaje ha sido enviado. Te contactaremos pronto.`);
    
    // Limpiar formulario
    event.target.reset();
}

// ===== Conceptos de Rol Modal =====
const conceptosRolMTA = {
    roleplay: {
        titulo: '¿Qué es el Roleplay?',
        contenido: `
            <div class="concepto-detalle">
                <h2>¿Qué es el Roleplay?</h2>
                <p>El roleplay es la interpretación de un personaje dentro de un mundo virtual. En Costa Roleplay, no juegas como tú mismo, sino como un personaje que creas con su propia historia, personalidad, objetivos y características.</p>
                
                <p><strong>Aspectos clave:</strong></p>
                <ul>
                    <li><strong>Interpretación:</strong> Debes actuar como tu personaje en todo momento dentro del servidor</li>
                    <li><strong>Inmersión:</strong> Crea una historia coherente y real para tu personaje</li>
                    <li><strong>Interacción:</strong> Comunícate y actúa basándote en lo que tu personaje sentiría y haría</li>
                    <li><strong>Realismo:</strong> Tus acciones deben tener sentido en el contexto del mundo de rol</li>
                </ul>

                <p><strong>Objetivos del Roleplay:</strong></p>
                <ul>
                    <li>Crear historias emocionantes y memorable</li>
                    <li>Fomentar la creatividad y la imaginación</li>
                    <li>Construir una comunidad de jugadores conectados</li>
                    <li>Disfrutar de una experiencia inmersiva única</li>
                </ul>
            </div>
        `
    },
    'ic-ooc': {
        titulo: 'IC vs OOC',
        contenido: `
            <div class="concepto-detalle">
                <h2>IC vs OOC: Fundamentos Esenciales</h2>
                <p>La separación entre IC (In Character) y OOC (Out Of Character) es uno de los conceptos más importantes en el roleplay.</p>
                
                <p><strong>IC (In Character):</strong></p>
                <ul>
                    <li>Todo lo que tu personaje dice, hace y experimenta en el mundo de rol</li>
                    <li>La perspectiva y conocimiento de tu personaje</li>
                    <li>Acciones y diálogos basados en la historia de tu personaje</li>
                    <li>Lo que sucede dentro del universo de juego</li>
                </ul>

                <p><strong>OOC (Out Of Character):</strong></p>
                <ul>
                    <li>Comunicación entre jugadores (no entre personajes)</li>
                    <li>Problemas técnicos, consultas sobre reglas, organización</li>
                    <li>Información que tu personaje NO conoce en el juego</li>
                    <li>No se usa para hacer preguntas sobre algo IC</li>
                </ul>

                <p><strong>Ejemplo:</strong></p>
                <ul>
                    <li>IC: ¿Hoy vamos a hacer carreras? </li>
                    <li>OOC: ((¿A qué hora es el evento? Me desconecté))</li>
                </ul>
            </div>
        `
    },
    'uso-del-/me-y-/do': {
        titulo: 'Uso del /me y /do',
        contenido: `
            <div class="concepto-detalle">
                <h2> ME y DO: Qué es y cómo debo usarlo</h2>
                <p>El /me se usa para describir una accion de tu personaje por ejemplo, cuando yo voy a ponerme el cinturon en mi vehiculo tengo que poner /me hagarraria el cinturon y lo abrocharia alrededor de su pecho, esto es un ejemplo que se podria utilizar en un vehiculo.</p>
                <p>El /do se usa para describir una situacion o entorno en el que se encuentra tu personaje, por ejemplo, si yo estoy en un lugar oscuro y quiero describirlo a los demas jugadores tengo que poner /do El lugar es oscuro y no se ve nada, esto es un ejemplo de como se utiliza el /do.</p>
                
                <h2>Cosas que debes evitar al usarlos</h2>

                <p>Debes evitar usar /me para acciones imposibles o para controlar lo que otros jugadores hacen, y también evitar escribir pensamientos que nadie puede ver. Con /do, evita describir cosas que no son visibles, inventar resultados que afectan a otros sin dejarles responder o usarlo para acciones que van en /me. En ambos casos, evita exagerar, trolear o escribir cosas que no aporten al rol.</p>

                <p><strong>Ejemplos de /me:</strong></p>
                <ul>
                    <li>/me se lleva la mano a la frente después del golpe y parpadea un par de veces tratando de entender qué pasó.</li>
                    <li>/me mete la mano al bolsillo temblando un poco y saca el celular como puede.</li>
                    <li>/me llevaria su diestra a su cintura levantaria la camisa y sacaria el arma.</li>
                    <li>/me tira del cinturón y lo engancha, esta vez asegurándose de que haga “clic”</li>
                </ul>

                <p><strong>Ejemplos de /do:</strong></p>
                <ul>
                    <li>/do El carro habría quedado con el capó doblado y un humito sospechoso saliendo.</li>
                    <li>/do El celular estaría encendido, pero con varias notificaciones de “sin señal”.</li>
                    <li>/do El arma quedaría visible en su mano, pero se notaría que aún está nervioso por el choque.</li>
                    <li>/do El cinturón quedaría bien ajustado, aunque un poco torcido por el golpe.</li>
                </ul>
            </div>
        `
    },
    entornos: {
        titulo: 'Entornos en Rol',
        contenido: `
            <div class="concepto-detalle">
                <h2>Uso de Entornos</h2>
                <p>El comando /entorno se usa para informar a los demás jugadores, y a los jugadores cercanos, de lo que está ocurriendo en una escena, siempre que sea algo:</p>
                
                <h2>Caracteristicas de los Entornos</h2>
                
                <p>Un /entorno debe incluir de forma obligatoria cuántas personas participan, qué vehículos están involucrados, qué armas son visibles o se escuchan, hacia dónde se dirigen y cómo va vestida cada persona. Toda esta información debe ser general, visible y entendible para cualquier jugador cercano, sin inventar datos imposibles ni usar detalles que solo el personaje sabría. El /entorno debe describir lo que cualquiera podría notar a simple vista o por sonido, manteniendo coherencia con la escena y aportando información útil para el rol. (Los Entornos casi siempre se usan en roles de carteles ilegales o en roles de el gobierno)</p>

                <p><strong>Situaciones para usar los entornos</strong></p>
                <ul>
                    <li>Pobos</li>
                    <li>Persecuciones</li>
                    <li>Tiroteos</li>
                    <li>Grupo de personas actuando de forma sospechosa</li>
                    <li>Presencia policial</li>
                    <li>Vehículos involucrados en actividades ilegales</li>
                </ul>

        `
    },
    'conceptos-para-sanciones': {
        titulo: 'Conceptos Para Sanciones',
        contenido: `
            <div class="concepto-detalle">
                <h2>Conceptos Para Sanciones</h2>
                <p>Aqui podras ver todos los conceptos de rol por los que te podran sancionar dentro del servidor</p>
                
                <p><strong>Conceptos de rol basico por los que podras ser sancionado</strong></p>
                <ul>
                    <li>DM: (DeathMatch)Matar A un Usuario Sin Razon Algun</li>
                    <li>MG (metagaming): Es cuando un jugador usa de manera directa y evidente información que su personaje no debería saber, ya que fue obtenida fuera del juego (OOC, Out of Character). Es una infracción grave porque rompe la inmersión y arruina el roleplay</li>
                    <li>PG: (PowerGaming)Hacer Algo Que en la Vida Real no Harias</li>
                    <li>RK: (RevengeKill)Matar Por venganza despues de Haber Muerto en un Rol</li>
                    <li>TK: (TeamKill)Matar a Miembros de Tu Faccion</li>
                    <li>CK:(CarKill)Matar/Atropellar Con Un Auto.</li>
                    <li>HK: (HelicopterKill): Matar Con las Helices De Un Helicoptero</li>
                    <li>NA: (NoobAbusser) Abusar de un Novato</li>
                    <li>BH: (Bunny Hop)Correr y Saltar Para Llegar a Un Lugar Sin Que el PJ De Canse</li>
                    <li>ZZ: (ZigZag) Correr en ZigZag,Cuando para evitar que te disparen</li>
                    <li>CJ: (CarJacked)Robar Auto Sin Rol Alguno</li>
                    <li>BPC: (BadParkingCar) Estacionar Mal Un Auto, Ya sea En Medio de la Carretera</li>
                    <li>BD: (BadDriving) Manejar Mal, Por el Carril Contrario o por la Cera</li>
                    <li>DB: (DriveBy) Matar o Herir Con Una Arma desde el Auto</li>
                    <li>SK: (SpawnKill) Matar Donde Aparece el PJ</li>
                    <li>IHQ: (InvasionHeadQuarters) Invadir Faccion Con menos de 4 Miembros</li>
                    <li>HQ: (HeadQuarters) Es Base De Una Faccion</li>
                    <li>NRE: No Rolear Entorno</li>
                    <li>NRA: No Rolear Arma</li>
                    <li>NRH: No Rolear Herida</li>
                    <li>NRC: No Rolear Choque</li>
                    <li>TTO: Matar PJ Que esta Agonizando</li>
                    <li>PG2: (Evasión de rol) Evadir rol, cortando por /b o cambiarse de PJ</li>
                    <li>AVP: (Afk en via publica) Estar afk en una via publica dañando el rol de la gente</li>
                    <li>MUD: (Mal uso de /duda) Mal usar el /duda</li>
                    <li>NRR2: No rolear reparacion</li>
                    <li>MUDVT: Mal Usar Vehiculos de trabajo</li>
                    <li>PI : Provocacion Innecesaria</li>
                    
                    
                    <p><strong>Conceptos de rol avanzado por los que podras ser sancionado</strong></p>

                    <li>AIOOC: (Insultar a un Miembro del Staff de manera OOC)</li>
                    <li>AA2: (Animacion Abuse) Abusar de una animacion</li>
                    <li>AHQ: Abusar de tu facción (escapando de la policía, meterte a tu HQ)</li>
                    <li>AR: (Anti Rol) Persona/Usuario que no les gusta aceptar un rol</li>
                    <li>CA: (Command Abuser) Abusar de un comando del servidor</li>
                    <li>EK: (Evadir Kill): Es desconectarse o usar un comando que te beneficie</li>
                    <li>FK: (Free Kill) Matar a muchas personas sin razon</li>
                    <li>FA: (Faccion Abuse) Abusar de una faccion</li>
                    <li>HQ: (HeadQuarters) Es Base De Una Faccion</li>
                    <li>ICN: (Incumplimiento de normativa) Incumplir la normativa del servidor</li>
                    <li>IHQ: (InvasionHeadQuarters) Invadir Faccion Con menos de 4 Miembros</li>
                    <li>IOOC: (Insultar a alguien de manera OOC)</li>
                    <li>AIOOC: (Insultar a un staff de manera OOC)</li>
                    <li>IDS: (Interferir en dinamica del servidor)</li>
                    <li>LA2: (Lider Abuser) Abusar del Lider de una Faccion</li>
                    <li>LA: (Lag Abuser) Abusar del Lag de servidor</li>
                    <li>MA: (Mal Anuncio) Mal usar /sms 444 O anuncios</li>
                    <li>MG2: Es un uso más sutil e indirecto de esa información. El jugador actúa influenciado por lo que sabe fuera del juego, pero sin hacerlo de manera tan obvia. Aunque no toma acción directa, sigue usando esa información de forma que afecta el desarrollo del roleplay.</li>
                    <li>MK: (Meta Kill) Es cuando matas a una persona IC por motivos OOC</li>
                    <li>RSL: Rambo sin licencia</li>
                    <li>TA: ( Tazer Abuser ) Abusar del /tazer</li>
                    <li>NVVPJ : No valorar Vida De Tu personaje</li>


                    <p><strong>Tiempo de sancion de todos los conceptos</strong></p>

                    <li>DM (DeathMatch): 60 minutos</li>
                    <li>MG (Metagaming): 45 minutos</li>
                    <li>PG (PowerGaming): 40 minutos</li>
                    <li>RK (RevengeKill): 70 minutos</li>
                    <li>TK (TeamKill): 60 minutos</li>
                    <li>CK (CarKill): 50 minutos</li>
                    <li>HK (HelicopterKill): 60 minutos</li>
                    <li>NA (NoobAbusser): 50 minutos</li>
                    <li>AA (AdminAbusser): 90 minutos</li>
                    <li>ZZ (ZigZag): 25 minutos</li>
                    <li>BH (Bunny Hop): 20 minutos</li>
                    <li>CJ (CarJacked sin rol): 35 minutos</li>
                    <li>BPC (Bad Parking Car): 15 minutos</li>
                    <li>BD (Bad Driving): 20 minutos</li>
                    <li>DB (DriveBy): 60 minutos</li>
                    <li>SK (SpawnKill): 70 minutos</li>
                    <li>IHQ (Invadir HQ con menos de 4): 80 minutos</li>
                    <li>NRE (No rolear entorno): 25 minutos</li>
                    <li>NRA (No rolear arma): 30 minutos</li>
                    <li>IOOC (Insultar OOC): 40 minutos</li>
                    <li>AIOOC (Insultar a staff OOC): 60 minutos</li>
                    <li>ICN (Incumplimiento de normativa): 30 minutosNRH (No rolear herida): 30 minutos<li>
                    <li>LA2 (Líder Abuser): 70 minutos</li>
                    <li>AHQ (Abusar del HQ): 50 minutos</li>
                    <li>CA (Command Abuser): 45 minutos</li>
                    <li>AA2 (Animación Abuse): 35 minutos</li>
                    <li>LA (Lag Abuser): 40 minutos</li>
                    <li>NRC (No rolear choque): 25 minutos</li>
                    <li>TTO (Matar a un PJ agonizando): 50 minutos</li>
                    <li>PG2 (Evasión de rol): 60 minutos</li>
                    <li>AR (Anti Rol / no aceptar rol): 40 minutos</li>
                    <li>MG2 (Metagaming sutil): 35 minutos</li>
                    <li>EK (Evadir Kill / desconectarse para evitar muerte): 60 minutos</li>
                    <li>FK (Free Kill): 70 minutos</li>
                    <li>HK (Helicopter Kill): 60 minutos</li>
                    <li>HQ (HeadQuarters - mal uso): 30 minutos</li>
                    <li>AVP (AFK en vía pública): 10 minutos</li>
                    <li>MA (Mal Anuncio / spam en /sms 444): 20 minutos</li>                   
                    <li>IHQ (Invadir HQ con menos de 4): 80 minutos</li>
                    </div>
                </ul>
        `
    },
    'conceptos-para-baneos': {
        titulo: 'Conceptos Para Baneos',
        contenido: `
            <div class="concepto-detalle">
                <h2>Conceptos Para Baneos</h2>
                <p>Cuando eres baneado dentro del servidor se te prohibe o se te bloquea por una cantidad de tiempo segun lo que hayas hecho si superas mas de 10 baneos puedes ser baneado por un mes o permanentemente sin posibilidad de apelacion</p>
                
                <p><strong>Baneos Y Tiempo de Baneos</strong></p>

                <ul>
                <li>Acoso/Roles Sensibles: Hombres (192 Horas)= 8 Días</li>
                <li>Mujeres (360 Horas) = 15 Días</li>
                <li>Discriminación/Xenofobia: 48 Horas = 2 Días</li>
                <li>Insulto Masivo A Miembros Del Equipo Administrativo: 48 Horas</li>
                <li>Insulto Máximo Al Servidor: (Baneo Permanente)</li>
                <li>Venta De Objetos IC Con Dinero OOC: (Baneo Permanente)</li>
                <li>Abusar De Un BUG Del Servidor Y No Notificarlo: (Baneo Permanente)</li>
                <li>Abusar De Un BUG Mínimo Del Servidor: (120 Horas)= 5 Días</li>
                <li>Corrupción En La PD Sin Autorización: (96 Horas)= 4 Días</li>
                <li>No pagar Algún Servicio publico ejemplo: (Mecanicos - Medicos) 24 Horas</li>
                <li>IDS ( Interferir Dinámica Del Servidor: 24 H = ( 1 Dia)</li>
                <li>ER (Evadir Rol): Baneo De 96 H = ( 4 Dias )</li>
                <li>Acumulación 5 Sanciones IC: 48 H = ( 2 Dias )</li>
                <li>Acumulación 7 Sanciones IC: 72 H ( 3 Dias )</li>
                <li>Acumulación 10 Sanciones IC: 120 H + ( Eliminación 50% Dinero )</li>
                <li>Preferir Sanción  Para No seguir ROL = 48 Horas = ( 2 Dias )</li>
                <li>Vender Armas De PD: Baneo De 24H = ( 1 Dia )</li>
                <li>Bug de Mira (Ghospict): 168 Horas = (1 Semana)  </li>
                <li>FA (Faccion Abuser): Dependiento 168 Horas = (1 Semana) o Permanente</li>
                </ul>

            </div>
        `
    }
};

function abrirDetalleConcepto(concepto) {
    const modal = document.getElementById('modalConceptos');
    const conceptoDetalle = document.getElementById('conceptoDetalle');
    
    if (conceptosRolMTA[concepto]) {
        conceptoDetalle.innerHTML = conceptosRolMTA[concepto].contenido;
        modal.classList.add('activo');
        document.body.style.overflow = 'hidden';
    }
}

function cerrarDetalleConcepto() {
    const modal = document.getElementById('modalConceptos');
    modal.classList.remove('activo');
    document.body.style.overflow = 'auto';
}

// ===== Detección de Scroll para Efectos =====
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    const accentRGB = getComputedStyle(document.documentElement).getPropertyValue('--color-accent-rgb') || '0,184,148';
    if (window.scrollY > 50) {
        navbar.style.boxShadow = `0 2px 30px rgba(${accentRGB}, 0.2)`;
    } else {
        navbar.style.boxShadow = `0 2px 20px rgba(${accentRGB}, 0.1)`;
    }
});

// ===== Animación de elementos al aparecer =====
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, {
    threshold: 0.1
});

document.addEventListener('DOMContentLoaded', function() {
    const elementos = document.querySelectorAll('.columna, .tarjeta-concepto, .info-item');
    elementos.forEach(elemento => {
        elemento.style.opacity = '0';
        elemento.style.transform = 'translateY(20px)';
        elemento.style.transition = 'all 0.5s ease-out';
        observer.observe(elemento);
    });
});

// ===== Sistema de Libro de Normativa =====
let paginaActual = 0;
let paginas = [];

function buildPaginasFromDOM() {
    const cont = document.getElementById('datos-paginas');
    paginas = [];
    if (!cont) return;
    const items = cont.querySelectorAll(':scope > div');
    items.forEach(item => {
        const titulo = item.dataset.titulo || 'Sin título';
        const numero = parseInt(item.dataset.numero) || 0;
        // Preferir data-contenido; si no existe, usar innerHTML
        const contenido = item.dataset.contenido !== undefined ? item.dataset.contenido : item.innerHTML;
        paginas.push({ titulo, numero, contenido });
    });
}

function actualizarPagina() {
    if (!paginas || paginas.length === 0) return;
    const pagina = paginas[paginaActual] || paginas[0];
    const tituloEl = document.getElementById('titulo-pagina');
    const numeroEl = document.getElementById('numero-pagina');
    const contenidoEl = document.getElementById('contenido-pagina');
    const indicadorEl = document.getElementById('indicador-pagina');

    if (tituloEl) tituloEl.textContent = pagina.titulo;
    if (numeroEl) numeroEl.textContent = `Pág. ${pagina.numero}`;
    if (contenidoEl) contenidoEl.innerHTML = pagina.contenido;
    if (indicadorEl) indicadorEl.textContent = `${paginaActual + 1} / ${paginas.length}`;

    const btnAnt = document.getElementById('btn-anterior');
    const btnSig = document.getElementById('btn-siguiente');
    if (btnAnt) btnAnt.disabled = paginaActual === 0;
    if (btnSig) btnSig.disabled = paginaActual === paginas.length - 1;

    // Actualizar índice activo
    const botones = document.querySelectorAll('.indice-btn');
    botones.forEach((btn, idx) => {
        if (idx === paginaActual) btn.classList.add('activo'); else btn.classList.remove('activo');
    });
}

function irAPagina(numero) {
    if (!paginas || paginas.length === 0) return;
    if (typeof numero !== 'number') numero = parseInt(numero) || 0;
    if (numero < 0) numero = 0;
    if (numero > paginas.length - 1) numero = paginas.length - 1;
    paginaActual = numero;
    actualizarPagina();
}

function paginaSiguiente() {
    if (!paginas || paginaActual >= paginas.length - 1) return;
    paginaActual++;
    actualizarPagina();
}

function paginaAnterior() {
    if (!paginas || paginaActual <= 0) return;
    paginaActual--;
    actualizarPagina();
}

// Inicializar las páginas cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    buildPaginasFromDOM();
    // Si hay páginas, sincronizar la vista
    if (paginas.length > 0) {
        // Asegurar que el botón indicado por el HTML concuerde
        actualizarPagina();
    }
});
