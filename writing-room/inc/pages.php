<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/articles.php';

const WR_SECTION_FIELDS = [
    ['name', 'Title', 'line'],
    ['short', 'Short name, for menus and filters', 'line'],
    ['intro', 'Introduction under the title', 'text'],
    ['description', 'Description in the sidebar', 'text'],
    ['label', 'Small line in the sidebar', 'line'],
];

const WR_COLLECTION_FIELDS = [
    ['name', 'Name', 'line'],
    ['description', 'Description', 'text'],
    ['tagline', 'Small line', 'line'],
];

const WR_DOCUMENT_FIELDS = [
    ['title', 'Title', 'line'],
    ['subtitle', 'Subtitle', 'text'],
    ['description', 'Description, for the library and search', 'text'],
    ['note', 'Note to the reader', 'text'],
];

const WR_DOCUMENT_SECTION_FIELDS = [
    ['label', 'Tab name', 'line'],
    ['title', 'Title', 'line'],
    ['summary', 'Summary under the title', 'text'],
    ['body', 'Text', 'rich'],
];

const WR_PAGE_KINDS = [
    'plain' => 2000,
    'line' => 2000,
    'text' => 20000,
    'rich' => 2000000,
];

function wr_mask_comments(string $text): string {
    return preg_replace_callback('/<!--.*?-->/s', function ($m) {
        return preg_replace('/[^\n]/', ' ', $m[0]);
    }, $text) ?? $text;
}

function wr_parse_document(string $text): array {
    $masked = wr_mask_comments($text);
    if (!preg_match('/<script type="application\/json" id="meta">(.*?)<\/script>/s', $masked, $metaMatch, PREG_OFFSET_CAPTURE)) {
        throw new DomainException('The Protocol’s source has no metadata block. Nothing has been overwritten.');
    }
    $metaJson = substr($text, $metaMatch[1][1], strlen($metaMatch[1][0]));
    $meta = json_decode($metaJson, true, 512, JSON_THROW_ON_ERROR);
    $metaSpan = [$metaMatch[1][1], $metaMatch[1][1] + strlen($metaMatch[1][0])];

    $sections = [];
    if (preg_match_all('/<section\s+([^>]*)>(.*?)<\/section>/s', $masked, $matches, PREG_OFFSET_CAPTURE)) {
        for ($i = 0; $i < count($matches[0]); $i++) {
            $attrStr = substr($text, $matches[1][$i][1], strlen($matches[1][$i][0]));
            $bodyStr = substr($text, $matches[2][$i][1], strlen($matches[2][$i][0]));
            preg_match_all('/([\w-]+)="([^"]*)"/', $attrStr, $attrMatches);
            $attrs = [];
            for ($j = 0; $j < count($attrMatches[0]); $j++) {
                $attrs[$attrMatches[1][$j]] = html_entity_decode($attrMatches[2][$j], ENT_QUOTES | ENT_HTML5, 'UTF-8');
            }
            if (!isset($attrs['data-id'])) continue;
            $sections[] = [
                'attrs' => $attrs,
                'attr_span' => [$matches[1][$i][1], $matches[1][$i][1] + strlen($matches[1][$i][0])],
                'body_span' => [$matches[2][$i][1], $matches[2][$i][1] + strlen($matches[2][$i][0])],
                'body' => trim($bodyStr),
            ];
        }
    }
    return [$meta, $metaSpan, $sections];
}

function wr_build_one_document(string $path): array {
    $raw = file_get_contents($path);
    if ($raw === false) throw new RuntimeException("Cannot read document: {$path}");
    $noComments = preg_replace('/<!--.*?-->/s', '', $raw) ?? $raw;
    if (!preg_match('/<script type="application\/json" id="meta">(.*?)<\/script>/s', $noComments, $metaMatch)) {
        throw new RuntimeException("Document {$path} missing meta block");
    }
    $doc = json_decode($metaMatch[1], true, 512, JSON_THROW_ON_ERROR);
    $doc['kind'] = 'document';
    $sections = [];
    $words = 0;
    $searchParts = [$doc['title'] ?? '', $doc['subtitle'] ?? '', $doc['description'] ?? ''];

    if (preg_match_all('/<section\s+([^>]*)>(.*?)<\/section>/s', $noComments, $matches)) {
        for ($i = 0; $i < count($matches[0]); $i++) {
            preg_match_all('/([\w-]+)="([^"]*)"/', $matches[1][$i], $attrMatches);
            $a = [];
            for ($j = 0; $j < count($attrMatches[0]); $j++) {
                $a[$attrMatches[1][$j]] = html_entity_decode($attrMatches[2][$j], ENT_QUOTES | ENT_HTML5, 'UTF-8');
            }
            $body = trim($matches[2][$i]);
            $plain = preg_replace('/\$\$.*?\$\$|\$[^$]*\$/s', ' ', $body) ?? $body;
            $plain = preg_replace('/<[^>]+>/', ' ', $plain) ?? $plain;
            $plain = html_entity_decode($plain, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            $plain = trim(preg_replace('/\s+/u', ' ', $plain) ?? $plain);
            $wordCount = $plain === '' ? 0 : count(preg_split('/\s+/u', $plain) ?: []);
            $words += $wordCount;
            $searchParts[] = $a['data-label'] ?? '';
            $searchParts[] = $a['data-title'] ?? '';
            $searchParts[] = $plain;
            $sections[] = [
                'id' => $a['data-id'],
                'num' => $a['data-num'] ?? '',
                'label' => $a['data-label'] ?? '',
                'title' => $a['data-title'] ?? '',
                'summary' => $a['data-summary'] ?? '',
                'html' => $body,
            ];
        }
    }
    $doc['sections'] = $sections;
    $lexPath = dirname($path) . '/' . pathinfo($path, PATHINFO_FILENAME) . '.lexicon.json';
    if (is_file($lexPath)) {
        $lexicon = json_decode((string) file_get_contents($lexPath), true, 512, JSON_THROW_ON_ERROR);
        $doc['lexicon'] = $lexicon;
        foreach ($lexicon as $item) {
            $desc = trim((string) ($item['desc'] ?? ''));
            if ($desc !== '') {
                $descWords = preg_split('/\s+/u', $desc) ?: [];
                $words += count($descWords);
            }
            $searchParts[] = ($item['term'] ?? '') . ' ' . ($item['desc'] ?? '');
        }
    }
    $doc['words'] = $words;
    $doc['minutes'] = max(1, (int) round($words / 200));
    $doc['search'] = mb_strtolower(implode(' ', array_filter($searchParts)), 'UTF-8');
    return $doc;
}

function wr_rebuild_documents(string $documentsDir, string $documentsJsPath): void {
    $docs = [];
    $files = glob($documentsDir . '/*.html') ?: [];
    sort($files);
    foreach ($files as $file) {
        $docs[] = wr_build_one_document($file);
    }
    $payload = json_encode($docs, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    wr_write_content($documentsJsPath, "window.SC_DOCUMENTS = " . $payload . ";\n");
}

function wr_fields_for_page(array $page, array $snap): array {
    $fields = [];
    $sectionId = $page['section'] ?? null;
    if ($sectionId) {
        $section = null;
        foreach ($snap['sections'] as $s) {
            if (($s['id'] ?? null) === $sectionId) { $section = $s; break; }
        }
        if ($section) {
            foreach (WR_SECTION_FIELDS as [$key, $label, $kind]) {
                $fields[] = [
                    'key' => "section:{$sectionId}:{$key}",
                    'group' => 'Opening',
                    'label' => $label,
                    'kind' => $kind,
                    'value' => (string) ($section[$key] ?? ''),
                ];
            }
            $own = [];
            foreach ($snap['collections'] as $c) {
                if (($c['section'] ?? null) === $sectionId) $own[] = $c;
            }
            usort($own, function ($a, $b) {
                $na = ctype_digit((string) ($a['num'] ?? '')) ? (int) $a['num'] : 999;
                $nb = ctype_digit((string) ($b['num'] ?? '')) ? (int) $b['num'] : 999;
                return $na <=> $nb;
            });
            foreach ($own as $c) {
                foreach (WR_COLLECTION_FIELDS as [$key, $label, $kind]) {
                    $fields[] = [
                        'key' => "collection:{$c['id']}:{$key}",
                        'group' => 'Collection ' . ($c['num'] ?? '') . ' · ' . ($c['name'] ?? ''),
                        'label' => $label,
                        'kind' => $kind,
                        'value' => (string) ($c[$key] ?? ''),
                    ];
                }
            }
        }
    }
    $docId = $page['document'] ?? null;
    if ($docId && isset($snap['documents'][$docId])) {
        [$meta, , $sections] = $snap['documents'][$docId];
        foreach (WR_DOCUMENT_FIELDS as [$key, $label, $kind]) {
            $fields[] = [
                'key' => "document:{$docId}:meta:{$key}",
                'group' => 'The document',
                'label' => $label,
                'kind' => $kind,
                'value' => (string) ($meta[$key] ?? ''),
            ];
        }
        foreach ($meta['facts'] ?? [] as $i => $fact) {
            $fields[] = [
                'key' => "document:{$docId}:fact:{$i}:value",
                'group' => 'Key figures',
                'label' => 'Figure ' . ($i + 1),
                'kind' => 'line',
                'value' => (string) ($fact['value'] ?? ''),
            ];
            $fields[] = [
                'key' => "document:{$docId}:fact:{$i}:label",
                'group' => 'Key figures',
                'label' => 'Figure ' . ($i + 1) . ' — label',
                'kind' => 'line',
                'value' => (string) ($fact['label'] ?? ''),
            ];
        }
        foreach ($sections as $section) {
            $a = $section['attrs'];
            $label = $a['data-label'] ?? ($a['data-id'] ?? '');
            $num = $a['data-num'] ?? '';
            $group = "Section {$num} · {$label}";
            foreach (WR_DOCUMENT_SECTION_FIELDS as [$key, $fieldLabel, $kind]) {
                $val = $key === 'body' ? $section['body'] : ($a['data-' . $key] ?? '');
                $fields[] = [
                    'key' => "document:{$docId}:section:{$a['data-id']}:{$key}",
                    'group' => $group,
                    'label' => $fieldLabel,
                    'kind' => $kind,
                    'value' => (string) $val,
                ];
            }
        }
    }
    foreach ($page['fields'] ?? [] as $f) {
        $fields[] = $f;
    }
    return $fields;
}

function wr_decode_pages(string $raw): array {
    $pages = wr_decode_list($raw, 'SC_PAGES', 'page');
    $ids = [];
    foreach ($pages as $page) {
        $id = $page['id'] ?? null;
        if (!is_string($id) || isset($ids[$id])) {
            throw new RuntimeException('The website has missing or duplicate page addresses.');
        }
        $ids[$id] = true;
        $keys = [];
        foreach ($page['fields'] ?? [] as $field) {
            $k = $field['key'] ?? null;
            if (!is_string($k) || str_contains($k, ':') || isset($keys[$k])) {
                throw new RuntimeException("The page “{$id}” has missing or duplicate fields.");
            }
            $keys[$k] = true;
            $kind = $field['kind'] ?? null;
            if (!isset(WR_PAGE_KINDS[$kind]) || !is_string($field['value'] ?? null)) {
                throw new RuntimeException("The page “{$id}” has a field that cannot be edited.");
            }
        }
    }
    return $pages;
}

function wr_load_site_pages(): array {
    $pagesPath = wr_find_site_file('pages.js');
    if (!is_file($pagesPath)) {
        return [[], []];
    }
    $sectionsPath = wr_sections_path();
    $collectionsPath = wr_collections_path();
    $documentsDir = dirname($pagesPath) . '/documents';

    $snap = ['raw' => [], 'revisions' => []];
    $rawPages = file_get_contents($pagesPath);
    $rawSections = file_get_contents($sectionsPath);
    $rawCollections = file_get_contents($collectionsPath);
    if ($rawPages === false || $rawSections === false || $rawCollections === false) {
        return [[], []];
    }
    $snap['raw']['pages'] = $rawPages;
    $snap['raw']['sections'] = $rawSections;
    $snap['raw']['collections'] = $rawCollections;

    $snap['pages'] = wr_decode_pages($rawPages);
    [, $snap['sections']] = wr_read_sections();
    [, $snap['collections']] = wr_read_collections();

    $snap['documents'] = [];
    foreach ($snap['pages'] as $page) {
        $docId = $page['document'] ?? null;
        if ($docId && !isset($snap['documents'][$docId])) {
            $docFile = $documentsDir . '/' . $docId . '.html';
            if (is_file($docFile)) {
                $rawDoc = file_get_contents($docFile);
                if ($rawDoc !== false) {
                    $snap['raw']['document:' . $docId] = $rawDoc;
                    $snap['documents'][$docId] = wr_parse_document($rawDoc);
                }
            }
        }
    }
    foreach ($snap['raw'] as $name => $raw) {
        $snap['revisions'][$name] = hash('sha256', $raw);
    }

    $pages = [];
    foreach ($snap['pages'] as $p) {
        $pages[] = [
            'id' => $p['id'],
            'name' => $p['name'],
            'route' => $p['route'] ?? '#/',
            'fields' => wr_fields_for_page($p, $snap),
        ];
    }
    return [$pages, $snap['revisions']];
}

function wr_page_state(): array {
    try {
        [$pages, $revisions] = wr_load_site_pages();
        return [
            'pages' => $pages,
            'pageRevisions' => $revisions,
        ];
    } catch (Throwable $error) {
        return [
            'pages' => [],
            'pageRevisions' => [],
            'pagesError' => ($error instanceof DomainException || $error instanceof InvalidArgumentException)
                ? $error->getMessage()
                : 'The page files could not be read.',
        ];
    }
}

function wr_edit_document(string $text, string $docId, array $changed): string {
    [$meta, $metaSpan, $sections] = wr_parse_document($text);
    $edits = [];
    $metaChanged = false;
    foreach ($changed as $key => $value) {
        $parts = explode(':', $key);
        if (($parts[0] ?? '') !== 'document' || ($parts[1] ?? '') !== $docId) continue;
        if (($parts[2] ?? '') === 'meta') {
            $meta[$parts[3]] = $value;
            $metaChanged = true;
        } elseif (($parts[2] ?? '') === 'fact') {
            $idx = (int) $parts[3];
            $field = $parts[4] ?? 'value';
            if (!isset($meta['facts'][$idx])) $meta['facts'][$idx] = [];
            $meta['facts'][$idx][$field] = $value;
            $metaChanged = true;
        }
    }
    if ($metaChanged) {
        $edits[] = [
            'span' => $metaSpan,
            'repl' => "\n" . json_encode($meta, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "\n"
        ];
    }
    foreach ($sections as $section) {
        $sid = $section['attrs']['data-id'];
        $prefix = "document:{$docId}:section:{$sid}:";
        $mine = [];
        foreach ($changed as $k => $v) {
            if (str_starts_with($k, $prefix)) {
                $mine[substr($k, strlen($prefix))] = $v;
            }
        }
        if (!$mine) continue;
        $attrs = $section['attrs'];
        $attrChanged = false;
        foreach (['label', 'title', 'summary'] as $k) {
            if (isset($mine[$k])) {
                $attrs['data-' . $k] = $mine[$k];
                $attrChanged = true;
            }
        }
        if ($attrChanged) {
            $attrParts = [];
            foreach ($attrs as $ak => $av) {
                $attrParts[] = $ak . '="' . htmlspecialchars($av, ENT_QUOTES | ENT_HTML5, 'UTF-8') . '"';
            }
            $edits[] = ['span' => $section['attr_span'], 'repl' => implode(' ', $attrParts)];
        }
        if (isset($mine['body'])) {
            $edits[] = ['span' => $section['body_span'], 'repl' => "\n  " . trim($mine['body']) . "\n"];
        }
    }
    // Sort in reverse order of starting position so replacements don't invalidate offsets
    usort($edits, function ($a, $b) {
        return $b['span'][0] <=> $a['span'][0];
    });
    foreach ($edits as $edit) {
        [$start, $end] = $edit['span'];
        $text = substr($text, 0, $start) . $edit['repl'] . substr($text, $end);
    }
    return $text;
}

function wr_save_page(PDO $db, array $user, array $payload): array {
    $pageId = $payload['page'] ?? null;
    $values = $payload['values'] ?? null;
    $revisions = $payload['revisions'] ?? null;
    if (!is_string($pageId) || !is_array($values) || !is_array($revisions)) {
        throw new InvalidArgumentException('Choose a page first.');
    }

    $pagesPath = wr_find_site_file('pages.js');
    $sectionsPath = wr_sections_path();
    $collectionsPath = wr_collections_path();
    $documentsDir = dirname($pagesPath) . '/documents';
    $documentsJsPath = dirname($pagesPath) . '/documents.js';

    $lockPath = dirname($pagesPath) . '/.pages.lock';
    $lock = @fopen($lockPath, 'c');
    if ($lock !== false) {
        flock($lock, LOCK_EX);
    }

    try {
        $snap = ['raw' => [], 'revisions' => []];
        $rawPages = file_get_contents($pagesPath);
        $rawSections = file_get_contents($sectionsPath);
        $rawCollections = file_get_contents($collectionsPath);
        if ($rawPages === false || $rawSections === false || $rawCollections === false) {
            throw new RuntimeException('Website page files could not be read.');
        }
        $snap['raw']['pages'] = $rawPages;
        $snap['raw']['sections'] = $rawSections;
        $snap['raw']['collections'] = $rawCollections;

        $snap['pages'] = wr_decode_pages($rawPages);
        [, $snap['sections']] = wr_read_sections();
        [, $snap['collections']] = wr_read_collections();

        $page = null;
        foreach ($snap['pages'] as $p) {
            if (($p['id'] ?? null) === $pageId) { $page = $p; break; }
        }
        if ($page === null) throw new InvalidArgumentException('That page could not be found.');

        $snap['documents'] = [];
        foreach ($snap['pages'] as $p) {
            $docId = $p['document'] ?? null;
            if ($docId && !isset($snap['documents'][$docId])) {
                $docFile = $documentsDir . '/' . $docId . '.html';
                if (is_file($docFile)) {
                    $rawDoc = file_get_contents($docFile);
                    if ($rawDoc !== false) {
                        $snap['raw']['document:' . $docId] = $rawDoc;
                        $snap['documents'][$docId] = wr_parse_document($rawDoc);
                    }
                }
            }
        }
        foreach ($snap['raw'] as $name => $raw) {
            $snap['revisions'][$name] = hash('sha256', $raw);
        }

        $allFields = [];
        foreach (wr_fields_for_page($page, $snap) as $f) {
            $allFields[$f['key']] = $f;
        }

        $changed = [];
        foreach ($values as $key => $value) {
            if (!isset($allFields[$key])) {
                throw new DomainException('A field sent for this page is not part of it. Reload the room.');
            }
            $f = $allFields[$key];
            $kind = $f['kind'] ?? 'line';
            $limit = WR_PAGE_KINDS[$kind] ?? 2000;
            if (!is_string($value) || strlen($value) > $limit) {
                throw new InvalidArgumentException("“{$f['label']}” is too long or not text.");
            }
            if (in_array($kind, ['line', 'text', 'plain'], true) && preg_match('/<(?:script|style|iframe|object|embed)\b/i', $value)) {
                throw new InvalidArgumentException("“{$f['label']}” contains page code that cannot be saved here.");
            }
            if ($value !== $f['value']) {
                $changed[$key] = $value;
            }
        }

        if (!$changed) {
            return wr_state($db, $user);
        }

        $targets = [];
        foreach (array_keys($changed) as $key) {
            if (str_starts_with($key, 'section:')) $targets['sections'] = true;
            elseif (str_starts_with($key, 'collection:')) $targets['collections'] = true;
            elseif (str_starts_with($key, 'document:')) {
                $parts = explode(':', $key);
                $targets['document:' . $parts[1]] = true;
            } else {
                $targets['pages'] = true;
            }
        }

        foreach (array_keys($targets) as $target) {
            if (($revisions[$target] ?? null) !== ($snap['revisions'][$target] ?? null)) {
                throw new DomainException('This page’s files changed in another window or editor. Your changes are still on this page; reload to compare.');
            }
        }

        $outputs = [];
        if (isset($targets['pages'])) {
            foreach ($page['fields'] ?? [] as &$fld) {
                if (isset($changed[$fld['key']])) {
                    $fld['value'] = $changed[$fld['key']];
                }
            }
            unset($fld);
            foreach ($snap['pages'] as &$p) {
                if ($p['id'] === $pageId) $p = $page;
            }
            unset($p);
            $outputs['pages'] = [$pagesPath, 'window.SC_PAGES = ' . wr_json($snap['pages'], true) . ";\n"];
        }

        if (isset($targets['sections'])) {
            foreach ($changed as $k => $v) {
                if (str_starts_with($k, 'section:')) {
                    [, $sid, $attr] = explode(':', $k);
                    foreach ($snap['sections'] as &$sec) {
                        if ($sec['id'] === $sid) $sec[$attr] = $v;
                    }
                    unset($sec);
                }
            }
            $outputs['sections'] = [$sectionsPath, 'window.SC_SECTIONS = ' . wr_json($snap['sections'], true) . ";\n"];
        }

        if (isset($targets['collections'])) {
            foreach ($changed as $k => $v) {
                if (str_starts_with($k, 'collection:')) {
                    [, $cid, $attr] = explode(':', $k);
                    foreach ($snap['collections'] as &$col) {
                        if ($col['id'] === $cid) $col[$attr] = $v;
                    }
                    unset($col);
                }
            }
            $outputs['collections'] = [$collectionsPath, 'window.SC_COLLECTIONS = ' . wr_json($snap['collections'], true) . ";\n"];
        }

        foreach (array_keys($targets) as $target) {
            if (str_starts_with($target, 'document:')) {
                $docId = substr($target, 9);
                $rawDoc = $snap['raw'][$target];
                $newDocHtml = wr_edit_document($rawDoc, $docId, $changed);
                $outputs[$target] = [$documentsDir . '/' . $docId . '.html', $newDocHtml];
            }
        }

        // Verify that files on disk still match our read snapshot before modifying
        foreach ($outputs as $name => [$path, $data]) {
            $currentBytes = @file_get_contents($path);
            if ($currentBytes !== $snap['raw'][$name]) {
                throw new DomainException('A file changed while saving. Nothing further was written; reload and try again.');
            }
        }

        // Keep exact backups in data/backups/
        $backupDir = dirname(__DIR__) . '/data/backups';
        if (!is_dir($backupDir)) {
            @mkdir($backupDir, 0755, true);
        }
        $stamp = gmdate('Ymd\THis\Z');
        $backups = [];
        if (is_dir($backupDir) && is_writable($backupDir)) {
            foreach ($outputs as $name => [$path, $data]) {
                $bName = $stamp . '-' . bin2hex(random_bytes(4)) . '.' . basename($path);
                if (@file_put_contents($backupDir . '/' . $bName, $snap['raw'][$name]) !== false) {
                    $backups[] = $bName;
                }
            }
        }

        // Write changes atomically
        foreach ($outputs as $name => [$path, $data]) {
            wr_write_content($path, $data);
        }

        // Rebuild documents.js if a document changed
        $hasDocChange = false;
        foreach (array_keys($outputs) as $name) {
            if (str_starts_with($name, 'document:')) { $hasDocChange = true; break; }
        }
        if ($hasDocChange) {
            $beforeDocJs = @file_get_contents($documentsJsPath);
            if ($beforeDocJs !== false && is_dir($backupDir) && is_writable($backupDir)) {
                $bName = $stamp . '-' . bin2hex(random_bytes(4)) . '.documents.js';
                if (@file_put_contents($backupDir . '/' . $bName, $beforeDocJs) !== false) {
                    $backups[] = $bName;
                }
            }
            try {
                wr_rebuild_documents($documentsDir, $documentsJsPath);
            } catch (Throwable $rebuildError) {
                // Restore document sources
                foreach ($outputs as $name => [$path, $data]) {
                    if (str_starts_with($name, 'document:')) {
                        try { wr_write_content($path, $snap['raw'][$name]); } catch (Throwable $e) {}
                    }
                }
                throw new DomainException('The Protocol could not be rebuilt from its source, so its change was undone. The other files were saved.');
            }
        }

        // Update index.html cache busters
        $indexPath = dirname($pagesPath) . '/index.html';
        if (is_file($indexPath)) {
            $html = @file_get_contents($indexPath);
            if ($html !== false) {
                $v = gmdate('YmdHis');
                $html = preg_replace('/(src="pages\.js\?v=)[^"]*(")/', '${1}' . $v . '${2}', $html);
                $html = preg_replace('/(src="sections\.js\?v=)[^"]*(")/', '${1}' . $v . '${2}', $html);
                $html = preg_replace('/(src="collections\.js\?v=)[^"]*(")/', '${1}' . $v . '${2}', $html);
                if ($hasDocChange) {
                    $html = preg_replace('/(src="documents\.js\?v=)[^"]*(")/', '${1}' . $v . '${2}', $html);
                }
                @file_put_contents($indexPath, $html);
            }
        }

        $result = wr_state($db, $user);
        $result['pageBackups'] = $backups;
        return $result;
    } finally {
        if ($lock !== false) {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }
}
