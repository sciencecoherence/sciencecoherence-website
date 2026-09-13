"""Local-only Writing Room. Python 3.11+, no third-party dependencies."""
import argparse
import hashlib
import json
import mimetypes
import os
from pathlib import Path
import re
import secrets
import threading
import uuid
from datetime import datetime, timezone
from html.parser import HTMLParser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent
LOCK = threading.RLock()


def digest(value):
    return hashlib.sha256(value).hexdigest()


def encoded(value):
    return json.dumps(value, ensure_ascii=False, indent=2).encode('utf-8')


def revision(article):
    return digest(encoded(article)) if article is not None else None


def atomic_write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name('.' + path.name + '.' + uuid.uuid4().hex + '.tmp')
    try:
        with temporary.open('xb') as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def read_articles(path):
    raw = path.read_bytes()
    match = re.fullmatch(r'\s*window\.SC_CONTENT\s*=\s*(\[.*\])\s*;?\s*', raw.decode('utf-8-sig'), re.S)
    if not match:
        raise ValueError('The website content format has changed. Nothing has been overwritten.')
    articles = json.loads(match[1])
    ids = [item.get('id') for item in articles]
    if any(not isinstance(item, str) for item in ids) or len(set(ids)) != len(ids):
        raise ValueError('The website has missing or duplicate article IDs.')
    return raw, articles


def read_collections(path):
    raw = path.read_bytes()
    match = re.fullmatch(r'\s*window\.SC_COLLECTIONS\s*=\s*(\[.*\])\s*;?\s*', raw.decode('utf-8-sig'), re.S)
    if not match:
        raise ValueError('The website collection format has changed. Nothing has been overwritten.')
    collections = json.loads(match[1])
    ids = [item.get('id') for item in collections if isinstance(item, dict)]
    if len(ids) != len(collections) or any(not isinstance(item, str) for item in ids) or len(set(ids)) != len(ids):
        raise ValueError('The website has missing or duplicate collection addresses.')
    if any(not isinstance(item.get('name'), str) or not item['name'].strip() for item in collections):
        raise ValueError('Every website collection needs a name.')
    return raw, collections


class PlainText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in ('style', 'script'):
            self.skip += 1

    def handle_endtag(self, tag):
        if tag in ('style', 'script'):
            self.skip = max(0, self.skip - 1)

    def handle_data(self, data):
        if not self.skip:
            self.parts.append(data)


def metadata(article):
    parser = PlainText()
    parser.feed(article['body'])
    plain = ' '.join(' '.join(parser.parts).split())
    article['words'] = len(plain.split())
    article['minutes'] = max(1, (article['words'] + 199) // 200)
    article['search'] = ' '.join(str(article.get(k, '')) for k in ('title', 'subtitle', 'description', 'type')) + ' ' + plain
    return article


class Room:
    def __init__(self, website, data, port, preview_port):
        self.website = website.resolve()
        self.content = self.website / 'content.js'
        self.collection_file = self.website / 'collections.js'
        read_articles(self.content)
        read_collections(self.collection_file)
        self.data = data.resolve()
        self.data.mkdir(parents=True, exist_ok=True)
        self.port, self.preview_port = port, preview_port
        self.origin = f'http://127.0.0.1:{port}'
        self.preview = f'http://127.0.0.1:{preview_port}'
        self.token = secrets.token_urlsafe(32)

    def drafts(self):
        path = self.data / 'drafts.json'
        return json.loads(path.read_text('utf-8')) if path.exists() else {}

    def state(self):
        _, articles = read_articles(self.content)
        collection_raw, collections = read_collections(self.collection_file)
        return {'articles': articles, 'revisions': {a['id']: revision(a) for a in articles},
                'drafts': self.drafts(), 'collections': collections, 'collectionRevision': digest(collection_raw),
                'previewUrl': self.preview, 'token': self.token, 'online': False, 'mode': 'local'}

    def mutate_collection(self, action, payload):
        with LOCK:
            proposed = payload.get('collection')
            if not isinstance(proposed, dict):
                raise ValueError('Choose a collection first.')
            key = proposed.get('id', '')
            name = proposed.get('name', '')
            short = proposed.get('short', name)
            if not isinstance(key, str) or not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,79}', key):
                raise ValueError('Use a short collection address with lowercase letters, numbers, and hyphens.')
            if not isinstance(name, str) or not name.strip() or len(name) > 120:
                raise ValueError('Give this collection a name of 120 characters or fewer.')
            if not isinstance(short, str) or not short.strip() or len(short) > 60:
                raise ValueError('Give this collection a short name of 60 characters or fewer.')
            raw, collections = read_collections(self.collection_file)
            if payload.get('baseRevision') != digest(raw):
                raise Conflict('The collections changed in another window. Reload before saving.')
            current = next((item for item in collections if item['id'] == key), None)
            if action == 'collection-create':
                if current is not None:
                    raise Conflict('A collection already uses that address.')
                numbers = [int(item.get('num', 0)) for item in collections if str(item.get('num', '')).isdigit()]
                collections.append({'id': key, 'name': name.strip(), 'short': short.strip(),
                                    'num': str(max(numbers, default=0) + 1).zfill(2), 'symbol': 'orbit',
                                    'description': '', 'intro': '', 'label': 'Writing', 'green': True})
            elif action == 'collection-rename':
                if current is None or current.get('acceptsArticles') is False:
                    raise ValueError('That article collection could not be found.')
                current['name'] = name.strip()
                current['short'] = short.strip()
            else:
                raise ValueError('Unknown collection action.')
            updated = b'window.SC_COLLECTIONS = ' + encoded(collections) + b';\n'
            stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S.%fZ')
            backup = self.data / 'backups' / (stamp + '-' + uuid.uuid4().hex[:8] + '.collections.js')
            atomic_write(backup, raw)
            if self.collection_file.read_bytes() != raw:
                raise Conflict('The collections changed while saving. Reload and try again.')
            atomic_write(self.collection_file, updated)
            result = self.state()
            result['collectionBackup'] = backup.name
            return result

    def mutate(self, action, payload):
        with LOCK:
            drafts = self.drafts()
            article = payload.get('article')
            if not isinstance(article, dict):
                raise ValueError('Choose an article first.')
            key = article.get('id', '')
            if not isinstance(key, str) or not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,119}', key):
                raise ValueError('Use a short article address with lowercase letters, numbers, and hyphens.')
            for field in ('title', 'body', 'category', 'type', 'date', 'description'):
                if not isinstance(article.get(field), str):
                    raise ValueError(f'The {field} field must contain text.')
            if not article['title'].strip():
                raise ValueError('Give this article a title first.')
            raw, articles = read_articles(self.content)
            current = next((a for a in articles if a['id'] == key), None)
            prior = drafts.get(key)
            if payload.get('draftVersion') != (prior.get('version') if prior else None):
                raise Conflict('This draft was changed in another window. Reload before saving.')
            if action == 'discard':
                drafts.pop(key, None)
                atomic_write(self.data / 'drafts.json', encoded(drafts))
                return self.state()
            base = prior.get('baseRevision') if prior else payload.get('baseRevision')
            if action == 'draft':
                drafts[key] = {'article': article, 'baseRevision': base, 'version': uuid.uuid4().hex,
                               'savedAt': datetime.now(timezone.utc).isoformat()}
                atomic_write(self.data / 'drafts.json', encoded(drafts))
                return self.state()
            if action != 'apply':
                raise ValueError('Unknown action.')
            if base != revision(current):
                raise Conflict('The website article has changed outside the Writing Room. Your draft is safe. Reload and compare before updating.')
            # Merge into the current record so fields unknown to the editor survive.
            merged = {**(current or {}), **article}
            if merged == current:
                drafts.pop(key, None)
                atomic_write(self.data / 'drafts.json', encoded(drafts))
                return self.state()
            if current is None or any(merged.get(k) != current.get(k) for k in ('body', 'title', 'subtitle', 'description', 'type')):
                metadata(merged)
            if current is None:
                articles.append(merged)
            else:
                articles[articles.index(current)] = merged
            stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S.%fZ')
            backup = self.data / 'backups' / (stamp + '-' + uuid.uuid4().hex[:8] + '.js')
            atomic_write(backup, raw)
            # Recheck after backup creation to catch external edits during the operation.
            if self.content.read_bytes() != raw:
                raise Conflict('The website changed while saving. Please try again after reloading.')
            atomic_write(self.content, b'window.SC_CONTENT = ' + encoded(articles) + b';\n')
            drafts.pop(key, None)
            atomic_write(self.data / 'drafts.json', encoded(drafts))
            result = self.state()
            result['backup'] = backup.name
            return result


class Conflict(ValueError):
    pass


def safe_public_file(root, relative, site=False):
    parts = Path(relative).parts
    if not parts or any(p.startswith('.') or p == '..' for p in parts):
        return None
    if site and not (relative in ('index.html', 'styles.css', 'app.js', 'collections.js', 'content.js', 'documents.js') or parts[0] in ('assets', 'sources')):
        return None
    target = (root / relative).resolve()
    if not target.is_relative_to(root.resolve()) or not target.is_file():
        return None
    return target


def handler(room, preview=False):
    class Handler(BaseHTTPRequestHandler):
        server_version = 'WritingRoom'

        def log_message(self, *args):
            pass

        def response(self, status, data, mime='application/json; charset=utf-8'):
            self.send_response(status)
            self.send_header('Content-Type', mime)
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Referrer-Policy', 'no-referrer')
            self.send_header('X-Frame-Options', 'SAMEORIGIN')
            if not preview:
                self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; frame-src 'self' about:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'")
            self.end_headers()
            self.wfile.write(data)

        def valid_host(self):
            expected = f'127.0.0.1:{room.preview_port if preview else room.port}'
            if self.headers.get('Host') != expected:
                self.response(403, encoded({'error': 'Use the local 127.0.0.1 address to open the Writing Room.'}))
                return False
            return True

        def do_GET(self):
            if not self.valid_host():
                return
            relative = unquote(urlsplit(self.path).path).lstrip('/') or 'index.html'
            if not preview and relative == 'api/state':
                # Never let a cross-origin site read drafts or bootstrap a write token.
                if self.headers.get('Sec-Fetch-Site') not in (None, 'same-origin', 'none'):
                    self.response(403, encoded({'error': 'Open the Writing Room directly.'}))
                    return
                try:
                    with LOCK:
                        self.response(200, encoded(room.state()))
                except (ValueError, OSError):
                    self.response(500, encoded({'error': 'Could not read content or drafts. Check the local files; nothing was overwritten.'}))
                return
            if preview:
                target = safe_public_file(room.website, relative, site=True)
            elif relative.startswith('site-assets/'):
                target = safe_public_file(room.website, relative.replace('site-assets/', 'assets/', 1), site=True)
            elif relative == 'site-styles.css':
                target = room.website / 'styles.css'
            else:
                target = safe_public_file(ROOT / 'public', relative)
            if target is None or not target.is_file():
                self.response(404, encoded({'error': 'Not found'}))
                return
            mime = mimetypes.guess_type(target.name)[0] or 'application/octet-stream'
            if target.suffix == '.js':
                mime = 'text/javascript'
            # Site stylesheet's fonts import needs the mapped local asset path.
            data = target.read_bytes()
            if not preview and relative == 'site-styles.css':
                data = data.replace(b'assets/', b'site-assets/')
            self.response(200, data, mime)

        def do_POST(self):
            if not self.valid_host():
                return
            if preview or self.headers.get('Origin') != room.origin or not secrets.compare_digest(self.headers.get('X-Writing-Room-Token', ''), room.token):
                self.response(403, encoded({'error': 'This request did not come from your Writing Room. Reload the page.'}))
                return
            action = urlsplit(self.path).path.removeprefix('/api/')
            if action not in ('draft', 'apply', 'discard', 'collection-create', 'collection-rename') or not self.path.startswith('/api/'):
                self.response(404, encoded({'error': 'Not found'}))
                return
            try:
                length = int(self.headers.get('Content-Length', '0'))
                if not 0 < length <= 4_000_000:
                    raise ValueError('This article is too large to save (limit: 4 MB).')
                if not self.headers.get('Content-Type', '').startswith('application/json'):
                    raise ValueError('Expected an article in JSON format.')
                payload = json.loads(self.rfile.read(length))
                if not isinstance(payload, dict):
                    raise ValueError('Expected an article object.')
                result = room.mutate_collection(action, payload) if action.startswith('collection-') else room.mutate(action, payload)
                self.response(200, encoded(result))
            except Conflict as error:
                self.response(409, encoded({'error': str(error)}))
            except (ValueError, TypeError) as error:
                self.response(400, encoded({'error': str(error)}))
            except OSError:
                self.response(500, encoded({'error': 'The file could not be saved. Keep this page open and check disk access.'}))
    return Handler


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    # The Writing Room normally lives inside the website project. Keep the
    # former side-by-side layout working as a fallback for portable copies.
    parent_website = ROOT.parent
    default_website = parent_website if (parent_website / 'content.js').is_file() else parent_website / 'science-coherence-website'
    parser.add_argument('--website', type=Path, default=default_website)
    parser.add_argument('--data', type=Path, default=ROOT / 'data')
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--preview-port', type=int, default=8766)
    args = parser.parse_args()
    room = Room(args.website, args.data, args.port, args.preview_port)
    editor = ThreadingHTTPServer(('127.0.0.1', args.port), handler(room))
    site = ThreadingHTTPServer(('127.0.0.1', args.preview_port), handler(room, preview=True))
    threading.Thread(target=site.serve_forever, daemon=True).start()
    print(f'Writing Room: {room.origin}\nWebsite preview: {room.preview}\nKeep this window open while writing.', flush=True)
    try:
        editor.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        editor.server_close()
        site.shutdown()
        site.server_close()


if __name__ == '__main__':
    main()
