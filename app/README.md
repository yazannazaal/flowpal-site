# Flowpal Hub (flowpal.co/app/)

One installable app for the Flowpal team. Each person sees only the areas the database gives them.
Design and rules: `agents/tech-lead/tasks/003-flowpal-hub.md` (ADR-002) and `ops/hub/001-roles.sql` in the agency repo.

## Files
| File | What it is |
|---|---|
| `index.html`, `app.css`, `shell.js`, `lib.js` | The shell: login (Supabase Auth), `rpc('hub_me')`, tab bar, hash router, logout |
| `modules/<id>.js` | One file per area. Loaded with `import()` only when `hub_me()` returned that id and the person opened the tab |
| `sw.js`, `manifest.webmanifest`, `offline.html`, `icons/` | Installable app (PWA) |
| `modules/home.js` | الرئيسية: today's tasks (done), due today / overdue per product, today's posts, latest updates, product summary. `rpc('hub_overview')` (returns only the parts of the caller's roles), `rpc('hub_task_done')` |
| `modules/companies.js` | الشركات: list (search, product / status / sector filters, «مستبعدة» archive), company page (status + follow-up per product, notes, Omar's summary, history), add form with the duplicate flow, edit form. `hub_companies`, `hub_company`, `hub_lead_create`, `hub_lead_update`, `hub_set_status`, `hub_set_products`, `hub_add_note`, `hub_follow_up` |
| `modules/followups.js` | المتابعات اليومية: one tab per product, overdue + today (+ next 7 days); تواصلت / أجّل / تاريخ. `hub_companies`, `hub_follow_up` |
| `modules/sales.js` | التحليلات: product switcher. AI employee = Omar's KPIs (same formulas as `scripts/kpis.py`, `rpc('hub_sales_board')`) + the 8 statuses; other products = statuses + follow-ups; «مقارنة» = products side by side (`hub_companies`) |
| `modules/research.js` | Research summaries (`research_briefs`, read only; `source_path` never selected) |
| `modules/content.js` | المحتوى: approvals (`content_reviews` read; decisions only through `rpc('hub_content_decide')`) + week calendar (`rpc('hub_content_calendar', {p_from, p_to})`, read only, written by سلمى's sync) + calendar post page with the same approval buttons |
| `shared/pipeline.js` | Code shared by home / companies / followups / sales: status labels, dates in Asia/Hebron, the RPC wrapper, the follow-up sheet. No data. Loaded only by those modules; the SW caches it at runtime like a module |
| `demo/*.js` | Fake data for the local mock mode (`hub-me`, `sales-board`, `research-briefs`, `content-reviews`, `hub-sales` (all task-004 RPCs with the SQL's rules), `content-calendar`). Never loaded on flowpal.co, never cached by the SW |
| `flowpal-agency: ops/hub/tests/leakage-fadi.mjs`, `phase2-fadi.mjs`, `phase3-fadi.mjs` (kept out of the public site) | Playwright checks on the mock: tabs, DOM, module requests, SW cache, logout; phase 2: sales/research/content sub-pages, KPI arithmetic, decision flow, `/subscribers/` redirect; phase 3: every new page at 375 px + desktop, banned money / tech words, duplicate flow, follow-ups, statuses, calendar, Asmaa = 42501 |

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
http://127.0.0.1:8765/app/?mock=dania      # sales + content: home, companies, followups, sales, content, research
http://127.0.0.1:8765/app/?mock=yazan      # admin: every module
http://127.0.0.1:8765/app/?mock=stranger   # logged in but not in app_users
node ../flowpal-agency/ops/hub/tests/leakage-fadi.mjs                 # needs the server above; screenshots to $OUT (default /tmp/hub-shots/)
```
Mock data is fake and nothing is saved. A module without a file (today: `finance`) shows «قيد البناء».
`/subscribers/` is now a redirect to `/app/#/subscribers` (keeps the query and `#/s/<id>`).

## Add a module
1. Add a row to `app_modules` (id, label, icon, sort, roles). Icon names the shell knows: users, wrench, chart, book, image, wallet, home, building, calendar-check.
   On a phone the bar shows the first 5 tabs; the rest go under «المزيد».
2. Add `modules/<id>.js` exporting `async function mount(ctx)`.
   `ctx`: `el` (where to render), `path` (the part of the hash after `#/<id>/`), `base` (`#/<id>`), `sb` (Supabase client,
   null in demo), `demo`, `me` ({email, name, is_admin}), `hasModule(id)`, `isCurrent()`.
3. Protect its data in the database (RLS policy or a function that checks `hub_can('<id>')`). Hiding a tab is not protection.

## Add a person
Tech team, with the service key: a row in `app_users` + an Auth user, then bind `auth_uid` (steps at the end of `001-roles.sql`).

## Sales workspace rules (task 004)
- Add a product: one row in `products` (id, label, short, sort). It shows in every tab, filter and the comparison; no code change.
- Dania's status per company x product lives in `sales_pipeline`. Omar's `outreach.stage` is never written from the app;
  for the AI employee the status is derived from his stage until she sets one (precedence: `hub_effective_status`).
  «عميل» set from the app shows «بانتظار تأكيد يزن» until Yazan confirms (`db.py set-won`).
- Every write is queued in `hub_lead_events` for Omar. Duplicates: Instagram / Facebook / website / phone+name = refused and
  the existing company opens; phone only or name only = «نفس الشركة؟», added only with `force`.
