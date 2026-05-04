<?php
// para inicializar la base de datos

require_once __DIR__ . '/../config/database.php';

$db = new Database();
$pdo = $db->connect();

$sql = "
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    url TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    seo_score INTEGER,
    report_data TEXT, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
";

try {
    $pdo->exec($sql);
    echo "Database initialized successfully";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
