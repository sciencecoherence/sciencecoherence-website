# Science Coherence website

This folder is the current website development home. Read README.md and PROJECT.md before changing the site. The initial browser review is in reviews/2026-09-08-baseline.md.

## Implementation

- Keep the existing dependency-free HTML/CSS/JavaScript architecture unless a requested feature needs a change. There is no package installation or frontend build step.
- index.html is the shell; styles.css contains the design system; app.js handles routing and interactions; content.js holds article data.
- Edit authored documents in documents/, then run `python tools/build-documents.py`. Do not hand-edit documents.js.
- Preserve source downloads in sources/ and historical files in _superseded/. Those historical files are references, not the active implementation.
- Preserve existing hash URLs and redirects when changing navigation.

## Editorial and design continuity

- Retain the established green palette, typography, light/dark themes, responsive layouts, and reading-oriented design unless the user requests a redesign.
- Preserve authored wording, version context, failure conditions, and existing cautions when making implementation changes. Flag contradictory content rather than silently deciding a scientific or editorial position.
- Transmissions is intentionally hidden. The Protocol has a standalone route. Keep those choices unless the task changes them.
- Keep shared decisions and priorities in PROJECT.md so later tasks can continue from written project context.

## Verification

- Preview over local HTTP so self-hosted fonts load correctly.
- Run `node --check` on modified JavaScript files.
- For visible changes, check affected routes in the browser at desktop and phone widths and in both themes when relevant.
- For changes to the reader or navigation, check search, section links, saved articles, browser refresh, and applicable document widgets.
- Check browser errors and page overflow. Report what was actually tested and any remaining limits.
- Keep commits focused. The tag baseline-2026-09-08 preserves the original 59-file website.
