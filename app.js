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
  /* Page copy: the text of the main pages, authored in pages.js (window.SC_PAGES)
     and edited in the Writing Room. Each call carries the original wording as
     its fallback, so a page opened without pages.js still reads the same. */
  const PAGE_COPY = new Map((Array.isArray(window.SC_PAGES) ? window.SC_PAGES : [])
    .flatMap(p => (p.fields || []).map(f => [p.id + ' ' + f.key, f.value])));
  const copy = (page, key, fallback) => {
    const value = PAGE_COPY.get(page + ' ' + key);
    return typeof value === 'string' ? value : fallback;
  };
  // The protocol lives at its own top-level route; everything else is a reader page.
  const link = id => (window.SC_DOCUMENTS || []).some(d => d.id === id) ? '#/protocol' : '#/read/' + id;
  const newest = (a, b) => b.date.localeCompare(a.date);

  /* THREE WAYS OF CLASSIFYING A PIECE, kept apart:
       section    — where it lives on the site and in the menu (Research, The Lab,
                    Transmissions…). An article's `category` is its section id.
                    Authored in sections.js (window.SC_SECTIONS).
       collection — a named group inside a section (Research: 01 Framework …
                    05 Notes & Methods). An article's `collection` is its id.
                    Authored in collections.js (window.SC_COLLECTIONS), which the
                    Writing Room can extend and rename.
       type       — what kind of piece it is (Research article, Collection
                    introduction…). Free text on the article; the Library
                    classifies by it.
     The arrays below are only fallbacks for a page opened without those files;
     keep them in step. */
  const defaultSections = [
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
    { id: 'protocol', name: 'The Protocol', short: 'Protocol', num: '05', symbol: 'lattice', standalone: true, acceptsArticles: false, description: 'The operating document: the recursion carried down to the body.', intro: 'The recursion, run.', label: 'Operating document' }
  ];
  const sections = Array.isArray(window.SC_SECTIONS) && window.SC_SECTIONS.length
    ? window.SC_SECTIONS
    : defaultSections;
  const defaultCollections = [
    {
      "id": "framework",
      "section": "research",
      "num": "01",
      "name": "Framework",
      "description": "The generative architecture of reality, recursion, and self-maintaining systems: possibility spaces, vacuum structure, physical selection, and the loop that holds across scales.",
      "tagline": "Generative principles · recursion · reality selection · failure conditions",
      "connected": [
        {
          "href": "#/protocol",
          "name": "The Protocol"
        },
        {
          "href": "#/read/ethos-of-being",
          "name": "The Ethos of Being"
        },
        {
          "href": "#/lab",
          "name": "The Lab"
        },
        {
          "href": "#/research/notes-methods",
          "name": "Notes & Methods"
        }
      ],
      "order": [
        "time-crystalline-v2",
        "imagination-generative-principle",
        "reality-survives-recursion",
        "universe-biological-computer"
      ]
    },
    {
      "id": "philosophy",
      "section": "research",
      "num": "02",
      "name": "Philosophy",
      "description": "The philosophical foundation and first principles: that there is no vantage point outside the process from which the process can be judged. Being, perception, consciousness, and participation in what becomes.",
      "tagline": "Foundations · ontology · recursion · consciousness",
      "connected": [
        {
          "href": "#/research/framework",
          "name": "Framework"
        },
        {
          "href": "#/principles",
          "name": "Editorial principles"
        },
        {
          "href": "#/about",
          "name": "About the inquiry"
        },
        {
          "href": "#/read/start-here",
          "name": "Start here"
        }
      ],
      "order": [
        "ethos-of-being"
      ]
    },
    {
      "id": "meta-mathematics",
      "section": "research",
      "num": "03",
      "name": "Meta-Mathematics",
      "description": "Formal mathematical structures, operator algebra, and symbolic notation for generative differentiation, recursive invariants, and topological boundary operators.",
      "tagline": "Formal models · operators · topological invariance · recursion rules",
      "connected": [
        {
          "href": "#/research/framework",
          "name": "Framework"
        },
        {
          "href": "#/read/research-method",
          "name": "Making imagination a testable reality"
        },
        {
          "href": "#/lab",
          "name": "The Lab"
        }
      ],
      "order": []
    },
    {
      "id": "biophysic",
      "section": "research",
      "num": "04",
      "name": "Biophysic",
      "description": "The biological interface where recursive coherence meets living tissue: interfacial exclusion-zone water, chromatin architecture, proton charge dynamics, and thermodynamic entropy reversal.",
      "tagline": "Interfacial water · chromatin · proton dynamics · cellular coherence",
      "connected": [
        {
          "href": "#/protocol/holographic",
          "name": "Holographic Biophysics"
        },
        {
          "href": "#/protocol",
          "name": "The Protocol"
        },
        {
          "href": "#/read/regenesis",
          "name": "Regenesis"
        },
        {
          "href": "#/research/framework",
          "name": "Framework"
        }
      ],
      "order": [
        "regenesis"
      ]
    },
    {
      "id": "notes-methods",
      "section": "research",
      "num": "05",
      "name": "Notes & Methods",
      "description": "Methodological criteria, reader entryways, and working notes on testing propositions, biological renewal, and navigating the connections across the library.",
      "tagline": "Methodology · testability · orientation · renewal",
      "connected": [
        {
          "href": "#/read/start-here",
          "name": "Start here"
        },
        {
          "href": "#/research/framework",
          "name": "Framework"
        },
        {
          "href": "#/lab",
          "name": "The Lab"
        },
        {
          "href": "#/library",
          "name": "The Library"
        }
      ],
      "order": [
        "research-method",
        "start-here"
      ]
    }
  ];
  const COLLECTIONS = (Array.isArray(window.SC_COLLECTIONS) && window.SC_COLLECTIONS.length
    ? window.SC_COLLECTIONS
    : defaultCollections).map(c => ({ ...c, label: c.name }));
  const collectionOf = a => a && a.collection ? COLLECTIONS.find(c => c.id === a.collection && c.section === a.category) : null;
  /* The Research page's tabs: the collections of the research section, in number order. */
  const RESEARCH_CATEGORIES = COLLECTIONS.filter(c => c.section === 'research')
    .sort((a, b) => String(a.num).localeCompare(String(b.num), undefined, { numeric: true }));
  const category = id => sections.find(c => c.id === id);
  /* A collection's pieces are the articles that name it. Its `order` lists
     pieces that should lead, in that order; any others follow, newest first. */
  function collectionItems(c) {
    const order = c.order || [];
    const rank = a => { const i = order.indexOf(a.id); return i < 0 ? Infinity : i; };
    return listed().filter(a => a.category === c.section && a.collection === c.id).sort((a, b) => rank(a) - rank(b) || newest(a, b));
  }
  const inCollection = id => ALL.filter(x => x.category === id).sort(newest);
  // Hidden sections stay reachable by direct URL but appear in no listing.
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

  /* Homepage plates: geometric constructions, not experimental readouts.
     The sampling counts and radii below control drawing resolution and layout. */
  function homePlate(kind) {
    const f = n => n.toFixed(2);
    const path = points => points.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`).join(' ');
    const line = (points, opacity = .5, width = .8) => `<path d="${path(points)}" opacity="${opacity}" stroke-width="${width}"/>`;
    const dot = (x, y, r = 2, opacity = .8) => `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="currentColor" stroke="none" opacity="${opacity}"/>`;
    const sample = (n, fn) => Array.from({ length: n + 1 }, (_, i) => fn(i / n));
    let drawing = '';
    const guides = `<g opacity=".19" stroke-width=".7"><circle cx="180" cy="180" r="154" stroke-dasharray="1 5"/><path d="M16 180h328M180 16v328" stroke-dasharray="2 7"/></g><g opacity=".65" stroke-width=".8"><path d="M180 20v10m-5-5h10M180 330v10m-5-5h10M20 180h10m-5-5v10M330 180h10m-5-5v10"/></g>`;

    if (kind === 'recursion') {
      // A toroidal field: each path returns through the same connected surface.
      const project = (u, v) => {
        const radius = 91 + 42 * Math.cos(v);
        const x = radius * Math.cos(u), y = radius * Math.sin(u), z = 42 * Math.sin(v);
        return [180 + x * .94 + y * .22, 180 + y * .52 - z * 1.2 - x * .25];
      };
      for (let i = 0; i < 32; i++) {
        const u = i / 32 * Math.PI * 2;
        drawing += line(sample(80, t => project(u, t * Math.PI * 2)), .22 + .3 * (1 + Math.sin(u)) / 2, .75);
      }
      for (let i = 0; i < 19; i++) {
        drawing += line(sample(120, t => project(t * Math.PI * 2, i / 19 * Math.PI * 2)), i % 3 ? .3 : .64, i % 3 ? .65 : .9);
      }
      const loop = sample(240, t => project(t * Math.PI * 2, t * Math.PI * 6));
      drawing += line(loop, .95, 1.45);
      for (let i = 0; i < 12; i++) drawing += dot(...project(i / 12 * Math.PI * 2, i / 12 * Math.PI * 6), 2.3, .95);
      drawing += `<g opacity=".3" stroke-width=".65"><ellipse cx="180" cy="180" rx="145" ry="136" transform="rotate(-24 180 180)"/><circle cx="180" cy="180" r="10" stroke-dasharray="1 4"/></g>`;
    } else if (kind === 'recurrence') {
      // Successive cycles with matching phase positions linked through the stack.
      const cycle = (layer, t) => {
        const a = t * Math.PI * 2;
        return [180 + 112 * Math.cos(a), 91 + layer * 29 + 29 * Math.sin(a) + 8 * Math.sin(3 * a)];
      };
      for (let j = 0; j < 24; j++) {
        const t = j / 24;
        drawing += line(Array.from({length:7}, (_, i) => cycle(i, t)), j % 3 ? .15 : .35, .7);
      }
      for (let i = 0; i < 7; i++) {
        drawing += line(sample(160, t => cycle(i, t)), .32 + i * .09, i === 6 ? 1.35 : .85);
        drawing += line(sample(40, t => cycle(i, .50 + t * .22)), .9, 1.65);
        for (let j = 0; j < 8; j++) drawing += dot(...cycle(i, j / 8), j % 2 ? 1.4 : 2.4, .5 + i * .065);
      }
      drawing += `<g opacity=".45" stroke-width=".7"><path d="M49 69v219m-5-219h10m-10 219h10M311 69v219m-5-219h10m-10 219h10"/>${Array.from({length:7}, (_,i)=>`<path d="M45 ${91+i*29}h8M307 ${91+i*29}h8"/>`).join('')}</g>`;
    } else if (kind === 'emergence') {
      // Radial families become denser and form a persistent woven boundary.
      for (let i = 0; i < 34; i++) {
        const a = i / 34 * Math.PI * 2;
        drawing += line(sample(72, t => {
          const r = 24 + t * 113;
          const angle = a + 1.2 * t + .15 * Math.sin(t * Math.PI * 2);
          return [180 + r * Math.cos(angle), 180 + r * Math.sin(angle) * .88];
        }), i % 3 ? .32 : .72, i % 3 ? .65 : 1);
      }
      for (let i = 0; i < 14; i++) {
        const r = 34 + i * 8;
        drawing += line(sample(160, t => {
          const a = t * Math.PI * 2;
          const rr = r + 5 * Math.sin(a * 5 + i * .32);
          return [180 + rr * Math.cos(a), 180 + rr * Math.sin(a) * .88];
        }), .2 + i * .025, .65);
      }
      for (let i = 0; i < 89; i++) {
        const a = i * Math.PI * (3 - Math.sqrt(5)), r = 3.25 * Math.sqrt(i);
        drawing += dot(180 + r * Math.cos(a), 180 + r * Math.sin(a), 1.35, .72);
      }
    } else if (kind === 'resonance') {
      // A family of modulated wavefronts: a voice carried through successive traces.
      for(let i=0;i<25;i++){
        drawing+=line(sample(180,t=>{
          const x=42+t*276;
          const envelope=Math.pow(Math.sin(Math.PI*t),1.5);
          const y=108+i*6+envelope*(32*Math.sin(t*Math.PI*4-i*.12)+15*Math.sin(t*Math.PI*8+i*.08));
          return [x,y];
        }),i%4?.3:.85,i%4?.7:1.15);
      }
      for(let i=0;i<9;i++){
        const x=52+i*32;
        drawing+=line([[x,71],[x,289]],.17,.6);
        drawing+=dot(x,289,1.5,.55);
      }
    } else {
      // Local organizations share paths and repeat within the larger whole.
      const centers = Array.from({length:7}, (_,i)=> i === 6 ? [180,180] : [180+87*Math.cos(i*Math.PI/3),180+87*Math.sin(i*Math.PI/3)]);
      for (let i=0;i<6;i++) {
        drawing += line([centers[i], centers[6], centers[(i+2)%6]], .3, .85);
        drawing += line([centers[i], centers[(i+1)%6]], .4, .8);
      }
      centers.forEach(([x,y], i)=>{
        for(let j=0;j<7;j++) {
          drawing += line(sample(100,t=>{
            const a=t*Math.PI*2, r=24+j*2.8+3*Math.cos(3*a+i*.5);
            return [x+r*Math.cos(a),y+r*Math.sin(a)];
          }), .23+j*.065, .65);
        }
        for(let j=0;j<13;j++){
          const a=j*Math.PI*(3-Math.sqrt(5)), r=4*Math.sqrt(j);
          drawing+=dot(x+r*Math.cos(a),y+r*Math.sin(a),1.5,.8);
        }
      });
    }
    return `<svg class="home-plate" viewBox="0 0 360 360" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${guides}${drawing}</svg>`;
  }

  function homeCardArt(article) {
    const id = article.id;
    if (article.category === 'lab') return homePlate('recurrence');
    if (id === 'imagination-generative-principle') return homePlate('emergence');
    if (id === 'universe-biological-computer' || article.collection === 'biophysic') return homePlate('organization');
    return homePlate('recursion');
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
  function card(a, homepage = false) {
    return `<a class="article-card" href="${link(a.id)}"><div class="article-art ${a.tone}">${homepage === true && a.kind !== 'document' ? homeCardArt(a) : art(a.kind === 'document' ? 'lattice' : category(a.category).symbol)}</div><div class="article-meta"><span>${a.type}</span><span>${a.minutes} min read</span></div><h3>${a.title}</h3><p>${a.description}</p><div class="article-bottom"><span>${fmtDate(a.date)}</span><span aria-hidden="true">Read the piece ↗</span></div></a>`;
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
    return `<section class="hero"><div class="wrap"><div class="hero-top"><span class="eyebrow">${copy('home','hero.eyebrow',`Coherence. Recursion. What holds.`)}</span><span class="edition">${copy('home','hero.edition',`FIELD NOTES / VOL. 01 — 2026`)}</span></div><div class="hero-layout"><div class="hero-copy"><h1>${copy('home','hero.title',`Nothing is<br><em>observed</em> from<br>outside.`)}</h1><p>${copy('home','hero.text',`There is no vantage point beyond the process. What is real is what survives the loop — selected, integrated, and fed back into the conditions that produced it. This is that inquiry, and the work it has become.`)}</p><div class="hero-links"><a class="button primary" href="#/research">${copy('home','hero.button',`Begin with Research`)} <span>↗</span></a><a class="text-link" href="${link('start-here')}">${copy('home','hero.link',`A place to begin`)} <span>→</span></a></div></div><div class="hero-art">${livingArt()}<span class="art-label one">${copy('home','hero.figure',`Fig. 01 / Patterns of becoming`)}</span><span class="art-label two">${copy('home','hero.figureNote',`From one, a living whole.`)}</span></div></div><div class="hero-bottom"><span>${copy('home','hero.byline',`A living body of work by Dr. William Conroy`)}</span><span>${copy('home','hero.formula',`∇Φ ⟶ Λ ⟶ Ω ⟶ ∆`)}</span><a href="#/library">${copy('home','hero.libraryLink',`Open the library ↓`)}</a></div></div></section>
    <div class="wrap">
      <div class="intro-line"><span class="eyebrow">${copy('home','intro.eyebrow',`The thread that connects it`)}</span><p>${copy('home','intro.text',`What if understanding ourselves and understanding the world are not two inquiries, but one loop closing?`)}</p></div>
      <section class="section" style="padding-bottom:0"><div class="feature light"><div class="feature-art">${homePlate('recursion')}<span class="diagram-caption">${copy('home','research.figure',`FIG. 02 — PHILOSOPHY · MODELS · QUESTIONS`)}</span></div><div class="feature-copy"><span class="eyebrow">${copy('home','research.eyebrow',`Research`)}</span><h2>${copy('home','research.title',`One inquiry,<br>made explicit.`)}</h2><p>${copy('home','research.text',`The philosophical foundation and the frameworks built from it: being, perception, the recursive loop, consciousness, time, and the patterns that hold living systems together.`)}</p><div class="feature-meta">${pluralize(research.length, 'piece', 'pieces')} · ${copy('home','research.meta',`philosophy · frameworks · failure conditions`)}</div><a class="button dark" href="#/research">${copy('home','research.button',`Open Research`)} <span>↗</span></a></div></div></section>
      <section class="section" style="padding-bottom:0"><div class="feature"><div class="feature-art">${homePlate('recurrence')}<span class="diagram-caption">${copy('home','lab.figure',`FIG. 03 — PROPOSITIONS, RUN`)}</span></div><div class="feature-copy"><span class="eyebrow">${copy('home','lab.eyebrow',`The Lab`)}</span><h2>${copy('home','lab.title',`Where an idea<br>meets what happens.`)}</h2><p>${copy('home','lab.text',`Experimental articles: propositions taken out of argument and run, with what is varied, what is watched, and what would count as failure stated up front.`)}</p><div class="feature-meta">${pluralize(experiments.length, 'experiment', 'experiments')} · ${copy('home','lab.meta',`observations · failure conditions`)}</div><a class="button dark" href="#/lab">${copy('home','lab.button',`Open The Lab`)} <span>↗</span></a></div></div></section>
      ${doc ? `<section class="section" style="padding-bottom:0"><div class="feature document"><div class="feature-art">${latticeArt()}<span class="diagram-caption">${copy('home','protocol.figure',`FIG. 04 — THE GENOME · WATER · CONSCIOUSNESS AXIS`)}</span></div><div class="feature-copy"><span class="eyebrow">${copy('home','protocol.eyebrow',`The operating document`)}</span><h2>${doc.title}.</h2><p>${copy('home','protocol.text',`The loop carried down to the body: entropy reversal across the chromatin–water matrix, a three-tier daily protocol, and a mind-recoding engine that treats the observer as the boundary operator it is.`)}</p><div class="fact-strip">${doc.facts.map(f => `<div><b>${f.value}</b><span>${f.label}</span></div>`).join('')}</div><div class="feature-meta">Version ${doc.version} · ${doc.sections.length} sections · ${doc.minutes} min · interactive</div><a class="button dark" href="#/protocol">${copy('home','protocol.button',`Open the protocol`)} <span>↗</span></a></div></div></section>` : ''}
      ${voices.length ? `<section class="section" style="padding-bottom:0"><div class="feature"><div class="feature-art">${homePlate('resonance')}<span class="diagram-caption">${copy('home','transmissions.figure',`FIG. 05 — SPOKEN FIRST, THEN WRITTEN`)}</span></div><div class="feature-copy"><span class="eyebrow">${copy('home','transmissions.eyebrow',`Transmissions`)}</span><h2>${copy('home','transmissions.title',`Said out loud<br>before it was written.`)}</h2><p>${copy('home','transmissions.text',`Voice-originated writing. What gets said when there is no argument to win — on being here, becoming honest, and listening closely enough to hear it back.`)}</p><div class="feature-meta">${pluralize(voices.length, 'transmission', 'transmissions')} · latest ${fmtDate(voices[0].date)}</div><a class="button dark" href="#/transmissions">${copy('home','transmissions.button',`Open the transmissions`)} <span>↗</span></a></div></div></section>` : ''}
      <section class="section"><div class="section-head"><div><span class="eyebrow">${copy('home','recent.eyebrow',`Recent work`)}</span><h2>${copy('home','recent.title',`Where the loop is running.`)}</h2></div><a class="text-link" href="#/library">${copy('home','recent.link',`The complete library`)} <span>↗</span></a></div><div class="article-grid">${latest.map(a => card(a, true)).join('')}</div></section>
      <section class="manifesto"><span class="eyebrow">${copy('home','manifesto.eyebrow',`A foundational research text`)}</span><div><blockquote>${copy('home','manifesto.quote',`Being. Perceiving.<br>Participating in what becomes.`)}</blockquote><p class="signature">${copy('home','manifesto.signature',`THE ETHOS OF BEING / RESEARCH &amp; PHILOSOPHICAL INQUIRY`)}</p><a href="${link('ethos-of-being')}" class="text-link">${copy('home','manifesto.link',`Read The Ethos of Being`)} <span>↗</span></a></div></section>
      ${pathBanner(copy('home','banner.title','Follow your curiosity.'), copy('home','banner.text','Search across the framework, the protocol, the experiments and the notes.'), '#/library', copy('home','banner.button','Open the library'))}
      <div style="height:70px"></div>
    </div>`;
  }

  function renderResearchCategory(cat) {
    const pieces = collectionItems(cat);
    let html = '';
    if (pieces.length) {
      html = pieces.map((item, idx) => row(item, idx)).join('');
    } else if (cat.id === 'biophysic') {
      html = `<div class="empty">
        <h3>${copy('research','empty.title',`Work in this area is in progress.`)}</h3>
        <p>${copy('research','biophysic.empty',`The biophysical foundations and exclusion-zone dynamics are being developed.`)}</p>
        <a class="button dark" href="#/protocol/holographic">${copy('research','biophysic.button',`Explore Holographic Biophysics in The Protocol ↗`)}</a>
      </div>`;
    } else {
      html = `<div class="empty">
        <h3>${copy('research','empty.title',`Work in this area is in progress.`)}</h3>
        <p>Propositions and formal structures for ${escapeHTML(cat.label)} are currently being developed.</p>
      </div>`;
    }
    if (cat.id === 'framework') {
      html += `<a class="entry-row" href="#/protocol"><span class="entry-number">↗</span><div><h3>${copy('research','leadsTo.title',`The protocol this leads to`)}</h3><p>${copy('research','leadsTo.text',`The operating document: the three-tier daily protocol, the epigenetic architecture behind it, and the diagnostic suite that reads it back.`)}</p><span class="article-meta">${copy('research','leadsTo.meta',`Connected · operating document`)}</span></div><span aria-hidden="true">↗</span></a>`;
    }
    return html;
  }

  function renderResearchSidebar(cat) {
    const connected = (cat.connected || []).map(x => `<a href="${x.href}">${x.name} ↗</a>`).join('');
    return `<h3>${copy('research','sidebar.inside',`Inside this collection`)}</h3><p>${cat.description || ''}</p><p>${cat.tagline || ''}</p><h3 style="margin-top:28px">${copy('research','sidebar.connected',`Connected paths`)}</h3>${connected}`;
  }

  function showResearchCategory(catId, { focus = false } = {}) {
    const cat = RESEARCH_CATEGORIES.find(c => c.id === catId) || RESEARCH_CATEGORIES[0];
    const itemsEl = $('#research-items');
    const countEl = $('#research-count');
    const sidebarEl = $('#research-sidebar');
    if (!itemsEl) return;

    $$('#research-nav [role=tab]').forEach(t => {
      const on = t.dataset.category === cat.id;
      t.setAttribute('aria-selected', on);
      if (on) {
        t.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        if (focus && !$('#research-nav').contains(document.activeElement)) t.focus({ preventScroll: true });
      }
    });

    if (countEl) {
      const n = collectionItems(cat).length;
      countEl.textContent = `${n} ${n === 1 ? 'piece' : 'pieces'}`;
    }

    if (sidebarEl) {
      sidebarEl.innerHTML = renderResearchSidebar(cat);
    }

    itemsEl.innerHTML = renderResearchCategory(cat);
    document.title = `${cat.label} — Research & frameworks — Science Coherence`;
  }

  function enhanceResearchNav() {
    const nav = $('#research-nav');
    if (!nav) return;
    nav.addEventListener('click', e => {
      const tab = e.target.closest('[role=tab]');
      if (tab) {
        location.hash = `#/research/${tab.dataset.category}`;
      }
    });
    nav.addEventListener('keydown', e => {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
      const tabs = $$('#research-nav [role=tab]');
      const i = tabs.findIndex(t => t.getAttribute('aria-selected') === 'true');
      const j = e.key === 'ArrowRight' ? Math.min(i + 1, tabs.length - 1) : e.key === 'ArrowLeft' ? Math.max(i - 1, 0) : e.key === 'Home' ? 0 : tabs.length - 1;
      e.preventDefault();
      tabs[j].focus();
      location.hash = `#/research/${tabs[j].dataset.category}`;
    });
  }

  function collectionPage(c, selectedCatId) {
    if (c.id === 'research') {
      const activeCat = RESEARCH_CATEGORIES.find(rc => rc.id === selectedCatId) || RESEARCH_CATEGORIES[0];
      const nav = `<div class="doc-nav-wrap"><div class="wrap"><div class="doc-nav" role="tablist" aria-label="Research categories" id="research-nav">${RESEARCH_CATEGORIES.map(cat => `<button role="tab" id="tab-${cat.id}" data-category="${cat.id}" aria-selected="${cat.id === activeCat.id}" aria-controls="research-items"><i>${cat.num}</i>${cat.label}</button>`).join('')}<div class="mode"><span class="research-count" id="research-count">${pluralize(collectionItems(activeCat).length, 'piece', 'pieces')}</span></div></div></div></div>`;
      return pageHero(c.short, c.name + '.', c.intro, c.green !== false) + nav + `<div class="wrap"><div class="category-layout"><aside class="side-note" id="research-sidebar">${renderResearchSidebar(activeCat)}</aside><div id="research-items">${renderResearchCategory(activeCat)}</div></div></div>`;
    }

    const items = inCollection(c.id);
    const others = sections.filter(x => x.id !== c.id && !x.hidden && !x.standalone).slice(0, 3);
    const connected = others.map(x => ({ href: '#/' + x.id, name: x.name }));
    return pageHero(c.short, c.name + '.', c.intro, c.green !== false) + `<div class="wrap"><div class="category-layout"><aside class="side-note"><h3>Inside this collection</h3><p>${c.description}</p><p>${c.label}</p><h3 style="margin-top:28px">Connected paths</h3>${connected.map(x => `<a href="${x.href}">${x.name} ↗</a>`).join('')}</aside><div>${items.length ? items.map(row).join('') : '<div class="empty"><h3>Nothing here yet.</h3><p>This collection is still being written.</p></div>'}</div></div></div>`;
  }

  function lab() {
    const items = inCollection('lab');
    return pageHero(copy('lab','hero.eyebrow','The Lab'), copy('lab','hero.title','Experiments,<br>made inspectable.'), copy('lab','hero.text','Where a proposition stops being argued and starts being run. Each experiment states what is being varied, what is being watched, and what would count as it not working.'), true) + `<div class="wrap section">
      <div class="section-head"><div><span class="eyebrow">${copy('lab','record.eyebrow',`The experimental record`)}</span><h2>${copy('lab','record.title',`Run it and see.`)}</h2></div></div>
      ${items.length ? items.map(row).join('') : `<div class="empty"><h3>${copy('lab','empty.title',`The record is open.`)}</h3><p>${copy('lab','empty.text',`Experiments will be posted here as they are run.`)}</p><a class="button dark" href="${link('time-crystalline-v2')}">Read the framework ↗</a></div>`}
      <div class="card-grid cols-3" style="margin-top:44px">
        <div class="card" data-accent="teal"><h3 class="card-kicker">${copy('lab','card1.title',`What an experiment states`)}</h3><p>${copy('lab','card1.text',`The variation being introduced, at what scale, over what interval — precisely enough that it could come out otherwise.`)}</p></div>
        <div class="card" data-accent="blue"><h3 class="card-kicker">${copy('lab','card2.title',`What is watched`)}</h3><p>${copy('lab','card2.text',`Chart stationarity, recovery rate, phase relation across scales, and whether the structure holds on contact.`)}</p></div>
        <div class="card" data-accent="rose"><h3 class="card-kicker">${copy('lab','card3.title',`What is recorded`)}</h3><p>${copy('lab','card3.text',`What dissolved, and where. A record of only the survivals is a summary with the informative half discarded.`)}</p></div>
      </div>
      ${pathBanner(copy('lab','banner.title','The method behind the experiments.'), copy('lab','banner.text','What testing means once validity is settled by survival rather than by verdict.'), link('research-method'), copy('lab','banner.button','Read the method'))}
    </div>`;
  }

  /* library — classified by type; narrowed by section or collection */
  const libraryState = { filter: 'all', place: 'all', query: '', sort: 'newest' };
  const typeOf = a => a.type || 'Other';
  function libraryPlaces() {
    const shown = sections.filter(s => !s.hidden);
    return shown.map(s => {
      const cols = COLLECTIONS.filter(c => c.section === s.id).sort((a, b) => String(a.num).localeCompare(String(b.num), undefined, { numeric: true }));
      return cols.length
        ? `<optgroup label="${escapeHTML(s.name)}"><option value="section:${s.id}">All of ${escapeHTML(s.short)}</option>${cols.map(c => `<option value="collection:${c.id}">${c.num} ${escapeHTML(c.name)}</option>`).join('')}</optgroup>`
        : `<option value="section:${s.id}">${escapeHTML(s.name)}</option>`;
    }).join('');
  }
  function library() {
    const types = [...new Set(listed().map(typeOf))].sort((a, b) => a.localeCompare(b));
    return pageHero(copy('library','hero.eyebrow','Library'), copy('library','hero.title','A place for every thread.'), copy('library','hero.text','Frameworks, the operating document, experiments and notes. Browse by type or by collection, or search the full text.')) + `<div class="wrap"><div class="library-controls"><input class="library-search" id="library-query" aria-label="Search library" type="search" placeholder="Search titles, ideas, or the full text…" autocomplete="off"><select id="library-place" class="sort" aria-label="Show a section or collection"><option value="all">All collections</option>${libraryPlaces()}</select><select id="library-sort" class="sort" aria-label="Sort library"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option><option value="length">Longest first</option></select><a class="reading-list-link" href="#/reading-list">Reading list <span id="saved-count">(${saved().length})</span></a></div><div class="filters" role="group" aria-label="Filter by type"><button class="filter active" data-filter="all" aria-pressed="true">Every type</button>${types.map(ty => `<button class="filter" data-filter="${escapeHTML(ty)}" aria-pressed="false">${escapeHTML(ty)}</button>`).join('')}</div><div class="result-count" id="result-count" aria-live="polite"></div><div class="library-list" id="library-list"></div></div>`;
  }
  function inPlace(a, place) {
    if (place === 'all') return true;
    const [kind, id] = place.split(':');
    return kind === 'section' ? a.category === id : a.collection === id && !!collectionOf(a);
  }
  function placeName(place) {
    const [kind, id] = place.split(':');
    if (kind === 'section') return category(id)?.name || id;
    const c = COLLECTIONS.find(x => x.id === id);
    return c ? `${category(c.section)?.short || c.section} · ${c.name}` : id;
  }
  function updateLibrary() {
    const q = libraryState.query.toLowerCase().trim();
    let items = listed().filter(a => (libraryState.filter === 'all' || typeOf(a) === libraryState.filter) && inPlace(a, libraryState.place) && (!q || a.search.includes(q)));
    const sorts = { title: (a, b) => a.title.localeCompare(b.title), oldest: (a, b) => a.date.localeCompare(b.date), length: (a, b) => b.minutes - a.minutes, newest };
    items.sort(sorts[libraryState.sort] || newest);
    const kind = libraryState.filter === 'all' ? '' : ' · ' + libraryState.filter;
    const where = libraryState.place === 'all' ? ' across all collections' : ' in ' + placeName(libraryState.place);
    $('#result-count').textContent = pluralize(items.length, 'piece', 'pieces') + kind + where;
    $('#library-list').innerHTML = items.length ? items.map(row).join('') : `<div class="empty"><h3>No matching pieces.</h3><p>Try another word, type or collection.</p><button class="button" id="clear-filters">Clear search and filters ↗</button></div>`;
    $('#clear-filters')?.addEventListener('click', () => { libraryState.query = ''; $('#library-query').value = ''; libraryState.place = 'all'; $('#library-place').value = 'all'; setFilter('all'); });
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
    return pageHero(copy('about','hero.eyebrow','About'), copy('about','hero.title','The person.<br>The questions. The work.'), copy('about','hero.text','Science Coherence is an independent body of work by Dr. William Conroy, developed from a single premise: that there is no position outside the process from which the process can be judged.')) + `<div class="wrap about-page">
    <section class="about-intro" aria-labelledby="about-spirit-title">
      <figure class="about-image">
        <img src="assets/el-ignorante.png" width="1086" height="1448" alt="${escapeHTML(copy('about','figure.alt',`El Ignorante: a figure in a straw hat holds an open book and tends a flask beneath a tree, surrounded by books, glassware and a sunlit garden.`))}" decoding="async">
        <figcaption>${copy('about','figure.name',`<span lang="es">El Ignorante</span>`)}<span>${copy('about','figure.caption',`Growing through the questions.`)}</span></figcaption>
      </figure>
      <div class="about-opening">
        <span class="eyebrow" id="about-spirit-title">${copy('about','spirit.eyebrow',`The spirit of the work`)}</span>
        <div class="about-spirit-principles">
          <div><h2>${copy('about','spirit.1.title',`Imagination opens the question.`)}</h2><p>${copy('about','spirit.1.text',`Imagination is the first operation, not a preliminary to the real one. What is imagined is already inside the recursion; the only question is whether it survives being run.`)}</p></div>
          <div><h2>${copy('about','spirit.2.title',`Coherence decides.`)}</h2><p>${copy('about','spirit.2.text',`Not agreement, and not endorsement. Alignment that holds on contact — with a body, with a rhythm, with another account. What cannot hold on contact dissolves, whoever is holding it.`)}</p></div>
          <div><h2>${copy('about','spirit.3.title',`The work remains revisable.`)}</h2><p>${copy('about','spirit.3.text',`Definitions, arguments, code, and conclusions all stay open. A structure that could not be contradicted would not be strong; it would be untested.`)}</p></div>
        </div>
        <a class="about-text-link" href="#/principles">${copy('about','spirit.link',`How the work stays open to revision`)} <span aria-hidden="true">↗</span></a>
      </div>
    </section>
    <section class="about-thread" aria-labelledby="about-thread-title">
      <div class="about-section-heading"><span class="eyebrow">${copy('about','thread.eyebrow',`One inquiry, across scales`)}</span><h2 id="about-thread-title">${copy('about','thread.title',`There is a thread<br>through all of it.`)}</h2></div>
      <div class="prose">
      ${copy('about','thread.body',`<p>The work moves between scales: the personal and the theoretical, the spoken moment and the formal model, an intuition and a piece of code. What connects them is not subject matter. It is the claim that these are the same operation performed at different depths — difference, selection, realisation, integration — and that a body, a thought and a world are all instances of the same loop holding its shape.</p>
<p>Science Coherence gives those strands a shared home. <a href="#/research">Research</a> brings together <a href="#/read/ethos-of-being">The Ethos of Being</a>, the wider framework, and the questions that carry it into specific territory, including what it means where the loop meets tissue. <a href="#/protocol">The protocol</a> is that question answered in practice, on one body, daily. <a href="#/lab">The Lab</a> is the experimental record — where a proposition is run rather than argued.</p>
<p>The intention is to make the connections visible while letting each form of work speak in its own voice.</p>`)}
      </div>
    </section>
    <div class="about-invitation">
      <div><span class="eyebrow">${copy('about','invite.eyebrow',`Keep following the questions`)}</span><h2>${copy('about','invite.title',`A place to begin.`)}</h2><p>${copy('about','invite.text',`Follow an idea into the writing, then see what happens when it is put to work.`)}</p></div>
      <a class="button dark" href="${link('start-here')}">${copy('about','invite.button',`Find your way into the work`)} <span aria-hidden="true">↗</span></a>
    </div></div>`;
  }

  function principles() {
    return pageHero(copy('principles','hero.eyebrow','Editorial principles'), copy('principles','hero.title','What is kept,<br>and what dissolves.'), copy('principles','hero.text','How the different kinds of work in this library are held, now that validity is settled inside the loop rather than outside it.')) + `<div class="wrap section"><article class="prose" style="max-width:760px">${copy('principles','body',`<h2>Where validity lives</h2>
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
<p>Everything here is revisable, and revision is the ordinary case rather than an admission. Substantive corrections belong in a dated version of the affected piece, so that a changed argument stays distinguishable from a change in presentation. What did not survive is kept in the record; a library of only survivals is a summary with the informative half discarded.</p>`)}</article></div>`;
  }

  function privacy() {
    return pageHero(copy('privacy','hero.eyebrow','Privacy & accessibility'), copy('privacy','hero.title','A quieter place to read.'), copy('privacy','hero.text','The site works without an account, advertising, or an analytics service.')) + `<div class="wrap section"><article class="prose" style="max-width:760px">${copy('privacy','body',`<h2>Your reading list and theme</h2><p>Saved article identifiers and your light/dark preference are stored in this browser’s local storage. They are not sent to a server. You can remove a saved item with the same button on its page, or clear this site’s storage in your browser settings.</p><h2>External services</h2><p>There are none. Typefaces, the mathematical typesetter (KaTeX), and every script are served from this site itself, so loading a page contacts no third party. GitHub opens only when you follow a link. Hosting providers may keep their own access logs.</p><h2>Reading and navigation</h2><p>The site supports keyboard navigation, visible focus states, a skip link, reduced-motion preferences, light and dark themes, responsive layouts, and a print stylesheet. Search can be opened with the slash key and closed with Escape. The document timer plays sound only after you press start, and only if the audio option is enabled.</p><h2>Publishing model</h2><p>This edition is a public reading website. There are no accounts, comments, uploads, or forms collecting personal information.</p>`)}</article></div>`;
  }

  const notFound = () => `<div class="wrap error-page"><span class="eyebrow">A path still unwritten</span><h1>Not here, yet.</h1><p>This page could not be found. The library is a good place to begin again.</p><a class="button dark" href="#/library">Back to the library ↗</a></div>`;

  /* ---------- reader (articles) ----------------------------------------- */
  function prepareArticle(a) {
    const holder = document.createElement('div');
    holder.innerHTML = a.body;
    const headings = $$('h2', holder);
    headings.forEach((h, i) => { h.id = 'section-' + (i + 1); });
    const toc = headings.length > 0 ? headings.map(h => `<a href="#/read/${a.id}/${h.id}" data-target="${h.id}">${escapeHTML(h.textContent)}</a>`).join('') : '';
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
    return `<div class="reading-progress" id="reading-progress"></div><div class="wrap">${collectionOf(a) && a.category === 'research' ? `<a class="back-link" href="#/research/${a.collection}">← ${category(a.category).short} · ${collectionOf(a).name}</a>` : `<a class="back-link" href="#/${a.category}">← ${category(a.category).name}</a>`}<header class="reader-head"><span class="eyebrow">${a.type}</span><h1>${a.title}</h1>${a.subtitle ? `<p class="reader-subtitle">${a.subtitle}</p>` : ''}<p class="lede">${a.description}</p><div class="reader-meta">Dr. William Conroy · ${fmtDate(a.date)} · ${a.minutes} min read · ${a.words ? a.words.toLocaleString('en-GB') + ' words' : ''}</div>${readerTools(a)}</header><div class="reader-layout ${prepared.toc ? '' : 'no-toc'}">${prepared.toc ? `<aside class="reader-side"><h3>On this page</h3><nav aria-label="Article sections" id="side-toc">${prepared.toc}</nav></aside>` : ''}<div class="reader-body">${a.note ? `<aside class="reader-note">${a.note}</aside>` : ''}${prepared.toc ? `<details class="article-toc"><summary>On this page</summary><nav aria-label="Article sections">${prepared.toc}</nav></details>` : ''}<article class="prose">${prepared.body}</article></div></div></div>${readerFoot(a)}`;
  }

  /* ---------- document register ----------------------------------------- */
  let activeDoc = null;      // { doc, sectionId }
  const cleanups = [];       // functions run before leaving a page

  function readDocument(doc, sectionId) {
    const secs = doc.sections;
    const current = secs.find(s => s.id === sectionId) || secs[0];
    const nav = `<div class="doc-nav-wrap"><div class="wrap"><div class="doc-nav" role="tablist" aria-label="Document sections" id="doc-nav">${secs.map(s => `<button role="tab" id="tab-${s.id}" data-section="${s.id}" aria-selected="${s.id === current.id}" aria-controls="panel-${s.id}"><i>${String(s.num).padStart(2, '0')}</i>${s.label}</button>`).join('')}<div class="mode"><button type="button" id="mode-sections" aria-pressed="true">Sections</button><button type="button" id="mode-all" aria-pressed="false">Continuous</button></div></div></div></div>`;
    const panels = secs.map((s, i) => `<section class="doc-panel ${s.id === current.id ? 'active' : ''}" id="panel-${s.id}" role="tabpanel" aria-labelledby="tab-${s.id}" tabindex="-1"><div class="doc-panel-head"><span class="kicker-small">${s.num === '0' || s.num === 0 ? 'Overview' : 'Section ' + s.num}</span><h2>${s.title}</h2><p>${s.summary}</p></div>${s.html}<div class="doc-panel-foot">${i > 0 ? `<button type="button" data-go="${secs[i - 1].id}">← ${secs[i - 1].label}</button>` : ''}${i < secs.length - 1 ? `<button type="button" class="next" data-go="${secs[i + 1].id}">${secs[i + 1].label} →</button>` : ''}</div></section>`).join('');
    return `<div class="reading-progress" id="reading-progress"></div><section class="page-hero green doc-hero"><div class="wrap"><div class="breadcrumb"><a href="#/">Home</a> / The Protocol</div><span class="eyebrow">${doc.type} · Version ${doc.version}</span><h1>${doc.title}</h1>${doc.subtitle ? `<p class="lede">${doc.subtitle}</p>` : ''}</div></section><div class="wrap"><header class="doc-head"><div class="doc-facts">${doc.facts.map((f, i) => `<div><b class="${i === doc.facts.length - 1 ? 'accent' : ''}">${f.value}</b><span>${f.label}</span></div>`).join('')}</div><div class="doc-meta-row"><div class="reader-meta" style="margin:0">Science Coherence Institute · ${fmtDate(doc.date)} · ${secs.length} sections · ${doc.minutes} min</div>${readerTools(doc)}</div>${doc.note ? `<aside class="reader-note doc-note">${doc.note}</aside>` : ''}</header></div>${nav}<div class="wrap doc" id="doc">${panels}${pathBanner(copy('protocol','banner.title','The architecture behind it.'), copy('protocol','banner.text','The loop this protocol runs, set out in full.'), link('time-crystalline-v2'), copy('protocol','banner.button','Read the framework'))}</div>`;
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
        toggle: $('#pacer-toggle', root), reset: $('#pacer-reset', root), audio: $('#pacer-audio', root), audioLabel: $('#pacer-audio-label', root),
        status: $('#pacer-status', root), list: $('#pacer-phases', root), pacer: $('#pacer', root)
      };
      this.phases = [
        { name: 'Phase 1: Ground State', center: 963, left: 943, right: 983, accent: 'teal' },
        { name: 'Phase 2: Clearing the Noise', center: 852, left: 832, right: 872, accent: 'blue' },
        { name: 'Phase 3: Coherent Blueprint', center: 741, left: 721, right: 761, accent: 'violet' },
        { name: 'Phase 4: Repolymerization', center: 528, left: 508, right: 548, accent: 'rose' },
        { name: 'Phase 5: Telomere Shelter', center: 639, left: 619, right: 659, accent: 'amber' },
        { name: 'Phase 6: Integration & Seal', center: 432, left: 412, right: 452, accent: 'green' }
      ];
      this.PHASE = 300; this.timer = null; this.ctx = null; this.gain = null; this.oscillators = [];
      this.reset(false);
      this.el.toggle.addEventListener('click', () => this.running ? this.pause() : this.start());
      this.el.reset.addEventListener('click', () => this.reset(true));
      this.el.audio.addEventListener('change', () => { if (this.running) this.el.audio.checked ? this.audioOn() : this.audioOff(); });
      this.el.list.addEventListener('click', event => {
        const item = event.target.closest('li[data-phase]');
        if (item && this.el.list.contains(item)) this.selectPhase(+item.dataset.phase - 1);
      });
      this.onVisibility = () => { if (document.hidden && this.running) this.pause('Paused while the tab was hidden.'); };
      document.addEventListener('visibilitychange', this.onVisibility);
    }
    start() {
      if (this.completeState) this.reset(false);
      this.running = true;
      this.el.toggle.textContent = 'Pause session';
      this.el.status.textContent = this.phases[this.phase].name + ' in progress.';
      if (this.el.audio.checked) this.audioOn();
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
      this.phase = 0; this.remaining = this.PHASE; this.completeState = false; this.completed = new Set();
      this.el.toggle.textContent = 'Start session';
      this.audioOff();
      this.el.orb.className = 'pacer-orb';
      this.el.prompt.textContent = 'Ready';
      this.el.status.textContent = announce ? 'Reset. Six phases of five minutes; choose any phase or begin with Ground State.' : 'Six phases of five minutes. Choose any phase or begin with Ground State. The orb breathes on a 14-second cycle: inhale 4 s, hold 4 s, exhale 6 s.';
      this.render();
    }
    selectPhase(phase) {
      if (!Number.isInteger(phase) || phase < 0 || phase >= this.phases.length) return;
      if (this.completeState) this.completed.clear();
      this.completeState = false;
      this.completed.delete(phase);
      this.phase = phase; this.remaining = this.PHASE;
      this.el.toggle.textContent = this.running ? 'Pause session' : 'Start selected phase';
      this.el.prompt.textContent = this.running ? 'Inhale' : 'Ready';
      this.el.orb.className = this.running ? 'pacer-orb in' : 'pacer-orb';
      this.el.status.textContent = this.phases[phase].name + (this.running ? ' in progress.' : ' selected. Press start when ready.');
      if (this.running && this.el.audio.checked) this.updateAudioFrequencies();
      this.render();
    }
    tick() {
      this.remaining -= 1;
      if (this.remaining <= 0) {
        this.completed.add(this.phase);
        this.phase += 1;
        if (this.phase >= this.phases.length) { this.phase = this.phases.length - 1; this.remaining = 0; this.complete(); return; }
        this.remaining = this.PHASE;
        this.el.status.textContent = this.phases[this.phase].name + ' in progress.';
        if (this.el.audio.checked) this.updateAudioFrequencies();
      }
      this.render();
    }
    complete() {
      this.running = false; this.completeState = true; clearInterval(this.timer); this.timer = null;
      this.audioOff();
      this.el.toggle.textContent = 'Start again';
      this.el.orb.className = 'pacer-orb';
      const count = this.completed.size;
      this.el.status.textContent = `Session complete — ${count * 5} minutes across ${count} ${count === 1 ? 'phase' : 'phases'}.`;
      this.el.prompt.textContent = 'Complete';
      this.render();
    }
    render() {
      const m = String(Math.floor(this.remaining / 60)).padStart(2, '0'), s = String(this.remaining % 60).padStart(2, '0');
      this.el.time.textContent = `${m}:${s}`;
      const current = this.phases[this.phase];
      this.el.phase.textContent = current.name;
      this.el.audioLabel.textContent = `Audio carrier — ${current.left} Hz left + ${current.right} Hz right (40 Hz difference; ${current.center} Hz center)`;
      this.el.pacer.dataset.accent = current.accent;
      if (this.running) {
        const t = (this.PHASE - this.remaining) % 14;
        const state = t < 4 ? ['Inhale', 'in'] : t < 8 ? ['Hold', 'hold'] : ['Exhale', 'out'];
        this.el.prompt.textContent = state[0];
        this.el.orb.className = 'pacer-orb ' + state[1];
      }
      $$('li', this.el.list).forEach(li => {
        const phase = +li.dataset.phase - 1;
        const active = phase === this.phase && !this.completeState;
        li.classList.toggle('active', active);
        li.classList.toggle('done', this.completed.has(phase));
        const button = $('.phase-select', li);
        if (button) button.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    }
    audioOn() {
      try {
        if (!this.ctx) {
          this.ctx = new (window.AudioContext || window.webkitAudioContext)();
          this.gain = this.ctx.createGain(); this.gain.gain.value = 0;
          this.gain.connect(this.ctx.destination);
          [-1, 1].forEach(pan => {
            const oscillator = this.ctx.createOscillator(); oscillator.type = 'sine';
            if (this.ctx.createStereoPanner) {
              const panner = this.ctx.createStereoPanner(); panner.pan.value = pan;
              oscillator.connect(panner); panner.connect(this.gain);
            } else oscillator.connect(this.gain);
            oscillator.start(); this.oscillators.push(oscillator);
          });
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
        this.updateAudioFrequencies();
        this.gain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.gain.gain.linearRampToValueAtTime(0.025, this.ctx.currentTime + 1.5);
      } catch { this.el.audio.checked = false; this.el.status.textContent = 'Audio is not available in this browser.'; }
    }
    updateAudioFrequencies() {
      if (!this.ctx || this.oscillators.length < 2) return;
      const current = this.phases[this.phase], now = this.ctx.currentTime;
      this.oscillators[0].frequency.setTargetAtTime(current.left, now, 0.04);
      this.oscillators[1].frequency.setTargetAtTime(current.right, now, 0.04);
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
      if (this.ctx) { try { this.ctx.close(); } catch {} this.ctx = null; this.oscillators = []; }
    }
  }


  /* ---------- the temporal matrix ------------------------------------------
     The model, its semantics and every derivation live in THE MATRIX block
     below, which is the single source of truth. This section holds only the
     calendar's names, the solar corrections and the recurrent clock wave.

     THE CLOCK is anchored to the observer's own solar day and re-anchored to it
     every day. 00:00 is solar midnight and 12:00 is peak sun, permanently, with
     no accumulating offset. Its dilation is fixed and does not move with the
     retained load.

     THE WAVE is a genuine non-linear wave inside the date, not a scalar. It
     races through the small hours, eases back through the morning and breathes
     across the evening, closing exactly at noon and at midnight. It is
     recurrent: revisiting a phase must never raise the retained load.
     ---------------------------------------------------------------------- */
  const CAL360 = {
    // Shared app/website launch: USNO March equinox prediction, minute resolution.
    // https://aa.usno.navy.mil/calculated/seasons?year=2027&tz=0&tz_sign=1&tz_label=true&dst=false&submit=Get+Data
    epochLive: Date.parse('2027-03-20T20:25:00Z'),
    tropical: 365.2421896698,          // frozen reference year Y
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



  /* ── Foundational constants ────────────────────────────────────────────────
     Hoisted above their first use. The full model, its semantics and its
     derivations are in THE MATRIX block below. */
  const YEAR_REF = 365.2421896698;
  const J0n = 8736982783n, Qn = 600000000000n;
  const J0  = Number(J0n),  Q  = Number(Qn);
  const FRACTION_DIRECT = J0 / Q;          // 0.014561637971666…
  const FRACTION_12FOLD = 12 * J0 / Q;     // 0.17473965566

  const MS_DAY  = 86400000;
  const MS_CAL  = YEAR_REF * MS_DAY / 360; // 87,658,125.520752 ms
  const LEAD_MS = MS_CAL - MS_DAY;         //  1,258,125.520752 ms = 20m 58.125520752s

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

  /* How far across the current inter-rung span a moment sits. The experiment
     starts at tau = 0, so while the launch state is held its span runs from
     tau = 0 — not from the launch entry at q = 1 — to the first hard rung, and
     every reading counts live from the first instant. */
  function spanFraction(tau, rung, next) {
    const a = rung === LAUNCH ? 0 : rung.tau, b = next ? next.tau : TAU_STAR;
    return b > a ? Math.min(1, Math.max(0, (tau - a) / (b - a))) : 1;
  }
  /* The live load. Exact at both ends of every span, never rising. */
  function liveLoad(tau, rung, next, absolute) {
    if (absolute || !next) return absolute ? 0 : rung.J;
    return rung.J + (next.J - rung.J) * spanFraction(tau, rung, next);
  }

  /* Where a given moment falls in the count, and where the clock stands. */
  function cal360(date = new Date(), longitude = CAL360.longitude) {
    const sol = solarFraction(date, longitude);

    /* The calendar extends in both directions from the equinox. The retained
       process has elapsed tau=0 before its launch; calendarTau is the signed
       date coordinate used only to place the calendar and its boundaries. */
    const sinceLaunch = getMatrixNow(date) - getMatrixEpoch();
    const pending = sinceLaunch < 0;
    const elapsed = Math.max(0, sinceLaunch);
    const tau     = elapsed / MS_CAL;
    const calendarTau = sinceLaunch / MS_CAL;
    const within  = sinceLaunch - Math.floor(calendarTau) * MS_CAL;
    const cal     = matrixCalendar(calendarTau);

    /* q — informational recurrence depth. Never a number of days. */
    const q        = qOfTau(tau);
    const rung     = retainedAtTau(tau);
    const next     = nextRung(tau);
    const absolute = isAbsolute(tau);

    /* The clock: fixed dilation, recurrent wave, anchored to apparent solar
       time. Independent of the retained load by design. */
    const uniform  = sol.frac;
    const phi      = livingPhaseM(uniform);
    const livingMs = phi * MS_DAY;
    const ss       = Math.floor(livingMs / 1000);

    return {
      tau, calendarTau, within, absolute, pending,
      launchAt: new Date(getMatrixEpoch()),
      toLaunchMs: Math.max(0, -sinceLaunch),
      dateNumber: cal.dateNumber,
      month: cal.month, day: cal.day, weekday: cal.weekday, week: cal.week,
      dayIndex: cal.dayIndex,

      /* The turnover. A Matrix date is 24h 20m 58.125520752s of civil time, so
         the boundary lands about 21 minutes later on the clock each date and
         walks right round the face. Taken from `within` rather than from the
         epoch, which keeps it in the same frame as tau. */
      toNextDateMs: MS_CAL - within,
      nextDateAt:   new Date(date.getTime() + (MS_CAL - within)),

      q, rung, next,
      toNextTau: next ? Math.max(0, next.tau - tau) : 0,

      /* The exact rung values — the states the descent passes through. */
      rungLoad: absolute ? 0 : rung.J,
      state: absolute ? ABSOLUTE.state : rung.state,
      accent: absolute ? ABSOLUTE.accent : rung.accent,

      /* Absorption is a live process: J is descending at every tick. It runs
         from the held rung's value to the next rung's across the span, so it
         is exact AT every rung and monotonically non-increasing everywhere
         between — a raw phase oscillation can never raise it. */
      load: liveLoad(tau, rung, next, absolute),
      residualSec: liveLoad(tau, rung, next, absolute) * 86400 / Q,
      integration: 1 - liveLoad(tau, rung, next, absolute) / J0,
      loadFraction: liveLoad(tau, rung, next, absolute) / J0,

      /* Continuous readings — genuinely live, because tau and q advance
         continuously even while J_ret is holding flat. These are positions on
         the trajectory, not interpolations of the retained load. */
      rungFrom: absolute ? TAU_STAR : rung.tau,
      rungTo:   absolute ? TAU_STAR : (next ? next.tau : TAU_STAR),
      rungProgress: absolute ? 1 : spanFraction(tau, rung, next),
      trajectory: absolute ? 1 : Math.min(1, Math.max(0, tau / TAU_STAR)),

      sol, phi, uniform,
      v: velocityM(phi),
      meanRate: RATE_R,
      drift: livingMs - sol.frac * MS_DAY,
      regime: phi < SLEEP_END ? 'burn' : phi < NOON ? 'repay' : 'ripple',
      h: Math.floor(ss / 3600) % 24, m: Math.floor(ss % 3600 / 60), s: ss % 60,
      mode: MATRIX_MODE
    };
  }


  /* ══════════════════════════════════════════════════════════════════════════
     THE MATRIX — final model. This block is the single source of truth.

     TWO COORDINATES, never conflated:

       tau — PHYSICAL MATRIX TIME. Elapsed time in the time-dilated 360-date
             Matrix calendar. The calendar continues indefinitely; there is no
             end of time and no stopping at closure.

       q   — INFORMATIONAL RECURRENCE DEPTH. The internal recurrence coordinate,
             running to Q. It is NOT a number of days and is never labelled one.

     The singular relation is active from launch — there is no delayed onset:

             dtau/dq = J_ret(q) / J0          from tau = 0, q = 0

     EXACT FOUNDATION
       Y     = 365.2421896698                  frozen reference
       E     = Y − 360 = 5.2421896698
       alpha = E/360 = 8,736,982,783 / 600,000,000,000   (irreducible)
       J0    = 8,736,982,783     Q = 600,000,000,000

     One Matrix date is Y/360 = 1.014561637971666…, so the Matrix clock dilation
     is fixed at 20 min 58.125520752 s and one complete Matrix date is
     24 h 20 min 58.125520752 s. That dilation does NOT change when the retained
     load changes: the clock reading and the retained-integration process are
     distinct readings of the same Matrix.

     FRAMEWORK SEMANTICS (hypotheses under investigation, not established
     physics or genetics):
       Q is the total system capacity / total-energy coordinate — the complete
         normalised domain. Not joules; no physical unit conversion is claimed.
         If an elementary unit epsilon is ever derived, E_total = Q·epsilon.
       J is the unresolved / parasitic load, in the same normalised units.
       J0/Q      = 1.4561637971666…%   the direct initial fraction
       12·J0/Q   = 17.473965566%       the 12-fold Matrix-month translation,
                                       a cross-domain quantity — keep separate.

     Products such as q·J0 reach 5.2 × 10²¹, far past 2⁵³, so the recurrence is
     computed in BigInt; only display values become Numbers.
     ══════════════════════════════════════════════════════════════════════════ */

  /* ── Exact rational arithmetic on BigInt ───────────────────────────────── */
  const bgcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b;
    while (b) { const r = a % b; a = b; b = r; } return a; };
  const fr = (n, d = 1n) => { if (d < 0n) { n = -n; d = -d; } const g = bgcd(n, d) || 1n; return { n: n / g, d: d / g }; };
  const frAdd = (x, y) => fr(x.n * y.d + y.n * x.d, x.d * y.d);
  const frNum = x => Number(x.n) / Number(x.d);

  /* ── The hard recurrence ladder ────────────────────────────────────────────
     Continued fraction of alpha = J0/Q. The convergent denominators are the
     hard rungs; with the numerators, J_i = |q_i·J0 − p_i·Q| exactly.
     Derived, never tabulated — the validation table is asserted against it.  */
  function recurrenceLadder() {
    const out = [];
    let num = J0n, den = Qn, h1 = 1n, h0 = 0n, k1 = 0n, k0 = 1n;
    while (true) {
      const a = num / den;
      const hn = a * h1 + h0; h0 = h1; h1 = hn;
      const kn = a * k1 + k0; k0 = k1; k1 = kn;
      let J = k1 * J0n - h1 * Qn; if (J < 0n) J = -J;
      out.push({ i: out.length, qn: k1, pn: h1, Jn: J, q: Number(k1), J: Number(J),
                 residual: Number(J) * 86400 / Q, integration: 1 - Number(J) / J0 });
      const r = num - a * den;
      if (r === 0n) break;
      num = den; den = r;
    }
    return out;
  }
  const LADDER = recurrenceLadder();
  const ABSOLUTE = LADDER[LADDER.length - 1];   // q = Q, J = 0
  /* The zeroth convergent is 0/1: q = 1 with J still J0. It is the LAUNCH
     state, not a reduction — the validation table lists it, and the instrument
     must not present it as a rung that integrated nothing. The hard rungs are
     LADDER[1 .. 19]; there are nineteen of them. */
  const LAUNCH = LADDER[0];
  const RUNGS  = LADDER.slice(1);

  /* One named state per rung — twenty in all, the launch state and the
     nineteen reductions. The name is the state the Matrix is IN while that
     rung is the retained one; it is a label for a rung, not a claim about a
     mechanism. The scale descends: the early names are about bulk collapse,
     the late ones about what is left. */
  const STATE_NAMES = [
    ['LAUNCH',        'amber'],   // q 1              J0, nothing integrated
    ['FIRST DESCENT', 'amber'],   // q 68             32.64%
    ['CLEAVAGE',      'amber'],   // q 69             67.36%
    ['COLLAPSE',      'violet'],  // q 206            97.92%
    ['SETTLING',      'violet'],  // q 3,159
    ['CONSOLIDATION', 'violet'],  // q 3,365
    ['REFINEMENT',    'violet'],  // q 9,889
    ['ATTENUATION',   'teal'],    // q 23,143
    ['TRACE',         'teal'],    // q 79,318
    ['RESIDUE',       'teal'],    // q 1,530,185
    ['REMNANT',       'teal'],    // q 1,609,503
    ['FILAMENT',      'teal'],    // q 3,139,688
    ['THREAD',        'blue'],    // q 70,682,639
    ['STRAND',        'blue'],    // q 73,822,327
    ['GRAIN',         'blue'],    // q 144,504,966
    ['MOTE',          'blue'],    // q 1,518,871,987
    ['SPECK',         'blue'],    // q 3,182,248,940
    ['GLINT',         'green'],   // q 26,976,863,507
    ['UNIT',          'green'],   // q 30,159,112,447  J = 1
    ['ABSOLUTE',      'green']    // q Q               J = 0
  ];
  LADDER.forEach((L, i) => { L.state = STATE_NAMES[i][0]; L.accent = STATE_NAMES[i][1]; });

  /* ── From the start of the experiment ─────────────────────────────────────
     J_ret is a staircase: J0 until the first rung that lowers it, then the
     value of the last rung passed. Integrating dtau = (J_ret/J0) dq exactly,
     piecewise, gives tau at every rung — and at q = Q gives the natural
     absorption point. It is not a chosen endpoint and is not rounded or
     calibrated to anything.                                                  */
  const STEPS = [{ q: 0, J: J0 }].concat(LADDER.map(L => ({ q: L.q, J: L.J })));

  (function mapRungsToMatrixTime() {
    let t = fr(0n);
    for (let i = 1; i < STEPS.length; i++) {
      const prev = STEPS[i - 1];
      const span = BigInt(STEPS[i].q) - BigInt(prev.q);
      t = frAdd(t, fr(span * BigInt(prev.J), J0n));
      STEPS[i].tauFr = t; STEPS[i].tau = frNum(t);
      const L = LADDER[i - 1]; L.tau = STEPS[i].tau; L.tauFr = t;
    }
  })();

  /* The natural absorption point, derived: 6251584658434 / 8736982783. */
  const TAU_STAR_FR = ABSOLUTE.tauFr;
  const TAU_STAR    = frNum(TAU_STAR_FR);        // ≈ 715.5313011029427

  /* ── The retained staircase ────────────────────────────────────────────────
     Monotonically non-increasing. A later raw phase oscillation must never
     raise it. Past the absorption point the state is held permanently.       */
  function retainedAtTau(tau) {
    if (tau >= TAU_STAR) return ABSOLUTE;
    let k = 0;
    for (let i = 0; i < LADDER.length; i++) if (tau >= LADDER[i].tau) k = i;
    return LADDER[k];
  }
  function stepAtTau(tau) {
    let k = 0;
    for (let i = 0; i < STEPS.length; i++) if (STEPS[i].tau !== undefined ? tau >= STEPS[i].tau : true) k = i;
    return STEPS[k];
  }

  /* tau(q) — exact piecewise-linear, from launch. */
  function tauOfQ(q) {
    if (q >= Q) return TAU_STAR;
    let k = 0;
    for (let i = 0; i < STEPS.length; i++) if (q >= STEPS[i].q) k = i;
    const base = k === 0 ? 0 : STEPS[k].tau;
    return base + (q - STEPS[k].q) * (STEPS[k].J / J0);
  }

  /* q(tau) — the inverse the live Instrument needs. Clamped past absorption;
     never divides by J = 0. */
  function qOfTau(tau) {
    if (tau >= TAU_STAR) return Q;
    if (tau <= 0) return 0;
    const s = stepAtTau(tau);
    if (!s.J) return Q;
    const base = s.tau === undefined ? 0 : s.tau;
    return s.q + (tau - base) * (J0 / s.J);
  }

  /* Retained readings. J only falls; integration only rises. */
  const retainedJ           = tau => (tau >= TAU_STAR ? 0 : retainedAtTau(tau).J);
  const retainedResidualSec = tau => (tau >= TAU_STAR ? 0 : retainedAtTau(tau).residual);
  const retainedIntegration = tau => (tau >= TAU_STAR ? 1 : retainedAtTau(tau).integration);
  const isAbsolute          = tau => tau >= TAU_STAR;
  /* The launch state is never a target: the next rung is always a hard rung. */
  const nextRung            = tau => (tau >= TAU_STAR ? null : RUNGS.find(L => L.tau > tau) || null);

  /* ── The Matrix calendar ───────────────────────────────────────────────────
     360 dates a year, twelve months of thirty, and it continues indefinitely.
     tau = 0 is Matrix 1 March of the launch year; the human date label is
     floor(tau) + 1, which is why tau starts at zero.                         */
  /* The calendar does not count years. There is no era, no epoch number and no
     year label anywhere in a reading — a cycle of 360 returns to the page it
     started on and the face reads the same. tau is what grows; the calendar
     face does not. Once the unresolved load reaches zero the time is the same
     forever, and a year count would be recording a difference that is no
     longer there. */
  function matrixCalendar(tau) {
    const d = Math.floor(tau);
    const idx = ((d % 360) + 360) % 360;
    return { dayIndex: idx, month: Math.floor(idx / 30), day: idx % 30 + 1,
             weekday: idx % 6, week: Math.floor(idx % 30 / 6) + 1, dateNumber: d + 1, tau };
  }

  /* ── The dilation wave ─────────────────────────────────────────────────────
     Fixed. The Matrix clock dilation is 20m 58.125520752s and does NOT change
     when the retained load changes — the clock reading and the retained
     integration process are distinct readings of the same Matrix. The wave is
     recurrent: it may revisit a previous phase, and that recurrence must never
     raise J_ret. Wave recurrence is not restored unresolved load.

         v_M(φ) = R · v(φ),   R = 1 + alpha = 1.014561637971666…

     Its mean is R, so a Matrix date is 24h 20m 58.125520752s at every stage.
     C(½) = ½ and C(1) = 1, so 12:00 stays peak sun and 00:00 solar midnight. */
  const RATE_R = 1 + J0 / Q;
  const velocityM = phi => RATE_R * velocity(phi);
  function livingPhaseM(fraction) {
    let lo = 0, hi = 1;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (consumed(mid) < fraction) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  /* One scheduled epoch for every browser, app and screensaver. Older saved
     simulation epochs are ignored. Before launch the process has not begun;
     from launch it advances continuously. Civil timezone offsets never enter
     elapsed Matrix time. The independent daily solar clock remains live. */
  const MATRIX_MODE = 'live';
  const getMatrixEpoch = () => CAL360.epochLive;
  const resetMatrixEpoch = () => getMatrixEpoch(); // fixed epoch cannot be reset
  const getMatrixNow = (date = new Date()) => date.getTime();
  const getMatrixDayCount = (date = new Date()) =>
    Math.floor((getMatrixNow(date) - getMatrixEpoch()) / MS_CAL);

  /* ── Development checks ────────────────────────────────────────────────────
     The specification's validation table, asserted against the derived model
     rather than substituted for it. Silent when everything holds.           */
  (function checkMatrix() {
    const f = [];
    const near = (x, y, tol, what) => { if (!(Math.abs(x - y) <= tol)) f.push(`${what}: ${x} vs ${y}`); };

    const EQ = [1,68,69,206,3159,3365,9889,23143,79318,1530185,1609503,3139688,70682639,
      73822327,144504966,1518871987,3182248940,26976863507,30159112447,600000000000];
    const gq = LADDER.map(L => L.q);
    if (gq.length !== EQ.length || gq.some((v, i) => v !== EQ[i])) f.push('ladder mismatch');

    const EJ = {1:8736982783,68:5885170756,69:2851812027,206:181546702,3159:128611497,
      3365:52935205,9889:22741087,23143:7453031,79318:381994,1530185:195145,1609503:186849,
      3139688:8296,70682639:4337,73822327:3959,144504966:378,1518871987:179,3182248940:20,
      26976863507:19,30159112447:1,600000000000:0};
    const ED = {1:1258.125520752,68:847.464588864,69:410.660931888,206:26.142725088,
      3159:18.520055568,3365:7.62266952,9889:3.274716528,23143:1.073236464,79318:0.055007136,
      1530185:0.02810088,1609503:0.026906256,3139688:0.001194624,70682639:0.000624528,
      73822327:0.000570096,144504966:0.000054432,1518871987:0.000025776,3182248940:0.00000288,
      26976863507:0.000002736,30159112447:0.000000144,600000000000:0};
    LADDER.forEach(L => {
      if (L.J !== EJ[L.q]) f.push(`J at q=${L.q}`);
      near(L.residual, ED[L.q], 1e-9, `residual q=${L.q}`);
      near(L.integration, 1 - EJ[L.q] / J0, 1e-15, `integration q=${L.q}`);
    });
    for (let i = 1; i < LADDER.length; i++)
      if (LADDER[i].J >= LADDER[i - 1].J) f.push(`J rose at rung ${i}`);

    /* twenty named states, one per rung, all distinct */
    if (new Set(LADDER.map(L => L.state)).size !== 20) f.push('state names not 20 and distinct');
    if (ABSOLUTE.state !== 'ABSOLUTE') f.push('the absorbing state is not named ABSOLUTE');

    /* the live descent: J0 at the start of the experiment, exact AT every hard
       rung, and it never rises */
    if (liveLoad(0, LAUNCH, nextRung(0), false) !== J0) f.push('live J at tau=0 is not J0');
    if (!(liveLoad(0.5, LAUNCH, nextRung(0.5), false) < J0)) f.push('live J does not move before tau=1');
    if (nextRung(0) !== RUNGS[0]) f.push('the first target is not the first hard rung');
    RUNGS.forEach((L, i) => {
      const at = liveLoad(L.tau, L, nextRung(L.tau), false);
      if (Math.abs(at - L.J) > 1e-6) f.push(`live J at rung ${i + 1}: ${at} vs ${L.J}`);
    });
    let pl = Infinity;
    for (let k = 0; k <= 72000; k++) {
      const t = k / 100;
      const r = retainedAtTau(t), nx = nextRung(t), ab = isAbsolute(t);
      const jl = liveLoad(t, r, nx, ab);
      if (jl > pl + 1e-9) { f.push(`live J rose at tau=${t}`); break; }
      if (jl < -1e-9) { f.push(`live J negative at tau=${t}`); break; }
      pl = jl;
    }
    if (liveLoad(TAU_STAR, ABSOLUTE, null, true) !== 0) f.push('live J not 0 at absorption');

    /* launch is the only entry that integrates nothing, and every hard rung
       strictly reduces the load */
    if (!(LAUNCH.q === 1 && LAUNCH.J === J0 && LAUNCH.integration === 0))
      f.push('launch state is not q=1, J=J0, I=0');
    if (RUNGS.length !== 19) f.push(`hard rungs: ${RUNGS.length} not 19`);
    if (RUNGS.some(L => L.J === J0 || L.integration <= 0))
      f.push('a hard rung reduces nothing');

    /* tau at every hard rung — singularity active from launch */
    const ET = {68:68.0,69:68.673593035739,206:113.391347139501,3159:174.752050750951,
      3365:177.784444088563,9889:217.311736976442,23143:251.809958454510,79318:299.729706818858,
      1530185:363.163789563805,1609503:364.935397851751,3139688:397.659914331435,
      70682639:461.793761840700,73822327:463.352289217279,144504966:495.380802349465,
      1518871987:554.841916883059,3182248940:588.920555010438,26976863507:643.389277584319,
      30159112447:650.309599091378,600000000000:715.531301102943};
    LADDER.forEach(L => { if (ET[L.q] !== undefined) near(L.tau, ET[L.q], 1e-8, `tau(q=${L.q})`); });
    near(TAU_STAR, 715.5313011029427, 1e-9, 'tau*');
    if (!(TAU_STAR_FR.n === 6251584658434n && TAU_STAR_FR.d === 8736982783n))
      f.push(`tau* is not 6251584658434/8736982783 (got ${TAU_STAR_FR.n}/${TAU_STAR_FR.d})`);
    near(tauOfQ(1), 1, 1e-12, 'tau(q=1)');

    /* the q=206 collapse */
    near(tauOfQ(206), 113.391347139501, 1e-8, 'tau at q=206');
    near(181546702 / J0, 0.020779107, 1e-9, 'J/J0 at q=206');
    near(113.391347139501 / TAU_STAR, 0.158471540, 1e-8, 'fraction of trajectory at q=206');

    /* the absorbing state is held, and nothing divides by J = 0 */
    [TAU_STAR, TAU_STAR + 1e-9, 800, 5000, 1e6].forEach(t => {
      if (qOfTau(t) !== Q) f.push(`q at tau=${t}`);
      if (retainedJ(t) !== 0) f.push(`J at tau=${t}`);
      if (retainedResidualSec(t) !== 0) f.push(`residual at tau=${t}`);
      if (retainedIntegration(t) !== 1) f.push(`integration at tau=${t}`);
      if (!isAbsolute(t)) f.push(`not absolute at tau=${t}`);
      if (!Number.isFinite(matrixCalendar(t).dateNumber)) f.push(`calendar stopped at tau=${t}`);
    });
    /* the turnover is always ahead, and never more than one Matrix date away */
    [0, 0.5, 3.0269, 137.5, 715.9].forEach(t => {
      const w = t * MS_CAL - Math.floor(t) * MS_CAL, r = MS_CAL - w;
      if (!(r > 0 && r <= MS_CAL + 1e-6)) f.push(`turnover out of range at tau=${t}`);
    });

    /* No year, no era, anywhere — and the page recurs exactly every 360 dates,
       before and after absorption alike. That recurrence IS the eternal time:
       the face returns to where it was while the date count keeps running. */
    if ('year' in matrixCalendar(0)) f.push('the calendar exposes a year');
    [0, 137.5, 359.99, TAU_STAR, TAU_STAR + 1000].forEach(t => {
      const a = matrixCalendar(t), b = matrixCalendar(t + 360);
      if (a.dayIndex !== b.dayIndex || a.month !== b.month || a.day !== b.day
          || a.weekday !== b.weekday || a.week !== b.week)
        f.push(`the calendar page did not recur at tau=${t}`);
      if (b.dateNumber !== a.dateNumber + 360) f.push(`the date count broke at tau=${t}`);
    });

    /* the inverse inverts, and no reading ever reverses */
    LADDER.forEach(L => { if (L.tau < TAU_STAR) near(qOfTau(L.tau), L.q, Math.max(1, L.q * 1e-6), `qOfTau(tau(q=${L.q}))`); });
    let pj = Infinity, pi = -Infinity, pq = -Infinity;
    for (let k = 0; k <= 8000; k++) {
      const t = k / 10, j = retainedJ(t), ii = retainedIntegration(t), qq = qOfTau(t);
      if (j > pj) { f.push(`retained J rose at tau=${t}`); break; }
      if (ii < pi) { f.push(`integration fell at tau=${t}`); break; }
      if (qq < pq) { f.push(`q went backwards at tau=${t}`); break; }
      pj = j; pi = ii; pq = qq;
    }

    /* frozen constants and the two fractions, kept distinct */
    near(MS_CAL, 87658125.520752, 1e-6, 'Matrix date (ms)');
    near(LEAD_MS / 1000, 1258.125520752, 1e-9, 'clock dilation (s)');
    near(FRACTION_DIRECT * 100, 1.4561637971666, 1e-10, 'J0/Q %');
    near(FRACTION_12FOLD * 100, 17.473965566, 1e-9, '12·J0/Q %');

    if (f.length) console.error('[matrix] checks failed:\n  ' + f.join('\n  '));
  })();

  /* No test runner and no build step, so the pure functions are exposed for
     checking from the console or a headless browser. Read-only. */
  window.__matrix = {
    LADDER, LAUNCH, RUNGS, ABSOLUTE, J0, Q, TAU_STAR, TAU_STAR_FR, MS_CAL, LEAD_MS, RATE_R,
    FRACTION_DIRECT, FRACTION_12FOLD,
    recurrenceLadder, tauOfQ, qOfTau, retainedAtTau, nextRung, liveLoad, spanFraction,
    retainedJ, retainedResidualSec, retainedIntegration, isAbsolute,
    matrixCalendar, velocityM, livingPhaseM,
    getMatrixEpoch, getMatrixDayCount, cal360, CAL360, mode: MATRIX_MODE
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
    function drawCurve(phi) {
      const node = el('curve');
      if (!node) return;
      const W = 320, H = 74, P = 6;
      const vs = []; let lo = Infinity, hi = -Infinity;
      for (let i = 0; i <= 240; i++) { const v = velocityM(i / 240); vs.push(v); if (v < lo) lo = v; if (v > hi) hi = v; }
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
        + `<circle cx="${x(phi).toFixed(1)}" cy="${y(velocityM(phi)).toFixed(1)}" r="4" class="cal-curve-dot"/>`;
    }

    let ladderAt = null;
    const bignum = n => n.toLocaleString('en-GB');
    const secText = x => {
      if (x === 0) return '0';
      if (x >= 60) return Math.floor(x / 60) + 'm ' + (x % 60).toFixed(9).padStart(12, '0') + 's';
      if (x >= 1) return x.toFixed(9) + ' s';
      return x.toExponential(6) + ' s';
    };
    const pct  = a => (a * 100).toLocaleString('en-GB', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) + ' %';
    const live = a => (a * 100).toLocaleString('en-GB', { minimumFractionDigits: 6, maximumFractionDigits: 6 }) + ' %';
    const dtext = t => t.toLocaleString('en-GB', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    /* 6 decimals of a Matrix date is 0.0876 s, so tau, q and both meters all
       advance visibly on every 250 ms tick instead of standing still. */
    const taut  = t => t.toLocaleString('en-GB', { minimumFractionDigits: 6, maximumFractionDigits: 6 });
    /* How long until the turnover, in the coarsest unit that still reads as a
       countdown: hours until the last hour, then minutes, then seconds. */
    const until = ms => {
      const x = Math.max(0, Math.round(ms / 1000));
      if (x >= 86400) return `in ${Math.floor(x / 86400)}d ${Math.floor(x / 3600) % 24}h ${pad(Math.floor(x % 3600 / 60))}m`;
      if (x >= 3600) return `in ${Math.floor(x / 3600)}h ${pad(Math.floor(x % 3600 / 60))}m`;
      if (x >= 60)   return `in ${Math.floor(x / 60)}m ${pad(x % 60)}s`;
      return `in ${x}s`;
    };
    const qtext = q => q >= 1e9 ? q.toExponential(6)
                     : q >= 1e6 ? bignum(Math.round(q))
                     : taut(q);

    function drawLadder(rung, absolute) {
      const node = el('ladder');
      const key = absolute ? 'absolute' : rung.q;   /* one redraw per rung */
      if (!node || key === ladderAt) return;
      ladderAt = key;
      const rows = LADDER.map(L => {
        const reached = absolute || L.q <= rung.q;
        const here = !absolute && L.q === rung.q;
        const cls = here ? ' class="here"' : reached ? ' class="reached"' : '';
        return `<tr${cls}><td>${L.i + 1}</td><td>${L.state}</td>`
          + `<td>${bignum(L.q)}</td><td>${bignum(L.J)}</td><td>${pct(L.integration)}</td></tr>`;
      }).join('');
      node.innerHTML =
        '<thead><tr><th>Rung</th><th>State</th><th>Depth <i class="sym">q</i></th>'
        + '<th>Retained J</th><th>Integrated</th></tr></thead>'
        + `<tbody>${rows}</tbody>`;
    }

    /* Retained readings only: J can only fall, integration can only rise, and
       the recurrent wave never feeds back into either. */
    function drawRetained(t) {
      el('m-tau').textContent = taut(t.tau);

      const nd = t.nextDateAt;
      el('m-nextdate').textContent = `${pad(nd.getHours())}:${pad(nd.getMinutes())}:${pad(nd.getSeconds())}`;
      el('m-next-label').textContent = `Next date at · ${until(t.toNextDateMs)}`;
      el('m-datenum').textContent =
        `${CAL360.days[t.weekday].name} ${t.day} ${CAL360.months[t.month]}`;
      el('m-depth').textContent = qtext(t.q);
      el('m-load').textContent = bignum(Math.round(t.load));
      el('m-load0').textContent = bignum(J0);
      el('m-residual').textContent = secText(t.residualSec);
      el('m-integration').textContent = live(t.integration);
      el('m-remaining').textContent = live(1 - t.trajectory);
      el('m-next').textContent = t.next
        ? `q ${bignum(t.next.q)} · J ${bignum(t.next.J)}`
        : '—';
      el('m-tonext').textContent = t.next ? `${taut(t.toNextTau)} Matrix dates` : '—';
      el('m-loadpct').textContent = live(t.loadFraction);

      /* The named state is no longer a panel cell: it reads in the note under
         the calendar and is highlighted in the ladder, where its rung sits. */

      /* Meter 1 — approach to the next hard rung. Fills across the current
         span and resets when the rung is taken. */
      const meter = (barKey, pctKey, value) => {
        const bar = el(barKey);
        if (bar) {
          /* a started meter should read as started: floor the drawn width so a
             fraction of a percent is still a visible sliver. The number beside
             it is never floored. */
          bar.style.width = (value > 0 ? Math.max(value, 0.005) * 100 : 0).toFixed(6) + '%';
          bar.parentElement.setAttribute('aria-valuenow', (value * 100).toFixed(4));
        }
        const pct = el(pctKey);
        if (pct) pct.textContent = live(value);
      };
      meter('m-rung-bar', 'm-rung-pct', t.rungProgress);
      meter('m-bar', 'm-process', t.trajectory);

      el('m-rung-label').textContent = t.absolute
        ? 'all twenty states reached'
        : t.next ? `approach to rung ${t.next.i + 1} · q ${bignum(t.next.q)}` : 'approach to absorption';
      el('m-bar-label').textContent = t.absolute
        ? 'trajectory complete — the calendar continues'
        : 'process · trajectory to absorption';
    }

    const REGIME = {
      burn:   { label: 'Sleep burn — the clock is racing', accent: 'violet' },
      repay:  { label: 'Morning repay — the clock is easing', accent: 'amber' },
      ripple: { label: 'Evening ripple — noon and midnight locked', accent: 'teal' }
    };

    function tick() {
      const t = cal360();
      const modeNode = el('mode');
      if (modeNode) modeNode.textContent = t.pending
        ? `Calendar anchored to 20 March 2027, 20:25 UT · retained process starts ${until(t.toLaunchMs)} · τ = 0, q = 0 until launch`
        : 'Live run — shared March equinox 2027 epoch';
      el('clock').textContent = `${pad(t.h)}:${pad(t.m)}:${pad(t.s)}`;
      const r = REGIME[t.regime];
      const badge = el('regime');
      badge.textContent = r.label;
      badge.setAttribute('data-accent', r.accent);

      el('vector').textContent = `${t.v.toFixed(6)}×`;
      el('rate').textContent = `${(1 / t.v).toFixed(4)}× solar`;
      el('phase').textContent = `${(t.phi * 100).toFixed(3)} %`;
      el('actualsolar').textContent = (() => {
        const x = Math.floor(t.sol.frac * 86400);
        return `${pad(Math.floor(x / 3600))}:${pad(Math.floor(x % 3600 / 60))}:${pad(x % 60)}`;
      })();
      el('drift').textContent = `${t.drift < 0 ? '−' : '+'}${mmss(t.drift)}`;
      drawCurve(t.phi);

      el('caldaylen').textContent = '24h 20m 58.126s';
      el('slip').textContent = `${(LEAD_MS / 1000).toFixed(9)} s`;
      el('capacity').textContent = bignum(Q);
      el('fraction').textContent = `${(FRACTION_DIRECT * 100).toFixed(10)} %`;

      el('offset').textContent = `${sign(4 * (CAL360.longitude - t.sol.meridian))} min`;
      el('eot-total').textContent = `${sign(t.sol.eot.total)} min`;
      el('eot-ecc').textContent = `${sign(t.sol.eot.eccentricity)} min`;
      el('eot-obl').textContent = `${sign(t.sol.eot.obliquity)} min`;

      drawLadder(t.rung, t.absolute);
      drawRetained(t);

      el('today').innerHTML = (t.pending ? '<strong>Before the March 2027 equinox.</strong> Current Matrix calendar: ' : `<strong>Matrix date ${bignum(t.dateNumber)}</strong> — `)
        + `<strong>${CAL360.days[t.weekday].name} ${t.day} ${CAL360.months[t.month]}</strong>, `
        + `week ${t.week} of 5, date ${t.dayIndex + 1} of 360. `
        + `Informational depth <strong>q = ${qtext(t.q)}</strong> (not a number of days). `
        + (t.pending
            ? 'The retained process begins at the equinox; the daily solar clock is already running.'
            : t.absolute
            ? `State <strong>${t.state}</strong>: J = 0, residual 0, integration 100%. The calendar continues.`
            : `State <strong>${t.state}</strong>, ${t.rung === LAUNCH ? 'descending from launch toward' : 'descending from'} rung <strong>q = ${bignum(t.rung === LAUNCH && t.next ? t.next.q : t.rung.q)}</strong>. `
              + `J = ${bignum(Math.round(t.load))}, residual ${secText(t.residualSec)}, `
              + `${live(t.integration)} integrated.`);
      if (follow && t.month !== shown) { shown = t.month; drawGrid(); }
    }

    /* Launch status is updated by tick, including the transition at the epoch. */
    const modeNode = el('mode');
    if (modeNode) modeNode.textContent = MATRIX_MODE === 'simulation'
      ? 'Study / simulation mode — virtual epoch, not the March 2027 run'
      : 'March equinox 2027 run';
    const resetBtn = el('reset-epoch');
    if (resetBtn) {
      if (MATRIX_MODE !== 'simulation') resetBtn.hidden = true;
      else resetBtn.addEventListener('click', () => {
        resetMatrixEpoch();
        ladderAt = null; follow = true;
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
    // A same-page research category change switches category in place.
    if (page === 'research' && $('#research-nav')) {
      showResearchCategory(id || 'framework', { focus: true });
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
    else if (category(page)) {
      html = collectionPage(category(page), id);
      if (page === 'research') {
        const cat = RESEARCH_CATEGORIES.find(c => c.id === id) || RESEARCH_CATEGORIES[0];
        title = `${cat.label} — ${category(page).name}`;
      } else {
        title = category(page).name;
      }
    }
    else { html = notFound(); title = 'Page not found'; }

    main.innerHTML = html;
    document.title = `${title} — Science Coherence`;
    $$('.desktop-nav a').forEach(a => a.classList.toggle('active', a.hash === '#/' + page || (page === 'read' && byId(id) && a.hash === '#/library')));
    $('#mobile-nav').hidden = true; $('#menu-toggle').setAttribute('aria-expanded', 'false');
    $('#search-dialog').close(); $('#link-dialog').close(); $('#lexicon-dialog')?.close();
    window.scrollTo({ top: 0, behavior: 'instant' });
    main.focus({ preventScroll: true });

    if (page === 'research') {
      enhanceResearchNav();
    }
    if (page === 'library') {
      Object.assign(libraryState, { filter: 'all', place: 'all', query: '', sort: 'newest' });
      updateLibrary();
      $('#library-place').addEventListener('change', e => { libraryState.place = e.target.value; updateLibrary(); });
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
