<?php
/**
 * api/get_user.php
 *
 * Devuelve el usuario actualmente autenticado (si existe) usando la sesión PHP.
 * - Método: GET
 * - Respuesta JSON: { logged: true, user: 'usuario' } o { logged: false }
 */
session_start();
header('Content-Type: application/json; charset=utf-8');

if (isset($_SESSION['username'])) {
    echo json_encode(['logged' => true, 'user' => $_SESSION['username']]);
} else {
    echo json_encode(['logged' => false]);
}
exit;
