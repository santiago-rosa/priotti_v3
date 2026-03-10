<?php

namespace App\Config;

use PDO;
use PDOException;

class Database
{
    private static $instance = null;

    public static function getConnection()
    {
        if (self::$instance === null) {
            $host = $_ENV['DB_HOST'] ?? '127.0.0.1';
            $db = $_ENV['DB_NAME'] ?? '';
            $user = $_ENV['DB_USER'] ?? '';
            $pass = $_ENV['DB_PASS'] ?? '';
            $charset = 'utf8mb4';

            // Extract from DATABASE_URL if present (Prisma style)
            if (isset($_ENV['DATABASE_URL'])) {
                $url = parse_url($_ENV['DATABASE_URL']);
                $host = $url['host'] ?? '127.0.0.1';
                $db = isset($url['path']) ? ltrim($url['path'], '/') : '';
                $user = $url['user'] ?? '';
                $pass = $url['pass'] ?? '';
            }

            $dsn = "mysql:host=$host;dbname=$db;charset=$charset";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];

            try {
                self::$instance = new PDO($dsn, $user, $pass, $options);
            } catch (PDOException $e) {
                throw new PDOException("Connection failed: " . $e->getMessage(), (int) $e->getCode());
            }
        }

        return self::$instance;
    }
}
