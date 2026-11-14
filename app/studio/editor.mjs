// Flowpal content studio: the «تعديل» page of the content tab (#/content/e/<post slug>). Task 005.
// Loaded by modules/content.js only when someone opens that page. Each editable asset of the post (a slide, the
// caption) gets a form built from its manifest (Arabic labels, character counters, brand colour / background chips
// from the manifest's options only) and a live preview: the same brand template and the same fill code
// (studio/fill.mjs) that make the final file, in a scaled iframe that runs no script. After each change the preview
// runs the design fit check (fill.mjs fitCheck): a text that no longer fits the design blocks the save.
// Field keys follow the sync: "headline", "chat.1.text" (bubble 1), "items.2"; manifest.values = the slide's full
// values (bubbles, times...) the preview needs; base_values = the editable keys only.
// Data: rpc hub_studio_targets / hub_studio_save / hub_studio_cancel (database functions).
// The database checks every value again; this page never sends a key that is not in the manifest.
import { $, esc, safeUrl, fmtDT, toast, useStyle, ok, errText, who } from "../lib.js";
import { checkField, checkBudgets, maxOf, len, lenOf, optionLabel, optionSwatch } from "./fields.mjs";

const TPL_BASE = new URL("./tpl/", import.meta.url).href;
const EDIT_ST = {
  queued: { t: "بالدور", c: "wait", d: "التعديل محفوظ وبالدور ليتجهز الملف الجديد." },
  rendering: { t: "عم يتجهز", c: "prog", d: "عم نجهّز الملف الجديد، بياخد كم دقيقة." },
  done: { t: "جاهز", c: "ok", d: "الملف الجديد جاهز وصار بالمنشور." },
  failed: { t: "ما زبط", c: "bad", d: "ما زبط تجهيز الملف. سلمى رح تشوفه، والملف القديم ضل زي ما هو." },
  superseded: { t: "استبدلتيه بتعديل أحدث", c: "off" },
  cancelled: { t: "انلغى", c: "off" },
};
const LOCK = {
  "منشور": "هذا المنشور انتشر، ما بينفع يتعدّل.",
  "ملغي": "هذا المنشور انلغى، ما بينفع يتعدّل.",
  "مسحوب": "هذا المنشور انسحب، ما بينفع يتعدّل.",
  "قرب موعد النشر": "قرب موعد النشر، اكتبي لسلمى.",
};
// the name comes from the answer (…_name) or from hub_me().people, never from the code
export const editedBy = (id, name) => (id || name ? `تعديل من ${name || who(id)}` : "");

const STUDIO_CSS = `
.sd-head{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin:-6px 0 14px;font-size:13px;color:var(--muted)}
.sd-lock{background:#FBF1DC;color:#5E4204;border-radius:var(--radius);padding:12px 14px;font-weight:600;margin-bottom:14px}
.sd-assets{display:flex;gap:8px;overflow-x:auto;margin:0 calc(var(--gutter) * -1) 14px;padding:2px var(--gutter) 6px;scrollbar-width:thin}
.sd-asset{flex:0 0 auto;display:grid;grid-template-columns:40px auto;align-items:center;gap:8px;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:6px 12px 6px 6px;cursor:pointer;text-align:start;min-height:52px}
.sd-asset[aria-pressed="true"]{border-color:var(--ink);box-shadow:inset 0 -3px 0 var(--teal)}
.sd-asset .th{width:40px;height:40px;border-radius:6px;background:var(--soft);overflow:hidden;display:grid;place-items:center;font:600 15px var(--f-head);color:var(--muted)}
.sd-asset .th img{width:100%;height:100%;object-fit:cover;display:block}
.sd-asset b{display:block;font-size:13.5px;font-weight:600;white-space:nowrap}
.sd-asset small{display:block;font-size:11.5px;color:var(--muted);white-space:nowrap}
.sd-asset .dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--teal);margin-inline-start:5px;vertical-align:middle}
.sd-wrap{display:grid;gap:14px}
.sd-stage{background:var(--ink);border-radius:14px;padding:12px;color:var(--on-ink);position:sticky;top:64px;z-index:2;align-self:start;min-width:0}
.sd-stage .bar{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;color:var(--on-ink-2);margin-bottom:8px}
.sd-stage .bar b{color:#fff;font-weight:600;font-size:13px}
.sd-stage .live{display:inline-flex;align-items:center;gap:6px}
.sd-stage .live i{width:7px;height:7px;border-radius:50%;background:var(--teal)}
.sd-stage.busy .live i{background:#F3D27A}
.sd-zoom{background:transparent;border:1px solid var(--ink-3);color:var(--on-ink);border-radius:7px;padding:4px 10px;font-size:12.5px;cursor:pointer}
.sd-zoom:hover{border-color:var(--teal)}
.sd-view{position:relative;margin:0 auto;overflow:hidden;border-radius:6px;background:var(--ink-2)}
.sd-view iframe{position:absolute;top:0;left:0;border:0;transform-origin:0 0;background:#fff;pointer-events:none}
.sd-view iframe.back{visibility:hidden}
.sd-cap{background:#fff;color:#111;border-radius:8px;padding:12px 14px;font:14px/1.6 var(--f-body);max-height:46vh;overflow:auto}
.sd-cap .who{font-weight:700;margin-inline-end:6px}
.sd-cap p{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}
.sd-cap .tags{color:#00376B;margin-top:6px;overflow-wrap:anywhere}
.sd-cap img{display:block;width:100%;max-height:180px;object-fit:cover;border-radius:6px;margin-bottom:10px}
.sd-form{display:grid;gap:12px;min-width:0}
.sd-group{margin:0;min-width:0}
.sd-group > h2{margin-bottom:2px}
.sd-f{margin-top:10px}
.sd-f .lab{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
.sd-f label{font-size:13.5px;font-weight:600;color:var(--ink)}
.sd-cnt{font-size:12px;color:var(--muted);direction:ltr;unicode-bidi:isolate}
.sd-cnt.over{color:var(--h-red);font-weight:700}
.sd-f input.i,.sd-f textarea.i{margin-top:4px}
.sd-f textarea.i{min-height:72px}
.sd-f textarea.cap{min-height:180px}
.sd-f.bad input.i,.sd-f.bad textarea.i{border-color:var(--h-red)}
.sd-tools{display:flex;flex-wrap:wrap;align-items:center;gap:4px 12px;margin-top:4px;font-size:12.5px}
.sd-tools button{background:none;border:0;padding:2px 0;color:var(--teal-ink);cursor:pointer;font-size:12.5px;text-decoration:underline;text-underline-offset:3px}
.sd-tools .msg{color:var(--h-red)}
.sd-tools .hint{color:var(--muted)}
.sd-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.sd-chip{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line);background:var(--card);border-radius:999px;padding:6px 12px 6px 10px;font-size:13.5px;cursor:pointer}
.sd-chip i{width:16px;height:16px;border-radius:50%;border:1px solid rgba(0,0,0,.15);flex:none}
.sd-chip[aria-checked="true"]{border-color:var(--ink);background:var(--ink);color:#fff}
.sd-chip[aria-checked="true"] i{border-color:#fff}
.sd-chip:disabled{cursor:default;opacity:.7}
.sd-save{display:grid;gap:8px}
.sd-save .btns{display:grid;grid-template-columns:1fr;gap:8px}
.sd-save .btn,.sd-save .btn-line{width:100%;padding:12px 10px;font-size:15px}
.sd-save .why{font-size:12.5px;color:var(--muted);margin:0}
.sd-note summary{cursor:pointer;font-size:13.5px;color:var(--teal-ink)}
.sd-st{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;border-radius:10px;padding:10px 12px;font-size:13.5px;background:var(--soft)}
.sd-st .tag{font-weight:700;font-size:12px;padding:3px 8px;border-radius:6px;background:#fff}
.sd-st.wait .tag{color:#7A5605} .sd-st.prog .tag{color:#33408F} .sd-st.ok{background:#E2F4EA} .sd-st.ok .tag{color:#145C33}
.sd-st.bad{background:#FDECEA} .sd-st.bad .tag{color:#9B2C27}
.sd-st p{margin:0;flex:1 1 200px}
.sd-st button{font-size:12.5px;padding:4px 10px}
.sd-hist{list-style:none;margin:0;padding:0}
.sd-hist li{border-top:1px solid var(--soft);padding:9px 0;font-size:13.5px}
.sd-hist li:first-child{border-top:0}
.sd-hist .top{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center;color:var(--muted);font-size:12.5px}
.sd-hist .top b{color:var(--ink);font-size:13.5px}
.sd-hist .ch{margin:4px 0 0;overflow-wrap:anywhere}
.sd-hist .ch span{color:var(--muted)}
.sd-big{padding:0;width:min(560px,calc(100vw - 24px));background:var(--ink)}
.sd-big .in{padding:12px}
.sd-big .bar{display:flex;justify-content:space-between;align-items:center;color:#fff;margin-bottom:8px;font-size:14px}
.sd-swarn{margin:8px 0 0;background:#FDECEA;color:#7E241F;border-radius:6px;padding:6px 10px;font-size:13px;font-weight:600;text-align:center}
.sd-stage.over .live i{background:var(--h-red)}
.sd-fit{background:#FDECEA;color:#7E241F;border-radius:8px;padding:10px 12px;font-weight:600;font-size:14px}
.sd-dirty{font-size:12px;color:#7A5605;background:#FBF1DC;border-radius:6px;padding:2px 7px}
@media (max-width:899px){
  .sd-form :is(.i,button,.sd-f,.sd-st){scroll-margin-top:calc(32vh + 130px);scroll-margin-bottom:calc(var(--tabbar) + 16px)}   /* never under the sticky preview */
  .sd-stage{top:60px;padding:8px 10px 10px;margin-inline:calc(var(--gutter) * -1);border-radius:0}
}
@media (min-width:900px){
  .sd-form :is(.i,button,.sd-f,.sd-st){scroll-margin-top:90px}
  .sd-wrap{grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);align-items:start}
  .sd-stage{top:76px}
  .sd-assets{margin:0 0 14px;padding:2px 0 6px}
  .sd-save .btns{grid-template-columns:1fr 1fr}
}`;

function store(ctx) {
  if (ctx.demo) {
    const m = () => import("../demo/content-studio.js");
    return {
      async targets(slug) { return (await m()).mockStudioTargets(slug); },
      async save(id, values, ver, note, approve) { return (await m()).mockStudioSave(id, values, ver, note, approve); },
      async cancel(id) { return (await m()).mockStudioCancel(id); },
    };
  }
  return {
    async targets(slug) { return ok(await ctx.sb.rpc("hub_studio_targets", { p_post_slug: slug })); },
    async save(id, values, ver, note, approve) {
      return ok(await ctx.sb.rpc("hub_studio_save", { p_target_id: id, p_values: values, p_base_version: ver, p_note: note || null, p_approve: approve }));
    },
    async cancel(id) { ok(await ctx.sb.rpc("hub_studio_cancel", { p_edit_id: id })); },
  };
}

// the database's Arabic messages name the tags; she sees what they do instead
const untag = (m) => String(m)
  .replace("مسموح تمييز واحد بس (<em>)", "مسموح كلمة ملوّنة وحدة بس")
  .replace("مسموح بس <em> و <b> و <br>", "مسموح بس كلمة ملوّنة أو عريضة أو سطر جديد، بدون رموز < >")
  .replace("مسموح بس <em> و <b>", "مسموح بس كلمة ملوّنة أو عريضة، بدون سطر جديد ولا رموز < >")
  .replace("ممنوع وسوم بهالنص", "ممنوع الرموز < > بهالنص");
function saveErr(err) {
  const m = String((err && err.message) || ""), code = err && err.code;
  if (code === "40001" || /^changed/.test(m)) return { t: "سلمى غيّرت المنشور، افتحيه من جديد.", reload: true };
  if (code === "55000" || /^locked/.test(m)) { const k = m.replace(/^locked:\s*/, ""); return { t: LOCK[k] || "المنشور مقفول للتعديل هلأ.", reload: true }; }
  if (/no change/.test(m)) return { t: "ما غيّرتِ شي لسا." };
  if (/field not editable/.test(m)) return { t: "في خانة مش مسموح تتعدّل. افتحي الصفحة من جديد.", reload: true };
  if (/note too long/.test(m)) return { t: "الملاحظة أطول من 500 حرف." };
  if (code === "P0002") return { t: "هالجزء من المنشور مش موجود أو تغيّر. افتحي الصفحة من جديد.", reload: true };
  if (code === "22023" && /[؀-ۿ]/.test(m)) return { t: untag(m) };   // the database's own Arabic message ("العنوان: النص أطول من 60 حرف")
  return { t: errText(err) };
}

// starting values of a target: the repo's values + the open / finished edit of the same version (an edit builds on it)
const startValues = (t) => {
  const e = t.last_edit;
  const carry = e && e.base_version === t.version && ["queued", "rendering", "done"].includes(e.status) ? e.values : {};
  return { ...(t.base_values || {}), ...(carry || {}) };
};
const fieldsOf = (t) => (t.manifest && Array.isArray(t.manifest.fields) ? t.manifest.fields : []);
// story-highlight is built with raw HTML by its own builder: not editable here (studio_ready false)
const imageOk = (t) => t && t.kind === "image" && t.manifest && t.manifest.studio_ready !== false && t.manifest.template !== "story-highlight";
const plain = (s) => String(s ?? "").replace(/<br\s*\/?>/gi, " ").replace(/<\/?(em|b)>/gi, "");
const short = (s, n = 60) => { const x = plain(s); return len(x) > n ? [...x].slice(0, n).join("") + "…" : x; };

export async function mountEditor(ctx, el, slug, opts = {}) {
  useStyle("studio", STUDIO_CSS);
  const st = store(ctx);
  const back = opts.backHref || ctx.base;
  el.innerHTML = `<p class="muted">جارِ التحميل…</p>`;
  let data;
  try { data = await st.targets(slug); } catch (err) {
    if (!ctx.isCurrent()) return;
    el.innerHTML = `<a class="back" href="${esc(back)}">→ رجوع للمنشور</a><div class="empty">ما قدرنا نفتح التعديل: ${esc(errText(err))}</div>`;
    return;
  }
  if (!ctx.isCurrent()) return;

  const state = { sel: 0, drafts: new Map(), busy: false, poll: null, fit: { id: null, pending: false, bad: [] }, fitBase: new Map() };
  const targets = () => (data && Array.isArray(data.targets) ? data.targets : []);
  const cur = () => targets()[state.sel] || null;
  const draftOf = (t) => {
    if (!state.drafts.has(t.id)) state.drafts.set(t.id, { start: startValues(t), vals: startValues(t), ver: t.version });
    return state.drafts.get(t.id);
  };
  const changed = (t) => {
    const d = draftOf(t), out = {};
    for (const f of fieldsOf(t)) if (JSON.stringify(d.vals[f.key] ?? null) !== JSON.stringify(d.start[f.key] ?? null)) out[f.key] = d.vals[f.key];
    return out;
  };
  const locked = () => data.locked || null;

  /* ---------- html ---------- */
  const assetsHTML = () => `<div class="sd-assets" role="group" aria-label="أجزاء المنشور">${targets().map((t, i) => {
    const thumb = t.kind === "caption" ? "Aa" : (() => { const u = ctx.demo && /^data:image\/svg\+xml/.test(String(t.media_url || "")) ? t.media_url : safeUrl(t.media_url); return u ? `<img src="${esc(u)}" alt="" referrerpolicy="no-referrer">` : "▢"; })();
    const e = t.last_edit, s = e && EDIT_ST[e.status];
    const sub = Object.keys(changed(t)).length ? "فيه تغيير مش محفوظ" : s && ["queued", "rendering", "failed"].includes(e.status) ? s.t : t.kind === "caption" ? "نص" : "صورة";
    return `<button type="button" class="sd-asset" data-i="${i}" aria-pressed="${i === state.sel}"><span class="th">${thumb}</span><span><b>${esc(t.label)}${Object.keys(changed(t)).length ? '<span class="dot" aria-hidden="true"></span>' : ""}</b><small>${esc(sub)}</small></span></button>`;
  }).join("")}</div>`;

  const fieldHTML = (t, f) => {
    const d = draftOf(t), v = d.vals[f.key], dis = locked() ? "disabled" : "";
    const id = "sdF_" + f.key.replace(/[^a-z0-9_]/gi, "");
    if (f.type === "color" || f.type === "enum") {
      return `<div class="sd-f" data-key="${esc(f.key)}"><div class="lab"><label id="${id}L">${esc(f.label || f.key)}</label></div>
        <div class="sd-chips" role="radiogroup" aria-labelledby="${id}L">${(f.options || []).map((o) => {
          const sw = optionSwatch(f, o);
          return `<button type="button" class="sd-chip" role="radio" data-key="${esc(f.key)}" data-opt="${esc(o)}" aria-checked="${v === o}" ${dis}>${sw ? `<i style="background:${esc(sw)}"></i>` : ""}${esc(optionLabel(f, o))}</button>`;
        }).join("")}</div></div>`;
    }
    if (f.type === "number") {
      return `<div class="sd-f" data-key="${esc(f.key)}"><div class="lab"><label for="${id}">${esc(f.label || f.key)}</label></div>
        <input class="i ltr" id="${id}" type="number" inputmode="decimal" data-key="${esc(f.key)}" ${f.min != null ? `min="${esc(f.min)}"` : ""} ${f.max != null ? `max="${esc(f.max)}"` : ""} value="${esc(v ?? "")}" ${dis}>
        <div class="sd-tools"><span class="msg" data-msg="${esc(f.key)}"></span></div></div>`;
    }
    const long = ["longtext", "caption", "hashtags"].includes(f.type);
    const mx = maxOf(f), n = lenOf(f, v ?? "");
    // the «colour the selected words» helper only where the design uses a highlight (<em>) or the manifest asks for it
    const tags = ["text", "longtext"].includes(f.type) && (f.em === true || /<em>/i.test(String(d.start[f.key] ?? "")));
    return `<div class="sd-f ${n > mx ? "bad" : ""}" data-key="${esc(f.key)}"><div class="lab"><label for="${id}">${esc(f.label || f.key)}</label><span class="sd-cnt ${n > mx ? "over" : ""}" data-cnt="${esc(f.key)}" aria-live="polite">${n}/${mx}</span></div>
      ${long ? `<textarea class="i ${f.type === "caption" ? "cap" : ""}" id="${id}" data-key="${esc(f.key)}" ${f.type === "hashtags" ? 'dir="auto"' : ""} ${dis}></textarea>`
        : `<input class="i" id="${id}" type="text" data-key="${esc(f.key)}" autocomplete="off" ${dis}>`}
      <div class="sd-tools">${tags && !locked() ? `<button type="button" data-em="${esc(f.key)}">لوّني الكلام المحدّد</button>` : ""}${f.type === "longtext" && !locked() ? `<button type="button" data-br="${esc(f.key)}">سطر جديد</button>` : ""}
        <button type="button" data-reset="${esc(f.key)}" class="${JSON.stringify(v ?? null) === JSON.stringify(d.start[f.key] ?? null) ? "hidden" : ""}">رجّعي النص الأصلي</button>
        <span class="msg" data-msg="${esc(f.key)}"></span></div></div>`;
  };

  const formHTML = (t) => {
    const groups = [];
    for (const f of fieldsOf(t)) { const g = f.group || "التعديلات"; let x = groups.find((y) => y.g === g); if (!x) groups.push(x = { g, fs: [] }); x.fs.push(f); }
    if (!groups.length) return `<div class="empty">ما في شي بينفع يتعدّل بهالجزء.</div>`;
    return groups.map((x, gi) => `<section class="sd-group panel" role="group" aria-labelledby="sdG${gi}"><h2 id="sdG${gi}">${esc(x.g)}</h2>${x.fs.map((f) => fieldHTML(t, f)).join("")}
      ${x.fs.some((f) => ["text", "longtext"].includes(f.type) && (f.em === true || /<em>/i.test(String(draftOf(t).start[f.key] ?? "")))) ? `<p class="small muted" style="margin:10px 0 0">لتلوين كلمة: حدّديها واضغطي «لوّني الكلام المحدّد». لسطر جديد: «سطر جديد». العلامات اللي بتطلع بالنص حواليها هي اللي بتعمل اللون والسطر، خلّيها زي ما هي.</p>` : ""}</section>`).join("");
  };

  const statusHTML = (t) => {
    const e = t.last_edit;
    if (!e || !EDIT_ST[e.status] || ["superseded", "cancelled"].includes(e.status)) return "";
    if (e.status === "done" && e.finished_at && Date.now() - new Date(e.finished_at).getTime() > 6 * 36e5) return "";
    const s = EDIT_ST[e.status];
    const mine = e.status === "queued" && !locked();
    return `<div class="sd-st ${s.c}" id="sdSt" role="status"><span class="tag">${esc(s.t)}</span><p>${esc(s.d || "")}${e.status === "done" && e.approve_on_done ? " واعتبرناه موافقة منك." : ""}</p>${mine ? `<button class="btn-line" type="button" id="sdCancel" data-edit="${Number(e.id)}">إلغاء التعديل</button>` : ""}</div>`;
  };

  const histHTML = (t) => {
    const list = (Array.isArray(t.history) ? t.history : t.last_edit ? [t.last_edit] : []).filter(Boolean);
    if (!list.length) return `<section class="panel"><h2>التعديلات السابقة</h2><p class="muted small" style="margin:0">ما في تعديلات على هالجزء لسا.</p></section>`;
    const labelOf = (k) => (fieldsOf(t).find((f) => f.key === k) || {}).label || k;
    return `<section class="panel"><h2>التعديلات السابقة</h2><ul class="sd-hist">${list.slice(0, 12).map((e) => {
      const s = EDIT_ST[e.status] || { t: e.status };
      const vals = e.values && typeof e.values === "object" ? e.values : {};
      return `<li><div class="top"><b>تعديل ${Number(e.edit_no) || ""}</b><span>${esc(editedBy(e.created_by, e.created_by_name))}</span><span>${esc(fmtDT(e.created_at))}</span><span class="chip">${esc(s.t)}</span></div>
        ${Object.keys(vals).map((k) => {
          const f = fieldsOf(t).find((x) => x.key === k);
          const shown = f && (f.type === "color" || f.type === "enum") ? optionLabel(f, vals[k]) : short(vals[k]);
          return `<p class="ch"><span>${esc(labelOf(k))}:</span> ${esc(shown)}</p>`;
        }).join("")}${e.note ? `<p class="ch"><span>ملاحظة:</span> ${esc(e.note)}</p>` : ""}</li>`;
    }).join("")}</ul></section>`;
  };

  const saveHTML = () => locked() ? "" : `<section class="panel sd-save">
      <details class="sd-note"><summary>ملاحظة لسلمى (اختياري)</summary><label class="sr" for="sdNote">ملاحظة لسلمى</label><textarea class="i" id="sdNote" maxlength="500" placeholder="مثلاً: قصّرت العنوان لأنه طويل"></textarea></details>
      <div class="btns"><button class="btn" type="button" id="sdSaveOk" disabled>احفظي ووافقي</button><button class="btn-line" type="button" id="sdSave" disabled>احفظي بدون موافقة</button></div>
      <p class="why" id="sdWhy">${cur() && cur().kind === "caption" ? "الكابشن بيتغيّر فوراً. مع «احفظي ووافقي» المنشور بيصير موافَق عليه." : "بعد ما يجهز الملف الجديد (كم دقيقة)، «احفظي ووافقي» بتعتبره موافقة منك."}</p>
      <div class="sd-fit hidden" id="sdFit" role="alert"></div>
      <div class="err" id="sdErr" role="alert"></div></section>`;

  const stageHTML = (t) => {
    if (t.kind === "caption") return `<div class="sd-stage" id="sdStage"><div class="bar"><span class="live"><i></i><b>المعاينة</b></span><span>زي ما بيطلع تحت الصورة</span></div><div class="sd-cap" id="sdCapView"></div></div>`;
    if (!imageOk(t)) return `<div class="sd-stage"><div class="bar"><b>المعاينة</b></div><p style="margin:8px 0">تعديل هالنوع جاي قريباً. لهلأ اكتبي لسلمى.</p></div>`;
    const sz = String((t.manifest && t.manifest.size) || "");
    return `<div class="sd-stage" id="sdStage"><div class="bar"><span class="live"><i></i><b>المعاينة</b><bdi dir="ltr" class="sd-size">${esc(sz.replace("x", " × "))}</bdi></span>
      <button type="button" class="sd-zoom" id="sdZoom">تكبير</button></div><div class="sd-view" id="sdView"></div>
      <p class="sd-swarn hidden" id="sdFitStage">النص كتير طويل على هالتصميم، قصّري شوي</p></div>`;
  };

  function draw() {
    const t = cur();
    const r = opts.review || null;
    el.innerHTML = `<a class="back" href="${esc(back)}">→ رجوع للمنشور</a>
      <div class="page-head"><h1>تعديل: ${esc(opts.title || slug)}</h1></div>
      <div class="sd-head">${r && r.edited_by ? `<span class="ct-st edit">${esc(editedBy(r.edited_by, r.edited_by_name))}</span>` : ""}<span>غيّري النص أو اللون، وشوفي النتيجة قبل ما تحفظي.</span></div>
      ${locked() ? `<div class="sd-lock" role="status">${esc(LOCK[locked()] || "المنشور مقفول للتعديل هلأ.")}</div>` : ""}
      ${targets().length ? assetsHTML() : ""}
      ${t ? `<div class="sd-wrap">${stageHTML(t)}
        <div class="sd-form">${statusHTML(t)}${t.kind === "caption" || imageOk(t) ? `<form id="sdForm" novalidate>${formHTML(t)}</form>${saveHTML()}` : ""}${histHTML(t)}</div></div>`
        : `<div class="empty">ما في أجزاء جاهزة للتعديل بهالمنشور لسا. سلمى بتجهّزها مع المنشور.</div>`}`;
    if (!t) return;
    // values go in through DOM properties, never as HTML
    for (const f of fieldsOf(t)) {
      const inp = el.querySelector(`[data-key="${CSS.escape(f.key)}"].i`);
      if (inp) inp.value = draftOf(t).vals[f.key] ?? "";
    }
    validateAll();
    preview();
  }

  /* ---------- validation + buttons ---------- */
  function validateAll() {
    const t = cur(); if (!t) return true;
    const d = draftOf(t); let good = true;
    for (const f of fieldsOf(t)) {
      const m = checkField(f, d.vals[f.key] ?? (["text", "longtext", "caption", "hashtags"].includes(f.type) ? "" : null));
      const box = el.querySelector(`.sd-f[data-key="${CSS.escape(f.key)}"]`);
      const msg = el.querySelector(`[data-msg="${CSS.escape(f.key)}"]`);
      const isChanged = f.key in changed(t);
      if (box) box.classList.toggle("bad", !!m && isChanged);
      if (msg) msg.textContent = m && isChanged ? m : "";
      if (m && isChanged) good = false;
      const cnt = el.querySelector(`[data-cnt="${CSS.escape(f.key)}"]`);
      if (cnt) { const n = lenOf(f, d.vals[f.key] ?? ""), mx = maxOf(f); cnt.textContent = `${n}/${mx}`; cnt.classList.toggle("over", n > mx); }
      const rs = el.querySelector(`[data-reset="${CSS.escape(f.key)}"]`);
      if (rs) rs.classList.toggle("hidden", !isChanged);
    }
    const any = Object.keys(changed(t)).length > 0;
    // budgets (several texts together) and the fit of the real design (preview check) block the save too
    const budget = good && any ? checkBudgets(t.manifest, t.base_values, { ...(t.base_values || {}), ...d.vals }) : null;
    const fitBad = imageOk(t) && any && (state.fit.id !== t.id || state.fit.pending || state.fit.bad.length > 0);
    const warn = $("#sdFit", el);
    if (warn) {
      const show = budget || (imageOk(t) && any && state.fit.id === t.id && !state.fit.pending && state.fit.bad.length ? "النص كتير طويل على هالتصميم، قصّري شوي" : "");
      warn.textContent = show || ""; warn.classList.toggle("hidden", !show);
      const sw = $("#sdFitStage", el); if (sw) sw.classList.toggle("hidden", !show);
      const st = $("#sdStage", el); if (st) st.classList.toggle("over", !!show);
    }
    if (budget) good = false;
    for (const id of ["sdSaveOk", "sdSave"]) { const b = $("#" + id, el); if (b) b.disabled = state.busy || !any || !good || fitBad; }
    return good && !fitBad;
  }

  /* ---------- live preview ---------- */
  const ro = new ResizeObserver(() => fit());
  ro.observe(el);
  let fillMod = null; const tplCache = new Map(); let pvTimer = null, pvSeq = 0, lastUrl = null;
  async function tplSrc(name) {
    if (!/^[a-z0-9-]+$/.test(name)) throw new Error("bad template");
    if (!tplCache.has(name)) tplCache.set(name, fetch(TPL_BASE + name + ".html").then((r) => { if (!r.ok) throw new Error("template"); return r.text(); }));
    return tplCache.get(name);
  }
  function fit() {
    if (!ctx.isCurrent()) { ro.disconnect(); return; }
    const view = $("#sdView", el), t = cur(); if (!view || !t) return;
    const [w, h] = String(t.manifest.size || "1080x1350").split("x").map(Number);
    const stage = $("#sdStage", el);
    const pcs = getComputedStyle(view.parentElement);
    const avail = view.parentElement.clientWidth - parseFloat(pcs.paddingLeft) - parseFloat(pcs.paddingRight);
    const maxH = window.matchMedia("(min-width:900px)").matches ? window.innerHeight - 170 : window.innerHeight * 0.32;
    const s = Math.min(avail / w, maxH / h);
    view.style.width = Math.floor(w * s) + "px"; view.style.height = Math.floor(h * s) + "px";
    for (const f of view.querySelectorAll("iframe")) { f.style.width = w + "px"; f.style.height = h + "px"; f.style.transform = `scale(${s})`; }
    if (stage) stage.dataset.scale = s.toFixed(4);
  }
  function capView() {
    const box = $("#sdCapView", el), t = cur(); if (!box || !t) return;
    const v = draftOf(t).vals;
    const r = opts.review; const m = r && Array.isArray(r.media) ? r.media.find((x) => x && x.type !== "video") : null;
    const u = m ? (ctx.demo && /^data:image\/svg\+xml/.test(String(m.url)) ? m.url : safeUrl(m.url)) : null;
    box.innerHTML = `${u ? `<img src="${esc(u)}" alt="" referrerpolicy="no-referrer">` : ""}<p><span class="who">flowpal.co</span><span id="sdCapText"></span></p>${v.hashtags ? `<p class="tags" id="sdCapTags"></p>` : ""}`;
    $("#sdCapText", box).textContent = v.caption ?? "";
    if ($("#sdCapTags", box)) $("#sdCapTags", box).textContent = v.hashtags;
  }
  // measure only with the brand fonts in place (fonts.ready alone resolves before a hidden page asks for them)
  async function fontsSettled(doc) {
    const until = Date.now() + 5000;
    await new Promise((r) => setTimeout(r, 60));
    // the page is still hidden behind the current preview, so the browser has not asked for its fonts: ask now
    const faces = []; doc.fonts.forEach((x) => { if (/Plex Sans/.test(x.family)) faces.push(x.load().catch(() => null)); });
    await Promise.race([Promise.all(faces), new Promise((r) => setTimeout(r, 4000))]);
    while (Date.now() < until) {
      await doc.fonts.ready;
      const want = []; doc.fonts.forEach((x) => { if (/Plex Sans Arabic/.test(x.family)) want.push(x); });
      if (want.some((x) => x.status === "loaded") && !want.some((x) => x.status === "loading")) break;
      await new Promise((r) => setTimeout(r, 120));
    }
    await new Promise((r) => setTimeout(r, 80));
  }
  // the full slide values (bubbles, times, counters) + the form's keys; dotted keys reach into lists like the worker
  function previewValues(t) {
    const vals = draftOf(t).vals, full = t.manifest && t.manifest.values;
    if (full && typeof full === "object") { try { return fillMod.applyEdit(full, vals); } catch { /* a key without its list item */ } }
    return { ...(t.base_values || {}), ...vals };
  }
  function preview() {
    const t = cur(); if (!t) return;
    if (t.kind === "caption") { capView(); return; }
    if (!imageOk(t)) return;
    clearTimeout(pvTimer);
    pvTimer = setTimeout(async () => {
      const seq = ++pvSeq, view = $("#sdView", el), stage = $("#sdStage", el); if (!view) return;
      stage.classList.add("busy");
      try {
        fillMod = fillMod || await import("./fill.mjs");
        const src = await tplSrc(t.manifest.template);
        const page = fillMod.fillPage(src, { template: t.manifest.template, size: t.manifest.size, values: previewValues(t) }, { baseHref: TPL_BASE });
        state.fit = { id: t.id, pending: true, bad: [] }; validateAll();
        if (seq !== pvSeq || !ctx.isCurrent()) return;
        const url = URL.createObjectURL(new Blob([page.html], { type: "text/html" }));
        const f = document.createElement("iframe");
        // allow-same-origin without allow-scripts: the page runs no script, and this page can measure it (fit check)
        f.setAttribute("sandbox", "allow-same-origin"); f.setAttribute("tabindex", "-1"); f.setAttribute("aria-hidden", "true"); f.title = "معاينة";
        f.className = view.querySelector("iframe") ? "back" : "";
        f.addEventListener("load", () => {
          if (seq !== pvSeq) { f.remove(); URL.revokeObjectURL(url); return; }
          setTimeout(async () => {   // swap first (no white flash between two previews), then measure the shown page
            if (seq !== pvSeq) return;
            for (const o of view.querySelectorAll("iframe")) if (o !== f) o.remove();
            f.className = ""; stage.classList.remove("busy");
            if (lastUrl) URL.revokeObjectURL(lastUrl); lastUrl = url;
            let res = null;
            try { const doc = f.contentDocument; await fontsSettled(doc); res = fillMod.fitCheck("", doc); } catch { res = null; }
            if (seq !== pvSeq) return;
            if (res) {
              if (!state.fitBase.has(t.id)) state.fitBase.set(t.id, Object.keys(changed(t)).length ? null : res.bad);
              const base = state.fitBase.get(t.id);
              state.fit = { id: t.id, pending: false, bad: base ? fillMod.newProblems(res.bad, base) : res.bad };
            } else state.fit = { id: t.id, pending: false, bad: [] };   // no measure possible: the worker still checks
            validateAll();
          }, 120);
        }, { once: true });
        view.appendChild(f); fit(); f.src = url;
      } catch {
        stage.classList.remove("busy");
        state.fit = { id: t.id, pending: false, bad: [] }; validateAll();
        view.innerHTML = `<p style="color:#fff;padding:12px;margin:0">ما قدرنا نعرض المعاينة. التعديل بينحفظ عادي.</p>`;
      }
    }, 140);
  }


  /* ---------- events ---------- */
  const setVal = (key, v) => { const t = cur(); draftOf(t).vals[key] = v; validateAll(); preview(); refreshAssets(); };
  const refreshAssets = () => { const a = el.querySelector(".sd-assets"); if (a) { const sl = a.scrollLeft; a.outerHTML = assetsHTML(); el.querySelector(".sd-assets").scrollLeft = sl; } };
  el.addEventListener("input", (e) => {
    const k = e.target.dataset && e.target.dataset.key; if (!k || !e.target.classList.contains("i")) return;
    const f = fieldsOf(cur()).find((x) => x.key === k); if (!f) return;
    setVal(k, f.type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value);
  });
  el.addEventListener("click", async (e) => {
    const b = e.target.closest("button"); if (!b || !el.contains(b)) return;
    if (b.classList.contains("sd-asset")) { state.sel = Number(b.dataset.i) || 0; draw(); return; }
    if (b.dataset.opt !== undefined && b.dataset.key) {
      setVal(b.dataset.key, b.dataset.opt);
      for (const c of el.querySelectorAll(`.sd-chip[data-key="${CSS.escape(b.dataset.key)}"]`)) c.setAttribute("aria-checked", String(c === b));
      return;
    }
    if (b.dataset.reset) {
      const k = b.dataset.reset, t = cur(), v = draftOf(t).start[k];
      const inp = el.querySelector(`.i[data-key="${CSS.escape(k)}"]`); if (inp) inp.value = v ?? "";
      setVal(k, v); return;
    }
    if (b.dataset.em) {
      const inp = el.querySelector(`.i[data-key="${CSS.escape(b.dataset.em)}"]`); if (!inp) return;
      const a = inp.selectionStart, z = inp.selectionEnd;
      if (a == null || a === z) { toast("حدّدي الكلام اللي بدك تلوّنيه أول"); inp.focus(); return; }
      inp.value = inp.value.slice(0, a) + "<em>" + inp.value.slice(a, z) + "</em>" + inp.value.slice(z);
      setVal(b.dataset.em, inp.value); inp.focus(); return;
    }
    if (b.dataset.br) {
      const inp = el.querySelector(`.i[data-key="${CSS.escape(b.dataset.br)}"]`); if (!inp) return;
      const a = inp.selectionStart ?? inp.value.length, z = inp.selectionEnd ?? a;
      inp.value = inp.value.slice(0, a) + "<br>" + inp.value.slice(z);
      setVal(b.dataset.br, inp.value); inp.focus(); inp.setSelectionRange(a + 4, a + 4); return;
    }
    if (b.id === "sdZoom") { openBig(); return; }
    if (b.id === "sdSaveOk" || b.id === "sdSave") { await save(b.id === "sdSaveOk", b); return; }
    if (b.id === "sdCancel") {
      b.disabled = true;
      try { await st.cancel(Number(b.dataset.edit)); toast("انلغى التعديل"); await reload(true); }
      catch (err) { b.disabled = false; toast(/P0002/.test(err && err.code) || /rendering/.test(err && err.message || "") ? "التعديل صار عم يتجهز، ما بينفع ينلغى" : errText(err)); await reload(false); }
      return;
    }
    if (b.id === "sdReload") { await reload(true); }
  });
  el.addEventListener("submit", (e) => { if (e.target.id === "sdForm") e.preventDefault(); });

  async function save(approve, btn) {
    const t = cur(); if (!t || state.busy) return;
    if (!validateAll()) { $("#sdErr", el).textContent = "صلّحي الخانات المعلّمة بالأحمر أول."; return; }
    const values = changed(t);
    if (!Object.keys(values).length) { $("#sdErr", el).textContent = "ما غيّرتِ شي لسا."; return; }
    state.busy = true; validateAll(); btn.textContent = "عم نحفظ…"; $("#sdErr", el).textContent = "";
    try {
      const res = await st.save(t.id, values, draftOf(t).ver, ($("#sdNote", el) || {}).value || "", approve);
      state.drafts.delete(t.id);
      state.busy = false;
      toast(res && res.status === "done" ? (approve ? "انحفظ الكابشن ووافقتِ عليه" : "انحفظ الكابشن") : "انحفظ التعديل، الملف الجديد بالدور");
      await reload(true);
      const box = $("#sdSt", el); if (box) box.scrollIntoView({ block: "center" });
      if (opts.onSaved) opts.onSaved();
    } catch (err) {
      state.busy = false;
      btn.textContent = approve ? "احفظي ووافقي" : "احفظي بدون موافقة";
      validateAll();
      const x = saveErr(err);
      $("#sdErr", el).innerHTML = esc("ما انحفظ: " + x.t) + (x.reload ? ` <button class="btn-line" type="button" id="sdReload">افتحيه من جديد</button>` : "");
    }
  }

  async function reload(dropDrafts) {
    const keepSel = cur() && cur().id;
    try { data = await st.targets(slug); } catch (err) { toast(errText(err)); return; }
    if (!ctx.isCurrent()) return;
    if (dropDrafts) state.drafts.clear();
    const i = targets().findIndex((t) => t.id === keepSel); state.sel = i >= 0 ? i : 0;
    draw(); schedulePoll();
  }

  // while a new file is being made, look again every few seconds (only on this page)
  function schedulePoll() {
    clearTimeout(state.poll);
    if (!targets().some((t) => t.last_edit && ["queued", "rendering"].includes(t.last_edit.status))) return;
    state.poll = setTimeout(async () => {
      if (!ctx.isCurrent()) return;
      const before = JSON.stringify(targets().map((t) => t.last_edit && t.last_edit.status));
      let fresh; try { fresh = await st.targets(slug); } catch { schedulePoll(); return; }
      if (!ctx.isCurrent()) return;
      const dirty = targets().some((t) => Object.keys(changed(t)).length);
      data = fresh;
      if (JSON.stringify(targets().map((t) => t.last_edit && t.last_edit.status)) !== before) {
        // keep what she is typing: only the status box, the asset strip and the history change
        if (dirty) { const t = cur(); const s = $("#sdSt", el); if (s) s.outerHTML = statusHTML(t) || "<span id='sdSt'></span>"; refreshAssets(); }
        else draw();
        if (opts.onSaved) opts.onSaved();
      }
      schedulePoll();
    }, ctx.demo ? 1500 : 5000);
  }

  function openBig() {
    const t = cur(); const view = $("#sdView", el); if (!view) return;
    const [w, h] = String(t.manifest.size).split("x").map(Number);
    const d = document.createElement("dialog"); d.className = "sd-big";
    d.innerHTML = `<div class="in"><div class="bar"><b>${esc(t.label)}</b><button type="button" class="sd-zoom" id="sdBigX">إغلاق</button></div><div class="sd-view" id="sdBigV"></div></div>`;
    document.body.appendChild(d); d.showModal();
    const v = $("#sdBigV", d), src = view.querySelector("iframe:not(.back)");
    const avail = Math.min(536, window.innerWidth - 48), s = Math.min(avail / w, (window.innerHeight - 110) / h);
    v.style.width = Math.floor(w * s) + "px"; v.style.height = Math.floor(h * s) + "px";
    if (src) { const f = document.createElement("iframe"); f.setAttribute("sandbox", "allow-same-origin"); f.title = "معاينة كبيرة"; f.style.cssText = `width:${w}px;height:${h}px;transform:scale(${s})`; f.src = src.src; v.appendChild(f); }
    const close = () => { d.close(); d.remove(); };
    $("#sdBigX", d).addEventListener("click", close);
    d.addEventListener("cancel", close);
    d.addEventListener("click", (e) => { if (e.target === d) close(); });
  }

  draw();
  schedulePoll();
}
