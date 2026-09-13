'use strict';
const $ = id => document.getElementById(id);
const clone = value => JSON.parse(JSON.stringify(value));
const escapeHTML = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* Three ways a piece is classified, kept apart as on the website:
     section    — where it lives (Research, The Lab, Transmissions…): article.category
     collection — a named group inside a section (Research: 01 Framework…): article.collection
     type       — what kind of piece it is (Research article, Collection introduction…)
   Sections and collections come from the website's sections.js and
   collections.js through the service, so what is chosen here is what the
   website shows. */
const ROOM_VERSION = 4;
const siteSections = () => (state && Array.isArray(state.sections) ? state.sections : []);
const siteCollections = () => (state && Array.isArray(state.collections) ? state.collections : []);
const byNum = (a, b) => String(a.num ?? '').localeCompare(String(b.num ?? ''), undefined, {numeric:true});
const articleSections = () => siteSections().filter(item => item.acceptsArticles !== false).sort(byNum);
const collectionsOf = sectionId => siteCollections().filter(item => item.section === sectionId).sort(byNum);
const sectionOf = id => siteSections().find(item => item.id === id);
const collectionOf = (sectionId, id) => id ? siteCollections().find(item => item.id === id && item.section === sectionId) : null;
const placeOf = article => article.collection ? `${article.category}/${article.collection}` : (article.category || '');
function placeLabel(sectionId, collectionId) {
  const section = sectionOf(sectionId);
  const collection = collectionOf(sectionId, collectionId);
  const name = section ? (section.short || section.name) : (sectionId || 'Not filed');
  if (collection) return `${name} · ${collection.num} ${collection.name}`;
  return section?.hidden ? `${name} · hidden` : name;
}
/* Is this place one the website can show? A section with collections needs one of them. */
function placeIsValid(sectionId, collectionId) {
  const section = articleSections().find(item => item.id === sectionId);
  if (!section) return false;
  const own = collectionsOf(sectionId);
  return own.length ? own.some(item => item.id === collectionId) : !collectionId;
}
const slugify = text => String(text).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
let state, current, baseRevision, draftVersion, dirty = false, bodyDirty = false, busy = false, filter = 'all', libraryPlace = 'all', staleService = false;
let mode = 'articles', currentPage = null, pageDirty = false, pageEditors = new Map(), pageOriginals = new Map(), pageFocus = null;
let protectedBlocks = new Map(), frameVersion = 0, previewTimer, selectionRange;
const theme = localStorage.getItem('wr-theme') === 'dark' ? 'dark' : 'light';
const localService = location.hostname === '127.0.0.1' && location.port === '8765';
const apiURL = action => localService ? '/api/' + action : new URL('../api.php?action=' + encodeURIComponent(action), document.baseURI).href;
const siteStylesURL = localService ? '/site-styles.css' : new URL('../../styles.css', document.baseURI).href;
const katexStylesURL = localService ? '/site-assets/vendor/katex/katex.min.css' : new URL('../../assets/vendor/katex/katex.min.css', document.baseURI).href;
document.documentElement.dataset.theme = theme;

function openFromDisk() {
  if (location.protocol !== 'file:') return false;
  document.documentElement.classList.add('direct-file');
  $('file-launcher').hidden = false;
  const status = $('file-launcher-status');
  const probe = new Image();
  let finished = false;
  const unavailable = () => {
    if (finished) return;
    finished = true;
    status.textContent = 'The Writing Room is not running yet. Start it from the main website folder, then open this page again.';
  };
  probe.onload = () => {
    if (finished) return;
    finished = true;
    status.textContent = 'Writing Room found. Opening it now…';
    location.replace('http://127.0.0.1:8765/');
  };
  probe.onerror = unavailable;
  probe.src = 'http://127.0.0.1:8765/site-assets/mark.svg?check=' + Date.now();
  setTimeout(unavailable, 1800);
  return true;
}

function notice(message, error = false) {
  $('notice').textContent = message;
  $('notice').classList.toggle('error', error);
  $('notice').hidden = !message;
}

async function dialog(title, html, confirm = 'Continue') {
  $('dialog-title').textContent = title;
  $('dialog-body').innerHTML = html;
  $('dialog-confirm').textContent = confirm;
  $('dialog').showModal();
  return new Promise(resolve => $('dialog').addEventListener('close', () => resolve($('dialog').returnValue === 'confirm'), {once:true}));
}

function setBusy(value) {
  busy = value;
  for (const id of ['save','apply','new','discard']) $(id).disabled = value || staleService;
  $('new-collection').disabled = value || staleService || !state;
  $('page-apply').disabled = value || staleService || !currentPage;
  syncCollectionActions();
}

function combinedArticles() {
  const items = new Map(state.articles.map(a => [a.id, a]));
  Object.values(state.drafts).forEach(d => items.set(d.article.id, d.article));
  if (current && !items.has(current.id)) items.set(current.id, current);
  return [...items.values()];
}

/* The library's groups, in the website's order: each collection of a section,
   then the section itself for sections without collections. */
function libraryGroups() {
  const groups = [];
  for (const section of articleSections()) {
    const own = collectionsOf(section.id);
    for (const collection of own) groups.push({key:`${section.id}/${collection.id}`, label:`${section.short || section.name} · ${collection.num} ${collection.name}`});
    groups.push({key:section.id, label: own.length ? `${section.short || section.name} · not in a collection` : placeLabel(section.id), loose: own.length > 0});
  }
  return groups;
}

function renderLibraryPlaces() {
  const select = $('library-place');
  const keep = libraryPlace;
  select.replaceChildren(new Option('All collections', 'all'));
  const used = new Set(combinedArticles().map(item => item.category));
  for (const section of articleSections()) {
    const own = collectionsOf(section.id);
    if (section.hidden && !own.length && !used.has(section.id)) continue;
    if (own.length) {
      const group = document.createElement('optgroup');
      group.label = section.name;
      group.append(new Option(`All of ${section.short || section.name}`, 'section:' + section.id));
      own.forEach(collection => group.append(new Option(`${collection.num} ${collection.name}`, `${section.id}/${collection.id}`)));
      select.append(group);
    } else {
      select.append(new Option(placeLabel(section.id), section.id));
    }
  }
  select.value = [...select.options].some(option => option.value === keep) ? keep : 'all';
  libraryPlace = select.value;
}

function inLibraryPlace(article) {
  if (libraryPlace === 'all') return true;
  if (libraryPlace.startsWith('section:')) return article.category === libraryPlace.slice(8);
  return placeOf(article) === libraryPlace;
}

function articleButton(article) {
  const button = document.createElement('button');
  button.className = 'article' + (current?.id === article.id ? ' selected' : '');
  button.setAttribute('aria-current', current?.id === article.id ? 'page' : 'false');
  const detail = libraryPlace === 'all' ? (article.type || 'No type yet') : `${placeLabel(article.category, article.collection)} · ${article.type || 'no type'}`;
  button.innerHTML = `<strong>${escapeHTML(article.title || 'Untitled article')}</strong><small>${escapeHTML(detail)}${state.drafts[article.id] ? '<span class="draft-dot">● Draft</span>' : ''}</small>`;
  button.onclick = () => choose(article.id);
  return button;
}

/* Within a collection, pieces follow the collection's own order, as on the website. */
function inCollectionOrder(a, b) {
  const order = collectionOf(a.category, a.collection)?.order || [];
  const rank = item => { const i = order.indexOf(item.id); return i < 0 ? Infinity : i; };
  return rank(a) - rank(b) || String(b.date || '').localeCompare(String(a.date || ''));
}

function list() {
  const query = $('search').value.toLowerCase().trim();
  const items = combinedArticles().filter(a => (filter !== 'drafts' || state.drafts[a.id]) && inLibraryPlace(a)
    && `${a.title} ${a.description} ${a.type} ${placeLabel(a.category, a.collection)}`.toLowerCase().includes(query));
  $('count').textContent = combinedArticles().length;
  $('draft-count').textContent = Object.keys(state.drafts).length;
  const root = $('articles');
  root.replaceChildren();
  if (!items.length) {
    root.innerHTML = '<p class="empty">' + (filter === 'drafts' ? 'No saved drafts here yet. A little space for your next idea.' : 'Nothing here matches yet.') + '</p>';
    return;
  }
  if (libraryPlace !== 'all') {
    // One collection keeps its own order; a whole section is grouped by collection first.
    const key = article => [String(collectionOf(article.category, article.collection)?.num ?? '99'), article.collection || ''];
    items.sort((a, b) => key(a)[0].localeCompare(key(b)[0], undefined, {numeric:true}) || (a.collection === b.collection ? inCollectionOrder(a, b) : 0));
    items.forEach(article => root.append(articleButton(article)));
    return;
  }
  // All collections: one heading per collection, in the website's order.
  const placed = new Set();
  for (const group of libraryGroups()) {
    const members = items.filter(a => placeOf(a) === group.key).sort(inCollectionOrder);
    if (!members.length) continue;
    const heading = document.createElement('h3');
    heading.className = 'library-group' + (group.loose ? ' loose' : '');
    heading.textContent = group.label;
    root.append(heading);
    members.forEach(article => {placed.add(article.id); root.append(articleButton(article));});
  }
  const unfiled = items.filter(a => !placed.has(a.id));
  if (unfiled.length) {
    const heading = document.createElement('h3');
    heading.className = 'library-group loose';
    heading.textContent = 'Not filed on the website';
    root.append(heading);
    unfiled.forEach(article => root.append(articleButton(article)));
  }
}

function collect() {
  if (!current) return null;
  const article = clone(current);
  for (const key of ['title','description','type','date']) article[key] = $(key).value;
  const [category = '', collection = ''] = $('place').value.split('/');
  article.category = category;
  article.collection = collection || null;
  if ($('subtitle').value || Object.hasOwn(article,'subtitle')) article.subtitle = $('subtitle').value;
  article.id = $('slug').value;
  if (bodyDirty) {
    const root = $('editor').contentDocument.getElementById('writing');
    if (root) {
      const copy = root.cloneNode(true);
      copy.querySelectorAll('[data-wr-lock]').forEach(node => {
        const original = protectedBlocks.get(node.getAttribute('data-wr-lock'));
        if (original !== undefined) node.outerHTML = original;
      });
      article.body = copy.innerHTML;
    }
  }
  return article;
}

function markDirty() {
  dirty = true;
  $('save-status').textContent = 'Unsaved changes';
  clearTimeout(previewTimer);
  previewTimer = setTimeout(renderPreview, 250);
  $('title').style.height = 'auto';
  $('title').style.height = `${$('title').scrollHeight}px`;
}

async function mayLeave() {
  if (busy) return false;
  if (!dirty) return true;
  return dialog('Leave unsaved changes?', '<p>The changes on this page haven’t been saved. Choose Cancel, then Save draft to keep them.</p><p>Any previously saved draft will remain available.</p>', 'Leave without saving');
}

async function choose(id, force = false) {
  if (!force && !(await mayLeave())) return;
  const draft = state.drafts[id];
  current = clone(draft?.article || state.articles.find(a => a.id === id));
  baseRevision = draft ? draft.baseRevision : state.revisions[id] ?? null;
  draftVersion = draft?.version ?? null;
  dirty = bodyDirty = false;
  notice('');
  for (const key of ['title','subtitle','description','type','date']) $(key).value = current[key] || '';
  renderPlaces(current);
  $('slug').value = current.id;
  $('slug').readOnly = !!(state.revisions[id] || draft);
  $('collection-label').textContent = placeLabel(current.category, current.collection);
  $('details-summary').textContent = current.type || 'Article';
  $('save-status').textContent = draft ? 'Saved draft' : 'On your local website';
  $('draft-time').textContent = draft ? `Draft saved ${new Date(draft.savedAt).toLocaleString()}` : 'Your original website is unchanged.';
  $('discard').hidden = !draft;
  $('website').href = state.previewUrl + '/#/read/' + encodeURIComponent(id);
  localStorage.setItem('wr-last-article', id);
  $('title').style.height = 'auto';
  $('title').style.height = `${$('title').scrollHeight}px`;
  list();
  renderEditor();
  renderPreview();
}

function frameHTML(body, editing) {
  const dark = document.documentElement.dataset.theme === 'dark';
  return `<!doctype html><html lang="en" data-theme="${dark ? 'dark' : 'light'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; script-src 'none'; base-uri 'none'; form-action 'none'"><link rel="stylesheet" href="${escapeHTML(siteStylesURL)}"><link rel="stylesheet" href="${escapeHTML(katexStylesURL)}"><style>
    html,body{margin:0!important;min-height:0!important;background:${dark?'#1b2720':'#fffef9'}!important;color:${dark?'#e5e9df':'#243e34'}!important}body{padding:${editing?'10px 0 24px':'32px 27px 48px'}!important;font-family:'DM Sans',sans-serif;font-size:${editing?'14':'13'}px;line-height:1.9;overflow-wrap:anywhere}#writing{outline:none;min-height:${editing?'380':'0'}px}#writing> :first-child{margin-top:0}p{margin:0 0 1.3em}h1,h2,h3{font-family:'Newsreader',Georgia,serif;line-height:1.2;color:inherit}h1{font-size:34px;font-weight:400;margin:16px 0}h2{font-size:25px;margin:1.5em 0 .7em}h3{font-size:20px}img,video,svg{max-width:100%;height:auto}table{max-width:100%;font-size:11px}.table-scroll{overflow:auto}blockquote{margin:1em 0;padding-left:18px;border-left:2px solid #829476}a{color:inherit;text-decoration:underline}header{border-bottom:1px solid ${dark?'#35463a':'#dfe3d7'};margin-bottom:28px;padding-bottom:20px}.meta{font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:${dark?'#a3afa3':'#788078'}}.summary{color:${dark?'#a3afa3':'#788078'};font-size:13px}.katex-display{overflow:auto;max-width:100%}[data-wr-lock]{border:1px dashed #829476;border-radius:5px;padding:12px;user-select:none}[data-wr-lock]:before{content:'INTERACTIVE BLOCK · PRESERVED';display:block;font:9px 'DM Sans',sans-serif;letter-spacing:.1em;color:#829476;margin-bottom:12px}#writing script,#writing style{display:none}button,input,select,textarea{pointer-events:none}*{box-sizing:border-box}
  </style></head><body>${body}</body></html>`;
}

function preventNavigation(doc) {
  doc.addEventListener('click', event => { if (event.target.closest('a')) event.preventDefault(); });
  doc.addEventListener('submit', event => event.preventDefault());
}

function renderEditor() {
  const version = ++frameVersion;
  const frame = $('editor');
  frame.onload = () => {
    if (version !== frameVersion) return;
    const doc = frame.contentDocument;
    const root = doc.getElementById('writing');
    if (!root) return;
    protectedBlocks = new Map();
    const candidates = [...root.querySelectorAll('[data-widget],script,style,iframe,object,embed,svg')];
    for (const node of candidates.filter(node => !candidates.some(parent => parent !== node && parent.contains(node)))) {
      const key = crypto.randomUUID();
      protectedBlocks.set(key, node.outerHTML);
      node.setAttribute('data-wr-lock', key);
      node.setAttribute('contenteditable', 'false');
    }
    root.contentEditable = 'true';
    root.setAttribute('role','textbox');
    root.setAttribute('aria-label','Article body');
    root.setAttribute('aria-multiline','true');
    root.spellcheck = true;
    root.addEventListener('input', () => {bodyDirty = true; markDirty(); resizeEditor();});
    root.addEventListener('paste', event => {
      // Plain-text paste avoids importing scripts, hidden styles, and word-processor markup.
      event.preventDefault();
      doc.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
      bodyDirty = true;
      markDirty();
    });
    root.addEventListener('drop', event => event.preventDefault());
    doc.addEventListener('selectionchange', () => {
      const selection = doc.getSelection();
      if (selection.rangeCount && root.contains(selection.anchorNode)) selectionRange = selection.getRangeAt(0).cloneRange();
    });
    doc.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {event.preventDefault(); save('draft');}
    });
    preventNavigation(doc);
    resizeEditor();
  };
  selectionRange = null;
  frame.srcdoc = frameHTML(`<article id="writing" class="prose">${current.body}</article>`, true);
}

function resizeEditor() {
  const root = $('editor').contentDocument?.getElementById('writing');
  if (root) $('editor').style.height = Math.max(440, root.scrollHeight + 50) + 'px';
}

function renderPreview() {
  if (!current) return;
  const article = collect();
  const wordsDoc = new DOMParser().parseFromString(article.body, 'text/html');
  wordsDoc.querySelectorAll('script,style').forEach(node => node.remove());
  const words = (wordsDoc.body.textContent.trim().match(/\S+/g) || []).length;
  $('word-count').textContent = `${words.toLocaleString()} words · ${Math.max(1,Math.ceil(words/200))} min`;
  $('preview').onload = () => {
    const doc = $('preview').contentDocument;
    if (!doc) return;
    preventNavigation(doc);
    try {
      window.renderMathInElement?.(doc.body, {delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false},{left:'\\(',right:'\\)',display:false},{left:'\\[',right:'\\]',display:true}], throwOnError:false, trust:false});
    } catch { /* Original equation text remains readable. */ }
  };
  $('preview').srcdoc = frameHTML(`<header><div class="meta">${escapeHTML(placeLabel(article.category, article.collection))} · ${escapeHTML(article.type)}</div><h1>${escapeHTML(article.title)}</h1>${article.subtitle ? `<p>${escapeHTML(article.subtitle)}</p>` : ''}<p class="summary">${escapeHTML(article.description)}</p><div class="meta">${escapeHTML(article.date)} · ${Math.max(1,Math.ceil(words/200))} min read</div></header><article class="prose" id="writing">${article.body}</article>`, false);
}

async function save(action) {
  if (busy || !current) return;
  if (action !== 'discard' && bodyDirty && protectedBlocks.size) {
    const retained = [...$('editor').contentDocument.querySelectorAll('[data-wr-lock]')].map(node => node.getAttribute('data-wr-lock'));
    if (retained.length !== protectedBlocks.size || [...protectedBlocks.keys()].some(key => !retained.includes(key))) {
      notice('An interactive block was removed or duplicated. Use Undo in the text toolbar to restore it before saving.', true);
      return;
    }
  }
  const article = collect();
  if (!article.title.trim()) {notice('Give this article a title first.',true); $('title').focus(); return;}
  if (action !== 'discard' && !placeIsValid(article.category, article.collection)) {
    notice('Choose the collection this article belongs to, under Article details.', true);
    $('place').closest('details').open = true; $('place').focus(); return;
  }
  if (action === 'apply' && !article.type.trim()) {
    notice('Give this article a type — for example Research article or Collection introduction. The Library classifies by it.', true);
    $('type').closest('details').open = true; $('type').focus(); return;
  }
  if (!/^[a-z0-9][a-z0-9-]{0,119}$/.test(article.id)) {notice('Use lowercase letters, numbers, and hyphens for the article address.',true); $('slug').closest('details').open = true; $('slug').focus(); return;}
  const publishingOnline = !localService;
  if (action === 'apply' && !(await dialog(publishingOnline ? 'Publish this article?' : 'Update your local website?', publishingOnline
    ? '<p>This will publish this version of the article to the website. The previous version will be retained in the Writing Room database.</p>'
    : '<p>This will replace this article on the website stored on your computer. A backup of the website’s article file will be created first.</p><p>Your online website and blog are not changed.</p>', publishingOnline ? 'Publish article' : 'Update local website'))) return;
  if (action === 'discard' && !(await dialog('Discard this draft?', `<p>The saved draft and any unsaved changes to this article will be removed. The article already on your ${publishingOnline ? 'website' : 'local website'} will stay as it is.</p>`, 'Discard draft'))) return;
  setBusy(true);
  try {
    const response = await fetch(apiURL(action), {method:'POST',headers:{'Content-Type':'application/json','X-Writing-Room-Token':state.token},body:JSON.stringify({article,baseRevision,draftVersion})});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'The change could not be saved.');
    state = result;
    dirty = false;
    const next = action === 'discard' && !state.revisions[article.id] ? state.articles[0].id : article.id;
    await choose(next, true);
    notice(action === 'draft'
      ? (publishingOnline ? 'Private draft saved online. Your website is unchanged.' : 'Draft saved on this computer. Your website is unchanged.')
      : action === 'apply'
        ? (publishingOnline ? 'The article is published on your website.' : 'Your local website is up to date.' + (result.backup ? ' A backup was saved before the update.' : ''))
        : 'Draft discarded.');
  } catch (error) {
    notice(error.message + ' Your current writing is still on this page.', true);
  } finally {setBusy(false);}
}

async function createArticle() {
  if (!(await mayLeave())) return;
  const [category, collection] = defaultPlace();
  const article = {id:'new-article-' + Date.now().toString(36),title:'Untitled article',description:'',category,collection,type:'',date:new Date().toISOString().slice(0, 10),body:'<p><br></p>',tone:'forest'};
  // A temporary record is local to this page until Save draft is chosen.
  state.articles.push(article);
  await choose(article.id, true);
  state.articles = state.articles.filter(item => item !== article);
  dirty = true;
  $('save-status').textContent = 'New · not saved';
  $('settings').open = true;
  $('title').focus();
  $('title').select();
}

/* A new article starts in the collection the library is showing, or else in
   the first collection of the first section. It can be changed before saving. */
function defaultPlace() {
  if (libraryPlace !== 'all' && !libraryPlace.startsWith('section:')) {
    const [category, collection = null] = libraryPlace.split('/');
    if (placeIsValid(category, collection)) return [category, collection];
  }
  const sectionId = libraryPlace.startsWith('section:') ? libraryPlace.slice(8) : articleSections()[0]?.id;
  const first = collectionsOf(sectionId)[0];
  return [sectionId || 'research', first ? first.id : null];
}

/* ---------- where an article is filed ------------------------------------- */
function renderPlaces(article) {
  const select = $('place');
  select.replaceChildren();
  const others = document.createElement('optgroup');
  others.label = 'Elsewhere on the website';
  const used = new Set(combinedArticles().map(item => item.category));
  for (const section of articleSections()) {
    const own = collectionsOf(section.id);
    if (own.length) {
      const group = document.createElement('optgroup');
      group.label = section.name;
      own.forEach(collection => group.append(new Option(`${collection.num} ${collection.name}`, `${section.id}/${collection.id}`)));
      select.append(group);
    } else if (!section.hidden || used.has(section.id) || article?.category === section.id) {
      // A hidden section is offered only while something lives in it.
      others.append(new Option(section.hidden ? `${section.name} (hidden)` : section.name, section.id));
    }
  }
  if (others.children.length) select.append(others);
  const wanted = article ? placeOf(article) : '';
  if (![...select.options].some(option => option.value === wanted)) {
    const label = article && !article.category ? 'Choose a collection…' : `${placeLabel(article?.category, article?.collection)} — choose a collection`;
    select.prepend(new Option(label, wanted));
  }
  select.value = wanted;
  renderTypes();
  syncCollectionActions();
}

function renderTypes() {
  const types = [...new Set(combinedArticles().map(item => item.type).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  $('type-options').replaceChildren(...types.map(type => new Option(type)));
}

function currentCollection() {
  const [sectionId, collectionId] = $('place').value.split('/');
  return collectionOf(sectionId, collectionId);
}

function syncCollectionActions() {
  const rename = $('rename-collection');
  if (rename) rename.disabled = busy || staleService || !currentCollection();
}

async function collectionRequest(action, collection) {
  setBusy(true);
  try {
    const response = await fetch(apiURL(action), {method:'POST',headers:{'Content-Type':'application/json','X-Writing-Room-Token':state.token},
      body:JSON.stringify({collection, baseRevision:state.collectionRevision})});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'The collection could not be saved.');
    // The article on the page is untouched: only the library state is replaced.
    state = result;
    return true;
  } catch (error) {
    notice(error.message + ' Your current writing is still on this page.', true);
    return false;
  } finally {setBusy(false);}
}

function refreshPlaces(place) {
  if (current) current = collect();
  if (current && place !== undefined) {
    const [category, collection = null] = place.split('/');
    current.category = category; current.collection = collection;
  }
  renderPlaces(current);
  renderLibraryPlaces();
  $('collection-label').textContent = current ? placeLabel(current.category, current.collection) : '';
  list();
  renderPreview();
}

async function newCollection() {
  if (busy || !state) return;
  const where = localService ? 'your local website' : 'the published website';
  const sectionChoices = articleSections().filter(section => !section.hidden)
    .map(section => `<option value="${escapeHTML(section.id)}"${section.id === (current?.category || 'research') ? ' selected' : ''}>${escapeHTML(section.name)}</option>`).join('');
  const pending = dialog('Create a collection',
    '<label for="collection-name">Name</label><input id="collection-name" maxlength="120" placeholder="e.g. Cosmology">'
    + '<label for="collection-id">Address</label><input id="collection-id" maxlength="80" placeholder="cosmology">'
    + '<label for="collection-description">Description (optional)</label><input id="collection-description" maxlength="600" placeholder="One sentence for the collection’s page">'
    + `<label for="collection-section">Section</label><select id="collection-section">${sectionChoices}</select>`
    + `<p>The collection is added to ${where} straight away, numbered after the section’s last collection, with its own tab on the section’s page and an entry in the Library. Its address cannot be changed later.</p>`,
    'Create collection');
  let addressEdited = false;
  $('collection-id').addEventListener('input', () => {addressEdited = true;});
  $('collection-name').addEventListener('input', () => {if (!addressEdited) $('collection-id').value = slugify($('collection-name').value);});
  $('collection-name').focus();
  if (!(await pending)) return;
  const name = $('collection-name').value.trim();
  const description = $('collection-description').value.trim();
  const section = $('collection-section').value;
  const id = $('collection-id').value.trim() || slugify(name);
  if (!name) {notice('Give the collection a name.', true); return;}
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(id)) {notice('Use lowercase letters, numbers, and hyphens for the collection address.', true); return;}
  if (siteCollections().some(item => item.id === id)) {notice('A collection already uses that address.', true); return;}
  if (!(await collectionRequest('collection-create', {id, name, description, section}))) return;
  refreshPlaces(`${section}/${id}`);
  markDirty();
  notice(`“${name}” is on ${where}. This article is now filed under it — save or update the article to keep that.`);
}

async function renameCollection() {
  if (busy || !state) return;
  const collection = currentCollection();
  if (!collection) return;
  const pending = dialog('Rename this collection',
    `<label for="collection-name">Name</label><input id="collection-name" maxlength="120" value="${escapeHTML(collection.name)}">`
    + `<label for="collection-description">Description</label><input id="collection-description" maxlength="600" value="${escapeHTML(collection.description || '')}">`
    + `<p>Its number (${escapeHTML(collection.num)}) and address stay the same, so existing links keep working, and every article in it moves with it.</p>`,
    'Save collection');
  $('collection-name').focus();
  if (!(await pending)) return;
  const name = $('collection-name').value.trim();
  const description = $('collection-description').value.trim();
  if (!name) {notice('Give the collection a name.', true); return;}
  if (name === collection.name && description === (collection.description || '')) return;
  if (!(await collectionRequest('collection-rename', {id:collection.id, name, description}))) return;
  refreshPlaces();
  notice(`The collection is now called “${name}”.`);
}

/* ---------- the main pages ------------------------------------------------
   The Home page, Research, The Protocol, The Lab, Transmissions, the Library,
   About and the two footer pages. Each page is a set of fields; the service
   knows where every field lives (pages.js, sections.js, collections.js or the
   Protocol's source) and writes it back there. */
/* Only the working parts are locked: controls, live values and generated
   lists, and the pacer's lines that its script rewrites. The surrounding text —
   the pacer's note, the phase descriptions — stays editable. */
const PAGE_PROTECT = '[data-widget],script,style,iframe,object,embed,svg,select,input,textarea,button,.doc-toolbar,.pacer-orb-wrap,.pacer-controls,.pacer-audio,[id^="pacer-"]:not(#pacer-phases),.dose,.lexicon-head,#lexicon-count,#lexicon-grid';

function setMode(next) {
  mode = next;
  const pages = mode === 'pages';
  for (const id of ['mode-articles','mode-pages']) {
    const on = (id === 'mode-pages') === pages;
    $(id).classList.toggle('active', on); $(id).setAttribute('aria-selected', String(on));
  }
  document.querySelectorAll('.articles-only').forEach(node => {node.hidden = pages;});
  $('page-list').hidden = !pages;
  $('article-bar').hidden = pages; $('pages').hidden = pages;
  $('page-bar').hidden = !pages; $('page-editor').hidden = !pages;
  notice('');
  if (pages) {
    renderPageList();
    const wanted = currentPage?.id || localStorage.getItem('wr-last-page') || state?.pages?.[0]?.id;
    if (wanted) openPage(wanted, true);
  }
}

async function switchMode(next) {
  if (next === mode || busy) return;
  if (mode === 'articles' && !(await mayLeave())) return;
  if (mode === 'pages' && !(await mayLeavePage())) return;
  if (mode === 'articles') dirty = false;
  if (mode === 'pages') pageDirty = false;
  setMode(next);
  if (next === 'articles' && current) list();
}

async function mayLeavePage() {
  if (busy) return false;
  if (!pageDirty) return true;
  return dialog('Leave unsaved changes?', '<p>The changes on this page haven’t been put on the website yet. Choose Cancel, then Update local website to keep them.</p>', 'Leave without saving');
}

function renderPageList() {
  const root = $('page-list');
  root.replaceChildren();
  const pages = state?.pages || [];
  if (!pages.length) {
    root.innerHTML = `<p class="empty">${escapeHTML(state?.pagesError || 'The page files could not be read.')}</p>`;
    return;
  }
  for (const page of pages) {
    const button = document.createElement('button');
    button.className = 'article' + (currentPage?.id === page.id ? ' selected' : '');
    button.setAttribute('aria-current', currentPage?.id === page.id ? 'page' : 'false');
    const groups = new Set(page.fields.map(field => field.group)).size;
    button.innerHTML = `<strong>${escapeHTML(page.name)}</strong><small>${page.fields.length} texts · ${groups} ${groups === 1 ? 'part' : 'parts'}</small>`;
    button.onclick = () => openPage(page.id);
    root.append(button);
  }
}

async function openPage(id, force = false) {
  if (!force && !(await mayLeavePage())) return;
  const page = (state.pages || []).find(item => item.id === id);
  if (!page) return;
  currentPage = page;
  pageDirty = false;
  pageEditors = new Map(); pageOriginals = new Map(); pageFocus = null;
  localStorage.setItem('wr-last-page', id);
  $('page-label').textContent = page.name;
  $('page-status').textContent = localService ? 'On your local website' : 'On the website';
  $('page-view').href = state.previewUrl + '/' + page.route;
  renderPageList();
  renderPageFields(page);
  setBusy(false);
}

function renderPageFields(page) {
  const root = $('page-fields');
  root.replaceChildren();
  const groups = [];
  for (const field of page.fields) {
    let group = groups.find(item => item.name === field.group);
    if (!group) groups.push(group = {name: field.group, fields: []});
    group.fields.push(field);
  }
  const richCount = page.fields.filter(field => field.kind === 'rich').length;
  for (const group of groups) {
    const details = document.createElement('details');
    details.className = 'page-group';
    const hasRich = group.fields.some(field => field.kind === 'rich');
    details.open = !hasRich || richCount <= 1;
    details.innerHTML = `<summary>${escapeHTML(group.name)}<span>${group.fields.length} ${group.fields.length === 1 ? 'text' : 'texts'}</span></summary>`;
    const body = document.createElement('div');
    body.className = 'page-group-fields';
    details.append(body);
    const mount = () => {
      if (body.childElementCount) return;
      group.fields.forEach(field => body.append(pageField(field)));
    };
    if (details.open) mount();
    details.addEventListener('toggle', () => {if (details.open) mount();});
    root.append(details);
  }
}

function pageField(field) {
  const wrap = document.createElement('div');
  wrap.className = 'page-field';
  wrap.dataset.kind = field.kind;
  const label = document.createElement('label');
  label.textContent = field.label;
  wrap.append(label);
  if (field.kind === 'plain') {
    const input = document.createElement('input');
    input.type = 'text'; input.value = field.value; input.setAttribute('aria-label', field.label);
    input.addEventListener('input', markPageDirty);
    input.addEventListener('focus', () => {pageFocus = null;});
    pageEditors.set(field.key, {value: () => input.value});
    pageOriginals.set(field.key, field.value);
    wrap.append(input);
  } else if (field.kind === 'rich') {
    const frame = document.createElement('iframe');
    frame.className = 'page-rich';
    frame.title = field.label;
    frame.setAttribute('sandbox', 'allow-same-origin');
    wrap.append(frame);
    pageEditors.set(field.key, richPageEditor(frame, field.value, field.key));
  } else {
    const box = document.createElement('div');
    box.className = 'page-input';
    box.contentEditable = 'true';
    box.setAttribute('role', 'textbox');
    box.setAttribute('aria-label', field.label);
    if (field.kind === 'text') box.setAttribute('aria-multiline', 'true');
    box.innerHTML = field.value;
    // Browsers re-serialise HTML; comparing with that form avoids reporting untouched text as changed.
    pageOriginals.set(field.key, box.innerHTML);
    box.addEventListener('input', markPageDirty);
    box.addEventListener('keydown', event => {
      if (event.key === 'Enter') {event.preventDefault(); document.execCommand('insertLineBreak');}
    });
    box.addEventListener('paste', event => {event.preventDefault(); document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));});
    box.addEventListener('focus', () => {pageFocus = {kind:'inline', box};});
    box.addEventListener('blur', () => {
      const selection = document.getSelection();
      if (selection.rangeCount && box.contains(selection.anchorNode)) pageFocus = {kind:'inline', box, range:selection.getRangeAt(0).cloneRange()};
    });
    pageEditors.set(field.key, {value: () => box.innerHTML.replace(/(?:<br\s*\/?>)+$/i, '')});
    wrap.append(box);
  }
  return wrap;
}

function richPageEditor(frame, html, key) {
  const blocks = new Map();
  let root = null, range = null;
  const editor = {
    value: () => {
      if (!root) return pageOriginals.get(key);
      const copy = root.cloneNode(true);
      copy.querySelectorAll('[data-wr-lock]').forEach(node => {
        const original = blocks.get(node.getAttribute('data-wr-lock'));
        if (original !== undefined) node.outerHTML = original;
      });
      // Buttons that hold writing were opened up for editing; close them again.
      copy.querySelectorAll('[data-wr-tag]').forEach(node => {
        const element = copy.ownerDocument.createElement(node.getAttribute('data-wr-tag'));
        for (const {name, value} of [...node.attributes]) if (name !== 'data-wr-tag') element.setAttribute(name, value);
        element.append(...node.childNodes);
        node.replaceWith(element);
      });
      return copy.innerHTML;
    },
    intact: () => !root || [...root.querySelectorAll('[data-wr-lock]')].length === blocks.size,
    command: (name, value) => {
      if (!root) return;
      const doc = frame.contentDocument;
      root.focus();
      if (range && root.contains(range.commonAncestorContainer)) {const s = doc.getSelection(); s.removeAllRanges(); s.addRange(range);}
      doc.execCommand(name, false, value);
      markPageDirty();
      resize();
    }
  };
  const resize = () => {if (root) frame.style.height = Math.max(160, root.scrollHeight + 40) + 'px';};
  frame.onload = () => {
    const doc = frame.contentDocument;
    root = doc.getElementById('writing');
    if (!root) return;
    // A button that holds writing (the meditation's phase descriptions) cannot
    // be typed into, so it is edited as a plain block and restored on saving.
    root.querySelectorAll('button').forEach(button => {
      if (!button.children.length) return;
      const block = doc.createElement('div');
      for (const {name, value} of [...button.attributes]) block.setAttribute(name, value);
      block.setAttribute('data-wr-tag', 'button');
      block.append(...button.childNodes);
      button.replaceWith(block);
    });
    const candidates = [...root.querySelectorAll(PAGE_PROTECT)];
    for (const node of candidates.filter(node => !candidates.some(parent => parent !== node && parent.contains(node)))) {
      const id = crypto.randomUUID();
      blocks.set(id, node.outerHTML);
      node.setAttribute('data-wr-lock', id);
      node.setAttribute('contenteditable', 'false');
    }
    root.contentEditable = 'true';
    root.setAttribute('role', 'textbox'); root.setAttribute('aria-multiline', 'true'); root.spellcheck = true;
    pageOriginals.set(key, editor.value());
    root.addEventListener('input', () => {markPageDirty(); resize();});
    root.addEventListener('paste', event => {event.preventDefault(); doc.execCommand('insertText', false, event.clipboardData.getData('text/plain'));});
    root.addEventListener('drop', event => event.preventDefault());
    root.addEventListener('focus', () => {pageFocus = {kind:'rich', editor};});
    doc.addEventListener('selectionchange', () => {
      const s = doc.getSelection();
      if (s.rangeCount && root.contains(s.anchorNode)) {range = s.getRangeAt(0).cloneRange(); pageFocus = {kind:'rich', editor};}
    });
    doc.addEventListener('keydown', event => {if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {event.preventDefault(); savePage();}});
    preventNavigation(doc);
    resize();
  };
  pageOriginals.set(key, html);
  frame.srcdoc = frameHTML(`<article id="writing" class="prose">${html}</article>`, true);
  return editor;
}

function markPageDirty() {
  pageDirty = true;
  $('page-status').textContent = 'Unsaved changes';
}

function pageCommand(name, value, block = false) {
  if (!pageFocus) {notice('Click into a text first, then choose the formatting.', true); return;}
  if (pageFocus.kind === 'rich') {pageFocus.editor.command(name, value); return;}
  if (block) {notice('Headings, paragraphs and lists are for the longer texts. Short texts take bold, italic and links.', true); return;}
  const {box, range} = pageFocus;
  box.focus();
  if (range) {const s = document.getSelection(); s.removeAllRanges(); s.addRange(range);}
  document.execCommand(name, false, value);
  markPageDirty();
}

async function savePage() {
  if (busy || !currentPage || staleService) return;
  const values = {};
  for (const [key, editor] of pageEditors) {
    if (editor.intact && !editor.intact()) {notice('An interactive block in one of the texts was removed. Use Undo to restore it before updating.', true); return;}
    const value = editor.value();
    if (value !== pageOriginals.get(key)) values[key] = value;
  }
  if (!Object.keys(values).length) {pageDirty = false; $('page-status').textContent = 'Nothing has changed'; return;}
  const online = !localService;
  const count = Object.keys(values).length;
  if (!(await dialog(online ? 'Publish this page?' : 'Update your local website?',
    `<p>${count} ${count === 1 ? 'text' : 'texts'} on <strong>${escapeHTML(currentPage.name)}</strong> will change${online ? ' on the website' : ' on the website stored on your computer'}. An exact backup of every file involved is kept first.</p>`,
    online ? 'Publish page' : 'Update local website'))) return;
  setBusy(true);
  try {
    const response = await fetch(apiURL('page-save'), {method:'POST', headers:{'Content-Type':'application/json','X-Writing-Room-Token':state.token},
      body: JSON.stringify({page: currentPage.id, values, revisions: state.pageRevisions})});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'The page could not be saved.');
    state = result;
    pageDirty = false;
    await openPage(currentPage.id, true);
    notice(online ? 'The page is updated on the website.' : `Your local website is up to date. ${result.pageBackups?.length ? 'A backup was saved first.' : ''} Refresh the website preview to see it.`);
  } catch (error) {
    notice(error.message + ' Your changes are still on this page.', true);
  } finally {setBusy(false);}
}

function command(name, value) {
  const doc = $('editor').contentDocument;
  const root = doc?.getElementById('writing');
  if (!root) return;
  root.focus();
  if (selectionRange && root.contains(selectionRange.commonAncestorContainer)) {
    const selection = doc.getSelection();
    selection.removeAllRanges();
    selection.addRange(selectionRange);
  }
  doc.execCommand(name, false, value);
  bodyDirty = true;
  markDirty();
  resizeEditor();
}

document.querySelectorAll('[data-command],[data-block]').forEach(button => {
  button.addEventListener('mousedown', event => event.preventDefault());
  button.onclick = () => command(button.dataset.command || 'formatBlock', button.dataset.block);
});
$('link').onclick = async () => {
  if (!(await dialog('Add a link', '<label for="link-url">Select words in your article, then enter a web address.</label><input id="link-url" type="url" placeholder="https://…">', 'Add link'))) return;
  const url = $('link-url').value.trim();
  if (!/^https?:\/\//i.test(url)) {notice('Use a full web address beginning with https:// or http://.',true); return;}
  command('createLink', url);
};
for (const key of ['title','subtitle','description','place','type','date','slug']) $(key).addEventListener('input', () => {
  markDirty();
  const [category, collection] = $('place').value.split('/');
  $('collection-label').textContent = placeLabel(category, collection);
  syncCollectionActions();
  $('details-summary').textContent = $('type').value;
});
$('library-place').addEventListener('change', event => {libraryPlace = event.target.value; list();});
$('save').onclick = () => save('draft');
$('apply').onclick = () => save('apply');
$('discard').onclick = () => save('discard');
$('new').onclick = createArticle;
$('new-collection').onclick = newCollection;
$('rename-collection').onclick = renameCollection;
$('search').oninput = list;
document.querySelectorAll('[data-filter]').forEach(button => button.onclick = () => {
  filter = button.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(item => {item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', String(item === button));});
  list();
});
$('preview-toggle').onclick = () => {
  const hidden = $('pages').classList.toggle('preview-off');
  $('preview-toggle').setAttribute('aria-pressed', String(!hidden));
};
$('theme').onclick = () => {
  // Preserve the current body before rebuilding the editing surface.
  if (current) current = collect();
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('wr-theme', next);
  bodyDirty = false;
  if (current) {renderEditor(); renderPreview();}
};
$('help').onclick = () => dialog('Welcome to your Writing Room', localService
  ? '<p><strong>Save draft</strong> keeps your work privately on this computer. Use Ctrl+S (or ⌘S) as you write. Saving is manual; the page warns before you leave unsaved changes.</p><p><strong>Update local website</strong> puts the article on your local website, with a backup first. Open <strong>View website</strong> to see the full page.</p><p>Text formatting, headings, lists, and links are available above the manuscript. Pasted text arrives without formatting. Equations stay in their $…$ notation while writing and render in the preview. Interactive blocks are preserved.</p><p>Under Article details, Collection says where the article is filed (for Research, one of its collections: Framework, Philosophy…) and Type says what kind of piece it is. The list on the left can show one collection at a time. This local room edits content.js and, when you create or rename a collection, collections.js. The Protocol, the top menu, and the blog remain in their existing editors.</p>'
  : '<p><strong>Save draft</strong> stores your work privately in the Writing Room database. Use Ctrl+S (or ⌘S) as you write. Saving is manual; the page warns before you leave unsaved changes.</p><p><strong>Publish website</strong> updates the public article. Its previous version is retained in the revision history. Open <strong>View website</strong> to see the full page.</p><p>Text formatting, headings, lists, and links are available above the manuscript. Pasted text arrives without formatting. Equations stay in their $…$ notation while writing and render in the preview. Interactive blocks are preserved.</p><p>Collections can be created and renamed from Article details; that changes the published website at once. The Protocol, the top menu, and the blog remain in their existing editors.</p>', 'Got it');
window.addEventListener('beforeunload', event => {if (dirty || pageDirty || busy) {event.preventDefault();event.returnValue = '';}});
$('mode-articles').onclick = () => switchMode('articles');
$('mode-pages').onclick = () => switchMode('pages');
$('page-apply').onclick = savePage;
document.querySelectorAll('[data-pcommand],[data-pblock]').forEach(button => {
  button.addEventListener('mousedown', event => event.preventDefault());
  button.onclick = () => button.dataset.pblock ? pageCommand('formatBlock', button.dataset.pblock, true) : pageCommand(button.dataset.pcommand, undefined, ['insertUnorderedList'].includes(button.dataset.pcommand));
});
$('page-link').onclick = async () => {
  const focus = pageFocus;
  if (!focus) {notice('Select words in a text first, then add the link.', true); return;}
  if (!(await dialog('Add a link', '<label for="link-url">Enter a web address, or a page of this site such as #/library.</label><input id="link-url" type="text" placeholder="https://… or #/…">', 'Add link'))) return;
  const url = $('link-url').value.trim();
  if (!/^(https?:\/\/|#\/)/i.test(url)) {notice('Use a full web address beginning with https://, or a site address beginning with #/.', true); return;}
  pageFocus = focus;
  pageCommand('createLink', url);
};
document.addEventListener('keydown', event => {if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {event.preventDefault(); mode === 'pages' ? savePage() : save('draft');}});
window.addEventListener('resize', resizeEditor);
async function init() {
  if (openFromDisk()) return;
  setBusy(true);
  try {
    const response = await fetch(apiURL('state'), {credentials:'same-origin'});
    if (!localService && response.status === 401) {
      window.location.replace(new URL('../login.php', document.baseURI).href);
      return;
    }
    state = await response.json();
    if (!response.ok) throw new Error(state.error);
    if (!localService) {
      $('apply').textContent = 'Publish website';
      $('save-status').textContent = 'Private online workspace';
    }
    // A page newer than the service behind it cannot file articles correctly.
    staleService = localService && state.roomVersion !== ROOM_VERSION;
    renderLibraryPlaces();
    const last = localStorage.getItem('wr-last-article');
    const id = combinedArticles().some(article => article.id === last) ? last : state.articles[0]?.id;
    if (id) await choose(id, true);
    else {list();$('save-status').textContent = 'Ready for your first article';}
  } catch (error) {notice('Could not open your library. ' + error.message,true);}
  finally {
    setBusy(false);
    if (staleService) notice('The Writing Room running in the background on this computer is an older version, so collections cannot be shown and saving is paused. Close this tab and double-click Start-WritingRoom.cmd in the website folder — it replaces the old one.', true);
  }
}
init();
