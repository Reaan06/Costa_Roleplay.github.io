<?php
/**
 * api/logout.php
 *
 * Cierra la sesión del usuario y elimina la cookie de sesión.
 * - Método: POST (se acepta qualsiasi)
 * - Respuesta JSON: { success: true }
 */
session_start();
header('Content-Type: application/json; charset=utf-8');

// Limpiar sesión
$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params['path'], $params['domain'],
        $params['secure'], $params['httponly']
    );
}
session_destroy();

echo json_encode(['success' => true]);
exit;
