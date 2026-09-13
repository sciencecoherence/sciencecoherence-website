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

### The absorption ladder

The calendar carries a rational slip of exactly `8737/600000` of a day per date,
so the Euclidean algorithm on it terminates. `coherenceLadder()` runs that one
recursion and returns **two** sequences per rung, because they are two views of
the same quantity:

| field | meaning | layer |
| --- | --- | --- |
| `dates` | convergent denominator q — the date the rung is attained | baseline |
| `load` | Euclidean remainder r — the load still active | matrix |
| `residualMs` | ε(J) = J/600000 × 86400 s | matrix |
| `absorbed` | A = 1 − J/J₀, from integers | matrix |

The two are tied by `r_k = |q_k·J0 − p_k·Q|`, which the function **asserts at
every rung** rather than assuming, so the table can never drift from the
arithmetic. Products stay far inside the exact-integer range.

**Retained absorption.** `activeCoherenceLevel(N)` returns the rung of the
highest milestone matrix date `N` has already passed; `unresolvedLoad`,
`absorptionFraction` and `residualSeconds` read off it. The reduction is kept —
the load never rises, and there is no supercycle after 600,000. It is stepwise
on purpose: the mathematics gives discrete milestones, and a continuous
absorption law would be an assumption this version does not make.

**One meter, and two readings of the same progress.** The single meter is
`rungProgress` (`m-approach-bar`): position within the interval between the rung
in force and the next, so it sweeps 0 → 100% once per rung. `absorbedLive` is the
continuous integrated fraction — the stepwise rung value carried toward the next
in proportion to `rungProgress` — and `Integrated` + `Remaining` are read from
it, so they always sum to 100 and move together.

`unresolvedLoad`, `residualSeconds` and the ladder table remain discrete, and
**`J` is never driven from the live value** — the continuous reading is
presentation over a discrete state, not a redefinition of it. Keep that split if
you touch this. The panel itself reports only the continuous reading: a second
per-rung percentage next to it read as a contradiction, so it was removed. The
exact value at each rung stays where it belongs, in the ladder table.
Both the panel and the article say so in words.

**Two layers, kept visibly apart.** The baseline is the defined year 365.2422,
the raw slip, the passive convergents, and

```
600,000 matrix dates = 608,737 defined solar days   residual exactly 0
```

asserted in integers (comparing the float `MS_CAL` would fail on binary
rounding, not on arithmetic). The matrix layer is J(n), A(n), the retained rung
and the modeled turnover displacement. `cal360()` returns both — `turnH/M/S` is
the baseline free-running boundary, `mTurnH/M/S` is the modeled one, displaced
from apparent solar midnight by ε and closing on 00:00 as the load falls. The
instrument labels which is which; do not let a modeled value read as an
observation.

### Progress-coupled dilation

The clock and the ladder are one system. `absorbedLive` (`A`) is the **control
variable**: it drives the modelled clock as well as the display.

**The dilation is applied from day one.** A matrix day is 24h 20m 58.128s of
reference time — one calendar date — at every stage, so the mean never moves.
With `R = 608737/600000`:

```
v_A(φ) = R · [ 1 + (1 − A)(v(φ) − 1) ]      the wave, renormalised
C_A(φ) = (1 − A)·consumed(φ) + A·φ          its normalised antiderivative
```

Mean = R for all A; amplitude scales by (1 − A). What absorption changes is the
**structure** of the dilation inside the day, not its total. At A = 1 the wave is
gone and those 24h 20m 58.128s are spread evenly over 24 clock hours. Because
`C_A` is a linear blend, `C_A(½) = ½` and `C_A(1) = 1` for every A — noon and
midnight stay anchored throughout.

**ε is the residual non-uniformity.** The clock's peak departure from steady
flow, at 04:00, is `(1 − A)·1258.128 s` — the ladder residual at every rung,
exactly. Nothing imposes it; it is what the wave does, and it reaches zero when
the dilation is fully normalised. `excursionMs(A)` returns it.

**The clock stays anchored to apparent solar time**, exactly as before the
coupling. `phi = livingPhaseAt(sol.frac, A)`. Because `C_A(½) = ½` at every A,
12:00 is peak sun throughout, and the clock's departure from the sun is bounded
by the current ε — minimal, and shrinking as the dilation normalises. Do not
re-anchor the clock to `within / MS_CAL`: that decouples it from the sun and the
readings diverge by hours.

`A` is recomputed from the fractional matrix date on **every tick**, so the wave
relaxes continuously; nothing about the clock waits for a rung or a date
boundary.

**Solar anchoring.** The framework holds that Earth's rotation slows through the
absorption — fast at first, then ever more slowly — so the solar day lengthens
to meet the matrix day, and the flow of time slows with it. By around date 259
most of the 5.2422 and most of the 8,737 are absorbed and the year is close to
360 rotations of 24h 20m 58.128s. Present-day apparent solar time stays on the
panel as *Actual apparent solar*, labelled as a reference. The coupling is the
Science Coherence framework's proposal;
[NIST](https://www.nist.gov/pml/time-and-frequency-division/leap-seconds-faqs) and
[NASA](https://science.nasa.gov/learn/basics-of-space-flight/chapter2-1/) are
cited only for the standard astronomical/atomic distinction, not as support.

`checkCoupling()` asserts the constant mean at five values of A, the anchors at
each, the wave's disappearance at completion, ε as the measured peak excursion at
all nine rungs, retention at 600,001 / 700,000 / 5,000,000, and that the clock
never steps backwards across a rung boundary (midnight rollover excluded).

### Simulation mode and the effective epoch

`MATRIX_MODE` is `'simulation'` until the March 2027 run begins. Everything
downstream reads the matrix clock through `getMatrixEpoch()`, `getMatrixNow()`
and `getMatrixDayCount()`, so going live is a one-line change: set
`MATRIX_MODE = 'live'` and fill in `CAL360.epochLive`.

In simulation the epoch is `Date.now() - MS_CAL`, written once to `localStorage`
under `sc-matrix-epoch` and then left to advance naturally — so first load opens
at about matrix date 2 and time runs forward from there rather than resetting on
every reload. The reset control rewinds it to one matrix date ago. The banner
saying this is simulated state is load-bearing, not decoration.

### Checking it

There is no test runner and no build step, so `app.js` runs its own assertions
at load: the ten date→load→residual cases (including 600001, which proves
closure stays closed), monotone descent of the load, and the baseline identity.
They log to `console.error` and are silent when they pass. The pure functions
are also exposed read-only on `window.__matrix` for checking from the console or
a headless browser.

## Adding an article

Append an object to the array in `content.js`:

```js
{ id, title, category, type, date, minutes, words, description, tone,
  note, download, search, body }
```

`category` is one of `research`, `regenesis`, `transmissions`, `lab`,
`learning`, `protocol` (defined at the top of `app.js`).

Two flags shape where a collection appears.

`hidden: true` keeps a collection reachable at its own URL with all its pieces,
but it appears in no navigation, no card grid, no library filter and no search
result. `regenesis` and `learning` are hidden this way — remove the flag to bring
one back.

`standalone: true` keeps a collection outside the two primary home-page paths
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
