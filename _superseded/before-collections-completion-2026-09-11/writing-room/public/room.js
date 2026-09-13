'use strict';
const $ = id => document.getElementById(id);
const clone = value => JSON.parse(JSON.stringify(value));
const escapeHTML = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels = {research:'Research', lab:'The Lab', transmissions:'Transmissions', learning:'Learning · hidden', regenesis:'Regenesis · hidden'};
let state, current, baseRevision, draftVersion, dirty = false, bodyDirty = false, busy = false, filter = 'all';
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
  for (const id of ['save','apply','new','discard']) $(id).disabled = value;
}

function combinedArticles() {
  const items = new Map(state.articles.map(a => [a.id, a]));
  Object.values(state.drafts).forEach(d => items.set(d.article.id, d.article));
  if (current && !items.has(current.id)) items.set(current.id, current);
  return [...items.values()];
}

function list() {
  const query = $('search').value.toLowerCase().trim();
  const items = combinedArticles().filter(a => (filter !== 'drafts' || state.drafts[a.id]) && `${a.title} ${a.description} ${a.category}`.toLowerCase().includes(query));
  $('count').textContent = combinedArticles().length;
  $('draft-count').textContent = Object.keys(state.drafts).length;
  $('articles').replaceChildren();
  for (const article of items) {
    const button = document.createElement('button');
    button.className = 'article' + (current?.id === article.id ? ' selected' : '');
    button.setAttribute('aria-current', current?.id === article.id ? 'page' : 'false');
    button.innerHTML = `<strong>${escapeHTML(article.title || 'Untitled article')}</strong><small>${escapeHTML(labels[article.category] || article.category)}${state.drafts[article.id] ? '<span class="draft-dot">● Draft</span>' : ''}</small>`;
    button.onclick = () => choose(article.id);
    $('articles').append(button);
  }
  if (!items.length) $('articles').innerHTML = '<p class="empty">' + (filter === 'drafts' ? 'No saved drafts yet. A little space for your next idea.' : 'No articles match your search.') + '</p>';
}

function collect() {
  if (!current) return null;
  const article = clone(current);
  for (const key of ['title','description','category','type','date']) article[key] = $(key).value;
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
  if (![...$('category').options].some(option => option.value === current.category)) $('category').add(new Option(current.category, current.category));
  $('category').value = current.category;
  $('slug').value = current.id;
  $('slug').readOnly = !!(state.revisions[id] || draft);
  $('collection-label').textContent = labels[current.category] || current.category;
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
  $('preview').srcdoc = frameHTML(`<header><div class="meta">${escapeHTML(labels[article.category] || article.category)} · ${escapeHTML(article.type)}</div><h1>${escapeHTML(article.title)}</h1>${article.subtitle ? `<p>${escapeHTML(article.subtitle)}</p>` : ''}<p class="summary">${escapeHTML(article.description)}</p><div class="meta">${escapeHTML(article.date)} · ${Math.max(1,Math.ceil(words/200))} min read</div></header><article class="prose" id="writing">${article.body}</article>`, false);
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
  const article = {id:'new-article-' + Date.now().toString(36),title:'Untitled article',description:'',category:'research',type:'Essay',date:new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}),body:'<p><br></p>',tone:'green'};
  // A temporary record is local to this page until Save draft is chosen.
  state.articles.push(article);
  await choose(article.id, true);
  state.articles = state.articles.filter(item => item !== article);
  dirty = true;
  $('save-status').textContent = 'New · not saved';
  $('title').focus();
  $('title').select();
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
for (const key of ['title','subtitle','description','category','type','date','slug']) $(key).addEventListener('input', () => {
  markDirty();
  $('collection-label').textContent = labels[$('category').value] || $('category').value;
  $('details-summary').textContent = $('type').value;
});
$('save').onclick = () => save('draft');
$('apply').onclick = () => save('apply');
$('discard').onclick = () => save('discard');
$('new').onclick = createArticle;
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
  ? '<p><strong>Save draft</strong> keeps your work privately on this computer. Use Ctrl+S (or ⌘S) as you write. Saving is manual; the page warns before you leave unsaved changes.</p><p><strong>Update local website</strong> puts the article on your local website, with a backup first. Open <strong>View website</strong> to see the full page.</p><p>Text formatting, headings, lists, and links are available above the manuscript. Pasted text arrives without formatting. Equations stay in their $…$ notation while writing and render in the preview. Interactive blocks are preserved.</p><p>This local room edits content.js. The Protocol, site navigation, and blog remain in their existing editors.</p>'
  : '<p><strong>Save draft</strong> stores your work privately in the Writing Room database. Use Ctrl+S (or ⌘S) as you write. Saving is manual; the page warns before you leave unsaved changes.</p><p><strong>Publish website</strong> updates the public article. Its previous version is retained in the revision history. Open <strong>View website</strong> to see the full page.</p><p>Text formatting, headings, lists, and links are available above the manuscript. Pasted text arrives without formatting. Equations stay in their $…$ notation while writing and render in the preview. Interactive blocks are preserved.</p><p>The Protocol, site navigation, and blog remain in their existing editors.</p>', 'Got it');
window.addEventListener('beforeunload', event => {if (dirty || busy) {event.preventDefault();event.returnValue = '';}});
document.addEventListener('keydown', event => {if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {event.preventDefault();save('draft');}});
window.addEventListener('resize', resizeEditor);
async function init() {
  if (openFromDisk()) return;
  setBusy(true);
  try {
    const response = await fetch(apiURL('state'), {credentials:'same-origin'});
    state = await response.json();
    if (!response.ok) throw new Error(state.error);
    if (!localService) {
      $('apply').textContent = 'Publish website';
      $('save-status').textContent = 'Private online workspace';
    }
    const last = localStorage.getItem('wr-last-article');
    const id = combinedArticles().some(article => article.id === last) ? last : state.articles[0]?.id;
    if (id) await choose(id, true);
    else {list();$('save-status').textContent = 'Ready for your first article';}
  } catch (error) {notice('Could not open your library. ' + error.message,true);}
  finally {setBusy(false);}
}
init();
