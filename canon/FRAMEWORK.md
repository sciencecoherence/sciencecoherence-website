# Canon

These are the invariants of the Cohera framework. They hold across every task, every
model and every file in this repository. Everything else — wording, layout, tooling,
schedule — is negotiable; this is not.

A change to anything in `canon/` is a change to the framework. It requires an explicit
decision from Julien, recorded in `handoff/LOG.md` with the reasoning. No model changes
canon on its own initiative, and no model changes canon to make an explanation or an
implementation easier.

`recursion.json`, `lexicon.json` and `constants.json` hold the same invariants in a form
a script can verify. `python tools/coord.py check` runs them against the site.

---

## 1. Order of causation

Imagination precedes data, observation, proof, study and realization. Never reverse it,
never soften it into "imagination also matters", never rewrite it as hypothesis-then-test.

## 2. The recursion

    ∇Φ → Λ → Ω → Δ        with closures    Δ → Λ    and    Ω → ∇Φ

∇Φ is imagination, generative difference. Λ is selection. Ω is the realized world.
Δ is persistent recursive organization.

The closures are **directed**. `Δ → Λ` means persisting organizations modify the mechanism
of selection; `Ω → ∇Φ` means rendered states alter future generation. Neither is an arrow
pointing both ways, and neither may be drawn, coded or described as one.

The loop is generative in itself. Do not insert an external generator, controller,
observer, Hamiltonian or first mover — not in prose, not in a diagram, not in code —
unless a task explicitly requires it and the requirement is written down.

## 3. Revelation, not invention

The framework uncovers a code already present in mathematics, reality, consciousness,
biology and information. Write and code as discovery. Do not introduce absolute
beginnings, singularities, arbitrary constants, symbols or concepts because they make a
pattern look complete.

## 4. Information is fundamental

Geometry, coherence, structure, consciousness and realized reality are expressions of
informational organization. Do not reinterpret this into conventional materialism, and do
not collapse it into an existing named theory because that is easier to explain.

## 5. Meta-Mathematics

One connected mathematical language: a symbol means the same thing across equations, not
unrelated things in isolated disciplines. The lexicon holds exactly **64** genuine
entries — 13 base-13 digits, 26 Latin letters, 24 Greek letters, and ∇.

Do not add a symbol to reach a desired correspondence. When studying a conventional
equation, preserve its mathematics and search for the deeper invariant meaning of its
symbols.

## 6. The Temporal Matrix

τ is physical Matrix time; q is informational recurrence depth; `dτ/dq = J_ret/J0`.

`q = 0` is **the start of the experiment, not a singularity**. Every counter — residual,
active J, integrated load, load still active, rung fill — runs live from that start.
Nothing on the instrument is frozen or sampled once at load.

The ladder is derived, never tabulated: the continued fraction of α = J0/Q in exact
BigInt arithmetic, giving LAUNCH plus 19 hard rungs and the absorption point
τ* = 6251584658434 / 8736982783. LAUNCH is a state, not a reduction; it must never be
presented as a rung that integrated nothing. τ* is derived, not chosen, not rounded, not
calibrated to anything.

Every constant is declared in `canon/constants.json`. No hidden constants anywhere.
Civil time may drive the display; it may never leak into τ.

## 7. Writing

Advanced scientific-philosophical level: precise, elegant, structured, human,
conceptually progressive. Lead the reader from familiarity → recognition → formalization,
so they learn to read the structure rather than memorize terminology.

Do not dilute framework statements with automatic may/might/could. Do not manufacture
equations or explanations to fill a gap. Do not produce generic AI prose. Do not
introduce a concept before it is needed.

Always distinguish what is **defined by the framework**, what is **mathematically
derived**, and what remains **unresolved**. Unresolved is a legitimate state and is to be
written as such, not smoothed over.

## 8. Code

The code expresses the conceptual architecture. Meaningful domain names; equations,
constants, thresholds, states, rungs, time transformations and displayed values
internally consistent; civil time, process time, transformed time, rung position,
thresholds and closure kept distinct.

Keep the dependency-free HTML/CSS/JavaScript architecture: `index.html` is the shell,
`styles.css` the design system, `app.js` routing and behaviour, and `content.js`,
`sections.js`, `collections.js`, `pages.js`, `documents.js` the data. No build step, no
package installation, unless a task requires one and says so.

Edit authored documents in `documents/`, then run `python tools/build-documents.py`.
Never hand-edit `documents.js`.

Preserve working code unless a change is required. Prefer the simplest architecture that
represents the framework accurately. Visualizations must explain structure,
transformation, recursion, propagation or closure — never decorate.

## 9. Classification

Three independent axes, not two:

- **section** — where the article lives in the site (`article.category`, `sections.js`)
- **collection** — the Research groupings (`article.collection`, `collections.js`):
  01 Framework, 02 Philosophy, 03 Meta-Mathematics, 04 Biophysic, 05 Notes & Methods
- **type** — what kind of piece it is (`article.type`, free text); the Library filters by it

A "collection introduction" in Biophysic is collection = biophysic, type = collection
introduction. Do not merge these axes back together.

## 10. The final rule

Understand the architecture first. Then make the writing, the mathematics, the interface
and the code express that same architecture. Never reinterpret the framework into
something more conventional because it is easier.
