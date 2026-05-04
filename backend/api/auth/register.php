<?php
// Ruta: backend/api/auth/register.php

// CORS seguro: Solo permitir requests del mismo servidor
$allowedOrigins = ['http://localhost', 'http://localhost:8000', 'http://127.0.0.1', 'http://127.0.0.1:8000'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: " . $origin);
}
// Permitir peticiones desde cualquier origen (CORS) - Muy útil para desarrollo
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

require_once '../../services/AuthService.php';

// Solo aceptamos peticiones POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Método no permitido. Usa POST."]);
    exit;
}

// Obtenemos los datos enviados (soporta tanto formularios normales como JSON)
$data = json_decode(file_get_contents("php://input"), true) ?: $_POST;

$email = $data['email'] ?? null;
$password = $data['password'] ?? null;

// Instanciamos el servicio y ejecutamos la lógica
$authService = new AuthService();
$result = $authService->registerUser($email, $password);

// Respondemos según el resultado del servicio
if ($result['success']) {
    http_response_code(201); // 201 = Creado
    echo json_encode([
        "status" => "success",
        "message" => $result['message'],
        "user_id" => $result['user_id']
    ]);
} else {
    http_response_code(400); // 400 = Error de petición
    echo json_encode([
        "status" => "error",
        "message" => $result['message']
    ]);
}
