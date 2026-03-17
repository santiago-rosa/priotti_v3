<?php

use App\Config\Database;
use App\Middleware\AuthMiddleware;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/** @var \Slim\App $app */

$app->post('/api/import/ofertas', function (Request $request, Response $response) {
    $uploadedFiles = $request->getUploadedFiles();
    $uploadedFile = $uploadedFiles['file'] ?? null;

    if (!$uploadedFile || $uploadedFile->getError() !== UPLOAD_ERR_OK) {
        $response->getBody()->write(json_encode(['error' => 'Falta el archivo ofertas.txt']));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }

    try {
        $db = Database::getConnection();

        // Reset all offers to 0
        $db->exec("UPDATE productos SET precio_oferta = 0");

        $stream = $uploadedFile->getStream();
        $content = (string)$stream;

        // Handle latin1 to utf8
        $content = mb_convert_encoding($content, 'UTF-8', 'ISO-8859-1');
        $lines = explode("\n", $content);

        $faltan = [];
        $stmtUpdate = $db->prepare("UPDATE productos SET precio_oferta = ? WHERE codigo = ?");
        $stmtCheck = $db->prepare("SELECT codigo FROM productos WHERE codigo = ? LIMIT 1");

        foreach ($lines as $line) {
            $aux = trim($line);
            if ($aux !== '' && str_contains($aux, '$')) {
                $parts = explode('$', $aux);
                $codigo = trim($parts[0]);
                $ofertaStr = str_replace(['.', ','], ['', '.'], $parts[1]);
                $oferta = floatval($ofertaStr);

                $stmtCheck->execute([$codigo]);
                if (!$stmtCheck->fetch()) {
                    $faltan[] = "$codigo--$$oferta";
                }
                else {
                    $stmtUpdate->execute([$oferta, $codigo]);
                }
            }
        }

        $db->exec("INSERT INTO act_oferta (fecha) VALUES (NOW())");

        $response->getBody()->write(json_encode(['message' => 'Ofertas actualizadas', 'faltan' => $faltan]));
        return $response->withHeader('Content-Type', 'application/json');

    }
    catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => 'Error procesando archivo: ' . $e->getMessage()]));
        return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
    }
})->add(new AuthMiddleware('admin'));

$app->post('/api/import/bulk-update', function (Request $request, Response $response) {
    $data = $request->getParsedBody();

    if (!isset($data['insert']) || !isset($data['update']) || !isset($data['delete'])) {
        $response->getBody()->write(json_encode(['error' => 'Formato de datos inválido']));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }

    try {
        $db = Database::getConnection();
        $db->beginTransaction();

        // Process Inserts (IGNORE ensures we don't overwrite existing items)
        $sqlInsert = "INSERT IGNORE INTO productos (codigo, aplicacion, marca, rubro, precio_lista, precio_oferta, info, imagen, vigente, fecha_agregado, fecha_modif) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())";
        $stmtInsert = $db->prepare($sqlInsert);
        foreach ($data['insert'] as $item) {
            $stmtInsert->execute([
                $item['codigo'],
                $item['aplicacion'] ?? '',
                $item['marca'] ?? '',
                $item['rubro'] ?? '',
                $item['precio'] ?? 0,
                $item['precio_oferta'] ?? 0,
                $item['info'] ?? '',
                $item['imagen'] ?? '',
            ]);
        }

        // Process Updates
        foreach ($data['update'] as $item) {
            $fields = [];
            $params = [];

            if (isset($item['aplicacion'])) {
                $fields[] = "aplicacion = ?";
                $params[] = $item['aplicacion'];
            }
            if (isset($item['marca'])) {
                $fields[] = "marca = ?";
                $params[] = $item['marca'];
            }
            if (isset($item['rubro'])) {
                $fields[] = "rubro = ?";
                $params[] = $item['rubro'];
            }
            if (isset($item['precio'])) {
                $fields[] = "precio_lista = ?";
                $params[] = $item['precio'];
            }
            if (isset($item['precio_oferta'])) {
                $fields[] = "precio_oferta = ?";
                $params[] = $item['precio_oferta'];
            }
            if (isset($item['info'])) {
                $fields[] = "info = ?";
                $params[] = $item['info'];
            }
            if (isset($item['imagen'])) {
                $fields[] = "imagen = ?";
                $params[] = $item['imagen'];
            }

            if (!empty($fields)) {
                $fields[] = "vigente = 1"; // Reactive if it was hidden
                $fields[] = "fecha_modif = NOW()";
                $sql = "UPDATE productos SET " . implode(', ', $fields) . " WHERE codigo = ?";
                $params[] = $item['codigo'];
                $db->prepare($sql)->execute($params);
            }
        }

        // Process Deletes (Soft delete by setting vigente = 0)
        $stmtDelete = $db->prepare("UPDATE productos SET vigente = 0, fecha_modif = NOW() WHERE codigo = ?");
        foreach ($data['delete'] as $item) {
            $stmtDelete->execute([$item['codigo']]);
        }

        // Log the update
        $cambios = "Inserts: " . count($data['insert']) . ", Updates: " . count($data['update']) . ", Deletes: " . count($data['delete']);
        $stmtLog = $db->prepare("INSERT INTO act_lista (fecha, cambios) VALUES (NOW(), ?)");
        $stmtLog->execute([$cambios]);

        $db->commit();

        $response->getBody()->write(json_encode([
            'message' => 'Sincronización completada',
            'details' => [
                'inserted' => count($data['insert']),
                'updated' => count($data['update']),
                'deleted' => count($data['delete'])
            ]
        ]));
        return $response->withHeader('Content-Type', 'application/json');

    }
    catch (\Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        $response->getBody()->write(json_encode(['error' => 'Error en la sincronización: ' . $e->getMessage()]));
        return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
    }
})->add(new AuthMiddleware('admin'));

$app->get('/api/import/status', function (Request $request, Response $response) {
    try {
        $db = Database::getConnection();
        $stmtL = $db->query("SELECT fecha, cambios FROM act_lista ORDER BY fecha DESC LIMIT 1");
        $lastLista = $stmtL->fetch();

        $stmtO = $db->query("SELECT fecha FROM act_oferta ORDER BY fecha DESC LIMIT 1");
        $lastOferta = $stmtO->fetch();

        $response->getBody()->write(json_encode([
            'lista' => $lastLista['fecha'] ?? null,
            'cambios' => $lastLista['cambios'] ?? '',
            'ofertas' => $lastOferta['fecha'] ?? null
        ]));
        return $response->withHeader('Content-Type', 'application/json');
    }
    catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => 'Error: ' . $e->getMessage()]));
        return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
    }
})->add(new AuthMiddleware());