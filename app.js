/* ==========================================================================
   Science Coherence — application script
   Dependency-free. Hash-routed so the site works from any static host or
   straight from the file system. Content comes from content.js (articles)
   and documents.js (interactive documents built by tools/build-documents.py).
   ========================================================================== */
(() => {
  'use strict';

  /* ---------- helpers ---------------------------------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const main = $('#main');
  const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const stripTags = s => String(s).replace(/<[^>]+>/g, ' ').replace(/\$\$[^$]*\$\$|\$[^$]*\$/g, ' ').replace(/\s+/g, ' ').trim();
  const fmtDate = s => new Date(s + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const store = {
    get(key, fallback) { try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
  };

  /* ---------- content ---------------------------------------------------- */
  const ARTICLES = (window.SC_CONTENT || []).map(a => ({ ...a, kind: 'article' }));
  const DOCUMENTS = (window.SC_DOCUMENTS || []).map(d => ({ ...d, kind: 'document' }));
  const ALL = [...ARTICLES, ...DOCUMENTS];
  const byId = id => ALL.find(x => x.id === id);
  // The protocol lives at its own top-level route; everything else is a reader page.
  const link = id => (window.SC_DOCUMENTS || []).some(d => d.id === id) ? '#/protocol' : '#/read/' + id;
  const newest = (a, b) => b.date.localeCompare(a.date);

  const collections = [
    { id: 'research', name: 'Research & frameworks', short: 'Research', num: '01', symbol: 'orbit', description: 'The architecture itself: the loop, its operations, and what survives them.', intro: 'Imagination is the first operation, not a preliminary to the real one. What follows gives it definitions, and the conditions under which it would not hold.', label: 'Models · questions · failure conditions', green: true },
    { id: 'regenesis', name: 'Regenesis', short: 'Regenesis', num: '02', symbol: 'leaf', description: 'Regeneration, biology, and what it means to restore organization.', intro: 'The inquiry into aging, regeneration, and the organization of living systems — where the loop meets tissue.', label: 'Biology · organization · renewal' },
    { id: 'ethos', name: 'The Ethos of Being', short: 'The Ethos', num: '03', symbol: 'sun', description: 'The philosophical foundation. Being, perception, and our relationship with reality.', intro: 'Questions about being, consciousness, and the world we participate in creating.', label: 'Philosophy · consciousness · meaning' },
    // Hidden for now: the collection and its pieces stay, but nothing lists them.
    { id: 'transmissions', name: 'Transmissions', short: 'Transmissions', num: '04', symbol: 'wave', hidden: true, description: 'From a spoken moment to the written page. Personal, direct, and still unfolding.', intro: 'Voice-originated writing. Reflections on being here, becoming honest, and listening closely.', label: 'Voice · testimony · reflections', green: true },
    { id: 'lab', name: 'The Lab', short: 'The Lab', num: '05', symbol: 'nodes', description: 'Experimental articles: propositions taken out of argument and run.', intro: 'Where a proposition stops being argued and starts being run — with what is varied, what is watched, and what would count as failure stated up front.', label: 'Experiments · observations · failure conditions' },
    { id: 'learning', name: 'Learning in public', short: 'Learning', num: '06', symbol: 'steps', description: 'The practice of learning to build. Notes, roadmaps, and work in progress.', intro: 'From programming foundations to working AI applications. A place to document the practice.', label: 'AI engineering · notes · roadmaps' },
    // Standalone: the protocol has its own page rather than sitting inside a collection.
    { id: 'protocol', name: 'The Protocol', short: 'Protocol', num: '07', symbol: 'lattice', standalone: true, description: 'The operating document: the recursion carried down to the body.', intro: 'The recursion, run.', label: 'Operating document' }
  ];
  const category = id => collections.find(c => c.id === id);
  const inCollection = id => ALL.filter(x => x.category === id).sort(newest);
  // Hidden collections stay reachable by direct URL but appear in no listing.
  const isHidden = x => !!category(x.category)?.hidden;
  const listed = () => ALL.filter(x => !isHidden(x));
  const pluralize = (n, one, many) => n + ' ' + (n === 1 ? one : many);

  /* ---------- artwork ---------------------------------------------------- */
  function symbol(kind, large = false) {
    let shape = '';
    if (kind === 'orbit') shape = '<ellipse cx="50" cy="50" rx="22" ry="42"/><ellipse cx="50" cy="50" rx="22" ry="42" transform="rotate(60 50 50)"/><ellipse cx="50" cy="50" rx="22" ry="42" transform="rotate(120 50 50)"/><circle cx="50" cy="50" r="3" fill="currentColor"/>';
    if (kind === 'leaf') shape = '<path d="M50 90V15M50 72C12 75 10 40 15 30c25 2 36 19 35 42ZM50 54c33 1 38-25 34-38-24 3-34 17-34 38ZM50 37C32 37 28 20 31 9c15 2 20 12 19 28Z"/><path d="m50 72-30-35m30 17 29-31"/>';
    if (kind === 'sun') shape = '<circle cx="50" cy="50" r="20"/><circle cx="50" cy="50" r="30"/>' + Array.from({ length: 20 }, (_, i) => `<path d="M50 8v7" transform="rotate(${i * 18} 50 50)"/>`).join('');
    if (kind === 'wave') shape = Array.from({ length: 7 }, (_, i) => `<path d="M10 ${23 + i * 9}C30 ${i * 9 + 3} 35 ${i * 9 + 43} 50 ${i * 9 + 23}S75 ${i * 9 + 3} 90 ${i * 9 + 23}"/>`).join('');
    if (kind === 'nodes') shape = '<path d="m20 25 60 0-30 53ZM20 25l60 50M80 25 20 75M20 75h60M50 12v66"/>' + [[20, 25], [80, 25], [50, 78], [20, 75], [80, 75], [50, 12], [50, 50]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="var(--paper)"/>`).join('');
    if (kind === 'steps') shape = '<path d="M12 85h76M20 85V65h18V45h18V25h18V8M15 48 72 12M59 12h13v13"/>';
    if (kind === 'lattice') return latticeArt();
    return `<svg class="${large ? '' : 'collection-icon'}" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="${large ? .65 : 1.2}" aria-hidden="true">${shape}</svg>`;
  }
  const art = kind => symbol(kind, true);

  function livingArt() {
    const rings = Array.from({ length: 25 }, (_, i) => `<ellipse cx="270" cy="264" rx="${28 + i * 5.9}" ry="${124 + i * 3.5}" transform="rotate(${i * 7.2} 270 264)" stroke="${i % 4 === 0 ? '#deebbd' : '#8fae78'}" opacity="${.18 + i * .019}"/>`).join('');
    const seeds = Array.from({ length: 130 }, (_, i) => { const a = i * 2.39996323, r = 4.5 * Math.sqrt(i); return `<circle cx="${270 + r * Math.cos(a)}" cy="${264 + r * Math.sin(a)}" r="${1.1 + i / 150}" fill="#d3e8a8" opacity="${.3 + i / 230}"/>`; }).join('');
    return `<svg viewBox="0 0 540 540" fill="none" aria-hidden="true"><defs><radialGradient id="glow"><stop stop-color="#9ab967" stop-opacity=".16"/><stop offset="1" stop-color="#9ab967" stop-opacity="0"/></radialGradient></defs><circle cx="270" cy="264" r="260" fill="url(#glow)"/><g stroke="#749a72" opacity=".25"><path d="M0 264h540M270 0v540"/><circle cx="270" cy="264" r="234" stroke-dasharray="2 6"/><circle cx="270" cy="264" r="210"/><path d="M55 49 485 479M55 479 485 49" stroke-dasharray="2 6"/></g><g stroke-width=".65">${rings}</g>${seeds}<g stroke="#dae6b5" stroke-width="1"><path d="M270 22v12m-6-6h12M270 494v12m-6-6h12M28 258v12m-6-6h12M511 258v12m-6-6h12"/></g><circle cx="270" cy="264" r="4" fill="#f0efc6"/></svg>`;
  }

  /* A hexagonal lattice (structured water) threaded by a double helix (chromatin). */
  function latticeArt() {
    const hex = (cx, cy, r) => Array.from({ length: 6 }, (_, i) => { const a = Math.PI / 3 * i + Math.PI / 6; return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`; }).join(' ');
    let cells = '';
    const r = 13, w = r * Math.sqrt(3), h = r * 1.5;
    for (let row = -6; row <= 6; row++) for (let col = -6; col <= 6; col++) {
      const cx = 150 + col * w + (row % 2 ? w / 2 : 0), cy = 150 + row * h;
      const d = Math.hypot(cx - 150, cy - 150); if (d > 128) continue;
      cells += `<polygon points="${hex(cx, cy, r - 1)}" opacity="${(.12 + (1 - d / 128) * .35).toFixed(2)}"/>`;
    }
    const strand = phase => { let d = ''; for (let t = 0; t <= 60; t++) { const y = 20 + t * (260 / 60), x = 150 + 52 * Math.sin(t / 60 * Math.PI * 3 + phase); d += (t ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); } return d; };
    let rungs = '';
    for (let t = 2; t < 60; t += 4) { const y = 20 + t * (260 / 60), s = Math.sin(t / 60 * Math.PI * 3); rungs += `<path d="M${(150 + 52 * s).toFixed(1)} ${y.toFixed(1)}L${(150 - 52 * s).toFixed(1)} ${y.toFixed(1)}" opacity=".55"/>`; }
    return `<svg viewBox="0 0 300 300" fill="none" stroke="currentColor" aria-hidden="true"><g stroke-width=".7">${cells}</g><circle cx="150" cy="150" r="128" stroke-dasharray="2 5" opacity=".5"/><g stroke-width="1.4"><path d="${strand(0)}"/><path d="${strand(Math.PI)}" opacity=".7"/></g><g stroke-width="1">${rungs}</g><path d="M150 6v10M150 284v10M6 150h10M284 150h10" stroke-width="1"/></svg>`;
  }

  /* ---------- reading list ---------------------------------------------- */
  const saved = () => store.get('sc-reading-list', []).filter(x => typeof x === 'string');
  function toggleSaved(id) {
    const list = saved(), exists = list.includes(id);
    const next = exists ? list.filter(x => x !== id) : [...list, id];
    const ok = store.set('sc-reading-list', next);
    if (!ok) { toast('Your browser could not save this reading list.'); return exists; }
    toast(exists ? 'Removed from your reading list.' : 'Saved in this browser.');
    return !exists;
  }
  const saveButton = id => `<button id="save-article" data-id="${id}" aria-pressed="${saved().includes(id)}">${saved().includes(id) ? '✓ Saved to reading list' : '+ Save for later'}</button>`;

  /* ---------- shared fragments ------------------------------------------ */
  const typeLine = a => `${a.type}${a.kind === 'document' ? ' · v' + a.version : ''} · ${a.minutes} min`;
  function row(a, n) {
    return `<a class="entry-row" href="${link(a.id)}"><span class="entry-number">${String(n + 1).padStart(2, '0')}</span><div><h3>${a.title}${a.kind === 'document' ? '<span class="badge doc">Interactive</span>' : ''}</h3><p>${a.description}</p><div class="article-meta"><span>${typeLine(a)}</span><span>${fmtDate(a.date)}</span></div></div><span aria-hidden="true">↗</span></a>`;
  }
  function card(a) {
    return `<a class="article-card" href="${link(a.id)}"><div class="article-art ${a.tone}">${art(a.kind === 'document' ? 'lattice' : category(a.category).symbol)}</div><div class="article-meta"><span>${a.type}</span><span>${a.minutes} min read</span></div><h3>${a.title}</h3><p>${a.description}</p><div class="article-bottom"><span>${fmtDate(a.date)}</span><span aria-hidden="true">Read the piece ↗</span></div></a>`;
  }
  function collectionCards() {
    return `<div class="collection-grid">${collections.filter(c => !c.standalone && !c.hidden).map(c => {
      const n = inCollection(c.id).length;
      return `<a href="#/${c.id}" class="collection-card"><div class="collection-top"><span>${c.num} / COLLECTION</span>${symbol(c.symbol)}</div><h3>${c.name}</h3><p>${c.description}</p><div class="collection-foot"><span>${c.label.split(' · ')[0]} / ${pluralize(n, 'piece', 'pieces')}</span><span class="arrow" aria-hidden="true">↗</span></div></a>`;
    }).join('')}</div>`;
  }
  const pathBanner = (title, text, href, cta) => `<div class="path-banner"><div><h3>${title}</h3><p>${text}</p></div><a class="button" href="${href}">${cta} <span>↗</span></a></div>`;
  const pageHero = (eyebrow, title, desc, green = false) => `<section class="page-hero ${green ? 'green' : ''}"><div class="wrap"><div class="breadcrumb"><a href="#/">Home</a> / ${eyebrow}</div><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p class="lede">${desc}</p></div></section>`;

  /* ---------- pages ------------------------------------------------------ */
  function home() {
    const doc = DOCUMENTS[0];
    const latest = listed().filter(a => a.category !== 'protocol').sort(newest).slice(0, 3);
    return `<section class="hero"><div class="wrap"><div class="hero-top"><span class="eyebrow">Coherence. Recursion. What holds.</span><span class="edition">FIELD NOTES / VOL. 01 — 2026</span></div><div class="hero-layout"><div class="hero-copy"><h1>Nothing is<br><em>observed</em> from<br>outside.</h1><p>There is no vantage point beyond the process. What is real is what survives the loop — selected, integrated, and fed back into the conditions that produced it. This is that inquiry, and the work it has become.</p><div class="hero-links"><a class="button primary" href="${link('ethos-of-being')}">Begin with the Ethos <span>↗</span></a><a class="text-link" href="${link('start-here')}">A place to begin <span>→</span></a></div></div><div class="hero-art">${livingArt()}<span class="art-label one">Fig. 01 / Patterns of becoming</span><span class="art-label two">From one, a living whole.</span></div></div><div class="hero-bottom"><span>A living body of work by Dr. William Conroy</span><span>∇Φ ⟶ Λ ⟶ Ω ⟶ ∆</span><a href="#/library">Open the library ↓</a></div></div></section>
    <div class="wrap">
      <div class="intro-line"><span class="eyebrow">The thread that connects it</span><p>What if understanding ourselves and understanding the world are not two inquiries, but one loop closing?</p></div>
      <section class="section"><div class="section-head"><div><span class="eyebrow">Six ways into the work</span><h2>A whole, in many parts.</h2></div><a class="text-link" href="#/library">View the library <span>↗</span></a></div>${collectionCards()}</section>
      ${doc ? `<section class="section" style="padding-bottom:0"><div class="feature document"><div class="feature-art">${latticeArt()}<span class="diagram-caption">FIG. 02 — THE GENOME · WATER · CONSCIOUSNESS AXIS</span></div><div class="feature-copy"><span class="eyebrow">The operating document</span><h2>${doc.title}.</h2><p>The loop carried down to the body: entropy reversal across the chromatin–water matrix, a three-tier daily protocol, and a mind-recoding engine that treats the observer as the boundary operator it is.</p><div class="fact-strip">${doc.facts.map(f => `<div><b>${f.value}</b><span>${f.label}</span></div>`).join('')}</div><div class="feature-meta">Version ${doc.version} · ${doc.sections.length} sections · ${doc.minutes} min · interactive</div><a class="button dark" href="#/protocol">Open the protocol <span>↗</span></a></div></div></section>` : ''}
      <section class="section"><div class="section-head"><div><span class="eyebrow">Recent work</span><h2>Where the loop is running.</h2></div><a class="text-link" href="#/library">The complete library <span>↗</span></a></div><div class="article-grid">${latest.map(card).join('')}</div></section>
      <section class="manifesto"><span class="eyebrow">The philosophical foundation</span><div><blockquote>Being. Perceiving.<br>Participating in what becomes.</blockquote><p class="signature">THE ETHOS OF BEING / A PHILOSOPHICAL INQUIRY</p><a href="${link('ethos-of-being')}" class="text-link">Read The Ethos of Being <span>↗</span></a></div></section>
      ${pathBanner('Follow your curiosity.', 'Search across the framework, the protocol, the experiments and the notes.', '#/library', 'Open the library')}
      <div style="height:70px"></div>
    </div>`;
  }

  function collectionPage(c) {
    const items = inCollection(c.id);
    const others = collections.filter(x => x.id !== c.id && !x.hidden && !x.standalone).slice(0, 3);
    // The Ethos opens on the architecture the rest of the work runs on.
    const opener = c.id === 'ethos' ? ethosOpener() : '';
    return pageHero(c.short, c.name + '.', c.intro, !!c.green) + opener + `<div class="wrap"><div class="category-layout"><aside class="side-note"><h3>Inside this collection</h3><p>${c.description}</p><p>${c.label}</p><h3 style="margin-top:28px">Connected paths</h3>${others.map(x => `<a href="#/${x.id}">${x.name} ↗</a>`).join('')}</aside><div>${items.length ? items.map(row).join('') : '<div class="empty"><h3>Nothing here yet.</h3><p>This collection is still being written.</p></div>'}${c.id === 'regenesis' ? `<a class="entry-row" href="#/protocol"><span class="entry-number">↗</span><div><h3>The protocol this leads to</h3><p>The operating document: the three-tier daily protocol, the epigenetic architecture behind it, and the diagnostic suite that reads it back.</p><span class="article-meta">Connected · operating document</span></div><span>↗</span></a>` : ''}</div></div></div>`;
  }

  function ethosOpener() {
    const a = byId('time-crystalline-v2');
    if (!a) return '';
    return `<div class="wrap" style="padding-top:56px"><section class="feature"><div class="feature-art">${art('orbit')}<span class="diagram-caption">FIG. 01 — FOUR OPERATIONS, TWO CLOSURES</span></div><div class="feature-copy"><span class="eyebrow">The architecture</span><h2>A living architecture<br>of coherence.</h2><p>Difference, selection, realization, integration — and the two closures that make the chain self-actualizing. The framework the rest of the work runs on.</p><div class="feature-meta">${a.type} · ${a.minutes} min read</div><a class="button dark" href="${link(a.id)}">Enter the framework <span>↗</span></a></div></section></div>`;
  }

  function lab() {
    const items = inCollection('lab');
    return pageHero('The Lab', 'Experiments,<br>made inspectable.', 'Where a proposition stops being argued and starts being run. Each experiment states what is being varied, what is being watched, and what would count as it not working.', true) + `<div class="wrap section">
      <div class="section-head"><div><span class="eyebrow">The experimental record</span><h2>Run it and see.</h2></div></div>
      ${items.length ? items.map(row).join('') : `<div class="empty"><h3>The record is open.</h3><p>Experiments will be posted here as they are run.</p><a class="button dark" href="${link('time-crystalline-v2')}">Read the framework ↗</a></div>`}
      <div class="card-grid cols-3" style="margin-top:44px">
        <div class="card" data-accent="teal"><h3 class="card-kicker">What an experiment states</h3><p>The variation being introduced, at what scale, over what interval — precisely enough that it could come out otherwise.</p></div>
        <div class="card" data-accent="blue"><h3 class="card-kicker">What is watched</h3><p>Chart stationarity, recovery rate, phase relation across scales, and whether the structure holds on contact.</p></div>
        <div class="card" data-accent="rose"><h3 class="card-kicker">What is recorded</h3><p>What dissolved, and where. A record of only the survivals is a summary with the informative half discarded.</p></div>
      </div>
      ${pathBanner('The method behind the experiments.', 'What testing means once validity is settled by survival rather than by verdict.', link('research-method'), 'Read the method')}
    </div>`;
  }

  /* library */
  const libraryState = { filter: 'all', query: '', sort: 'newest' };
  function library() {
    return pageHero('Library', 'A place for every thread.', 'Frameworks, the operating document, experiments and notes. Browse by collection or search the full text.') + `<div class="wrap"><div class="library-controls"><input class="library-search" id="library-query" aria-label="Search library" type="search" placeholder="Search titles, ideas, or the full text…" autocomplete="off"><select id="library-sort" class="sort" aria-label="Sort library"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option><option value="length">Longest first</option></select><a class="reading-list-link" href="#/reading-list">Reading list <span id="saved-count">(${saved().length})</span></a></div><div class="filters" role="group" aria-label="Filter by collection"><button class="filter active" data-filter="all" aria-pressed="true">Everything</button>${collections.filter(c => !c.hidden).map(c => `<button class="filter" data-filter="${c.id}" aria-pressed="false">${c.short}</button>`).join('')}<button class="filter" data-filter="documents" aria-pressed="false">Documents</button></div><div class="result-count" id="result-count" aria-live="polite"></div><div class="library-list" id="library-list"></div></div>`;
  }
  function updateLibrary() {
    const q = libraryState.query.toLowerCase().trim();
    let items = listed().filter(a => (libraryState.filter === 'all' || (libraryState.filter === 'documents' ? a.kind === 'document' : a.category === libraryState.filter)) && (!q || a.search.includes(q)));
    const sorts = { title: (a, b) => a.title.localeCompare(b.title), oldest: (a, b) => a.date.localeCompare(b.date), length: (a, b) => b.minutes - a.minutes, newest };
    items.sort(sorts[libraryState.sort] || newest);
    const where = libraryState.filter === 'all' ? ' across all collections' : libraryState.filter === 'documents' ? ' among interactive documents' : ' in ' + category(libraryState.filter).name;
    $('#result-count').textContent = pluralize(items.length, 'piece', 'pieces') + where;
    $('#library-list').innerHTML = items.length ? items.map(row).join('') : `<div class="empty"><h3>No matching pieces.</h3><p>Try another word or choose a different collection.</p><button class="button" id="clear-filters">Clear search and filters ↗</button></div>`;
    $('#clear-filters')?.addEventListener('click', () => { libraryState.query = ''; $('#library-query').value = ''; setFilter('all'); });
  }
  function setFilter(id) {
    libraryState.filter = id;
    $$('[data-filter]').forEach(b => { const on = b.dataset.filter === id; b.classList.toggle('active', on); b.setAttribute('aria-pressed', on); });
    updateLibrary();
  }

  function readingList() {
    const ids = saved(), items = ALL.filter(a => ids.includes(a.id));
    return pageHero('Reading list', 'Keep a thought for later.', 'Your saved pieces stay in this browser. No account needed.') + `<div class="wrap section">${items.length ? items.map(row).join('') : `<div class="empty"><h3>Your reading list is open.</h3><p>Use “Save for later” on any piece to find it here.</p><a class="button dark" href="#/library">Find something to read ↗</a></div>`}</div>`;
  }

  function about() {
    return pageHero('About', 'The person.<br>The questions. The work.', 'Science Coherence is an independent body of work by Dr. William Conroy, developed from a single premise: that there is no position outside the process from which the process can be judged.') + `<div class="wrap section category-layout"><div class="side-note" style="color:var(--acc-green)">${art('leaf')}<p style="margin-top:20px;font-family:var(--mono);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase">Growing through the questions.</p></div><div class="prose">
      <h2>There is a thread<br>through all of it.</h2>
      <p>The work moves between scales: the personal and the theoretical, the spoken moment and the formal model, an intuition and a piece of code. What connects them is not subject matter. It is the claim that these are the same operation performed at different depths — difference, selection, realisation, integration — and that a body, a thought and a world are all instances of the same loop holding its shape.</p>
      <p>Science Coherence gives those strands a shared home. <a href="${link('ethos-of-being')}">The Ethos of Being</a> sets out the architecture. The frameworks carry it into specific territory. Regenesis asks what it means where the loop meets tissue. <a href="#/protocol">The protocol</a> is that question answered in practice, on one body, daily. <a href="#/lab">The Lab</a> is the experimental record — where a proposition is run rather than argued.</p>
      <p>The intention is to make the connections visible while letting each form of work speak in its own voice.</p>
      <h3>Imagination opens the question.</h3>
      <p>Imagination is the first operation, not a preliminary to the real one. What is imagined is already inside the recursion; the only question is whether it survives being run.</p>
      <h3>Coherence decides.</h3>
      <p>Not agreement, and not endorsement. Alignment that holds on contact — with a body, with a rhythm, with another account. What cannot hold on contact dissolves, whoever is holding it.</p>
      <h3>The work remains revisable.</h3>
      <p>Definitions, arguments, code and conclusions all stay open. A structure that could not be contradicted would not be strong; it would be untested.</p>
      <p style="margin-top:32px"><a class="button dark" href="${link('start-here')}">Find your way into the work ↗</a></p>
    </div></div>`;
  }

  function principles() {
    return pageHero('Editorial principles', 'What is kept,<br>and what dissolves.', 'How the different kinds of work in this library are held, now that validity is settled inside the loop rather than outside it.') + `<div class="wrap section"><article class="prose" style="max-width:760px">
      <h2>Where validity lives</h2>
      <p>This library no longer sorts its contents by how much external certification they carry. That scheme assumed a vantage point outside the process from which claims could be ruled on, and no such vantage point exists — the assessor is produced by the same recursion as the thing assessed.</p>
      <p>What replaces it is selection. A structure is held here to the degree that it survives repeated cycles without contradiction accumulating in it: run, integrated, and met with everything else already realised. This is a stricter filter than periodic verification, not a looser one, because it never stops running and issues no certificates.</p>
      <h2>The consequence for a reader</h2>
      <p>Nothing on this site asks to be taken on authority, and nothing is warranted by having once passed a check. Each piece states what it proposes, at what scale, and under what conditions it would fail. Those failure conditions are the load-bearing part. A document that cannot say what would count against it has not survived selection — it has evaded it, and belongs nowhere in this library.</p>
      <h2>Personal writing</h2>
      <p>Transmissions preserve the register they arrived in: spoken, immediate, unrevised in substance. They are integrations recorded close to the moment of integrating, and they are not restated afterwards to look steadier than they were. Where a transmission and a framework disagree, the disagreement is left standing. It is information about the loop.</p>
      <h2>Frameworks</h2>
      <p>A framework sets out an architecture and the conditions under which the architecture would not hold. It is versioned, and a new version supersedes the last rather than sitting beside it — the earlier source is preserved, but where the two disagree the current one is current. Notation carries definitions; a symbol used for two things in one document is a defect regardless of how formal it looks.</p>
      <h2>Operating documents</h2>
      <p>An operating document records something actually run, written from inside the configuration running it. It is an architecture, not an instruction: what holds in one integrator does not transpose to another, whose thresholds, history and existing constraints are different. Cadences, compounds and couplings are reported as they are, including the couplings that are dangerous — the isolation rules exist because the failure modes are physical and fast.</p>
      <h2>Software</h2>
      <p>Code is the case where the loop can be inspected directly: state, update rule, observable behaviour. A repository link identifies work that can be read and run. It does not assert that the software implements the framework, and its capabilities are established by running it.</p>
      <h2>Revision</h2>
      <p>Everything here is revisable, and revision is the ordinary case rather than an admission. Substantive corrections belong in a dated version of the affected piece, so that a changed argument stays distinguishable from a change in presentation. What did not survive is kept in the record; a library of only survivals is a summary with the informative half discarded.</p>
    </article></div>`;
  }

  function privacy() {
    return pageHero('Privacy & accessibility', 'A quieter place to read.', 'The site works without an account, advertising, or an analytics service.') + `<div class="wrap section"><article class="prose" style="max-width:760px"><h2>Your reading list and theme</h2><p>Saved article identifiers and your light/dark preference are stored in this browser’s local storage. They are not sent to a server. You can remove a saved item with the same button on its page, or clear this site’s storage in your browser settings.</p><h2>External services</h2><p>There are none. Typefaces, the mathematical typesetter (KaTeX), and every script are served from this site itself, so loading a page contacts no third party. GitHub opens only when you follow a link. Hosting providers may keep their own access logs.</p><h2>Reading and navigation</h2><p>The site supports keyboard navigation, visible focus states, a skip link, reduced-motion preferences, light and dark themes, responsive layouts, and a print stylesheet. Search can be opened with the slash key and closed with Escape. The document timer plays sound only after you press start, and only if the audio option is enabled.</p><h2>Publishing model</h2><p>This edition is a public reading website. There are no accounts, comments, uploads, or forms collecting personal information.</p></article></div>`;
  }

  const notFound = () => `<div class="wrap error-page"><span class="eyebrow">A path still unwritten</span><h1>Not here, yet.</h1><p>This page could not be found. The library is a good place to begin again.</p><a class="button dark" href="#/library">Back to the library ↗</a></div>`;

  /* ---------- reader (articles) ----------------------------------------- */
  function prepareArticle(a) {
    const holder = document.createElement('div');
    holder.innerHTML = a.body;
    const headings = $$('h2', holder);
    headings.forEach((h, i) => { h.id = 'section-' + (i + 1); });
    const toc = headings.length > 2 ? headings.map(h => `<a href="#/read/${a.id}/${h.id}" data-target="${h.id}">${escapeHTML(h.textContent)}</a>`).join('') : '';
    return { body: holder.innerHTML, toc };
  }
  function neighbours(a) {
    const list = inCollection(a.category).sort((x, y) => x.date.localeCompare(y.date));
    const i = list.findIndex(x => x.id === a.id);
    return { prev: list[i - 1], next: list[i + 1] };
  }
  function related(a) {
    const same = inCollection(a.category).filter(x => x.id !== a.id && !isHidden(x)).slice(0, 3);
    return same.length ? same : listed().filter(x => x.id !== a.id).sort(newest).slice(0, 3);
  }
  const readerTools = a => `<div class="reader-tools">${saveButton(a.id)}<button id="print-article">Print / save PDF</button><button id="copy-link">Copy link</button>${a.download ? `<a href="${a.download}" download>Download source ↓</a>` : ''}</div>`;
  const readerFoot = a => {
    const { prev, next } = neighbours(a);
    return `<div class="wrap reader-foot"><div class="pager">${prev ? `<a class="prev" href="${link(prev.id)}"><span>← Earlier in ${category(a.category).short}</span><strong>${prev.title}</strong></a>` : '<div></div>'}${next ? `<a class="next" href="${link(next.id)}"><span>Later in ${category(a.category).short} →</span><strong>${next.title}</strong></a>` : '<div></div>'}</div><div class="related"><h3>Keep following the thread</h3>${related(a).map(row).join('')}</div>${pathBanner('Back to the collection.', `Discover another piece in ${category(a.category).name}.`, '#/' + a.category, 'Open ' + category(a.category).short)}</div>`;
  };

  function readArticle(a) {
    const prepared = prepareArticle(a);
    return `<div class="reading-progress" id="reading-progress"></div><div class="wrap"><a class="back-link" href="#/${a.category}">← ${category(a.category).name}</a><header class="reader-head"><span class="eyebrow">${a.type}</span><h1>${a.title}</h1>${a.subtitle ? `<p class="reader-subtitle">${a.subtitle}</p>` : ''}<p class="lede">${a.description}</p><div class="reader-meta">Dr. William Conroy · ${fmtDate(a.date)} · ${a.minutes} min read · ${a.words ? a.words.toLocaleString('en-GB') + ' words' : ''}</div>${readerTools(a)}</header><div class="reader-layout ${prepared.toc ? '' : 'no-toc'}">${prepared.toc ? `<aside class="reader-side"><h3>On this page</h3><nav aria-label="Article sections" id="side-toc">${prepared.toc}</nav></aside>` : ''}<div class="reader-body">${a.note ? `<aside class="reader-note">${a.note}</aside>` : ''}${prepared.toc ? `<details class="article-toc"><summary>On this page</summary><nav aria-label="Article sections">${prepared.toc}</nav></details>` : ''}<article class="prose">${prepared.body}</article></div></div></div>${readerFoot(a)}`;
  }

  /* ---------- document register ----------------------------------------- */
  let activeDoc = null;      // { doc, sectionId }
  const cleanups = [];       // functions run before leaving a page

  function readDocument(doc, sectionId) {
    const secs = doc.sections;
    const current = secs.find(s => s.id === sectionId) || secs[0];
    const nav = `<div class="doc-nav-wrap"><div class="wrap"><div class="doc-nav" role="tablist" aria-label="Document sections" id="doc-nav">${secs.map(s => `<button role="tab" id="tab-${s.id}" data-section="${s.id}" aria-selected="${s.id === current.id}" aria-controls="panel-${s.id}"><i>${String(s.num).padStart(2, '0')}</i>${s.label}</button>`).join('')}<div class="mode"><button type="button" id="mode-sections" aria-pressed="true">Sections</button><button type="button" id="mode-all" aria-pressed="false">Continuous</button></div></div></div></div>`;
    const panels = secs.map((s, i) => `<section class="doc-panel ${s.id === current.id ? 'active' : ''}" id="panel-${s.id}" role="tabpanel" aria-labelledby="tab-${s.id}" tabindex="-1"><div class="doc-panel-head"><span class="kicker-small">${s.num === '0' || s.num === 0 ? 'Overview' : 'Section ' + s.num}</span><h2>${s.title}</h2><p>${s.summary}</p></div>${s.html}<div class="doc-panel-foot">${i > 0 ? `<button type="button" data-go="${secs[i - 1].id}">← ${secs[i - 1].label}</button>` : ''}${i < secs.length - 1 ? `<button type="button" class="next" data-go="${secs[i + 1].id}">${secs[i + 1].label} →</button>` : ''}</div></section>`).join('');
    return `<div class="reading-progress" id="reading-progress"></div><div class="wrap"><a class="back-link" href="#/">← Science Coherence</a><header class="doc-head"><span class="eyebrow">${doc.type} · Version ${doc.version}</span><h1>${doc.title}</h1>${doc.subtitle ? `<p class="reader-subtitle">${doc.subtitle}</p>` : ''}<div class="doc-facts">${doc.facts.map((f, i) => `<div><b class="${i === doc.facts.length - 1 ? 'accent' : ''}">${f.value}</b><span>${f.label}</span></div>`).join('')}</div><div class="doc-meta-row"><div class="reader-meta" style="margin:0">Science Coherence Institute · ${fmtDate(doc.date)} · ${secs.length} sections · ${doc.minutes} min</div>${readerTools(doc)}</div>${doc.note ? `<aside class="reader-note doc-note">${doc.note}</aside>` : ''}</header></div>${nav}<div class="wrap doc" id="doc">${panels}${pathBanner('The architecture behind it.', 'The loop this protocol runs, set out in full.', link('time-crystalline-v2'), 'Read the framework')}</div>`;
  }

  function showSection(id, { scroll = true, focus = false } = {}) {
    if (!activeDoc) return;
    const target = $('#panel-' + id);
    if (!target) return;
    activeDoc.sectionId = id;
    $$('.doc-panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + id));
    $$('#doc-nav [role=tab]').forEach(t => { const on = t.dataset.section === id; t.setAttribute('aria-selected', on); if (on) t.scrollIntoView({ block: 'nearest', inline: 'nearest' }); });
    const allMode = $('#doc').classList.contains('all');
    if (scroll) {
      if (allMode) target.scrollIntoView({ block: 'start' });
      else window.scrollTo({ top: $('.doc-nav-wrap').offsetTop - (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 84), behavior: 'smooth' });
    }
    // Move focus into the panel only when the reader is not driving the tab strip
    // with the keyboard — otherwise arrow keys would stop working after one step.
    if (focus && !$('#doc-nav').contains(document.activeElement)) target.focus({ preventScroll: true });
    updateProgress();
  }

  function enhanceDocument(doc) {
    const root = $('#doc');
    // section navigation
    $('#doc-nav').addEventListener('click', e => {
      const tab = e.target.closest('[role=tab]');
      if (tab) { location.hash = `#/protocol/${tab.dataset.section}`; return; }
      if (e.target.id === 'mode-all' || e.target.id === 'mode-sections') {
        const all = e.target.id === 'mode-all';
        root.classList.toggle('all', all);
        $('#mode-all').setAttribute('aria-pressed', all);
        $('#mode-sections').setAttribute('aria-pressed', !all);
        store.set('sc-doc-mode', all ? 'all' : 'sections');
        if (all) setupScrollSpy(); else { teardownScrollSpy(); showSection(activeDoc.sectionId, { scroll: false }); }
      }
    });
    $('#doc-nav').addEventListener('keydown', e => {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
      const tabs = $$('#doc-nav [role=tab]'); const i = tabs.findIndex(t => t.getAttribute('aria-selected') === 'true');
      const j = e.key === 'ArrowRight' ? Math.min(i + 1, tabs.length - 1) : e.key === 'ArrowLeft' ? Math.max(i - 1, 0) : e.key === 'Home' ? 0 : tabs.length - 1;
      e.preventDefault(); tabs[j].focus(); location.hash = `#/protocol/${tabs[j].dataset.section}`;
    });
    root.addEventListener('click', e => {
      const go = e.target.closest('[data-go]');
      if (go) location.hash = `#/protocol/${go.dataset.go}`;
    });
    if (store.get('sc-doc-mode', 'sections') === 'all') { root.classList.add('all'); $('#mode-all').setAttribute('aria-pressed', true); $('#mode-sections').setAttribute('aria-pressed', false); setupScrollSpy(); }

    // dose scaler
    const scaler = $('#weight-scaler', root);
    if (scaler) {
      const format = v => Number.isInteger(v) ? String(v) : (Math.round(v * 10) / 10).toString();
      const apply = () => {
        const mult = parseFloat(scaler.value);
        $$('.dose', root).forEach(el => {
          const min = parseFloat(el.dataset.min) * mult, max = parseFloat(el.dataset.max) * mult, unit = el.dataset.unit || 'mg';
          el.textContent = (min === max ? format(min) : format(min) + '–' + format(max)) + ' ' + unit;
          el.classList.toggle('scaled', mult !== 1);
        });
        const label = scaler.options[scaler.selectedIndex].textContent;
        $('#dose-note').textContent = mult === 1 ? 'Doses shown at the standard scale.' : `Doses scaled ×${mult} for ${label.toLowerCase()}.`;
      };
      scaler.addEventListener('change', apply);
    }

    // lexicon
    if (doc.lexicon && $('#lexicon-grid', root)) {
      const grid = $('#lexicon-grid', root);
      grid.innerHTML = doc.lexicon.map(item => `<article class="lex-card" data-search="${escapeHTML((item.term + ' ' + item.category + ' ' + item.desc).toLowerCase())}"><span class="tag">${escapeHTML(item.category)}</span><h4>${escapeHTML(item.term)}</h4><div class="formula">$$${item.formula}$$</div><p>${item.desc}</p></article>`).join('');
      const count = () => { const n = $$('.lex-card', grid).filter(c => !c.hidden).length; $('#lexicon-count').textContent = pluralize(n, 'term', 'terms'); };
      $('#lexicon-search', root).addEventListener('input', e => {
        const q = e.target.value.toLowerCase().trim();
        $$('.lex-card', grid).forEach(c => { c.hidden = !!q && !c.dataset.search.includes(q); });
        count();
      });
      count();
    }

    // pacer
    const pacerRoot = $('#pacer', root);
    if (pacerRoot) { const pacer = new Pacer(root); cleanups.push(() => pacer.destroy()); }

    // math
    loadKatex().then(() => renderMath(root)).catch(() => {});
  }

  /* scroll spy for continuous mode */
  let spy = null;
  function setupScrollSpy() {
    teardownScrollSpy();
    spy = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (!visible || !activeDoc) return;
      const id = visible.target.id.replace('panel-', '');
      if (id !== activeDoc.sectionId) { activeDoc.sectionId = id; $$('#doc-nav [role=tab]').forEach(t => t.setAttribute('aria-selected', t.dataset.section === id)); history.replaceState(null, '', `#/protocol/${id}`); }
    }, { rootMargin: '-40% 0px -55% 0px' });
    $$('.doc-panel').forEach(p => spy.observe(p));
  }
  function teardownScrollSpy() { if (spy) { spy.disconnect(); spy = null; } }

  /* KaTeX, loaded on demand from the vendored copy */
  let katexPromise = null;
  function loadKatex() {
    if (window.renderMathInElement) return Promise.resolve();
    if (katexPromise) return katexPromise;
    const base = 'assets/vendor/katex/';
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = base + 'katex.min.css'; document.head.appendChild(css);
    const load = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.defer = true; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    katexPromise = load(base + 'katex.min.js').then(() => load(base + 'contrib/auto-render.min.js'));
    return katexPromise;
  }
  function renderMath(root) {
    if (!window.renderMathInElement) return;
    window.renderMathInElement(root, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '\\(', right: '\\)', display: false }, { left: '$', right: '$', display: false }], throwOnError: false, ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option'] });
  }

  /* ---------- resonant field pacer -------------------------------------- */
  class Pacer {
    constructor(root) {
      this.el = {
        phase: $('#pacer-phase-name', root), orb: $('#pacer-orb', root), prompt: $('#pacer-prompt', root), time: $('#pacer-time', root),
        toggle: $('#pacer-toggle', root), reset: $('#pacer-reset', root), audio: $('#pacer-audio', root), status: $('#pacer-status', root), list: $('#pacer-phases', root)
      };
      this.names = ['Phase 1: Ground-State Collapse', 'Phase 2: The Excision Sweep', 'Phase 3: Meta-Mathematical Repolymerization', 'Phase 4: The Heterochromatin Seal'];
      this.PHASE = 300; this.timer = null; this.ctx = null; this.gain = null;
      this.reset(false);
      this.el.toggle.addEventListener('click', () => this.running ? this.pause() : this.start());
      this.el.reset.addEventListener('click', () => this.reset(true));
      this.el.audio.addEventListener('change', () => { if (this.running) this.el.audio.checked ? this.audioOn() : this.audioOff(); });
      this.onVisibility = () => { if (document.hidden && this.running) this.pause('Paused while the tab was hidden.'); };
      document.addEventListener('visibilitychange', this.onVisibility);
    }
    start() {
      this.running = true;
      this.el.toggle.textContent = 'Pause session';
      this.el.status.textContent = this.names[this.phase - 1] + ' in progress.';
      if (this.el.audio.checked) this.audioOn();
      this.last = performance.now();
      this.timer = setInterval(() => this.tick(), 1000);
      this.render();
    }
    pause(msg) {
      this.running = false; clearInterval(this.timer); this.timer = null;
      this.el.toggle.textContent = 'Resume session';
      this.el.status.textContent = msg || 'Paused.';
      this.audioOff();
      this.el.orb.className = 'pacer-orb';
      this.el.prompt.textContent = 'Paused';
    }
    reset(announce) {
      this.running = false; clearInterval(this.timer); this.timer = null;
      this.phase = 1; this.remaining = this.PHASE;
      this.el.toggle.textContent = 'Start session';
      this.audioOff();
      this.el.orb.className = 'pacer-orb';
      this.el.prompt.textContent = 'Ready';
      this.el.status.textContent = announce ? 'Reset. Four phases of five minutes.' : 'Four phases of five minutes. The orb breathes on a 14-second cycle: inhale 4 s, hold 4 s, exhale 6 s.';
      this.render();
    }
    tick() {
      this.remaining -= 1;
      if (this.remaining < 0) {
        this.phase += 1;
        if (this.phase > 4) { this.complete(); return; }
        this.remaining = this.PHASE;
        this.el.status.textContent = this.names[this.phase - 1] + ' in progress.';
      }
      this.render();
    }
    complete() {
      this.reset(false);
      this.el.status.textContent = 'Session complete — twenty minutes across all four phases.';
      this.el.prompt.textContent = 'Complete';
      $$('li', this.el.list).forEach(li => li.classList.add('done'));
    }
    render() {
      const m = String(Math.floor(this.remaining / 60)).padStart(2, '0'), s = String(this.remaining % 60).padStart(2, '0');
      this.el.time.textContent = `${m}:${s}`;
      this.el.phase.textContent = this.names[this.phase - 1];
      if (this.running) {
        const t = (this.PHASE - this.remaining) % 14;
        const state = t < 4 ? ['Inhale', 'in'] : t < 8 ? ['Hold', 'hold'] : ['Exhale', 'out'];
        this.el.prompt.textContent = state[0];
        this.el.orb.className = 'pacer-orb ' + state[1];
      }
      $$('li', this.el.list).forEach(li => { const p = +li.dataset.phase; li.classList.toggle('active', p === this.phase); li.classList.toggle('done', p < this.phase); });
    }
    audioOn() {
      try {
        if (!this.ctx) {
          this.ctx = new (window.AudioContext || window.webkitAudioContext)();
          this.gain = this.ctx.createGain(); this.gain.gain.value = 0;
          this.gain.connect(this.ctx.destination);
          [216, 256].forEach(f => { const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(this.gain); o.start(); });
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
        this.gain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.gain.gain.linearRampToValueAtTime(0.04, this.ctx.currentTime + 1.5);
      } catch { this.el.audio.checked = false; this.el.status.textContent = 'Audio is not available in this browser.'; }
    }
    audioOff() {
      if (!this.ctx) return;
      this.gain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.6);
      setTimeout(() => { if (this.ctx && !this.running && this.ctx.state === 'running') this.ctx.suspend(); }, 700);
    }
    destroy() {
      clearInterval(this.timer);
      document.removeEventListener('visibilitychange', this.onVisibility);
      if (this.ctx) { try { this.ctx.close(); } catch {} this.ctx = null; }
    }
  }


  /* ---------- the 360-degree count and its clock (a Lab instrument) ------
     THE DATE IS THE ORBIT. Not a tally of days that hopefully lands near the
     right season — the date is literally the degree of arc the Earth has
     travelled since the equinox. Twelve months of thirty degrees. The season is
     therefore exact by construction and can never drift, because the date and
     the season are the same quantity.

     THE DAY IS STILL A ROTATION, so 12:00 is peak sun on every one of them, and
     the clock runs on the true solar day, whose length varies through the year
     with the eccentricity of the orbit and the tilt of the axis.

     THE RESIDUE. A degree of orbit takes 1.014562 rotations, so degrees advance
     slightly slower than sunrises. About 5.2422 times a year — roughly every
     seventy days — two consecutive sunrises fall inside the same degree, and
     that date lasts two sun-days. That is the whole of the 5.2422, compressed
     into the smallest form it can take: no days outside the count, no leap day,
     no drift of the season, no drift of noon. Six days a year that are two days
     long, marked as such.
     ---------------------------------------------------------------------- */
  const CAL360 = {
    // The March equinox. Degree zero, and the anchor for everything below.
    epoch: new Date(2026, 2, 20),
    tropical: 365.242189,
    months: ['March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February'],
    days: [
      { name: 'Differa', short: 'Dif', accent: 'teal' },
      { name: 'Selecta', short: 'Sel', accent: 'amber' },
      { name: 'Realis', short: 'Rea', accent: 'blue' },
      { name: 'Integra', short: 'Int', accent: 'violet' },
      { name: 'Resona', short: 'Res', accent: 'rose' },
      { name: 'Stilla', short: 'Sti', accent: 'green' }
    ],
    // Degrees east. Defaults to the observer's own timezone meridian, so that
    // 12:00:00 is peak sun for the timezone. Set a true longitude for local noon.
    longitude: null
  };

  // Whole days since the Unix epoch, taken from the calendar date so that
  // daylight saving and local offsets cannot shift the count.
  const dayIndex = d => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);

  /* The degree of orbit a given sun-day begins in. This is the date. */
  function degreeOf(rotations) {
    const turns = rotations / CAL360.tropical;
    return Math.floor((((turns % 1) + 1) % 1) * 360);
  }

  /* Where a given moment falls in the count. */
  function cal360(date = new Date()) {
    const rotations = dayIndex(date) - dayIndex(CAL360.epoch);
    const degree = degreeOf(rotations);
    // Is this the second sunrise inside the same degree?
    const second = degreeOf(rotations - 1) === degree;
    // When does the next doubled date fall?
    let ahead = 1;
    while (ahead < 400 && degreeOf(rotations + ahead) !== degreeOf(rotations + ahead - 1)) ahead++;
    return {
      rotations, degree, second, ahead,
      year: Math.floor(rotations / CAL360.tropical),
      month: Math.floor(degree / 30),
      day: degree % 30 + 1,
      weekday: degree % 6,
      week: Math.floor(degree % 30 / 6) + 1,
      arc: (((rotations / CAL360.tropical) % 1) + 1) % 1 * 360
    };
  }

  /* The equation of time, in minutes, split into the two effects that cause it.
     Obliquity is the tilt of the axis; eccentricity is the ellipse of the orbit.
     Accurate to roughly half a minute, which is well inside what a clock shows. */
  function equationOfTime(date = new Date()) {
    const n = (dayIndex(date) - dayIndex(new Date(date.getFullYear(), 0, 1))) + 1;
    const b = 2 * Math.PI * (n - 81) / 365;
    const obliquity = 9.87 * Math.sin(2 * b);
    const eccentricity = -7.53 * Math.cos(b) - 1.5 * Math.sin(b);
    return { n, obliquity, eccentricity, total: obliquity + eccentricity };
  }

  /* The length of today's true solar day. It is not 86,400 seconds: the interval
     between successive solar noons breathes across the year as the equation of
     time changes, shortest around mid-September and longest around the solstice.
     That breathing is the clock's dilation — real, and driven by the ellipse and
     the tilt rather than imposed on them. */
  function solarDay(date = new Date()) {
    const n = (dayIndex(date) - dayIndex(new Date(date.getFullYear(), 0, 1))) + 1;
    const at = k => { const b = 2 * Math.PI * (k - 81) / 365; return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b); };
    const seconds = 86400 - (at(n + 0.5) - at(n - 0.5)) * 60;
    return { seconds, factor: seconds / 86400 };
  }

  /* Apparent solar time: the clock the sun actually keeps overhead. */
  function solarTime(date = new Date(), longitude = CAL360.longitude) {
    const eot = equationOfTime(date);
    // Minutes the local clock runs ahead of or behind the sun. The first term is
    // the observer's offset from their own timezone meridian; the second is the
    // equation of time.
    const meridian = -date.getTimezoneOffset() / 4;          // degrees, east positive
    const correction = 4 * (longitude - meridian) + eot.total;
    const civilMs = date - new Date(date.getFullYear(), date.getMonth(), date.getDate());
    let ms = civilMs + correction * 60000;
    ms = ((ms % 86400000) + 86400000) % 86400000;            // wrap cleanly at both ends
    const t = Math.floor(ms / 1000);
    // The civil clock time at which the sun is highest today.
    const noonMs = 43200000 - correction * 60000;
    return {
      h: Math.floor(t / 3600), m: Math.floor(t % 3600 / 60), s: t % 60,
      correction, eot, meridian,
      noonH: Math.floor(noonMs / 3600000), noonM: Math.floor(noonMs % 3600000 / 60000), noonS: Math.floor(noonMs % 60000 / 1000)
    };
  }

  function calendar360(root) {
    const el = k => $(`[data-cal="${k}"]`, root);
    const pad = n => String(n).padStart(2, '0');
    const sign = n => (n < 0 ? '−' : '+') + Math.abs(n).toFixed(2);
    if (CAL360.longitude === null) CAL360.longitude = -new Date().getTimezoneOffset() / 4;
    let shown = cal360().month;
    let follow = true;

    function drawGrid() {
      const t = cal360();
      el('month').textContent = CAL360.months[shown];
      el('monthnum').textContent = `Month ${shown + 1} of 12 · 30 days · 5 weeks`;
      const head = CAL360.days.map(d => `<div class="cal-head" data-accent="${d.accent}"><abbr title="${d.name}">${d.short}</abbr></div>`).join('');
      let cells = '';
      for (let i = 0; i < 30; i++) {
        const weekday = i % 6;
        const isToday = t.month === shown && t.day === i + 1;
        const twin = degreeOf(t.rotations + (shown * 30 + i - t.degree)) === degreeOf(t.rotations + (shown * 30 + i - t.degree) - 1);
        cells += `<div class="cal-day${isToday ? ' today' : ''}${twin ? ' twin' : ''}" data-accent="${CAL360.days[weekday].accent}" role="gridcell"${isToday ? ' aria-current="date"' : ''} ${twin ? 'title="Two sunrises fall in this degree"' : ''}><span class="cal-num">${i + 1}</span><span class="cal-dayname">${twin ? '××' : CAL360.days[weekday].short}</span></div>`;
      }
      el('grid').innerHTML = head + cells;
    }

    function tick() {
      const t = cal360();
      const s = solarTime(new Date(), CAL360.longitude);
      el('clock').textContent = `${pad(s.h)}:${pad(s.m)}:${pad(s.s)}`;
      el('noon').textContent = `${pad(s.noonH)}:${pad(s.noonM)}:${pad(s.noonS)}`;
      el('eot-total').textContent = `${sign(s.eot.total)} min`;
      el('eot-ecc').textContent = `${sign(s.eot.eccentricity)} min`;
      el('eot-obl').textContent = `${sign(s.eot.obliquity)} min`;
      el('offset').textContent = `${sign(4 * (CAL360.longitude - s.meridian))} min`;
      const d = solarDay();
      el('daylen').textContent = `${d.seconds.toFixed(1)} s`;
      el('factor').textContent = `${d.factor.toFixed(6)}×`;
      el('today').innerHTML = `Today is <strong>${CAL360.days[t.weekday].name} ${t.day} ${CAL360.months[t.month]}</strong> — week ${t.week} of 5, degree ${t.degree + 1} of 360, year ${t.year} of the count.`
        + (t.second ? ` <em>This is the second sunrise of this degree: today is a two-day date.</em>` : ``);
      el('arc').textContent = `${t.arc.toFixed(3)}°`;
      el('double').textContent = t.second ? 'today' : `in ${t.ahead} day${t.ahead === 1 ? '' : 's'}`;
      if (follow && t.month !== shown) { shown = t.month; drawGrid(); }
    }

    el('prev').addEventListener('click', () => { shown = (shown + 11) % 12; follow = false; drawGrid(); });
    el('next').addEventListener('click', () => { shown = (shown + 1) % 12; follow = false; drawGrid(); });
    const lon = el('longitude');
    lon.value = CAL360.longitude;
    lon.addEventListener('change', () => {
      const v = parseFloat(lon.value);
      if (Number.isFinite(v) && v >= -180 && v <= 180) { CAL360.longitude = v; tick(); }
      else lon.value = CAL360.longitude;
    });

    drawGrid(); tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }

  /* Articles may carry interactive widgets; wire up any that are present. */
  function enhanceArticle(root) {
    $$('[data-widget]', root).forEach(node => {
      if (node.dataset.widget === 'calendar360') cleanups.push(calendar360(node));
    });
  }

  /* ---------- search ---------------------------------------------------- */
  const plainCache = new Map();
  const plainText = a => { if (!plainCache.has(a.id)) plainCache.set(a.id, a.kind === 'document' ? a.search : stripTags(a.body).toLowerCase()); return plainCache.get(a.id); };
  function snippet(a, q) {
    const text = plainText(a); const i = text.indexOf(q);
    if (i < 0) return escapeHTML(a.description);
    const start = Math.max(0, i - 60), end = Math.min(text.length, i + q.length + 90);
    const raw = (start ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
    return escapeHTML(raw).replace(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), m => `<mark>${m}</mark>`);
  }
  function search() {
    const q = $('#global-search').value.toLowerCase().trim();
    let results;
    if (!q) results = listed().sort(newest).slice(0, 8);
    else results = listed().map(a => ({ a, score: (a.title.toLowerCase().includes(q) ? 6 : 0) + (a.description.toLowerCase().includes(q) ? 3 : 0) + (a.search.includes(q) ? 1 : 0) })).filter(r => r.score).sort((x, y) => y.score - x.score || newest(x.a, y.a)).slice(0, 10).map(r => r.a);
    $('#search-results').innerHTML = results.length ? results.map(a => `<a class="search-result" href="${link(a.id)}"><strong>${a.title}</strong><span>${typeLine(a)} · ${category(a.category).short}</span>${q ? `<em>${snippet(a, q)}</em>` : ''}</a>`).join('') : '<p class="search-empty">No matches. Try “coherence”, “being”, “protocol”, or “AI”.</p>';
  }
  function openSearch() { $('#search-dialog').showModal(); $('#global-search').value = ''; search(); $('#global-search').focus(); }

  /* ---------- theme ------------------------------------------------------ */
  function currentTheme() { return document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); }
  function toggleTheme() {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    store.set('sc-theme', next);
    $('#theme-toggle').setAttribute('aria-label', `Switch to ${next === 'dark' ? 'light' : 'dark'} theme`);
    toast(next === 'dark' ? 'Dark theme.' : 'Light theme.');
  }

  /* ---------- toast, progress, share ------------------------------------ */
  let toastTimer;
  function toast(text) { const t = $('#toast'); t.textContent = text; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600); }
  function updateProgress() {
    const bar = $('#reading-progress'); if (!bar) return;
    const body = $('.reader-body') || $('#doc'); if (!body) return;
    const start = body.offsetTop, end = body.offsetTop + body.offsetHeight - innerHeight;
    bar.style.width = Math.max(0, Math.min(100, 100 * (scrollY - start) / Math.max(1, end - start))) + '%';
  }
  async function copyLink() {
    const url = location.href;
    $('#share-url').value = url; $('#share-hint').textContent = 'Select and copy this link to share it.';
    try { await navigator.clipboard.writeText(url); toast('Link copied.'); }
    catch { $('#link-dialog').showModal(); $('#share-url').select(); }
  }
  function bindReaderTools(id) {
    $('#save-article')?.addEventListener('click', e => { const on = toggleSaved(id); e.currentTarget.setAttribute('aria-pressed', on); e.currentTarget.textContent = on ? '✓ Saved to reading list' : '+ Save for later'; });
    $('#print-article')?.addEventListener('click', () => window.print());
    $('#copy-link')?.addEventListener('click', copyLink);
  }
  function setupTocSpy() {
    const links = $$('#side-toc a'); if (!links.length) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) links.forEach(l => l.classList.toggle('current', l.dataset.target === en.target.id)); });
    }, { rootMargin: '-15% 0px -70% 0px' });
    $$('.prose h2').forEach(h => obs.observe(h));
    cleanups.push(() => obs.disconnect());
  }

  /* ---------- router ---------------------------------------------------- */
  function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
    const page = parts[0] || '', id = parts[1], sub = parts[2];

    // A same-document section change only switches panels.
    if (page === 'protocol' && activeDoc && $('#doc')) {
      showSection(id || activeDoc.doc.sections[0].id, { focus: true });
      document.title = `${activeDoc.doc.title} — ${activeDoc.doc.sections.find(s => s.id === activeDoc.sectionId)?.label || ''} — Science Coherence`;
      return;
    }
    while (cleanups.length) { try { cleanups.pop()(); } catch {} }
    teardownScrollSpy(); activeDoc = null;

    // Retired and relocated routes keep working rather than 404-ing.
    const doc0 = DOCUMENTS[0];
    if (page === 'explore') { location.replace('#/library'); return; }
    if (page === 'read' && doc0 && id === doc0.id) { location.replace('#/protocol' + (sub ? '/' + sub : '')); return; }

    let html, title = 'A living body of work';
    if (page === '') html = home();
    else if (page === 'protocol') {
      if (!doc0) { html = notFound(); title = 'Page not found'; }
      else { activeDoc = { doc: doc0, sectionId: (doc0.sections.find(s => s.id === id) || doc0.sections[0]).id }; html = readDocument(doc0, activeDoc.sectionId); title = doc0.title; }
    }
    else if (page === 'library') { html = library(); title = 'Library'; }
    else if (page === 'lab') { html = lab(); title = 'The Lab'; }
    else if (page === 'reading-list') { html = readingList(); title = 'Reading list'; }
    else if (page === 'about') { html = about(); title = 'About'; }
    else if (page === 'principles') { html = principles(); title = 'Editorial principles'; }
    else if (page === 'privacy') { html = privacy(); title = 'Privacy & accessibility'; }
    else if (page === 'read') {
      const item = byId(id);
      if (!item) { html = notFound(); title = 'Page not found'; }
      else if (item.kind === 'document') { activeDoc = { doc: item, sectionId: (item.sections.find(s => s.id === sub) || item.sections[0]).id }; html = readDocument(item, activeDoc.sectionId); title = item.title; }
      else { html = readArticle(item); title = item.title; }
    }
    else if (category(page)) { html = collectionPage(category(page)); title = category(page).name; }
    else { html = notFound(); title = 'Page not found'; }

    main.innerHTML = html;
    document.title = `${title} — Science Coherence`;
    $$('.desktop-nav a').forEach(a => a.classList.toggle('active', a.hash === '#/' + page || (page === 'read' && byId(id) && a.hash === '#/library')));
    $('#mobile-nav').hidden = true; $('#menu-toggle').setAttribute('aria-expanded', 'false');
    $('#search-dialog').close(); $('#link-dialog').close();
    window.scrollTo({ top: 0, behavior: 'instant' });
    main.focus({ preventScroll: true });

    if (page === 'library') {
      Object.assign(libraryState, { filter: 'all', query: '', sort: 'newest' });
      updateLibrary();
      $('#library-query').addEventListener('input', e => { libraryState.query = e.target.value; updateLibrary(); });
      $('#library-sort').addEventListener('change', e => { libraryState.sort = e.target.value; updateLibrary(); });
      $$('[data-filter]').forEach(b => b.addEventListener('click', () => setFilter(b.dataset.filter)));
    }
    if (page === 'protocol' && activeDoc) {
      bindReaderTools(activeDoc.doc.id);
      enhanceDocument(activeDoc.doc);
      if (id) requestAnimationFrame(() => showSection(activeDoc.sectionId, { scroll: true }));
      updateProgress();
    }
    if (page === 'read' && byId(id)) {
      bindReaderTools(id);
      setupTocSpy();
      enhanceArticle($('.prose'));
      // Articles can carry notation too — load the typesetter only when they do.
      if (/\$/.test(byId(id).body || '')) loadKatex().then(() => renderMath($('.prose'))).catch(() => {});
      if (sub) requestAnimationFrame(() => document.getElementById(sub)?.scrollIntoView());
      updateProgress();
    }
  }

  /* ---------- global bindings ------------------------------------------- */
  $('#search-open').addEventListener('click', openSearch);
  $('#search-close').addEventListener('click', () => $('#search-dialog').close());
  $('#link-close').addEventListener('click', () => $('#link-dialog').close());
  $('#global-search').addEventListener('input', search);
  $('#search-results').addEventListener('click', e => { if (e.target.closest('a')) $('#search-dialog').close(); });
  $$('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));
  $('#menu-toggle').addEventListener('click', () => {
    const expanded = $('#menu-toggle').getAttribute('aria-expanded') === 'true';
    $('#menu-toggle').setAttribute('aria-expanded', !expanded);
    $('#menu-toggle').setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
    $('#mobile-nav').hidden = expanded;
  });
  $('#theme-toggle').addEventListener('click', toggleTheme);
  document.addEventListener('keydown', e => {
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !e.ctrlKey && !e.metaKey) { e.preventDefault(); openSearch(); }
  });
  $('.skip').addEventListener('click', e => { e.preventDefault(); main.focus(); main.scrollIntoView(); });
  addEventListener('hashchange', route);
  addEventListener('scroll', updateProgress, { passive: true });
  addEventListener('resize', updateProgress, { passive: true });
  route();
})();
