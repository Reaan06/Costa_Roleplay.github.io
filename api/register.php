<?php
/**
 * api/register.php
 *
 * Inserta un usuario directamente en la tabla usada por MTA (`wcf1_user`).
 * - Método: POST
 * - Parámetros: user, pass, [email]
 *
 * Este endpoint intenta insertar al usuario en `wcf1_user`. Si la tabla
 * tiene columnas adicionales obligatorias puede fallar — en ese caso
 * proporciona la estructura de la tabla para adaptar la inserción.
 */
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$input = $_POST;
if (empty($input)) {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (json_last_error() === JSON_ERROR_NONE) $input = $data;
}

$user = isset($input['user']) ? trim($input['user']) : '';
$pass = isset($input['pass']) ? $input['pass'] : '';
$email = isset($input['email']) ? trim($input['email']) : null;

if ($user === '' || $pass === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Usuario y contraseña requeridos']);
    exit;
}

try {
    // Comprobar existencia en la tabla MTA (wcf1_user)
    $check = $pdo->prepare('SELECT userID FROM wcf1_user WHERE username = ? LIMIT 1');
    $check->execute([$user]);
    if ($check->fetch()) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'Usuario ya existe']);
        exit;
    }

    // MTA suele usar SHA1 para el password en la tabla, usamos el mismo formato
    $passwordHash = sha1($pass);

    // Construir INSERT intentando incluir campos comunes (email, fecha)
    $cols = ['username', 'password'];
    $placeholders = ['?', '?'];
    $params = [$user, $passwordHash];

    // Comprobar columnas de la tabla para decidir si añadimos 'email' o 'registrationDate'
    $desc = $pdo->query('DESCRIBE wcf1_user')->fetchAll(PDO::FETCH_COLUMN);
    if ($email && in_array('email', $desc)) {
        $cols[] = 'email';
        $placeholders[] = '?';
        $params[] = $email;
    }

    // Si existe una columna de fecha de registro, usar NOW() para poblarla
    $regCol = null;
    foreach (['registrationDate', 'registration_date', 'regdate', 'registration_time', 'reg_time'] as $c) {
        if (in_array($c, $desc)) { $regCol = $c; break; }
    }
    if ($regCol) {
        $cols[] = $regCol;
        $placeholders[] = 'NOW()';
    }

    $sql = sprintf('INSERT INTO wcf1_user (%s) VALUES (%s)', implode(', ', $cols), implode(', ', $placeholders));
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    echo json_encode(['success' => true, 'user' => $user]);
    exit;

} catch (PDOException $e) {
    http_response_code(500);
    // No exponer errores sensibles en producción; retornamos un mensaje útil
    echo json_encode([
        'success' => false,
        'message' => 'Error al crear usuario en la tabla MTA. Comprueba la estructura de `wcf1_user`.',
        'debug' => $e->getMessage()
    ]);
    exit;
}

