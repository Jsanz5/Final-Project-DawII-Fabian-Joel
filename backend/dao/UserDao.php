<?php

require_once __DIR__ . '/../config/database.php';

class UserDao
{
    private $pdo;

    // El constructor se encarga de establecer la conexión a la base de datos
    public function __construct()
    {
        $db = new Database();
        $this->pdo = $db->connect();
    }

    // usuario con su email (para verificar si ya existe o para login)
    public function getUserByEmail($email)
    {
        $sql = "SELECT * FROM users WHERE email = :email LIMIT 1";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['email' => $email]);

        return $stmt->fetch();
    }

    // para crear un nuevo usuario en la base de datos y devuelva su ID
    public function createUser($email, $hashedPassword)
    {
        $sql = "INSERT INTO users (email, password) VALUES (:email, :password)";
        $stmt = $this->pdo->prepare($sql);

        $stmt->execute([
            'email' => $email,
            'password' => $hashedPassword
        ]);

        // ID del nuevo usuario creado
        return $this->pdo->lastInsertId();
    }
}
