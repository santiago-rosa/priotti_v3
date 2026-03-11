<?php

use App\Config\Database;
use App\Middleware\AuthMiddleware;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/** @var \Slim\App $app */

$app->get('/api/orders', function (Request $request, Response $response) {
    $user = $request->getAttribute('user');
    $clientId = $user->id;

    try {
        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT * FROM pedidos WHERE cliente = ? AND estado = 'LISTO' ORDER BY fechapedido DESC");
        $stmt->execute([$clientId]);
        $orders = $stmt->fetchAll();

        $response->getBody()->write(json_encode(['data' => $orders]));
        return $response->withHeader('Content-Type', 'application/json');
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => 'Server error']));
        return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
    }
})->add(new AuthMiddleware());

$app->get('/api/orders/cart', function (Request $request, Response $response) {
    $user = $request->getAttribute('user');
    $clientId = $user->id;

    try {
        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT * FROM pedidos WHERE cliente = ? AND estado = 'PENDIENTE' LIMIT 1");
        $stmt->execute([$clientId]);
        $pendingOrder = $stmt->fetch();

        if (!$pendingOrder) {
            $response->getBody()->write(json_encode(['data' => []]));
            return $response->withHeader('Content-Type', 'application/json');
        }

        // Parse v2 string format: codigo&marca&cant,codigo...
        $itemsArray = explode(',', trim($pendingOrder['items'] ?? '', ','));
        $jsonItems = [];
        foreach ($itemsArray as $item) {
            if (empty($item))
                continue;
            $parts = explode('&', $item);
            if (count($parts) >= 3) {
                $jsonItems[] = [
                    'codigo' => $parts[0],
                    'marca' => $parts[1],
                    'cantidad' => (int) $parts[2]
                ];
            }
        }

        $response->getBody()->write(json_encode([
            'idpedidos' => (int) $pendingOrder['idpedidos'],
            'items' => $jsonItems
        ]));
        return $response->withHeader('Content-Type', 'application/json');

    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => 'Server error']));
        return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
    }
})->add(new AuthMiddleware());

$app->post('/api/orders/cart', function (Request $request, Response $response) {
    $user = $request->getAttribute('user');
    $clientId = $user->id;
    $data = $request->getParsedBody();
    $items = $data['items'] ?? [];

    try {
        $db = Database::getConnection();

        // Formatting array to v2 compatible string
        $itemsString = "";
        foreach ($items as $i) {
            $itemsString .= $i['codigo'] . "&" . $i['marca'] . "&" . $i['cantidad'] . ",";
        }

        $stmt = $db->prepare("SELECT idpedidos FROM pedidos WHERE cliente = ? AND estado = 'PENDIENTE' LIMIT 1");
        $stmt->execute([$clientId]);
        $pendingOrder = $stmt->fetch();

        if (!$pendingOrder) {
            $stmt = $db->prepare("INSERT INTO pedidos (cliente, estado, items, fechapedido) VALUES (?, 'PENDIENTE', ?, NOW())");
            $stmt->execute([$clientId, $itemsString]);
        } else {
            $stmt = $db->prepare("UPDATE pedidos SET items = ? WHERE idpedidos = ?");
            $stmt->execute([$itemsString, $pendingOrder['idpedidos']]);
        }

        $response->getBody()->write(json_encode(['message' => 'Cart updated']));
        return $response->withHeader('Content-Type', 'application/json');

    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => 'Server error: ' . $e->getMessage()]));
        return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
    }
})->add(new AuthMiddleware());

$app->post('/api/orders/checkout', function (Request $request, Response $response) {
    $user = $request->getAttribute('user');
    $clientId = $user->id;

    try {
        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT idpedidos, items FROM pedidos WHERE cliente = ? AND estado = 'PENDIENTE' LIMIT 1");
        $stmt->execute([$clientId]);
        $pendingOrder = $stmt->fetch();

        if (!$pendingOrder) {
            $response->getBody()->write(json_encode(['error' => 'No active cart found']));
            return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
        }

        $stmt = $db->prepare("UPDATE pedidos SET estado = 'LISTO', fechapedido = NOW() WHERE idpedidos = ?");
        $stmt->execute([$pendingOrder['idpedidos']]);

        // Email notifications
        $stmtClient = $db->prepare("SELECT nombre FROM clientes WHERE id = ?");
        $stmtClient->execute([$clientId]);
        $clientData = $stmtClient->fetch();
        $clientName = $clientData ? $clientData['nombre'] : 'Desconocido';

        $emailService = new \App\Services\EmailService();
        $sent = $emailService->sendOrderNotification((string) $clientId, $clientName, $pendingOrder['items']);

        if (!$sent) {
            $response->getBody()->write(json_encode(['error' => 'No se pudo enviar el correo de confirmación. Por favor, contacte a soporte.']));
            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }

        $response->getBody()->write(json_encode(['message' => 'Pedido cerrado correctamente!']));
        return $response->withHeader('Content-Type', 'application/json');

    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => 'Server error']));
        return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
    }
})->add(new AuthMiddleware());
