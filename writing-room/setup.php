<?php
declare(strict_types=1);

require_once __DIR__ . '/inc/articles.php';
$user = wr_require_admin();
$db = wr_db();
$ready = wr_schema_ready($db);
$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && !$ready) {
    if (!wr_csrf_valid((string) ($_POST['csrf'] ?? ''))) {
        http_response_code(403);
        $error = 'The page expired. Reload it and try again.';
    } else {
        try {
            $schema = @file_get_contents(__DIR__ . '/schema.sql');
            if ($schema === false) throw new RuntimeException('The setup instructions could not be read.');
            foreach (preg_split('/;\s*(?:\r?\n|$)/', $schema) ?: [] as $statement) {
                if (trim($statement) !== '') $db->exec($statement);
            }
            [, $articles] = wr_read_articles();
            $insert = $db->prepare(
                'INSERT IGNORE INTO sc_wr_articles (article_id, article_json, revision, published_by, published_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP())'
            );
            foreach ($articles as $article) {
                $insert->execute([(string) $article['id'], wr_json($article), wr_revision($article), (int) $user['id']]);
            }
            [, $collections] = wr_read_collections();
            $insertCollection = $db->prepare(
                'INSERT IGNORE INTO sc_wr_collections (collection_id, collection_json, revision, updated_by, updated_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP())'
            );
            foreach ($collections as $collection) {
                $insertCollection->execute([(string) $collection['id'], wr_json($collection), hash('sha256', wr_json($collection, true)), (int) $user['id']]);
            }
            $ready = true;
            $message = 'The Writing Room is connected and ready.';
        } catch (Throwable $exception) {
            error_log(json_encode(['event' => 'science_coherence_writing_room_setup_failed', 'exception' => get_class($exception), 'code' => (string) $exception->getCode()]));
            $error = 'Setup could not finish. No blog users were changed. Check that the database account can create tables, then try again.';
        }
    }
}

if ($ready && $message === '' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: index.php');
    exit;
}
wr_security_headers();
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Writing Room — Setup</title>
  <link rel="icon" href="../assets/mark.svg" type="image/svg+xml">
  <link rel="stylesheet" href="online.css">
</head>
<body>
  <main class="gateway">
    <a class="gateway-brand" href="../"><img src="../assets/mark.svg" alt=""><span>Science Coherence<small>THE WRITING ROOM</small></span></a>
    <p class="eyebrow"><i></i> ONE-TIME SETUP</p>
    <h1>Connect the room.</h1>
    <p class="intro">This adds four Writing Room tables beside the blog tables — articles, drafts, revisions and collections. It reuses the existing administrator account and does not alter the blog’s users.</p>
    <?php if ($message !== ''): ?><p class="success"><?= wr_e($message) ?></p><p><a class="gateway-button" href="index.php">Open the Writing Room <span>↗</span></a></p><?php elseif ($error !== ''): ?><p class="notice" role="alert"><?= wr_e($error) ?></p><?php endif; ?>
    <?php if (!$ready): ?><form method="post" action="setup.php" class="gateway-form setup-form">
      <?= wr_csrf_field() ?>
      <button type="submit">Connect database <span>↗</span></button>
    </form><?php endif; ?>
    <p class="fine-print">Only an authenticated administrator can run this setup.</p>
  </main>
</body>
</html>
