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
  const link = id => '#/read/' + id;
  const newest = (a, b) => b.date.localeCompare(a.date);

  const collections = [
    { id: 'research', name: 'Research & frameworks', short: 'Research', num: '01', symbol: 'orbit', description: 'Consciousness, time, and the patterns that hold living systems together.', intro: 'Imagination is a beginning. Research gives it definitions, measurements, and the possibility of being wrong.', label: 'Models · questions · evidence', green: true },
    { id: 'regenesis', name: 'Regenesis', short: 'Regenesis', num: '02', symbol: 'leaf', description: 'Regeneration, biology, and what it means to restore organization — including the operating protocol.', intro: 'An open inquiry into aging, regeneration, and the organization of living systems. The collection holds both the question and a working protocol.', label: 'Biology · organization · renewal' },
    { id: 'ethos', name: 'The Ethos of Being', short: 'The Ethos', num: '03', symbol: 'sun', description: 'The philosophical foundation. Being, perception, and our relationship with reality.', intro: 'Questions about being, consciousness, and the world we participate in creating.', label: 'Philosophy · consciousness · meaning' },
    { id: 'transmissions', name: 'Transmissions', short: 'Transmissions', num: '04', symbol: 'wave', description: 'From a spoken moment to the written page. Personal, direct, and still unfolding.', intro: 'Voice-originated writing. Reflections on being here, becoming honest, and listening closely.', label: 'Voice · testimony · reflections', green: true },
    { id: 'lab', name: 'The AI Lab', short: 'The Lab', num: '05', symbol: 'nodes', description: 'Where recursive ideas become code, tools, and experiments we can inspect.', intro: 'A space for working software, recursive systems, and small experiments with observable outcomes.', label: 'Cohera · code · experiments' },
    { id: 'learning', name: 'Learning in public', short: 'Learning', num: '06', symbol: 'steps', description: 'The practice of learning to build. Notes, roadmaps, and work in progress.', intro: 'From programming foundations to working AI applications. A place to document the practice.', label: 'AI engineering · notes · roadmaps' }
  ];
  const category = id => collections.find(c => c.id === id);
  const inCollection = id => ALL.filter(x => x.category === id).sort(newest);
  const pluralize = (n, one, many) => n + ' ' + (n === 1 ? one : many);

  const projects = [
    { name: 'Cohera', label: 'RECURSIVE SYSTEMS', desc: 'A software repository for exploring the relationship between recursive ideas and working implementations.', url: 'https://github.com/sciencecoherence/cohera' },
    { name: 'Science Coherence', label: 'THE CONNECTED BODY OF WORK', desc: 'The public repository associated with the broader Science Coherence project.', url: 'https://github.com/sciencecoherence/sciencecoherence' },
    { name: 'Transmission', label: 'PUBLISHING & COMMUNITY', desc: 'The existing website code: writing, transmissions, and a community publishing system.', url: 'https://github.com/sciencecoherence/sciencecoherence-blog' }
  ];

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
    return `<div class="collection-grid">${collections.map(c => {
      const n = inCollection(c.id).length;
      return `<a href="#/${c.id}" class="collection-card"><div class="collection-top"><span>${c.num} / COLLECTION</span>${symbol(c.symbol)}</div><h3>${c.name}</h3><p>${c.description}</p><div class="collection-foot"><span>${c.label.split(' · ')[0]} / ${pluralize(n, 'piece', 'pieces')}</span><span class="arrow" aria-hidden="true">↗</span></div></a>`;
    }).join('')}</div>`;
  }
  const pathBanner = (title, text, href, cta) => `<div class="path-banner"><div><h3>${title}</h3><p>${text}</p></div><a class="button" href="${href}">${cta} <span>↗</span></a></div>`;
  const pageHero = (eyebrow, title, desc, green = false) => `<section class="page-hero ${green ? 'green' : ''}"><div class="wrap"><div class="breadcrumb"><a href="#/">Home</a> / ${eyebrow}</div><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p class="lede">${desc}</p></div></section>`;

  /* ---------- pages ------------------------------------------------------ */
  function home() {
    const featured = byId('time-crystalline-v2');
    const doc = DOCUMENTS[0];
    const latest = inCollection('transmissions').slice(0, 3);
    return `<section class="hero"><div class="wrap"><div class="hero-top"><span class="eyebrow">Consciousness. Nature. What comes next.</span><span class="edition">FIELD NOTES / VOL. 01 — 2026</span></div><div class="hero-layout"><div class="hero-copy"><h1>Everything<br>is <em>connected.</em></h1><p>An independent exploration of consciousness, living systems, and the things we create. One body of work. Many ways in.</p><div class="hero-links"><a class="button primary" href="#/explore">Explore the work <span>↗</span></a><a class="text-link" href="${link('start-here')}">A place to begin <span>→</span></a></div></div><div class="hero-art">${livingArt()}<span class="art-label one">Fig. 01 / Patterns of becoming</span><span class="art-label two">From one, a living whole.</span></div></div><div class="hero-bottom"><span>A living body of work by Julien Steff</span><span>RESEARCH ↔ PHILOSOPHY ↔ PRACTICE</span><a href="#/explore">Scroll to explore ↓</a></div></div></section>
    <div class="wrap">
      <div class="intro-line"><span class="eyebrow">The thread that connects it</span><p>What if understanding ourselves and understanding the world are part of the same inquiry?</p></div>
      <section class="section"><div class="section-head"><div><span class="eyebrow">Six ways into the work</span><h2>A whole, in many parts.</h2></div><a class="text-link" href="#/library">View the library <span>↗</span></a></div>${collectionCards()}</section>
      ${featured ? `<section class="feature"><div class="feature-art">${art('orbit')}<span class="diagram-caption">FIG. 02 — A CONCEPTUAL STUDY OF COORDINATION</span></div><div class="feature-copy"><span class="eyebrow">Featured inquiry</span><h2>A living architecture<br>of coherence.</h2><p>From an imaginative premise to a testable research program. Explore the Time-Crystalline Framework, Version 2.</p><div class="feature-meta">Research framework · ${featured.minutes} min read</div><a class="button dark" href="${link(featured.id)}">Enter the framework <span>↗</span></a></div></section>` : ''}
      ${doc ? `<section class="section" style="padding-bottom:0"><div class="feature document"><div class="feature-art">${latticeArt()}<span class="diagram-caption">FIG. 03 — THE GENOME · WATER · CONSCIOUSNESS AXIS</span></div><div class="feature-copy"><span class="eyebrow">From Regenesis · operating document</span><h2>${doc.title}.</h2><p>${doc.description}</p><div class="fact-strip">${doc.facts.map(f => `<div><b>${f.value}</b><span>${f.label}</span></div>`).join('')}</div><div class="feature-meta">Version ${doc.version} · ${doc.sections.length} sections · ${doc.minutes} min · interactive</div><a class="button dark" href="${link(doc.id)}">Open the document <span>↗</span></a></div></div></section>` : ''}
      <section class="section"><div class="section-head"><div><span class="eyebrow">From the journal</span><h2>Words from the inside.</h2></div><a class="text-link" href="#/transmissions">All transmissions <span>↗</span></a></div><div class="article-grid">${latest.map(card).join('')}</div></section>
      <section class="manifesto"><span class="eyebrow">The philosophical foundation</span><div><blockquote>Being. Perceiving.<br>Participating in what becomes.</blockquote><p class="signature">THE ETHOS OF BEING / A PHILOSOPHICAL INQUIRY</p><a href="${link('ethos-of-being')}" class="text-link">Read The Ethos of Being <span>↗</span></a></div></section>
      ${pathBanner('Follow your curiosity.', 'Search across the research, writing, experiments, and learning notes.', '#/library', 'Open the library')}
      <div style="height:70px"></div>
    </div>`;
  }

  function explore() {
    return pageHero('Explore', 'One inquiry.<br>Many ways in.', 'A map of the work. Follow a collection, or let a question take you across the boundaries.') + `<div class="wrap section">${collectionCards()}${pathBanner('New here?', 'Begin with a short introduction to the connections.', link('start-here'), 'Start here')}</div>`;
  }

  function collectionPage(c) {
    const items = inCollection(c.id);
    const others = collections.filter(x => x.id !== c.id).slice(0, 3);
    return pageHero(c.short, c.name + '.', c.intro, !!c.green) + `<div class="wrap"><div class="category-layout"><aside class="side-note"><h3>Inside this collection</h3><p>${c.description}</p><p>${c.label}</p><h3 style="margin-top:28px">Connected paths</h3>${others.map(x => `<a href="#/${x.id}">${x.name} ↗</a>`).join('')}</aside><div>${items.length ? items.map(row).join('') : '<div class="empty"><h3>Nothing here yet.</h3><p>This collection is still being written.</p></div>'}${c.id === 'regenesis' ? `<a class="entry-row" href="${link('time-crystalline-v2')}"><span class="entry-number">↗</span><div><h3>The research behind the inquiry</h3><p>Read the complete Time-Crystalline Framework V2, including definitions, evidence tiers, and experimental proposals.</p><span class="article-meta">Connected research</span></div><span>↗</span></a>` : ''}</div></div></div>`;
  }

  function lab() {
    return pageHero('The Lab', 'Ideas, made inspectable.', 'Software projects and experiments connected to the wider inquiry. Open the code, understand the assumptions, and see what actually runs.', true) + `<div class="wrap section"><div class="section-head"><div><span class="eyebrow">Project directory</span><h2>From thought to things.</h2></div></div><div class="article-grid">${projects.map((p, i) => `<article class="article-card"><span class="eyebrow">0${i + 1} / ${p.label}</span><h3 style="margin-top:14px">${p.name}</h3><p>${p.desc}</p><div class="article-bottom"><a class="text-link" href="${p.url}" target="_blank" rel="noopener">Explore repository <span>↗</span></a></div></article>`).join('')}<article class="article-card"><span class="eyebrow">04 / RESEARCH TO PRACTICE</span><h3 style="margin-top:14px">A smaller experiment.</h3><p>Begin with one explicit update rule and an observable result. The lab note sets out questions for the next iteration.</p><div class="article-bottom"><a class="text-link" href="${link('cohera')}">Read the project note <span>↗</span></a></div></article></div>${pathBanner('The practice behind the projects.', 'Explore the learning roadmap and the path toward building with AI.', '#/learning', 'Learning in public')}</div>`;
  }

  /* library */
  const libraryState = { filter: 'all', query: '', sort: 'newest' };
  function library() {
    return pageHero('Library', 'A place for every thread.', 'Research, essays, transmissions, documents, and project notes. Browse by collection or search the full text.') + `<div class="wrap"><div class="library-controls"><input class="library-search" id="library-query" aria-label="Search library" type="search" placeholder="Search titles, ideas, or the full text…" autocomplete="off"><select id="library-sort" class="sort" aria-label="Sort library"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option><option value="length">Longest first</option></select><a class="reading-list-link" href="#/reading-list">Reading list <span id="saved-count">(${saved().length})</span></a></div><div class="filters" role="group" aria-label="Filter by collection"><button class="filter active" data-filter="all" aria-pressed="true">Everything</button>${collections.map(c => `<button class="filter" data-filter="${c.id}" aria-pressed="false">${c.short}</button>`).join('')}<button class="filter" data-filter="documents" aria-pressed="false">Documents</button></div><div class="result-count" id="result-count" aria-live="polite"></div><div class="library-list" id="library-list"></div></div>`;
  }
  function updateLibrary() {
    const q = libraryState.query.toLowerCase().trim();
    let items = ALL.filter(a => (libraryState.filter === 'all' || (libraryState.filter === 'documents' ? a.kind === 'document' : a.category === libraryState.filter)) && (!q || a.search.includes(q)));
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
    return pageHero('About', 'The person.<br>The questions. The work.', 'Science Coherence is an independent body of work by Julien Steff, bringing philosophical inquiry into conversation with biology, writing, and software.') + `<div class="wrap section category-layout"><div class="side-note" style="color:var(--acc-green)">${art('leaf')}<p style="margin-top:20px;font-family:var(--mono);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase">Growing through the questions.</p></div><div class="prose"><h2>There is a thread<br>through all of it.</h2><p>The work moves between scales: the personal and the theoretical, the spoken moment and the formal model, an intuition and a piece of code.</p><p>Science Coherence gives those explorations a shared home. The Ethos of Being holds the philosophical questions. The research frameworks try to make ideas precise. Regenesis asks about living systems and carries the operating protocol. The transmissions preserve a direct, personal register. The lab makes room for building.</p><p>The intention is to make the connections visible while allowing each form of work to speak in its own voice.</p><h3>Imagination opens the question.</h3><p>There is room here for foundational philosophical premises and ambitious ideas. Their status is made explicit.</p><h3>Clarity gives it a form.</h3><p>A personal account, a research hypothesis, an operating document, and a demonstrated result are different kinds of contribution. The site tells you which one you are reading.</p><h3>The work remains revisable.</h3><p>Definitions, arguments, code, and conclusions can change as the inquiry develops.</p><p style="margin-top:32px"><a class="button dark" href="${link('start-here')}">Find your way into the work ↗</a></p></div></div>`;
  }

  function principles() {
    return pageHero('Editorial principles', 'Let the reader see<br>what a claim rests on.', 'How the different kinds of work in this library are presented.') + `<div class="wrap section"><article class="prose" style="max-width:760px"><h2>Personal writing</h2><p>Transmissions preserve the author’s personal and philosophical voice. Beliefs, spiritual experiences, and predictions in these texts are testimony rather than verified findings. Archival notes identify this context.</p><h2>Research frameworks</h2><p>A framework declares its philosophical assumptions, distinguishes evidence from proposed mechanisms, and states where a claim remains speculative. Mathematical notation is accompanied by definitions whenever available.</p><h2>Operating documents</h2><p>An operating document is a versioned, working protocol. It is presented as the author’s own programme, with its interactive tools (dose scaling, timers, lexicons) kept faithful to the source. Compounds, doses, and cadences are not medical advice. Each version is preserved as a downloadable source file.</p><h2>Software and experiments</h2><p>A project link identifies work that can be inspected. Its inclusion does not imply that the code is production-ready or that it validates a scientific theory.</p><h2>Sources and versions</h2><p>The library includes complete imported texts and new collection introductions. Source downloads preserve the imported documents. The June learning roadmap is labeled as an archived plan.</p><h2>Corrections</h2><p>Substantive corrections belong in a dated revision of the affected piece. Readers should be able to distinguish a changed argument from a change in presentation.</p></article></div>`;
  }

  function privacy() {
    return pageHero('Privacy & accessibility', 'A quieter place to read.', 'The site works without an account, advertising, or an analytics service.') + `<div class="wrap section"><article class="prose" style="max-width:760px"><h2>Your reading list and theme</h2><p>Saved article identifiers and your light/dark preference are stored in this browser’s local storage. They are not sent to a server. You can remove a saved item with the same button on its page, or clear this site’s storage in your browser settings.</p><h2>External services</h2><p>The site requests optional fonts from Google Fonts. Those requests expose standard connection information such as your IP address to Google. System fonts are used if the request fails. Mathematical notation is rendered with a copy of KaTeX served from this site; no other third-party scripts are loaded. GitHub opens only when you follow a link. Hosting providers may keep their own access logs.</p><h2>Reading and navigation</h2><p>The site supports keyboard navigation, visible focus states, a skip link, reduced-motion preferences, light and dark themes, responsive layouts, and a print stylesheet. Search can be opened with the slash key and closed with Escape. The document timer plays sound only after you press start, and only if the audio option is enabled.</p><h2>Publishing model</h2><p>This edition is a public reading website. There are no accounts, comments, uploads, or forms collecting personal information.</p></article></div>`;
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
    const same = inCollection(a.category).filter(x => x.id !== a.id).slice(0, 3);
    return same.length ? same : ALL.filter(x => x.id !== a.id).sort(newest).slice(0, 3);
  }
  const readerTools = a => `<div class="reader-tools">${saveButton(a.id)}<button id="print-article">Print / save PDF</button><button id="copy-link">Copy link</button>${a.download ? `<a href="${a.download}" download>Download source ↓</a>` : ''}</div>`;
  const readerFoot = a => {
    const { prev, next } = neighbours(a);
    return `<div class="wrap reader-foot"><div class="pager">${prev ? `<a class="prev" href="${link(prev.id)}"><span>← Earlier in ${category(a.category).short}</span><strong>${prev.title}</strong></a>` : '<div></div>'}${next ? `<a class="next" href="${link(next.id)}"><span>Later in ${category(a.category).short} →</span><strong>${next.title}</strong></a>` : '<div></div>'}</div><div class="related"><h3>Keep following the thread</h3>${related(a).map(row).join('')}</div>${pathBanner('Back to the collection.', `Discover another piece in ${category(a.category).name}.`, '#/' + a.category, 'Open ' + category(a.category).short)}</div>`;
  };

  function readArticle(a) {
    const prepared = prepareArticle(a);
    return `<div class="reading-progress" id="reading-progress"></div><div class="wrap"><a class="back-link" href="#/${a.category}">← ${category(a.category).name}</a><header class="reader-head"><span class="eyebrow">${a.type}</span><h1>${a.title}</h1>${a.subtitle ? `<p class="reader-subtitle">${a.subtitle}</p>` : ''}<p class="lede">${a.description}</p><div class="reader-meta">Julien Steff · ${fmtDate(a.date)} · ${a.minutes} min read · ${a.words ? a.words.toLocaleString('en-GB') + ' words' : ''}</div>${readerTools(a)}</header><div class="reader-layout ${prepared.toc ? '' : 'no-toc'}">${prepared.toc ? `<aside class="reader-side"><h3>On this page</h3><nav aria-label="Article sections" id="side-toc">${prepared.toc}</nav></aside>` : ''}<div class="reader-body">${a.note ? `<aside class="reader-note">${a.note}</aside>` : ''}${prepared.toc ? `<details class="article-toc"><summary>On this page</summary><nav aria-label="Article sections">${prepared.toc}</nav></details>` : ''}<article class="prose">${prepared.body}</article></div></div></div>${readerFoot(a)}`;
  }

  /* ---------- document register ----------------------------------------- */
  let activeDoc = null;      // { doc, sectionId }
  const cleanups = [];       // functions run before leaving a page

  function readDocument(doc, sectionId) {
    const secs = doc.sections;
    const current = secs.find(s => s.id === sectionId) || secs[0];
    const nav = `<div class="doc-nav-wrap"><div class="wrap"><div class="doc-nav" role="tablist" aria-label="Document sections" id="doc-nav">${secs.map(s => `<button role="tab" id="tab-${s.id}" data-section="${s.id}" aria-selected="${s.id === current.id}" aria-controls="panel-${s.id}"><i>${String(s.num).padStart(2, '0')}</i>${s.label}</button>`).join('')}<div class="mode"><button type="button" id="mode-sections" aria-pressed="true">Sections</button><button type="button" id="mode-all" aria-pressed="false">Continuous</button></div></div></div></div>`;
    const panels = secs.map((s, i) => `<section class="doc-panel ${s.id === current.id ? 'active' : ''}" id="panel-${s.id}" role="tabpanel" aria-labelledby="tab-${s.id}" tabindex="-1"><div class="doc-panel-head"><span class="kicker-small">${s.num === '0' || s.num === 0 ? 'Overview' : 'Section ' + s.num}</span><h2>${s.title}</h2><p>${s.summary}</p></div>${s.html}<div class="doc-panel-foot">${i > 0 ? `<button type="button" data-go="${secs[i - 1].id}">← ${secs[i - 1].label}</button>` : ''}${i < secs.length - 1 ? `<button type="button" class="next" data-go="${secs[i + 1].id}">${secs[i + 1].label} →</button>` : ''}</div></section>`).join('');
    return `<div class="reading-progress" id="reading-progress"></div><div class="wrap"><a class="back-link" href="#/${doc.category}">← ${category(doc.category).name}</a><header class="doc-head"><span class="eyebrow">${doc.type} · Version ${doc.version}</span><h1>${doc.title}</h1>${doc.subtitle ? `<p class="reader-subtitle">${doc.subtitle}</p>` : ''}<div class="doc-facts">${doc.facts.map((f, i) => `<div><b class="${i === doc.facts.length - 1 ? 'accent' : ''}">${f.value}</b><span>${f.label}</span></div>`).join('')}</div><div class="doc-meta-row"><div class="reader-meta" style="margin:0">Science Coherence Institute · ${fmtDate(doc.date)} · ${secs.length} sections · ${doc.minutes} min</div>${readerTools(doc)}</div>${doc.note ? `<aside class="reader-note doc-note">${doc.note}</aside>` : ''}</header></div>${nav}<div class="wrap doc" id="doc">${panels}${pathBanner('Back to Regenesis.', 'The question this document answers, and the research around it.', '#/' + doc.category, 'Open the collection')}</div>`;
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
    if (focus) target.focus({ preventScroll: true });
    updateProgress();
  }

  function enhanceDocument(doc) {
    const root = $('#doc');
    // section navigation
    $('#doc-nav').addEventListener('click', e => {
      const tab = e.target.closest('[role=tab]');
      if (tab) { location.hash = `#/read/${doc.id}/${tab.dataset.section}`; return; }
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
      e.preventDefault(); tabs[j].focus(); location.hash = `#/read/${doc.id}/${tabs[j].dataset.section}`;
    });
    root.addEventListener('click', e => {
      const go = e.target.closest('[data-go]');
      if (go) location.hash = `#/read/${doc.id}/${go.dataset.go}`;
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
      if (id !== activeDoc.sectionId) { activeDoc.sectionId = id; $$('#doc-nav [role=tab]').forEach(t => t.setAttribute('aria-selected', t.dataset.section === id)); history.replaceState(null, '', `#/read/${activeDoc.doc.id}/${id}`); }
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
    if (!q) results = ALL.slice().sort(newest).slice(0, 8);
    else results = ALL.map(a => ({ a, score: (a.title.toLowerCase().includes(q) ? 6 : 0) + (a.description.toLowerCase().includes(q) ? 3 : 0) + (a.search.includes(q) ? 1 : 0) })).filter(r => r.score).sort((x, y) => y.score - x.score || newest(x.a, y.a)).slice(0, 10).map(r => r.a);
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
    if (page === 'read' && activeDoc && activeDoc.doc.id === id && $('#doc')) {
      showSection(sub || activeDoc.doc.sections[0].id, { focus: true });
      document.title = `${activeDoc.doc.title} — ${activeDoc.doc.sections.find(s => s.id === activeDoc.sectionId)?.label || ''} — Science Coherence`;
      return;
    }
    while (cleanups.length) { try { cleanups.pop()(); } catch {} }
    teardownScrollSpy(); activeDoc = null;

    let html, title = 'A living body of work';
    if (page === '') html = home();
    else if (page === 'explore') { html = explore(); title = 'Explore'; }
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
    if (page === 'read' && byId(id)) {
      bindReaderTools(id);
      if (activeDoc) { enhanceDocument(activeDoc.doc); if (sub) requestAnimationFrame(() => showSection(activeDoc.sectionId, { scroll: true })); }
      else { setupTocSpy(); if (sub) requestAnimationFrame(() => document.getElementById(sub)?.scrollIntoView()); }
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
