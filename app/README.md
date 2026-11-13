# Flowpal Hub (flowpal.co/app/)

One installable app for the Flowpal team. Each person sees only the areas the database gives them.
Design and rules: `agents/tech-lead/tasks/003-flowpal-hub.md` (ADR-002) and `ops/hub/001-roles.sql` in the agency repo.

## Files
| File | What it is |
|---|---|
| `index.html`, `app.css`, `shell.js`, `lib.js` | The shell: login (Supabase Auth), `rpc('hub_me')`, tab bar, hash router, logout |
| `modules/<id>.js` | One file per area. Loaded with `import()` only when `hub_me()` returned that id and the person opened the tab |
| `sw.js`, `manifest.webmanifest`, `offline.html`, `icons/` | Installable app (PWA) |
| `demo/hub-me.js` | Fake `hub_me()` for the local mock mode. Never loaded on flowpal.co |
| `flowpal-agency: ops/hub/tests/leakage-fadi.mjs` (kept out of the public site) | Playwright leakage check on the mock (tabs, DOM, module requests, SW cache, logout) |

## Rules
- The shell has no list of modules and no labels. Tabs come from `hub_me()` only.
- The only key in the code is the Supabase publishable (anon) key. Never a service_role key.
- The service worker caches the shell only. It never caches Supabase answers and never precaches modules.
  Logout deletes every `hub-*` cache, the Supabase session and the app's storage, then reloads the page.
- The app is for internal work data only. Financial data does not belong in any module that a non-admin role can open.

## Try it without a login (localhost only)
Mock mode works only on `localhost` / `127.0.0.1`; on flowpal.co `?mock` and `?demo` are ignored and the real login shows.
```
cd flowpal-site && python3 -m http.server 8765 --bind 127.0.0.1
http://127.0.0.1:8765/app/?mock=asmaa      # tech: subscribers + tech-requests
http://127.0.0.1:8765/app/?mock=dania      # sales + content: sales, research, content
http://127.0.0.1:8765/app/?mock=yazan      # admin: every module
http://127.0.0.1:8765/app/?mock=stranger   # logged in but not in app_users
node ../flowpal-agency/ops/hub/tests/leakage-fadi.mjs                 # needs the server above; screenshots to $OUT (default /tmp/hub-shots/)
```
Mock data is fake and nothing is saved. Modules not built yet show «قيد البناء» (their file 404s).

## Add a module
1. Add a row to `app_modules` (id, label, icon, sort, roles). Icon names the shell knows: users, wrench, chart, book, image, wallet.
2. Add `modules/<id>.js` exporting `async function mount(ctx)`.
   `ctx`: `el` (where to render), `path` (the part of the hash after `#/<id>/`), `base` (`#/<id>`), `sb` (Supabase client,
   null in demo), `demo`, `me` ({email, name, is_admin}), `hasModule(id)`, `isCurrent()`.
3. Protect its data in the database (RLS policy or a function that checks `hub_can('<id>')`). Hiding a tab is not protection.

## Add a person
Tech team, with the service key: a row in `app_users` + an Auth user, then bind `auth_uid` (steps at the end of `001-roles.sql`).
