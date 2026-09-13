<?php
declare(strict_types=1);

require_once __DIR__ . '/inc/bootstrap.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !wr_csrf_valid((string) ($_POST['csrf'] ?? ''))) {
    http_response_code(403);
    exit('Invalid request.');
}
$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $parameters = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $parameters['path'], $parameters['domain'], $parameters['secure'], $parameters['httponly']);
}
session_destroy();
header('Location: login.php');
