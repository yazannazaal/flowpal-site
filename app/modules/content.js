// Module "content": posts waiting for approval before they go out. The reviewer approves or asks for changes.
// Data: content_reviews (RLS: hub_can('content'), select only). The only write is rpc('hub_content_decide')
// (checks hub_can('content'); a change request needs a note; approved / withdrawn posts cannot be changed).
// ?demo: fake rows and a fake decide() from demo/content-reviews.js.
import { $, esc, safeUrl, fmtDate, fmtDT, toast, useStyle, ok, errText } from "../lib.js";

const COLS = "id,post_slug,title,platforms,planned_for,caption,on_image_text,media,status,review_note,decided_at,created_at,updated_at";
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
const stChip = (s) => { const x = STATUS[s] || { t: s, c: "off" }; return `<span class="ct-st ${x.c}">${esc(x.t)}</span>`; };

function store(ctx) {
  if (ctx.demo) {
    return {
      async list() { return (await import("../demo/content-reviews.js")).mockContentReviews(); },
      async decide(id, d, note) { return (await import("../demo/content-reviews.js")).mockContentDecide(id, d, note, ctx.me.email); },
    };
  }
  return {
    async list() {
      return ok(await ctx.sb.from("content_reviews").select(COLS).neq("status", "withdrawn")
        .order("planned_for", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false }).limit(200));
    },
    async decide(id, d, note) { ok(await ctx.sb.rpc("hub_content_decide", { p_id: id, p_decision: d, p_note: note || null })); },
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
    <div class="page-head"><h1>موافقة المحتوى</h1><div class="tally"><span><b>${count.todo}</b> بانتظار موافقتك</span></div></div>
    <div class="filters" role="group" aria-label="الحالة" id="ctF">${FILTERS.map(([k, t]) => `<button class="fbtn" type="button" data-f="${k}" aria-pressed="${filter.f === k}">${t} (${count[k]})</button>`).join("")}</div>
    ${shown.length ? `<ul class="ct-list">${shown.map((r) => {
      const m = mediaOf(r, ctx.demo)[0];
      return `<li class="ct-item"><a href="${ctx.base}/${Number(r.id)}">
        <span class="ct-thumb">${m && m.type === "image" ? `<img src="${esc(m.url)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : m ? "فيديو" : "نص فقط"}</span>
        <span><h2>${esc(r.title)}</h2>
          <span class="ct-meta">${stChip(r.status)}${r.planned_for ? `<span>للنشر ${esc(fmtDate(r.planned_for))}</span>` : ""}<span>${esc(platforms(r).join(" · "))}</span></span></span>
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
    <div class="page-head"><h1>${esc(r.title)}</h1></div>
    <div class="ct-meta" style="margin:-6px 0 14px">${stChip(r.status)}${r.planned_for ? `<span>للنشر ${esc(fmtDate(r.planned_for))}</span>` : `<span>بدون موعد نشر</span>`}<span>${esc(platforms(r).join(" · "))}</span></div>
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

export async function mount(ctx) {
  useStyle("content", CSS);
  const el = ctx.el;
  const st = store(ctx);
  el.innerHTML = `<p class="muted">جارِ التحميل…</p>`;
  let rows = await st.list();
  if (!ctx.isCurrent()) return;
  const id = Number(String(ctx.path || "").replace(/\/+$/, ""));

  if (!ctx.path) {
    const draw = () => { el.innerHTML = listHTML(ctx, rows); };
    draw();
    el.addEventListener("click", (e) => { const b = e.target.closest("button[data-f]"); if (b) { filter.f = b.dataset.f; draw(); } });
    return;
  }

  const draw = () => { el.innerHTML = postHTML(ctx, Number.isInteger(id) ? rows.find((r) => r.id === id) : null); };
  draw();
  const send = async (decision, note, btn) => {
    btn.disabled = true; $("#ctErr", el).textContent = "";
    try {
      await st.decide(id, decision, note);
      rows = await st.list();
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
