// Module "research": Reem's research summaries for the sales side.
// Data: research_briefs (RLS: hub_can('research')), read only. source_path is never selected: the full report
// stays in the agency repo. ?demo: fake rows from demo/research-briefs.js.
import { $, esc, fmtDate, useStyle, ok } from "../lib.js";

// Explicit columns (never "*").
const COLS = "id,slug,title,sector,summary,grade,published_at,updated_at";
const SECTOR = { ecommerce: "متاجر أونلاين", clinic: "عيادات", clinics: "عيادات", restaurants: "مطاعم وكافيهات", cafes: "كافيهات", real_estate: "عقارات", other: "أخرى" };
// Evidence grades (research-validation skill), in plain words.
const GRADE = {
  A: { t: "مؤكد", d: "شفناه بعيننا أو قاله صاحب المحل بمحادثة" },
  B: { t: "موثوق", d: "من مصدر رسمي أو ملخص مكتوب من الفريق" },
  C: { t: "ضعيف", d: "مصدر قديم أو منحاز أو مصدر واحد" },
  D: { t: "استنتاج", d: "تحليل من معلومات ثانية، بدها تأكيد" },
};

const CSS = `
.rs-list{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.rs-item a{display:block;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:14px 16px;text-decoration:none;color:inherit}
.rs-item a:hover{border-color:var(--ink)}
.rs-item h2{font-size:16.5px;margin-bottom:6px}
.rs-meta{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;font-size:12.5px;color:var(--muted)}
.rs-gist{margin:8px 0 0;font-size:14px;color:var(--ink);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.rs-g{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;padding:3px 8px;border-radius:6px;white-space:nowrap}
.rs-g b{font-family:var(--f-head)}
.rs-g.A{background:#E2F4EA;color:#145C33} .rs-g.B{background:#E7F7F4;color:var(--teal-ink)}
.rs-g.C{background:#FBF1DC;color:#7A5605} .rs-g.D{background:var(--soft);color:var(--muted)}
.rs-doc{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:18px 16px}
.rs-doc h1{font-size:22px;margin:8px 0 10px}
.rs-body{white-space:pre-wrap;overflow-wrap:anywhere;font-size:15.5px;line-height:1.8;margin-top:14px;max-width:68ch}
.rs-gnote{margin-top:16px;padding:10px 12px;background:var(--paper);border-radius:8px;font-size:13px;color:var(--muted)}
@media (min-width:900px){ .rs-list{grid-template-columns:repeat(2,minmax(0,1fr))} .rs-doc{padding:24px 28px} }`;

let cache = null;
async function loadBriefs(ctx) {
  if (cache && Date.now() - cache.at < 120000) return cache.rows;
  const rows = ctx.demo
    ? (await import("../demo/research-briefs.js")).mockResearchBriefs()
    : ok(await ctx.sb.from("research_briefs").select(COLS).order("published_at", { ascending: false }).limit(200));
  cache = { at: Date.now(), rows: rows || [] };
  return cache.rows;
}

const gradeChip = (g) => GRADE[g] ? `<span class="rs-g ${g}" title="${esc(GRADE[g].d)}"><b>${g}</b> ${GRADE[g].t}</span>` : "";
const sectorName = (s) => SECTOR[s] || s || "";
const filter = { sector: "all" };

function listHTML(ctx, rows) {
  const sectors = [...new Set(rows.map((r) => r.sector).filter(Boolean))];
  if (filter.sector !== "all" && !sectors.includes(filter.sector)) filter.sector = "all";
  const shown = rows.filter((r) => filter.sector === "all" || r.sector === filter.sector);
  return `
    <div class="page-head"><h1>الأبحاث</h1><div class="tally"><span><b>${rows.length}</b> ملخص</span></div></div>
    <p class="muted small" style="margin:-6px 0 12px">ملخصات ريم عن السوق والمحلات. كل ملخص عليه درجة الثقة بالمعلومة.</p>
    ${sectors.length > 1 ? `<div class="filters" role="group" aria-label="القطاع" id="rsF">
      <button class="fbtn" type="button" data-s="all" aria-pressed="${filter.sector === "all"}">الكل</button>
      ${sectors.map((s) => `<button class="fbtn" type="button" data-s="${esc(s)}" aria-pressed="${filter.sector === s}">${esc(sectorName(s))}</button>`).join("")}</div>` : ""}
    ${shown.length ? `<ul class="rs-list">${shown.map((r) => `<li class="rs-item"><a href="${ctx.base}/${encodeURIComponent(r.slug)}">
        <h2>${esc(r.title)}</h2>
        <div class="rs-meta">${gradeChip(r.grade)}${r.sector ? `<span>${esc(sectorName(r.sector))}</span>` : ""}<span>${esc(fmtDate(r.published_at))}</span></div>
        <p class="rs-gist">${esc(String(r.summary || "").replace(/\s+/g, " ").trim())}</p></a></li>`).join("")}</ul>`
      : `<div class="empty">لا توجد ملخصات بعد. أول ما تنشر ريم ملخصاً سيظهر هنا.</div>`}`;
}

function docHTML(ctx, r) {
  if (!r) return `<a class="back" href="${ctx.base}">→ كل الأبحاث</a><div class="empty">هذا الملخص غير موجود.</div>`;
  const g = GRADE[r.grade];
  return `<a class="back" href="${ctx.base}">→ كل الأبحاث</a>
    <article class="rs-doc">
      <div class="rs-meta">${gradeChip(r.grade)}${r.sector ? `<span>${esc(sectorName(r.sector))}</span>` : ""}<span>نُشر ${esc(fmtDate(r.published_at))}</span>${r.updated_at && fmtDate(r.updated_at) !== fmtDate(r.published_at) ? `<span>حُدّث ${esc(fmtDate(r.updated_at))}</span>` : ""}</div>
      <h1>${esc(r.title)}</h1>
      <div class="rs-body">${esc(r.summary)}</div>
      ${g ? `<p class="rs-gnote">درجة الثقة ${r.grade} (${g.t}): ${esc(g.d)}.</p>` : ""}
      <p class="muted small" style="margin:14px 0 0">عندك سؤال أو معلومة جديدة عن هالموضوع؟ ابعتيها لسند على تليجرام.</p>
    </article>`;
}

export async function mount(ctx) {
  useStyle("research", CSS);
  const el = ctx.el;
  el.innerHTML = `<p class="muted">جارِ التحميل…</p>`;
  const rows = await loadBriefs(ctx);
  if (!ctx.isCurrent()) return;
  const slug = decodeURIComponent(ctx.path || "").replace(/\/+$/, "");
  if (slug) {
    el.innerHTML = docHTML(ctx, rows.find((r) => r.slug === slug));
    return;
  }
  const draw = () => { el.innerHTML = listHTML(ctx, rows); };
  draw();
  el.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-s]"); if (!b) return;
    filter.sector = b.dataset.s; draw();
  });
}
