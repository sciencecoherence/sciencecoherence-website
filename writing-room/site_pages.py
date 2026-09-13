"""The main pages' copy, for the Writing Room.

A page's editable fields come from four places, and each is written back to
where it lives:

  pages.js          the text of each page (window.SC_PAGES): headings,
                    paragraphs, buttons, captions
  sections.js       a section's name and introductions (Research, Transmissions)
  collections.js    a collection's name, description and small line
  documents/*.html  the Protocol: its title, notes, key figures and sections;
                    documents.js is rebuilt from it after every change

Keys say where a field lives: `hero.title` (pages.js), `section:research:intro`,
`collection:framework:description`, `document:<id>:meta:title`,
`document:<id>:fact:0:value`, `document:<id>:section:<section-id>:body`.
"""
import html
import importlib.util
import json
import re
from pathlib import Path


class Conflict(ValueError):
    pass


SECTION_FIELDS = [('name', 'Title', 'line'), ('short', 'Short name, for menus and filters', 'line'),
                  ('intro', 'Introduction under the title', 'text'), ('description', 'Description in the sidebar', 'text'),
                  ('label', 'Small line in the sidebar', 'line')]
COLLECTION_FIELDS = [('name', 'Name', 'line'), ('description', 'Description', 'text'), ('tagline', 'Small line', 'line')]
DOCUMENT_FIELDS = [('title', 'Title', 'line'), ('subtitle', 'Subtitle', 'text'),
                   ('description', 'Description, for the library and search', 'text'), ('note', 'Note to the reader', 'text')]
DOCUMENT_SECTION_FIELDS = [('label', 'Tab name', 'line'), ('title', 'Title', 'line'),
                           ('summary', 'Summary under the title', 'text'), ('body', 'Text', 'rich')]
KINDS = {'plain': 2_000, 'line': 2_000, 'text': 20_000, 'rich': 2_000_000}

SECTION_RE = re.compile(r'<section\s+([^>]*)>(.*?)</section>', re.S)
ATTR_RE = re.compile(r'([\w-]+)="([^"]*)"')
META_RE = re.compile(r'<script type="application/json" id="meta">(.*?)</script>', re.S)


def parse_global(raw, name, what):
    match = re.fullmatch(r'\s*window\.' + name + r'\s*=\s*(\[.*\])\s*;?\s*', raw.decode('utf-8-sig'), re.S)
    if not match:
        raise ValueError(f'The website {what} format has changed. Nothing has been overwritten.')
    return json.loads(match[1])


def encoded(value):
    return json.dumps(value, ensure_ascii=False, indent=2).encode('utf-8')


def read_pages(raw):
    pages = parse_global(raw, 'SC_PAGES', 'page')
    ids = [page.get('id') for page in pages if isinstance(page, dict)]
    if len(ids) != len(pages) or any(not isinstance(i, str) for i in ids) or len(set(ids)) != len(ids):
        raise ValueError('The website has missing or duplicate page addresses.')
    for page in pages:
        keys = [f.get('key') for f in page.get('fields', []) if isinstance(f, dict)]
        if len(keys) != len(page.get('fields', [])) or any(not isinstance(k, str) or ':' in k for k in keys) or len(set(keys)) != len(keys):
            raise ValueError(f'The page “{page["id"]}” has missing or duplicate fields.')
        for field in page['fields']:
            if field.get('kind') not in KINDS or not isinstance(field.get('value'), str):
                raise ValueError(f'The page “{page["id"]}” has a field that cannot be edited.')
    return pages


def mask_comments(text):
    """Blank out comments, keeping every offset, so a tag named inside a comment is never mistaken for one."""
    return re.sub(r'<!--.*?-->', lambda m: re.sub(r'[^\n]', ' ', m.group(0)), text, flags=re.S)


def parse_document(text):
    masked = mask_comments(text)
    meta_match = META_RE.search(masked)
    if not meta_match:
        raise ValueError('The Protocol’s source has no metadata block. Nothing has been overwritten.')
    meta = json.loads(text[meta_match.start(1):meta_match.end(1)])
    sections = []
    for match in SECTION_RE.finditer(masked):
        attrs = {k: html.unescape(v) for k, v in ATTR_RE.findall(text[match.start(1):match.end(1)])}
        if 'data-id' not in attrs:
            continue
        sections.append({'attrs': attrs, 'attr_span': match.span(1), 'body_span': match.span(2),
                         'body': text[match.start(2):match.end(2)].strip()})
    return meta, meta_match.span(1), sections


def load_builder(website):
    spec = importlib.util.spec_from_file_location('build_documents', website / 'tools' / 'build-documents.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class SiteCopy:
    def __init__(self, website):
        self.website = Path(website)
        self.pages_file = self.website / 'pages.js'
        self.sections_file = self.website / 'sections.js'
        self.collections_file = self.website / 'collections.js'
        self.documents_dir = self.website / 'documents'
        self.documents_js = self.website / 'documents.js'

    def document_file(self, doc_id):
        if not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,119}', doc_id):
            raise ValueError('That document could not be found.')
        return self.documents_dir / f'{doc_id}.html'

    # ---------- reading --------------------------------------------------
    def load(self):
        snap = {'raw': {}, 'revisions': {}}
        for name, path in (('pages', self.pages_file), ('sections', self.sections_file), ('collections', self.collections_file)):
            snap['raw'][name] = path.read_bytes()
        snap['pages'] = read_pages(snap['raw']['pages'])
        snap['sections'] = parse_global(snap['raw']['sections'], 'SC_SECTIONS', 'section')
        snap['collections'] = parse_global(snap['raw']['collections'], 'SC_COLLECTIONS', 'collection')
        snap['documents'] = {}
        for page in snap['pages']:
            doc_id = page.get('document')
            if doc_id and doc_id not in snap['documents']:
                raw = self.document_file(doc_id).read_bytes()
                snap['raw']['document:' + doc_id] = raw
                snap['documents'][doc_id] = parse_document(raw.decode('utf-8'))
        from hashlib import sha256
        snap['revisions'] = {name: sha256(raw).hexdigest() for name, raw in snap['raw'].items()}
        return snap

    def fields_for(self, page, snap):
        fields = []
        section_id = page.get('section')
        if section_id:
            section = next((s for s in snap['sections'] if s['id'] == section_id), None)
            if section:
                for key, label, kind in SECTION_FIELDS:
                    fields.append({'key': f'section:{section_id}:{key}', 'group': 'Opening', 'label': label, 'kind': kind, 'value': str(section.get(key, ''))})
                own = sorted((c for c in snap['collections'] if c.get('section') == section_id), key=lambda c: int(c['num']) if str(c.get('num', '')).isdigit() else 999)
                for collection in own:
                    for key, label, kind in COLLECTION_FIELDS:
                        fields.append({'key': f'collection:{collection["id"]}:{key}', 'group': f'Collection {collection.get("num", "")} · {collection["name"]}',
                                       'label': label, 'kind': kind, 'value': str(collection.get(key, ''))})
        doc_id = page.get('document')
        if doc_id and doc_id in snap['documents']:
            meta, _, sections = snap['documents'][doc_id]
            for key, label, kind in DOCUMENT_FIELDS:
                fields.append({'key': f'document:{doc_id}:meta:{key}', 'group': 'The document', 'label': label, 'kind': kind, 'value': str(meta.get(key, ''))})
            for i, fact in enumerate(meta.get('facts', [])):
                fields.append({'key': f'document:{doc_id}:fact:{i}:value', 'group': 'Key figures', 'label': f'Figure {i + 1}', 'kind': 'line', 'value': str(fact.get('value', ''))})
                fields.append({'key': f'document:{doc_id}:fact:{i}:label', 'group': 'Key figures', 'label': f'Figure {i + 1} — label', 'kind': 'line', 'value': str(fact.get('label', ''))})
            for section in sections:
                a = section['attrs']
                group = f'Section {a.get("data-num", "")} · {a.get("data-label", a["data-id"])}'
                for key, label, kind in DOCUMENT_SECTION_FIELDS:
                    value = section['body'] if key == 'body' else a.get('data-' + key, '')
                    fields.append({'key': f'document:{doc_id}:section:{a["data-id"]}:{key}', 'group': group, 'label': label, 'kind': kind, 'value': value})
        fields.extend(dict(f) for f in page.get('fields', []))
        return fields

    def view(self):
        snap = self.load()
        pages = [{'id': p['id'], 'name': p['name'], 'route': p.get('route', '#/'), 'fields': self.fields_for(p, snap)} for p in snap['pages']]
        return pages, snap['revisions']

    # ---------- writing --------------------------------------------------
    def save(self, payload, write, backup):
        """Apply a page's changed fields. `write(path, bytes)` writes atomically;
        `backup(path, bytes)` keeps an exact copy and returns its name."""
        page_id, values, revisions = payload.get('page'), payload.get('values'), payload.get('revisions')
        if not isinstance(page_id, str) or not isinstance(values, dict) or not isinstance(revisions, dict):
            raise ValueError('Choose a page first.')
        snap = self.load()
        page = next((p for p in snap['pages'] if p['id'] == page_id), None)
        if page is None:
            raise ValueError('That page could not be found.')
        fields = {f['key']: f for f in self.fields_for(page, snap)}
        changed = {}
        for key, value in values.items():
            field = fields.get(key)
            if field is None:
                raise ValueError('A field sent for this page is not part of it. Reload the room.')
            if not isinstance(value, str) or len(value) > KINDS[field['kind']]:
                raise ValueError(f'“{field["label"]}” is too long or not text.')
            if field['kind'] in ('line', 'text', 'plain') and re.search(r'<(?:script|style|iframe|object|embed)\b', value, re.I):
                raise ValueError(f'“{field["label"]}” contains page code that cannot be saved here.')
            if value != field['value']:
                changed[key] = value
        if not changed:
            return []
        targets = {self.target(key) for key in changed}
        for target in targets:
            if revisions.get(target) != snap['revisions'].get(target):
                raise Conflict('This page’s files changed in another window or editor. Your changes are still on this page; reload to compare.')

        outputs = {}
        if 'pages' in targets:
            for field in page['fields']:
                if field['key'] in changed:
                    field['value'] = changed[field['key']]
            outputs['pages'] = (self.pages_file, b'window.SC_PAGES = ' + encoded(snap['pages']) + b';\n')
        for name, items, glob in (('sections', snap['sections'], 'SC_SECTIONS'), ('collections', snap['collections'], 'SC_COLLECTIONS')):
            if name in targets:
                prefix = name[:-1] + ':'
                for key, value in changed.items():
                    if key.startswith(prefix):
                        _, item_id, attr = key.split(':')
                        item = next(i for i in items if i['id'] == item_id)
                        item[attr] = value
                outputs[name] = (self.sections_file if name == 'sections' else self.collections_file,
                                 f'window.{glob} = '.encode() + encoded(items) + b';\n')
        for target in targets:
            if target.startswith('document:'):
                doc_id = target.split(':', 1)[1]
                raw = snap['raw'][target].decode('utf-8')
                outputs[target] = (self.document_file(doc_id), self.edit_document(raw, doc_id, changed).encode('utf-8'))

        backups = [backup(path, snap['raw'][name]) for name, (path, _) in outputs.items()]
        for name, (path, _) in outputs.items():
            if path.read_bytes() != snap['raw'][name]:
                raise Conflict('A file changed while saving. Nothing further was written; reload and try again.')
        for name, (path, data) in outputs.items():
            write(path, data)
        if any(name.startswith('document:') for name in outputs):
            before = self.documents_js.read_bytes() if self.documents_js.exists() else None
            try:
                builder = load_builder(self.website)
                docs = [builder.build_one(p) for p in sorted(self.documents_dir.glob('*.html'))]
                built = ('window.SC_DOCUMENTS = ' + json.dumps(docs, ensure_ascii=False, indent=1) + ';\n').encode('utf-8')
            except Exception:
                for name, (path, _) in outputs.items():
                    if name.startswith('document:'):
                        write(path, snap['raw'][name])
                raise ValueError('The Protocol could not be rebuilt from its source, so its change was undone. The other files were saved.')
            if before is not None:
                backups.append(backup(self.documents_js, before))
            write(self.documents_js, built)
        return backups

    @staticmethod
    def target(key):
        if key.startswith('section:'):
            return 'sections'
        if key.startswith('collection:'):
            return 'collections'
        if key.startswith('document:'):
            return 'document:' + key.split(':')[1]
        return 'pages'

    @staticmethod
    def edit_document(text, doc_id, changed):
        meta, meta_span, sections = parse_document(text)
        edits = []
        meta_changed = False
        for key, value in changed.items():
            parts = key.split(':')
            if parts[0] != 'document' or parts[1] != doc_id:
                continue
            if parts[2] == 'meta':
                meta[parts[3]] = value
                meta_changed = True
            elif parts[2] == 'fact':
                meta['facts'][int(parts[3])][parts[4]] = value
                meta_changed = True
        if meta_changed:
            edits.append((meta_span, '\n' + json.dumps(meta, ensure_ascii=False, indent=2) + '\n'))
        for section in sections:
            sid = section['attrs']['data-id']
            prefix = f'document:{doc_id}:section:{sid}:'
            mine = {k[len(prefix):]: v for k, v in changed.items() if k.startswith(prefix)}
            if not mine:
                continue
            attrs = dict(section['attrs'])
            for key in ('label', 'title', 'summary'):
                if key in mine:
                    attrs['data-' + key] = mine[key]
            if any(k in mine for k in ('label', 'title', 'summary')):
                edits.append((section['attr_span'], ' '.join(f'{k}="{html.escape(v, quote=True)}"' for k, v in attrs.items())))
            if 'body' in mine:
                edits.append((section['body_span'], '\n  ' + mine['body'].strip() + '\n'))
        for (start, end), replacement in sorted(edits, key=lambda e: e[0][0], reverse=True):
            text = text[:start] + replacement + text[end:]
        return text
