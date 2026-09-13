#!/usr/bin/env python3
"""Verify that the site still obeys canon.

Canon lives in canon/*.json and canon/FRAMEWORK.md. This module checks the parts a
script can check: the shape of the recursion, the census of the lexicon, the declared
constants against app.js, and the internal consistency of the site data.

It is deliberately conservative. It fails on a violation of something canon states
outright, and it warns where a human has to look. It never rewrites anything.

    python tools/check_canon.py [--json] [--root PATH]
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys

ROOT_DEFAULT = os.environ.get("COORD_ROOT") or os.path.dirname(
    os.path.dirname(os.path.abspath(__file__)))

DATA_FILES = {
    "sections.js": "SC_SECTIONS",
    "collections.js": "SC_COLLECTIONS",
    "content.js": "SC_CONTENT",
    "pages.js": "SC_PAGES",
}


class Report:
    def __init__(self) -> None:
        self.failures: list[str] = []
        self.warnings: list[str] = []
        self.notes: list[str] = []

    def fail(self, msg: str) -> None:
        self.failures.append(msg)

    def warn(self, msg: str) -> None:
        self.warnings.append(msg)

    def note(self, msg: str) -> None:
        self.notes.append(msg)

    @property
    def ok(self) -> bool:
        return not self.failures

    def as_dict(self) -> dict:
        return {"ok": self.ok, "failures": self.failures,
                "warnings": self.warnings, "notes": self.notes}


def read_json(path: str):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def read_data_file(path: str, var: str):
    """content.js and friends are `window.SC_X = <json>;` — parse the JSON out."""
    with open(path, encoding="utf-8-sig") as f:
        text = f.read()
    prefix = "window." + var
    start = text.find(prefix)
    if start < 0:
        raise ValueError(f"{os.path.basename(path)} does not assign window.{var}")
    eq = text.find("=", start + len(prefix))
    body = text[eq + 1:].strip()
    if body.endswith(";"):
        body = body[:-1]
    return json.loads(body)


# ── canon/recursion.json ──────────────────────────────────────────────────────

NODES = ["∇Φ", "Λ", "Ω", "Δ"]
FORWARD = [("∇Φ", "Λ"), ("Λ", "Ω"), ("Ω", "Δ")]
CLOSURES = [("Δ", "Λ"), ("Ω", "∇Φ")]


def check_recursion(root: str, rep: Report) -> None:
    path = os.path.join(root, "canon", "recursion.json")
    if not os.path.exists(path):
        rep.fail("canon/recursion.json is missing")
        return
    doc = read_json(path)
    symbols = [n.get("symbol") for n in doc.get("nodes", [])]
    if symbols != NODES:
        rep.fail(f"recursion nodes are {symbols}, canon says {NODES}")
    edges = [(e.get("from"), e.get("to")) for e in doc.get("edges", [])]
    for pair in FORWARD:
        if pair not in edges:
            rep.fail(f"recursion is missing the forward edge {pair[0]} → {pair[1]}")
    for pair in CLOSURES:
        if pair not in edges:
            rep.fail(f"recursion is missing the closure {pair[0]} → {pair[1]}")
    expected = set(FORWARD) | set(CLOSURES)
    for pair in edges:
        if pair not in expected:
            rep.fail(f"recursion has an edge canon does not declare: {pair[0]} → {pair[1]}")
    for e in doc.get("edges", []):
        if e.get("directed") is not True:
            rep.fail(f"edge {e.get('from')} → {e.get('to')} is not directed; "
                     "the closures are one-way")
        if (e.get("from"), e.get("to")) in CLOSURES and (e.get("to"), e.get("from")) in edges:
            rep.fail(f"closure {e.get('from')} → {e.get('to')} has been made bidirectional")
    if len(edges) != len(set(edges)):
        rep.fail("recursion declares the same edge twice")
    if doc.get("causal_order") != ["imagination", "selection", "rendering",
                                   "recursive persistence"]:
        rep.fail("causal order has been altered; imagination comes first")


# ── canon/lexicon.json ────────────────────────────────────────────────────────

def check_lexicon(root: str, rep: Report) -> None:
    path = os.path.join(root, "canon", "lexicon.json")
    if not os.path.exists(path):
        rep.fail("canon/lexicon.json is missing")
        return
    doc = read_json(path)
    total = doc.get("total")
    if total != 64:
        rep.fail(f"lexicon total is {total}; canon says 64 genuine entries")
    census = {c.get("id"): c.get("count") for c in doc.get("classes", [])}
    expected = {"base13": 13, "latin": 26, "greek": 24, "operator": 1}
    if census != expected:
        rep.fail(f"lexicon census is {census}; canon says {expected}")
    counted = sum(c.get("count", 0) for c in doc.get("classes", []))
    if counted != total:
        rep.fail(f"lexicon classes sum to {counted} but total is {total}")
    seen: dict[str, str] = {}
    for c in doc.get("classes", []):
        members = c.get("members", [])
        unresolved = c.get("unresolved", 0)
        if len(members) + unresolved != c.get("count"):
            rep.fail(f"lexicon class {c.get('id')} lists {len(members)} members "
                     f"+ {unresolved} unresolved, but declares {c.get('count')}")
        if len(set(members)) != len(members):
            rep.fail(f"lexicon class {c.get('id')} repeats a symbol")
        for m in members:
            if m in seen and seen[m] != c.get("id"):
                rep.warn(f"symbol {m!r} appears in both {seen[m]} and {c.get('id')}")
            seen[m] = c.get("id")
        if unresolved:
            rep.note(f"{unresolved} symbol(s) in {c.get('id')} are still unresolved — "
                     "a model must not invent them")


# ── canon/constants.json against the instrument ───────────────────────────────

def check_constants(root: str, rep: Report) -> None:
    path = os.path.join(root, "canon", "constants.json")
    app = os.path.join(root, "app.js")
    if not os.path.exists(path):
        rep.fail("canon/constants.json is missing")
        return
    doc = read_json(path)
    if not os.path.exists(app):
        rep.warn("app.js not found; skipped the constant check")
        return
    with open(app, encoding="utf-8-sig") as f:
        src = f.read()

    declared = doc.get("declared", {})
    # Each constant declares where it is bound. Grepping for the digits alone is not
    # enough: the validation tables in app.js repeat them, so a changed binding would
    # slip through a presence check.
    for name, spec in declared.items():
        for key in ("binding", "binding2"):
            pattern = spec.get(key)
            if not pattern:
                continue
            if not re.search(pattern, src):
                rep.fail(f"declared constant {name} is no longer bound as canon states "
                         f"(canon/constants.json expects /{pattern}/ in app.js)")
        if not spec.get("binding"):
            rep.note(f"constant {name} declares no binding site; it is not machine-checked")

    if not re.search(r"TAU_STAR\s*=\s*frNum\(", src):
        rep.fail("TAU_STAR is no longer derived from the ladder in app.js; "
                 "canon says the absorption point is derived, never chosen")
    if not re.search(r"const\s+RUNGS\s*=\s*LADDER\.slice\(1\)", src):
        rep.fail("RUNGS is no longer LADDER.slice(1); LAUNCH must not be a hard rung")

    states = doc.get("ladder", {}).get("states", [])
    if len(states) != doc.get("ladder", {}).get("length"):
        rep.fail("ladder length and the number of state names disagree in constants.json")
    missing = [s for s in states if f"'{s}'" not in src]
    if missing:
        rep.fail(f"ladder states missing from app.js: {', '.join(missing)}")

    if re.search(r"\bnew Date\(\)[^\n]*\btau\b", src):
        rep.warn("app.js may be deriving τ from civil time; canon keeps them separate")


# ── site data ─────────────────────────────────────────────────────────────────

def check_site_data(root: str, rep: Report) -> None:
    data = {}
    for name, var in DATA_FILES.items():
        path = os.path.join(root, name)
        if not os.path.exists(path):
            rep.warn(f"{name} not found; skipped")
            continue
        try:
            data[name] = read_data_file(path, var)
        except Exception as exc:  # noqa: BLE001
            rep.fail(f"{name} does not parse: {exc}")
    sections = {s.get("id") for s in data.get("sections.js", [])}
    collections = {c.get("id") for c in data.get("collections.js", [])}
    articles = data.get("content.js", [])
    ids = {a.get("id") for a in articles}

    for a in articles:
        if sections and a.get("category") not in sections:
            rep.fail(f"article {a.get('id')} is filed in section "
                     f"{a.get('category')!r}, which is not in sections.js")
        col = a.get("collection")
        if col and collections and col not in collections:
            rep.fail(f"article {a.get('id')} is filed in collection "
                     f"{col!r}, which is not in collections.js")
        if a.get("category") == "research" and not col:
            rep.warn(f"article {a.get('id')} is in Research with no collection")
        if not a.get("type"):
            rep.warn(f"article {a.get('id')} has no type; the Library filters by type")

    for c in data.get("collections.js", []):
        for ref in c.get("order", []) or []:
            if ids and ref not in ids:
                rep.fail(f"collection {c.get('id')} orders unknown article {ref!r}")
        if c.get("section") and sections and c.get("section") not in sections:
            rep.fail(f"collection {c.get('id')} belongs to unknown section "
                     f"{c.get('section')!r}")

    for p in data.get("pages.js", []):
        keys = [f.get("key") for f in p.get("fields", [])]
        if len(keys) != len(set(keys)):
            rep.fail(f"page {p.get('id')} repeats a field key")


def check_documents(root: str, rep: Report) -> None:
    """documents.js is generated. Rebuild it in memory and compare.

    This catches both a stale build and a hand-edit of documents.js, which canon
    forbids: the authored source is documents/*.html.
    """
    built = os.path.join(root, "documents.js")
    src_dir = os.path.join(root, "documents")
    builder = os.path.join(root, "tools", "build-documents.py")
    if not (os.path.exists(built) and os.path.isdir(src_dir) and os.path.exists(builder)):
        return
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location("sc_build_documents", builder)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        from pathlib import Path
        docs = [mod.build_one(p) for p in sorted(Path(src_dir).glob("*.html"))]
        expected = json.dumps(docs, ensure_ascii=False, indent=1)
    except Exception as exc:  # noqa: BLE001
        rep.warn(f"could not rebuild documents.js to compare: {exc}")
        return
    try:
        current = read_data_file(built, "SC_DOCUMENTS")
    except Exception as exc:  # noqa: BLE001
        rep.fail(f"documents.js does not parse: {exc}")
        return
    if json.loads(expected) != current:
        current_ids = {d.get("id") for d in current}
        source_ids = {d.get("id") for d in docs}
        detail = ""
        if source_ids - current_ids:
            detail = " missing: " + ", ".join(sorted(source_ids - current_ids))
        elif current_ids - source_ids:
            detail = " no longer authored: " + ", ".join(sorted(current_ids - source_ids))
        else:
            differing = [d["id"] for d in docs
                         if d != next((c for c in current if c.get("id") == d["id"]), None)]
            detail = " differs for: " + ", ".join(differing)
        rep.fail("documents.js does not match documents/ —" + detail +
                 ". Run python tools/build-documents.py (never hand-edit documents.js).")


def check_syntax(root: str, rep: Report) -> None:
    node = None
    for candidate in ("node", "node.exe"):
        try:
            subprocess.run([candidate, "--version"], capture_output=True, check=True)
            node = candidate
            break
        except Exception:  # noqa: BLE001
            continue
    if not node:
        rep.note("node not available; skipped the JavaScript syntax check")
        return
    for name in ("app.js", "content.js", "sections.js", "collections.js",
                 "pages.js", "documents.js"):
        path = os.path.join(root, name)
        if not os.path.exists(path):
            continue
        proc = subprocess.run([node, "--check", path], capture_output=True, text=True)
        if proc.returncode != 0:
            rep.fail(f"node --check {name} failed: "
                     f"{proc.stderr.strip().splitlines()[0] if proc.stderr.strip() else ''}")


def run(root: str = ROOT_DEFAULT) -> Report:
    rep = Report()
    check_recursion(root, rep)
    check_lexicon(root, rep)
    check_constants(root, rep)
    check_site_data(root, rep)
    check_documents(root, rep)
    check_syntax(root, rep)
    return rep


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Check the site against canon.")
    ap.add_argument("--root", default=ROOT_DEFAULT)
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args(argv)
    rep = run(args.root)
    if args.json:
        print(json.dumps(rep.as_dict(), ensure_ascii=False, indent=2))
    else:
        for m in rep.failures:
            print("FAIL  " + m)
        for m in rep.warnings:
            print("warn  " + m)
        for m in rep.notes:
            print("note  " + m)
        print("\ncanon: " + ("clean" if rep.ok else f"{len(rep.failures)} violation(s)"))
    return 0 if rep.ok else 1


if __name__ == "__main__":
    sys.exit(main())
