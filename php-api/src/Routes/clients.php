<?php

use App\Config\Database;
use App\Middleware\AuthMiddleware;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/** @var \Slim\App $app */

// GET /api/clients (Admin only)
$app->get('/api/clients', function (Request $request, Response $response) {
    try {
        $queryParams = $request->getQueryParams();
        $search = $queryParams['search'] ?? '';
        $page = (int) ($queryParams['page'] ?? 1);
        $limit = (int) ($queryParams['limit'] ?? 20);
        $offset = ($page - 1) * $limit;

        $db = Database::getConnection();
        
        $params = [];
        $where = "";
        if (!empty($search)) {
            $where = " WHERE nombre LIKE ? OR numero LIKE ? OR email LIKE ?";
            $s = "%$search%";
            $params = [$s, $s, $s];
        }

        // Get total count for pagination
        $countStmt = $db->prepare("SELECT COUNT(*) FROM clientes" . $where);
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        // Get paginated results
        $sql = "SELECT * FROM clientes" . $where . " ORDER BY fechaUltimoLogin DESC, nombre ASC LIMIT $limit OFFSET $offset";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $clients = $stmt->fetchAll();

        // Convert types
        foreach ($clients as &$c) {
            $c['id'] = (int) $c['id'];
            $c['porcentajeaumento'] = (float) $c['porcentajeaumento'];
            $c['visitas'] = (int) $c['visitas'];
        }

        $response->getBody()->write(json_encode([
            'data' => $clients,
            'meta' => [
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
                'last_page' => ceil($total / $limit)
            ]
        ]));
        return $response->withHeader('Content-Type', 'application/json');
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => 'Server error: ' . $e->getMessage()]));
        return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
    }
})->add(new AuthMiddleware('admin'));

// POST /api/clients (Admin only)
$app->post('/api/clients', function (Request $request, Response $response) {
    $data = $request->getParsedBody();
    $nombre = $data['nombre'] ?? '';
    $numero = $data['numero'] ?? '';
    $cuit = $data['cuit'] ?? '';
    $email = $data['email'] ?? null;
    $aumento = $data['aumento'] ?? 0;

    try {
        $db = Database::getConnection();

        $stmt = $db->prepare("SELECT id FROM clientes WHERE numero = ? LIMIT 1");
        $stmt->execute([$numero]);
        if ($stmt->fetch()) {
            $response->getBody()->write(json_encode(['error' => 'Ese numero de cliente ya existe']));
            return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
        }

        $stmt = $db->prepare("INSERT INTO clientes (nombre, numero, cuit, email, porcentajeaumento, estado, fechaAlta) 
                              VALUES (?, ?, ?, ?, ?, 'ACTIVO', NOW())");
        $stmt->execute([$nombre, $numero, $cuit, $email, (float) $aumento]);

        $response->getBody()->write(json_encode(['message' => 'Cliente creado!']));
        return $response->withHeader('Content-Type', 'application/json');
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => 'Server error: ' . $e->getMessage()]));
        return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
    }
})->add(new AuthMiddleware('admin'));

// PUT /api/clients/{id} (Admin only)
$app->put('/api/clients/{id}', function (Request $request, Response $response, $args) {
    $id = (int) $args['id'];
    $data = $request->getParsedBody();
    $nombre = $data['nombre'] ?? '';
    $numero = $data['numero'] ?? '';
    $cuit = $data['cuit'] ?? '';
    $email = $data['email'] ?? null;
    $aumento = $data['aumento'] ?? 0;
    $estado = $data['estado'] ?? 'ACTIVO';

    try {
        $db = Database::getConnection();

        $stmt = $db->prepare("SELECT id FROM clientes WHERE numero = ? AND id != ? LIMIT 1");
        $stmt->execute([$numero, $id]);
        if ($stmt->fetch()) {
            $response->getBody()->write(json_encode(['error' => 'Ese numero de cliente ya existe!']));
            return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
        }

        $stmt = $db->prepare("UPDATE clientes SET nombre = ?, numero = ?, cuit = ?, email = ?, porcentajeaumento = ?, estado = ? WHERE id = ?");
        $stmt->execute([$nombre, $numero, $cuit, $email, (float) $aumento, $estado, $id]);

        $response->getBody()->write(json_encode(['message' => 'Cliente actualizado!']));
        return $response->withHeader('Content-Type', 'application/json');
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => 'Server error: ' . $e->getMessage()]));
        return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
    }
})->add(new AuthMiddleware('admin'));
