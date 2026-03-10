<?php
require __DIR__ . '/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

use App\Config\Database;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

try {
    echo "--- Testing Database ---\n";
    $db = Database::getConnection();
    $stmt = $db->query("SELECT COUNT(*) as count FROM productos");
    $res = $stmt->fetch();
    echo "Products in DB: " . $res['count'] . "\n";

    $stmt = $db->query("SELECT * FROM clientes LIMIT 1");
    $cliente = $stmt->fetch();
    if ($cliente) {
        echo "Found client: " . $cliente['nombre'] . " (" . $cliente['numero'] . ")\n";
    }

    echo "--- Testing JWT ---\n";
    $secret = $_ENV['JWT_SECRET'];
    $payload = ['id' => 1, 'role' => 'client', 'iat' => time()];
    $token = JWT::encode($payload, $secret, 'HS256');
    echo "Generated Token: " . substr($token, 0, 20) . "...\n";
    $decoded = JWT::decode($token, new Key($secret, 'HS256'));
    echo "Decoded OK. Role: " . $decoded->role . "\n";

    echo "--- All basic checks passed ---\n";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
