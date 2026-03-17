<?php

namespace App\Services;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

class EmailService
{
    private PHPMailer $mail;

    public function __construct()
    {
        $this->mail = new PHPMailer(true);
        $this->setup();
    }

    private function setup(): void
    {
        $host = $_ENV['MAIL_HOST'] ?? 'localhost';
        $port = (int)($_ENV['MAIL_PORT'] ?? 1025);
        $username = $_ENV['MAIL_USERNAME'] ?? '';
        $password = $_ENV['MAIL_PASSWORD'] ?? '';
        $encryption = $_ENV['MAIL_ENCRYPTION'] ?? '';
        $fromAddress = $_ENV['MAIL_FROM_ADDRESS'] ?? 'noreply@felipepriotti.com.ar';
        $fromName = $_ENV['MAIL_FROM_NAME'] ?? 'Priotti';

        try {
            // Server settings
            $this->mail->isSMTP();
            $this->mail->Host = $host;
            $this->mail->Port = $port;
            $this->mail->CharSet = 'UTF-8';

            // Only enable SMTP auth and encryption if credentials / encryption are provided
            if (!empty($username) && !empty($password)) {
                $this->mail->SMTPAuth = true;
                $this->mail->Username = $username;
                $this->mail->Password = $password;
            } else {
                $this->mail->SMTPAuth = false;
            }

            if (!empty($encryption)) {
                $this->mail->SMTPSecure = strtolower($encryption) === 'ssl' ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS;
            }

            // Trust self-signed certificates and mismatched hostnames (common in cPanel shared hosting)
            $this->mail->SMTPOptions = [
                'ssl' => [
                    'verify_peer' => false,
                    'verify_peer_name' => false,
                    'allow_self_signed' => true
                ]
            ];

            // Configured From
            $this->mail->setFrom($fromAddress, $fromName);
            
            // Allow sending HTML
            $this->mail->isHTML(true);

        } catch (Exception $e) {
            error_log('Email setup error: ' . $e->getMessage());
        }
    }

    /**
     * Parse the MAIL_ADMIN_TO environment variable which could be comma-separated
     */
    private function addAdminRecipients(): void
    {
        $adminEmails = $_ENV['MAIL_ADMIN_TO'] ?? 'fpriotti@felipepriotti.com.ar,contacto@felipepriotti.com.ar';
        $emails = explode(',', $adminEmails);
        foreach ($emails as $email) {
            $email = trim($email);
            if (!empty($email) && filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $this->mail->addAddress($email);
            }
        }
    }

    public function sendContactMessage(string $name, string $phone, string $email, string $message): bool
    {
        try {
            $this->mail->clearAddresses();
            $this->mail->clearReplyTos();
            
            $this->addAdminRecipients();
            $this->mail->addReplyTo($email, $name);

            $this->mail->Subject = 'Consulta de ' . rtrim($name);
            
            // Build the HTML body
            $body = "<h2>Nueva Consulta</h2>";
            $body .= "<p><strong>Nombre:</strong> " . htmlspecialchars($name) . "</p>";
            if (!empty($phone)) {
                $body .= "<p><strong>Teléfono:</strong> " . htmlspecialchars($phone) . "</p>";
            }
            $body .= "<p><strong>Email:</strong> " . htmlspecialchars($email) . "</p>";
            $body .= "<h3>Mensaje:</h3>";
            $body .= "<p>" . nl2br(htmlspecialchars($message)) . "</p>";

            $this->mail->Body = $body;
            $this->mail->AltBody = strip_tags($body);

            return $this->mail->send();
            
        } catch (Exception $e) {
            error_log('Email sendContactMessage error: ' . $this->mail->ErrorInfo);
            return false;
        }
    }

    public function sendOrderNotification(string $clientCode, string $clientName, string $itemsString): bool
    {
        try {
            $this->mail->clearAddresses();
            
            $this->addAdminRecipients();

            $this->mail->Subject = 'Pedido de Cliente Cod: ' . rtrim($clientCode) . ' - ' . rtrim($clientName);
            
            // Translate the "codigo&marca&cant,..." string into HTML table
            $body = "<h2>Nuevo Pedido</h2>";
            $body .= "<p><strong>Cliente:</strong> $clientName [Código: $clientCode]</p>";
            $body .= "<h3>Artículos:</h3>";
            $body .= "<table border='1' cellpadding='5' style='border-collapse: collapse;'>";
            $body .= "<thead><tr><th>Código</th><th>Marca</th><th>Cantidad</th></tr></thead><tbody>";
            
            $itemsArray = explode(',', trim($itemsString, ','));
            foreach ($itemsArray as $item) {
                if (empty($item)) continue;
                $parts = explode('&', $item);
                if (count($parts) >= 3) {
                    $body .= "<tr>";
                    $body .= "<td>" . htmlspecialchars($parts[0]) . "</td>";
                    $body .= "<td>" . htmlspecialchars($parts[1]) . "</td>";
                    $body .= "<td>" . htmlspecialchars($parts[2]) . "</td>";
                    $body .= "</tr>";
                }
            }
            $body .= "</tbody></table>";

            $this->mail->Body = $body;
            $this->mail->AltBody = "Nuevo Pedido: Cliente [Cod: $clientCode] - $clientName\n\nArtículos: \n" . str_replace(['&', ','], [' - ', "\n"], $itemsString);

            return $this->mail->send();

        } catch (Exception $e) {
            error_log('Email sendOrderNotification error: ' . $this->mail->ErrorInfo);
            return false;
        }
    }
}
