<?php
/**
 * config/db.php
 *
 * Archivo de configuración para la conexión PDO a la base de datos.
 * Rellena las variables de conexión con los datos de tu servidor MySQL/MariaDB.
 * En producción protege este archivo (no lo dejes accesible públicamente) y usa credenciales con permisos limitados.
 */
declare(strict_types=1);

// EDITA estos valores con los datos de tu base de datos
$host = '154.223.16.5';
$port = '22048';
$dbname = 's130_lacosta';
$dbuser = 'u130_Rflx0x8YRO';
$dbpass = '+4smQT+Y7zDsdxjvaQdFM!Be';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

try {
    $pdo = new PDO($dsn, $dbuser, $dbpass, $options);
} catch (PDOException $e) {
    // En caso de error de conexión devolvemos JSON para facilitar debugging desde AJAX
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'error' => 'DB connection error']);
    exit;
}

?>
