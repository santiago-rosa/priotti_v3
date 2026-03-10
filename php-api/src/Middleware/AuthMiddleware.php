<?php

namespace App\Middleware;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\RequestHandlerInterface as Handler;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Slim\Psr7\Response as SlimResponse;

class AuthMiddleware
{
    private $role;

    public function __construct($role = null)
    {
        $this->role = $role;
    }

    public function __invoke(Request $request, Handler $handler): Response
    {
        $authHeader = $request->getHeaderLine('Authorization');

        if (!$authHeader) {
            return $this->unauthorized('No token provided');
        }

        $token = str_replace('Bearer ', '', $authHeader);
        $secret = $_ENV['JWT_SECRET'] ?? 'fallback_secret';

        try {
            $decoded = JWT::decode($token, new Key($secret, 'HS256'));
            $request = $request->withAttribute('user', $decoded);

            // Check role if specified
            if ($this->role && $decoded->role !== $this->role) {
                return $this->forbidden('Insufficient permissions');
            }

        } catch (\Exception $e) {
            return $this->unauthorized('Invalid or expired token');
        }

        return $handler->handle($request);
    }

    private function unauthorized($message): Response
    {
        $response = new SlimResponse();
        $response->getBody()->write(json_encode(['error' => $message]));
        return $response->withStatus(401)->withHeader('Content-Type', 'application/json');
    }

    private function forbidden($message): Response
    {
        $response = new SlimResponse();
        $response->getBody()->write(json_encode(['error' => $message]));
        return $response->withStatus(403)->withHeader('Content-Type', 'application/json');
    }
}
