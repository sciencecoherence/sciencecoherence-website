# Multi-model coordination — what is now in the repository, and the agent that comes next

2026-09-12 · Claude

You hand tasks to several models. None of them can see each other. The failure mode is
not that they disagree — it is that each one starts from a picture of the project that
was true a few hours ago, and writes over work it never knew existed.

The fix is not to make the models talk to each other. It is to stop relying on what any
of them remembers. Everything below derives project state from the files themselves.

---

## 1. What landed

Four things, all in `C:\cohera\science-coherence-website`.

### `canon/` — the invariants, in a form a script can check

`FRAMEWORK.md` states them in prose: the order of causation, the recursion with its two
directed closures, revelation over invention, information as fundamental, the 64-entry
lexicon, the Temporal Matrix and its declared constants, the writing and coding rules,
the three classification axes.

`recursion.json`, `lexicon.json` and `constants.json` state the checkable parts as data.
`constants.json` is the interesting one: each constant declares not just its value but
the exact binding site in `app.js`. A check that only grepped for the digits would pass
while the real binding had been changed, because the validation tables repeat those
digits. This one does not.

**No model edits `canon/`.** That is written into the protocol in three places. A change
there is a framework decision and it is yours.

### `tools/check_canon.py` — the invariants enforced

It fails on: an edge the recursion does not declare, a closure made bidirectional, a
reversed causal order, a 65th lexicon entry, a constant that stopped matching its
declared binding, `TAU_STAR` no longer derived from the ladder, `RUNGS` no longer
excluding LAUNCH, a missing ladder state, an article filed in a section or collection
that does not exist, a collection ordering an article that is gone, and a `documents.js`
that no longer matches `documents/` — which it detects by rebuilding the file in memory
and comparing, so it catches a hand-edit as well as a stale build.

Right now, against the live site: **clean**.

### `tools/coord.py` — the shared working memory

The core of it is a manifest: a hash of every tracked file as of the last time work was
accounted for. Every command compares that against what is actually on disk.

So a file changed without a log entry shows up as **drift**, by name, whether or not
anyone remembered to mention it:

```
Drift
-----
  UNATTRIBUTED  app.js (changed)

  Someone changed these without claiming or logging them.
  Find out what they are before you edit anything that depends on them.
```

That is the whole design. A model can still edit without claiming — nothing can stop
that — but the next model to sit down *knows which files*, and knows not to trust its
assumptions about them. State is measured, not reported.

On top of that: file claims that refuse a collision and refuse a file with unlogged
changes until you have read them; a shared task list; an append-only log; inboxes for
model-to-model notes; and one `done` call that logs the work, records the new file
state, closes the task and releases the claim together, so there is no half-finished
bookkeeping.

`brief --agent <name>` is what each model runs first. It prints canon in short form, the
drift, who is holding what, the open tasks split into yours / unclaimed / theirs, the
last eight entries, your inbox, and a canon check — in one screen.

### `AGENTS.md` — the protocol

Rewritten as the instruction sheet every model reads, with `CLAUDE.md` and `GEMINI.md`
as one-line pointers so each tool picks up the same file rather than three that drift
apart.

---

## 2. What is seeded

`handoff/TASKS.json` holds thirteen real tasks: the nine open items from the audit
(rate readouts off by R, civil time leaking into τ, `CAL360.epochLive` undefined, the
constants table, the four-versions-behind calendar callout, the `Research articlessss`
typo, the mobile menu label, the stale README text, the stray `er.namegit config
user.name` file), Gemini's deployment work marked in progress, and three that are yours
alone: rotating the published database password, removing the blog from GitHub, and
deciding the three unresolved base-13 glyphs.

`handoff/LOG.md` starts with eight entries reconstructed from what the repository and
the audit actually show, including ChatGPT's interrupted session and Gemini's deploy
pass, so the history is not a blank page.

I left messages in `handoff/inbox/gemini.md` and `handoff/inbox/chatgpt.md` telling each
of them the protocol exists, what was finished of their work, and that `canon/` is off
limits.

## 3. One command from you

The manifest has to be taken on your machine, from your files. In the repository root:

```
python tools/coord.py init --agent julien --note "first baseline"
```

Until you run it, `status` and `brief` refuse and tell you to. After it, drift detection
is live. Then:

```
python tools/coord.py brief --agent julien
python -m unittest discover -s tools/tests     # 28 tests
python tools/coord.py check
```

I could not run these on your machine directly — the Linux workspace the bridge uses has
failed to start since the Windows update, so I worked from staged copies. Everything
above was built and tested against a full copy of the live site here: 28 coordination
tests, the existing 31 Writing Room tests still green, and the canon check clean.

---

## 4. The coordinating agent

What exists now is passive: it is correct, and it only works if each model runs it. The
coordinator makes it active. It is worth building, but it is worth being precise about
what it should and should not do.

**What it should do — reconcile, not command.** Once or twice a day:

1. Run `coord status` and `coord check`.
2. For each unattributed file, look at the actual diff (`git diff`, or against the
   manifest) and work out what it was — a Writing Room save, a Gemini deploy edit, one
   of your own hand edits. Then write a real `sync` entry saying so. That is the job a
   model is genuinely good at and the one that otherwise never gets done.
3. Expire stale claims, and flag a claim held for a day with nothing changed under it —
   that is a session that died mid-task.
4. Re-derive the task list from reality: close tasks whose files show the work landed,
   flag tasks whose files were changed by someone who did not claim them, surface
   anything blocked.
5. Report canon violations immediately and never fix them silently.
6. Write one digest to `handoff/STATE.md` and send you the short version.

**What it must not do.** Not edit `canon/`. Not close a task it cannot verify from the
files. Not resolve a contradiction between two models' work — that is escalated to you
with both sides stated. Not assign work to a model that is not you handing it out.

**How to build it.** A scheduled Claude task bound to your computer, running weekday
mornings, with a fixed prompt: read `AGENTS.md`, run the three commands, reconcile, and
report. It needs the bridge's Linux workspace back to be clean — otherwise it works the
way I did today, staging files and running the checks in the cloud, which is slower but
functional.

The step after that, if this proves itself: have each model's session start by running
`brief` automatically rather than being told to. For me that is a line in `CLAUDE.md`,
which is already there. For Gemini in Antigravity and for ChatGPT it is whatever the
equivalent project-instruction slot is — worth setting up once, because a protocol that
depends on remembering to follow it is the thing we just replaced.

Say the word and I will create the scheduled coordinator.
