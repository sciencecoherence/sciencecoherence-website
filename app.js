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
    { id: 'research', name: 'Research & frameworks', short: 'Research', num: '01', symbol: 'orbit', description: 'The philosophical foundation and the frameworks built from it: being, perception, the recursive loop, consciousness, time, and the patterns that hold living systems together.', intro: 'Imagination is a beginning. Research gives it definitions, measurements, and the possibility of becoming reality.', label: 'Philosophy · models · questions · failure conditions', green: true },
    { id: 'lab', name: 'The Lab', short: 'The Lab', num: '02', symbol: 'nodes', description: 'Experimental articles: propositions taken out of argument and run.', intro: 'Where a proposition stops being argued and starts being run — with what is varied, what is watched, and what would count as failure stated up front.', label: 'Experiments · observations · failure conditions', green: true },
    /* Hidden for now. The collection, its route and its pieces all stay; nothing
       lists them. Remove `hidden` to bring one back — that is the whole revert.
       Regenesis is additionally emptied: its pieces were recategorised to
       `research`, so restoring it means moving those back as well. */
    { id: 'regenesis', name: 'Regenesis', short: 'Regenesis', num: '06', symbol: 'leaf', hidden: true, description: 'Regeneration, biology, and what it means to restore organization.', intro: 'The inquiry into aging, regeneration, and the organization of living systems — where the loop meets tissue.', label: 'Biology · organization · renewal' },
    // Standalone: its own route and nav entry and its own feature on the home
    // page, but deliberately not one of the three ways in.
    { id: 'transmissions', name: 'Transmissions', short: 'Transmissions', num: '04', symbol: 'wave', standalone: true, description: 'From a spoken moment to the written page. Personal, direct, and still unfolding.', intro: 'Voice-originated writing. Reflections on being here, becoming honest, and listening closely.', label: 'Voice · testimony · reflections', green: true },
    { id: 'learning', name: 'Learning in public', short: 'Learning', num: '07', symbol: 'steps', hidden: true, description: 'The practice of learning to build. Notes, roadmaps, and work in progress.', intro: 'From programming foundations to working AI applications. A place to document the practice.', label: 'AI engineering · notes · roadmaps' },
    // Standalone: the protocol has its own page rather than sitting inside a collection.
    { id: 'protocol', name: 'The Protocol', short: 'Protocol', num: '05', symbol: 'lattice', standalone: true, description: 'The operating document: the recursion carried down to the body.', intro: 'The recursion, run.', label: 'Operating document' }
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
  const pathBanner = (title, text, href, cta) => `<div class="path-banner"><div><h3>${title}</h3><p>${text}</p></div><a class="button" href="${href}">${cta} <span>↗</span></a></div>`;
  /* Every page hero carries the same green band. Pass false to opt one out. */
  const pageHero = (eyebrow, title, desc, green = true) => `<section class="page-hero ${green ? 'green' : ''}"><div class="wrap"><div class="breadcrumb"><a href="#/">Home</a> / ${eyebrow}</div><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p class="lede">${desc}</p></div></section>`;

  /* ---------- pages ------------------------------------------------------ */
  function home() {
    const doc = DOCUMENTS[0];
    const latest = listed().filter(a => a.category !== 'protocol' && a.category !== 'transmissions').sort(newest).slice(0, 3);
    const research = inCollection('research');
    const experiments = inCollection('lab');
    const voices = inCollection('transmissions');
    return `<section class="hero"><div class="wrap"><div class="hero-top"><span class="eyebrow">Coherence. Recursion. What holds.</span><span class="edition">FIELD NOTES / VOL. 01 — 2026</span></div><div class="hero-layout"><div class="hero-copy"><h1>Nothing is<br><em>observed</em> from<br>outside.</h1><p>There is no vantage point beyond the process. What is real is what survives the loop — selected, integrated, and fed back into the conditions that produced it. This is that inquiry, and the work it has become.</p><div class="hero-links"><a class="button primary" href="#/research">Begin with Research <span>↗</span></a><a class="text-link" href="${link('start-here')}">A place to begin <span>→</span></a></div></div><div class="hero-art">${livingArt()}<span class="art-label one">Fig. 01 / Patterns of becoming</span><span class="art-label two">From one, a living whole.</span></div></div><div class="hero-bottom"><span>A living body of work by Dr. William Conroy</span><span>∇Φ ⟶ Λ ⟶ Ω ⟶ ∆</span><a href="#/library">Open the library ↓</a></div></div></section>
    <div class="wrap">
      <div class="intro-line"><span class="eyebrow">The thread that connects it</span><p>What if understanding ourselves and understanding the world are not two inquiries, but one loop closing?</p></div>
      <section class="section" style="padding-bottom:0"><div class="feature light"><div class="feature-art">${art('orbit')}<span class="diagram-caption">FIG. 02 — PHILOSOPHY · MODELS · QUESTIONS</span></div><div class="feature-copy"><span class="eyebrow">Research</span><h2>One inquiry,<br>made explicit.</h2><p>The philosophical foundation and the frameworks built from it: being, perception, the recursive loop, consciousness, time, and the patterns that hold living systems together.</p><div class="feature-meta">${pluralize(research.length, 'piece', 'pieces')} · philosophy · frameworks · failure conditions</div><a class="button dark" href="#/research">Open Research <span>↗</span></a></div></div></section>
      <section class="section" style="padding-bottom:0"><div class="feature"><div class="feature-art">${art('nodes')}<span class="diagram-caption">FIG. 03 — PROPOSITIONS, RUN</span></div><div class="feature-copy"><span class="eyebrow">The Lab</span><h2>Where an idea<br>meets what happens.</h2><p>Experimental articles: propositions taken out of argument and run, with what is varied, what is watched, and what would count as failure stated up front.</p><div class="feature-meta">${pluralize(experiments.length, 'experiment', 'experiments')} · observations · failure conditions</div><a class="button dark" href="#/lab">Open The Lab <span>↗</span></a></div></div></section>
      ${doc ? `<section class="section" style="padding-bottom:0"><div class="feature document"><div class="feature-art">${latticeArt()}<span class="diagram-caption">FIG. 04 — THE GENOME · WATER · CONSCIOUSNESS AXIS</span></div><div class="feature-copy"><span class="eyebrow">The operating document</span><h2>${doc.title}.</h2><p>The loop carried down to the body: entropy reversal across the chromatin–water matrix, a three-tier daily protocol, and a mind-recoding engine that treats the observer as the boundary operator it is.</p><div class="fact-strip">${doc.facts.map(f => `<div><b>${f.value}</b><span>${f.label}</span></div>`).join('')}</div><div class="feature-meta">Version ${doc.version} · ${doc.sections.length} sections · ${doc.minutes} min · interactive</div><a class="button dark" href="#/protocol">Open the protocol <span>↗</span></a></div></div></section>` : ''}
      ${voices.length ? `<section class="section" style="padding-bottom:0"><div class="feature"><div class="feature-art">${art('wave')}<span class="diagram-caption">FIG. 05 — SPOKEN FIRST, THEN WRITTEN</span></div><div class="feature-copy"><span class="eyebrow">Transmissions</span><h2>Said out loud<br>before it was written.</h2><p>Voice-originated writing. What gets said when there is no argument to win — on being here, becoming honest, and listening closely enough to hear it back.</p><div class="feature-meta">${pluralize(voices.length, 'transmission', 'transmissions')} · latest ${fmtDate(voices[0].date)}</div><a class="button dark" href="#/transmissions">Open the transmissions <span>↗</span></a></div></div></section>` : ''}
      <section class="section"><div class="section-head"><div><span class="eyebrow">Recent work</span><h2>Where the loop is running.</h2></div><a class="text-link" href="#/library">The complete library <span>↗</span></a></div><div class="article-grid">${latest.map(card).join('')}</div></section>
      <section class="manifesto"><span class="eyebrow">A foundational research text</span><div><blockquote>Being. Perceiving.<br>Participating in what becomes.</blockquote><p class="signature">THE ETHOS OF BEING / RESEARCH &amp; PHILOSOPHICAL INQUIRY</p><a href="${link('ethos-of-being')}" class="text-link">Read The Ethos of Being <span>↗</span></a></div></section>
      ${pathBanner('Follow your curiosity.', 'Search across the framework, the protocol, the experiments and the notes.', '#/library', 'Open the library')}
      <div style="height:70px"></div>
    </div>`;
  }

  function collectionPage(c) {
    const items = inCollection(c.id);
    const others = collections.filter(x => x.id !== c.id && !x.hidden && !x.standalone).slice(0, 3);
    const connected = c.id === 'research'
      ? [
          { href: link('start-here'), name: 'Start here' },
          { href: link('ethos-of-being'), name: 'The Ethos of Being' },
          { href: '#/protocol', name: 'The Protocol' },
          { href: '#/lab', name: 'The Lab' }
        ]
      : others.map(x => ({ href: '#/' + x.id, name: x.name }));
    return pageHero(c.short, c.name + '.', c.intro, c.green !== false) + `<div class="wrap"><div class="category-layout"><aside class="side-note"><h3>Inside this collection</h3><p>${c.description}</p><p>${c.label}</p><h3 style="margin-top:28px">Connected paths</h3>${connected.map(x => `<a href="${x.href}">${x.name} ↗</a>`).join('')}</aside><div>${items.length ? items.map(row).join('') : '<div class="empty"><h3>Nothing here yet.</h3><p>This collection is still being written.</p></div>'}${c.id === 'research' ? `<a class="entry-row" href="#/protocol"><span class="entry-number">↗</span><div><h3>The protocol this leads to</h3><p>The operating document: the three-tier daily protocol, the epigenetic architecture behind it, and the diagnostic suite that reads it back.</p><span class="article-meta">Connected · operating document</span></div><span>↗</span></a>` : ''}</div></div></div>`;
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
    return pageHero('About', 'The person.<br>The questions. The work.', 'Science Coherence is an independent body of work by Dr. William Conroy, developed from a single premise: that there is no position outside the process from which the process can be judged.') + `<div class="wrap about-page">
    <section class="about-intro" aria-labelledby="about-spirit-title">
      <figure class="about-image">
        <img src="assets/el-ignorante.png" width="1086" height="1448" alt="El Ignorante: a figure in a straw hat holds an open book and tends a flask beneath a tree, surrounded by books, glassware and a sunlit garden." decoding="async">
        <figcaption><span lang="es">El Ignorante</span><span>Growing through the questions.</span></figcaption>
      </figure>
      <div class="about-opening">
        <span class="eyebrow" id="about-spirit-title">The spirit of the work</span>
        <div class="about-spirit-principles">
          <div><h2>Imagination opens the question.</h2><p>Imagination is the first operation, not a preliminary to the real one. What is imagined is already inside the recursion; the only question is whether it survives being run.</p></div>
          <div><h2>Coherence decides.</h2><p>Not agreement, and not endorsement. Alignment that holds on contact — with a body, with a rhythm, with another account. What cannot hold on contact dissolves, whoever is holding it.</p></div>
          <div><h2>The work remains revisable.</h2><p>Definitions, arguments, code, and conclusions all stay open. A structure that could not be contradicted would not be strong; it would be untested.</p></div>
        </div>
        <a class="about-text-link" href="#/principles">How the work stays open to revision <span aria-hidden="true">↗</span></a>
      </div>
    </section>
    <section class="about-thread" aria-labelledby="about-thread-title">
      <div class="about-section-heading"><span class="eyebrow">One inquiry, across scales</span><h2 id="about-thread-title">There is a thread<br>through all of it.</h2></div>
      <div class="prose">
      <p>The work moves between scales: the personal and the theoretical, the spoken moment and the formal model, an intuition and a piece of code. What connects them is not subject matter. It is the claim that these are the same operation performed at different depths — difference, selection, realisation, integration — and that a body, a thought and a world are all instances of the same loop holding its shape.</p>
      <p>Science Coherence gives those strands a shared home. <a href="#/research">Research</a> brings together <a href="${link('ethos-of-being')}">The Ethos of Being</a>, the wider framework, and the questions that carry it into specific territory, including what it means where the loop meets tissue. <a href="#/protocol">The protocol</a> is that question answered in practice, on one body, daily. <a href="#/lab">The Lab</a> is the experimental record — where a proposition is run rather than argued.</p>
      <p>The intention is to make the connections visible while letting each form of work speak in its own voice.</p>
      </div>
    </section>
    <div class="about-invitation">
      <div><span class="eyebrow">Keep following the questions</span><h2>A place to begin.</h2><p>Follow an idea into the writing, then see what happens when it is put to work.</p></div>
      <a class="button dark" href="${link('start-here')}">Find your way into the work <span aria-hidden="true">↗</span></a>
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
    return `<div class="reading-progress" id="reading-progress"></div><section class="page-hero green doc-hero"><div class="wrap"><div class="breadcrumb"><a href="#/">Home</a> / The Protocol</div><span class="eyebrow">${doc.type} · Version ${doc.version}</span><h1>${doc.title}</h1>${doc.subtitle ? `<p class="lede">${doc.subtitle}</p>` : ''}</div></section><div class="wrap"><header class="doc-head"><div class="doc-facts">${doc.facts.map((f, i) => `<div><b class="${i === doc.facts.length - 1 ? 'accent' : ''}">${f.value}</b><span>${f.label}</span></div>`).join('')}</div><div class="doc-meta-row"><div class="reader-meta" style="margin:0">Science Coherence Institute · ${fmtDate(doc.date)} · ${secs.length} sections · ${doc.minutes} min</div>${readerTools(doc)}</div>${doc.note ? `<aside class="reader-note doc-note">${doc.note}</aside>` : ''}</header></div>${nav}<div class="wrap doc" id="doc">${panels}${pathBanner('The architecture behind it.', 'The loop this protocol runs, set out in full.', link('time-crystalline-v2'), 'Read the framework')}</div>`;
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
      grid.innerHTML = doc.lexicon.map((item, idx) => `<article class="lex-card" data-idx="${idx}" data-search="${escapeHTML((item.term + ' ' + item.category + ' ' + item.desc).toLowerCase())}" role="button" tabindex="0" aria-haspopup="dialog" aria-label="${escapeHTML(item.term)}: click to view details"><span class="tag">${escapeHTML(item.category)}</span><h4>${escapeHTML(item.term)}</h4><div class="formula">$$${item.formula}$$</div></article>`).join('');
      const count = () => { const n = $$('.lex-card', grid).filter(c => !c.hidden).length; $('#lexicon-count').textContent = pluralize(n, 'term', 'terms'); };
      $('#lexicon-search', root).addEventListener('input', e => {
        const q = e.target.value.toLowerCase().trim();
        $$('.lex-card', grid).forEach(c => { c.hidden = !!q && !c.dataset.search.includes(q); });
        count();
      });
      count();

      grid.addEventListener('click', e => {
        const card = e.target.closest('.lex-card');
        if (!card) return;
        const item = doc.lexicon[card.dataset.idx];
        if (item) openLexiconModal(item);
      });
      grid.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          const card = e.target.closest('.lex-card');
          if (!card) return;
          e.preventDefault();
          const item = doc.lexicon[card.dataset.idx];
          if (item) openLexiconModal(item);
        }
      });
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


  /* ---------- the temporal matrix: a 360-day count and its clock -----------
     TWO INDEPENDENT CADENCES. The tropical year is 365.2422 rotations and the
     count is 360 dates, so a surplus of 5.2422 has to surface somewhere. It is
     put in the date boundary, and nowhere else.

     THE CLOCK is anchored to the observer's own solar day and re-anchored to it
     every day, exactly as a circadian clock re-anchors to light. Twenty-four
     living hours pass in twenty-four physical hours. 00:00 is solar midnight
     and 12:00 is peak sun, permanently, with no accumulating offset.

     THE CALENDAR advances one date every 365.2422/360 days — 24h 20m 58.13s —
     so the date turns over 20m 58s later each day and walks the whole way round
     the clock face every 68.673 days: 5.2422 times a year. That circuit is the
     surplus. Nothing is intercalated, nothing leaps, no date is skipped, and
     the equinox stays at 0° on 1 March for good.

     THE DILATION is a genuine non-linear wave inside the day, not a scalar. The
     clock races through the small hours, eases back through the morning, and
     breathes across the evening — yet closes exactly at noon and at midnight,
     so the two anchors hold while the second is never constant.
     ---------------------------------------------------------------------- */
  const CAL360 = {
    // The March equinox. Degree zero, and the anchor for the count.
    epoch: Date.UTC(2026, 2, 20, 0, 0, 0),
    tropical: 365.2422,
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

  const MS_DAY  = 86400000;
  const MS_CAL  = CAL360.tropical * MS_DAY / 360;   // 87,658,128 ms = 24h 20m 58.13s
  const LEAD_MS = MS_CAL - MS_DAY;                  //  1,258,128 ms = 20m 58.128s

  /* ── The velocity field ──────────────────────────────────────────────────
     v(φ) is physical seconds consumed per living second at position φ through
     the day. Three regimes, joined where v = 1 so the seams are invisible:

       00:00–04:00  v = 1 − b·sin⁴(6πφ)          the clock races
       04:00–12:00  v = 1 + a·sin²(3π(φ − 1/6))  the clock repays
       12:00–24:00  v = 1 + c·sin(4π(φ − ½))     the clock breathes

     b is set to the daily surplus, so by 04:00 the clock leads solar time by
     exactly 20m 58.13s. a is solved as 3b/8 so the lead is handed back and the
     ledger closes at noon. c has two whole periods, so it integrates to zero.  */
  const SLEEP_END = 1 / 6;
  const NOON      = 1 / 2;
  const VB = 16 * (LEAD_MS / MS_DAY);   // 0.232986667 — burn depth
  const VA = 3 * VB / 8;                // 0.087370000 — morning repay (solved)
  const VC = 0.02;                      // evening ripple, zero integral
  const VK = 2;                         // ripple periods across the evening

  function velocity(phi) {
    if (phi < SLEEP_END) { const s = Math.sin(6 * Math.PI * phi); return 1 - VB * s * s * s * s; }
    if (phi < NOON)      { const s = Math.sin(3 * Math.PI * (phi - SLEEP_END)); return 1 + VA * s * s; }
    return 1 + VC * Math.sin(2 * Math.PI * VK * (phi - NOON));
  }

  /* The exact antiderivative: the fraction of the solar day consumed by the
     time the living clock reaches φ. Closed form, so there is no integration
     error to accumulate.
       ∫ sin⁴(6πx) dx = 3x/8 − sin(12πx)/(24π) + sin(24πx)/(192π)  = 1/16 over [0,1/6]
       ∫ sin²(3πu) du = u/2 − sin(6πu)/(12π)                       = 1/6  over [0,1/3]
       ∫ sin(4πu)  du = (1 − cos(4πu))/(4π)                        = 0    over [0,1/2]  */
  function consumed(phi) {
    if (phi <= SLEEP_END) {
      return phi - VB * (3 * phi / 8
        - Math.sin(12 * Math.PI * phi) / (24 * Math.PI)
        + Math.sin(24 * Math.PI * phi) / (192 * Math.PI));
    }
    if (phi <= NOON) {
      const u = phi - SLEEP_END;
      return phi - VB / 16 + VA * (u / 2 - Math.sin(6 * Math.PI * u) / (12 * Math.PI));
    }
    const u = phi - NOON;
    return phi + (VC / (2 * Math.PI * VK)) * (1 - Math.cos(2 * Math.PI * VK * u));
  }

  /* Invert consumed() by bisection. v > 0 everywhere, so consumed() is strictly
     increasing and the inverse is unique. Forty halvings is far finer than a
     millisecond. */
  function livingPhase(fraction) {
    let lo = 0, hi = 1;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (consumed(mid) < fraction) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  /* The equation of time, in minutes, split into the two effects that cause it.
     Obliquity is the tilt of the axis; eccentricity is the ellipse of the orbit.
     Accurate to roughly half a minute, which is well inside what a clock shows. */
  function equationOfTime(date = new Date()) {
    const start = Date.UTC(date.getFullYear(), 0, 1);
    const here  = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    const n = Math.round((here - start) / MS_DAY) + 1;
    const b = 2 * Math.PI * (n - 81) / 365;
    const obliquity = 9.87 * Math.sin(2 * b);
    const eccentricity = -7.53 * Math.cos(b) - 1.5 * Math.sin(b);
    return { n, obliquity, eccentricity, total: obliquity + eccentricity };
  }

  /* Apparent solar time as a fraction of the day, plus the corrections that
     produced it. This is what the clock is anchored to: 0 is solar midnight,
     0.5 is peak sun. The local offset is applied explicitly. */
  function solarFraction(date = new Date(), longitude = CAL360.longitude) {
    const eot = equationOfTime(date);
    const meridian = -date.getTimezoneOffset() / 4;            // degrees east
    const correction = 4 * (longitude - meridian) + eot.total; // minutes
    const localMs = date.getTime() - date.getTimezoneOffset() * 60000;
    let ms = localMs + correction * 60000;
    ms = ((ms % MS_DAY) + MS_DAY) % MS_DAY;
    return { frac: ms / MS_DAY, correction, eot, meridian, civilMs: ((localMs % MS_DAY) + MS_DAY) % MS_DAY };
  }

  /* Where a given moment falls in the count, and where the clock stands. */
  function cal360(date = new Date(), longitude = CAL360.longitude) {
    const sol = solarFraction(date, longitude);

    /* The calendar cadence: free-running, one date every MS_CAL, read through
       the effective-epoch provider so simulation and live share one path.    */
    const elapsed  = getMatrixNow(date) - getMatrixEpoch();
    const dayCount = Math.floor(elapsed / MS_CAL);
    const within   = elapsed - dayCount * MS_CAL;
    const idx      = ((dayCount % 360) + 360) % 360;
    const N        = dayCount + 1;             // the matrix date number, 1-based

    /* The clock cadence. A matrix day is one calendar date, so the uniform
       position through the date is the modelled solar phase directly — no
       accumulation, no divergence, no drift between day and date. The wave
       redistributes time inside it; absorption flattens the wave. */
    const xDate    = N + within / MS_CAL;      // fractional matrix date
    const A        = absorbedAt(xDate);
    /* Anchored to apparent solar time, exactly as before. The wave redistributes
       time inside the solar day; absorption flattens the wave. So 12:00 is peak
       sun at every A, and the clock's departure from the sun is never more than
       the current excursion ε — minimal, and shrinking as the dilation
       normalises. A is recomputed here every tick, so the wave relaxes
       continuously rather than stepping at a rung. */
    const uniform  = sol.frac;                 // apparent solar phase
    const phi      = livingPhaseAt(uniform, A);
    const livingMs = phi * MS_DAY;
    const t        = Math.floor(livingMs / 1000);

    /* BASELINE turnover: where the free-running cadence puts the boundary. */
    const turnMs = ((sol.civilMs + (MS_CAL - within)) % MS_DAY + MS_DAY) % MS_DAY;
    const tt     = Math.floor(turnMs / 1000);

    /* MATRIX turnover (modeled): displaced from apparent solar midnight by the
       residual ε of the retained rung, so it closes on 00:00 as the load falls
       and stays there once the load reaches zero. Interpretive layer — the
       baseline value above is what the defined cadence actually gives.       */
    const level    = activeCoherenceLevel(N);
    const load     = LADDER[level].load;
    const eps      = residualMs(N);                       // discrete, from the rung
    const epsLive  = excursionMs(A);                      // continuous peak excursion
    /* The clock's live departure from the sun, bounded by ε. */
    const mt       = Math.floor(Math.abs(phi - uniform) * MS_DAY / 1000);
    const next     = nextMilestone(N);

    // Reference only: the matrix clock against present-day apparent solar time.
    let drift = livingMs - sol.frac * MS_DAY;

    return {
      dayCount, within, phi, sol, drift,
      year: Math.floor(dayCount / 360),
      month: Math.floor(idx / 30),
      day: idx % 30 + 1,
      weekday: idx % 6,
      week: Math.floor(idx % 30 / 6) + 1,
      dayIndex: idx,
      arc: idx + within / MS_CAL,
      v: velocityAt(phi, A),
      vBase: velocity(phi),
      A, xDate, uniform,
      meanRate: RATE_R,
      dayRefMs: MS_CAL,
      epsLive,
      /* how far the clock stands from steady flow right now */
      excursion: (phi - uniform) * MS_DAY,
      regime: phi < SLEEP_END ? 'burn' : phi < NOON ? 'repay' : 'ripple',
      toTurn: MS_CAL - within,
      h: Math.floor(t / 3600) % 24, m: Math.floor(t % 3600 / 60), s: t % 60,
      turnH: Math.floor(tt / 3600) % 24, turnM: Math.floor(tt % 3600 / 60), turnS: tt % 60,

      /* ── matrix layer (interpretive) ── */
      matrixDate: N,
      level, load,
      absorbed: (J0 - load) / J0,
      epsMs: eps,
      next,
      toNext: next ? next.dates - N : 0,
      /* Live approach to the next rung. This is NOT interpolated absorption:
         J and A stay stepwise. It is position within the current interval,
         which does change continuously, so the panel has something true to
         show while the clock runs. */
      dateFrac: N + within / MS_CAL,
      rungFrom: LADDER[level].dates,
      rungTo: next ? next.dates : null,
      rungProgress: next
        ? Math.min(1, Math.max(0, (N + within / MS_CAL - LADDER[level].dates) / (next.dates - LADDER[level].dates)))
        : 1,
      toNextMs: next ? (next.dates - (N + within / MS_CAL)) * MS_CAL : 0,
      nextAbsorbed: next ? next.absorbed : 1,
      /* Integrated, read continuously. This is now the CONTROL variable: it
         drives the modelled clock as well as the display. The presentation-only
         contract of the previous version is deliberately revised. */
      absorbedLive: A,
      mTurnH: Math.floor(mt / 3600) % 24, mTurnM: Math.floor(mt % 3600 / 60), mTurnS: mt % 60,
      mode: MATRIX_MODE
    };
  }


  /* ── The absorption ladder ───────────────────────────────────────────────
     BASELINE ARITHMETIC — the observed / defined layer.
     The calendar cadence is 365.2422/360 days, so the date boundary runs ahead
     of the solar day by exactly 8737/600000 of a day. That ratio is rational,
     so the Euclidean algorithm on it terminates, and one recursion yields two
     sequences at once:

       convergent denominators q_k   1, 68, 69, 206, 3365, 117981,
                                     121346, 239327, 600000
       Euclidean remainders     r_k  8737, 5884, 2853, 178, 5, 3, 2, 1, 0

     They are two views of one quantity, related exactly in integers by

         r_k = | q_k·J0 − p_k·Q |,        J0 = 8737,  Q = 600000

     where p_k/q_k is the k-th convergent. The identity is asserted below rather
     than assumed, so the table can never drift away from the arithmetic. The
     baseline statement 600000 matrix dates = 608737 defined solar days follows
     from the same ratio and is unaffected by anything in the matrix layer.

     EXPERIMENTAL INTERPRETATION — the matrix layer.
     J0 is read as the unresolved historical load the calendar carries, and Q as
     the resolution at which that load reaches exact zero — NOT as an amount of
     history. r_k is then the load still ACTIVE once coherence level k has been
     attained, and the reduction is RETAINED: the engine never reintroduces a
     residual it has already integrated, and there is no supercycle after Q.

       residual time carried by a load J    ε(J) = J/600000 × 86400 s
       integrated fraction                  A    = 1 − J/J0

     This is an interpretive layer over the baseline arithmetic, and the
     instrument labels every value that belongs to it.                        */
  const SLIP_NUM = 8737, SLIP_DEN = 600000;   // slip per date, in days, exactly
  const J0 = SLIP_NUM;                        // initial unresolved load
  const Q  = SLIP_DEN;                        // exact dual-equilibrium resolution

  function coherenceLadder() {
    const out = [];
    let num = SLIP_NUM, den = SLIP_DEN;
    let h1 = 1, h0 = 0, k1 = 0, k0 = 1;       // convergent numerators / denominators
    while (true) {
      const a = Math.floor(num / den);
      const hn = a * h1 + h0; h0 = h1; h1 = hn;
      const kn = a * k1 + k0; k0 = k1; k1 = kn;
      const r = num - a * den;                // Euclidean remainder = the active load
      /* r_k = |q_k·J0 − p_k·Q| — checked, not assumed. Products stay far inside
         the exact-integer range, so a mismatch would be a real defect.        */
      const identity = Math.abs(k1 * J0 - h1 * Q);
      if (identity !== r) console.error('[matrix] ladder identity broken at cycle', out.length, identity, r);
      out.push({
        cycle: out.length,
        dates: k1,                            // q_k — date at which the level is attained
        years: k1 / 360,
        load: r,                              // J — unresolved load still active
        absorbed: (J0 - r) / J0,              // A — integrated fraction
        residualMs: r * MS_DAY / Q,           // ε(J), milliseconds
        residual: r / Q                       // ε(J) in days (the baseline convergent error)
      });
      if (r === 0) break;
      num = den; den = r;
    }
    return out;
  }

  const LADDER = coherenceLadder();
  const CLOSURE = LADDER[LADDER.length - 1];

  /* ── Retained absorption ─────────────────────────────────────────────────
     The active state of matrix date N is the rung of the highest milestone it
     has already passed. Stepwise by construction: the mathematics gives
     discrete coherence milestones, and nothing here interpolates between them.
     A continuous absorption law would be an additional assumption; this version
     makes the fewest it can.                                                  */
  function activeCoherenceLevel(matrixDate) {
    let k = 0;
    for (let i = 0; i < LADDER.length; i++) if (matrixDate >= LADDER[i].dates) k = i;
    return k;
  }
  const unresolvedLoad     = d => LADDER[activeCoherenceLevel(d)].load;
  const absorptionFraction = d => (J0 - unresolvedLoad(d)) / J0;
  const residualSeconds    = d => unresolvedLoad(d) * 86400 / Q;
  const residualMs         = d => unresolvedLoad(d) * MS_DAY / Q;
  const nextMilestone      = d => LADDER.find(l => l.dates > d) || null;


  /* ── Progress-coupled dilation ───────────────────────────────────────────
     THE MODEL CHOICE, stated explicitly: the endpoint and the ladder do not fix
     the transition law on their own.

     The dilation is applied from day one. A matrix day is 24h 20m 58.128s of
     reference time — one calendar date — at EVERY stage, so the mean never
     moves. What absorption changes is the STRUCTURE of the dilation inside the
     day, not its total. With R = 608737/600000,

         v_A(φ) = R · [ 1 + (1 − A)(v(φ) − 1) ]
         C_A(φ) = (1 − A)·consumed(φ) + A·φ        (normalised antiderivative)

     Mean = R for all A. Amplitude scales by (1 − A). At A = 1 the wave is gone
     and the day runs at one steady rate: 24h 20m 58.128s spread evenly over 24
     clock hours. C_A(½) = ½ and C_A(1) = 1 for every A, so noon and midnight
     stay anchored throughout.

     ε IS THE RESIDUAL NON-UNIFORMITY. The clock's peak departure from steady
     flow — at 04:00 — is (1 − A)·1258.128 s, which equals the ladder residual at
     every rung exactly. It is not a turnover displacement and nothing imposes
     it: it is what the wave does, and it goes to zero as the dilation
     normalises.

     THE FRAMEWORK'S CLAIM. Earth's rotation slows through the absorption,
     quickly at first and then ever more slowly, so the solar day lengthens to
     meet the 87,658.128-second matrix day; the flow of time slows with it, and
     at date 600,000 the two are one and the dilation is fully normalised. By
     date ~259 most of the 5.2422 and most of the 8,737 are already absorbed and
     the day is close to 360 rotations of 24h 20m 58.128s. Present-day apparent
     solar time is kept on the panel as a separate, labelled reference. The
     coupling is the Science Coherence framework's proposal; NIST on
     astronomical versus atomic time and NASA on solar versus sidereal rotation
     are cited only for the standard distinction, not as support for it.      */
  const RATE_R  = (Q + J0) / Q;                 // 1.014561666… ref s per matrix s
  const RATE_C  = RATE_R - 1;                   // 8737/600000
  /* The matrix day is 87,658.128 reference seconds FROM DAY ONE. The mean never
     changes; a matrix day is always one calendar date. */
  const dayRefMs = () => MS_CAL;
  const meanAt   = () => RATE_R;

  const velocityAt = (phi, A) => RATE_R * (1 + (1 - A) * (velocity(phi) - 1));
  const consumedAt = (phi, A) => (1 - A) * consumed(phi) + A * phi;
  function livingPhaseAt(fraction, A) {
    let lo = 0, hi = 1;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (consumedAt(mid, A) < fraction) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }
  /* The residual ε is the PEAK WITHIN-DAY EXCURSION of the clock from steady
     flow, which falls at 04:00 and equals (1−A)·1258.128 s — the ladder residual
     at every rung, exactly. Nothing imposes it; it is what the wave does. */
  const excursionMs = A => (1 - A) * LEAD_MS;

  /* The continuous integrated fraction at a fractional matrix date. Linear
     within each rung interval, 1 at and beyond completion. */
  function absorbedAt(x) {
    if (x >= CLOSURE.dates) return 1;
    let k = 0;
    for (let i = 0; i < LADDER.length; i++) if (x >= LADDER[i].dates) k = i;
    const a = LADDER[k], b = LADDER[k + 1];
    if (!b) return a.absorbed;
    return a.absorbed + (b.absorbed - a.absorbed) * (x - a.dates) / (b.dates - a.dates);
  }

  /* ── The effective epoch ─────────────────────────────────────────────────
     The March 2027 run has not started. Until it does the instrument works
     against a virtual epoch written once to storage and then left to advance
     naturally, so the reader can learn the calendar from its own beginning
     rather than from the middle. Everything downstream reads the matrix clock
     through these functions, so switching to the real run is a one-line change:
     set MATRIX_MODE to 'live' once CAL360.epochLive is final.                 */
  const MATRIX_MODE = 'simulation';           // 'simulation' | 'live'
  const EPOCH_KEY   = 'sc-matrix-epoch';

  function getMatrixEpoch() {
    if (MATRIX_MODE === 'live') return CAL360.epochLive;
    let e = store.get(EPOCH_KEY, null);
    if (typeof e !== 'number' || !Number.isFinite(e)) {
      e = Date.now() - MS_CAL;                // first load opens at about matrix date 2
      store.set(EPOCH_KEY, e);
    }
    return e;
  }
  function resetMatrixEpoch() {
    const e = Date.now() - MS_CAL;
    store.set(EPOCH_KEY, e);
    return e;
  }
  const getMatrixNow = (date = new Date()) => date.getTime() - date.getTimezoneOffset() * 60000;
  const getMatrixDayCount = (date = new Date()) =>
    Math.floor((getMatrixNow(date) - getMatrixEpoch()) / MS_CAL);

  /* ── Development checks ──────────────────────────────────────────────────
     Ten assertions over the ladder, including the one that matters most:
     closure stays closed at 600001. Silent when everything holds.            */
  (function checkLadder() {
    const cases = [[1, 8737, 1258.128], [68, 5884, 847.296], [69, 2853, 410.832],
                   [206, 178, 25.632], [3365, 5, 0.72], [117981, 3, 0.432],
                   [121346, 2, 0.288], [239327, 1, 0.144], [600000, 0, 0], [600001, 0, 0]];
    const fails = [];
    cases.forEach(([n, j, s]) => {
      const gotJ = unresolvedLoad(n), gotS = residualSeconds(n);
      if (gotJ !== j) fails.push(`date ${n}: J ${gotJ} expected ${j}`);
      if (Math.abs(gotS - s) > 1e-9) fails.push(`date ${n}: ε ${gotS}s expected ${s}s`);
    });
    // Monotone descent: a rung is never reopened.
    for (let i = 1; i < LADDER.length; i++)
      if (LADDER[i].load >= LADDER[i - 1].load) fails.push(`cycle ${i}: load did not fall`);
    /* The baseline identity the whole calendar rests on, asserted in integers:
       365.2422 is not exactly representable in binary, so comparing the float
       MS_CAL would fail on rounding rather than on arithmetic. 600000 ms-exact
       calendar days and 608737 solar days are both far inside 2^53.          */
    const MS_CAL_EXACT = 87658128;            // 365.2422 × 86400000 / 360
    if (Math.round(MS_CAL) !== MS_CAL_EXACT) fails.push('baseline: MS_CAL is not 87658128 ms');
    if (Q * MS_CAL_EXACT !== (Q + J0) * MS_DAY) fails.push('baseline: 600000 dates ≠ 608737 defined solar days');
    if (fails.length) console.error('[matrix] ladder checks failed:\n  ' + fails.join('\n  '));
  })();

  /* Coupling checks — the corrected law. Silent when they hold. */
  (function checkCoupling() {
    const fails = [];
    const near = (x, y, tol, what) => { if (Math.abs(x - y) > tol) fails.push(`${what}: ${x} vs ${y}`); };
    const quad = A => { let acc = 0; const n = 20000;
      for (let i = 0; i < n; i++) { const a = i / n, b = (i + 1) / n;
        acc += (velocityAt(a, A) + 4 * velocityAt((a + b) / 2, A) + velocityAt(b, A)) / 6 / n; }
      return acc; };

    // the dilation is applied from day one: the mean never moves
    [0, 0.25, 0.5, 0.9796, 1].forEach(A => {
      near(quad(A), RATE_R, 1e-9, `mean at A=${A}`);
      near(MS_CAL / 1000, 87658.128, 1e-6, 'matrix day (s)');
      near(consumedAt(0.5, A), 0.5, 1e-12, `noon anchor at A=${A}`);
      near(consumedAt(1, A), 1, 1e-12, `midnight anchor at A=${A}`);
    });
    // at completion the wave is gone: one steady rate all day
    [0, 0.08, 0.25, 0.5, 0.77, 0.99].forEach(p =>
      near(velocityAt(p, 1), RATE_R, 1e-12, `v(${p}) at A=1`));
    near(360 * MS_CAL / 1000, 365.2422 * 86400, 1e-3, '360 matrix days (s)');
    near(1 / RATE_R, 0.985647332099084, 1e-12, 'displayed rate at completion');

    // ε is the peak excursion from steady flow, and it IS the ladder residual
    LADDER.forEach(L => {
      let peak = 0;
      for (let i = 0; i <= 20000; i++) { const u = i / 20000;
        peak = Math.max(peak, Math.abs(consumedAt(u, L.absorbed) - u)); }
      near(peak * MS_DAY, L.residualMs, 1e-3, `peak excursion at rung ${L.cycle}`);
      near(excursionMs(L.absorbed), L.residualMs, 1e-6, `excursionMs at rung ${L.cycle}`);
    });
    // retained: nothing reopens after completion
    [600000, 600001, 700000, 5e6].forEach(d => {
      near(absorbedAt(d), 1, 0, `A at date ${d}`);
      near(velocityAt(0.3, absorbedAt(d)), RATE_R, 1e-12, `no wave at date ${d}`);
      near(excursionMs(absorbedAt(d)), 0, 0, `zero excursion at date ${d}`);
    });
    /* The clock never runs backwards in real time. Sampled across a rung
       boundary in steps of ~0.09 s, the phase must strictly advance: A crawls
       far too slowly for its effect on C_A to overtake the day's own motion. */
    for (const centre of [68, 206, 3365, 600000]) {
      let prev = -Infinity, back = 0;
      for (let i = 0; i <= 2000; i++) {
        const x = centre - 0.001 + i * 1e-6;
        const ph = livingPhaseAt(x - Math.floor(x), absorbedAt(x));
        /* a drop from near 1 to near 0 is midnight rolling over, not a jump */
        if (ph < prev && !(prev > 0.9 && ph < 0.1)) back++;
        prev = ph;
      }
      if (back) fails.push(`clock went backwards ${back}× across rung at date ${centre}`);
    }
    if (fails.length) console.error('[matrix] coupling checks failed:\n  ' + fails.join('\n  '));
  })();

  window.__matrixClock = {
    RATE_R, RATE_C, meanAt, dayRefMs, velocityAt, consumedAt, livingPhaseAt,
    absorbedAt, excursionMs
  };
  window.__matrix = {
    LADDER, J0, Q, coherenceLadder, activeCoherenceLevel,
    unresolvedLoad, absorptionFraction, residualSeconds,
    getMatrixEpoch, getMatrixDayCount, mode: MATRIX_MODE
  };

  function calendar360(root) {
    const el = k => $(`[data-cal="${k}"]`, root);
    const pad = n => String(n).padStart(2, '0');
    const sign = n => (n < 0 ? '−' : '+') + Math.abs(n).toFixed(2);
    const mmss = ms => {
      const x = Math.abs(Math.round(ms / 1000));
      return `${x < 3600 ? '' : Math.floor(x / 3600) + 'h '}${pad(Math.floor(x / 60) % 60)}m ${pad(x % 60)}s`;
    };
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
        cells += `<div class="cal-day${isToday ? ' today' : ''}" data-accent="${CAL360.days[weekday].accent}" role="gridcell"${isToday ? ' aria-current="date"' : ''}><span class="cal-num">${i + 1}</span><span class="cal-dayname">${CAL360.days[weekday].short}</span></div>`;
      }
      el('grid').innerHTML = head + cells;
    }

    /* The velocity field, drawn across one day, with the sleep window shaded,
       noon marked, and a marker riding the curve at the present moment. */
    function drawCurve(phi, A) {
      const node = el('curve');
      if (!node) return;
      const W = 320, H = 74, P = 6;
      const vs = []; let lo = Infinity, hi = -Infinity;
      for (let i = 0; i <= 240; i++) { const v = velocityAt(i / 240, A); vs.push(v); if (v < lo) lo = v; if (v > hi) hi = v; }
      const pad2 = (hi - lo) * 0.16 || 0.02;
      lo -= pad2; hi += pad2;
      const x = f => P + f * (W - 2 * P);
      const y = v => P + (1 - (v - lo) / (hi - lo)) * (H - 2 * P);
      let d = '';
      for (let i = 0; i <= 240; i++) d += (i ? 'L' : 'M') + x(i / 240).toFixed(1) + ' ' + y(vs[i]).toFixed(1);
      node.setAttribute('viewBox', `0 0 ${W} ${H}`);
      node.innerHTML =
        `<rect x="0" y="0" width="${x(SLEEP_END)}" height="${H}" class="cal-curve-sleep"/>`
        + `<line x1="${x(NOON)}" y1="0" x2="${x(NOON)}" y2="${H}" class="cal-curve-noon"/>`
        + (lo <= 1 && hi >= 1 ? `<line x1="0" y1="${y(1)}" x2="${W}" y2="${y(1)}" class="cal-curve-unity"/>` : '')
        + `<path d="${d}" class="cal-curve-line"/>`
        + `<circle cx="${x(phi).toFixed(1)}" cy="${y(velocityAt(phi, A)).toFixed(1)}" r="4" class="cal-curve-dot"/>`;
    }

    /* The ladder only changes when the matrix date changes, so it is cached. */
    let ladderAt = -1;
    const epsText = ms => {
      const x = ms / 1000;
      if (x === 0) return 'exactly 0';
      if (x < 60) return x.toFixed(3) + ' s';
      const sec = (x % 60).toFixed(3);
      return Math.floor(x / 60) + 'm ' + (sec.indexOf('.') === 1 ? '0' + sec : sec) + 's';
    };
    const pct = a => (a * 100).toLocaleString('en-GB', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) + ' %';
    /* Six decimals for the live readings: a rung interval runs to months, so at
       four the number would sit still long enough to look broken. */
    const live = a => (a * 100).toLocaleString('en-GB', { minimumFractionDigits: 6, maximumFractionDigits: 6 }) + ' %';

    function drawLadder(N) {
      const node = el('ladder');
      if (!node || N === ladderAt) return;
      ladderAt = N;
      const here = activeCoherenceLevel(N);
      const rows = LADDER.map(L => {
        const reached = N >= L.dates;
        const cls = L.cycle === here ? ' class="here"' : reached ? ' class="reached"' : '';
        return `<tr${cls}>`
          + `<td>${L.cycle}</td>`
          + `<td>${L.dates.toLocaleString('en-GB')}</td>`
          + `<td>${L.load.toLocaleString('en-GB')}</td>`
          + `<td>${epsText(L.residualMs)}</td>`
          + `<td>${pct(L.absorbed)}</td>`
          + `<td>${reached ? (L.cycle === here ? 'active' : 'held') : 'in ' + (L.dates - N).toLocaleString('en-GB')}</td>`
          + `</tr>`;
      }).join('');
      node.innerHTML =
        `<thead><tr><th>Rung</th><th>Matrix date</th><th>Active J</th><th>Residual</th><th>Integrated</th><th>State</th></tr></thead>`
        + `<tbody>${rows}</tbody>`;
    }

    /* A long span as days / hours / minutes / seconds, ticking. */
    const dhms = ms => {
      let x = Math.max(0, Math.floor(ms / 1000));
      const d = Math.floor(x / 86400); x -= d * 86400;
      const h = Math.floor(x / 3600);  x -= h * 3600;
      const m = Math.floor(x / 60);    x -= m * 60;
      return (d ? d + 'd ' : '') + (d || h ? pad(h) + 'h ' : '') + pad(m) + 'm ' + pad(x) + 's';
    };

    /* The absorption state: everything here belongs to the matrix layer.
       Two meters, deliberately separate — the integrated fraction is stepwise
       and only moves when a rung is attained; the approach meter is live and
       shows position within the current interval. Conflating them would imply
       a continuous absorption law the mathematics does not give.            */
    function drawAbsorption(t) {
      el('m-datefrac').textContent = t.dateFrac.toLocaleString('en-GB', { minimumFractionDigits: 5, maximumFractionDigits: 5 });
      /* Six decimals, not four: a rung interval is ~68 days, so at four the
         reading would sit still for a quarter of an hour and look broken. */
      el('m-approach').textContent = live(t.rungProgress);
      const app = el('m-approach-bar');
      if (app) {
        app.style.width = (t.rungProgress * 100).toFixed(4) + '%';
        app.parentElement.setAttribute('aria-valuenow', (t.rungProgress * 100).toFixed(2));
      }
      el('m-approach-label').textContent = t.next
        ? `rung ${t.level} → ${t.next.cycle} · J ${t.load.toLocaleString('en-GB')} → ${t.next.load.toLocaleString('en-GB')} at date ${t.next.dates.toLocaleString('en-GB')}`
        : 'exact dual equilibrium — nothing left to approach';
      el('m-date').textContent = t.matrixDate.toLocaleString('en-GB');
      el('m-rung').textContent = `${t.level} of ${LADDER.length - 1}`;
      el('m-load').textContent = t.load.toLocaleString('en-GB');
      el('m-load0').textContent = J0.toLocaleString('en-GB');
      el('m-absorbed').textContent = live(t.absorbedLive);
      el('m-remaining').textContent = live(1 - t.absorbedLive);
      el('m-residual').textContent = epsText(t.epsMs);
      (el('m-turnover')||{}).textContent = `${(Math.abs(t.excursion) / 1000).toFixed(3)} s`;
      el('m-next').textContent = t.next
        ? `rung ${t.next.cycle} · J ${t.next.load.toLocaleString('en-GB')} at date ${t.next.dates.toLocaleString('en-GB')}`
        : 'none — exact dual equilibrium reached';
      el('m-tonext').textContent = t.next
        ? `${t.toNext.toLocaleString('en-GB')} dates · ${dhms(t.toNextMs)}`
        : '—';
    }

    const REGIME = {
      burn:   { label: 'Sleep burn — the clock is racing', accent: 'violet' },
      repay:  { label: 'Morning repay — the clock is easing', accent: 'amber' },
      ripple: { label: 'Evening ripple — noon and midnight locked', accent: 'teal' }
    };

    function tick() {
      const t = cal360();
      el('clock').textContent = `${pad(t.h)}:${pad(t.m)}:${pad(t.s)}`;
      const r = REGIME[t.regime];
      const badge = el('regime');
      badge.textContent = r.label;
      badge.setAttribute('data-accent', r.accent);
      el('vector').textContent = `${t.v.toFixed(6)}×`;
      el('rate').textContent = `${(1 / t.v).toFixed(4)}× solar`;
      el('meanrate').textContent = `${t.meanRate.toFixed(9)}× · constant`;
      el('daylen').textContent = `${(t.dayRefMs / 1000).toFixed(3)} s = 24h 20m 58.128s`;
      el('amp').textContent = `${((1 - t.A) * 100).toFixed(6)} % of full`;
      (el('excursion')||{}).textContent = `${(t.excursion / 1000).toFixed(3)} s`;
      el('peakexc').textContent = `${(t.epsLive / 1000).toFixed(6)} s`;
      el('actualsolar').textContent = (() => {
        const x = Math.floor(t.sol.frac * 86400);
        return `${pad(Math.floor(x / 3600))}:${pad(Math.floor(x % 3600 / 60))}:${pad(x % 60)}`;
      })();
      el('phase').textContent = `${(t.phi * 100).toFixed(3)} %`;
      el('drift').textContent = `${t.drift < 0 ? '−' : '+'}${mmss(t.drift)}`;
      drawCurve(t.phi, t.A);

      el('caldaylen').textContent = `${(MS_CAL / 3600000).toFixed(4)} h`;
      el('turnover').textContent = `${pad(t.turnH)}:${pad(t.turnM)}:${pad(t.turnS)}`;
      el('toturn').textContent = mmss(t.toTurn);
      el('slip').textContent = `+${(LEAD_MS / 60000).toFixed(4)} min / day`;
      el('cycle').textContent = `${(MS_DAY / LEAD_MS).toFixed(3)} days`;
      el('arc').textContent = `${t.arc.toFixed(3)}°`;

      el('offset').textContent = `${sign(4 * (CAL360.longitude - t.sol.meridian))} min`;
      el('eot-total').textContent = `${sign(t.sol.eot.total)} min`;
      el('eot-ecc').textContent = `${sign(t.sol.eot.eccentricity)} min`;
      el('eot-obl').textContent = `${sign(t.sol.eot.obliquity)} min`;

      drawLadder(t.matrixDate);
      drawAbsorption(t);
      el('closure').textContent = `${CLOSURE.dates.toLocaleString('en-GB')} dates`;
      el('closure-years').textContent = `${(CLOSURE.years).toFixed(2)} years`;
      el('closure-resid').textContent = CLOSURE.residual === 0 ? 'exactly zero' : CLOSURE.residual.toExponential(2);
      el('closure-days').textContent = `${(Q + J0).toLocaleString('en-GB')} defined solar days`;

      el('today').innerHTML = `Matrix date <strong>${t.matrixDate.toLocaleString('en-GB')}</strong> — <strong>${CAL360.days[t.weekday].name} ${t.day} ${CAL360.months[t.month]}</strong>, week ${t.week} of 5, day ${t.dayIndex + 1} of 360, year ${t.year} of the count. Rung ${t.level}: <strong>J = ${t.load.toLocaleString('en-GB')}</strong>, ${pct(t.absorbed)} integrated, modeled turnover <strong>${epsText(t.epsMs)}</strong> after solar midnight.`;
      if (follow && t.month !== shown) { shown = t.month; drawGrid(); }
    }

    /* Simulation state. The banner is not decoration: it is what keeps a
       modeled value from being read as an observation. */
    const modeNode = el('mode');
    if (modeNode) modeNode.textContent = MATRIX_MODE === 'simulation'
      ? 'Study / simulation mode — virtual epoch, not the March 2027 run'
      : 'Live run';
    const resetBtn = el('reset-epoch');
    if (resetBtn) {
      if (MATRIX_MODE !== 'simulation') resetBtn.hidden = true;
      else resetBtn.addEventListener('click', () => {
        resetMatrixEpoch();
        ladderAt = -1; follow = true;
        const t = cal360(); shown = t.month;
        drawGrid(); tick();
        toast('Training epoch reset to one matrix date ago.');
      });
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

  function closeLexModal() {
    const dlg = $('#lexicon-dialog');
    if (!dlg || !dlg.open) return;
    dlg.classList.add('closing');
    const onEnd = () => {
      dlg.classList.remove('closing');
      dlg.removeEventListener('animationend', onEnd);
      if (dlg.open) dlg.close();
    };
    dlg.addEventListener('animationend', onEnd);
    setTimeout(onEnd, 220);
  }

  function openLexiconModal(item) {
    const dlg = $('#lexicon-dialog');
    if (!dlg || !item) return;
    $('#lex-dialog-category').textContent = item.category;
    $('#lex-dialog-term').textContent = item.term;
    $('#lex-dialog-formula').innerHTML = `$$${item.formula}$$`;
    $('#lex-dialog-desc').innerHTML = `<p>${item.desc}</p>`;
    loadKatex().then(() => renderMath(dlg)).catch(() => {});
    dlg.classList.remove('closing');
    dlg.showModal();
  }

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
    if (page === 'ethos') { location.replace('#/research'); return; }
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
    $('#search-dialog').close(); $('#link-dialog').close(); $('#lexicon-dialog')?.close();
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
  $('#lex-dialog-close')?.addEventListener('click', closeLexModal);
  $('#lexicon-dialog')?.addEventListener('cancel', e => { e.preventDefault(); closeLexModal(); });
  $('#global-search').addEventListener('input', search);
  $('#search-results').addEventListener('click', e => { if (e.target.closest('a')) $('#search-dialog').close(); });
  $$('dialog').forEach(d => d.addEventListener('click', e => {
    if (e.target === d) {
      if (d.id === 'lexicon-dialog') closeLexModal();
      else d.close();
    }
  }));
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
