<?php

use App\Config\Database;
use App\Middleware\AuthMiddleware;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/** @var \Slim\App $app */

$app->get('/api/products', function (Request $request, Response $response) {
    $queryParams = $request->getQueryParams();
    $filter = $queryParams['filter'] ?? '';
    $search = $queryParams['search'] ?? '';

    try {
        $db = Database::getConnection();
        $sql = "SELECT * FROM productos WHERE vigente = 1";
        $params = [];

        if ($filter === 'offers') {
            $sql .= " AND precio_oferta > 0";
        } elseif ($filter === 'news') {
            $sql .= " AND fecha_agregado > DATE_SUB(NOW(), INTERVAL 2 MONTH)";
        }

        if (!empty($search)) {
            $terms = array_slice(explode(' ', $search), 0, 5);
            foreach ($terms as $i => $term) {
                $sql .= " AND (codigo LIKE ? OR aplicacion LIKE ? OR marca LIKE ? OR rubro LIKE ? OR info LIKE ?)";
                $t = "%$term%";
                array_push($params, $t, $t, $t, $t, $t);
            }
        }

        if ($filter === 'news') {
            $sql .= " ORDER BY fecha_agregado DESC";
        } else {
            $sql .= " LIMIT 100";
        }

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $products = $stmt->fetchAll();

        // Convert types (PDO often returns everything as strings)
        foreach ($products as &$p) {
            $p['precio_lista'] = (float) $p['precio_lista'];
            $p['precio_oferta'] = (float) $p['precio_oferta'];
            $p['vigente'] = (int) $p['vigente'];
        }

        $response->getBody()->write(json_encode(['data' => $products]));
        return $response->withHeader('Content-Type', 'application/json');

    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => 'Error: ' . $e->getMessage()]));
        return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
    }
})->add(new AuthMiddleware());

$app->put('/api/products/{codigo}', function (Request $request, Response $response, $args) {
    $codigo = $args['codigo'];
    $data = $request->getParsedBody();
    $precio_oferta = $data['precio_oferta'] ?? null;
    $info = $data['info'] ?? '';

    if ($precio_oferta === null || $precio_oferta < 0) {
        $response->getBody()->write(json_encode(['error' => 'Precio de oferta inválido']));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }

    try {
        $db = Database::getConnection();
        $stmt = $db->prepare("UPDATE productos SET precio_oferta = ?, info = ?, fecha_modif = NOW() WHERE codigo = ?");
        $stmt->execute([$precio_oferta, $info, $codigo]);

        $response->getBody()->write(json_encode(['message' => 'Producto actualizado!']));
        return $response->withHeader('Content-Type', 'application/json');

    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => 'Error: ' . $e->getMessage()]));
        return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
    }
})->add(new AuthMiddleware('admin'));
