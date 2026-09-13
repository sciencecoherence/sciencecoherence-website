#!/usr/bin/env python3
"""coord — the shared working memory for every model on this project.

Several models work on this repository: Claude, ChatGPT, Gemini, whoever comes next.
None of them can see the others' conversations. This tool is the part they can all see.

The rule it enforces is simple: nothing about the project's state is remembered, it is
all derived from the files. coord hashes every tracked file and compares it against the
manifest recorded when work was last accounted for. A change nobody logged shows up as
drift, with the file named — so the next model to sit down learns about it whether or not
the previous one remembered to say anything.

    python tools/coord.py brief --agent claude      before you touch anything
    python tools/coord.py claim app.js --agent claude --task T-007
    python tools/coord.py done --agent claude --task T-007 --summary "..."

Full command list: python tools/coord.py --help
"""

from __future__ import annotations

import argparse
import datetime as dt
import fnmatch
import hashlib
import json
import os
import re
import sys
import time

ROOT = os.environ.get("COORD_ROOT") or os.path.dirname(
    os.path.dirname(os.path.abspath(__file__)))
HANDOFF = os.path.join(ROOT, "handoff")
STATE = os.path.join(HANDOFF, "state.json")
TASKS = os.path.join(HANDOFF, "TASKS.json")
LOG = os.path.join(HANDOFF, "LOG.md")
DIGEST = os.path.join(HANDOFF, "STATE.md")
INBOX = os.path.join(HANDOFF, "inbox")
LOCK = os.path.join(HANDOFF, ".lock")

DEFAULT_TTL_HOURS = 8

# What counts as project state. Everything else (assets, sources, _superseded, private
# writing-room data, caches) is deliberately outside the manifest.
INCLUDE = [
    "*.js", "*.html", "*.css", "*.md", "*.cmd", ".htaccess",
    "canon/*", "documents/*.html", "documents/*.json", "tools/*.py",
    "writing-room/*.py", "writing-room/*.php", "writing-room/*.sql",
    "writing-room/*.css", "writing-room/*.ps1", "writing-room/*.cmd",
    "writing-room/*.md", "writing-room/.htaccess",
    "writing-room/inc/*", "writing-room/public/*", "writing-room/tests/*.py",
]
EXCLUDE_DIRS = {".git", "__pycache__", "_superseded", "node_modules", "assets",
                "sources", "reviews", "handoff", "data", ".vscode"}
EXCLUDE = ["writing-room/data/*", "writing-room/inc/database.php", "*.log",
           "handoff/*", "*.pyc"]

TASK_STATUSES = ("open", "in_progress", "blocked", "done", "dropped")


# ── small helpers ─────────────────────────────────────────────────────────────

def now() -> str:
    return dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_time(text: str) -> dt.datetime:
    return dt.datetime.strptime(text, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=dt.timezone.utc)


def ago(text: str) -> str:
    try:
        delta = dt.datetime.now(dt.timezone.utc) - parse_time(text)
    except Exception:  # noqa: BLE001
        return text
    secs = int(delta.total_seconds())
    if secs < 90:
        return "just now"
    if secs < 5400:
        return f"{secs // 60}m ago"
    if secs < 172800:
        return f"{secs // 3600}h ago"
    return f"{secs // 86400}d ago"


def rel(path: str) -> str:
    return os.path.relpath(path, ROOT).replace(os.sep, "/")


def tracked_files() -> list[str]:
    out = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS and not d.startswith(".")]
        for name in filenames:
            path = rel(os.path.join(dirpath, name))
            if any(fnmatch.fnmatch(path, pat) for pat in EXCLUDE):
                continue
            for pat in INCLUDE:
                hit = (fnmatch.fnmatch(path, pat) if "/" in pat
                       else ("/" not in path and fnmatch.fnmatch(path, pat)))
                if hit:
                    out.append(path)
                    break
    return sorted(set(out))


def sha(path: str) -> str:
    h = hashlib.sha256()
    with open(os.path.join(ROOT, path), "rb") as f:
        for chunk in iter(lambda: f.read(131072), b""):
            h.update(chunk)
    return h.hexdigest()[:16]


def snapshot() -> dict:
    out = {}
    for path in tracked_files():
        try:
            out[path] = {"sha": sha(path), "bytes": os.path.getsize(os.path.join(ROOT, path))}
        except OSError:
            continue
    return out


# ── persistence ───────────────────────────────────────────────────────────────

def read_json(path: str, default):
    if not os.path.exists(path):
        return default
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def write_json(path: str, data) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    os.replace(tmp, path)


def load_state() -> dict:
    return read_json(STATE, {"version": 1, "nextEntry": 1, "manifest": {},
                             "claims": [], "entries": [], "agents": {}})


def load_tasks() -> dict:
    return read_json(TASKS, {"version": 1, "nextId": 1, "tasks": []})


class Lock:
    """A short advisory lock so two models writing at the same second do not interleave."""

    def __init__(self, timeout: float = 10.0) -> None:
        self.timeout = timeout
        self.fd = None

    def __enter__(self):
        os.makedirs(HANDOFF, exist_ok=True)
        deadline = time.time() + self.timeout
        while True:
            try:
                self.fd = os.open(LOCK, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
                os.write(self.fd, f"{os.getpid()} {now()}\n".encode())
                return self
            except FileExistsError:
                if os.path.exists(LOCK) and time.time() - os.path.getmtime(LOCK) > 120:
                    os.unlink(LOCK)  # stale
                    continue
                if time.time() > deadline:
                    raise SystemExit("handoff/ is locked by another run; try again in a moment")
                time.sleep(0.2)

    def __exit__(self, *exc):
        if self.fd is not None:
            os.close(self.fd)
        try:
            os.unlink(LOCK)
        except OSError:
            pass
        return False


# ── claims ────────────────────────────────────────────────────────────────────

def active_claims(state: dict) -> list[dict]:
    live = []
    for c in state.get("claims", []):
        if c.get("released"):
            continue
        try:
            if parse_time(c["expires"]) < dt.datetime.now(dt.timezone.utc):
                c["expired"] = True
                continue
        except Exception:  # noqa: BLE001
            pass
        live.append(c)
    return live


def claim_holder(state: dict, path: str) -> dict | None:
    for c in active_claims(state):
        if path in c["paths"]:
            return c
    return None


def expired_claims(state: dict) -> list[dict]:
    out = []
    for c in state.get("claims", []):
        if c.get("released"):
            continue
        try:
            if parse_time(c["expires"]) < dt.datetime.now(dt.timezone.utc):
                out.append(c)
        except Exception:  # noqa: BLE001
            continue
    return out


# ── drift ─────────────────────────────────────────────────────────────────────

def drift(state: dict) -> dict:
    """Compare the files on disk against the manifest. This is the whole point."""
    manifest = state.get("manifest", {})
    live = snapshot()
    changed, added, removed = [], [], []
    for path, info in sorted(live.items()):
        old = manifest.get(path)
        if old is None:
            added.append(path)
        elif old.get("sha") != info["sha"]:
            changed.append(path)
    for path in sorted(manifest):
        if path not in live:
            removed.append(path)

    accounted, unattributed = [], []
    for path in changed + added:
        holder = claim_holder(state, path)
        (accounted if holder else unattributed).append(
            {"path": path, "agent": holder["agent"] if holder else None,
             "task": holder["task"] if holder else None,
             "state": "added" if path in added else "changed"})
    for path in removed:
        holder = claim_holder(state, path)
        entry = {"path": path, "agent": holder["agent"] if holder else None,
                 "task": holder["task"] if holder else None, "state": "removed"}
        (accounted if holder else unattributed).append(entry)
    return {"accounted": accounted, "unattributed": unattributed,
            "live": live, "changed": changed, "added": added, "removed": removed}


# ── rendering ─────────────────────────────────────────────────────────────────

def out(text: str = "") -> None:
    print(text)


def rule(title: str) -> None:
    out()
    out(title)
    out("-" * len(title))


def fmt_claim(c: dict) -> str:
    return (f"  {c['agent']:<10} {c['task']:<8} {len(c['paths'])} file(s), "
            f"{ago(c['created'])}, expires {c['expires']}\n"
            f"             {', '.join(c['paths'][:6])}"
            + (f" (+{len(c['paths']) - 6})" if len(c['paths']) > 6 else "")
            + (f"\n             {c['note']}" if c.get("note") else ""))


def open_tasks(tasks: dict) -> list[dict]:
    return [t for t in tasks["tasks"] if t["status"] in ("open", "in_progress", "blocked")]


def fmt_task(t: dict) -> str:
    owner = t.get("owner") or "unclaimed"
    line = f"  {t['id']:<8} [{t['status']:<11}] {owner:<10} {t['title']}"
    if t.get("files"):
        line += f"\n           touches: {', '.join(t['files'])}"
    if t.get("blockedBy"):
        line += f"\n           blocked by: {', '.join(t['blockedBy'])}"
    return line


def render_digest(state: dict, tasks: dict, d: dict) -> str:
    lines = ["# State", "",
             f"Generated by `tools/coord.py` at {now()}. Do not hand-edit; "
             "run `python tools/coord.py status` to regenerate.", ""]
    lines.append("## Drift")
    lines.append("")
    if d["unattributed"]:
        lines.append("Files changed with nobody holding a claim on them. Somebody edited "
                     "these without logging the work:")
        lines.append("")
        for item in d["unattributed"]:
            lines.append(f"- `{item['path']}` — {item['state']}")
        lines.append("")
        lines.append("Reconcile with `python tools/coord.py sync --agent NAME --note \"...\"` "
                     "once you know what they are.")
    else:
        lines.append("None. Every tracked file matches what was last accounted for.")
    lines.append("")
    lines.append("## In progress")
    lines.append("")
    claims = active_claims(state)
    if claims:
        for c in claims:
            lines.append(f"- **{c['agent']}** on {c['task']}: "
                         + ", ".join(f"`{p}`" for p in c["paths"])
                         + f" (claimed {ago(c['created'])}, expires {c['expires']})")
    else:
        lines.append("Nothing is claimed.")
    lines.append("")
    lines.append("## Open tasks")
    lines.append("")
    ot = open_tasks(tasks)
    if ot:
        for t in ot:
            lines.append(f"- `{t['id']}` **{t['status']}** — {t['title']}"
                         + (f" _(owner: {t['owner']})_" if t.get("owner") else ""))
    else:
        lines.append("None.")
    lines.append("")
    lines.append("## Last entries")
    lines.append("")
    for e in state["entries"][-8:][::-1]:
        lines.append(f"- `{e['id']}` {e['at']} · **{e['agent']}** · {e.get('task') or '—'} — "
                     f"{e['summary']}")
    if not state["entries"]:
        lines.append("None yet.")
    lines.append("")
    return "\n".join(lines)


def save_all(state: dict, tasks: dict, d: dict | None = None) -> None:
    if d is None:
        d = drift(state)
    write_json(STATE, state)
    write_json(TASKS, tasks)
    os.makedirs(HANDOFF, exist_ok=True)
    with open(DIGEST, "w", encoding="utf-8") as f:
        f.write(render_digest(state, tasks, d))


def append_log(entry: dict) -> None:
    os.makedirs(HANDOFF, exist_ok=True)
    first = not os.path.exists(LOG)
    with open(LOG, "a", encoding="utf-8") as f:
        if first:
            f.write("# Handoff log\n\nAppend-only. Written by `tools/coord.py`. "
                    "Newest entries at the bottom.\n")
        f.write(f"\n## {entry['id']} · {entry['at']} · {entry['agent']}"
                + (f" · {entry['task']}" if entry.get("task") else "") + "\n\n")
        f.write(f"**{entry['kind'].capitalize()}.** {entry['summary']}\n")
        if entry.get("files"):
            f.write("\nFiles: " + ", ".join(f"`{p}`" for p in entry["files"]) + "\n")
        if entry.get("next"):
            f.write(f"\nNext: {entry['next']}\n")


def record(state: dict, agent: str, kind: str, summary: str,
           task: str | None = None, files: list[str] | None = None,
           nxt: str | None = None) -> dict:
    entry = {"id": f"E{state['nextEntry']:04d}", "at": now(), "agent": agent,
             "task": task, "kind": kind, "summary": summary,
             "files": files or [], "next": nxt}
    state["nextEntry"] += 1
    state["entries"].append(entry)
    a = state["agents"].setdefault(agent, {"entries": 0})
    a["entries"] += 1
    a["lastSeen"] = entry["at"]
    append_log(entry)
    return entry


def account(state: dict, paths: list[str], entry_id: str) -> None:
    """Record the current content of these files as accounted for by an entry."""
    live = snapshot()
    for path in paths:
        if path in live:
            state["manifest"][path] = {**live[path], "entry": entry_id}
        else:
            state["manifest"].pop(path, None)


def find_task(tasks: dict, task_id: str) -> dict | None:
    for t in tasks["tasks"]:
        if t["id"].lower() == task_id.lower():
            return t
    return None


# ── commands ──────────────────────────────────────────────────────────────────

def need_baseline(state: dict) -> bool:
    if state.get("manifest"):
        return False
    out("No baseline yet — coord does not know what the files looked like last time.")
    out()
    out("  python tools/coord.py init --agent julien --note \"first baseline\"")
    out()
    out("Run that once, in the repository root. It hashes every tracked file and")
    out("everything after it is measured against that.")
    return True


def cmd_init(args) -> int:
    with Lock():
        state, tasks = load_state(), load_tasks()
        os.makedirs(INBOX, exist_ok=True)
        entry = record(state, args.agent, "baseline",
                       args.note or "Baseline: the repository as it stands now.")
        account(state, list(snapshot().keys()), entry["id"])
        save_all(state, tasks)
    out(f"Baseline taken as {entry['id']}: {len(state['manifest'])} files tracked.")
    return 0


def cmd_status(args) -> int:
    state, tasks = load_state(), load_tasks()
    if need_baseline(state):
        return 2
    d = drift(state)
    if args.json:
        print(json.dumps({"drift": {k: d[k] for k in ("accounted", "unattributed")},
                          "claims": active_claims(state),
                          "open_tasks": open_tasks(tasks),
                          "entries": state["entries"][-5:]}, ensure_ascii=False, indent=2))
    else:
        rule("Drift")
        if d["unattributed"]:
            for item in d["unattributed"]:
                out(f"  UNATTRIBUTED  {item['path']} ({item['state']})")
            out()
            out("  Someone changed these without claiming or logging them.")
            out("  Find out what they are before you edit anything that depends on them,")
            out("  then: python tools/coord.py sync --agent NAME --note \"what this was\"")
        else:
            out("  none — every tracked file matches what was last accounted for")
        if d["accounted"]:
            out()
            for item in d["accounted"]:
                out(f"  in progress   {item['path']} ({item['state']}) "
                    f"— {item['agent']} on {item['task']}")
        rule("Claims")
        claims = active_claims(state)
        out("\n".join(fmt_claim(c) for c in claims) if claims else "  none")
        stale = expired_claims(state)
        if stale:
            out()
            for c in stale:
                out(f"  EXPIRED       {c['agent']} / {c['task']} "
                    f"({', '.join(c['paths'][:4])}) — expired {ago(c['expires'])}")
        rule("Open tasks")
        ot = open_tasks(tasks)
        out("\n".join(fmt_task(t) for t in ot) if ot else "  none")
        rule("Recent")
        for e in state["entries"][-5:][::-1]:
            out(f"  {e['id']} {ago(e['at']):<10} {e['agent']:<9} {e['summary'][:70]}")
        out()
    save_all(state, tasks, d)
    return 1 if d["unattributed"] else 0


def cmd_brief(args) -> int:
    state, tasks = load_state(), load_tasks()
    if need_baseline(state):
        return 2
    d = drift(state)
    agent = args.agent

    out("=" * 78)
    out(f" BRIEF for {agent} · {now()} · Science Coherence")
    out("=" * 78)
    out()
    out(" You are one of several models working on this repository. The others cannot")
    out(" see your conversation and you cannot see theirs. This file is what you share.")
    out()
    out(" 1. Read canon/FRAMEWORK.md before writing or coding. It is not optional and it")
    out("    is not yours to change.")
    out(" 2. Claim the files you are about to edit:")
    out(f"       python tools/coord.py claim <paths> --agent {agent} --task <id>")
    out(" 3. When you finish:")
    out(f"       python tools/coord.py done --agent {agent} --task <id> --summary \"...\"")
    out("    That single call logs the work, updates the manifest and frees the files.")
    out(" 4. Never hand-edit documents.js — edit documents/*.html and run")
    out("    python tools/build-documents.py")
    out(" 5. If something contradicts canon, stop and say so. Do not resolve it yourself.")

    rule(" CANON — the short form")
    out("  Imagination precedes data, observation, proof, study and realization.")
    out("  The recursion is  ∇Φ → Λ → Ω → Δ  with directed closures  Δ → Λ  and  Ω → ∇Φ.")
    out("  The loop is generative in itself. No external generator, controller, observer")
    out("  or first mover. The closures are never bidirectional.")
    out("  Information is fundamental. The framework is revelatory, not invented.")
    out("  The lexicon holds exactly 64 entries: 13 base-13 digits, 26 Latin, 24 Greek, ∇.")
    out("  τ is Matrix time, q is recurrence depth, dτ/dq = J_ret/J0. q = 0 is the start of")
    out("  the experiment, not a singularity, and every counter runs live from it.")
    out("  All constants are declared in canon/constants.json. None are hidden or chosen.")
    out("  Three axes: section (where it lives) / collection (Research grouping) / type.")
    out("  Say what is defined, what is derived, and what is unresolved. Never smooth over.")

    rule(" WHAT CHANGED SINCE THE LAST ACCOUNTED STATE")
    if d["unattributed"]:
        out("  Changes nobody logged. Treat these as unknown work in progress:")
        for item in d["unattributed"]:
            out(f"    {item['state']:<8} {item['path']}")
        out()
        out("  Do not assume they are yours, and do not overwrite them blindly.")
    else:
        out("  Nothing unaccounted for.")
    if d["accounted"]:
        out()
        out("  Being worked on right now:")
        for item in d["accounted"]:
            out(f"    {item['state']:<8} {item['path']}  ({item['agent']} / {item['task']})")

    rule(" FILES HELD BY OTHERS — do not edit these")
    others = [c for c in active_claims(state) if c["agent"] != agent]
    mine = [c for c in active_claims(state) if c["agent"] == agent]
    out("\n".join(fmt_claim(c) for c in others) if others else "  none")
    if mine:
        rule(" YOUR OWN CLAIMS")
        out("\n".join(fmt_claim(c) for c in mine))

    rule(" TASKS")
    yours = [t for t in open_tasks(tasks) if (t.get("owner") or "") == agent]
    free = [t for t in open_tasks(tasks) if not t.get("owner")]
    theirs = [t for t in open_tasks(tasks) if t.get("owner") and t.get("owner") != agent]
    if yours:
        out("  Assigned to you:")
        out("\n".join(fmt_task(t) for t in yours))
        out()
    if free:
        out("  Unclaimed:")
        out("\n".join(fmt_task(t) for t in free))
        out()
    if theirs:
        out("  With someone else:")
        out("\n".join(fmt_task(t) for t in theirs))
    if not (yours or free or theirs):
        out("  none open")

    rule(" LAST 8 ENTRIES")
    for e in state["entries"][-8:][::-1]:
        out(f"  {e['id']} {e['at']} {e['agent']:<9} {e.get('task') or '—':<8} {e['summary']}")
        if e.get("next"):
            out(f"        next: {e['next']}")
    if not state["entries"]:
        out("  none yet")

    box = os.path.join(INBOX, f"{agent}.md")
    if os.path.exists(box) and os.path.getsize(box):
        rule(" YOUR INBOX  (handoff/inbox/%s.md)" % agent)
        with open(box, encoding="utf-8") as f:
            out(f.read().rstrip())

    if not args.no_check:
        rule(" CANON CHECK")
        try:
            sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
            import check_canon
            rep = check_canon.run(ROOT)
            for m in rep.failures:
                out("  FAIL  " + m)
            for m in rep.warnings[:8]:
                out("  warn  " + m)
            if len(rep.warnings) > 8:
                out(f"  warn  (+{len(rep.warnings) - 8} more — run python tools/check_canon.py)")
            if rep.ok and not rep.warnings:
                out("  clean")
        except Exception as exc:  # noqa: BLE001
            out(f"  could not run the canon check: {exc}")

    out()
    out("=" * 78)
    save_all(state, tasks, d)
    return 0


def cmd_claim(args) -> int:
    paths = [p.replace("\\", "/").lstrip("./") for p in args.paths]
    with Lock():
        state, tasks = load_state(), load_tasks()
        d = drift(state)
        problems = []
        for p in paths:
            holder = claim_holder(state, p)
            if holder and holder["agent"] != args.agent:
                problems.append(f"{p} is held by {holder['agent']} "
                                f"({holder['task']}, since {ago(holder['created'])})")
        dirty = [i["path"] for i in d["unattributed"] if i["path"] in paths]
        if dirty and not args.accept_drift:
            problems.append("unlogged changes on " + ", ".join(dirty) +
                            " — someone edited these without saying so; "
                            "re-read them, then add --accept-drift")
        if problems and not args.force:
            for m in problems:
                out("REFUSED  " + m)
            out()
            out("Nothing was claimed. Talk to the other agent "
                "(python tools/coord.py msg --from %s --to <agent> --text \"...\")"
                % args.agent)
            return 2
        if problems and args.force:
            for m in problems:
                out("OVERRIDDEN  " + m)
            record(state, args.agent, "override",
                   "Forced a claim over: " + "; ".join(problems), task=args.task, files=paths)

        live = snapshot()
        claim = {"id": f"C{len([c for c in state['claims']]) + 1:04d}",
                 "agent": args.agent, "task": args.task, "paths": paths,
                 "note": args.note, "created": now(),
                 "expires": (dt.datetime.now(dt.timezone.utc)
                             + dt.timedelta(hours=args.ttl)).strftime("%Y-%m-%dT%H:%M:%SZ"),
                 "pre": {p: live[p]["sha"] for p in paths if p in live}}
        state["claims"].append(claim)
        t = find_task(tasks, args.task) if args.task else None
        if t:
            t["status"] = "in_progress"
            t["owner"] = args.agent
            t["updated"] = now()
        save_all(state, tasks)
    out(f"{claim['id']}: {args.agent} holds {len(paths)} file(s) for {args.task} "
        f"until {claim['expires']}.")
    for p in paths:
        out("   " + p)
    return 0


def cmd_release(args) -> int:
    with Lock():
        state, tasks = load_state(), load_tasks()
        n = 0
        for c in active_claims(state):
            if c["agent"] != args.agent:
                continue
            if args.task and c["task"] != args.task:
                continue
            c["released"] = now()
            n += 1
        save_all(state, tasks)
    out(f"Released {n} claim(s).")
    return 0


def cmd_done(args) -> int:
    with Lock():
        state, tasks = load_state(), load_tasks()
        d = drift(state)
        mine = [c for c in active_claims(state)
                if c["agent"] == args.agent and (not args.task or c["task"] == args.task)]
        claimed = sorted({p for c in mine for p in c["paths"]})
        touched = sorted({i["path"] for i in d["accounted"]
                          if i["agent"] == args.agent} | set(args.files or []))
        if not touched and claimed:
            out("Nothing under your claim actually changed. Logging it anyway.")
        stray = [i["path"] for i in d["unattributed"]]
        entry = record(state, args.agent, "done", args.summary, task=args.task,
                       files=touched or claimed, nxt=args.next)
        account(state, touched or claimed, entry["id"])
        for c in mine:
            c["released"] = now()
        t = find_task(tasks, args.task) if args.task else None
        if t and not args.keep_open:
            t["status"] = "done"
            t["updated"] = now()
            t.setdefault("notes", []).append(f"{entry['id']}: {args.summary}")
        elif t:
            t["updated"] = now()
            t.setdefault("notes", []).append(f"{entry['id']}: {args.summary}")
        save_all(state, tasks)
    out(f"{entry['id']} logged. {len(entry['files'])} file(s) accounted for.")
    if t and not args.keep_open:
        out(f"{t['id']} closed.")
    if stray:
        out()
        out("Still unattributed (not yours, or not claimed):")
        for p in stray:
            out("   " + p)
    return 0


def cmd_log(args) -> int:
    with Lock():
        state, tasks = load_state(), load_tasks()
        entry = record(state, args.agent, args.kind, args.summary,
                       task=args.task, files=args.files or [], nxt=args.next)
        if args.account:
            account(state, args.files or [], entry["id"])
        save_all(state, tasks)
    out(f"{entry['id']} logged.")
    return 0


def cmd_sync(args) -> int:
    """Absorb unlogged changes into the manifest, with a note saying what they were."""
    with Lock():
        state, tasks = load_state(), load_tasks()
        d = drift(state)
        paths = args.paths or [i["path"] for i in d["unattributed"]]
        if not paths:
            out("Nothing to reconcile.")
            return 0
        entry = record(state, args.agent, "reconciled",
                       args.note or "Absorbed changes made outside coord.",
                       files=paths)
        account(state, paths, entry["id"])
        save_all(state, tasks)
    out(f"{entry['id']}: {len(paths)} file(s) reconciled.")
    for p in paths:
        out("   " + p)
    return 0


def cmd_task(args) -> int:
    with Lock():
        state, tasks = load_state(), load_tasks()
        if args.action == "add":
            t = {"id": f"T-{tasks['nextId']:03d}", "title": args.title,
                 "status": "open", "owner": args.owner, "files": args.files or [],
                 "why": args.why or "", "blockedBy": args.depends or [],
                 "created": now(), "updated": now(), "notes": []}
            tasks["nextId"] += 1
            tasks["tasks"].append(t)
            record(state, args.agent or "julien", "task", f"Added {t['id']}: {t['title']}")
            save_all(state, tasks)
            out(f"{t['id']} added.")
            return 0
        if args.action == "list":
            rows = tasks["tasks"] if args.all else open_tasks(tasks)
            if args.owner:
                rows = [t for t in rows if (t.get("owner") or "") == args.owner]
            out("\n".join(fmt_task(t) for t in rows) if rows else "  none")
            return 0
        t = find_task(tasks, args.id or "")
        if not t:
            out(f"No such task: {args.id}")
            return 2
        if args.action == "set":
            if args.status:
                if args.status not in TASK_STATUSES:
                    out(f"status must be one of {', '.join(TASK_STATUSES)}")
                    return 2
                t["status"] = args.status
            if args.owner is not None:
                t["owner"] = args.owner or None
            if args.title:
                t["title"] = args.title
            if args.note:
                t.setdefault("notes", []).append(f"{now()} {args.agent or ''}: {args.note}")
            if args.files:
                t["files"] = args.files
            t["updated"] = now()
            record(state, args.agent or "julien", "task",
                   f"{t['id']} → {t['status']}" + (f" ({t['owner']})" if t.get("owner") else ""))
            save_all(state, tasks)
            out(fmt_task(t))
            return 0
        if args.action == "show":
            out(json.dumps(t, ensure_ascii=False, indent=2))
            return 0
    return 0


def cmd_msg(args) -> int:
    os.makedirs(INBOX, exist_ok=True)
    box = os.path.join(INBOX, f"{args.to}.md")
    with open(box, "a", encoding="utf-8") as f:
        f.write(f"\n### {now()} — from {getattr(args, 'from')}\n\n{args.text}\n")
    with Lock():
        state, tasks = load_state(), load_tasks()
        record(state, getattr(args, "from"), "message",
               f"Message to {args.to}: {args.text[:80]}")
        save_all(state, tasks)
    out(f"Left in handoff/inbox/{args.to}.md")
    return 0


def cmd_inbox(args) -> int:
    box = os.path.join(INBOX, f"{args.agent}.md")
    if not os.path.exists(box):
        out("Empty.")
        return 0
    with open(box, encoding="utf-8") as f:
        out(f.read().rstrip())
    if args.clear:
        os.makedirs(os.path.join(INBOX, "read"), exist_ok=True)
        os.replace(box, os.path.join(INBOX, "read",
                                     f"{args.agent}-{now().replace(':', '')}.md"))
        out("\n(cleared)")
    return 0


def cmd_check(args) -> int:
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import check_canon
    return check_canon.main(["--root", ROOT] + (["--json"] if args.json else []))


def cmd_agents(args) -> int:
    state = load_state()
    if not state["agents"]:
        out("  nobody has logged anything yet")
        return 0
    for name, a in sorted(state["agents"].items(),
                          key=lambda kv: kv[1].get("lastSeen", ""), reverse=True):
        out(f"  {name:<12} {a.get('entries', 0):>3} entries   last seen "
            f"{ago(a.get('lastSeen', ''))}")
    return 0


# ── argument parsing ──────────────────────────────────────────────────────────

def build_parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(prog="coord", description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("init", help="take the current repository as the baseline")
    p.add_argument("--agent", required=True)
    p.add_argument("--note")
    p.set_defaults(func=cmd_init)

    p = sub.add_parser("brief", help="everything a model needs before starting work")
    p.add_argument("--agent", required=True)
    p.add_argument("--no-check", action="store_true")
    p.set_defaults(func=cmd_brief)

    p = sub.add_parser("status", help="drift, claims, open tasks")
    p.add_argument("--json", action="store_true")
    p.set_defaults(func=cmd_status)

    p = sub.add_parser("claim", help="take the files you are about to edit")
    p.add_argument("paths", nargs="+")
    p.add_argument("--agent", required=True)
    p.add_argument("--task", required=True)
    p.add_argument("--ttl", type=float, default=DEFAULT_TTL_HOURS,
                   help="hours before the claim lapses (default 8)")
    p.add_argument("--note")
    p.add_argument("--force", action="store_true")
    p.add_argument("--accept-drift", action="store_true",
                   help="you have read the unlogged changes and will work on top of them")
    p.set_defaults(func=cmd_claim)

    p = sub.add_parser("release", help="give the files back without logging work")
    p.add_argument("--agent", required=True)
    p.add_argument("--task")
    p.set_defaults(func=cmd_release)

    p = sub.add_parser("done", help="log the work, account for the files, free the claim")
    p.add_argument("--agent", required=True)
    p.add_argument("--task")
    p.add_argument("--summary", required=True)
    p.add_argument("--files", nargs="*")
    p.add_argument("--next", help="what the next model should pick up")
    p.add_argument("--keep-open", action="store_true")
    p.set_defaults(func=cmd_done)

    p = sub.add_parser("log", help="write an entry without closing anything")
    p.add_argument("--agent", required=True)
    p.add_argument("--summary", required=True)
    p.add_argument("--task")
    p.add_argument("--kind", default="note")
    p.add_argument("--files", nargs="*")
    p.add_argument("--next")
    p.add_argument("--account", action="store_true",
                   help="also record these files' current content as accounted for")
    p.set_defaults(func=cmd_log)

    p = sub.add_parser("sync", help="reconcile changes that were made outside coord")
    p.add_argument("--agent", required=True)
    p.add_argument("--note")
    p.add_argument("paths", nargs="*")
    p.set_defaults(func=cmd_sync)

    p = sub.add_parser("task", help="the shared to-do list")
    p.add_argument("action", choices=["add", "list", "set", "show"])
    p.add_argument("id", nargs="?")
    p.add_argument("--title")
    p.add_argument("--status")
    p.add_argument("--owner")
    p.add_argument("--why")
    p.add_argument("--note")
    p.add_argument("--files", nargs="*")
    p.add_argument("--depends", nargs="*")
    p.add_argument("--agent")
    p.add_argument("--all", action="store_true")
    p.set_defaults(func=cmd_task)

    p = sub.add_parser("msg", help="leave a message for another agent")
    p.add_argument("--from", required=True, dest="from")
    p.add_argument("--to", required=True)
    p.add_argument("--text", required=True)
    p.set_defaults(func=cmd_msg)

    p = sub.add_parser("inbox", help="read your messages")
    p.add_argument("--agent", required=True)
    p.add_argument("--clear", action="store_true")
    p.set_defaults(func=cmd_inbox)

    p = sub.add_parser("check", help="run the canon checks")
    p.add_argument("--json", action="store_true")
    p.set_defaults(func=cmd_check)

    p = sub.add_parser("agents", help="who has been working here")
    p.set_defaults(func=cmd_agents)
    return ap


def main(argv: list[str] | None = None) -> int:
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:  # noqa: BLE001
        pass
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
