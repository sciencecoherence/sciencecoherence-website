<?php
declare(strict_types=1);

ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');

function wr_path_within(string $path, string $directory): bool {
    $path = str_replace('\\', '/', $path);
    $directory = rtrim(str_replace('\\', '/', $directory), '/');
    if (DIRECTORY_SEPARATOR === '\\') {
        $path = strtolower($path);
        $directory = strtolower($directory);
    }
    return $path === $directory || strncmp($path, $directory . '/', strlen($directory) + 1) === 0;
}

function wr_config_is_safe(string $resolvedPath, string $siteRoot): bool {
    $docRoot = (string) ($_SERVER['DOCUMENT_ROOT'] ?? '');
    $publicRoots = array_filter([$siteRoot, $docRoot]);
    $insidePublic = false;
    foreach ($publicRoots as $root) {
        $realRoot = realpath($root);
        if ($realRoot !== false && wr_path_within($resolvedPath, $realRoot)) {
            $insidePublic = true;
            break;
        }
    }
    if (!$insidePublic) return true;

    $norm = str_replace('\\', '/', $resolvedPath);
    if (str_contains($norm, '/inc/') && str_ends_with($norm, '.php')) {
        return true;
    }
    return false;
}

function wr_database_config_candidates(): array {
    $candidates = [];
    $envWr = getenv('SC_WRITING_ROOM_DB_CONFIG');
    if ($envWr !== false && trim($envWr) !== '') $candidates[] = trim($envWr);
    $envBlog = getenv('SC_BLOG_DB_CONFIG');
    if ($envBlog !== false && trim($envBlog) !== '') $candidates[] = trim($envBlog);

    // 1. Dedicated file in writing-room/inc/database.php (protected by .htaccess)
    $candidates[] = __DIR__ . '/database.php';

    // 2. Discover private directories relative to the site root and server root
    $siteRoot = dirname(__DIR__, 2);
    $privateParent = dirname($siteRoot);
    if (in_array(strtolower(basename($privateParent)), ['public_html', 'www', 'htdocs', 'httpdocs'], true)) {
        $privateParent = dirname($privateParent);
    }

    $dirs = [
        $privateParent,
        dirname($siteRoot),
        dirname($siteRoot, 2),
        dirname($siteRoot, 3),
    ];

    $host = (string) ($_SERVER['HTTP_HOST'] ?? '');
    if (preg_match('/^([a-z0-9-]+)\.([a-z0-9-]+\.[a-z]+)$/i', $host, $m)) {
        $mainDomain = $m[2];
        $parentOfDomain = dirname($privateParent);
        $dirs[] = $parentOfDomain . '/' . $mainDomain;
    }
    $dirs[] = '/home/u417347216/domains/sciencecoherence.com';
    $dirs[] = '/home/u417347216';

    $uniqueDirs = array_unique(array_filter($dirs));
    foreach ($uniqueDirs as $dir) {
        $norm = rtrim(str_replace('\\', '/', $dir), '/');
        $candidates[] = $norm . '/.private/science-coherence-blog/database.php';
        $candidates[] = $norm . '/.private/database.php';
    }

    // 3. Fallback to live blog configuration if .private has not been created yet
    foreach ($uniqueDirs as $dir) {
        $norm = rtrim(str_replace('\\', '/', $dir), '/');
        $candidates[] = $norm . '/public_html/blog/community/inc/config.php';
        $candidates[] = $norm . '/blog/community/inc/config.php';
    }

    return array_values(array_unique($candidates));
}

function wr_load_database_config(): void {
    static $loaded = false;
    if ($loaded) return;

    $siteRoot = dirname(__DIR__, 2);
    $candidates = wr_database_config_candidates();
    $selectedPath = null;

    foreach ($candidates as $candidate) {
        if (!preg_match('~^(?:[A-Za-z]:[/\\\\]|/)~', $candidate)) continue;
        $resolved = realpath($candidate);
        if ($resolved === false || !is_file($resolved) || !is_readable($resolved)) continue;
        if (!wr_config_is_safe($resolved, $siteRoot)) continue;
        $selectedPath = $resolved;
        break;
    }

    if ($selectedPath === null) {
        throw new RuntimeException('Private database configuration is unavailable.');
    }

    require_once $selectedPath;
    foreach (['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS'] as $key) {
        if (!defined($key) || !is_string(constant($key)) || constant($key) === '') {
            throw new RuntimeException('Private database configuration is incomplete.');
        }
    }
    $loaded = true;
}

function wr_database_unavailable(string $stage, Throwable $error, bool $json = false): never {
    $code = preg_replace('/[^A-Za-z0-9_-]/', '', (string) $error->getCode());
    error_log(json_encode([
        'event' => 'science_coherence_writing_room_database_unavailable',
        'stage' => $stage,
        'exception' => get_class($error),
        'message' => $error->getMessage(),
        'code' => $code,
    ], JSON_UNESCAPED_SLASHES));
    http_response_code(503);
    header('Cache-Control: no-store');
    header('Retry-After: 60');

    $isDebug = !empty($_GET['debug']) || !empty($_GET['check']);

    if ($json) {
        header('Content-Type: application/json; charset=UTF-8');
        $payload = ['error' => 'The Writing Room database is temporarily unavailable. Try again shortly.'];
        if ($isDebug) {
            $payload['debug'] = [
                'stage' => $stage,
                'error' => $error->getMessage(),
            ];
        }
        echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    } else {
        header('Content-Type: text/html; charset=UTF-8');
        if ($isDebug) {
            $candidates = wr_database_config_candidates();
            echo '<!doctype html><html lang="en"><head><meta charset="utf-8">'
                . '<meta name="viewport" content="width=device-width,initial-scale=1">'
                . '<title>Writing Room — Database Diagnostics</title>'
                . '<style>body{padding:2rem;font-family:sans-serif;line-height:1.5;max-width:720px;margin:0 auto;color:#1e293b;}'
                . 'h1{font-size:1.5rem;margin-bottom:0.5rem;}code{background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:0.9em;}'
                . '.paths{font-size:0.85rem;padding-left:1.2rem;margin:1rem 0;}'
                . '.paths li{margin-bottom:0.35rem;}.not-found{color:#dc2626;font-weight:600;}.found{color:#16a34a;font-weight:700;}'
                . '.box{margin-top:1.5rem;padding:1rem;background:#f8fafc;border-left:4px solid #0284c7;font-size:0.9rem;border-radius:4px;}'
                . '</style></head><body><main>'
                . '<h1>Writing Room — Database Diagnostics</h1>'
                . '<p>Failure stage: <strong>' . wr_e($stage) . '</strong></p>'
                . '<p>Error message: <code>' . wr_e($error->getMessage()) . '</code></p>'
                . '<h2>Configuration Paths Checked:</h2><ul class="paths">';
            foreach ($candidates as $candidate) {
                $resolved = realpath($candidate);
                $exists = ($resolved !== false && is_file($resolved));
                $badge = $exists ? '<span class="found">✓ Found</span>' : '<span class="not-found">✗ Not found</span>';
                echo '<li>' . $badge . ' ' . wr_e($candidate) . '</li>';
            }
            echo '</ul><div class="box"><strong>How to resolve:</strong><br>'
                . 'Create <code>writing-room/inc/database.php</code> (or <code>.private/science-coherence-blog/database.php</code>) defining <code>DB_HOST</code>, <code>DB_NAME</code>, <code>DB_USER</code>, and <code>DB_PASS</code>. A template is provided in <code>writing-room/inc/database.example.php</code>.'
                . '</div></main></body></html>';
        } else {
            echo '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Writing Room unavailable</title></head><body><main>'
                . '<h1>Temporarily unavailable</h1>'
                . '<p>The Writing Room could not connect to its database. Please try again shortly.</p>'
                . '<p style="margin-top:2rem;font-size:0.85rem;color:#64748b;">Administrator: to view diagnostic details, add <code>?debug=1</code> to this page.</p>'
                . '</main></body></html>';
        }
    }
    exit;
}

function wr_db(bool $json = false): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;
    $stage = 'configuration';
    try {
        wr_load_database_config();
        $stage = 'connection';
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER,
            DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
        );
        return $pdo;
    } catch (Throwable $error) {
        $pdo = null;
        wr_database_unavailable($stage, $error, $json);
    }
}

function wr_secure_request(): bool {
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
}

session_name('sc_writing_room');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/writing-room')), '/') . '/',
    'secure' => wr_secure_request(),
    'httponly' => true,
    'samesite' => 'Strict',
]);
session_start();
if (empty($_SESSION['wr_csrf'])) $_SESSION['wr_csrf'] = bin2hex(random_bytes(24));

function wr_e(string $value): string {
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

function wr_current_user(bool $json = false): ?array {
    if (empty($_SESSION['wr_user_id'])) return null;
    $statement = wr_db($json)->prepare('SELECT id, username, email, is_admin, role, status FROM users WHERE id = ?');
    $statement->execute([(int) $_SESSION['wr_user_id']]);
    $user = $statement->fetch();
    return $user ?: null;
}

function wr_require_admin(bool $json = false): array {
    $user = wr_current_user($json);
    if (!$user) {
        if ($json) {
            http_response_code(401);
            header('Content-Type: application/json; charset=UTF-8');
            header('Cache-Control: no-store');
            echo json_encode(['error' => 'Log in to open the Writing Room.', 'login' => '../login.php']);
            exit;
        }
        header('Location: login.php');
        exit;
    }
    if (empty($user['is_admin'])) {
        http_response_code(403);
        if ($json) {
            header('Content-Type: application/json; charset=UTF-8');
            echo json_encode(['error' => 'The Writing Room is limited to the site administrator.']);
        } else {
            echo 'The Writing Room is limited to the site administrator.';
        }
        exit;
    }
    return $user;
}

function wr_csrf_field(): string {
    return '<input type="hidden" name="csrf" value="' . wr_e((string) $_SESSION['wr_csrf']) . '">';
}

function wr_csrf_valid(string $token): bool {
    return $token !== '' && hash_equals((string) $_SESSION['wr_csrf'], $token);
}

function wr_schema_ready(PDO $db): bool {
    foreach (['sc_wr_articles', 'sc_wr_drafts', 'sc_wr_revisions', 'sc_wr_collections'] as $table) {
        $statement = $db->query("SHOW TABLES LIKE " . $db->quote($table));
        if (!$statement->fetch()) return false;
    }
    return true;
}

function wr_security_headers(string $type = 'text/html; charset=UTF-8'): void {
    header('Content-Type: ' . $type);
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: no-referrer');
    header('X-Frame-Options: DENY');
    header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; frame-src 'self' about:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
}
