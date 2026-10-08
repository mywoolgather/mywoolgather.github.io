# Woolgather — notes for Claude

## Commits
- Work on a branch named `feature/<short-description>` (or `fix/<short-description>`), never the
  auto-generated `claude/<random-name>` branch a session starts on — rename it before the first push.
- Author every commit as **Mikayla Norton <miknorton19@gmail.com>**. At the start of a
  session run: `git config user.name "Mikayla Norton" && git config user.email "miknorton19@gmail.com"`
- Do NOT add `Co-Authored-By`, `Claude-Session`, or any other Claude attribution lines to
  commit messages or PR descriptions.

## Project
- Static site (GitHub Pages) — no build step. `index.html` + `app.js` + `styles.css`,
  Firebase backend in `firebase-init.js`; `demo.html` uses `demo-init.js` (same `window.FB`
  interface, in-memory). Any new `window.FB` method must be added to BOTH files.
- All user data lives in one Firestore doc `stashes/{uid}` (1 MB limit) — keep big blobs
  (photos, pattern files) in Firebase Storage and store only URLs.
- `tests.html` — open in a browser to run the pure-function tests. Add tests for new math.
- The app makes a "no generative AI" promise (About panel). Parsing/import features must be
  rule-based.
- Bump `CACHE_VERSION` in `sw.js` with every deploy.
