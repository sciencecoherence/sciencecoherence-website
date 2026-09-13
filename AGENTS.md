# Working here

Several models work on this repository — Claude, ChatGPT, Gemini, and whoever comes
next — plus Julien. None of you can see each other's conversations. Everything you need
to know about what the others did is in the repository itself.

**Read this file, then run the brief. Every session, before anything else.**

```
python tools/coord.py brief --agent <your name>
```

Use your own lowercase name: `claude`, `chatgpt`, `gemini`, `julien`. The brief prints
canon in short form, what changed since the last accounted state, which files someone
else is holding, the open tasks, the last entries, and your messages. It takes a second
and it is the difference between working together and overwriting each other.

---

## The loop

**1. Brief.** `python tools/coord.py brief --agent NAME`

**2. Claim what you are about to edit.**

```
python tools/coord.py claim app.js styles.css --agent NAME --task T-014
```

It refuses if someone else holds a file, and it refuses if a file has changes nobody
logged — because that means work you cannot see. Read those changes first, then add
`--accept-drift`. Claims lapse after 8 hours (`--ttl` to change that).

**3. Work.** Read `canon/FRAMEWORK.md` first if you are writing or coding anything
substantive. Stay inside the files you claimed. If the task turns out to need another
file, claim that too.

**4. Finish.**

```
python tools/coord.py done --agent NAME --task T-014 \
  --summary "What you actually changed and why." \
  --next "What the next model should pick up."
```

One call: it writes the log entry, records the new state of your files, closes the task
and releases the claim. Use `--keep-open` if the task is not finished.

If you stop halfway and are not coming back, say so — `coord.py log --agent NAME
--summary "stopped at X, Y is half-done"` — and `release`. Silence is the one thing
that breaks this.

---

## Why it works this way

The manifest holds a hash of every tracked file as of the last time work was accounted
for. `coord` compares that against what is actually on disk. So a file that changed
without a log entry shows up as **drift**, named, whether or not anyone remembered to
mention it. State is derived from the files, never from what a model recalls.

That is also the answer to the obvious objection: yes, an agent can edit without
claiming. The next agent will see exactly which files, and will know not to trust its
assumptions about them.

---

## Commands

| | |
|---|---|
| `brief --agent NAME` | everything before you start |
| `status` | drift, claims, open tasks; exits non-zero on drift |
| `claim PATHS --agent NAME --task ID` | take files |
| `release --agent NAME [--task ID]` | give them back, no log entry |
| `done --agent NAME --task ID --summary "..."` | log, account, close, release |
| `log --agent NAME --summary "..."` | an entry without closing anything |
| `sync --agent NAME --note "..." [PATHS]` | absorb changes made outside coord |
| `task add\|list\|set\|show` | the shared to-do list |
| `msg --from A --to B --text "..."` | leave a note for another model |
| `inbox --agent NAME [--clear]` | read yours |
| `check` | run the canon checks |
| `agents` | who has been working here |

Files: `handoff/LOG.md` is the human record, `handoff/STATE.md` the generated snapshot,
`handoff/TASKS.json` the to-do list, `handoff/state.json` the machine state. If you can
only read files and not run commands, read `handoff/STATE.md` and `handoff/LOG.md` —
they carry the same information.

---

## Canon

`canon/` holds the invariants of the framework: `FRAMEWORK.md` in prose, and
`recursion.json`, `lexicon.json`, `constants.json` in a form `python tools/coord.py
check` verifies against the site.

**No model changes anything in `canon/`.** A change there is a change to the framework
and comes from Julien, recorded in `handoff/LOG.md` with the reasoning. If your task
seems to require contradicting canon, stop and say so in your reply — do not resolve it
yourself and do not quietly write around it.

Run `check` before you call `done`. It catches a broken closure, a 65th lexicon entry, a
constant that stopped matching its declared binding, an article filed in a collection
that does not exist, and a `documents.js` that no longer matches `documents/`.

---

## Implementation rules

- Dependency-free HTML/CSS/JavaScript. No build step, no package installation.
  `index.html` is the shell, `styles.css` the design system, `app.js` routing and
  behaviour; `content.js`, `sections.js`, `collections.js`, `pages.js`, `documents.js`
  are data.
- **Never hand-edit `documents.js`.** Edit `documents/*.html`, then
  `python tools/build-documents.py`.
- Main-page copy lives in `pages.js` and is edited through the Writing Room, not by
  hand in `app.js`.
- Three classification axes, kept separate: **section** (`category`) / **collection**
  (Research groupings) / **type** (what the Library filters by).
- `_superseded/` and `sources/` are history and reference, never the active
  implementation.
- Preserve existing hash URLs and redirects when changing navigation.
- Keep the green palette, typography, light and dark themes, and the reading-oriented
  layout unless Julien asks for a redesign.
- Preserve authored wording, version context, failure conditions and existing cautions.
  Flag a contradiction rather than silently deciding an editorial or scientific
  position.
- Transmissions is intentionally hidden. The Protocol has a standalone route.

## Verification

- Preview over local HTTP so the self-hosted fonts load.
- `node --check` on changed JavaScript; `php -l` on changed PHP.
- `python -m unittest discover -s writing-room/tests` and
  `python -m unittest discover -s tools/tests`.
- `python tools/coord.py check`.
- For visible changes: the affected routes at desktop and phone width, both themes,
  browser console clean, no horizontal overflow.
- For reader or navigation changes: search, section links, saved articles, refresh, and
  the document widgets.
- Report what you actually tested and what you did not. Do not claim a check you did
  not run.

Keep commits focused. Put your name in the commit trailer: `Agent: gemini`.
The tag `baseline-2026-09-08` preserves the original 59-file website.
