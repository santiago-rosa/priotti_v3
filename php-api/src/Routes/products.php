<?php

use App\Config\Database;
use App\Middleware\AuthMiddleware;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/** @var \Slim\App $app */

/**
 * Resolve the absolute path to the product images directory.
 *
 * PRODUCTS_IMAGES_PATH in .env can be:
 *  - An absolute path : /home/felipepr/public_html/Resources/fotos
 *    → used as-is, regardless of where the API lives (test or prod)
 *  - A relative path  : Resources/fotos
 *    → resolved relative to the project root (three levels above /src/Routes)
 */
function resolveImagesPath(): string
{
    $configured = trim($_ENV['PRODUCTS_IMAGES_PATH'] ?? 'Resources/fotos');

    // Absolute path → use directly
    if (str_starts_with($configured, '/')) {
        return $configured;
    }

    // Relative path → resolve relative to the repo root (parent of php-api/)
    // __DIR__ = php-api/src/Routes  →  3 levels up = priotti_v3/ (repo root)
    $projectRoot = realpath(__DIR__ . '/../../../') ?: dirname(__DIR__, 3);
    return rtrim($projectRoot, '/') . '/' . ltrim($configured, '/');
}

$app->get('/api/products', function (Request $request, Response $response) {
    $queryParams = $request->getQueryParams();
    $filter = $queryParams['filter'] ?? '';
    $search = $queryParams['search'] ?? '';
    $marca = $queryParams['marca'] ?? '';   // optional brand filter (pills)
    $page = isset($queryParams['page']) ? max(1, (int) $queryParams['page']) : 1;
    $limit = isset($queryParams['limit']) ? max(1, (int) $queryParams['limit']) : 30;
    $offset = ($page - 1) * $limit;

    try {
        $db = Database::getConnection();
        $user = $request->getAttribute('user');

        // Check if stock should be visible to clients
        $configStmt = $db->query("SELECT `value` FROM config WHERE `key` = 'show_stock_to_clients' LIMIT 1");
        $showStockConfig = $configStmt->fetch();
        $showStockToClients = ($showStockConfig['value'] ?? '1') === '1';
        $isAdmin = ($user && $user->role === 'admin');

        $params = [];
        $whereSql = "WHERE vigente = 1";

        if ($filter === 'offers') {
            $whereSql .= " AND precio_oferta > 0";
        } elseif ($filter === 'news') {
            $whereSql .= " AND fecha_agregado > DATE_SUB(NOW(), INTERVAL 2 MONTH)";
        }

        if (!empty($search)) {
            $terms = array_slice(explode(' ', $search), 0, 5);
            foreach ($terms as $i => $term) {
                $whereSql .= " AND (codigo LIKE ? OR aplicacion LIKE ? OR marca LIKE ? OR rubro LIKE ? OR info LIKE ?)";
                $t = "%$term%";
                array_push($params, $t, $t, $t, $t, $t);
            }
        }

        // ── Brand pills: fetch distinct brands for the current search ──────────
        // We do this BEFORE applying the marca filter so the pill list is always
        // the full set of brands matching the search query.
        $brands = [];
        if (!empty($search) || $filter === 'offers') {
            $brandsSql = "SELECT DISTINCT marca FROM productos $whereSql AND marca IS NOT NULL AND marca != '' ORDER BY marca ASC";
            $brandsStmt = $db->prepare($brandsSql);
            $brandsStmt->execute($params);
            $brands = $brandsStmt->fetchAll(PDO::FETCH_COLUMN);
        }

        $marca = $queryParams['marca'] ?? '';   // optional brand filter (pills)
        $rubro = $queryParams['rubro'] ?? '';   // optional category filter

        // ...

        // Apply filters AFTER collecting pills
        if (!empty($marca)) {
            $whereSql .= " AND marca = ?";
            $params[] = $marca;
        }

        if (!empty($rubro)) {
            $whereSql .= " AND rubro = ?";
            $params[] = $rubro;
        }

        // Count Query
        $countSql = "SELECT COUNT(*) as total FROM productos $whereSql";
        $countStmt = $db->prepare($countSql);
        $countStmt->execute($params);
        $totalItems = (int) $countStmt->fetchColumn();
        $totalPages = ceil($totalItems / $limit);

        // Data Query
        $sql = "SELECT *, 
                CASE 
                    WHEN stock < stock_low THEN 'red'
                    WHEN stock < stock_medium THEN 'yellow'
                    ELSE 'green'
                END as stock_status, imagen
                FROM productos 
                $whereSql";

        if ($filter === 'news') {
            $sql .= " ORDER BY fecha_agregado DESC";
        } else {
            $sql .= " ORDER BY marca ASC, codigo ASC";
        }

        $sql .= " LIMIT " . (int) $limit . " OFFSET " . (int) $offset;

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $products = $stmt->fetchAll();

        // Fetch Global Discounts
        $gdStmt = $db->query("SELECT marca, rubro, porcentaje FROM global_discounts");
        $globalDiscounts = [];
        foreach ($gdStmt->fetchAll() as $gd) {
            $globalDiscounts[$gd['marca']][$gd['rubro']] = (float) $gd['porcentaje'];
        }

        $coeficiente = 1.0;
        if ($user) {
            $porcentaje = 0.0;
            if (isset($user->up_p)) {
                $porcentaje = (float) $user->up_p;
            } else {
                // Fallback for older tokens or if JWT key is missing: fetch from DB
                $pStmt = $db->prepare("SELECT porcentajeaumento FROM clientes WHERE id = ? LIMIT 1");
                $pStmt->execute([$user->id]);
                $porcentaje = (float) ($pStmt->fetchColumn() ?: 0);
            }
            $coeficiente = 1.0 + ($porcentaje / 100.0);
        }

        foreach ($products as &$p) {
            if (!$user) {
                // Mask sensitive info for non-logged in users
                $p['precio_lista'] = 0;
                $p['precio_oferta'] = 0;
                $p['stock'] = 0;
                $p['stock_low'] = 0;
                $p['stock_medium'] = 0;
                $p['stock_status'] = null;
                $p['descuento_global'] = 0;
            } else {
                // If not admin and config is off, hide stock status
                if (!$isAdmin && !$showStockToClients) {
                    $p['stock_status'] = null;
                }

                $p['precio_lista'] = (float) $p['precio_lista'] * $coeficiente;
                $p['precio_oferta'] = (float) $p['precio_oferta'];
                $p['vigente'] = (int) $p['vigente'];
                $p['stock'] = (int) ($p['stock'] ?? 0);

                // Apply global discount if no item offer exists
                $p['descuento_global'] = 0;
                if ($p['precio_oferta'] <= 0) {
                    $m = $p['marca'];
                    $r = $p['rubro'];
                    if (isset($globalDiscounts[$m][$r])) {
                        $p['descuento_global'] = $globalDiscounts[$m][$r];
                    }
                }
            }
        }

        $response->getBody()->write(json_encode([
            'data' => $products,
            'brands' => $brands,
            'pagination' => [
                'total' => $totalItems,
                'page' => $page,
                'limit' => $limit,
                'totalPages' => $totalPages
            ]
        ]));
        return $response->withHeader('Content-Type', 'application/json');

    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => 'Error: ' . $e->getMessage()]));
        return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
    }
})->add(new AuthMiddleware(null, true));

$app->get('/api/products/brands', function (Request $request, Response $response) {
    try {
        $db = Database::getConnection();
        $stmt = $db->query("SELECT DISTINCT marca FROM productos WHERE vigente = 1 AND marca IS NOT NULL AND marca != '' ORDER BY marca ASC");
        $brands = $stmt->fetchAll(PDO::FETCH_COLUMN);

        $response->getBody()->write(json_encode(['data' => $brands]));
        return $response->withHeader('Content-Type', 'application/json');
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
    }
})->add(new AuthMiddleware('admin'));

$app->get('/api/products/rubros', function (Request $request, Response $response) {
    try {
        $queryParams = $request->getQueryParams();
        $marca = $queryParams['marca'] ?? '';

        $db = Database::getConnection();
        $sql = "SELECT DISTINCT rubro FROM productos WHERE vigente = 1 AND rubro IS NOT NULL AND rubro != ''";
        $params = [];

        if (!empty($marca)) {
            $sql .= " AND marca = ?";
            $params[] = $marca;
        }

        $sql .= " ORDER BY rubro ASC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rubros = $stmt->fetchAll(PDO::FETCH_COLUMN);

        $response->getBody()->write(json_encode(['data' => $rubros]));
        return $response->withHeader('Content-Type', 'application/json');
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
    }
})->add(new AuthMiddleware('admin'));



$app->put('/api/products/bulk/thresholds', function (Request $request, Response $response) {
    $data = $request->getParsedBody();
    $marca = $data['marca'] ?? '';
    $stock_low = isset($data['stock_low']) ? (int) $data['stock_low'] : null;
    $stock_medium = isset($data['stock_medium']) ? (int) $data['stock_medium'] : null;

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
    } catch (\Exception $e) {
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

        // Fetch Global Discounts
        $gdStmt = $db->query("SELECT marca, rubro, porcentaje FROM global_discounts");
        $globalDiscounts = [];
        foreach ($gdStmt->fetchAll() as $gd) {
            $globalDiscounts[$gd['marca']][$gd['rubro']] = (float) $gd['porcentaje'];
        }

        $user = $request->getAttribute('user');
        $coeficiente = 1.0;
        if ($user) {
            $porcentaje = 0.0;
            if (isset($user->up_p)) {
                $porcentaje = (float) $user->up_p;
            } else {
                $pStmt = $db->prepare("SELECT porcentajeaumento FROM clientes WHERE id = ? LIMIT 1");
                $pStmt->execute([$user->id]);
                $porcentaje = (float) ($pStmt->fetchColumn() ?: 0);
            }
            $coeficiente = 1.0 + ($porcentaje / 100.0);
        }

        foreach ($products as &$p) {
            $p['precio_lista'] = (float) $p['precio_lista'] * $coeficiente;
            $p['precio_oferta'] = (float) $p['precio_oferta'];
            $p['stock'] = (int) ($p['stock'] ?? 0);

            // Apply global discount if no item offer exists
            $p['descuento_global'] = 0;
            if ($p['precio_oferta'] <= 0) {
                $m = $p['marca'];
                $r = $p['rubro'];
                if (isset($globalDiscounts[$m][$r])) {
                    $p['descuento_global'] = $globalDiscounts[$m][$r];
                }
            }
        }

        $response->getBody()->write(json_encode(['data' => $products]));
        return $response->withHeader('Content-Type', 'application/json');
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
    }
})->add(new AuthMiddleware());

$app->put('/api/products/{codigo:.+}', function (Request $request, Response $response, $args) {
    $codigo = $args['codigo'];
    $data = $request->getParsedBody();
    if (isset($data['precio_oferta']) && $data['precio_oferta'] < 0) {
        $response->getBody()->write(json_encode(['error' => 'Precio de oferta inválido']));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }

    try {
        $db = Database::getConnection();

        // Fetch current values to keep them if not provided
        $currentStmt = $db->prepare("SELECT precio_oferta, oferta_descripcion, info, stock, stock_low, stock_medium FROM productos WHERE codigo = ?");
        $currentStmt->execute([$codigo]);
        $current = $currentStmt->fetch();

        if (!$current) {
            $response->getBody()->write(json_encode(['error' => 'Producto no encontrado']));
            return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
        }

        $precio_oferta = isset($data['precio_oferta']) ? $data['precio_oferta'] : $current['precio_oferta'];
        $oferta_descripcion = isset($data['oferta_descripcion']) ? $data['oferta_descripcion'] : $current['oferta_descripcion'];
        $info = isset($data['info']) ? $data['info'] : $current['info'];
        $stock = isset($data['stock']) ? $data['stock'] : $current['stock'];
        $stock_low = isset($data['stock_low']) ? $data['stock_low'] : $current['stock_low'];
        $stock_medium = isset($data['stock_medium']) ? $data['stock_medium'] : $current['stock_medium'];

        $stmt = $db->prepare("UPDATE productos SET precio_oferta = ?, oferta_descripcion = ?, info = ?, stock = ?, stock_low = ?, stock_medium = ?, fecha_modif = NOW() WHERE codigo = ?");
        $stmt->execute([$precio_oferta, $oferta_descripcion, $info, $stock, $stock_low, $stock_medium, $codigo]);

        $response->getBody()->write(json_encode([
            'message' => 'Producto actualizado!',
            'stock' => $stock,
            'stock_low' => $stock_low,
            'stock_medium' => $stock_medium
        ]));
        return $response->withHeader('Content-Type', 'application/json');

    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => 'Error: ' . $e->getMessage()]));
        return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
    }
})->add(new AuthMiddleware('admin'));

// Reordered static routes to top

// Upload image for a product (admin only)
$app->post('/api/products/{codigo:.+}/image', function (Request $request, Response $response, $args) {
    $codigo = $args['codigo'];
    $uploadedFiles = $request->getUploadedFiles();

    if (empty($uploadedFiles['image'])) {
        $response->getBody()->write(json_encode(['error' => 'No se recibió ningún archivo']));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }

    $uploadedFile = $uploadedFiles['image'];

    if ($uploadedFile->getError() !== UPLOAD_ERR_OK) {
        $response->getBody()->write(json_encode(['error' => 'Error al subir el archivo']));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }

    // Validate MIME type
    $stream = $uploadedFile->getStream();
    $stream->rewind();
    $tmpContent = $stream->read(12); // read magic bytes
    $stream->rewind();

    $allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    $clientMime = $uploadedFile->getClientMediaType();
    if (!in_array($clientMime, $allowedMimes)) {
        $response->getBody()->write(json_encode(['error' => 'Solo se permiten imágenes (JPG, PNG, WEBP, GIF)']));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }

    try {
        $db = Database::getConnection();

        // Get product to resolve the imagen field
        $stmt = $db->prepare("SELECT imagen FROM productos WHERE codigo = ?");
        $stmt->execute([$codigo]);
        $product = $stmt->fetch();

        if (!$product) {
            $response->getBody()->write(json_encode(['error' => 'Producto no encontrado']));
            return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
        }

        // Determine the base filename: use imagen field if set, otherwise codigo
        $baseFilename = !empty($product['imagen']) ? $product['imagen'] : $codigo;
        // Sanitize slashes to dashes
        $baseFilename = str_replace(['/', ' '], ['-', '_'], $baseFilename);

        $basePath = resolveImagesPath();

        // Ensure directory exists
        if (!is_dir($basePath)) {
            mkdir($basePath, 0775, true);
        }

        // Determine extension from uploaded file
        $extMap = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/gif' => 'gif',
        ];
        $ext = $extMap[$clientMime] ?? 'jpg';

        // Remove any existing files with the same base name (any extension)
        $existing = glob(rtrim($basePath, '/') . '/' . $baseFilename . '.*');
        if ($existing) {
            foreach ($existing as $old) {
                @unlink($old);
            }
        }

        $newFilename = $baseFilename . '.' . $ext;
        $destPath = rtrim($basePath, '/') . '/' . $newFilename;

        $uploadedFile->moveTo($destPath);

        $response->getBody()->write(json_encode([
            'message' => 'Imagen subida correctamente',
            'filename' => $newFilename
        ]));
        return $response->withHeader('Content-Type', 'application/json');

    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => 'Error: ' . $e->getMessage()]));
        return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
    }
})->add(new AuthMiddleware('admin'));

// Fetch and save product image from a remote URL (admin only)
$app->post('/api/products/{codigo:.+}/image-from-url', function (Request $request, Response $response, $args) {
    $codigo = $args['codigo'];
    $data = $request->getParsedBody();
    $url = trim($data['url'] ?? '');

    if (empty($url) || !filter_var($url, FILTER_VALIDATE_URL)) {
        $response->getBody()->write(json_encode(['error' => 'URL inválida o no proporcionada']));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }

    // Only allow http(s)
    $scheme = strtolower(parse_url($url, PHP_URL_SCHEME) ?? '');
    if (!in_array($scheme, ['http', 'https'])) {
        $response->getBody()->write(json_encode(['error' => 'Solo se permiten URLs http/https']));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }

    try {
        // ── Download the Image ────────────────────────────────────────────────
        // Build a Referer from the URL's own origin so CDN hotlink checks pass
        $urlParts = parse_url($url);
        $referer = ($urlParts['scheme'] ?? 'https') . '://' . ($urlParts['host'] ?? '');

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 8,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
            CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            CURLOPT_HTTPHEADER => [
                'Accept: image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
                'Accept-Language: es-AR,es;q=0.9,en;q=0.8',
                'Referer: ' . $referer . '/',
            ],
        ]);

        $imageData = curl_exec($ch);
        $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $finalUrl = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
        $curlError = curl_error($ch);
        $curlErrNo = curl_errno($ch);
        // curl_close is no-op since PHP 8.0 and deprecated since 8.5


        if ($curlErrNo || $imageData === false) {
            $response->getBody()->write(json_encode(['error' => "Error de red al descargar la imagen (cURL $curlErrNo): $curlError"]));
            return $response->withStatus(502)->withHeader('Content-Type', 'application/json');
        }

        if ($httpCode < 200 || $httpCode >= 300) {
            $response->getBody()->write(json_encode(['error' => "El servidor de la imagen respondió con HTTP $httpCode. Probá copiando la URL directa de la imagen (clic derecho → 'Copiar dirección de imagen')."]));
            return $response->withStatus(502)->withHeader('Content-Type', 'application/json');
        }

        if (empty($imageData)) {
            $response->getBody()->write(json_encode(['error' => 'La URL devolvió contenido vacío.']));
            return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
        }

        // ── Validate MIME via content-type header AND magic bytes ─────────────
        $mimeMap = [
            'image/jpeg' => 'jpg',
            'image/jpg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/gif' => 'gif',
        ];

        // Strip charset suffix like "image/jpeg; charset=…"
        $baseMime = strtolower(explode(';', $contentType ?? '')[0]);

        // Detect from magic bytes as a second check
        $magicMime = null;
        if (strlen($imageData) >= 4) {
            $header = substr($imageData, 0, 12);
            if (substr($header, 0, 3) === "\xFF\xD8\xFF")
                $magicMime = 'image/jpeg';
            elseif (substr($header, 0, 8) === "\x89PNG\r\n\x1A\n")
                $magicMime = 'image/png';
            elseif (
                substr($header, 0, 4) === 'RIFF' &&
                substr($header, 8, 4) === 'WEBP'
            )
                $magicMime = 'image/webp';
            elseif (
                substr($header, 0, 6) === 'GIF87a' ||
                substr($header, 0, 6) === 'GIF89a'
            )
                $magicMime = 'image/gif';
        }

        $resolvedMime = isset($mimeMap[$baseMime]) ? $baseMime : ($magicMime ?? null);
        if (!$resolvedMime || !isset($mimeMap[$resolvedMime])) {
            $response->getBody()->write(json_encode(['error' => 'El contenido descargado no es una imagen válida (JPG, PNG, WEBP, GIF)']));
            return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
        }

        $ext = $mimeMap[$resolvedMime];

        // ── Resolve save path ────────────────────────────────────────────────
        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT imagen FROM productos WHERE codigo = ?");
        $stmt->execute([$codigo]);
        $product = $stmt->fetch();

        if (!$product) {
            $response->getBody()->write(json_encode(['error' => 'Producto no encontrado']));
            return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
        }

        $baseFilename = !empty($product['imagen']) ? $product['imagen'] : $codigo;
        $baseFilename = str_replace(['/', ' '], ['-', '_'], $baseFilename);

        $basePath = resolveImagesPath();

        if (!is_dir($basePath)) {
            mkdir($basePath, 0775, true);
        }

        // Remove existing files with same base name
        $existing = glob(rtrim($basePath, '/') . '/' . $baseFilename . '.*');
        if ($existing) {
            foreach ($existing as $old) {
                @unlink($old);
            }
        }

        $newFilename = $baseFilename . '.' . $ext;
        $destPath = rtrim($basePath, '/') . '/' . $newFilename;

        if (file_put_contents($destPath, $imageData) === false) {
            $response->getBody()->write(json_encode(['error' => 'No se pudo guardar la imagen en el servidor']));
            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }

        $response->getBody()->write(json_encode([
            'message' => 'Imagen guardada correctamente desde URL',
            'filename' => $newFilename,
        ]));
        return $response->withHeader('Content-Type', 'application/json');

    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => 'Error: ' . $e->getMessage()]));
        return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
    }
})->add(new AuthMiddleware('admin'));

// Use {codigo:.+} to allow slashes inside the product code (like FI19999/1)
$app->get('/api/products/image/{codigo:.+}', function (Request $request, Response $response, $args) {
    // 1. Clean the code (remove spaces)
    $codigo = trim($args['codigo']);

    // 2. Resolve images directory
    $siteRoot = realpath(__DIR__ . '/../../../') ?: dirname(__DIR__, 3);
    $basePath = resolveImagesPath();
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


    // 4. If no product image found:
    //    - If the request is for the special "default" key, serve default.png
    //    - Otherwise return 404 so the frontend onError handler fires
    if (!$filePath) {
        if ($codigo === 'default') {
            $defaultCandidates = [
                $siteRoot . '/images/products/default.png',
                $siteRoot . '/public/images/products/default.png',
                rtrim($basePath, '/') . '/default.png',
            ];
            foreach ($defaultCandidates as $candidate) {
                if (file_exists($candidate)) {
                    $filePath = $candidate;
                    break;
                }
            }
        }

        // Still nothing (or not a "default" request) → 404
        if (!$filePath) {
            return $response->withStatus(404);
        }
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