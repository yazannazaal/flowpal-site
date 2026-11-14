// Module "followups": who to contact today, per product. One tab per product (#/followups/<product>), lists
// «متأخرة» and «اليوم» (plus the next 7 days, folded). Actions: تواصلت (channel, note, next date) / أجّل (new date) /
// حدّدي تاريخ / open the company. Closed companies (client, not interested, skipped) never show.
// Data: rpc hub_companies + hub_products; writes rpc hub_follow_up only (no past dates, Asia/Hebron).
// ?demo: demo/hub-sales.js.
import { $, esc, toast, useStyle } from "../lib.js";
import * as P from "../shared/pipeline.js";

const CSS = P.CSS + `
.fu-head{margin-bottom:12px}
.fu-tabs{margin-bottom:14px}
.fu-sec{margin-bottom:16px}
.fu-sec > h2{display:flex;align-items:baseline;gap:8px;margin-bottom:8px}
.fu-sec > h2 .n{font:400 13px var(--f-body);color:var(--muted)}
.fu-sec.late > h2{color:#A8322C}
.fu-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.fu-item{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:12px 14px;min-width:0}
.fu-item.late{border-inline-start:4px solid #D2453F}
.fu-item .hd{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
.fu-item .nm{font:600 16px/1.35 var(--f-head);text-decoration:none;color:inherit;overflow-wrap:anywhere}
.fu-item .nm:hover{text-decoration:underline}
.fu-item .where{font-size:13px;color:var(--muted)}
.fu-item .tags{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin:6px 0}
.fu-item .last{font-size:12.5px;color:var(--muted)}
.fu-item .note{font-size:13.5px;color:var(--ink-3);margin:6px 0 0;overflow-wrap:anywhere}
.fu-item .acts{display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:6px;margin-top:10px}
.fu-item .acts button{padding:9px 6px;font-size:14px}
.fu-later summary{cursor:pointer;font:600 15px var(--f-head);margin-bottom:8px}
@media (min-width:900px){ .fu-list{grid-template-columns:repeat(2,minmax(0,1fr))} }`;

function itemHTML(c, p, t) {
  const late = p.next_follow_up < t;
  const where = [P.sectorText(c.sector), c.governorate].filter(Boolean).join(" · ");
  return `<li class="fu-item ${late ? "late" : ""}" data-id="${Number(c.lead_id)}">
    <div class="hd"><div><a class="nm" href="#/companies/${Number(c.lead_id)}">${esc(c.business_name)}</a>${where ? `<div class="where">${esc(where)}</div>` : ""}</div>${P.linksHTML(c)}</div>
    <div class="tags">${P.statusChip(p)}<span class="pl-due ${P.dueClass(p.next_follow_up, t)}">${esc(P.dueText(p.next_follow_up, t))}</span>
      ${c.contact_person ? `<span class="small">${esc(c.contact_person)}</span>` : ""}</div>
    ${p.last_contacted_at ? `<div class="last">آخر تواصل: ${esc(P.when(p.last_contacted_at))}${p.last_channel ? " · " + esc(P.CHANNEL[p.last_channel] || p.last_channel) : ""}</div>` : ""}
    ${c.last_note && c.last_note.body ? `<p class="note">${esc(c.last_note.body.length > 120 ? c.last_note.body.slice(0, 119) + "…" : c.last_note.body)}</p>` : ""}
    <div class="acts"><button class="btn" type="button" data-act="contacted">تواصلت</button><button class="btn-line" type="button" data-act="postponed">أجّل</button><button class="btn-line" type="button" data-act="set">تاريخ</button></div>
  </li>`;
}

export async function mount(ctx) {
  useStyle("followups", CSS);
  const el = ctx.el;
  const api = P.api(ctx);
  el.innerHTML = `<p class="muted">جارِ التحميل…</p>`;
  const products = await api.products();
  let rows = await api.companies();
  if (!ctx.isCurrent()) return;
  const want = String(ctx.path || "").replace(/\/+$/, "");
  let prod = products.some((p) => p.id === want) ? want : (products[0] || {}).id;

  const due = (product, t) => {
    const out = [];
    rows.forEach((c) => { const p = P.productOf(c, product); if (P.openFollowUp(p)) out.push([c, p]); });
    return out.sort((a, b) => a[1].next_follow_up.localeCompare(b[1].next_follow_up) || a[0].business_name.localeCompare(b[0].business_name, "ar"));
  };
  const draw = () => {
    const t = P.today(), week = P.addDays(t, 7);
    const all = due(prod, t);
    const late = all.filter(([, p]) => p.next_follow_up < t), now = all.filter(([, p]) => p.next_follow_up === t);
    const later = all.filter(([, p]) => p.next_follow_up > t && p.next_follow_up <= week);
    const count = (id) => due(id, t).filter(([, p]) => p.next_follow_up <= t).length;
    const list = (xs) => `<ul class="fu-list">${xs.map(([c, p]) => itemHTML(c, p, t)).join("")}</ul>`;
    el.innerHTML = `<div class="page-head fu-head"><div><h1>المتابعات اليومية</h1><span class="muted">${esc(P.longDay(t))}</span></div></div>
      <nav class="pl-seg fu-tabs" aria-label="المنتج" id="fuTabs">${products.map((p) => `<a href="${ctx.base}/${esc(p.id)}" data-prod="${esc(p.id)}" ${p.id === prod ? 'aria-current="page"' : ""}>${esc(p.short)}<span class="n">${count(p.id)}</span></a>`).join("")}</nav>
      ${late.length ? `<section class="fu-sec late"><h2>متأخرة <span class="n">${late.length}</span></h2>${list(late)}</section>` : ""}
      <section class="fu-sec" id="fuToday"><h2>اليوم <span class="n">${now.length}</span></h2>${now.length ? list(now) : `<div class="empty">${late.length ? "ما في متابعات لليوم غير المتأخرة." : "ما في متابعات لليوم بهالمنتج."}</div>`}</section>
      ${later.length ? `<details class="fu-sec fu-later"><summary>الأيام الجاية (${later.length})</summary>${list(later)}</details>` : ""}
      <p class="muted small">الموعد بينحدد من صفحة الشركة أو من هون. كل تواصل بيوصل لعمر.</p>`;
  };
  draw();

  el.addEventListener("click", async (e) => {
    const a = e.target.closest("#fuTabs a[data-prod]");
    if (a) {
      e.preventDefault(); prod = a.dataset.prod;
      history.replaceState(null, "", `${ctx.base}/${prod}`);   // keep the tab in the address without a re-mount
      draw(); return;
    }
    const b = e.target.closest("button[data-act]"); if (!b) return;
    const id = Number(b.closest(".fu-item").dataset.id);
    const c = rows.find((x) => x.lead_id === id); if (!c) return;
    const r = await P.followUpSheet(ctx, c, prod, b.dataset.act);
    if (!r) return;
    rows = await api.companies(true);
    if (!ctx.isCurrent()) return;
    draw();
    toast(b.dataset.act === "contacted" ? "انحفظ التواصل" : "انحفظ الموعد الجديد");
  });
}
