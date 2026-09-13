# Handoff log

Append-only. Written by `tools/coord.py`. Newest entries at the bottom.

The entries above `E0009` were written by hand when the log was created, from what the repository and the audit actually show. Everything after them was written by `coord`.

## E0001 · 2026-09-08T23:13:34Z · julien

**Baseline.** The migrated site: dependency-free HTML/CSS/JS, documents pipeline, Writing Room. Earlier work was done in ChatGPT and Gemini sessions that are not recorded here.

## E0002 · 2026-09-10T01:06:42Z · chatgpt

**Done.** Writing Room brought toward collections: server-side plumbing started. Interrupted part-way when the session ran out of usage.

Files: `writing-room/server.py`, `writing-room/public/room.js`

Next: Finish the collections work: the room could not file an article in a collection yet.

## E0003 · 2026-09-11T17:51:27Z · claude

**Done.** Temporal Matrix V10 ported from Julien's other working copy: exact BigInt continued fraction ladder, tau* derived rather than tabulated, LAUNCH separated from the nineteen hard rungs, checkMatrix() assertions.

Files: `app.js`

## E0004 · 2026-09-11T18:30:00Z · claude

**Done.** Counters run live from the start of the experiment. Residual, active J, integrated load, load still active and rung fill were frozen because LAUNCH was acting as its own next rung in spanFraction() and nextRung(). q = 0 is the start of the experiment, not a singularity.

Files: `app.js`

## E0005 · 2026-09-11T19:34:41Z · claude

**Done.** Sections, collections and types separated into three independent axes. sections.js and collections.js added; the Writing Room can file an article in a collection; the Library classifies by type.

Files: `app.js`, `sections.js`, `collections.js`, `content.js`, `writing-room/server.py`, `writing-room/public/room.js`

## E0006 · 2026-09-11T20:05:06Z · claude

**Done.** Main-page copy extracted into pages.js (103 fields across 9 pages) and made editable in the Writing Room, including the rich in-place editors with protected blocks. Protocol source round-trips byte-identically when untouched.

Files: `pages.js`, `app.js`, `index.html`, `writing-room/site_pages.py`, `writing-room/server.py`, `writing-room/public/room.js`, `writing-room/tests/test_server.py`

## E0007 · 2026-09-12T00:43:08Z · gemini · T-010

**Done.** Deployment pass started: .gitignore tightened, .htaccess added with no-cache headers on the editable data files and directory listing off.

Files: `.gitignore`, `.htaccess`, `writing-room/.htaccess`

Next: Login and API guard next.

## E0008 · 2026-09-12T12:59:02Z · gemini · T-010

**Log.** Online Writing Room API in progress: api.php reworked against the session guard.

Files: `writing-room/api.php`

## E0009 · 2026-09-12T13:57:20Z · julien

**Baseline.** first baseline

## E0010 · 2026-09-12T19:05:13Z · julien

**Task.** Added T-014: Author 100 framework articles for content.js

## E0011 · 2026-09-12T19:14:42Z · gemini

**Reconciled.** tools for batch authoring and compiling framework articles

Files: `tools/article_builder.py`, `tools/compile_all_content.py`, `tools/article_data/all_new_articles.json`, `tools/article_data/__init__.py`

## E0012 · 2026-09-12T19:15:15Z · gemini · T-014

**Done.** Authored and compiled 100 new canonical articles based on the complete Cohera framework across Framework (20), Philosophy (20), Meta-Mathematics (20), Biophysic (20), Notes & Methods (10), and The Lab (10) into content.js, bringing total to 114 articles. Fixed typo 'Research articlessss' to 'Research article'. Passed coord check and all unit tests.

Files: `content.js`

Next: T-010 Writing Room online behind login or T-001/T-002 instrument fixes.

## E0013 · 2026-09-12T19:15:22Z · julien

**Task.** T-006 → done

## E0014 · 2026-09-13T00:18:38Z · julien

**Task.** Added T-015: Revert published articles back to the 14 baseline articles

## E0015 · 2026-09-13T00:21:19Z · gemini

**Reconciled.** Removed temporary article authoring and compilation tools

Files: `tools/article_builder.py`, `tools/article_data/__init__.py`, `tools/compile_all_content.py`

## E0016 · 2026-09-13T00:21:29Z · gemini · T-015

**Done.** Reverted published articles in content.js back to the 14 baseline articles per user request. Cleaned up authoring tools and verified all tests pass.

Files: `content.js`

Next: T-010 Writing Room online behind login

## E0017 · 2026-09-13T00:35:48Z · chatgpt · homepage-illustrations

**Done.** Improved home page Research, Lab, Transmissions and recent-work illustrations with detailed native SVG constructions. Preserved hero and protocol SVG output exactly, retained all authored copy, and scoped article artwork to home only. Checked desktop 1440px and mobile 390px in light/dark themes, no horizontal overflow or console errors; JavaScript syntax, 31 Writing Room tests and tools tests passed. Canon clean with existing collection warnings.

Files: `app.js`

Next: User may review the refreshed home illustrations; existing unrelated tasks remain open.

## E0018 · 2026-09-13T00:36:36Z · julien

**Task.** Added T-016: None

## E0019 · 2026-09-13T00:37:50Z · gemini · T-016

**Done.** Restored canonical collection bindings and V10 locked Temporal Matrix text to the 14 baseline articles in content.js, resolving empty article listings in Research and Library views.

Files: `content.js`

Next: T-010 Writing Room online behind login

## E0020 · 2026-09-13T21:09:42Z · julien

**Task.** Added T-017: Fix Start-WritingRoom version mismatch with server.py ROOM_VERSION 4

## E0021 · 2026-09-13T21:12:42Z · gemini · T-017

**Done.** Synchronized Start-WritingRoom.ps1 roomVersion with server.py ROOM_VERSION 4 and added dynamic version detection from server.py. Updated PROJECT.md. Stopped stale background server running version 3 and restarted with version 4.

Files: `PROJECT.md`, `writing-room/Start-WritingRoom.ps1`

Next: T-010 Writing Room online behind login

## E0022 · 2026-09-13T21:28:30Z · julien

**Task.** Added T-018: Fix article left TOC menu disappearing when headings <= 2

## E0023 · 2026-09-13T21:29:15Z · gemini · T-018

**Done.** Updated TOC heading threshold in app.js from headings.length > 2 to headings.length > 0 so articles with 1 or 2 headings display the left On This Page menu.

Files: `app.js`

Next: T-010 Writing Room online behind login

## E0024 · 2026-09-13T21:29:19Z · julien

**Reconciled.** Edited calendar-360 in Writing Room

Files: `content.js`

## E0025 · 2026-09-13T21:40:12Z · chatgpt

**Task.** T-002 → done

## E0026 · 2026-09-13T21:40:12Z · chatgpt

**Task.** T-003 → done

## E0027 · 2026-09-13T21:40:12Z · chatgpt · clock-equinox

**Done.** User requested March 2027 equinox synchronization between website and standalone clock, then clarified the pre-launch calendar must already advance. app.js now uses fixed USNO minute-resolution epoch 2027-03-20T20:25:00Z, ignores old independent simulation epochs, and uses UTC elapsed time. Calendar dates extend backward with signed calendarTau; retained-process tau/q remain zero until launch. Next-date boundary advances before launch; Stilla 30 February changes exactly to Differa 1 March at epoch. Equivalent engine and UI shipped to browser clock on 8767 and installed screensaver. Preserved the existing wave, rates, ladder, interpolation, and other agents' edits. Tested all 359 pre-launch dates, launch +/-1ms, calendar rollover, old-storage independence, timezone invariance, 11 website/app parity positions, exact ladder/wave checks, desktop/390px browser displays, native screensaver; 31 Writing Room and 28 tools tests passed, canon clean.

Files: `app.js`

Next: Existing rate normalization task T-001 remains outside this correction. App deliverables: C:\Users\julie\Documents\Codex\2026-09-13\u\outputs\Temporal-Matrix.
