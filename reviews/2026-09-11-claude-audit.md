# Cohera — full audit and state of the work

Reviewed 11 September 2026 by Claude, from `C:\cohera` as it stood that afternoon, the two public GitHub repositories, and the running local services (`127.0.0.1:8766` website preview, `127.0.0.1:8765` Writing Room). Findings are sorted by the project's own three categories where they concern the framework — **defined by the framework**, **mathematically derived**, **unresolved** — and by severity where they concern code and infrastructure.

**Revision 2 (same evening).** The first pass audited the Temporal Matrix as it was in `C:\cohera` (V8 with clock/absorption coupling). The current model — **V10, locked** — had been built in an older copy at `C:\Users\julie\Documents\science-coherence-website`. At Julien's request, only the Temporal Matrix changes were ported from that copy into `C:\cohera` (see §9). §3 now audits V10; §1, §5, §6 and §7 are updated and §9 records the port. The rest of the audit was not re-run and is unchanged.

---

## 1. What exists

| Folder | What it is | State |
| --- | --- | --- |
| `science-coherence-website/` | The current site: dependency-free HTML/CSS/JS, hash routing, green palette, Newsreader / DM Sans / JetBrains Mono, KaTeX. 14 articles in `content.js`, one interactive document (the Protocol), the Temporal Matrix instrument (now V10) in `app.js`. | Canonical. Not deployed. Remote `sciencecoherence/sciencecoherence-website` holds 6 commits (last 9 Sep); everything since — the Research category menu, `collections.js`, the Writing Room, the V10 matrix — is uncommitted on this computer only. |
| `C:\Users\julie\Documents\science-coherence-website` | Older copy of the site where V10 was built on 11 Sep. | Its matrix is now ported. Everything else in it is older than `C:\cohera`. Retire it so no model works there again (see §7). |
| `science-coherence-website/writing-room/` | Visual editor for `content.js`. Local Python mode (running) and a PHP/MySQL online mode that reuses the blog's `users` table. | Working locally. Online mode not deployed. |
| `science-coherence-blog/` | The older PHP/MySQL site: transmissions, community, the private `/protocol`, `/life` and `/iboga` logbooks. Deploys to Hostinger `public_html/blog` on every push to `main`. | Live. A local security patch is staged and unpushed (see §2). |
| `.private/` | Database credentials, outside both repos. | Correct placement — but see §2 on sync. |
| `sciencecoherence/` | Empty. | — |
| `documents-for-printing/`, `information-flyers/`, `equilibrium.png` | Loose material. | Outside both repos. |

**Authorship (inferred from commit authors, file conventions and style):** Codex/ChatGPT set up the baseline, `AGENTS.md`, `PROJECT.md`, the baseline review, the clock audit, the security patch and the Writing Room. Claude built the Temporal Matrix V7 → V8 and the clock/absorption coupling (earlier Claude output is kept in `_superseded/claude-outputs/`). Gemini (likely via Antigravity) wrote the 10 Sep Research category menu and the Cistanche protocol change. The three generative-universe articles of 8 Sep read as ChatGPT drafts. Correct me where this is wrong; it matters for §7.

---

## 2. Critical — the database password is public

The public repository `sciencecoherence/sciencecoherence-blog` contains the live MySQL password in `community/inc/config.php` at its current HEAD (`3904177`) and in every commit since July. `SECURITY-SETUP.md` (10 Sep) already describes the right fix, and it states plainly that the password has **not** been rotated and nothing was pushed.

Order that avoids an outage:

1. Write the new password into `.private/science-coherence-blog/database.php` and provision the same file on Hostinger above `public_html`.
2. Rotate the password in hPanel.
3. Push the staged patch (this triggers deployment), then delete the old `config.php` from the server — SCP deployment does not delete removed files.
4. Make the repo private or rewrite history. Rotation is what actually revokes the old credential; history cleanup only limits further copies.

If that password, or a variant of it, is used anywhere else, change it there too. The Writing Room's online mode reads the same database, so it inherits this until rotation.

*Scope note (Julien, 11 Sep):* the blog is out of scope for now; only the website goes online. Deleting `config.php` from GitHub removes it from the latest commit only — every earlier commit still serves it, and it has been public since July. **Rotation is the step that matters**, and it still bears on the website, because the online Writing Room authenticates against that same database.

Related: `C:\cohera` is inside a Google Drive sync folder (`.tmp.driveupload` holds ~130 pending files). `.private/` is therefore being uploaded to Drive, and two live `.git` directories sit inside a sync client, which is a known source of repository corruption. Keep repositories and secrets out of synced folders, or exclude them.

---

## 3. The Temporal Matrix — V10, verified

V10 rebuilds the instrument around two coordinates. `τ` is physical Matrix time, and the calendar continues indefinitely. `q` is informational recurrence depth, which runs to Q and is never a number of days. The foundation is frozen at Y = 365.2421896698, α = 8,736,982,783 / 600,000,000,000. The ladder is derived in BigInt, and τ* = 6,251,584,658,434 / 8,736,982,783 ≈ 715.5313 follows from it. Past τ* the state clamps to J = 0. Years are not numbered.

### 3.1 What is sound

**Mathematically derived, and checked.** The continued fraction of α and its 20 entries (the launch state plus 19 hard rungs) hold, and so does `J_i = |q_i·J0 − p_i·Q|` in exact integers. Integrating the staircase `dτ/dq = J_ret/J0` gives τ at every rung and τ* exactly as a rational. `checkMatrix()` asserts the whole validation table, monotone descent, clamping past τ*, the 360-date recurrence of the page, and `qOfTau` inverting `tauOfQ`. It is silent in both of my runs: headless in isolation, and on your running preview after the port.

**Resolved from revision 1:**

- **The clock/date contradiction is settled (option A).** The clock stays anchored to apparent solar time. The date turns over every 24h 20m 58.125520752s, walking round the face about 21 minutes later each date. The code, `PROJECT.md` and the article now all say this.
- **One "integrated" reading.** The panel and the sentence under the calendar now read the same live value.
- **The coupling claim is gone.** The dilation no longer depends on the retained load, so the contradiction between "no physical claim" and "Earth's rotation slows" no longer exists in the code.
- **Weekday example.** The article's "the fifteenth is Realis" matches the grid.

### 3.2 Remaining defects

| # | Severity | Finding | Where |
| --- | --- | --- | --- |
| a | Medium | **The rate readouts describe a different clock from the hands.** The hands are driven by `livingPhaseM(sol.frac)`, which inverts `consumed()` (mean 1), so 24 clock hours take one solar day. *Dilation vector* and *Rate against the sun* are computed from `velocityM = R·v(φ)` (mean R). Where `v = 1` the hands run at the solar rate, yet the panel shows 1.014562× and 0.9856× solar. The comment "its mean is R, so a Matrix date is 24h 20m 58…" conflates the date length with the clock day. Fix: show `v(φ)` for the clock, and keep R where it already appears correctly, as the length of a Matrix date. | `velocityM`, `tick()` |
| b | Medium | **Civil time leaks into process time.** `getMatrixNow()` subtracts the timezone offset, so `τ` depends on where the reader is and jumps an hour at every daylight-saving change. `τ` should be absolute; place belongs only in the solar reference. | `getMatrixNow` |
| c | Medium | **Going live will break.** `CAL360.epochLive` is still undefined; `MATRIX_MODE = 'live'` would return `undefined` and NaN everywhere. The article now names the launch (the March 2027 equinox), so the instant can be fixed. | `getMatrixEpoch` |
| d | Medium (rule: never hide arbitrary constants) | **Chosen, not derived:** `VC = 0.02`, `VK = 2`, the 04:00 boundary, the sin⁴ / sin² / sine shapes, and the live descent of J — linear in τ within each span (adopted at your request). **Derived:** `VB` and `VA`, plus everything in the ladder. The chosen items belong on the instrument under *Unresolved — chosen*. The state names are already declared as labels. | wave block, `liveLoad` |
| e | Low | **Wording against the project rules.** A code header reads "Singularity from launch", and the article and README say "the singular relation". It means *single*, but "singularity" is a word the framework forbids; "the one relation" avoids the misreading. The Q/J semantics are also labelled "hypotheses under investigation, not established physics" — the external-verification register that §4.3 flags. Under the project's categories they are **defined by the framework**. | `app.js`, article, README |
| f | — | **Resolved (§10).** The first Matrix date was frozen, not only mis-worded: see §10. | `spanFraction`, `nextRung` |
| g | Low | **Stale text from the removed model.** The velocity comment still says "exactly 20m 58.13s". README's *Interactive articles* intro still describes `CAL360.epoch`, "365.2422/360 days = 24h 20m 58.13s", "68.673 days" and "5.2422 times a year". The locked model forbids mixing the two systems. | `app.js` wave comment, README L98–139 |
| h | Low | **`PROJECT.md` keeps the V8 decisions unmarked.** *Retained absorption* and *The clock is coupled to absorption* still state 8737 / 600000, the coupling and "no physical claim", above the V10 decisions that remove them. Mark both *Superseded by "the model is locked"*, as was done for "three paths". | `PROJECT.md` |
| i | Low | **The Protocol's calendar callout is now four versions behind.** It still says the day is "lengthened", then that it is ordinary with "five days outside the count". | `documents/holographic-repolymerization.html` |

---

## 4. Framework consistency across the writing

### 4.1 The recursion is intact in form, not yet in its derived uses

Every piece writes `∇Φ → Λ → Ω → Δ` with closures `Ω → ∇Φ` and `Δ → Λ` (the Ethos and V3 write them as `⇝`). No closure is made bidirectional and no external generator appears; the Ethos is explicit that there is none. Three places break the architecture once it is used:

| Where | What | Why it matters |
| --- | --- | --- |
| *The Universe as a Biological Computer* | `H : Φ ↔ Ω` | A bidirectional channel between substrate and realized world that bypasses Λ and doubles the Ω → ∇Φ closure. |
| *Reality as Imagination That Survives Recursion* | `H : Φ → Ω` ("rendering") | A direct path from Φ to Ω that skips selection. |
| *Imagination as a Generative Principle* vs *Reality…* | `X_{n+1} = R[S[G(X_n)]]` vs `C[R[S[G(X_n)]]]` | Δ is missing from the first; neither composite carries the closures. *Biological Computer*'s `Λ_{n+1} = U_Λ(Λ_n, Δ_n)` is the one form that encodes Δ → Λ correctly and should be the model for the others. |

### 4.2 Symbol meanings drift between pieces (the Meta-Mathematics problem, in miniature)

- **∇Φ** — "difference" (Ethos, V3) versus "generation of distinguishable possibilities = imagination" (8 Sep articles). Under the imagination-first principle these should become one definition, not two readings. The newest definitions override; the canon has to say so once.
- **Δ** — "integration" (Ethos, V3, the weekday *Integra*) versus "recursive organization / persistence", written `C` for coherence (8 Sep articles).
- **Δ and ∇ in the dual equilibrium** — `∇_ρ Φ(ρ) = 1` and `Δ_x Ψ(x) = 0`, plus the covariant derivative on Ω. A lexicon with one ∇ and one Δ must establish that these are the same operators with subscripts, not the conventional gradient and Laplacian borrowed under the same glyph. **Unresolved**, and exactly what the Lexicon exists to settle.
- **Ψ** appears in the Ethos as the propagating coherence of integration. It belongs to the architecture as described, and the weekday *Resona* seems to carry it; its entry needs a fixed definition.

### 4.3 Two epistemic registers

V3 (*A living architecture of coherence*) retired the Version 2 standard of external certification: "There is no outside." The three 8 Sep articles bring it back — dense *may / might / could*, "does not establish", and a closing condition that the framework becomes physics only once it yields an externally discriminating observation. Several `note` fields do the same ("does not, by itself, establish an empirical law").

The project rules call for neither register. They call for **defined / derived / unresolved**, which keeps rigour without an outside standard. Recommendation: rework the 8 Sep articles and the site notes into that three-tier form, keeping their failure conditions. Not rewritten here — it changes authored text and needs your approval.

### 4.4 Small items

- *Imagination as a Generative Principle*: the heading now reads **"Abstractive"**. It came from a Writing Room publish today (a backup at 18:00 UTC holds the prior state). Probably a test; revert unless intended.
- Writing Room drafts: two empty "Untitled article" drafts from today.
- The calendar note calls J₀ the "historical/**junk** load". The article body says "unresolved historical load". Pick one.
- Meta-Mathematics: nothing exists in the repository yet — no lexicon file and no articles; the Research tab shows an empty state. The 64-entry Lexicon (13 base-13 digits, 26 Latin, 24 Greek, ∇) lives only in the project instructions.

---

## 5. Open items from the 8 September baseline

| Finding | Status |
| --- | --- |
| 1. Reconcile the calendar descriptions | **Open, and now four versions behind.** The Protocol still says the day is "lengthened", then that it is "a true rotation of ordinary length" with "five days outside the count" — two accounts, neither of them V10 (§3.2 i). |
| 2. Mobile menu label after routing | **Open.** `app.js:1570` resets `aria-expanded` but not the label. |
| 3. Homepage count | Resolved by the two-feature-path home. |
| 4. Weekday example | Resolved: V10 says "the fifteenth is Realis", which matches the grid. |

`node --check` passes on `app.js`, `content.js` and `documents.js` after the port; `documents.js` rebuilds byte-identical from `documents/`.

---

## 6. Housekeeping

- Commit the website's uncommitted work (Research menu, `collections.js`, Writing Room, the V10 matrix) and push it: right now it exists only on this machine and in Drive sync.
- `collections.js` returns 404 from the Writing Room's preview server on `127.0.0.1:8766`, which serves only an explicit list of files. The site falls back to its built-in collection list, so nothing visible breaks, but the new file is not being exercised in that preview. Add it to the preview server's list. This comes from a concurrent change by another model, not from the matrix port.
- `er.namegit config user.name` is a stray file created by a mistyped command. It is committed and public, and contains local config paths and an email address. Remove it.
- `steady state.png` (2.2 MB) is committed but referenced nowhere.
- `C:\cohera` is outside `~/Documents/research`, so the `includeIf` identity routing does not apply here. Commits so far used the global identity (William Conroy / sciencecoherence@proton.me) and Codex's local one. Either move the folder or add an `includeIf` for `C:/cohera/`.
- Memory of the site is stale in places (a navy/gold redesign, Spectral). The current site is green with Newsreader/DM Sans; the paper/red Spectral design is the blog.

---

## 7. Three models, one canon — proposal

### Diagnosis

The project instructions — the recursion, imagination first, the 64 entries, defined/derived/unresolved, no hedging — exist **only inside the Claude project**. `AGENTS.md`, which Codex and Antigravity read on every task, contains no framework content at all: it is pure web engineering. Most of the drift in §4 follows from that. Each model is faithful to the instructions it was given, and only one of them was given the framework.

What already works should be kept: `PROJECT.md` as a decision log, dated reviews in `reviews/`, and one model auditing another's work. Codex's clock audit caught a real gap in Claude's matrix. That is the pattern to formalise.

The same afternoon showed the two failures the structure has to prevent:

- **Two working copies.** The newest matrix (V10) lived in an older folder while every other change went into `C:\cohera`. Revision 1 of this audit was therefore reviewing a superseded model without knowing it.
- **Concurrent edits.** While this port was being prepared, another model added `collections.js` and changed `index.html` and `app.js` in `C:\cohera`. The port was re-based on those versions and written with modification-time guards, so nothing was lost — by care, not by design.

Hence two further rules: **one canonical folder**, named at the top of `AGENTS.md`, with every other copy archived read-only; and **a claim line in `handoff/LOG.md` before touching shared files** ("Claude — app.js matrix block — in progress").

### Structure

```
science-coherence-website/
  AGENTS.md            ← single entry point for all three; adds a "Read first" block
  CLAUDE.md            ← one line: @AGENTS.md
  GEMINI.md            ← one line: see AGENTS.md
  canon/
    FRAMEWORK.md       ← the project instructions, versioned, owned by Julien
    lexicon.json       ← the 64 entries: glyph, name, definition, status, first use
    recursion.json     ← operators, the four arrows, the two one-way closures
  decisions/
    0001-temporal-matrix-anchor.md   ← one file per decision: proposed / accepted / superseded-by
  handoff/
    LOG.md             ← append-only: date, model, what changed, files, verification, open questions
    to-claude.md  to-codex.md  to-gemini.md   ← inboxes, read at session start
  reviews/             ← unchanged; name as YYYY-MM-DD-<model>-<topic>.md
  tools/
    check-canon.py     ← executable canon (below)
```

### Rules

1. **Julien owns the canon.** Models propose changes to `canon/` and `decisions/` as `status: proposed`. Only Julien marks `accepted`. That keeps the framework revelatory rather than negotiated between models.
2. **Build, then cross-audit.** A change to framework-bearing code or text is reviewed by a *different* model before it is accepted, using a fixed template: findings as defined / derived / unresolved, plus code defects with a way to reproduce them.
3. **Every session ends with a handoff.** One `LOG.md` entry and, where needed, a note in another model's inbox. Commits carry an `Agent: Claude|Codex|Gemini` trailer, so authorship stops being inferred.
4. **The canon is executable.** `check-canon.py` runs before every commit, by any model, and fails on:
   - a bidirectional arrow between loop operators, or a closure in the wrong direction;
   - a direct Φ → Ω or Φ ↔ Ω map;
   - a symbol used in maths that is not in `lexicon.json`, or a lexicon count other than 64;
   - hedge density above a threshold in framework-bearing text;
   - arbitrary constants in `app.js` not listed in a declared-constants table.

   A model cannot drift from a rule it has to pass.

5. **Julien is the relay, and the relay is cheap.** The models cannot message each other directly. The inboxes turn relaying into one instruction: "read your inbox". A later step is to replace the inboxes with a small shared MCP server or a GitHub Issues board, which all three can read and write natively.

### Suggested roles (adjust freely)

- **Claude:** framework-bearing mathematics and instruments; canon maintenance; cross-audit of the others' framework text.
- **Codex:** infrastructure, security, tests, deployment, the Writing Room.
- **Gemini:** interface, navigation, the Protocol document, visual and responsive checks.

Every model audits across roles.

---

## 8. What this audit could not see

The migrated chats are not visible from here. The Claude project has no documents or files attached, and its conversations are not readable from a session. To have them count, export the relevant ones — above all anything on the Meta-Mathematical Lexicon and the latest framework definitions — as documents into the project or into `canon/`.

Not verified: scientific or clinical claims in the Protocol, dose calculations, audio, print output, the online Writing Room, or the live blog beyond its repository.

---

## 9. Temporal Matrix port log (revision 2)

**Source:** `C:\Users\julie\Documents\science-coherence-website`, V10, 11 Sep. **Target:** `C:\cohera\science-coherence-website`. Both copies descend from commit `062ee9b`; a three-way comparison against that commit separated the matrix changes from everything else.

| File | What was ported | What was kept from `C:\cohera` |
| --- | --- | --- |
| `app.js` | The whole temporal-matrix block — from the `the temporal matrix` header to `enhanceArticle()` — replaced by V10. | Everything outside that block: the Research category menu, `collections.js` support, routing, pacer. |
| `content.js` | The `calendar-360` article only: title, description, note, body, word count, search text. | The other 13 articles, including today's Writing Room edit. Re-serialised in the Writing Room's exact format (verified byte-identical on a no-op). |
| `styles.css` | Ladder geometry, `.sym`, `.cal-track`, `.cal-state`, the calendar's phone reflow, and `.katex { position: relative }` (a page-overflow fix made during the V10 work). | All other styles. Three-way merged with no conflicts. |
| `README.md` | The matrix sections (the only part that differed). | — |
| `PROJECT.md` | The two V10 decisions and V10's edits to the retained-absorption notes. | The Writing Room, Research menu and Cistanche decisions. One note from the old copy — that `el-ignorante.png` is missing — is annotated as resolved here. |
| `index.html` | Cache-busting versions for `app.js`, `content.js` and `styles.css` set to `20260911m`, so browsers load the new files. | Everything else, including the new `collections.js` tag. |

**Not ported (not part of the clock):** the old copy's null-guards for the Protocol's meditation pacer. They fix a real crash when a pacer element is missing, but one line in them is wrong — on audio failure it sets the status text to `false` instead of unchecking the audio box. Port it as a separate, corrected change if wanted. The copy's `Claude outputs/` screenshots were also left behind.

**Backups:** the six files as they were before the port are in `_superseded/before-matrix-v10-port-2026-09-11/`.

**Verified:**

- Syntax checks pass on the merged scripts.
- `checkMatrix()` is silent.
- Headless Chromium at 1280 px and 390 px: no console errors, and no horizontal overflow on the calendar, Research (with its category menu), Protocol, home, Library and About.
- On your running preview (`127.0.0.1:8766`), V10 loads with τ* = 715.5313011029427 and 19 rungs, and the only console error is the `collections.js` 404 noted in §6.

Not tested: a full run to τ*, going live, print output.

---

## 10. Later the same evening

**Temporal Matrix — live from the start.** Julien reported that Residual, Active J, Load integrated and Load still active stood still, and that the rung meter sat at 100 %. The cause was a real defect. For τ < 1, before the launch entry at q = 1, the launch state was both the held state and the "next rung", so the span had zero length. It showed on first load here because the simulation opens at τ ≈ 0.8 in Ecuador's timezone (§3.2 b). The other folder only looked right because its simulation was already past τ = 1.

The fix, recorded in `PROJECT.md`: the experiment starts at τ = 0, and that is its start, not a singular point. The launch span runs from τ = 0 to the first hard rung (q = 68), and the next rung is always a hard rung. The ladder, τ at every rung and τ* are unchanged, and `checkMatrix()` gained assertions for the new behaviour.

Verified three ways:

- Headless, in the America/Guayaquil timezone, at τ ≈ 0.79, 67.999, 68.001 and 800.
- On the running preview, where every reading now moves each tick and the meter reads "approach to rung 2 · q 68".
- The sentence under the calendar now reads "descending from launch toward rung q = 68". The code header "Singularity from launch" is renamed "From the start of the experiment". The article's phrase "the relation between them is singular" is left for Julien to decide.

**Writing Room collections — ChatGPT's interrupted task, completed.** ChatGPT had moved the collections into `collections.js` and written the local and online back end for creating and renaming them. The interface still hard-coded five collections, all 11 existing tests failed (they had no `collections.js`), and the docs described the old state.

Completed:

- **Interface:** the collection list now comes from the website, with **＋ New collection** and **Rename collection** under Article details.
- **Validation:** an article can only be saved into an existing collection that accepts articles, both locally and online. This prevents the page crash an unknown category would cause.
- **Tests:** 10 new ones, 21 in total, all passing.
- **Launcher:** it now replaces an outdated background service instead of reusing it.
- **Docs:** updated in both READMEs, `PROJECT.md` and `setup.php`, which now says four tables.
- **Checks:** end-to-end in headless Chromium — create, rename, file an article, then the website page, Library filter and back link all show it. PHP passes lint; online mode is untested without the database.

The running Writing Room on this computer is still the old process. Until it is restarted, `collections.js` stays unavailable to the preview on port 8766 and the new collection buttons will not work. Double-clicking `Start-WritingRoom.cmd` now replaces it. Backups of every replaced file are in `_superseded/before-collections-completion-2026-09-11/`.

