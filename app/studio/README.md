# Content studio (Hub content tab, «تعديل»)

Dania (and Yazan) change a post's texts, brand colours and caption themselves, see the result live, and save.
Design and decisions: flowpal-agency `agents/tech-lead/tasks/005-content-editor.md`. Database: `ops/hub/003-content-edits.sql`.

## Files
| File | What it is |
|---|---|
| `fill.mjs` | JS port of `content/brand/templates/render.py` (`prepare()` + `{{key}}` fill + size/zoom style): `fillPage()`, `prepare()`, `esc()`. Also `applyEdit()` (dotted keys `chat.1.text`, `items.2`), `fitCheck()` (زياد's fit check: overflow, clipping, off-canvas, overlap) and `newProblems()`. Used by the preview here AND by the render worker (`ops/hub/studio_render.mjs`), so preview = final file |
| `fields.mjs` | Form rules = `hub_studio_check()` / `hub_studio_budget()`: visible length (tags not counted, `<br>` = 15), one `<em>`, `text` without `<br>`, hashtags max 30, budgets per size; Arabic option names |
| `editor.mjs` | The «تعديل» page (`#/content/e/<post slug>`), loaded by `modules/content.js` only when opened |
| `tpl/` | Copy of the public brand templates, `brand.css` and the final logo SVGs (`tpl/logo/`). Brand assets only, no drafts, no post data |

## How the page works
- `rpc('hub_studio_targets', {p_post_slug})` → one asset per row (slide, caption). Each has `manifest.fields` (key, Arabic label, type, max, options, group), `manifest.values` (the slide's full values, so the preview draws bubbles, times...), `base_values` (the editable keys only), `version`, `last_edit` (+ `history` when the RPC returns it).
- The form is generated from `manifest.fields`. Colours / backgrounds are chips from `options` only. There is never a colour picker, a font, logo or size field.
- Preview: `fillPage()` on the template from `tpl/`, in an iframe (`sandbox="allow-same-origin"`, no scripts) scaled to fit, sticky on the phone. After each change `fitCheck()` runs on the shown page; a problem the original did not have blocks the save («النص كتير طويل على هالتصميم، قصّري شوي»).
- Save: `rpc('hub_studio_save', {p_target_id, p_values, p_base_version, p_note, p_approve})` with only the changed keys. «احفظي ووافقي» (`p_approve: true`, default) / «احفظي بدون موافقة». Status: بالدور / عم يتجهز / جاهز / ما زبط. A queued edit can be cancelled (`hub_studio_cancel`).
- Locks (from the database): published, cancelled, withdrawn, or within 2 h of the post time («قرب موعد النشر، اكتبي لسلمى»).

## Add a template to the studio
1. زياد adds it to `agents/visual-designer/output/studio-manifests.json` (fields, `max_by_size`, budgets; `studio_ready: true`).
2. Copy the template HTML into `tpl/` (strip personal names from comments) and run the parity test:
   `SITE=<flowpal-site> node ops/hub/tests/studio-parity.mjs` (flowpal-agency; every sample both ways, pixel diff ≤ 0.5 %, and tpl/ = brand source).
3. If the template needs new derived keys in `render.py`'s `prepare()`, port them to `fill.mjs` in the same commit.
4. `story-highlight` is not editable (raw HTML builder): `studio_ready: false`, the page shows «جاي قريباً».

## Manifest field format
`{"key": "headline" | "chat.1.text" | "items.2", "label": "العنوان", "type": "text|longtext|caption|hashtags|color|enum|number",
  "max": 50, "required": false, "options": ["teal","signal"], "option_labels": {"teal": "أخضر"}, "max_count": 30, "group": "العنوان", "em": true}`
plus on the manifest: `template`, `size`, `values`, `budgets: [{"size","keys":["headline","chat[i].text"],"max_total"}]`, `studio_ready`.

## Try it (localhost only)
`python3 -m http.server 8765 --bind 127.0.0.1` in flowpal-site, then `http://127.0.0.1:8765/app/?mock=dania#/content/e/demo-late-night-messages`.
Mock: `app/demo/content-studio.js` (same rules as the SQL; fake render). Test: `OUT=... node ops/hub/tests/studio-fadi.mjs` (flowpal-agency).
