# Science Coherence Website

## Purpose

Continue developing the existing Science Coherence website: improve discovery, reading, interactive documents, content consistency, and readiness for publication while retaining its current identity.

## Current baseline — 8 September 2026

- Canonical working folder: `C:\cohera\science-coherence-website`.
- Original snapshot: Git commit `e67aae3`, tag `baseline-2026-09-08`, on branch `main`.
- Original inventory: 59 files, 2,073,707 bytes; 11 articles including hidden content, plus one interactive document. The visible library lists nine pieces.
- Separate ZIP backup: `science-coherence-baseline-2026-09-08.zip`, delivered with the baseline review.
- All 59 archived files were compared byte-for-byte with the original working files. No differences were found.
- Local Git author for the setup commits: `Codex <codex@localhost>`, applied per commit. No global Git identity was configured.
- No remote repository or deployment was configured as part of this milestone.

The saved Codex project list had two other entries called sciencecoherence-blog, both pointing to different folders. This folder was not added to the app sidebar during this milestone. Future website tasks should use this exact folder.

## Preview and checks

From this folder, with Python available:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/`. This preview binds only to this computer. Stop the server with Ctrl+C in the terminal that runs it.

On the machine used for this baseline, Python's normal command points to a Windows app alias. The working bundled interpreter was:

```powershell
& 'C:\Users\julie\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m http.server 8000 --bind 127.0.0.1 --directory 'C:\cohera\science-coherence-website'
```

The bundled runtime path may change; rediscover it through the app's workspace dependencies when needed.

JavaScript syntax checks:

```powershell
node --check app.js
node --check content.js
node --check documents.js
```

After editing authored document content, rebuild with `python tools/build-documents.py` using an available interpreter. During the baseline review, the builder was run in memory for comparison: its output data matched the existing documents.js exactly.

## Decision — the temporal matrix (2026-09-08)

The calendar instrument was rewritten to V7. Earlier versions tried to dissolve
the 365.2422/360 surplus into the length of the day; that is impossible, because
a ratio of two physical periods is immune to the unit it is measured in. The
surplus must surface somewhere, and the decision here is **where**.

V6 put it in six two-day dates. V7 puts it in the **hour the date turns over**:
the clock re-anchors to apparent solar time every day (so noon and midnight are
exact by identity, with no accumulating offset), while the date advances on the
orbital cadence of 24h 20m 58.13s and therefore turns over 20m 58s later each
day, completing a circuit every 68.673 days — 5.2422 a year.

Consequences to preserve:

- Every date is exactly one day long. No two-day dates, no intercalation, no
  leap day, no skipped date, and the equinox stays at 0° on 1 March.
- The cost is real and is stated in the article's failure conditions: the date
  does not change at midnight, so a date and a sleep are not the same object.
- The two integrals in README.md are load-bearing. Changing `VB`, `VA` or `VC`
  in `app.js` without re-deriving the others breaks an anchor silently.
- `sources/calendar-360-temporal-matrix.html` is the standalone instrument and
  the article's download. Earlier engines stay under `sources/`.
- The article now states the closure result: the slip is rational (`8737/600000`
  of a day per date), so the recursion on it terminates in nine cycles and the
  5.2422 is consumed rather than stored. Cycle 4 (3,365 dates, 9.35 years) is
  already within 0.72 s; cycle 8 (600,000 dates, 1,666.67 years) is exact.
  This closes on the year *as defined*, not on a measurement — the article says
  so, and that qualification should stay.
- The failure-condition bullet about dates and sleeps was corrected: the
  turnover is inside the 00:00–04:00 window only 16.7% of the circuit, so the
  date changes while the reader is awake for the other 83.3%. It is the normal
  case, not an occasional one.

## Superseded decision — three paths (2026-09-09)

This arrangement was superseded later the same day by the two-feature-path
decision recorded below.

Navigation and the home page were consolidated. This is deliberately reversible;
nothing was deleted.

- The home page offers **three** ways in: Research & frameworks, The Ethos of
  Being, The Lab. The eyebrow reads "Three ways into the work".
- **Regenesis** is hidden and emptied: its piece was recategorised to `research`,
  and the "protocol this leads to" cross-link moved to the Research page with it.
  Reverting means clearing the `hidden` flag and moving the piece back.
- **Learning in public** is hidden, with its piece left in place. Clearing the
  flag is the whole revert.
- **Transmissions** is back, but as `standalone: true` rather than a fourth path:
  it has its own route, its own nav entry between The Lab and Library, its own
  library filter, and its own green feature block on the home page beside the
  protocol's — deliberately not one of the three ways in. Its pieces are excluded
  from the "Recent work" grid so the feature is the way to them.
- The **architecture feature** that opened the Ethos page is parked behind
  `SHOW_ETHOS_OPENER = false`. The markup is untouched and still needs a home.
- Nav order in the header and mobile menu: Research · Ethos · The Protocol ·
  The Lab · Library · About. The footer does **not** repeat it — the duplicate
  path column was removed as excessive, leaving the brand and the utility column
  (GitHub, reading list, editorial principles, privacy). `.footer-top` is a
  two-column grid accordingly. Do not reintroduce a nav column there.
- **Style continuity:** every page hero now carries the green band. `pageHero()`
  defaults `green` to `true`, collection pages pass `c.green !== false`, and the
  protocol's header was rebuilt as `.page-hero.green.doc-hero` so it stops being
  the odd page out. The facts strip, tools row and note stay on paper below it.

## Decision — retained absorption (2026-09-09)

The temporal matrix moved to V8. The arithmetic did not change; the reading of it
did, and the behaviour follows the reading.

**Before:** `8737/600000` was a constant free-running slip, and the
continued-fraction ladder marked moments when the phase happened to come close to
midnight. Passing one changed nothing — the full 20m 58s slip resumed.

**Now:** J₀ = 8,737 is the unresolved historical load; Q = 600,000 is not an
amount of history but the resolution at which that load reaches exact zero. The
Euclidean remainders 8737 → 5884 → 2853 → 178 → 5 → 3 → 2 → 1 → 0 are the load
still active after each rung, and **each reduction is retained**: the load never
rises, an integrated residual is never reintroduced, and there is no supercycle
after 600,000. The modeled turnover closes on solar midnight as J falls and stays
at 00:00 once J = 0.

Consequences to preserve:

- The ladder is derived, not tabulated. `recurrenceLadder()` expands the
  continued fraction of `J0/Q` in BigInt and asserts `J_i = |q_i·J0 − p_i·Q|` at
  every rung; if that assertion ever fires, the validation table and the
  arithmetic have diverged and the table is wrong.
- `LADDER[0]` is the **launch state**, not a rung. It is the zeroth convergent
  `0/1`: `q = 1` with `J` still `J0` and nothing integrated. The validation
  table lists it, so it stays in the array, but it must never be presented as a
  reduction. `LAUNCH` and `RUNGS` name the two parts; there are **nineteen**
  hard rungs.
- **Absorption is a live process** (2026-09-11, at the author's request, and
  this reverses the earlier "no interpolation between rungs" instruction).
  `liveLoad(tau, rung, next)` descends from the held rung's `J` toward the next
  rung's across the span, and `Active J`, `Residual` and `Load integrated` all
  read from it, so every number on the panel moves at every tick. Two
  invariants are asserted over a 72,000-sample sweep and must hold: the live
  value is **exact at every rung**, and it **never rises**. A raw phase
  oscillation can never raise it.
- The rungs are the exact states the descent passes through — not the only
  moments anything moves. The ladder table carries the exact `J_i`, residual and
  integration at each, and that is where a reader looks for an exact figure.
- **Every rung is a named state**, twenty in all, `STATE_NAMES` in `app.js`,
  from `LAUNCH` through `COLLAPSE` and `TRACE` down to `UNIT` and `ABSOLUTE`.
  The names are labels for rungs and assert no mechanism. The panel's State cell
  shows the name and its index; `checkMatrix` asserts twenty distinct names and
  that the absorbing state is `ABSOLUTE`.
- **Two meters, both continuous**: approach across the current inter-rung span,
  and trajectory `tau/TAU_STAR` toward absorption. Only the drawn bar width is
  floored to a visible sliver; the percentage beside it never is.
- **`tau` and `q` are different coordinates and the case carries the whole
  distinction** — `q` is the recurrence depth, `Q` is the capacity. Any label
  under `text-transform: uppercase` folds `τ` to `T` and `q` to `Q` and destroys
  it, so every symbol in a transformed label is wrapped in `.sym`, which opts
  out. Before the first rung the two readings coincide numerically, because
  `J_ret` is still `J0` and so `dτ/dq = 1`; they separate at rung 1 and never
  meet again. The article says so rather than claiming they are never equal.
- **Two layers stay separated in the UI.** Baseline: defined year 365.2422, raw
  slip, passive convergents, and `600,000 dates = 608,737 defined solar days`.
  Matrix: J(n), A(n), retained rung, modeled turnover. The article and the
  instrument both label the second as interpretation. Do not let modeled values
  present as observations, and do not silently change the year definition.
- The earlier qualification stands and must remain: **exact closure is exact
  relative to the defined year 365.2422, not to an immutable astronomical
  measurement.**
- No physical claim. A falling simulated J says something about the instrument,
  not about the Earth, biology or cosmology.
- The solar clock was not touched. `solarFraction`, `livingPhase`, `velocity`,
  `consumed` and `VB`/`VA`/`VC` are unchanged, and the noon and midnight
  integral identities were re-verified after the change.
- `MATRIX_MODE = 'simulation'` is the current default and the instrument says so
  on its face. Going live is one line plus `CAL360.epochLive`.

Also in this pass: display maths wider than the reading column now scrolls inside
its own box (`.prose .katex-display`) instead of pushing the page sideways. That
was a live layout bug on the new *Reality as imagination that survives recursion*
article, not a temporal-matrix issue.

## Decision — the clock is coupled to absorption (2026-09-09)

An audit found the clock wave and the retained ladder running independently:
velocity was identical at date 1 and at date 600,000. They are now one system.

**The law.** The dilation is applied from day one — a matrix day is
24h 20m 58.128s of reference time, one calendar date, at every stage, so the
mean is always `R = 608737/600000`. Absorption changes only the *structure*
inside the day: `v_A(φ) = R·[1 + (1−A)(v(φ)−1)]`, amplitude scaling by (1−A) to
zero at completion. `C_A(φ) = (1−A)·consumed(φ) + A·φ` keeps the noon and
midnight anchors at every A.

Two wrong turns, recorded so they are not repeated. First: a mean *rising* from
1 to R — that treats the dilation as arriving late rather than being present
from the start. Second: anchoring the clock phase to the calendar date instead
of to apparent solar time — that decoupled it from the sun and the readings drew
apart by hours. **The clock stays anchored to the sun** (`livingPhaseAt(sol.frac,
A)`), so 12:00 is peak sun at every A and the departure from the sun is bounded
by ε. `A` is recomputed every tick, so the wave relaxes continuously rather than
stepping at a rung.

**ε is the residual non-uniformity,** not a turnover displacement: the clock's
peak departure from steady flow at 04:00, `(1−A)·1258.128 s`, which equals the
ladder residual at every rung exactly. It is measured from the wave, not
imposed. A matrix day *is* a calendar date, so there is no day/date drift and
the date begins at matrix 00:00 by construction.

**Contract change, made deliberately:** `absorbedLive` was presentation-only. It
now drives the modelled clock. Retained J stays discrete and every milestone
assertion still passes; the clock uses continuous A so it never steps backwards
at a rung.

**Attribution:** the coupling between retained integration, Earth's rotation and
the flow of time is the Science Coherence framework's proposal. NIST and NASA
are cited only for the standard astronomical/atomic distinction. Present-day
apparent solar time is labelled as a reference and never presented as the
model's own value.

## Decision — About page and El Ignorante (2026-09-09)

The About page now uses the supplied El Ignorante image, preserved in full at
`assets/el-ignorante.png`, beside a short introduction about curiosity, situated
inquiry and remaining open to revision. The image is a thematic introduction;
the page does not add biographical claims based on its scene. The existing author
introduction, account of the work across scales, three principles and reading
links remain. The layout stacks on small screens, uses the existing theme tokens,
and includes descriptive alternative text. About-specific styles are scoped under
`about-` classes. The temporal matrix and its article are outside this change.

## Decision — About page spirit sequence (2026-09-09)

The El Ignorante prose was replaced by the three existing inquiry principles:
imagination opens the question, coherence decides, and the work remains
revisable. The supplied image remains beside them. The principles now appear
once, at the opening of the About page, in a single-column sequence with
generous spacing and fine dividers. The existing “The spirit of the work” marker
and the link to the editorial principles remain. The following account of the
work across scales and the closing invitation are unchanged.

## Decision — Research consolidation and home feature paths (2026-09-09)

Research and Ethos are now one collection under **Research** navigation. The two former
Ethos articles carry the `research` category, the Ethos links were removed from
desktop and mobile navigation, and the retired `#/ethos` route redirects to
`#/research` so saved links continue to work. The Ethos of Being remains the
title of its article; it is presented as a foundational research text rather
than as a separate collection.

The home page's three-card “A whole, in many parts” section was replaced by two
large split-panel features: a light Research block and a dark The Lab block.
They reuse the visual language of the existing protocol and transmissions
features, which remain below them. The hero now begins with Research, and the
home-page figure captions run in sequence from 01 through 05.

The collection's visible page title was subsequently restored to **Research &
frameworks** while its navigation and library label remain the shorter
**Research**. Its hero introduction now reads: “Imagination is a beginning.
Research gives it definitions, measurements, and the possibility of becoming
reality.” Its descriptive scope names consciousness, time, and the patterns
that hold living systems together.

The Research sidebar's connected paths are intentionally editorial rather than
generated from the remaining collection list. Their order is: Start here, The
Ethos of Being, The Protocol, The Lab.

On the About page, the right-hand spirit sequence stretches to the same desktop
height as the El Ignorante figure beside it. Its three rows divide the available
height evenly; below tablet width, image and copy stack so neither is compressed.

## Decision — Writing Room integrated into the website project (2026-09-11)

The local Writing Room now lives at `writing-room/` inside the canonical
Science Coherence website folder. Its server resolves the parent project as the
website source, while retaining compatibility with the former side-by-side
folder layout. A top-level `Start-WritingRoom.cmd` opens the editor, and private
drafts and backups under `writing-room/data/` remain excluded from Git. The
That integration initially remained local-only; nesting it in the project did
not by itself expose write functions through the static public website.
When `writing-room/public/index.html` is opened through `file:///`, it now serves
as a styled launch page: it redirects to the active local service when available
and otherwise points the author to the top-level starter. The editor itself does
not pretend to operate without the write-capable local service.

## Decision — authenticated online Writing Room (2026-09-11)

The Writing Room now has a PHP/MySQL online mode in addition to its unchanged
local Python mode. Online authentication reuses the blog database's existing
`users` table and password hashes and limits access to administrator accounts.
Writing Room content uses three namespaced tables in the same database for
published snapshots, private per-user drafts, and revision history; setup does
not modify blog user records.

Publishing online updates the deployed website's canonical `content.js` and
records the previous article in MySQL. Therefore the website and `writing-room/`
must be deployed together in a PHP-capable document root where the folder
containing `content.js` is writable. Online edits are not Git synchronization: retrieve the deployed
`content.js` before a later code deployment so newer remote writing is not
overwritten. Database configuration remains outside the web root and can use a
Writing Room-specific private path while pointing at the same database.
## Decision — sections, collections and types (2026-09-11)

Julien's definition, which replaces the earlier arrangement from the same day:

- A **section** is where a piece lives on the site: Research, The Lab,
  Transmissions, and the hidden Learning and Regenesis. It is the article's
  `category`, and it is defined in `sections.js`.
- A **collection** is a named group inside a section. For Research: 01
  Framework, 02 Philosophy, 03 Meta-Mathematics, 04 Biophysic and 05 Notes &
  Methods, the Research page's tabs. It is the article's `collection`, and it
  is defined in `collections.js`.
- A **type** is what kind of piece it is, such as Research article or
  Collection introduction. The Library classifies by type.

Example: *Regenesis: aging as loss of phase* is in section Research, collection
04 Biophysic, type Collection introduction. It moved there from Notes & Methods
at Julien's direction.

History. ChatGPT (Codex) began this work by moving the site's section list out
of `app.js` into a file it called `collections.js`, with Writing Room back ends
to create and rename entries. It was interrupted when its usage ran out, and
Claude completed it. Julien then pointed out that his "collections" are the
Research tabs, not the sections. So the section list became `sections.js`
(`window.SC_SECTIONS`), and `collections.js` now holds the real collections.
Membership moved from the hard-coded `items` lists in `app.js` onto each
article's `collection` field. Each collection's `order` keeps the previous
display order.

Consequences to preserve:

- **Membership is enforced.** An article in a section with collections must
  name one of them, and an article in a section without collections names none.
  The Writing Room enforces this locally and online.
- **Collections from the Writing Room.** It can create a collection (numbered
  after the section's last one) and rename one or change its description. The
  address, number and section stay fixed.
- **Sections are otherwise hand-written.** A section's texts are editable under Pages (see below); its address, number and flags are edited by hand in `sections.js`,
  and so is the top menu.
- **Writing Room library.** It groups writing by collection and can show one
  collection or section at a time. New articles start in the collection being
  shown. The Type field suggests the types already in use, and a type is needed
  before updating the website.
- **Website Library.** Filters are by type, with a selector to narrow to a
  section or collection. A reader page links back to its collection's tab.
- **Launcher version.** The launcher reuses a running service only when its
  `roomVersion` matches (now 4), and otherwise replaces the stale Python
  service. When the page meets an older service, it says so and pauses saving.
  Bump `ROOM_VERSION` in `server.py`, `room.js` and `Start-WritingRoom.ps1`
  together.

## Decision — the main pages are edited in the Writing Room (2026-09-11)

At Julien's request, all the text of the main pages is editable from the
Writing Room under **Pages**: Home, Research, The Protocol, The Lab,
Transmissions, Library, About, Editorial principles and Privacy.

- **Where the copy lives.** It moved out of `app.js` into `pages.js`: 103
  fields on nine pages. Each `copy()` call keeps the original text as its
  fallback. Every page rendered byte-identical before and after the move, with
  and without `pages.js`.
- **Where each field is written.** Research and Transmissions also carry their
  section's texts (`sections.js`) and, for Research, each collection's name,
  description and small line (`collections.js`). The Protocol carries its
  title, subtitle, description, note, key figures and every section's tab
  name, title, summary and text. Those are written into
  `documents/holographic-repolymerization.html`, and `documents.js` is rebuilt
  with `tools/build-documents.py`. A rebuild of the untouched source is
  identical to the current `documents.js`.
- **Only the working parts are locked** in the Protocol's text: controls, the
  dose scaler, live dose values, the lexicon's generated list, and the pacer's
  lines that its script rewrites. The pacer's note and the six phase
  descriptions stay editable. The descriptions sit inside buttons, so they are
  edited as plain blocks and turned back into buttons on saving. The pacer was
  checked to still work after an edit.
- **Safety.** Every save sends only the changed fields. It is refused if any
  file involved changed since the page was opened, and it keeps an exact
  backup of each file first. If the Protocol cannot be rebuilt, its change is
  undone.
- **Not editable here.** Layout, links and figures stay in code. So do the top
  menu and footer in `index.html`, and the Protocol's lexicon entries
  (`documents/*.lexicon.json`).
- **Online.** The online Writing Room shows a note that pages are edited
  locally for now.
- `ROOM_VERSION` is now 4.

## Decision — two coordinates and the exact 720-date closure (2026-09-11)

The instrument's mathematics was rebuilt from the definitions rather than
patched. Every displayed number now derives from one model.

**The defect:** physical time and recurrence depth had been the same variable.
Rung numbers were being shown as dates.

**The rule now:** `t` is the physical Matrix date (0–720, what the reader lives
in); `q` is the informational recurrence depth (to 600,000,000,000, never a
number of days, never labelled "date"). Rung `q = 206` is reached at `t ≈ 117.86`.

**Frozen model:** `Y = 365.2421896698`, `alpha = 8,736,982,783 / 600,000,000,000`
irreducible, dilation exactly 20m 58.125520752s, Matrix date 24h 20m 58.125520752s.
The rounded 365.2422 model, `8737`, `600000`, `20m 58.128s`, 259 as a rung, and
endpoints 963 / 808 are all removed. Do not reintroduce any of them, and never
mix the two systems.

**Implementation:** the ladder is derived by continued fraction in **BigInt**
(`q·J0` exceeds 2⁵³), the `q → t` map is an exact piecewise-linear sum giving
`t(Q) = 720` exactly, and `qOfT` is its inverse. Retained `J` is monotonically
non-increasing; the oscillating wave must never feed back into it. Closure is
held permanently past `t = 720` with no division by `J = 0`. `checkMatrix()`
asserts the whole validation table at load.

**Two progress measures, deliberately distinct:** physical process progress is
`100·t/720`; retained integration is `100(1 − J/J0)`. Integration is nearly
complete long before the process is — do not merge them into one bar.

Fixed in the same pass, both pre-existing and unrelated to the model:

- `Pacer` threw on a missing `#pacer-audio-label`, which aborted
  `enhanceDocument()` and broke the whole Protocol page. Every pacer node is now
  optional; a document build that omits one no longer takes the page down.
- KaTeX keeps an absolutely-positioned MathML copy for assistive technology.
  With no positioned ancestor its containing block was the viewport, so long
  numerals extended the page on mobile. `.katex { position: relative }` confines
  it without removing it from the accessibility tree.

**Still open:** `#/about` references `assets/el-ignorante.png`, which does not
exist — a 404 on every load of that page. The image needs to be added or the
reference removed. *(Resolved in `C:\cohera\science-coherence-website`: the
image is present there. This note came from the older copy.)*

## Decision — the model is locked (2026-09-11)

The Instrument is rebuilt around one specification. Earlier models are removed,
not layered over.

**Two coordinates.** `tau` is physical Matrix time — elapsed time in the
calendar, which **continues indefinitely**. `q` is informational recurrence
depth, internal, running to Q, **never** a number of days and never labelled
"date". The singular relation `dtau/dq = J_ret/J0` is active **from launch**;
there is no delayed onset and no transition point.

**Frozen foundation.** `Y = 365.2421896698`,
`alpha = 8,736,982,783 / 600,000,000,000` irreducible, clock dilation fixed at
20m 58.125520752s, Matrix date 24h 20m 58.125520752s. The dilation does **not**
move with the retained load — clock and integration are distinct readings.

**Framework semantics.** `Q` = total system capacity, the complete normalised
domain; **not joules**, no unit conversion claimed (`E_total = Q·epsilon` only if
an elementary unit is ever derived). `J` = unresolved load, same units. Keep the
two fractions apart: direct `J0/Q = 1.4561638%`; 12-fold Matrix-month
translation `12·J0/Q = 17.473965566%`. The UI must not claim established physics
or genetics for either. These are cross-domain hypotheses under investigation.

**The absorption point is derived, not chosen.**
`tau* = 6,251,584,658,434 / 8,736,982,783 ≈ 715.5313011029427`. Do not round it,
do not calibrate it to 720 / 1080 / 1440, and do not treat it as the end of the
calendar. It is internal: fine in a detail view, never a headline countdown.
Past it the state clamps to `q = Q`, `J = 0`, residual 0, integration 100%,
permanently — and the calendar and clock carry on. *The calendar continues; the
unresolved state no longer does.*

**Removed, do not reintroduce:** 365.2422 as a calculation basis, 8737, 600000
as Q, 20m 58.128s, 259 as a hard rung, the 963 / 808.139954 / 720 endpoints, the
75.149 transition, the 206 physical-day switch, and the 1080 / 1440 calibration
experiments. Never mix a value from an older system with this one.

**Implementation.** Ladder by continued fraction in **BigInt** (`q·J0` exceeds
2⁵³); `tauOfQ` an exact piecewise-linear integral of the staircase from launch;
`qOfTau` its inverse with a hard clamp past `tau*`. `checkMatrix()` asserts the
whole validation table at load. The wave stays recurrent and must never feed
back into `J_ret`.

## Next milestones

1. **Consistency and accessibility fixes.** Resolve the homepage collection count, reconcile the calendar descriptions and weekday text, and correct the mobile menu label after navigation. See the review for reproduction details.
2. **First-visit clarity.** Review the introduction and Start Here path together, define the intended audience, and make the first useful reading choice clear while keeping the site's voice.
3. **Publication preparation.** Choose the intended hosting/domain and remote backup, then check social previews, search metadata, source downloads, print output, and target browsers before publishing.

The first milestone is the recommended next implementation task. The content contradictions require choosing the intended wording before applying a correction.

## Completion standard for an improvement

Make one focused change, verify the affected reader experience, record meaningful decisions here, and save a commit with a concise explanation. Use reviews/ for dated assessments. Do not treat this project note as an automatic schedule to work or publish later.

## Decision — live from the start of the experiment (2026-09-11)

Before this fix, the whole first Matrix date was frozen. For τ < 1 — before
the launch entry at q = 1 — the launch state was treated as both the held
state and the next rung, so the span had zero length. The approach meter read
100 %, and Active J, Residual, Load integrated and Load still active stood
still. It showed on first load in any timezone west of UTC, where the
simulation opens at τ ≈ 0.8.

The rule now: the experiment starts at τ = 0, and that is simply its start,
not a singular point. While the launch state is held, its span runs from τ = 0
to the first hard rung (q = 68), and every reading counts live from the first
instant. The launch state is never a target: the next rung is always a hard
rung. `checkMatrix()` asserts J = J0 at τ = 0, movement before τ = 1, the first
hard rung as the first target, and exactness at all nineteen hard rungs. The
ladder, τ at every rung and τ* are unchanged.

## Decision — six-phase selectable meditation (2026-09-09)

The Mind Recoding Engine is now a thirty-minute sequence of six five-minute
phases: Ground State, Clearing the Noise, Coherent Blueprint,
Repolymerization, Telomere Shelter, and Integration & Seal. Each phase is a
directly selectable control, so the reader can begin anywhere; after a phase
finishes, the pacer continues forward through the remaining sequence.

Each phase has a distinct stereo tone pair separated by 40 Hz. Phase 1 uses
943 Hz left and 983 Hz right, centered on 963 Hz; the remaining centers are
852, 741, 528, 639, and 432 Hz. The interface describes this accurately as a
40 Hz binaural difference and notes that headphones are required. The audio
level fades in conservatively and the oscillators retune when the selected
phase changes.

The biological language in the meditation is explicitly contemplative imagery.
The pacer does not claim that audio changes DNA, removes genetic material,
alters gene activity, induces polymerization, or lengthens telomeres. Preserve
that boundary if the meditation copy is revised. The six center frequencies are
aesthetic sonic anchors rather than biological targets.

## Decision — generative-universe research sequence (2026-09-08)

Three new articles were added to **Research & frameworks** as a connected sequence:

1. **Imagination as a Generative Principle** — generation → selection → realization → recursive persistence, ending in the self-training generative universe.
2. **Reality as Imagination That Survives Recursion** — quantum-vacuum structure as a careful physical bridge to the claim that persistent reality is generated possibility surviving recursive constraint.
3. **The Universe as a Biological Computer** — “biological” defined structurally through self-maintenance, memory, adaptive constraint, recursive self-modification, and time-dependent persistence.

Each article has a preserved Markdown source/download under `sources/`:

- `sources/imagination-generative-principle.md`
- `sources/reality-survives-recursion.md`
- `sources/universe-biological-computer.md`

The rendered reader copies live in `content.js`, remain in the `research` collection, and use the existing article reader, search, saved-reading, math-rendering, and source-download paths without changing routing or design.

## Decision — Botanical replacement: Eyebright to Cistanche (CistaMAX) (2026-09-09)

Crude Eyebright extract was superseded by high-potency *Cistanche tubulosa* (Nootropics Depot CistaMAX®) at half a standard dose (½ capsule / ~250–325 mg) in Phase 2 of the Master Protocol, Section 3 epigenetic compounds, and the master lexicon:
- Provides concentrated phenylethanoid glycosides (≥10–20% pure acteoside/verbascoside plus echinacoside).
- Mechanism: halts IκBα phosphorylation to silence NF-κB (p65) and AP-1 transcription (suppressing IL-6, IL-8, and pro-MMP-9 promoters); antioxidant catechol trap locks the conserved Cys73 thiol on pro-MMP-9 (cysteine-switch lock); upregulates neurotrophins BDNF and GDNF in synergy with ALCAR and Na-R-ALA.
- Fully compatible with the body-mass dose scaler.

## Decision — Research page category selection menu (2026-09-10)

*The categories described here are now the Research collections in `collections.js`, and membership lives on each article. See “sections, collections and types” (2026-09-11). The menu's behaviour is unchanged.*

A category selection menu was introduced directly beneath the green hero header on the **Research & frameworks** page (`#/research`), reusing the visual design system of The Protocol's `.doc-nav-wrap` / `.doc-nav`.

1. **No Overview tab**: Overview is handled in the Library.
2. **Five specific categories**:
   - `01 Framework`: *A living architecture of coherence*, *Imagination as a Generative Principle*, *Reality as Imagination That Survives Recursion*, *The Universe as a Biological Computer*, with the connected Protocol card at the bottom. Default selection on landing.
   - `02 Philosophy`: *The Ethos of Being*.
   - `03 Meta-Mathematics`: Empty state noting work is in progress.
   - `04 Biophysic`: Empty state noting work is in progress, plus an explicit link to *Holographic Biophysics* in Section 01 of The Protocol.
   - `05 Notes & Methods`: *Making imagination a testable reality*, *Regenesis: aging as loss of phase*, *One inquiry. Many ways in.*
3. **In-place switching and URL sub-routes**:
   - Sub-routes: `#/research/framework`, `#/research/philosophy`, `#/research/meta-mathematics`, `#/research/biophysic`, `#/research/notes-methods`.
   - Category changes switch in-place without rebuilding the shell, re-rendering page headers, or losing scroll position. Direct URLs and browser back/forward buttons work naturally.
   - Arrow-key keyboard navigation and accessible `aria-selected` attributes are wired identically to The Protocol section tabs.
4. **Layout & styling**:
   - Menu is sticky beneath the site header.
   - Shows live category piece count across the vertical separator rule.
   - Spacing smoothly handles desktop and mobile viewports with hidden scrollbar horizontal overflow.
5. **Category-specific sidebars**:
   - Each category features its own dedicated description, topical tagline, and contextual connected paths in the left sidebar (`#research-sidebar`), updating dynamically in-place on tab switch.
