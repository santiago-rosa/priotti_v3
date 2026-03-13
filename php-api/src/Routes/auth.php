<?php

use App\Config\Database;
use Firebase\JWT\JWT;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/** @var \Slim\App $app */

$app->post('/api/auth/login', function (Request $request, Response $response) {
    $data = $request->getParsedBody();
    $numero = $data['numero'] ?? '';
    $cuit = $data['cuit'] ?? '';

    if (empty($numero) || empty($cuit)) {
        $response->getBody()->write(json_encode(['error' => 'Faltan credenciales']));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }

    try {
        $secret = $_ENV['JWT_SECRET'] ?? 'fallback_secret';
        $db = Database::getConnection();

        // Check Login (numero and cuit used as password)
        $stmt = $db->prepare("SELECT id, nombre, numero, cuit, role, porcentajeaumento FROM clientes WHERE numero = ? LIMIT 1");
        $stmt->execute([$numero]);
        $user = $stmt->fetch();

        if (!$user || $user['cuit'] !== $cuit) {
            $response->getBody()->write(json_encode(['error' => 'Credenciales inválidas']));
            return $response->withStatus(401)->withHeader('Content-Type', 'application/json');
        }

        // Update last login (visitas and date)
        $updateStmt = $db->prepare("UPDATE clientes SET fechaUltimoLogin = NOW(), visitas = visitas + 1 WHERE id = ?");
        $updateStmt->execute([$user['id']]);

        // Sign JWT
        $payload = [
            'id' => (int)$user['id'],
            'numero' => $user['numero'],
            'role' => $user['role'] ?? 'client',
            'iat' => time(),
            'exp' => time() + (12 * 3600)
        ];
        $token = JWT::encode($payload, $secret, 'HS256');

        $response->getBody()->write(json_encode([
            'token' => $token,
            'role' => $user['role'] ?? 'client',
            'user' => [
                'id' => (int)$user['id'],
                'nombre' => $user['nombre'],
                'numero' => $user['numero'],
                'coeficiente' => 1 + ((float)($user['porcentajeaumento'] ?? 0) / 100)
            ]
        ]));

        return $response->withHeader('Content-Type', 'application/json');

    }
    catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => 'Error del servidor: ' . $e->getMessage()]));
        return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
    }
});