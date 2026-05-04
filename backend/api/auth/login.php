<?php
// Ruta: backend/api/auth/login.php

// CORS seguro: Solo permitir requests del mismo servidor
$allowedOrigins = ['http://localhost', 'http://localhost:8000', 'http://127.0.0.1', 'http://127.0.0.1:8000'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: " . $origin);
}
// Cabeceras CORS y configuración de JSON
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

require_once '../../services/AuthService.php';

// Solo aceptamos POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Método no permitido. Usa POST."]);
    exit;
}

// Obtenemos los datos (ya sea por JSON o formulario)
$data = json_decode(file_get_contents("php://input"), true) ?: $_POST;

$email = $data['email'] ?? null;
$password = $data['password'] ?? null;

// Instanciamos el servicio y ejecutamos la lógica de login
$authService = new AuthService();
$result = $authService->loginUser($email, $password);

// Respondemos según el resultado
if ($result['success']) {
    http_response_code(200); // 200 = Todo OK
    echo json_encode([
        "status" => "success",
        "message" => $result['message'],
        "data" => $result['user'] // Pasamos los datos para que el frontend los guarde
    ]);
} else {
    http_response_code(401); // 401 = No Autorizado
    echo json_encode([
        "status" => "error",
        "message" => $result['message']
    ]);
}
