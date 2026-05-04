<?php

require_once __DIR__ . '/../config/database.php';

class AuditDao
{
    private $pdo;

    public function __construct()
    {
        $db = new Database();
        $this->pdo = $db->connect();
    }

    // create de una nueva auditoría (inserta un nuevo registro en la tabla audits)
    public function createAudit($userId, $url, $status = 'pending')
    {
        $sql = "INSERT INTO audits (user_id, url, status, created_at) VALUES (:user_id, :url, :status, CURRENT_TIMESTAMP)";
        $stmt = $this->pdo->prepare($sql);

        $stmt->execute([
            'user_id' => $userId,
            'url' => $url,
            'status' => $status
        ]);

        return $this->pdo->lastInsertId();
    }

    // get de una auditoría por su ID (para obtener los resultados después de que el scraping haya terminado)
    public function getAuditById($auditId)
    {
        $sql = "SELECT * FROM audits WHERE id = :id LIMIT 1";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['id' => $auditId]);

        return $stmt->fetch();
    }

    // update (para actualizar el estado, el SEO score y los datos del reporte después del scraping)
    public function updateAudit($auditId, $seoScore = null, $reportData = null, $status = 'completed')
    {
        $sql = "UPDATE audits SET seo_score = :seo_score, report_data = :report_data, status = :status WHERE id = :id";
        $stmt = $this->pdo->prepare($sql);

        return $stmt->execute([
            'id' => $auditId,
            'seo_score' => $seoScore,
            'report_data' => $reportData,
            'status' => $status
        ]);
    }

    // get de todas las auditorías de un usuario (para mostrar el historial de auditorías en el frontend)
    public function getAuditsByUser($userId)
    {
        $sql = "SELECT * FROM audits WHERE user_id = :user_id ORDER BY created_at DESC";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['user_id' => $userId]);

        return $stmt->fetchAll();
    }

    // get de auditorías pendientes (para que el worker de Python pueda obtener las tareas que debe procesar)
    public function getPendingAudits()
    {
        $sql = "SELECT * FROM audits WHERE status = 'pending' ORDER BY created_at ASC";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute();

        return $stmt->fetchAll();
    }
}
