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

## Next milestones

1. **Consistency and accessibility fixes.** Resolve the homepage collection count, reconcile the calendar descriptions and weekday text, and correct the mobile menu label after navigation. See the review for reproduction details.
2. **First-visit clarity.** Review the introduction and Start Here path together, define the intended audience, and make the first useful reading choice clear while keeping the site's voice.
3. **Publication preparation.** Choose the intended hosting/domain and remote backup, then check social previews, search metadata, source downloads, print output, and target browsers before publishing.

The first milestone is the recommended next implementation task. The content contradictions require choosing the intended wording before applying a correction.

## Completion standard for an improvement

Make one focused change, verify the affected reader experience, record meaningful decisions here, and save a commit with a concise explanation. Use reviews/ for dated assessments. Do not treat this project note as an automatic schedule to work or publish later.
