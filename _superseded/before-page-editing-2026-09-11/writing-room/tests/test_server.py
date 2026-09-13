import importlib.util
import json
from pathlib import Path
import tempfile
import threading
import unittest
import urllib.request
import urllib.error

spec = importlib.util.spec_from_file_location('room', Path(__file__).resolve().parents[1] / 'server.py')
room_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(room_module)


class WritingRoomTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.website = self.root / 'website'
        self.website.mkdir()
        self.original = {'id':'test-article','title':'A title','description':'Summary','category':'research','collection':'framework',
                         'type':'Essay','date':'September 2026','body':'<p>A formula $x^2$.</p><div data-widget="calendar360"><b>Keep me</b></div>',
                         'download':'sources/original.pdf','unknown':{'keep':[1,2]},'words':7,'minutes':1,'search':'original index'}
        self.raw = b'window.SC_CONTENT = ' + room_module.encoded([self.original]) + b';\r\n'
        (self.website / 'content.js').write_bytes(self.raw)
        self.sections = [{'id':'research','name':'Research & frameworks','short':'Research','num':'01','symbol':'orbit'},
                         {'id':'lab','name':'The Lab','short':'The Lab','num':'02'},
                         {'id':'learning','name':'Learning in public','short':'Learning','num':'07','hidden':True},
                         {'id':'protocol','name':'The Protocol','short':'Protocol','num':'05','standalone':True,'acceptsArticles':False}]
        self.section_raw = b'window.SC_SECTIONS = ' + room_module.encoded(self.sections) + b';\n'
        (self.website / 'sections.js').write_bytes(self.section_raw)
        self.collections = [{'id':'framework','section':'research','num':'01','name':'Framework','description':'The architecture','order':['test-article']},
                            {'id':'biophysic','section':'research','num':'04','name':'Biophysic','description':'','order':[]}]
        self.collection_raw = b'window.SC_COLLECTIONS = ' + room_module.encoded(self.collections) + b';\n'
        (self.website / 'collections.js').write_bytes(self.collection_raw)
        self.room = room_module.Room(self.website,self.root/'data',8765,8766)

    def tearDown(self):
        self.temp.cleanup()

    def payload(self, **changes):
        article = {**self.original, **changes}
        return {'article':article,'baseRevision':room_module.revision(self.original),'draftVersion':None}

    def test_draft_does_not_modify_site_and_survives_restart(self):
        result = self.room.mutate('draft',self.payload(title='Private draft'))
        self.assertEqual(self.room.content.read_bytes(), self.raw)
        restarted = room_module.Room(self.website,self.root/'data',8765,8766)
        self.assertEqual(restarted.state()['drafts']['test-article']['article']['title'],'Private draft')
        self.assertTrue(result['drafts']['test-article']['version'])

    def test_apply_preserves_metadata_body_and_exact_backup(self):
        result = self.room.mutate('apply',self.payload(title='Updated title'))
        updated = room_module.read_articles(self.room.content)[1][0]
        self.assertEqual(updated['body'],self.original['body'])
        self.assertEqual(updated['unknown'],self.original['unknown'])
        self.assertEqual(updated['download'],self.original['download'])
        self.assertIn('Updated title',updated['search'])
        self.assertEqual((self.root/'data'/'backups'/result['backup']).read_bytes(),self.raw)

    def test_noop_does_not_rewrite_or_backup(self):
        self.room.mutate('apply',self.payload())
        self.assertEqual(self.room.content.read_bytes(),self.raw)
        self.assertFalse((self.root/'data'/'backups').exists())

    def test_external_article_change_is_not_overwritten(self):
        payload = self.payload(title='Draft')
        state = self.room.mutate('draft',payload)
        payload['draftVersion'] = state['drafts']['test-article']['version']
        external = b'window.SC_CONTENT = ' + room_module.encoded([{**self.original,'title':'External edit'}]) + b';'
        self.room.content.write_bytes(external)
        with self.assertRaises(room_module.Conflict): self.room.mutate('apply',payload)
        self.assertEqual(self.room.content.read_bytes(),external)
        self.assertEqual(self.room.drafts()['test-article']['article']['title'],'Draft')

    def test_other_article_edits_are_preserved(self):
        other = {**self.original,'id':'another','title':'External article'}
        self.room.content.write_bytes(b'window.SC_CONTENT = '+room_module.encoded([self.original,other])+b';')
        self.room.mutate('apply',self.payload(title='Changed'))
        self.assertEqual(room_module.read_articles(self.room.content)[1][1],other)

    def test_multiple_windows_cannot_overwrite_draft(self):
        self.room.mutate('draft',self.payload(title='Window one'))
        with self.assertRaises(room_module.Conflict): self.room.mutate('draft',self.payload(title='Window two'))

    def test_new_article_address_collision_fails(self):
        payload = self.payload(title='A new article')
        payload['baseRevision'] = None
        with self.assertRaises(room_module.Conflict): self.room.mutate('apply',payload)

    def test_add_article_and_discard_draft(self):
        payload = self.payload(id='new-piece',title='New piece')
        payload['baseRevision'] = None
        result = self.room.mutate('draft',payload)
        payload['draftVersion'] = result['drafts']['new-piece']['version']
        self.room.mutate('apply',payload)
        self.assertEqual(len(self.room.state()['articles']),2)
        result = self.room.mutate('draft',self.payload())
        payload = self.payload()
        payload['draftVersion'] = result['drafts']['test-article']['version']
        self.room.mutate('discard',payload)
        self.assertFalse(self.room.drafts())

    def test_invalid_content_fails_closed(self):
        self.room.content.write_text('alert("not data");','utf-8')
        with self.assertRaises(ValueError): self.room.mutate('apply',self.payload())
        self.assertEqual(self.room.content.read_text('utf-8'),'alert("not data");')

    def test_public_file_allowlist(self):
        (self.website / 'private.txt').write_text('private')
        self.assertIsNone(room_module.safe_public_file(self.website,'private.txt',site=True))
        self.assertIsNone(room_module.safe_public_file(self.website,'../data/drafts.json',site=True))
        self.assertIsNone(room_module.safe_public_file(self.website,'.git/config',site=True))

    def collection_payload(self, **collection):
        return {'collection':collection,'baseRevision':self.room.state()['collectionRevision']}

    def test_state_exposes_sections_collections_and_version(self):
        state = self.room.state()
        self.assertEqual([s['id'] for s in state['sections']],['research','lab','learning','protocol'])
        self.assertEqual([c['id'] for c in state['collections']],['framework','biophysic'])
        self.assertEqual(state['collectionRevision'],room_module.digest(self.collection_raw))
        self.assertEqual(state['roomVersion'],room_module.ROOM_VERSION)

    def test_create_collection_numbers_within_its_section_with_backup(self):
        result = self.room.mutate_collection('collection-create',self.collection_payload(id='meta-mathematics',name='Meta-Mathematics',description='One code'))
        _, saved = room_module.read_collections(self.room.collection_file)
        self.assertEqual(saved[:2],self.collections)
        created = saved[2]
        self.assertEqual((created['id'],created['section'],created['num'],created['name'],created['description']),
                         ('meta-mathematics','research','05','Meta-Mathematics','One code'))
        self.assertEqual((self.root/'data'/'backups'/result['collectionBackup']).read_bytes(),self.collection_raw)
        self.assertEqual(self.room.content.read_bytes(),self.raw)
        self.assertEqual(self.room.section_file.read_bytes(),self.section_raw)

    def test_create_collection_in_another_section_starts_at_01(self):
        self.room.mutate_collection('collection-create',self.collection_payload(id='field-notes',name='Field notes',section='lab'))
        self.assertEqual(room_module.read_collections(self.room.collection_file)[1][2]['num'],'01')

    def test_create_collection_rejects_duplicate_bad_address_and_bad_section(self):
        with self.assertRaises(room_module.Conflict):
            self.room.mutate_collection('collection-create',self.collection_payload(id='framework',name='Again'))
        with self.assertRaises(ValueError):
            self.room.mutate_collection('collection-create',self.collection_payload(id='Bad Address',name='Bad'))
        with self.assertRaises(ValueError):
            self.room.mutate_collection('collection-create',self.collection_payload(id='empty-name',name='  '))
        for section in ('protocol','no-such-section'):
            with self.assertRaises(ValueError):
                self.room.mutate_collection('collection-create',self.collection_payload(id='x',name='X',section=section))
        self.assertEqual(self.room.collection_file.read_bytes(),self.collection_raw)

    def test_stale_collection_revision_is_refused(self):
        payload = self.collection_payload(id='new-one',name='New one')
        external = b'window.SC_COLLECTIONS = ' + room_module.encoded(self.collections[:1]) + b';\n'
        self.room.collection_file.write_bytes(external)
        with self.assertRaises(room_module.Conflict): self.room.mutate_collection('collection-create',payload)
        self.assertEqual(self.room.collection_file.read_bytes(),external)

    def test_rename_collection_keeps_address_section_number_and_order(self):
        self.room.mutate_collection('collection-rename',self.collection_payload(id='framework',name='The Framework',description='Revised'))
        renamed = room_module.read_collections(self.room.collection_file)[1][0]
        self.assertEqual((renamed['id'],renamed['section'],renamed['num'],renamed['name'],renamed['description'],renamed['order']),
                         ('framework','research','01','The Framework','Revised',['test-article']))
        self.room.mutate_collection('collection-rename',self.collection_payload(id='framework',name='Framework'))
        self.assertEqual(room_module.read_collections(self.room.collection_file)[1][0]['description'],'Revised')

    def test_unknown_collection_cannot_be_renamed(self):
        with self.assertRaises(ValueError):
            self.room.mutate_collection('collection-rename',self.collection_payload(id='missing',name='Renamed'))
        self.assertEqual(self.room.collection_file.read_bytes(),self.collection_raw)

    def test_article_must_be_filed_where_the_website_has_a_place(self):
        bad = [dict(category='protocol',collection=None), dict(category='no-such-section',collection=None),
               dict(category='research',collection=None), dict(category='research',collection='no-such-collection'),
               dict(category='lab',collection='framework')]
        for fields in bad:
            with self.assertRaises(ValueError, msg=fields): self.room.mutate('apply',self.payload(**fields))
            with self.assertRaises(ValueError, msg=fields): self.room.mutate('draft',self.payload(**fields))
        self.assertEqual(self.room.content.read_bytes(),self.raw)

    def test_moving_between_collections_and_into_a_section_without_collections(self):
        self.room.mutate('apply',self.payload(collection='biophysic'))
        self.assertEqual(room_module.read_articles(self.room.content)[1][0]['collection'],'biophysic')
        current = room_module.read_articles(self.room.content)[1][0]
        payload = {'article':{**current,'category':'lab','collection':''},'baseRevision':room_module.revision(current),'draftVersion':None}
        self.room.mutate('apply',payload)
        moved = room_module.read_articles(self.room.content)[1][0]
        self.assertEqual(moved['category'],'lab')
        self.assertNotIn('collection',moved)

    def test_new_collection_accepts_articles(self):
        self.room.mutate_collection('collection-create',self.collection_payload(id='notes',name='Notes'))
        self.room.mutate('apply',self.payload(collection='notes'))
        self.assertEqual(room_module.read_articles(self.room.content)[1][0]['collection'],'notes')

    def test_invalid_sections_or_collections_fail_closed(self):
        self.room.collection_file.write_text('window.SC_COLLECTIONS = [{"id":"a","name":"A","section":"research"},{"id":"a","name":"B","section":"research"}];','utf-8')
        with self.assertRaises(ValueError): self.room.state()
        with self.assertRaises(ValueError):
            self.room.mutate_collection('collection-create',{'collection':{'id':'b','name':'B'},'baseRevision':None})
        self.room.collection_file.write_bytes(self.collection_raw)
        self.room.section_file.write_text('alert("not data");','utf-8')
        with self.assertRaises(ValueError): self.room.state()
        with self.assertRaises(ValueError): self.room.mutate('apply',self.payload(title='Changed'))
        self.assertEqual(self.room.content.read_bytes(),self.raw)

    def test_section_and_collection_files_are_served_to_the_preview(self):
        self.assertIsNotNone(room_module.safe_public_file(self.website,'sections.js',site=True))
        self.assertIsNotNone(room_module.safe_public_file(self.website,'collections.js',site=True))

    def test_http_origin_host_token_and_private_paths(self):
        server = room_module.ThreadingHTTPServer(('127.0.0.1',0),room_module.handler(self.room))
        self.room.port = server.server_port
        self.room.origin = f'http://127.0.0.1:{server.server_port}'
        thread = threading.Thread(target=server.serve_forever,daemon=True)
        thread.start()
        def request(path, data=None, headers=None):
            req = urllib.request.Request(self.room.origin+path,data=data,headers=headers or {})
            try:
                with urllib.request.urlopen(req) as response: return response.status,response.read()
            except urllib.error.HTTPError as error: return error.code,error.read()
        try:
            self.assertEqual(request('/api/state')[0],200)
            self.assertEqual(request('/api/state',headers={'Host':'evil.example'})[0],403)
            self.assertEqual(request('/api/state',headers={'Sec-Fetch-Site':'cross-site'})[0],403)
            self.assertEqual(request('/data/drafts.json')[0],404)
            self.assertEqual(request('/server.py')[0],404)
            payload = room_module.encoded(self.payload(title='HTTP edit'))
            headers = {'Content-Type':'application/json','Origin':'https://evil.example','X-Writing-Room-Token':self.room.token}
            self.assertEqual(request('/api/apply',payload,headers)[0],403)
            headers['Origin'] = self.room.origin
            headers['X-Writing-Room-Token'] = 'wrong'
            self.assertEqual(request('/api/apply',payload,headers)[0],403)
            headers['X-Writing-Room-Token'] = self.room.token
            self.assertEqual(request('/api/apply',payload,headers)[0],200)
            collection = room_module.encoded(self.collection_payload(id='over-http',name='Over HTTP'))
            self.assertEqual(request('/api/collection-create',collection,{**headers,'X-Writing-Room-Token':'wrong'})[0],403)
            self.assertEqual(request('/api/collection-create',collection,headers)[0],200)
            self.assertEqual(request('/api/collection-create',collection,headers)[0],409)
            self.assertEqual(request('/api/collection-delete',collection,headers)[0],404)
        finally:
            server.shutdown()
            server.server_close()


if __name__ == '__main__': unittest.main(verbosity=2)
