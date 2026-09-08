# Science Coherence — website

A dependency-free static site. No build step is required to run it: `index.html`
loads three scripts and a stylesheet, and everything else is content.

```
index.html              page shell: header, footer, dialogs, meta, JSON-LD
styles.css              the whole design system (tokens, light + dark, layouts)
app.js                  router, renderers, search, reader, document register
content.js              the articles (imported texts + collection introductions)
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
sitting inside a collection — `collections` marks it `standalone: true`, which
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

Two are implemented, both on the calendar page in The Lab.

`calendar360` draws the grid and runs the clock. Its constants live in
`CAL360`: the `epoch` (the March equinox that is degree zero), `tropical`, the
twelve month names, the six day names, and `longitude` (the clock needs a place;
the page exposes it as a field, defaulting to the timezone meridian).

The date is the orbital degree, not a tally: `degreeOf(rotations)` returns the
degree a given sun-day begins in, and `cal360()` reports the date, whether today
is the second sunrise inside its degree, and how far off the next such date is.
`equationOfTime()` returns the obliquity and eccentricity terms separately;
`solarTime()` combines them with the meridian offset so 12:00:00 is peak sun;
`solarDay()` returns the true length of today's solar day, which is what makes
the clock's rate genuinely variable.

## Adding an article

Append an object to the array in `content.js`:

```js
{ id, title, category, type, date, minutes, words, description, tone,
  note, download, search, body }
```

`category` is one of `research`, `regenesis`, `ethos`, `transmissions`, `lab`,
`learning`, `protocol` (defined at the top of `app.js`).

A collection marked `hidden: true` stays reachable at its own URL and keeps all
its pieces, but appears in no navigation, no card grid, no library filter and no
search result. `transmissions` is currently hidden this way — remove the flag to
bring it back. `tone` picks the card artwork
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
