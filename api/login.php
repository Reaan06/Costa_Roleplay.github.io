<?php
/**
 * api/login.php
 *
 * Endpoint para iniciar sesión desde la web.
 * INTEGRACIÓN CON MTA: valida contra la tabla `wcf1_user` del servidor MTA.
 * 
 * - Método: POST
 * - Parámetros: user, pass
 * - Base de datos: tabla `wcf1_user` del servidor MTA
 * - Respuesta JSON: { success: bool, user?: string, message?: string }
 *
 * Nota de seguridad: en producción usar HTTPS, limitar intentos (rate-limit) y validar entradas.
 * 
 * IMPORTANTE: revisa la columna de contraseña en tu tabla (generalmente `password`) 
 * y el tipo de hash que usa (bcrypt, MD5, SHA1, custom, etc.).
 */
// Asegurar cookies de sesión y políticas básicas antes de iniciar sesión
$secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'domain' => '',
    'secure' => $secure,
    'httponly' => true,
    'samesite' => 'Lax'
]);
session_start();
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// Limitar intentos de login por IP (pequeño mecanismo en memoria vía sesión)
$input = $_POST;
if (empty($input)) {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (json_last_error() === JSON_ERROR_NONE) $input = $data;
}

$user = isset($input['user']) ? trim($input['user']) : '';
$pass = isset($input['pass']) ? $input['pass'] : '';

if ($user === '' || $pass === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Usuario y contraseña requeridos']);
    exit;
}

// Rate limiting básico: 5 intentos cada 5 minutos por dirección IP
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
if (!isset($_SESSION['login_attempts'])) $_SESSION['login_attempts'] = [];
if (!isset($_SESSION['login_attempts'][$ip])) {
    $_SESSION['login_attempts'][$ip] = ['count' => 0, 'first' => time()];
}
$limit = 5; $window = 300; // 5 intentos por 300 segundos
$attempt = &$_SESSION['login_attempts'][$ip];
if ($attempt['count'] >= $limit && (time() - $attempt['first'] < $window)) {
    http_response_code(429);
    echo json_encode(['success' => false, 'message' => 'Demasiados intentos. Intenta de nuevo más tarde.']);
    exit;
}

// Buscar usuario en la tabla wcf1_user (tabla MTA)
// NOTA: ajusta el nombre de columna si en tu tabla es diferente (p. ej. 'password', 'passwordHash', etc.)
$stmt = $pdo->prepare('SELECT userID, username, password FROM wcf1_user WHERE username = ? LIMIT 1');
$stmt->execute([$user]);
$row = $stmt->fetch();

if (!$row) {
    // Registrar intento fallido
    if (time() - $attempt['first'] > $window) { $attempt['count'] = 1; $attempt['first'] = time(); }
    else { $attempt['count']++; }

    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Credenciales inválidas']);
    exit;
}

// Verificar contraseña con SHA1 (como usa MTA)
// MTA almacena las contraseñas con hash SHA1
$passwordValid = (hash('sha1', $pass) === $row['password']);

if (!$passwordValid) {
    // Registrar intento fallido
    if (time() - $attempt['first'] > $window) { $attempt['count'] = 1; $attempt['first'] = time(); }
    else { $attempt['count']++; }

    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Credenciales inválidas']);
    exit;
}

// Login exitoso: almacenar en sesión
$_SESSION['user_id'] = $row['userID'];
$_SESSION['username'] = $row['username'];
session_regenerate_id(true);

// Resetear contador de intentos del IP al hacer login exitoso
$_SESSION['login_attempts'][$ip] = ['count' => 0, 'first' => time()];

echo json_encode(['success' => true, 'user' => $row['username']]);
exit;
