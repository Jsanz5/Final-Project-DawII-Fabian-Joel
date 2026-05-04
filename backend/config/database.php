<?php
// backend/config/database.php

class Database
{
    private $pdo;

    public function connect()
    {
        if ($this->pdo == null) {
            try {
                // ruta de la base de datos
                $dbPath = __DIR__ . '/../database/app_data.sqlite';

                $this->pdo = new PDO("sqlite:" . $dbPath);
                $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                $this->pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

                // para que las foreing keys funcionen
                $this->pdo->exec('PRAGMA foreign_keys = ON;');
            } catch (PDOException $e) {
                die("Error de conexión: " . $e->getMessage());
            }
        }
        return $this->pdo;
    }
}
