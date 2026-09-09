# Science Coherence Website

## Purpose

Continue developing the existing Science Coherence website: improve discovery, reading, interactive documents, content consistency, and readiness for publication while retaining its current identity.

## Current baseline — 8 September 2026

- Canonical working folder: `C:\Users\julie\Documents\science-coherence-website`.
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
& 'C:\Users\julie\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m http.server 8000 --bind 127.0.0.1 --directory 'C:\Users\julie\Documents\science-coherence-website'
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

- The ladder is derived, not tabulated. `coherenceLadder()` asserts
  `r_k = |q_k·J0 − p_k·Q|` at every rung; if that assertion ever fires, the table
  and the arithmetic have diverged and the table is wrong.
- The **state** is stepwise: `unresolvedLoad`, `residualSeconds` and the ladder
  table step at a rung and hold flat between. `J` must never be driven from a
  continuous value.
- The **reading** is continuous, and this was a deliberate reversal (2026-09-09,
  at the author's request). The first cut showed Integrated frozen at 0.0000%
  for the 66 days to rung 1, which read as a broken panel rather than as a
  faithful model. `absorbedLive` now carries the rung value toward the next in
  proportion to position within the interval, and Integrated / Remaining read
  from it so they move together and sum to 100. One meter, sweeping once per
  rung. The exact discrete value stays visible as *Integrated at this rung*.
  This is the continuous absorption law the first version deferred, adopted for
  presentation only — the underlying state did not change.
- The panel shows **one** integrated percentage, the continuous one. An
  *Integrated at this rung* row was tried alongside it and removed: two
  percentages labelled "integrated" reading different values is a contradiction
  on the face of the instrument, not a helpful disclosure. The exact per-rung
  value lives in the ladder table, which is where a reader looks for it.
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

## Next milestones

1. **Consistency and accessibility fixes.** Resolve the homepage collection count, reconcile the calendar descriptions and weekday text, and correct the mobile menu label after navigation. See the review for reproduction details.
2. **First-visit clarity.** Review the introduction and Start Here path together, define the intended audience, and make the first useful reading choice clear while keeping the site's voice.
3. **Publication preparation.** Choose the intended hosting/domain and remote backup, then check social previews, search metadata, source downloads, print output, and target browsers before publishing.

The first milestone is the recommended next implementation task. The content contradictions require choosing the intended wording before applying a correction.

## Completion standard for an improvement

Make one focused change, verify the affected reader experience, record meaningful decisions here, and save a commit with a concise explanation. Use reviews/ for dated assessments. Do not treat this project note as an automatic schedule to work or publish later.

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
