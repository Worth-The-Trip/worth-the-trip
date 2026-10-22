# Worth The Trip Front-End Skill

## Trigger
Build, maintain, or debug the Worth The Trip (WTT) single-page travel-guide app: `02_Website` (index.html, src/css/styles.css, src/js/app.js, src/js/data/strings.js, src/js/data/guides.js, src/js/data/creators.js, src/js/data/bookings.js, src/js/data/*.js).

## Procedure (what to do, in order)
1. **Read the shape first:** `index.html`, `src/js/app.js` (CONFIG / state / functions), `src/js/data/strings.js` (EN + JA keys), `src/css/styles.css` (design tokens). Grep the file for the relevant symbol before assuming its shape.
2. **Make surgical edits only.** Use `patch` (exact old_string) or `write_file`/heredoc for whole-file rewrites. **Never** full-file rewrites via `write_file` (they truncate or trigger a stale-write refusal). If patched content with exact strings reads fine, `write_file` is allowed; `patch` is preferred for one-line fixes.
3. **Cache-bust:** every frontend edit bumps `?v=N` on the affected `<script src="...">` and `<link rel="stylesheet">` tags in `index.html` (Firefox caches aggressively; hard refresh alone often isn't enough). Bump separately per file (e.g. `strings.js?v=6`, `app.js?v=36`).
4. **Serve locally:** background-run `python3 -m http.server 8080` (workdir `02_Website`), curl-check `:8080`. Firefox/Win is the test target.
5. **Hard-refresh the browser.** Instruct the user to Ctrl+Shift+R / Cmd+Shift+R if the new cache-busted version doesn't render.
6. **Deploy:** SiteGround updates require user approval. Ask before re-uploading to `https://worththetripapp.com/`. The live site will still show old cached assets until a hard refresh.

## Always-on preferences
- **Backups:** snapshot the working tree into `02_Website/backup/` before major edits. `git` is not available — no repo.
- **Assets:** WTT brand files live on the desktop (`C:\Users\Jakep\Desktop\Production\WTT\`). Copy needed SVGs/PNGs into `02_Website/public/Branding/` and reference from there. No SVG may exist for some logos (only PNG/AI); use the PNG at small sizes.
- **Images:** guide photos go in `public/Guide Images/<guide>/` — Cover (hero) + numbered files in page order top-to-bottom including sub-strips under their stops.
- **Input 'updated cover photo'** → patch only the cover path, keep the same filename and page-order number slot.
- **Cache-buster:** input 'updated cover photo' → patch only the cover path, keep the same filename and page slot.
- **Key decisions:** per-guide purchases use ephemeral Checkout Sessions (not catalog products). Product ID `prod_...` is unusable for Checkout Sessions — only the `price_` ID works. Restricted `rk` key cannot create Checkout Sessions (Stripe API limitation). Live Stripe is in sandbox/test mode.
- **Navigation error handling:** when geolocation fails during `watchPosition`, show a toast ('navigation failed') and keep the guide open. Do NOT call `stopGuideNav()` — that closes the split view and hides the guide.
- **Stripe actions:** ask before applying any other Stripe-side changes.

## Pitfalls
- **Cache-busting:** Firefox caches styles.css/app.js aggressively; hard-refresh (Ctrl+Shift+R) is often not enough. Bump `?v=N` on script tags after every frontend edit.
- **Patch exact-match:** `patch` fails with 'Could not find a match' when the old_string does not exactly match the file. Re-read the exact surrounding lines before patching; use `python3` heredoc for whole-file replacements when `write_file` refuses overwrite.
- **Cache-busting:** Firefox caches styles.css/app.js aggressively; hard-refresh (Ctrl+Shift+R) is often not enough. Bump `?v=N` on script tags after every frontend edit.
- **Full-file `write_file` is refused** ('Refusing to overwrite ...'). Use `patch` for one-line edits, or `write_file` only when the file has been read in this session.
- **Grep first:** the navigation error handler lives at `src/js/app.js` lines ~988–1000. Always grep the file for the symbol (`onNavError`, `stopGuideNav`, `watchPosition`) before editing navigation flow.
- **Navigation error flow:** `onNavError` must clear the GPS watch but must NOT call `stopGuideNav()` (that closes the split view and hides the guide). Show a toast ('navigation failed') and keep the split view open.
- **Stripe keys:** never write secrets to disk. No `.env` file sits on disk; the key is used in-memory for generation. Keep full `sk_test_` keys out of summaries — replace with `[REDACTED]`. Do not apply Stripe-side changes without user approval.
- **Demo mode:** the old demo-flow (hardcoded guide #1 free unlock, `state.demoMode`) was removed in an earlier session. Do not re-introduce it.

## References
- `references/workflow.md` — backend/frontend dev workflow, Stripe/Checkout-session design, and the per-guide vs unlock-all routing rules (created this session).
