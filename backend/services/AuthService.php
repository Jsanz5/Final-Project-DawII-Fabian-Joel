<?php
require_once __DIR__ . '/../dao/UserDao.php';

/*
    la clase AuthService se encarga de manejar toda la lógica relacionada con la autenticación de usuarios, como el registro y el inicio de sesión.
    Utiliza el UserDao para interactuar con la base de datos y realizar las operaciones necesarias para crear nuevos usuarios o verificar sus credenciales durante el login.
*/
class AuthService
{
    private $userDao;

    public function __construct()
    {
        // creación de la instancia del UserDao para poder usar sus métodos en esta clase
        $this->userDao = new UserDao();
    }

    // para procesar el registro de un nuevo usuario y devolver un mensaje de éxito o error según corresponda
    public function registerUser($email, $password)
    {
        // valida que el email y la contraseña no estén vacíos
        if (empty($email) || empty($password)) {
            return ["success" => false, "message" => "El email y la contraseña son obligatorios."];
        }
        // valida que el email tenga un formato correcto .
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return ["success" => false, "message" => "El formato del email no es válido."];
        }
        // valida que la contraseña tenga al menos 6 caracteres para garantizar un mínimo de seguridad.
        if (strlen($password) < 6) {
            return ["success" => false, "message" => "La contraseña debe tener al menos 6 caracteres."];
        }

        // verificamos que no exista un usuario ya creado con el mismo email para evitar duplicados en la base de datos
        $existingUser = $this->userDao->getUserByEmail($email);
        if ($existingUser) {
            return ["success" => false, "message" => "Este email ya está registrado."];
        }

        /*
         hasheamos la contraseña con bycrypt para asegurar que no se almacene en texto plano en la base de datos, 
         es decir que aunque alguien acceda a la base de datos, no podrá ver las contraseñas reales.
        */
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);

        // acá se crea en user en la bd y se devuelve un mensaje de éxito o error según corresponda
        try {
            $userId = $this->userDao->createUser($email, $hashedPassword);
            return [
                "success" => true,
                "message" => "Usuario registrado correctamente.",
                "user_id" => $userId
            ];
        } catch (Exception $e) {
            return ["success" => false, "message" => "Error interno al crear el usuario."];
        }
    }

    // para procesar el inicio de sesión de un usuario
    public function loginUser($email, $password)
    {
        // valida que el email y la contraseña no estén vacíos
        if (empty($email) || empty($password)) {
            return ["success" => false, "message" => "El email y la contraseña son obligatorios."];
        }

        // acá miramos que exista un usuario con ese email en la base de datos para luego verificar su contraseña
        $user = $this->userDao->getUserByEmail($email);

        // verificamos que el usuario exista y que la contraseña ingresada coincida con el hash almacenado en la base de datos usando password_verify,
        if (!$user || !password_verify($password, $user['password'])) {
            return ["success" => false, "message" => "¡Credenciales incorrectas!"]; // si no es así, arroja el mensaje de error correspondiente
        }

        // si todo esta ok, da el msj de exito y muetsra los datos del user
        return [
            "success" => true,
            "message" => "¡Login exitoso...!",
            "user" => [
                "id" => $user['id'],
                "email" => $user['email']
            ]
        ];
    }
}
