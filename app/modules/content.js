// Module "content": posts waiting for approval + the week's content calendar, in one tab.
//   #/content              «بانتظار موافقتك» (approve / ask for changes) and the week calendar (7 days from Saturday)
//   #/content/w/<day>      the week that contains <day>
//   #/content/<review id>  one post to approve (existing page)
//   #/content/p/<post id>  one calendar post (date, hour, type, platforms, status) with the same approval buttons
//   #/content/e/<post slug> «تعديل»: the content role changes texts / brand colours / caption herself (task 005, studio/editor.mjs,
//                          loaded only on this page; rpc hub_studio_targets / hub_studio_save / hub_studio_cancel)
// Data: content_reviews (RLS: hub_can('content'), select only); rpc('hub_content_calendar', {p_from, p_to}) (read
// only; the calendar is written by سلمى's sync, never from here). The only write is rpc('hub_content_decide')
// (checks hub_can('content'); a change request needs a note; approved / withdrawn posts cannot be changed).
// ?demo: demo/content-reviews.js + demo/content-calendar.js.
import { $, esc, safeUrl, fmtDate, fmtDT, toast, useStyle, ok, errText, who } from "../lib.js";

const COLS = "id,post_slug,title,platforms,planned_for,caption,on_image_text,media,status,review_note,decided_at,created_at,updated_at,edited_by,edited_at";
const STATUS = {
  pending: { t: "بانتظار موافقتك", c: "wait" }, changes_requested: { t: "مطلوب تعديل", c: "chg" },
  approved: { t: "موافَق عليه", c: "ok" }, withdrawn: { t: "مسحوب", c: "off" },
};
const PLATFORM = { instagram: "Instagram", facebook: "Facebook", linkedin: "LinkedIn", tiktok: "TikTok", story: "ستوري", reel: "ريل", whatsapp: "واتساب" };
const FILTERS = [["todo", "بانتظار موافقتك"], ["chg", "مطلوب تعديل"], ["ok", "موافَق عليها"], ["all", "الكل"]];

const CSS = `
.ct-list{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.ct-item a{display:grid;grid-template-columns:76px 1fr;gap:12px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:10px;text-decoration:none;color:inherit}
.ct-item a:hover{border-color:var(--ink)}
.ct-thumb{width:76px;height:95px;border-radius:8px;background:var(--soft);overflow:hidden;display:grid;place-items:center;color:var(--muted);font-size:11px;text-align:center}
.ct-thumb img{width:100%;height:100%;object-fit:cover;display:block}
.ct-item h2{font-size:15.5px;margin-bottom:4px}
.ct-meta{display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;font-size:12.5px;color:var(--muted)}
.ct-st{font-size:12px;font-weight:600;padding:3px 8px;border-radius:6px;white-space:nowrap}
.ct-st.wait{background:#FBF1DC;color:#7A5605} .ct-st.chg{background:#FDECEA;color:#9B2C27}
.ct-st.ok{background:#E2F4EA;color:#145C33} .ct-st.off{background:var(--soft);color:var(--muted)}
.ct-st.edit{background:var(--ink);color:#fff}
.ct-edit{display:inline-flex;align-items:center;gap:6px;text-decoration:none;color:var(--ink);font-weight:600;padding:8px 14px}
.ct-edit svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.ct-wrap{display:grid;gap:14px}
.ct-side{display:grid;gap:12px;min-width:0}
.ct-media{display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;margin-inline:calc(var(--gutter) * -1);padding:0 var(--gutter) 6px}
.ct-media figure{flex:0 0 min(82%,420px);margin:0;scroll-snap-align:center}
.ct-media img,.ct-media video{width:100%;border-radius:10px;display:block;background:var(--soft);aspect-ratio:4/5;object-fit:cover}
.ct-media figcaption{font-size:12px;color:var(--muted);text-align:center;margin-top:4px}
.ct-media.one figure{flex-basis:100%;max-width:460px}
.ct-text{white-space:pre-wrap;overflow-wrap:anywhere;font-size:15px;line-height:1.8;margin:0}
.ct-oit{background:var(--ink);color:#fff;border-radius:8px;padding:12px 14px;font:600 16px/1.6 var(--f-head);white-space:pre-wrap}
.ct-decide .btns{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px}
.ct-decide .btn,.ct-decide .btn-line{width:100%;padding:12px 10px;font-size:15px}
.ct-decide .btn-line{font-weight:600}
.ct-done{border-radius:8px;padding:12px 14px;font-size:14px}
.ct-done.ok{background:#E2F4EA;color:#145C33} .ct-done.chg{background:#FDECEA;color:#7E241F} .ct-done.off{background:var(--soft);color:var(--muted)}
.ct-done p{margin:4px 0 0;white-space:pre-wrap;overflow-wrap:anywhere;color:var(--ink)}
.ct-copy{font-size:12px;padding:3px 9px;margin-inline-start:auto}
.ct-h{display:flex;align-items:center;gap:8px;margin-bottom:8px}
@media (min-width:900px){
  .ct-list{grid-template-columns:repeat(2,minmax(0,1fr))}
  .ct-wrap{grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start}
  .ct-media{margin:0;padding:0 0 6px}
  .ct-side{position:sticky;top:76px}
}`;

const mediaUrl = (u, demo) => (demo && /^data:image\/svg\+xml/.test(String(u || ""))) ? u : safeUrl(u);
const mediaOf = (r, demo) => (Array.isArray(r.media) ? r.media : [])
  .map((m) => ({ type: m && m.type === "video" ? "video" : "image", url: mediaUrl(m && m.url, demo) }))
  .filter((m) => m.url);
const platforms = (r) => (Array.isArray(r.platforms) ? r.platforms : []).map((p) => PLATFORM[p] || p);
const canDecide = (r) => r.status === "pending" || r.status === "changes_requested";
const editChip = (r) => (r && r.edited_by ? `<span class="ct-st edit">${esc(editedBy(r.edited_by, r.edited_by_name))}</span>` : "");
const editedBy = (id, name) => `تعديل من ${name || who(id)}`;   // names come from the data / hub_me(), never from the code
const SLUG_RE = /^[a-z0-9-]{1,120}$/;
const canEdit = (r) => r && r.post_slug && SLUG_RE.test(r.post_slug) && r.status !== "withdrawn";
const PEN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>';
const editLink = (ctx, r) => (canEdit(r) ? `<a class="btn-line ct-edit" href="${ctx.base}/e/${encodeURIComponent(r.post_slug)}">${PEN}تعديل</a>` : "");
const stChip = (s) => { const x = STATUS[s] || { t: s, c: "off" }; return `<span class="ct-st ${x.c}">${esc(x.t)}</span>`; };

function store(ctx) {
  if (ctx.demo) {
    return {
      async list() { return (await import("../demo/content-reviews.js")).mockContentReviews(); },
      async decide(id, d, note) { return (await import("../demo/content-reviews.js")).mockContentDecide(id, d, note, ctx.me.email); },
      async calendar(from, to) { return (await import("../demo/content-calendar.js")).mockContentCalendar(from, to); },
    };
  }
  return {
    async list() {
      return ok(await ctx.sb.from("content_reviews").select(COLS).neq("status", "withdrawn")
        .order("planned_for", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false }).limit(200));
    },
    async decide(id, d, note) { ok(await ctx.sb.rpc("hub_content_decide", { p_id: id, p_decision: d, p_note: note || null })); },
    async calendar(from, to) { const r = ok(await ctx.sb.rpc("hub_content_calendar", { p_from: from, p_to: to })); return Array.isArray(r) ? r : []; },
  };
}

function decideErr(err) {
  const code = err && err.code;
  if (code === "P0002" || /already decided|not found/i.test(err && err.message || "")) return "انحسم قرار على هالمنشور أو انسحب. حدّثي الصفحة.";
  if (/note required/i.test(err && err.message || "")) return "اكتبي شو التعديل المطلوب.";
  return errText(err);
}

const filter = { f: "todo" };
function matches(r) {
  if (filter.f === "todo") return r.status === "pending";
  if (filter.f === "chg") return r.status === "changes_requested";
  if (filter.f === "ok") return r.status === "approved";
  return r.status !== "withdrawn";
}

function listHTML(ctx, rows) {
  const n = (s) => rows.filter((r) => r.status === s).length;
  const shown = rows.filter(matches);
  const count = { todo: n("pending"), chg: n("changes_requested"), ok: n("approved"), all: rows.filter((r) => r.status !== "withdrawn").length };
  return `
    <div class="page-head"><h1>المحتوى</h1><div class="tally"><span><b>${count.todo}</b> بانتظار موافقتك</span></div></div>
    <h2 class="cc-h2">الموافقة</h2>
    <div class="filters" role="group" aria-label="الحالة" id="ctF">${FILTERS.map(([k, t]) => `<button class="fbtn" type="button" data-f="${k}" aria-pressed="${filter.f === k}">${t} (${count[k]})</button>`).join("")}</div>
    ${shown.length ? `<ul class="ct-list">${shown.map((r) => {
      const m = mediaOf(r, ctx.demo)[0];
      return `<li class="ct-item"><a href="${ctx.base}/${Number(r.id)}">
        <span class="ct-thumb">${m && m.type === "image" ? `<img src="${esc(m.url)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : m ? "فيديو" : "نص فقط"}</span>
        <span><h2>${esc(r.title)}</h2>
          <span class="ct-meta">${stChip(r.status)}${editChip(r)}${r.planned_for ? `<span>للنشر ${esc(fmtDate(r.planned_for))}</span>` : ""}<span>${esc(platforms(r).join(" · "))}</span></span></span>
      </a></li>`;
    }).join("")}</ul>`
      : `<div class="empty">${filter.f === "todo" ? "ما في منشورات بانتظار موافقتك هلأ." : "ما في شي بهالفلتر."}</div>`}`;
}

function decisionHTML(r) {
  const past = r.status === "approved"
    ? `<div class="ct-done ok"><b>وافقتِ عليه</b>${r.decided_at ? ` · ${esc(fmtDT(r.decided_at))}` : ""}${r.review_note ? `<p>${esc(r.review_note)}</p>` : ""}</div>`
    : r.status === "withdrawn" ? `<div class="ct-done off">هذا المنشور انسحب ومش بحاجة قرار.</div>`
    : r.status === "changes_requested" ? `<div class="ct-done chg"><b>طلبتِ تعديل</b>${r.decided_at ? ` · ${esc(fmtDT(r.decided_at))}` : ""}${r.review_note ? `<p>${esc(r.review_note)}</p>` : ""}</div>` : "";
  if (!canDecide(r)) return `<section class="panel ct-decide"><h2>القرار</h2>${past}</section>`;
  return `<section class="panel ct-decide" id="ctDecide"><h2>القرار</h2>
    ${past ? past + `<p class="muted small" style="margin:8px 0">إذا صار جاهز، فيكِ توافقي عليه أو تطلبي تعديل ثاني.</p>` : `<p class="muted small" style="margin:0 0 8px">شوفي الصور والنص، وبعدين اختاري.</p>`}
    <div class="btns">
      <button class="btn" type="button" id="ctOk">موافقة</button>
      <button class="btn-line" type="button" id="ctChg" aria-expanded="false" aria-controls="ctChgForm">بدي تعديل</button>
    </div>
    <div id="ctConfirm" class="hidden" style="margin-top:10px">
      <p class="small" style="margin:0 0 6px">متأكدة؟ بعد الموافقة المنشور بيصير جاهز للنشر.</p>
      <div class="btns"><button class="btn" type="button" id="ctOkYes">نعم، موافقة</button><button class="btn-line" type="button" id="ctOkNo">رجوع</button></div>
    </div>
    <form id="ctChgForm" class="hidden" novalidate>
      <label class="f" for="ctNote">شو بدك يتعدّل؟</label>
      <textarea class="i" id="ctNote" maxlength="2000" placeholder="مثلاً: النص طويل، أو غيّروا الصورة الثانية"></textarea>
      <button class="btn" type="submit" id="ctSend" style="width:100%;margin-top:10px">إرسال طلب التعديل</button>
    </form>
    <div class="err" id="ctErr" role="alert"></div>
  </section>`;
}

function postHTML(ctx, r) {
  if (!r) return `<a class="back" href="${ctx.base}">→ كل المنشورات</a><div class="empty">هذا المنشور غير موجود أو انسحب.</div>`;
  const media = mediaOf(r, ctx.demo);
  return `<a class="back" href="${ctx.base}">→ كل المنشورات</a>
    <div class="page-head"><h1>${esc(r.title)}</h1>${editLink(ctx, r)}</div>
    <div class="ct-meta" style="margin:-6px 0 14px">${stChip(r.status)}${editChip(r)}${r.planned_for ? `<span>للنشر ${esc(fmtDate(r.planned_for))}</span>` : `<span>بدون موعد نشر</span>`}<span>${esc(platforms(r).join(" · "))}</span></div>
    <div class="ct-wrap">
      <div>
        ${media.length ? `<div class="ct-media ${media.length === 1 ? "one" : ""}">${media.map((m, i) => `<figure>${m.type === "video"
          ? `<video src="${esc(m.url)}" controls playsinline preload="metadata"></video>`
          : `<img src="${esc(m.url)}" alt="صورة ${i + 1} من المنشور" loading="lazy" referrerpolicy="no-referrer">`}${media.length > 1 ? `<figcaption>${i + 1} من ${media.length}</figcaption>` : ""}</figure>`).join("")}</div>`
          : `<div class="empty">ما في صور لهالمنشور.</div>`}
      </div>
      <div class="ct-side">
        ${r.on_image_text ? `<section class="panel"><h2 style="margin-bottom:8px">النص على الصورة</h2><div class="ct-oit">${esc(r.on_image_text)}</div></section>` : ""}
        <section class="panel"><div class="ct-h"><h2>الكابشن</h2>${r.caption ? `<button class="btn-line ct-copy" type="button" id="ctCopy">نسخ</button>` : ""}</div>
          ${r.caption ? `<p class="ct-text" id="ctCap">${esc(r.caption)}</p>` : `<p class="muted small" style="margin:0">ما في كابشن.</p>`}</section>
        ${decisionHTML(r)}
      </div>
    </div>`;
}

/* ===== week calendar (hub_content_calendar) ===== */
const TZ = "Asia/Hebron";
const TYPE = { post: "بوست", carousel: "كاروسيل", reel: "ريل", story: "ستوري", video: "فيديو", ad: "إعلان", other: "غير ذلك" };
const CSTATUS = { idea: { t: "فكرة", c: "idea" }, in_progress: { t: "قيد التجهيز", c: "prog" }, ready: { t: "جاهز", c: "ready" }, scheduled: { t: "مجدول", c: "sched" }, published: { t: "منشور", c: "pub" } };
const CPLATFORM = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", linkedin: "LinkedIn", whatsapp: "واتساب", other: "غير ذلك" };
const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const hmFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const wdFmt = new Intl.DateTimeFormat("ar-u-nu-latn", { timeZone: "UTC", weekday: "long" });
const dmFmt = new Intl.DateTimeFormat("ar-u-nu-latn", { timeZone: "UTC", day: "numeric", month: "short" });
const longFmt = new Intl.DateTimeFormat("ar-u-nu-latn", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
const todayH = () => dayFmt.format(new Date());
const addDays = (d, n) => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const weekStart = (d) => addDays(d, -((new Date(d + "T12:00:00Z").getUTCDay() + 1) % 7));   // weeks start Saturday
const dayKey = (iso) => dayFmt.format(new Date(iso));
const U = (d) => new Date(d + "T12:00:00Z");
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const cal = { type: "", plat: "", stat: "" };
let calCache = new Map();   // week start -> rows, this page load only

const cStChip = (s) => { const x = CSTATUS[s] || { t: s, c: "idea" }; return `<span class="cc-st ${x.c}">${esc(x.t)}</span>`; };
const reviewChip = (r) => !r ? "" : r.status === "pending" ? `<span class="ct-st wait">بانتظار موافقتك</span>` : r.status === "changes_requested" ? `<span class="ct-st chg">مطلوب تعديل</span>` : r.status === "approved" ? `<span class="ct-st ok">موافَق عليه</span>` : "";
const calMatch = (c) => (!cal.type || c.content_type === cal.type) && (!cal.plat || (c.platforms || []).includes(cal.plat)) && (!cal.stat || c.status === cal.stat);

function postCard(ctx, c) {
  return `<li class="cc-post s-${esc(c.status)}"><a href="${ctx.base}/p/${encodeURIComponent(c.id)}">
    <span class="cc-top">${c.scheduled_at ? `<span class="cc-hr">${esc(hmFmt.format(new Date(c.scheduled_at)))}</span>` : ""}<span class="cc-type">${esc(TYPE[c.content_type] || c.content_type)}</span>${cStChip(c.status)}</span>
    <span class="cc-title">${esc(c.title)}</span>
    <span class="cc-pl">${esc((c.platforms || []).map((p) => CPLATFORM[p] || p).join(" · "))}</span>${reviewChip(c.review)}</a></li>`;
}

function calendarHTML(ctx, rows, start, loadedAt) {
  const t = todayH();
  const days = [...Array(7)].map((_, i) => addDays(start, i));
  const shown = rows.filter(calMatch);
  const dated = shown.filter((c) => c.scheduled_at), undated = shown.filter((c) => !c.scheduled_at);
  const types = [...new Set(rows.map((c) => c.content_type))], plats = [...new Set(rows.flatMap((c) => c.platforms || []))];
  const sel = (id, label, cur, opts) => `<label class="sr" for="${id}">${label}</label><select class="i" id="${id}"><option value="">${label}</option>${opts.map(([k, v]) => `<option value="${esc(k)}" ${cur === k ? "selected" : ""}>${esc(v)}</option>`).join("")}</select>`;
  return `<section class="cc" id="ccCal"><div class="cc-bar"><h2 class="cc-h2" style="margin:0">تقويم الأسبوع</h2>
      <div class="cc-nav"><a class="btn-line" href="${ctx.base}/w/${addDays(start, -7)}" aria-label="الأسبوع الماضي">→</a>
      <span class="cc-range">${esc(dmFmt.format(U(days[0])))} – ${esc(dmFmt.format(U(days[6])))}</span>
      <a class="btn-line" href="${ctx.base}/w/${addDays(start, 7)}" aria-label="الأسبوع الجاي">←</a>
      ${start !== weekStart(t) ? `<a class="btn-line" href="${ctx.base}/w/${t}">هذا الأسبوع</a>` : ""}</div></div>
    <div class="cc-f">${sel("ccType", "كل الأنواع", cal.type, types.map((k) => [k, TYPE[k] || k]))}${sel("ccPlat", "كل المنصات", cal.plat, plats.map((k) => [k, CPLATFORM[k] || k]))}${sel("ccStat", "كل الحالات", cal.stat, Object.entries(CSTATUS).map(([k, v]) => [k, v.t]))}</div>
    <ol class="cc-week">${days.map((d) => {
      const xs = dated.filter((c) => dayKey(c.scheduled_at) === d);
      return `<li class="cc-day ${d === t ? "today" : ""} ${xs.length ? "" : "none"}" data-day="${d}"><div class="cc-dh"><b>${esc(wdFmt.format(U(d)))}</b><span>${esc(dmFmt.format(U(d)))}${d === t ? " · اليوم" : ""}</span></div>
        ${xs.length ? `<ul class="cc-posts">${xs.map((c) => postCard(ctx, c)).join("")}</ul>` : `<p class="cc-empty">ما في شي</p>`}</li>`;
    }).join("")}</ol>
    ${undated.length ? `<h3 class="cc-h3">أفكار بدون موعد (${undated.length})</h3><ul class="cc-posts cc-undated">${undated.map((c) => postCard(ctx, c)).join("")}</ul>` : ""}
    <p class="muted small">التقويم بيتحدّث من سلمى ومن جدولة النشر (حوالي 3 مرات باليوم). آخر تحميل ${esc(hmFmt.format(new Date(loadedAt)))}. للتعديل على منشور: «بدي تعديل» من صفحته.</p>
  </section>`;
}

async function weekRows(st, start, force) {
  if (!force && calCache.has(start)) return calCache.get(start);
  const v = { at: Date.now(), rows: await st.calendar(start, addDays(start, 6)) };
  calCache.set(start, v);
  return v;
}

function calPostHTML(ctx, c, r, back) {
  if (!c) return `<a class="back" href="${back}">→ المحتوى</a><div class="empty">هذا المنشور مش بالتقويم أو انلغى.</div>`;
  const media = (Array.isArray(c.media) && c.media.length ? mediaOf(c, ctx.demo) : r ? mediaOf(r, ctx.demo) : []);
  const caption = c.caption || (r && r.caption) || "";
  const link = safeUrl(c.published_url);
  return `<a class="back" href="${back}">→ المحتوى</a>
    <div class="page-head"><h1>${esc(c.title)}</h1>${editLink(ctx, r)}</div>
    <div class="ct-meta" style="margin:-6px 0 14px">${cStChip(c.status)}${reviewChip(c.review)}${editChip(r)}<span>${c.scheduled_at ? esc(longFmt.format(new Date(c.scheduled_at))) + " · الساعة <span class=\"ltr\">" + esc(hmFmt.format(new Date(c.scheduled_at))) + "</span>" : "بدون موعد"}</span></div>
    <div class="ct-wrap"><div>
      <section class="panel" style="margin-bottom:12px"><dl class="cc-kv"><dt>النوع</dt><dd>${esc(TYPE[c.content_type] || c.content_type)}</dd>
        <dt>المنصات</dt><dd>${esc((c.platforms || []).map((p) => CPLATFORM[p] || p).join("، ")) || "—"}</dd>
        ${c.pillar ? `<dt>المحور</dt><dd>${esc(c.pillar)}</dd>` : ""}${c.summary ? `<dt>الفكرة</dt><dd>${esc(c.summary)}</dd>` : ""}
        ${link ? `<dt>المنشور</dt><dd><a href="${esc(link)}" target="_blank" rel="noopener noreferrer">افتحيه</a></dd>` : ""}</dl></section>
      ${media.length ? `<div class="ct-media ${media.length === 1 ? "one" : ""}">${media.map((m, i) => `<figure>${m.type === "video"
        ? `<video src="${esc(m.url)}" controls playsinline preload="metadata"></video>`
        : `<img src="${esc(m.url)}" alt="صورة ${i + 1} من المنشور" loading="lazy" referrerpolicy="no-referrer">`}</figure>`).join("")}</div>` : ""}
    </div><div class="ct-side">
      ${r && r.on_image_text ? `<section class="panel"><h2 style="margin-bottom:8px">النص على الصورة</h2><div class="ct-oit">${esc(r.on_image_text)}</div></section>` : ""}
      ${caption ? `<section class="panel"><div class="ct-h"><h2>الكابشن</h2><button class="btn-line ct-copy" type="button" id="ctCopy">نسخ</button></div><p class="ct-text" id="ctCap">${esc(caption)}</p></section>` : ""}
      ${r ? decisionHTML(r) : `<section class="panel"><p class="muted small" style="margin:0">${["idea", "in_progress"].includes(c.status) ? "لسا قيد التجهيز. لما يجهز بيوصلك للموافقة." : "هذا المنشور ما بحتاج موافقة من هون."}</p></section>`}
    </div></div>`;
}

const CAL_CSS = `
.cc-h2{font-size:17px;margin:4px 0 10px}
.cc{margin-top:26px;padding-top:18px;border-top:1px solid var(--line)}
.cc-bar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}
.cc-nav{display:flex;align-items:center;gap:6px}
.cc-nav a{text-decoration:none;padding:6px 11px}
.cc-range{font-weight:600;font-size:14px;min-width:96px;text-align:center}
.cc-f{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-bottom:12px}
.cc-f select{padding:8px 6px;font-size:14px}
.cc-week{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.cc-day{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:10px 12px;min-width:0}
.cc-day.today{border-color:var(--teal);box-shadow:inset 0 3px 0 var(--teal)}
.cc-day.none{padding-block:8px}
.cc-dh{display:flex;align-items:baseline;gap:8px;margin-bottom:6px}
.cc-dh b{font:600 15px var(--f-head)} .cc-dh span{font-size:12.5px;color:var(--muted)}
.cc-day.none .cc-dh{margin:0}
.cc-day.none{display:flex;align-items:baseline;justify-content:space-between}
.cc-empty{margin:0;font-size:12.5px;color:var(--muted)}
.cc-posts{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.cc-post a{display:grid;gap:3px;text-decoration:none;color:inherit;border-radius:8px;padding:8px 10px;background:var(--paper);border:1px solid var(--soft);border-inline-start:4px solid var(--k,#8A969A)}
.cc-post a:hover{border-color:var(--ink)}
.cc-post.s-idea{--k:#9AA5A9} .cc-post.s-in_progress{--k:#D4950F} .cc-post.s-ready{--k:#5B6CCF} .cc-post.s-scheduled{--k:#14B8A6} .cc-post.s-published{--k:#2E9E5B}
.cc-top{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;font-size:12px}
.cc-hr{font:600 13px var(--f-head);direction:ltr}
.cc-type{color:var(--muted)}
.cc-title{font-weight:600;font-size:14px;line-height:1.4;overflow-wrap:anywhere}
.cc-pl{font-size:12px;color:var(--muted)}
.cc-post .ct-st{justify-self:start}
.cc-st{font-size:11.5px;font-weight:600;padding:2px 7px;border-radius:6px;background:var(--soft)}
.cc-st.prog{background:#FBF1DC;color:#7A5605} .cc-st.ready{background:#E9ECFA;color:#33408F} .cc-st.sched{background:#E7F7F4;color:var(--teal-ink)} .cc-st.pub{background:#E2F4EA;color:#145C33} .cc-st.idea{color:var(--muted)}
.cc-h3{font-size:15px;margin:16px 0 8px}
.cc-kv{display:grid;grid-template-columns:84px 1fr;gap:6px 10px;margin:0;font-size:14.5px}
.cc-kv dt{color:var(--muted);font-size:13px} .cc-kv dd{margin:0;overflow-wrap:anywhere}
@media (min-width:900px){
  .cc-week{grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}
  .cc-day,.cc-day.none{display:block;padding:8px;min-height:180px}
  .cc-day.none .cc-dh{margin-bottom:6px}
  .cc-dh{flex-direction:column;gap:0}
  .cc-undated{grid-template-columns:repeat(3,minmax(0,1fr))}
  .cc-f{max-width:560px}
}`;

export async function mount(ctx) {
  useStyle("content", CSS + CAL_CSS);
  const el = ctx.el;
  const st = store(ctx);
  el.innerHTML = `<p class="muted">جارِ التحميل…</p>`;
  let rows = await st.list();
  if (!ctx.isCurrent()) return;
  const path = String(ctx.path || "").replace(/\/+$/, "");

  // ---- landing: approvals + week calendar
  const wk = path.match(/^w\/(\d{4}-\d{2}-\d{2})$/);
  if (!path || wk) {
    const start = weekStart(wk && DAY_RE.test(wk[1]) ? wk[1] : todayH());
    let week = { at: Date.now(), rows: [] }, calErr = null;
    try { week = await weekRows(st, start); } catch (err) { calErr = err; }
    if (!ctx.isCurrent()) return;
    const drawList = () => { $("#ctList", el).innerHTML = listHTML(ctx, rows); };
    const drawCal = () => {
      $("#ctCal", el).innerHTML = calErr ? `<section class="cc"><h2 class="cc-h2">تقويم الأسبوع</h2><p class="err">ما قدرنا نحمّل التقويم: ${esc(errText(calErr))}</p></section>` : calendarHTML(ctx, week.rows, start, week.at);
    };
    el.innerHTML = `<div id="ctList"></div><div id="ctCal"></div>`;
    drawList(); drawCal();
    if (wk) { const c = $("#ccCal", el); if (c) c.scrollIntoView({ block: "start" }); }
    el.addEventListener("click", (e) => { const b = e.target.closest("button[data-f]"); if (b) { filter.f = b.dataset.f; drawList(); } });
    el.addEventListener("change", (e) => {
      const k = { ccType: "type", ccPlat: "plat", ccStat: "stat" }[e.target.id];
      if (k) { cal[k] = e.target.value; drawCal(); }
    });
    return;
  }

  // ---- «تعديل»: the studio page of one post
  const ed = path.match(/^e\/([^/]+)$/);
  if (ed) {
    let slug = ""; try { slug = decodeURIComponent(ed[1]); } catch { /* bad escape */ }
    if (!SLUG_RE.test(slug)) { el.innerHTML = `<a class="back" href="${ctx.base}">→ المحتوى</a><div class="empty">هذا المنشور غير موجود.</div>`; return; }
    const review = rows.find((x) => x.post_slug === slug) || null;
    const { mountEditor } = await import("../studio/editor.mjs");
    if (!ctx.isCurrent()) return;
    await mountEditor(ctx, el, slug, {
      review, title: review ? review.title : slug, backHref: review ? `${ctx.base}/${Number(review.id)}` : ctx.base,
      async onSaved() { try { const fresh = (await st.list()).find((x) => x.post_slug === slug); if (fresh && review) Object.assign(review, fresh); calCache = new Map(); } catch { /* the page still works */ } },
    });
    return;
  }

  // ---- one post: a review (#/content/<id>) or a calendar post (#/content/p/<id>)
  const calId = (path.match(/^p\/([A-Za-z0-9_-]{1,40})$/) || [])[1] || null;
  let reviewId = calId ? null : Number(path);
  let calRow = null;
  const findCal = async (force) => {
    for (const v of calCache.values()) { const c = v.rows.find((x) => x.id === calId); if (c && !force) return c; }
    const t = todayH();
    const all = await st.calendar(addDays(t, -31), addDays(t, 31));
    return all.find((x) => x.id === calId) || null;
  };
  if (calId) {
    calRow = await findCal(false);
    if (!ctx.isCurrent()) return;
    reviewId = calRow && calRow.review ? Number(calRow.review.id) : null;
  }
  const draw = () => {
    const r = Number.isInteger(reviewId) ? rows.find((x) => x.id === reviewId) : null;
    el.innerHTML = calId ? calPostHTML(ctx, calRow, r, ctx.base) : postHTML(ctx, r);
  };
  draw();
  const send = async (decision, note, btn) => {
    btn.disabled = true; $("#ctErr", el).textContent = "";
    try {
      await st.decide(reviewId, decision, note);
      rows = await st.list();
      calCache = new Map();   // the calendar shows the review state too
      if (calId) calRow = await findCal(true);
      draw(); window.scrollTo(0, 0);
      toast(decision === "approved" ? "تمت الموافقة" : "انبعت طلب التعديل");
    } catch (err) {
      btn.disabled = false;
      $("#ctErr", el).textContent = "ما انحفظ القرار: " + decideErr(err);
    }
  };
  el.addEventListener("click", async (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.id === "ctOk") { $("#ctConfirm", el).classList.remove("hidden"); $("#ctChgForm", el).classList.add("hidden"); $("#ctChg", el).setAttribute("aria-expanded", "false"); $("#ctOkYes", el).focus(); }
    else if (b.id === "ctOkNo") { $("#ctConfirm", el).classList.add("hidden"); }
    else if (b.id === "ctOkYes") { await send("approved", null, b); }
    else if (b.id === "ctChg") {
      $("#ctConfirm", el).classList.add("hidden");
      const f = $("#ctChgForm", el); f.classList.toggle("hidden");
      b.setAttribute("aria-expanded", String(!f.classList.contains("hidden")));
      if (!f.classList.contains("hidden")) $("#ctNote", el).focus();
    } else if (b.id === "ctCopy") {
      try { await navigator.clipboard.writeText($("#ctCap", el).textContent); toast("انتسخ الكابشن"); } catch { toast("ما زبط النسخ، حدّدي النص يدوياً"); }
    }
  });
  el.addEventListener("submit", async (e) => {
    if (e.target.id !== "ctChgForm") return;
    e.preventDefault();
    const note = $("#ctNote", el).value.trim();
    if (!note) { $("#ctErr", el).textContent = "اكتبي شو التعديل المطلوب."; $("#ctNote", el).focus(); return; }
    await send("changes_requested", note, $("#ctSend", el));
  });
}
