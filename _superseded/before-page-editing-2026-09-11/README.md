# Science Coherence — website

A dependency-free static site. No build step is required to run it: `index.html`
loads three scripts and a stylesheet, and everything else is content.

```
index.html              page shell: header, footer, dialogs, meta, JSON-LD
styles.css              the whole design system (tokens, light + dark, layouts)
app.js                  router, renderers, search, reader, document register
content.js              the articles (imported texts + collection introductions)
sections.js             the sections: Research, The Lab, Transmissions… (menu-level)
collections.js          the collections inside a section: Research 01 Framework…
documents.js            generated — do not edit by hand
documents/              the source of documents.js
  holographic-repolymerization.html          sections, as authored
  holographic-repolymerization.lexicon.json  the lexicon entries
assets/
  mark.svg              site mark / favicon
  fonts.css, fonts/     self-hosted Newsreader, DM Sans, JetBrains Mono
  vendor/katex/         self-hosted KaTeX (maths), loaded only when needed
sources/                the original imported files, kept as downloads
tools/
  build-documents.py    documents/ -> documents.js
  fetch-fonts.py        re-download and re-generate the self-hosted fonts
```

## Running it

Any static host works, and so does a local server:

```
python3 -m http.server 8000     # then open http://localhost:8000
```

Opening `index.html` straight from disk works too, but Chrome blocks font files
loaded over `file://`, so the page falls back to system fonts. Serve it over
http to see the real typography.

Routing is hash-based (`#/library`, `#/read/<id>`, `#/protocol`), so the site can
be dropped into any subdirectory, including GitHub Pages, with no server
configuration. Two routes are retired and redirect rather than 404: `#/explore`
now lands on the library, and `#/read/holographic-repolymerization/<section>`
lands on `#/protocol/<section>`.

## Two kinds of content

**Articles** live in `content.js` — one object per piece, with `body` holding
the HTML. They render in the reader: a sticky table of contents, reading
progress, save-for-later, previous/next within the collection, and related
pieces.

**Documents** are versioned, interactive operating documents. The protocol is
one, and it has its own top-level route (`#/protocol`) and nav entry rather than
sitting inside a section — `sections.js` marks it `standalone: true`, which
keeps it out of the six-card grid while leaving it in the library and search. They render in
their own register: a sticky section bar, per-section panels (or one continuous
scroll — the reader chooses, and the choice is remembered), rendered maths, dose
tables that rescale to body mass, a resonant-field pacer, and a filterable
lexicon.

### Editing a document

Edit the file in `documents/`, then rebuild:

```
python3 tools/build-documents.py
```

Each `<section>` becomes one navigable section. The attributes drive the
navigation:

```html
<section data-id="protocol" data-num="2" data-label="Master Protocol"
         data-title="Master Protocol" data-summary="One line under the heading.">
```

`data-id` is also the URL fragment: `#/protocol/<section-id>`.

The `<script type="application/json" id="meta">` block at the top holds the
document's title, version, date, collection, description, archival note, the
four facts shown in the header, and the path to the preserved source file. Word
count and reading time are computed at build time.

Write maths as `$…$` (inline) or `$$…$$` (display). Cards, callouts, tables and
"in plain terms" passages use the classes documented in section 10 of
`styles.css`:

| Class | What it is |
| --- | --- |
| `.card` + `data-accent="teal\|blue\|violet\|amber\|rose\|green"` | a bordered block with a coloured spine |
| `.card-grid.cols-2` / `.cols-3` | a responsive row of cards, collapsing on mobile |
| `.callout` | a tinted, left-ruled aside |
| `.plain` | the plain-English restatement under a technical passage |
| `.warning` | a safety block |
| `.formula` | a centred display formula |
| `.table-scroll` > `table.data` | a table that scrolls sideways instead of breaking the page |
| `.phase` | one protocol window, with its own head and table |
| `.dose` with `data-min`, `data-max`, `data-unit` | a dose that the body-mass selector rescales |

## Interactive articles

An article body may carry a widget: any element with `data-widget="<name>"` is
wired up by `enhanceArticle()` in `app.js` after the reader renders, and its
teardown is registered so it stops cleanly when the reader navigates away.

`calendar360` — the temporal matrix on the calendar page in The Lab — draws the
grid, runs the clock and plots the velocity field. Its constants live in
`CAL360`: the `epoch` (the March equinox, as a UTC timestamp), `tropical`, the
twelve month names, the six day names, and `longitude` (the clock needs a place;
the page exposes it as a field, defaulting to the timezone meridian).

The engine runs **two independent cadences**, and keeping them separate is the
whole design:

- **The clock** is anchored to apparent solar time and re-anchored to it every
  day. `solarFraction()` returns the position through the solar day, applying
  the meridian offset and `equationOfTime()`. `livingPhase()` inverts
  `consumed()` by bisection to turn that into the dilated reading.
- **The calendar** is free-running: one date every `MS_CAL` (365.2422/360 days
  = 24h 20m 58.13s), counted from the epoch. The date therefore turns over
  20m 58s later each day and completes a circuit of the clock face every 68.673
  days — 5.2422 times a year, which is exactly the surplus.

`velocity(phi)` is the non-linear field: `1 − VB·sin⁴(6πφ)` through the burn
window (00:00–04:00), `1 + VA·sin²(3π(φ−1/6))` through the repay window
(04:00–12:00), and `1 + VC·sin(4π(φ−½))` across the evening. `consumed(phi)` is
its exact closed-form antiderivative, so nothing integrates numerically and no
error accumulates.

Two identities are load-bearing and must survive any edit to the constants:

```
∫₀^½ v dφ = ½   →  12:00 sits at peak sun
∫₀¹  v dφ = 1   →  00:00 sits at solar midnight
```

`VB` is set to the daily surplus (`16 · LEAD_MS / MS_DAY`) and `VA` is solved as
`3·VB/8` to satisfy them; `VC` has a whole number of periods so it integrates to
zero. Changing any of the three without re-deriving the others breaks an anchor
silently — the clock will still run, it will just no longer be noon at noon.

### Two coordinates

| | meaning | range | label |
| --- | --- | --- | --- |
| `tau` | physical Matrix time — elapsed time in the calendar | 0 → ∞ | "Matrix time" / "Matrix date" |
| `q` | informational recurrence depth — internal coordinate | 0 → 600,000,000,000 | "depth" / "rung", **never** "date" |

The singular relation is active **from launch** — no delayed onset:

```
dtau/dq = J_ret(q) / J0      from tau = 0, q = 0
```

The calendar continues indefinitely. There is no end of time and no stop at
closure. Rung `q = 206` is reached at `tau ≈ 113.391347139501`, not at date 206.

### The exact foundation

```
Y     = 365.2421896698                             frozen reference
alpha = E/360 = 8,736,982,783 / 600,000,000,000    irreducible
J0    = 8,736,982,783      Q = 600,000,000,000
```

One Matrix date is `1.014561637971666…`, so the clock dilation is fixed at
**20m 58.125520752s** and a Matrix date is **24h 20m 58.125520752s**. That
dilation does **not** change when the retained load changes — the clock reading
and the integration process are distinct readings. `q·J0` reaches 5.2 × 10²¹, so
the ladder is computed in **BigInt**.

### Framework semantics

`Q` is total system capacity, the complete normalised domain — **not joules**, no
unit conversion claimed; if an elementary unit `epsilon` is derived,
`E_total = Q·epsilon`. `J` is the unresolved load in the same units. Two
fractions, kept apart: the direct `J0/Q = 1.4561637971666…%`, and the 12-fold
Matrix-month translation `12·J0/Q = 17.473965566%`, a cross-domain quantity. The
UI must not claim physics or genetics has established either reading.

### Retained integration and the absorption point

`J_ret` is monotonically non-increasing; a later wave recurrence may never raise
it. Integrating the staircase from launch gives, as a derived rational:

```
tau* = 6,251,584,658,434 / 8,736,982,783 ≈ 715.5313011029427 Matrix dates
```

Not chosen, not rounded, not calibrated. Past it the state is clamped — `q = Q`,
`J = 0`, residual 0, integration 100%, permanently — and nothing divides by zero.
`tau*` is internal: it may appear in detail, never as a headline countdown.

### Checking it

`checkMatrix()` runs at load, silent on success: the 20-rung ladder, `J` and
residual at each, the monotone staircase, `tau` at every rung, `tau*` as the
exact rational, the `q = 206` collapse figures, clamped absolute state at and
past `tau*`, the calendar still advancing there, `qOfTau` inverting `tauOfQ`, and
no reading reversing across 8,000 samples. Pure functions are on `window.__matrix`.

## Adding an article

Append an object to the array in `content.js`:

```js
{ id, title, category, collection, type, date, minutes, words, description,
  tone, note, download, search, body }
```

Every piece is classified three ways, and the three are kept apart:

| field | what it is | where it is defined |
| --- | --- | --- |
| `category` | the **section** it lives in: `research`, `lab`, `transmissions`, `learning`, `regenesis` | `sections.js` (`window.SC_SECTIONS`) |
| `collection` | the **collection** inside that section — for Research: `framework`, `philosophy`, `meta-mathematics`, `biophysic`, `notes-methods` | `collections.js` (`window.SC_COLLECTIONS`) |
| `type` | what **kind** of piece it is: Research article, Collection introduction, Transmission… | free text on the piece |

A section that has collections requires every article in it to name one; a
section without collections takes none. `protocol` is marked
`acceptsArticles: false`: it holds the operating document, not articles.

Each collection is `{ id, section, num, name, description, tagline, connected,
order }`. The Research page's tabs are the research section's collections in
`num` order; a tab lists the articles that name the collection, those in
`order` first and the rest newest first. The Library classifies by `type`
(the row of filters) and can be narrowed to a section or a collection.

The Writing Room can create a collection (numbered after the last one in its
section) and rename one or change its description. It cannot change an
address, renumber, move between sections or delete — edit `collections.js` for
those. Sections are edited by hand in `sections.js`. `app.js` keeps a copy of
both lists as a fallback for a page opened without the files, so keep them in
step. The top navigation in `index.html` is written by hand.

Two flags shape where a section appears.

`hidden: true` keeps a section reachable at its own URL with all its pieces,
but it appears in no navigation, no card grid, no library filter and no search
result. `regenesis` and `learning` are hidden this way — remove the flag to bring
one back.

`standalone: true` keeps a section outside the two primary home-page paths
while leaving it fully listed everywhere else: its own route, its own nav entry,
its own library filter, and its pieces in search and in the library.
`transmissions` and `protocol` are both standalone, and each has its own feature
block on the home page.

The home page offers two primary feature paths: `research` and `lab`. The former
Ethos collection has been folded into Research, so its two articles now carry
`"category": "research"`; the retired `#/ethos` route redirects to
`#/research`. Regenesis was also folded into Research earlier, so restoring it
means removing its `hidden` flag and moving its piece back.

Every page hero carries the green band: `pageHero()` defaults its `green`
argument to `true`, and the protocol's own header uses `.page-hero.green
.doc-hero` so the document page matches the collection pages. `tone` picks the card artwork
colour: `forest`, `ochre`, or `sage`. `search` is the lower-cased text used by
the search index.

## Notes

- Nothing is loaded from a third party: fonts, KaTeX, and all scripts are served
  from this site, so opening a page contacts no external host.
- The reading list and the theme choice live in `localStorage`; nothing is sent
  anywhere.
- Light and dark themes are both defined in tokens at the top of `styles.css`;
  the theme follows the system setting until the reader picks one.
- Colour pairs were checked against WCAG AA in both themes.
- `@media print` collapses the document to a continuous, chrome-free copy, so
  "Print / save PDF" produces a readable document.

## Structure of the argument

The site rests on one premise, set out in *The Ethos of Being*: there is no
vantage point outside the process from which the process can be judged. Validity
is therefore settled by selection (Λ) — what survives repeated cycles — rather
than by external verification.

Three consequences run through the content and are worth preserving when editing:

1. Every piece states what would count against it. A document with no failure
   conditions is treated as untested, not as strong.
2. Versions supersede rather than accumulate. `A living architecture of
   coherence` is V3; the V2 source stays in `sources/` and the piece says so.
3. The operating document is an architecture, not an instruction. Its note says
   this in the site's own register, and the isolation rules in section 2 are
   load-bearing — they describe fast, physical failure modes. Keep both intact.
