#!/usr/bin/env python3
"""Build documents.js from the authored sources in documents/.

Each documents/<id>.html contains:
  * a <script type="application/json" id="meta"> block with the document metadata
  * one or more <section data-id="…" data-num="…" data-label="…" data-title="…" data-summary="…"> blocks
Optional: documents/<id>.lexicon.json (an array of {term, category, formula, desc}).

Usage:  python3 tools/build-documents.py
"""
import json
import re
import html
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "documents"
OUT = ROOT / "documents.js"

SECTION_RE = re.compile(r"<section\s+([^>]*)>(.*?)</section>", re.S)
ATTR_RE = re.compile(r'([\w-]+)="([^"]*)"')
TAG_RE = re.compile(r"<[^>]+>")
MATH_RE = re.compile(r"\$\$.*?\$\$|\$[^$]*\$", re.S)


def attrs(s):
    return {k: html.unescape(v) for k, v in ATTR_RE.findall(s)}


def plain_text(markup):
    """Search text: strip tags, math and collapse whitespace."""
    t = MATH_RE.sub(" ", markup)
    t = TAG_RE.sub(" ", t)
    t = html.unescape(t)
    return re.sub(r"\s+", " ", t).strip()


def build_one(path):
    raw = path.read_text(encoding="utf-8")
    raw = re.sub(r"<!--.*?-->", "", raw, flags=re.S)
    meta_m = re.search(r'<script type="application/json" id="meta">(.*?)</script>', raw, re.S)
    if not meta_m:
        raise SystemExit(f"{path.name}: missing meta block")
    doc = json.loads(meta_m.group(1))
    doc["kind"] = "document"
    sections = []
    words = 0
    search_parts = [doc.get("title", ""), doc.get("subtitle", ""), doc.get("description", "")]
    for m in SECTION_RE.finditer(raw):
        a = attrs(m.group(1))
        body = m.group(2).strip()
        text = plain_text(body)
        words += len(text.split())
        search_parts.append(a.get("data-label", ""))
        search_parts.append(a.get("data-title", ""))
        search_parts.append(text)
        sections.append({
            "id": a["data-id"],
            "num": a.get("data-num", ""),
            "label": a.get("data-label", ""),
            "title": a.get("data-title", ""),
            "summary": a.get("data-summary", ""),
            "html": body,
        })
    doc["sections"] = sections
    lex_path = path.with_name(path.stem + ".lexicon.json")
    if lex_path.exists():
        doc["lexicon"] = json.loads(lex_path.read_text(encoding="utf-8"))
        for item in doc["lexicon"]:
            words += len(item["desc"].split())
            search_parts.append(item["term"] + " " + item["desc"])
    doc["words"] = words
    doc["minutes"] = max(1, round(words / 200))
    doc["search"] = " ".join(search_parts).lower()
    return doc


def main():
    docs = [build_one(p) for p in sorted(SRC.glob("*.html"))]
    payload = json.dumps(docs, ensure_ascii=False, indent=1)
    OUT.write_text("window.SC_DOCUMENTS = " + payload + ";\n", encoding="utf-8")
    for d in docs:
        print(f"{d['id']}: {len(d['sections'])} sections, {d['words']} words, ~{d['minutes']} min -> {OUT.name}")


if __name__ == "__main__":
    main()
