<?php
// permite que el frontend en localhost pueda hacer requests a este endpoint sin problemas de CORS
$allowedOrigins = ['http://localhost', 'http://localhost:8000', 'http://127.0.0.1', 'http://127.0.0.1:8000'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: " . $origin);
}
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

require_once '../../dao/AuditDao.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // declaro y obtengo los parámetros de la query string
    $userId = $_GET['user_id'] ?? null;
    $limit = $_GET['limit'] ?? 50;
    $offset = $_GET['offset'] ?? 0;

    // verificar que user_id exista
    if (empty($userId)) {
        http_response_code(400);
        echo json_encode([
            "status" => "error",
            "message" => "user_id es requerido"
        ]);
        exit;
    }

    // valida Tipos de datos
    if (!is_numeric($userId) || !is_numeric($limit) || !is_numeric($offset)) {
        http_response_code(400);
        echo json_encode([
            "status" => "error",
            "message" => "Parámetros inválidos"
        ]);
        exit;
    }


    try {
        $auditDao = new AuditDao();

        // Obtener auditorías del usuario
        $audits = $auditDao->getAuditsByUser($userId);

        // Procesar datos para retornar
        $processedAudits = [];

        foreach ($audits as $audit) {
            // Parsear report_data si es string JSON
            $reportData = $audit['report_data'];
            if (is_string($reportData)) {
                try {
                    $reportData = json_decode($reportData, true);
                } catch (Exception $e) {
                    $reportData = [];
                }
            }

            $processedAudits[] = [
                'id' => (int)$audit['id'],
                'url' => $audit['url'],
                'seo_score' => $audit['seo_score'] !== null ? (int)$audit['seo_score'] : null,
                'status' => $audit['status'],
                'report_data' => $reportData,
                'created_at' => $audit['created_at'],
                'has_results' => $audit['status'] === 'completed' && $audit['seo_score'] !== null
            ];
        }

        // Aplicar paginación
        $paginatedAudits = array_slice($processedAudits, $offset, $limit);
        $totalCount = count($processedAudits);

        http_response_code(200);
        echo json_encode([
            "status" => "success",
            "data" => $paginatedAudits,
            "pagination" => [
                "total" => $totalCount,
                "limit" => (int)$limit,
                "offset" => (int)$offset,
                "has_more" => ($offset + $limit) < $totalCount
            ]
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            "status" => "error",
            "message" => "Error al obtener historial: " . $e->getMessage()
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode([
        "status" => "error",
        "message" => "Método no permitido. Usa GET."
    ]);
}
