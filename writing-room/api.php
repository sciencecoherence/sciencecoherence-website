<?php
declare(strict_types=1);

require_once __DIR__ . '/inc/articles.php';
wr_security_headers('application/json; charset=UTF-8');

try {
    $user = wr_require_admin(true);
    $db = wr_db(true);
    if (!wr_schema_ready($db)) {
        http_response_code(503);
        echo wr_json(['error' => 'The Writing Room database tables are not installed yet. Open the setup page once from a computer.', 'setup' => '../setup.php']);
        exit;
    }
    $action = (string) ($_GET['action'] ?? 'state');
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if ($action !== 'state') {
            http_response_code(404);
            echo wr_json(['error' => 'Not found.']);
            exit;
        }
        echo wr_json(wr_state($db, $user));
        exit;
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !in_array($action, ['draft', 'apply', 'discard', 'collection-create', 'collection-rename', 'page-save', 'page-apply'], true)) {
        http_response_code(404);
        echo wr_json(['error' => 'Not found.']);
        exit;
    }
    $origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
    $expectedOrigin = (wr_secure_request() ? 'https://' : 'http://') . (string) ($_SERVER['HTTP_HOST'] ?? '');
    if ($origin !== '' && !hash_equals($expectedOrigin, $origin)) throw new DomainException('This request did not come from your Writing Room. Reload the page.');
    if (!wr_csrf_valid((string) ($_SERVER['HTTP_X_WRITING_ROOM_TOKEN'] ?? ''))) throw new DomainException('Your Writing Room session changed. Reload before saving.');
    $length = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($length < 1 || $length > 4_000_000) throw new InvalidArgumentException('This request is too large to save.');
    if (stripos((string) ($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json') !== 0) throw new InvalidArgumentException('Expected JSON data.');
    $payload = json_decode((string) file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($payload)) throw new InvalidArgumentException('Expected payload object.');
    echo wr_json(
        ($action === 'page-save' || $action === 'page-apply')
            ? wr_save_page($db, $user, $payload)
            : (str_starts_with($action, 'collection-')
                ? wr_mutate_collection($db, $user, $action, $payload)
                : wr_mutate($db, $user, $action, $payload))
    );
} catch (DomainException $error) {
    http_response_code(409);
    echo wr_json(['error' => $error->getMessage()]);
} catch (InvalidArgumentException | JsonException $error) {
    http_response_code(400);
    echo wr_json(['error' => $error->getMessage()]);
} catch (Throwable $error) {
    error_log(json_encode(['event' => 'science_coherence_writing_room_error', 'exception' => get_class($error), 'code' => (string) $error->getCode()]));
    http_response_code(500);
    echo wr_json(['error' => 'The changes could not be saved. Your text is still on this page; copy it before reloading.']);
}
