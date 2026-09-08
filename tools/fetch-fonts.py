#!/usr/bin/env python3
"""Download the site's web fonts from Google Fonts and self-host them.

Writes assets/fonts/*.woff2 and assets/fonts.css. Self-hosting keeps the site
free of third-party requests and makes it work offline or from a file:// copy.

Usage:  python3 tools/fetch-fonts.py
"""
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FONT_DIR = ROOT / "assets" / "fonts"
CSS_OUT = ROOT / "assets" / "fonts.css"

URL = ("https://fonts.googleapis.com/css2?"
       "family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500"
       "&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400"
       "&family=JetBrains+Mono:wght@400;500;600&display=swap")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"}
SUBSETS = ("latin", "latin-ext")
# Weight range to declare per family (these are variable fonts: one file, many weights).
RANGES = {"Newsreader": "400 600", "DM Sans": "400 700", "JetBrains Mono": "400 600"}


def fetch(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()


def main():
    FONT_DIR.mkdir(parents=True, exist_ok=True)
    css = fetch(URL).decode()
    faces = {}
    for subset, block in re.findall(r"/\*\s*([\w\-\[\]]+)\s*\*/\s*(@font-face\s*\{.*?\})", css, re.S):
        if subset not in SUBSETS:
            continue
        family = re.search(r"font-family:\s*'([^']+)'", block).group(1)
        style = "italic" if "font-style: italic" in block else "normal"
        url = re.search(r"url\((https://[^)]+\.woff2)\)", block).group(1)
        rng = re.search(r"unicode-range:\s*([^;]+);", block).group(1).strip()
        faces.setdefault((family, style, subset), {"url": url, "range": rng})

    out = ["/* Self-hosted subset of Newsreader, DM Sans and JetBrains Mono (latin + latin-ext).",
           "   Variable fonts: one file covers the whole weight range.",
           "   Regenerate with: python3 tools/fetch-fonts.py */", ""]
    for (family, style, subset), info in sorted(faces.items()):
        name = f"{family.replace(' ', '')}-{style}-{subset}.woff2"
        (FONT_DIR / name).write_bytes(fetch(info["url"]))
        out.append("@font-face {\n"
                   f"  font-family: '{family}';\n"
                   f"  font-style: {style};\n"
                   f"  font-weight: {RANGES[family]};\n"
                   "  font-display: swap;\n"
                   f"  src: url(fonts/{name}) format('woff2');\n"
                   f"  unicode-range: {info['range']};\n"
                   "}")
        print(f"{name}  {(FONT_DIR / name).stat().st_size // 1024} KB")
    CSS_OUT.write_text("\n".join(out) + "\n", encoding="utf-8")
    print(f"\n{len(faces)} faces -> {CSS_OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
