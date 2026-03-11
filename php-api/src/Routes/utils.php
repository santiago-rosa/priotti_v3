<?php

use App\Config\Database;
use App\Middleware\AuthMiddleware;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/** @var \Slim\App $app */

$app->get('/api/utils/export', function (Request $request, Response $response) {
    $user = $request->getAttribute('user');
    $clientId = $user->id;

    try {
        $db = Database::getConnection();

        $stmt = $db->prepare("SELECT porcentajeaumento FROM clientes WHERE id = ?");
        $stmt->execute([$clientId]);
        $cliente = $stmt->fetch();
        $coeficiente = floatval($cliente['porcentajeaumento'] ?? 1);

        $stmt = $db->prepare("SELECT * FROM productos WHERE vigente != 0 ORDER BY marca ASC, rubro ASC, codigo ASC");
        $stmt->execute();
        $productos = $stmt->fetchAll();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Lista Priotti');

        $sheet->setCellValue('A1', 'CODIGO');
        $sheet->setCellValue('B1', 'MARCA');
        $sheet->setCellValue('C1', 'RUBRO');
        $sheet->setCellValue('D1', 'APLICACION');
        $sheet->setCellValue('E1', 'PRECIO');

        $row = 2;
        foreach ($productos as $p) {
            $sheet->setCellValue('A' . $row, $p['codigo']);
            $sheet->setCellValue('B' . $row, $p['marca']);
            $sheet->setCellValue('C' . $row, $p['rubro']);
            $sheet->setCellValue('D' . $row, str_replace('=', 'IDEM ', $p['aplicacion'] ?? ''));
            $sheet->setCellValue('E' . $row, round($p['precio_lista'] * $coeficiente, 2));
            $row++;
        }

        $writer = new Xlsx($spreadsheet);
        $tempFile = tempnam(sys_get_temp_dir(), 'export');
        $writer->save($tempFile);

        $stream = fopen($tempFile, 'rb');
        $response = $response
            ->withHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            ->withHeader('Content-Disposition', 'attachment; filename="listapriotti.xlsx"')
            ->withBody(new \Slim\Psr7\Stream($stream));

        // Clean up temp file after response is sent? In PHP scripts it's harder, but sys_get_temp_dir is fine.
        return $response;

    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => 'Error generating file: ' . $e->getMessage()]));
        return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
    }
})->add(new AuthMiddleware());

$app->post('/api/utils/contact', function (Request $request, Response $response) {
    $data = $request->getParsedBody();
    $name = $data['name'] ?? '';
    $phone = $data['phone'] ?? '';
    $email = $data['email'] ?? '';
    $message = $data['message'] ?? '';

    if (empty($name) || empty($email) || empty($message)) {
        $response->getBody()->write(json_encode(['error' => 'Faltan campos (nombre, email, mensaje)']));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }

    $emailService = new \App\Services\EmailService();
    $sent = $emailService->sendContactMessage($name, $phone, $email, $message);

    if ($sent) {
        $response->getBody()->write(json_encode(['message' => 'Mensaje enviado correctamente']));
    } else {
        $response->getBody()->write(json_encode(['error' => 'No se pudo enviar el mensaje. Intente más tarde.']));
        return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
    }

    return $response->withHeader('Content-Type', 'application/json');
});
