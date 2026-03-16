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
        $user = $request->getAttribute('user');

        // Check if stock should be visible to clients
        $configStmt = $db->query("SELECT `value` FROM config WHERE `key` = 'show_stock_to_clients' LIMIT 1");
        $showStockConfig = $configStmt->fetch();
        $showStockToClients = ($showStockConfig['value'] ?? '1') === '1';
        $isAdmin = ($user && $user->role === 'admin');
        $params = [];

        $sql = "SELECT *, 
                CASE 
                    WHEN stock < stock_low THEN 'red'
                    WHEN stock < stock_medium THEN 'yellow'
                    ELSE 'green'
                END as stock_status, imagen
                FROM productos 
                WHERE vigente = 1";

        if ($filter === 'offers') {
            $sql .= " AND precio_oferta > 0";
        }
        elseif ($filter === 'news') {
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
        }
        else {
            $sql .= " LIMIT 100";
        }

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $products = $stmt->fetchAll();

        // Convert types and sanitize for guest users
        foreach ($products as &$p) {
            if (!$user) {
                // Mask sensitive info for non-logged in users
                $p['precio_lista'] = 0;
                $p['precio_oferta'] = 0;
                $p['stock'] = 0;
                $p['stock_low'] = 0;
                $p['stock_medium'] = 0;
                $p['stock_status'] = null; // Changed from 'green' to null
            }
            else {
                // If not admin and config is off, hide stock status
                if (!$isAdmin && !$showStockToClients) {
                    $p['stock_status'] = null;
                }

                $p['precio_lista'] = (float)$p['precio_lista'];
                $p['precio_oferta'] = (float)$p['precio_oferta'];
                $p['vigente'] = (int)$p['vigente'];
                $p['stock'] = (int)($p['stock'] ?? 0);
            }
        }

        $response->getBody()->write(json_encode(['data' => $products]));
        return $response->withHeader('Content-Type', 'application/json');

    }
    catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => 'Error: ' . $e->getMessage()]));
        return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
    }
})->add(new AuthMiddleware(null, true));

$app->put('/api/products/{codigo}', function (Request $request, Response $response, $args) {
    $codigo = $args['codigo'];
    $data = $request->getParsedBody();
    if (isset($data['precio_oferta']) && $data['precio_oferta'] < 0) {
        $response->getBody()->write(json_encode(['error' => 'Precio de oferta inválido']));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }

    try {
        $db = Database::getConnection();

        // Fetch current values to keep them if not provided
        $currentStmt = $db->prepare("SELECT precio_oferta, info, stock, stock_low, stock_medium FROM productos WHERE codigo = ?");
        $currentStmt->execute([$codigo]);
        $current = $currentStmt->fetch();

        if (!$current) {
            $response->getBody()->write(json_encode(['error' => 'Producto no encontrado']));
            return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
        }

        $precio_oferta = isset($data['precio_oferta']) ? $data['precio_oferta'] : $current['precio_oferta'];
        $info = isset($data['info']) ? $data['info'] : $current['info'];
        $stock = isset($data['stock']) ? $data['stock'] : $current['stock'];
        $stock_low = isset($data['stock_low']) ? $data['stock_low'] : $current['stock_low'];
        $stock_medium = isset($data['stock_medium']) ? $data['stock_medium'] : $current['stock_medium'];

        $stmt = $db->prepare("UPDATE productos SET precio_oferta = ?, info = ?, stock = ?, stock_low = ?, stock_medium = ?, fecha_modif = NOW() WHERE codigo = ?");
        $stmt->execute([$precio_oferta, $info, $stock, $stock_low, $stock_medium, $codigo]);

        $response->getBody()->write(json_encode([
            'message' => 'Producto actualizado!',
            'stock' => $stock,
            'stock_low' => $stock_low,
            'stock_medium' => $stock_medium
        ]));
        return $response->withHeader('Content-Type', 'application/json');

    }
    catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => 'Error: ' . $e->getMessage()]));
        return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
    }
})->add(new AuthMiddleware('admin'));

$app->get('/api/products/brands', function (Request $request, Response $response) {
    try {
        $db = Database::getConnection();
        $stmt = $db->query("SELECT DISTINCT marca FROM productos WHERE vigente = 1 AND marca IS NOT NULL AND marca != '' ORDER BY marca ASC");
        $brands = $stmt->fetchAll(PDO::FETCH_COLUMN);

        $response->getBody()->write(json_encode(['data' => $brands]));
        return $response->withHeader('Content-Type', 'application/json');
    }
    catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
    }
})->add(new AuthMiddleware('admin'));

$app->put('/api/products/bulk/thresholds', function (Request $request, Response $response) {
    $data = $request->getParsedBody();
    $marca = $data['marca'] ?? '';
    $stock_low = isset($data['stock_low']) ? (int)$data['stock_low'] : null;
    $stock_medium = isset($data['stock_medium']) ? (int)$data['stock_medium'] : null;

    if (empty($marca) || $stock_low === null || $stock_medium === null) {
        $response->getBody()->write(json_encode(['error' => 'Marca y umbrales son requeridos']));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }

    try {
        $db = Database::getConnection();
        $stmt = $db->prepare("UPDATE productos SET stock_low = ?, stock_medium = ?, fecha_modif = NOW() WHERE marca = ?");
        $stmt->execute([$stock_low, $stock_medium, $marca]);

        $response->getBody()->write(json_encode(['message' => "Umbrales actualizados para la marca: $marca"]));
        return $response->withHeader('Content-Type', 'application/json');
    }
    catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
    }
})->add(new AuthMiddleware('admin'));

$app->post('/api/products/list', function (Request $request, Response $response) {
    $data = $request->getParsedBody();
    $codigos = $data['codigos'] ?? [];

    if (empty($codigos)) {
        $response->getBody()->write(json_encode(['data' => []]));
        return $response->withHeader('Content-Type', 'application/json');
    }

    try {
        $db = Database::getConnection();
        $placeholders = str_repeat('?,', count($codigos) - 1) . '?';
        $sql = "SELECT *, 
                CASE 
                    WHEN stock < stock_low THEN 'red'
                    WHEN stock < stock_medium THEN 'yellow'
                    ELSE 'green'
                END as stock_status, imagen
                FROM productos 
                WHERE codigo IN ($placeholders) AND vigente = 1";

        $stmt = $db->prepare($sql);
        $stmt->execute($codigos);
        $products = $stmt->fetchAll();

        foreach ($products as &$p) {
            $p['precio_lista'] = (float)$p['precio_lista'];
            $p['precio_oferta'] = (float)$p['precio_oferta'];
            $p['stock'] = (int)($p['stock'] ?? 0);
        }

        $response->getBody()->write(json_encode(['data' => $products]));
        return $response->withHeader('Content-Type', 'application/json');
    }
    catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
    }
})->add(new AuthMiddleware());

// Use {codigo:.+} to allow slashes inside the product code (like FI19999/1)
$app->get('/api/products/image/{codigo:.+}', function (Request $request, Response $response, $args) {
    // 1. Clean the code (remove spaces)
    $codigo = trim($args['codigo']);
    $envPath = $_ENV['PRODUCTS_IMAGES_PATH'] ?? 'Resources/fotos';


    // 2. Resolve Site Root
    $siteRoot = realpath(__DIR__ . '/../../../');
    if (!$siteRoot) {
        $siteRoot = dirname(__DIR__, 3);
    }

    $basePath = rtrim($siteRoot, '/') . '/' . ltrim($envPath, '/');
    $filePath = null;

    // 3. Apply transformation rules and search variants
    $transformed = str_replace(['/', ' '], ['-', '_'], $codigo);

    $variants = array_unique([
        $codigo,
        strtolower($codigo),
        strtoupper($codigo),
        $transformed,
        strtolower($transformed),
        strtoupper($transformed)
    ]);

    foreach ($variants as $variant) {
        // Try exact match first if variant already has extension
        if (strpos($variant, '.') !== false) {
            $testPath = rtrim($basePath, '/') . '/' . $variant;
            if (file_exists($testPath)) {
                $filePath = $testPath;
                break;
            }
        }

        // Use glob to find ANY extension (jpg, png, JPG, etc)
        $pattern = rtrim($basePath, '/') . '/' . $variant . '.*';
        $matches = glob($pattern);
        
        if ($matches && count($matches) > 0) {
            $filePath = $matches[0];
            break;
        }
    }


    // 4. Fallback to default
    if (!$filePath) {
        $fallbacks = [
            $siteRoot . '/images/products/default.png',
            $siteRoot . '/public/images/products/default.png',
            rtrim($basePath, '/') . '/default.png'
        ];

        foreach ($fallbacks as $fb) {
            if (file_exists($fb)) {
                $filePath = $fb;
                break;
            }
        }
    }

    if (!$filePath || !file_exists($filePath)) {
        return $response->withStatus(404);
    }

    // 5. Serve the file
    $ext = pathinfo($filePath, PATHINFO_EXTENSION);
    $mimeType = match (strtolower($ext)) {
            'png' => 'image/png',
            'webp' => 'image/webp',
            'gif' => 'image/gif',
            'svg' => 'image/svg+xml',
            default => 'image/jpeg',
        };

    $stream = fopen($filePath, 'rb');
    return $response
    ->withHeader('Content-Type', $mimeType)
    ->withHeader('Cache-Control', 'public, max-age=86400')
    ->withBody(new \Slim\Psr7\Stream($stream));
});