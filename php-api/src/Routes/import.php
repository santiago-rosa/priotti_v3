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
        $content = (string) $stream;

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
                } else {
                    $stmtUpdate->execute([$oferta, $codigo]);
                }
            }
        }

        $db->exec("INSERT INTO act_oferta (fecha) VALUES (NOW())");

        $response->getBody()->write(json_encode(['message' => 'Ofertas actualizadas', 'faltan' => $faltan]));
        return $response->withHeader('Content-Type', 'application/json');

    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => 'Error procesando archivo: ' . $e->getMessage()]));
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
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => 'Error: ' . $e->getMessage()]));
        return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
    }
})->add(new AuthMiddleware());
