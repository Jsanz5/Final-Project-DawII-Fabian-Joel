<?php

// permite que el frontend en localhost pueda hacer requests a este endpoint sin problemas de CORS
$allowedOrigins = ['http://localhost', 'http://localhost:8000', 'http://127.0.0.1', 'http://127.0.0.1:8000'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: " . $origin);
}
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET, PUT");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

require_once '../../dao/AuditDao.php';
require_once '../../services/PythonRunner.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $data = json_decode(file_get_contents("php://input"), true) ?: $_POST;

    $userId = $data['user_id'] ?? null;
    $url = $data['url'] ?? null;

    // valida que user_id y url no estén vacíos
    if (empty($userId) || empty($url)) {
        http_response_code(400);
        echo json_encode([
            "status" => "error",
            "message" => "user_id y url son requeridos"
        ]);
        exit;
    }

    // Valida formato de URL
    if (!filter_var($url, FILTER_VALIDATE_URL)) {
        http_response_code(400);
        echo json_encode([
            "status" => "error",
            "message" => "La URL no tiene un formato válido"
        ]);
        exit;
    }

    try {
        $auditDao = new AuditDao();

        // Crea auditoría en estado 'pending'
        $auditId = $auditDao->createAudit($userId, $url, 'pending');

        // Inicia el proceso de scraping en Python
        $pythonRunner = new PythonRunner();
        $pythonRunner->runScraper($auditId, $url);

        http_response_code(201);
        echo json_encode([
            "status" => "success",
            "message" => "Auditoría iniciada",
            "audit_id" => $auditId
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            "status" => "error",
            "message" => "Error al crear la auditoría: " . $e->getMessage()
        ]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {

    // obtiene el resultado d ela auditoria por su id (para mostrar resultados)
    $auditId = $_GET['id'] ?? null;

    if (empty($auditId)) {
        http_response_code(400);
        echo json_encode([
            "status" => "error",
            "message" => "id es requerido"
        ]);
        exit;
    }

    try {
        $auditDao = new AuditDao();
        $audit = $auditDao->getAuditById($auditId);

        if (!$audit) {
            http_response_code(404);
            echo json_encode([
                "status" => "error",
                "message" => "Auditoría no encontrada"
            ]);
            exit;
        }

        http_response_code(200);
        echo json_encode([
            "status" => "success",
            "audit" => $audit
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            "status" => "error",
            "message" => "Error al obtener la auditoría: " . $e->getMessage()
        ]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {

    // put que recibe los resultados de la auditoría desde el scraper de Python y actualiza la base de datos
    $data = json_decode(file_get_contents("php://input"), true);

    $auditId = $data['audit_id'] ?? null;
    $seoScore = $data['seo_score'] ?? null;
    $reportData = $data['report_data'] ?? null;

    if (empty($auditId) || $seoScore === null || empty($reportData)) {
        http_response_code(400);
        echo json_encode([
            "status" => "error",
            "message" => "Se requieren: audit_id, seo_score, report_data"
        ]);
        exit;
    }

    try {
        $auditDao = new AuditDao();

        // Convertir report_data a JSON si es un array
        $reportDataJson = is_array($reportData) ? json_encode($reportData) : $reportData;

        // Actualizar auditoría con los resultados
        $success = $auditDao->updateAudit($auditId, $seoScore, $reportDataJson, 'completed');

        if ($success) {
            http_response_code(200);
            echo json_encode([
                "status" => "success",
                "message" => "Auditoría completada y guardada",
                "audit_id" => $auditId
            ]);
        } else {
            http_response_code(500);
            echo json_encode([
                "status" => "error",
                "message" => "No se pudo actualizar la auditoría"
            ]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            "status" => "error",
            "message" => "Error al actualizar la auditoría: " . $e->getMessage()
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode([
        "status" => "error",
        "message" => "Método no permitido. Usa POST, GET o PU
}T."
    ]);
}
