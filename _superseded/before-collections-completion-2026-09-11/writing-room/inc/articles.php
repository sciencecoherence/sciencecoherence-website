<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

function wr_content_path(): string {
    return dirname(__DIR__, 2) . '/content.js';
}

function wr_collections_path(): string {
    return dirname(__DIR__, 2) . '/collections.js';
}

function wr_decode_collections(string $raw): array {
    $raw = preg_replace('/^\xEF\xBB\xBF/', '', $raw) ?? $raw;
    if (!preg_match('/^\s*window\.SC_COLLECTIONS\s*=\s*(\[.*\])\s*;?\s*$/s', $raw, $match)) {
        throw new RuntimeException('The website collection format has changed. Nothing has been overwritten.');
    }
    $collections = json_decode($match[1], true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($collections)) throw new RuntimeException('The website collection list is invalid.');
    $ids = [];
    foreach ($collections as $collection) {
        $id = $collection['id'] ?? null;
        $name = $collection['name'] ?? null;
        if (!is_string($id) || isset($ids[$id]) || !is_string($name) || trim($name) === '') {
            throw new RuntimeException('The website has invalid or duplicate collections.');
        }
        $ids[$id] = true;
    }
    return $collections;
}

function wr_read_collections(): array {
    $raw = @file_get_contents(wr_collections_path());
    if ($raw === false) throw new RuntimeException('The website collection file could not be read.');
    return [$raw, wr_decode_collections($raw)];
}

function wr_decode_articles(string $raw): array {
    $raw = preg_replace('/^\xEF\xBB\xBF/', '', $raw) ?? $raw;
    if (!preg_match('/^\s*window\.SC_CONTENT\s*=\s*(\[.*\])\s*;?\s*$/s', $raw, $match)) {
        throw new RuntimeException('The website content format has changed. Nothing has been overwritten.');
    }
    $articles = json_decode($match[1], true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($articles)) throw new RuntimeException('The website article list is invalid.');
    $ids = [];
    foreach ($articles as $article) {
        $id = $article['id'] ?? null;
        if (!is_string($id) || isset($ids[$id])) throw new RuntimeException('The website has missing or duplicate article addresses.');
        $ids[$id] = true;
    }
    return $articles;
}

function wr_read_articles(): array {
    $path = wr_content_path();
    $raw = @file_get_contents($path);
    if ($raw === false) throw new RuntimeException('The website article file could not be read.');
    return [$raw, wr_decode_articles($raw)];
}

function wr_json(mixed $value, bool $pretty = false): string {
    $flags = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR;
    if ($pretty) $flags |= JSON_PRETTY_PRINT;
    return json_encode($value, $flags);
}

function wr_revision(?array $article): ?string {
    return $article === null ? null : hash('sha256', wr_json($article, true));
}

function wr_find_article(array $articles, string $id): ?array {
    foreach ($articles as $article) if (($article['id'] ?? null) === $id) return $article;
    return null;
}

function wr_plain_text(string $html): string {
    $without = preg_replace('~<(script|style)\b[^>]*>.*?</\1>~is', ' ', $html) ?? $html;
    $plain = html_entity_decode(strip_tags($without), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    return trim(preg_replace('/\s+/u', ' ', $plain) ?? $plain);
}

function wr_refresh_metadata(array $article): array {
    $plain = wr_plain_text((string) $article['body']);
    $words = $plain === '' ? 0 : count(preg_split('/\s+/u', $plain) ?: []);
    $article['words'] = $words;
    $article['minutes'] = max(1, (int) ceil($words / 200));
    $fields = [];
    foreach (['title', 'subtitle', 'description', 'type'] as $key) $fields[] = (string) ($article[$key] ?? '');
    $article['search'] = mb_strtolower(trim(implode(' ', $fields) . ' ' . $plain), 'UTF-8');
    return $article;
}

function wr_validate_article(mixed $value): array {
    if (!is_array($value)) throw new InvalidArgumentException('Choose an article first.');
    $id = $value['id'] ?? '';
    if (!is_string($id) || !preg_match('/^[a-z0-9][a-z0-9-]{0,119}$/', $id)) {
        throw new InvalidArgumentException('Use a short article address with lowercase letters, numbers, and hyphens.');
    }
    foreach (['title', 'body', 'category', 'type', 'date', 'description'] as $field) {
        if (!isset($value[$field]) || !is_string($value[$field])) throw new InvalidArgumentException('The ' . $field . ' field must contain text.');
    }
    if (trim($value['title']) === '') throw new InvalidArgumentException('Give this article a title first.');
    if (mb_strlen($value['title']) > 240 || mb_strlen($value['description']) > 1200 || strlen($value['body']) > 3_500_000) {
        throw new InvalidArgumentException('This article is too large to save.');
    }
    if (preg_match('~<(?:script|iframe|object|embed|form|base|meta|link)\b|\son[a-z]+\s*=|javascript\s*:~i', $value['body'])) {
        throw new InvalidArgumentException('The article contains active page code that the online editor cannot publish.');
    }
    return $value;
}

function wr_drafts(PDO $db, int $userId): array {
    $statement = $db->prepare('SELECT article_id, article_json, base_revision, draft_version, saved_at FROM sc_wr_drafts WHERE user_id = ?');
    $statement->execute([$userId]);
    $drafts = [];
    foreach ($statement->fetchAll() as $row) {
        $drafts[$row['article_id']] = [
            'article' => json_decode($row['article_json'], true, 512, JSON_THROW_ON_ERROR),
            'baseRevision' => $row['base_revision'],
            'version' => $row['draft_version'],
            'savedAt' => gmdate('c', strtotime($row['saved_at'] . ' UTC')),
        ];
    }
    return $drafts;
}

function wr_website_url(): string {
    $configured = getenv('SC_WEBSITE_URL');
    if ($configured !== false && preg_match('~^https?://[^/]+(?:/.*)?$~', $configured)) return rtrim($configured, '/');
    $scheme = wr_secure_request() ? 'https' : 'http';
    $host = preg_replace('/[^A-Za-z0-9.:-]/', '', (string) ($_SERVER['HTTP_HOST'] ?? 'localhost'));
    $script = str_replace('\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? '/writing-room/api.php'));
    $base = rtrim(dirname(dirname($script)), '/.');
    return $scheme . '://' . $host . ($base === '' ? '' : $base);
}

function wr_state(PDO $db, array $user): array {
    [, $articles] = wr_read_articles();
    [$collectionRaw, $collections] = wr_read_collections();
    $revisions = [];
    foreach ($articles as $article) $revisions[$article['id']] = wr_revision($article);
    return [
        'articles' => $articles,
        'revisions' => $revisions,
        'drafts' => wr_drafts($db, (int) $user['id']),
        'collections' => $collections,
        'collectionRevision' => hash('sha256', $collectionRaw),
        'previewUrl' => wr_website_url(),
        'token' => (string) $_SESSION['wr_csrf'],
        'online' => true,
        'mode' => 'online',
        'user' => ['username' => $user['username']],
    ];
}

function wr_validate_collection(mixed $value): array {
    if (!is_array($value)) throw new InvalidArgumentException('Choose a collection first.');
    $id = $value['id'] ?? '';
    $name = $value['name'] ?? '';
    $short = $value['short'] ?? $name;
    if (!is_string($id) || !preg_match('/^[a-z0-9][a-z0-9-]{0,79}$/', $id)) {
        throw new InvalidArgumentException('Use a short collection address with lowercase letters, numbers, and hyphens.');
    }
    if (!is_string($name) || trim($name) === '' || mb_strlen($name) > 120) {
        throw new InvalidArgumentException('Give this collection a name of 120 characters or fewer.');
    }
    if (!is_string($short) || trim($short) === '' || mb_strlen($short) > 60) {
        throw new InvalidArgumentException('Give this collection a short name of 60 characters or fewer.');
    }
    return ['id' => $id, 'name' => trim($name), 'short' => trim($short)];
}

function wr_mutate_collection(PDO $db, array $user, string $action, array $payload): array {
    $proposed = wr_validate_collection($payload['collection'] ?? null);
    $path = wr_collections_path();
    $lockPath = rtrim(sys_get_temp_dir(), '/\\') . '/science-coherence-writing-room-' . hash('sha256', $path) . '.lock';
    $lock = @fopen($lockPath, 'c');
    if ($lock === false || !flock($lock, LOCK_EX)) throw new RuntimeException('The website collection file could not be locked.');
    $raw = '';
    $changedFile = false;
    try {
        $raw = @file_get_contents($path);
        if ($raw === false) throw new RuntimeException('The website collection file could not be read.');
        if (($payload['baseRevision'] ?? null) !== hash('sha256', $raw)) {
            throw new DomainException('The collections changed in another window. Reload before saving.');
        }
        $collections = wr_decode_collections($raw);
        $found = null;
        foreach ($collections as $index => $collection) if ($collection['id'] === $proposed['id']) { $found = $index; break; }
        if ($action === 'collection-create') {
            if ($found !== null) throw new DomainException('A collection already uses that address.');
            $numbers = array_map(static fn(array $item): int => ctype_digit((string) ($item['num'] ?? '')) ? (int) $item['num'] : 0, $collections);
            $collections[] = [
                'id' => $proposed['id'], 'name' => $proposed['name'], 'short' => $proposed['short'],
                'num' => str_pad((string) (max($numbers ?: [0]) + 1), 2, '0', STR_PAD_LEFT),
                'symbol' => 'orbit', 'description' => '', 'intro' => '', 'label' => 'Writing', 'green' => true,
            ];
            $changed = $collections[array_key_last($collections)];
        } elseif ($action === 'collection-rename') {
            if ($found === null || (($collections[$found]['acceptsArticles'] ?? true) === false)) {
                throw new InvalidArgumentException('That article collection could not be found.');
            }
            $collections[$found]['name'] = $proposed['name'];
            $collections[$found]['short'] = $proposed['short'];
            $changed = $collections[$found];
        } else {
            throw new InvalidArgumentException('Unknown collection action.');
        }
        $newContent = 'window.SC_COLLECTIONS = ' . wr_json($collections, true) . ";\n";
        $db->beginTransaction();
        $statement = $db->prepare(
            'INSERT INTO sc_wr_collections (collection_id, collection_json, revision, updated_by, updated_at)
             VALUES (?, ?, ?, ?, UTC_TIMESTAMP())
             ON DUPLICATE KEY UPDATE collection_json = VALUES(collection_json), revision = VALUES(revision), updated_by = VALUES(updated_by), updated_at = UTC_TIMESTAMP()'
        );
        $statement->execute([$changed['id'], wr_json($changed), hash('sha256', wr_json($changed, true)), (int) $user['id']]);
        wr_write_content($path, $newContent);
        $changedFile = true;
        $db->commit();
        return wr_state($db, $user);
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        if ($changedFile && $raw !== '') {
            try { wr_write_content($path, $raw); } catch (Throwable $restoreError) { error_log('writing_room_collection_restore_failed'); }
        }
        throw $error;
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

function wr_write_content(string $path, string $content): void {
    $temporary = dirname($path) . '/.' . basename($path) . '.' . bin2hex(random_bytes(8)) . '.tmp';
    try {
        if (@file_put_contents($temporary, $content, LOCK_EX) === false) throw new RuntimeException('The website article file is not writable.');
        if (!@rename($temporary, $path)) throw new RuntimeException('The website article file could not be replaced.');
    } finally {
        if (is_file($temporary)) @unlink($temporary);
    }
}

function wr_mutate(PDO $db, array $user, string $action, array $payload): array {
    $article = wr_validate_article($payload['article'] ?? null);
    $id = $article['id'];
    $userId = (int) $user['id'];
    $priorStatement = $db->prepare('SELECT article_json, base_revision, draft_version FROM sc_wr_drafts WHERE article_id = ? AND user_id = ?');
    $priorStatement->execute([$id, $userId]);
    $prior = $priorStatement->fetch() ?: null;
    $receivedVersion = $payload['draftVersion'] ?? null;
    if ($receivedVersion !== ($prior['draft_version'] ?? null)) throw new DomainException('This draft was changed in another window. Reload before saving.');

    if ($action === 'discard') {
        $delete = $db->prepare('DELETE FROM sc_wr_drafts WHERE article_id = ? AND user_id = ?');
        $delete->execute([$id, $userId]);
        return wr_state($db, $user);
    }

    $base = $prior['base_revision'] ?? ($payload['baseRevision'] ?? null);
    if ($action === 'draft') {
        $version = bin2hex(random_bytes(16));
        $statement = $db->prepare(
            'INSERT INTO sc_wr_drafts (article_id, user_id, article_json, base_revision, draft_version, saved_at)
             VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())
             ON DUPLICATE KEY UPDATE article_json = VALUES(article_json), base_revision = VALUES(base_revision), draft_version = VALUES(draft_version), saved_at = UTC_TIMESTAMP()'
        );
        $statement->execute([$id, $userId, wr_json($article), $base, $version]);
        return wr_state($db, $user);
    }
    if ($action !== 'apply') throw new InvalidArgumentException('Unknown action.');

    $path = wr_content_path();
    $lockPath = rtrim(sys_get_temp_dir(), '/\\') . '/science-coherence-writing-room-' . hash('sha256', $path) . '.lock';
    $lock = @fopen($lockPath, 'c');
    if ($lock === false || !flock($lock, LOCK_EX)) throw new RuntimeException('The website article file could not be locked for publishing.');
    $raw = '';
    $changedFile = false;
    try {
        $raw = @file_get_contents($path);
        if ($raw === false) throw new RuntimeException('The website article file could not be read.');
        $articles = wr_decode_articles($raw);
        $current = wr_find_article($articles, $id);
        if ($base !== wr_revision($current)) throw new DomainException('The website article changed after this draft began. Your draft is safe. Reload and compare before publishing.');
        $merged = array_replace($current ?? [], $article);
        if ($current === null || $merged !== $current) $merged = wr_refresh_metadata($merged);

        if ($current === $merged) {
            $delete = $db->prepare('DELETE FROM sc_wr_drafts WHERE article_id = ? AND user_id = ?');
            $delete->execute([$id, $userId]);
            return wr_state($db, $user);
        }
        if ($current === null) {
            $articles[] = $merged;
        } else {
            foreach ($articles as $index => $existing) if ($existing['id'] === $id) { $articles[$index] = $merged; break; }
        }
        $newContent = 'window.SC_CONTENT = ' . wr_json($articles, true) . ";\n";

        $db->beginTransaction();
        if ($current !== null) {
            $revision = $db->prepare('INSERT INTO sc_wr_revisions (article_id, article_json, revision, saved_by) VALUES (?, ?, ?, ?)');
            $revision->execute([$id, wr_json($current), wr_revision($current), $userId]);
        }
        $published = $db->prepare(
            'INSERT INTO sc_wr_articles (article_id, article_json, revision, published_by, published_at)
             VALUES (?, ?, ?, ?, UTC_TIMESTAMP())
             ON DUPLICATE KEY UPDATE article_json = VALUES(article_json), revision = VALUES(revision), published_by = VALUES(published_by), published_at = UTC_TIMESTAMP()'
        );
        $published->execute([$id, wr_json($merged), wr_revision($merged), $userId]);
        wr_write_content($path, $newContent);
        $changedFile = true;
        $delete = $db->prepare('DELETE FROM sc_wr_drafts WHERE article_id = ? AND user_id = ?');
        $delete->execute([$id, $userId]);
        $db->commit();
        return wr_state($db, $user);
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        if ($changedFile && $raw !== '') {
            try { wr_write_content($path, $raw); } catch (Throwable $restoreError) { error_log('writing_room_restore_failed'); }
        }
        throw $error;
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}
