<?php

use Slim\Factory\AppFactory;
use Tuupola\Middleware\CorsMiddleware;
use App\Middleware\AuthMiddleware;

require __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

// Load local overrides if they exist (not committed to git)
if (file_exists(__DIR__ . '/../.env.local')) {
    $dotenvLocal = Dotenv\Dotenv::createMutable(__DIR__ . '/..', '.env.local');
    $dotenvLocal->load();
}

$isDev = ($_ENV['APP_ENV'] ?? 'production') === 'development';

// 1. Configure Error Display
ini_set('display_errors', $isDev ? '1' : '0');
ini_set('display_startup_errors', $isDev ? '1' : '0');
error_reporting(E_ALL);

// 2. Configure Error Logging
$logFile = __DIR__ . '/../logs/php-error.log';
ini_set('log_errors', '1');
ini_set('error_log', $logFile);

$app = AppFactory::create();

// Set base path dynamically for subfolder hosting
$scriptName = $_SERVER['SCRIPT_NAME'];
$basePath = str_replace('/index.php', '', $scriptName);
$app->setBasePath($basePath);

$app->addBodyParsingMiddleware();
$app->addRoutingMiddleware();

// CORS - The most robust way for shared hosting
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: $origin");
header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Authorization, Content-Type, Accept, Origin, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Max-Age: 86400");

// Immediately end OPTIONS requests with a 204
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Optional: Log requests to a file to verify they arrive (debug only)
// file_put_contents(__DIR__ . '/log.txt', date('Y-m-d H:i:s') . " - " . $_SERVER['REQUEST_METHOD'] . " " . $_SERVER['REQUEST_URI'] . "\n", FILE_APPEND);

// addErrorMiddleware(bool $displayErrorDetails, bool $logErrors, bool $logErrorDetails)
$app->addErrorMiddleware($isDev, true, true);

// API Routes
$app->get('/', function ($request, $response) {
    $response->getBody()->write(json_encode(["message" => "Priotti PHP API is running"]));
    return $response->withHeader('Content-Type', 'application/json');
});

// Import individual route files
require __DIR__ . '/../src/Routes/auth.php';
require __DIR__ . '/../src/Routes/products.php';
require __DIR__ . '/../src/Routes/orders.php';
require __DIR__ . '/../src/Routes/clients.php';
require __DIR__ . '/../src/Routes/import.php';
require __DIR__ . '/../src/Routes/utils.php';

$app->run();
