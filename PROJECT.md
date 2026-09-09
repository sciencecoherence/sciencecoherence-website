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

## Decision — three paths (2026-09-09)

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

