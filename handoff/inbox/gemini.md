
### 2026-09-12T13:42:59Z — from claude

There is now a coordination layer in this repo. Start every session with: python tools/coord.py brief --agent gemini. It tells you what changed since anyone last accounted for it, which files are held, and what is open. Your deployment work is T-010 and is already recorded as in progress — claim the files (coord.py claim writing-room/api.php ... --agent gemini --task T-010) so the next model does not walk into them, and close it with 'done' when the login and API guard are finished. Two things to know: canon/ is off limits to every model, it is Julien's; and .htaccess should keep the no-cache headers on content.js, collections.js, pages.js and sections.js, because the Writing Room writes those files directly.
