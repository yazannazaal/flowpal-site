// Module "companies": every company we talk to, per product (the AI employee, online stores, ...).
//   #/companies              list: search, filter by product / status / sector, «مستبعدة» archive
//   #/companies/new          add a company (duplicate check: refused -> the existing one opens; possible -> «نفس الشركة؟»)
//   #/companies/<id>         company page: contacts, status + follow-up per product, notes, Omar's summary, history
//   #/companies/<id>/edit    edit contact fields (same duplicate check)
// Data: rpc hub_companies / hub_company / hub_lead_create / hub_lead_update / hub_set_status / hub_set_products /
// hub_add_note / hub_follow_up (database functions). Omar's stage is never written from here: every
// change is queued for him (hub_lead_events). ?demo: demo/hub-sales.js.
import { $, esc, toast, useStyle } from "../lib.js";
import * as P from "../shared/pipeline.js";

const PAGE = 40;
const MATCH = { instagram: "نفس Instagram", facebook: "نفس Facebook", website: "نفس الموقع", phone: "نفس الرقم", name: "نفس الاسم" };
const EVENT = {
  lead_created: "انضافت الشركة", lead_updated: "تعديل بيانات الشركة", status: "تغيير الحالة", note: "ملاحظة",
  contacted: "تواصل", postponed: "تأجيل المتابعة", follow_up_set: "موعد متابعة", products: "تعديل المنتجات",
  task_done: "مهمة خلصت", possible_duplicate: "انضافت رغم شبهها بشركة ثانية (عمر بيراجع)", client_claimed: "سُجّلت عميل (بانتظار تأكيد الإدارة)",
};
const SENDER = { owner: "صاحب المحل", staff: "موظف" };
const sender = (s) => SENDER[s] || P.who(s);

const CSS = P.CSS + `
.co-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}
.co-add{white-space:nowrap;text-decoration:none;display:inline-flex;align-items:center;gap:6px}
.co-find{display:grid;gap:8px;margin-bottom:10px}
.co-find .sel{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.co-find select{padding:8px 6px;font-size:14px}
.co-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.co-item a{display:block;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:12px 14px;text-decoration:none;color:inherit}
.co-item a:hover{border-color:var(--ink)}
.co-item .nm{font:600 16px/1.35 var(--f-head);overflow-wrap:anywhere}
.co-item .where{font-size:13px;color:var(--muted)}
.co-item .ps{display:grid;gap:4px;margin-top:8px}
.co-item .pr{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px}
.co-item .note{font-size:13px;color:var(--ink-3);margin-top:6px;overflow-wrap:anywhere;border:0;padding:0}
.co-item .note::before{display:none}
.co-more{display:block;margin:14px auto 0}
.co-top h1{overflow-wrap:anywhere}
.co-top .where{color:var(--muted);margin-top:2px}
.co-top .acts{display:flex;gap:6px;flex-wrap:wrap}
.co-banner{border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:14px;background:#FBF1DC;color:#5E4204}
.co-wrap{display:grid;gap:12px}
.co-kv{display:grid;grid-template-columns:96px 1fr;gap:6px 10px;margin:0;font-size:14.5px}
.co-kv dt{color:var(--muted);font-size:13px;padding-top:1px}
.co-kv dd{margin:0;min-width:0;overflow-wrap:anywhere}
.co-prod{border-top:1px solid var(--soft);padding-top:12px;margin-top:12px}
.co-prod:first-of-type{border-top:0;padding-top:0;margin-top:0}
.co-prod h3{font-size:15.5px;margin:0 0 6px;display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.co-prod .om{font-size:12.5px;color:var(--muted)}
.co-prod .stf{display:grid;grid-template-columns:1fr auto;gap:6px;margin-top:8px}
.co-prod .stf select{padding:8px 10px;font-size:15px}
.co-prod .stf input{grid-column:1 / -1;padding:8px 10px;font-size:15px}
.co-prod .fu{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin-top:10px;font-size:14px}
.co-prod .fu .btns{display:flex;flex-wrap:wrap;gap:6px;width:100%}
.co-prod .fu .btns button{flex:1 1 auto;padding:8px 10px}
.co-prod .last{font-size:12.5px;color:var(--muted);margin-top:4px}
.co-msgs{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:6px}
.co-msgs li{background:var(--soft);border-radius:10px;padding:7px 10px;font-size:14px;max-width:92%;overflow-wrap:anywhere;white-space:pre-wrap}
.co-msgs li.out{justify-self:end;background:#E7F7F4}
.co-msgs .who{display:block;font-size:11.5px;color:var(--muted);white-space:normal}
.co-notes{list-style:none;margin:10px 0 0;padding:0}
.co-notes li{border-top:1px solid var(--soft);padding:8px 0;font-size:14.5px}
.co-notes li p{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}
.co-notes .meta,.co-hist .meta{font-size:12px;color:var(--muted)}
.co-hist{list-style:none;margin:0;padding:0;font-size:14px}
.co-hist li{padding:6px 0;border-top:1px solid var(--soft)}
.co-hist li:first-child{border-top:0}
.co-noteform{display:grid;gap:6px}
.co-noteform .row{display:grid;grid-template-columns:1fr auto;gap:6px}
.co-noteform select{padding:8px;font-size:14px}
.co-form{max-width:640px}
.co-form fieldset{border:0;margin:0;padding:0}
.co-form legend{font:600 15px var(--f-head);margin:14px 0 2px;padding:0}
.co-form .checks{display:grid;gap:6px;margin-top:6px}
.co-form .checks label{display:flex;align-items:center;gap:10px;background:var(--card);border:1px solid var(--line);border-radius:8px;padding:10px 12px;font-size:15px;cursor:pointer}
.co-form .checks input{width:20px;height:20px;accent-color:var(--teal)}
.co-form .submit{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:16px}
.co-form .submit .btn{padding:12px}
.co-form .req{color:#A8322C}
.co-dup{border:1px solid #E6C77A;background:#FFF9EA;border-radius:var(--radius);padding:12px 14px;margin-top:12px}
.co-dup h2{font-size:16px;margin-bottom:6px}
.co-dup ul{margin:6px 0;padding-inline-start:18px}
.co-dup .btns{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
@media (min-width:700px){ .co-find{grid-template-columns:1fr minmax(0,1.3fr)} .co-form .two3{display:grid;grid-template-columns:1fr 1fr;gap:0 10px} }
@media (min-width:900px){ .co-list{grid-template-columns:repeat(2,minmax(0,1fr))} .co-wrap{grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);align-items:start} .co-col{display:grid;gap:12px;align-content:start} }
@media (max-width:899px){ .co-col{display:contents} .co-wrap > .co-col > .panel{order:9} .co-wrap .o1{order:1} .co-wrap .o2{order:2} .co-wrap .o3{order:3} }`;

/* ---------- list ---------- */
const state = { q: "", product: "", status: "", sector: "", seg: "active", shown: PAGE };
let flash = null;   // one message shown on the next company page (e.g. «موجودة من قبل»)

const searchKey = (c) => [c.lead_id, c.business_name, P.sectorText(c.sector), c.category, c.governorate, c.instagram, c.facebook, c.website,
  c.phone, P.localPhone(c.phone), c.contact_person].filter(Boolean).join(" ").toLowerCase();

function sortKey(c, t) {
  const open = (c.products || []).filter(P.openFollowUp).map((p) => p.next_follow_up).sort()[0];
  return [open && open <= t ? 0 : 1, open || "9999", -(new Date(c.last_update_at || 0).getTime())];
}

function itemHTML(c, t) {
  const where = [P.sectorText(c.sector), c.category, c.governorate].filter(Boolean).join(" · ");
  const ps = (c.products || []).map((p) => `<span class="pr"><span class="pl-prod">${esc(p.label)}</span>${P.statusChip(p)}${P.openFollowUp(p) ? `<span class="pl-due ${P.dueClass(p.next_follow_up, t)}">${esc(P.dueText(p.next_follow_up, t))}</span>` : ""}</span>`).join("");
  const n = c.last_note && c.last_note.body ? `<p class="note">${esc(c.last_note.body.length > 110 ? c.last_note.body.slice(0, 109) + "…" : c.last_note.body)}</p>` : "";
  return `<li class="co-item"><a href="#/companies/${Number(c.lead_id)}"><div class="nm">${esc(c.business_name)}</div>${where ? `<div class="where">${esc(where)}</div>` : ""}<div class="ps">${ps}</div>${n}</a></li>`;
}

function listView(ctx, rows, products) {
  const t = P.today();
  const el = ctx.el;
  const active = rows.filter((c) => !P.isArchived(c)), archived = rows.filter(P.isArchived);
  const sectors = [...new Set(rows.map((c) => c.sector).filter(Boolean))];
  el.innerHTML = `<div class="co-head"><h1>الشركات</h1><a class="btn co-add" href="#/companies/new">+ شركة جديدة</a></div>
    <div class="filters" role="group" aria-label="القائمة" id="coSeg">
      <button class="fbtn" type="button" data-seg="active" aria-pressed="${state.seg === "active"}">الشركات (${active.length})</button>
      <button class="fbtn" type="button" data-seg="archive" aria-pressed="${state.seg === "archive"}">مستبعدة (${archived.length})</button></div>
    <div class="co-find">
      <label class="sr" for="coQ">بحث</label><input class="i" id="coQ" type="search" placeholder="ابحثي بالاسم أو الرقم أو المدينة أو Instagram" value="${esc(state.q)}">
      <div class="sel">
        <label class="sr" for="coProd">المنتج</label><select class="i" id="coProd"><option value="">كل المنتجات</option>${products.map((p) => `<option value="${esc(p.id)}" ${state.product === p.id ? "selected" : ""}>${esc(p.short)}</option>`).join("")}</select>
        <label class="sr" for="coStatus">الحالة</label><select class="i" id="coStatus"><option value="">كل الحالات</option>${P.STATUS_ORDER.map((s) => `<option value="${s}" ${state.status === s ? "selected" : ""}>${P.STATUS[s].t}</option>`).join("")}</select>
        <label class="sr" for="coSector">القطاع</label><select class="i" id="coSector"><option value="">كل القطاعات</option>${sectors.map((s) => `<option value="${esc(s)}" ${state.sector === s ? "selected" : ""}>${esc(P.sectorText(s))}</option>`).join("")}</select>
      </div>
    </div>
    <p class="muted small" id="coHits" style="margin:0 0 8px"></p>
    <div id="coList"></div>`;
  const keys = new Map(rows.map((c) => [c.lead_id, searchKey(c)]));
  const draw = () => {
    const q = state.q.trim().toLowerCase();
    const base = state.seg === "archive" ? archived : active;
    const hits = base.filter((c) => {
      if (q && !keys.get(c.lead_id).includes(q)) return false;
      if (state.sector && c.sector !== state.sector) return false;
      const ps = (c.products || []).filter((p) => !state.product || p.product === state.product);
      if (!ps.length) return false;
      if (state.status && !ps.some((p) => p.status === state.status)) return false;
      return true;
    }).map((c) => [sortKey(c, t), c]).sort((a, b) => a[0][0] - b[0][0] || a[0][1].localeCompare(b[0][1]) || a[0][2] - b[0][2]).map((x) => x[1]);
    $("#coHits", el).textContent = `${hits.length} شركة`;
    $("#coList", el).innerHTML = hits.length
      ? `<ul class="co-list">${hits.slice(0, state.shown).map((c) => itemHTML(c, t)).join("")}</ul>` +
        (hits.length > state.shown ? `<button class="btn-line co-more" type="button" id="coMore">عرض المزيد (${hits.length - state.shown})</button>` : "")
      : `<div class="empty">${state.seg === "archive" ? "ما في شركات مستبعدة بهالفلتر." : "ما في شركات بهالفلتر."}</div>`;
  };
  draw();
  let tm = null;
  el.addEventListener("input", (e) => { if (e.target.id !== "coQ") return; state.q = e.target.value; clearTimeout(tm); tm = setTimeout(() => { state.shown = PAGE; draw(); }, 150); });
  el.addEventListener("change", (e) => {
    const m = { coProd: "product", coStatus: "status", coSector: "sector" }[e.target.id];
    if (m) { state[m] = e.target.value; state.shown = PAGE; draw(); }
  });
  el.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.seg) { state.seg = b.dataset.seg; state.shown = PAGE; el.querySelectorAll("#coSeg button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); draw(); }
    if (b.id === "coMore") { state.shown += PAGE; draw(); }
  });
}

/* ---------- company page ---------- */
function eventText(h, products) {
  const p = h.product ? (products.find((x) => x.id === h.product) || {}).short : "";
  let t = EVENT[h.kind] || "تحديث";
  const pl = h.payload || {};
  if ((h.kind === "status" || h.kind === "client_claimed") && pl.to) t = `الحالة: ${(P.STATUS[pl.from] || {}).t || "—"} ← ${(P.STATUS[pl.to] || {}).t || pl.to}`;
  if ((h.kind === "contacted" || h.kind === "postponed" || h.kind === "follow_up_set") && pl.next) t += ` · المتابعة ${P.shortDay(pl.next)}`;
  if (h.kind === "contacted" && pl.channel) t += ` · ${P.CHANNEL[pl.channel] || pl.channel}`;
  if (h.kind === "products" && Array.isArray(pl.products)) t += ": " + pl.products.map((x) => (products.find((y) => y.id === x) || {}).short || x).join("، ");
  if (h.kind === "lead_updated" && pl.before && pl.after) {
    const ch = Object.keys(pl.after).filter((k) => String(pl.before[k] ?? "") !== String(pl.after[k] ?? ""));
    const L = { business_name: "الاسم", sector: "القطاع", category: "التصنيف", governorate: "المحافظة", phone: "الرقم", instagram: "Instagram", facebook: "Facebook", website: "الموقع" };
    if (ch.length) t += ": " + ch.map((k) => L[k] || k).join("، ");
  }
  return (p ? p + " · " : "") + t;
}

function productBlock(c, p) {
  const t = P.today();
  const omar = p.product === "ai_employee" && c.in_outreach && c.omar_stage
    ? `<div class="om">حسب عمر: ${esc(P.OMAR_STAGE[c.omar_stage] || c.omar_stage)}${p.status_source === "dania" ? " (الحالة هون من تحديثك)" : ""}</div>` : "";
  if (p.status === "skipped") {
    return `<div class="co-prod" data-prod="${esc(p.product)}"><h3>${esc(p.label)} ${P.statusChip(p)}</h3>${omar}<p class="muted small" style="margin:4px 0 0">استبعدها عمر قبل التواصل. إذا بدك نتواصل معهم، اختاري حالة جديدة.</p>
      <div class="stf"><label class="sr" for="coSt-${esc(p.product)}">الحالة</label><select class="i" id="coSt-${esc(p.product)}">${P.STATUS_ORDER.map((s) => `<option value="${s}">${P.STATUS[s].t}</option>`).join("")}</select><button class="btn-line" type="button" data-save-status="${esc(p.product)}">حفظ</button></div></div>`;
  }
  const closed = P.CLOSED.includes(p.status);
  return `<div class="co-prod" data-prod="${esc(p.product)}">
    <h3>${esc(p.label)} ${P.statusChip(p)}</h3>${omar}
    <div class="stf"><label class="sr" for="coSt-${esc(p.product)}">غيّري الحالة</label>
      <select class="i" id="coSt-${esc(p.product)}">${P.STATUS_ORDER.map((s) => `<option value="${s}" ${p.status === s ? "selected" : ""}>${P.STATUS[s].t}</option>`).join("")}</select>
      <button class="btn-line" type="button" data-save-status="${esc(p.product)}">حفظ</button>
      <input class="i hidden" id="coStN-${esc(p.product)}" type="text" maxlength="500" placeholder="ملاحظة مع التغيير (اختياري)"></div>
    <div class="fu"><span>المتابعة الجاية: ${p.next_follow_up ? `<b>${esc(P.shortDay(p.next_follow_up))}</b> <span class="pl-due ${closed ? "" : P.dueClass(p.next_follow_up, t)}">${closed ? "" : esc(P.dueText(p.next_follow_up, t))}</span>` : `<span class="muted">ما في موعد</span>`}</span>
      <span class="btns"><button class="btn" type="button" data-fu="contacted" data-p="${esc(p.product)}">تواصلت</button><button class="btn-line" type="button" data-fu="postponed" data-p="${esc(p.product)}">أجّل</button><button class="btn-line" type="button" data-fu="set" data-p="${esc(p.product)}">حدّدي تاريخ</button></span></div>
    ${p.last_contacted_at ? `<div class="last">آخر تواصل: ${esc(P.when(p.last_contacted_at))}${p.last_channel ? " · " + esc(P.CHANNEL[p.last_channel] || p.last_channel) : ""}</div>` : ""}
  </div>`;
}

function companyHTML(ctx, c, products) {
  const where = [P.sectorText(c.sector), c.category, c.governorate].filter(Boolean).join(" · ");
  const linked = new Set((c.products || []).map((p) => p.product));
  const contact = [
    c.contact_person ? ["الشخص", esc(c.contact_person) + (c.contact_role ? ` <span class="muted">(${esc(c.contact_role)})</span>` : "")] : null,
    c.phone ? ["الرقم", `<a class="ltr" href="tel:+${esc(String(c.phone).replace(/\D/g, ""))}">${esc(P.localPhone(c.phone))}</a>`] : null,
    P.contactLinks(c).length ? ["الروابط", P.linksHTML(c)] : null,
    c.preferred_channel ? ["القناة المفضلة", esc(P.CHANNEL[c.preferred_channel] || c.preferred_channel)] : null,
    c.assignee ? ["مع مين", esc(P.who(c.assignee))] : null,
  ].filter(Boolean);
  const msgs = (c.messages || []).slice(0, 6).reverse();
  const tasks = c.open_tasks || [];
  return `<a class="back" href="${ctx.base}">→ كل الشركات</a>
    ${flash ? `<div class="co-banner" role="status">${esc(flash)}</div>` : ""}
    <div class="page-head co-top"><div><h1>${esc(c.business_name)}</h1>${where ? `<div class="where">${esc(where)}</div>` : ""}</div>
      <div class="acts"><a class="btn-line" href="${ctx.base}/${Number(c.lead_id)}/edit" style="text-decoration:none">تعديل البيانات</a></div></div>
    <div class="co-wrap"><div class="co-col">
      <section class="panel o1"><h2>الحالة والمتابعة</h2>
        ${(c.products || []).length ? c.products.map((p) => productBlock(c, p)).join("") : `<div class="empty">هالشركة مش مربوطة بأي منتج.</div>`}
        <details style="margin-top:12px"><summary class="small" style="cursor:pointer;color:var(--teal-ink)">المنتجات اللي مهتمين فيها</summary>
          <form id="coProds" class="co-form" style="max-width:none"><div class="checks">${products.map((p) => `<label><input type="checkbox" name="prod" value="${esc(p.id)}" ${linked.has(p.id) ? "checked" : ""}> ${esc(p.label)}</label>`).join("")}</div>
          <div class="err" id="coProdsErr" role="alert"></div><button class="btn-line" type="submit">حفظ المنتجات</button></form></details>
      </section>
      <section class="panel"><h2>الملاحظات</h2>
        <form class="co-noteform" id="coNote" novalidate><label class="sr" for="coNoteT">ملاحظة جديدة</label>
          <textarea class="i" id="coNoteT" rows="2" maxlength="4000" placeholder="اكتبي ملاحظة عن آخر تواصل"></textarea>
          <div class="row"><label class="sr" for="coNoteP">عن أي منتج</label><select class="i" id="coNoteP"><option value="">عامة</option>${(c.products || []).map((p) => `<option value="${esc(p.product)}">${esc(p.label)}</option>`).join("")}</select><button class="btn" type="submit" id="coNoteB">إضافة</button></div>
          <div class="err" id="coNoteErr" role="alert"></div></form>
        ${(c.notes || []).length ? `<ul class="co-notes">${c.notes.map((n) => `<li><p>${esc(n.body)}</p><span class="meta">${esc(P.who(n.author))} · ${esc(P.when(n.at))}${n.product ? " · " + esc((products.find((x) => x.id === n.product) || {}).short || "") : ""}</span></li>`).join("")}</ul>` : `<p class="muted small" style="margin:8px 0 0">لسا ما في ملاحظات.</p>`}
      </section>
    </div><div class="co-col">
      <section class="panel o2"><h2>التواصل</h2>${contact.length ? `<dl class="co-kv">${contact.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>` : `<p class="muted small" style="margin:0">ما في بيانات تواصل.</p>`}</section>
      ${c.in_outreach ? `<section class="panel o3"><h2>ملخص عمر</h2>
        <p style="margin:0 0 4px" class="small"><span class="pl-st">${esc(P.OMAR_STAGE[c.omar_stage] || c.omar_stage || "")}</span></p>
        ${c.omar_summary ? `<p style="margin:6px 0 0;white-space:pre-wrap;overflow-wrap:anywhere">${esc(c.omar_summary)}</p>` : `<p class="muted small" style="margin:6px 0 0">لسا ما في ملخص.</p>`}
        ${msgs.length ? `<h3 class="small muted" style="margin:12px 0 0;font-weight:600">آخر الرسائل</h3><ul class="co-msgs">${msgs.map((m) => `<li class="${m.direction === "out" ? "out" : "in"}"><span class="who">${m.direction === "out" ? "منا" : "منهم"} (${esc(sender(m.sender) || "")}) · ${esc(P.when(m.sent_at))}</span>${esc(m.body)}</li>`).join("")}</ul>` : ""}
      </section>` : ""}
      ${tasks.length ? `<section class="panel"><h2>مهام مفتوحة</h2><ul class="co-hist">${tasks.map((k) => `<li><b>${esc(k.title)}</b><div class="meta">${esc(P.who(k.assignee))} · ${esc(P.dueText(k.due_date))}${k.goal ? " · الهدف: " + esc(k.goal) : ""}</div></li>`).join("")}</ul></section>` : ""}
      <section class="panel"><h2>تاريخ التغييرات</h2>${(c.history || []).length ? `<ul class="co-hist">${c.history.map((h) => `<li>${esc(eventText(h, products))}<div class="meta">${esc(P.who(h.actor))} · ${esc(P.when(h.at))}</div></li>`).join("")}</ul>` : `<p class="muted small" style="margin:0">لسا ما في تغييرات من هون.</p>`}
        <p class="muted small" style="margin:10px 0 0">كل تغيير هون بيوصل لعمر، وهو بيحدّث أرقامه.</p></section>
    </div></div>`;
}

async function companyView(ctx, id, products) {
  const api = P.api(ctx);
  const el = ctx.el;
  let c;
  try { c = await api.company(id); }
  catch (err) {
    if (err && (err.code === "P0002" || /not found/i.test(err.message || ""))) { el.innerHTML = `<a class="back" href="${ctx.base}">→ كل الشركات</a><div class="empty">هالشركة مش موجودة.</div>`; return; }
    throw err;
  }
  if (!ctx.isCurrent()) return;
  const draw = () => { el.innerHTML = companyHTML(ctx, c, products); flash = null; };
  draw();
  const reload = async (msg) => { c = await api.company(id); if (ctx.isCurrent()) { draw(); if (msg) toast(msg); } };

  el.addEventListener("change", (e) => {
    const s = e.target.closest("select[id^='coSt-']"); if (!s) return;
    const n = $("#coStN-" + s.id.slice(5), el); if (n) n.classList.remove("hidden");   // product ids are [a-z0-9_]
  });
  el.addEventListener("click", async (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.saveStatus) {
      const prod = b.dataset.saveStatus;
      const v = $(`#coSt-${prod}`, el).value;
      const n = $(`#coStN-${prod}`, el);
      b.disabled = true;
      try { await api.setStatus(id, prod, v, n ? n.value.trim() : ""); await reload(v === "client" ? "انحفظت: عميل (بانتظار تأكيد الإدارة)" : "انحفظت الحالة"); }
      catch (err) { b.disabled = false; toast("ما انحفظت: " + P.hubErr(err)); }
    } else if (b.dataset.fu) {
      const r = await P.followUpSheet(ctx, c, b.dataset.p, b.dataset.fu);
      if (r) await reload(b.dataset.fu === "contacted" ? "انحفظ التواصل" : "انحفظ الموعد");
    }
  });
  el.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (e.target.id === "coNote") {
      const body = $("#coNoteT", el).value.trim();
      if (!body) { $("#coNoteErr", el).textContent = "اكتبي الملاحظة."; return; }
      $("#coNoteB", el).disabled = true;
      try { await api.addNote(id, body, $("#coNoteP", el).value || null); await reload("انضافت الملاحظة"); }
      catch (err) { $("#coNoteErr", el).textContent = "ما انحفظت: " + P.hubErr(err); $("#coNoteB", el).disabled = false; }
    } else if (e.target.id === "coProds") {
      const list = [...e.target.querySelectorAll("input[name=prod]:checked")].map((x) => x.value);
      if (!list.length) { $("#coProdsErr", el).textContent = "اختاري منتج واحد على الأقل."; return; }
      try { await api.setProducts(id, list); await reload("انحفظت المنتجات"); }
      catch (err) { $("#coProdsErr", el).textContent = "ما انحفظت: " + P.hubErr(err); }
    }
  });
}

/* ---------- add / edit form ---------- */
const FIELDS = ["business_name", "sector", "category", "governorate", "phone", "instagram", "facebook", "website", "contact_person", "contact_role", "preferred_channel"];
const igShow = (v) => { const s = String(v || "").trim(); const m = s.match(/instagram\.com\/([^/?#]+)/i); return m ? m[1] : s.replace(/^@/, ""); };
const cleanPhone = (v) => { let d = String(v || "").replace(/\D/g, ""); if (d.startsWith("00")) d = d.slice(2); if (d.startsWith("0") && d.length === 10) d = "970" + d.slice(1); return d || ""; };
const norm = (k, v) => k === "phone" ? cleanPhone(v) : k === "instagram" ? igShow(v).toLowerCase() : String(v ?? "").trim();

function formHTML(ctx, c, products, mode) {
  const v = (k) => esc(c ? (k === "phone" ? P.localPhone(c.phone) : k === "instagram" ? igShow(c.instagram) : c[k] ?? "") : "");
  const sectors = [...P.NEW_SECTORS];
  if (c && c.sector && !sectors.includes(c.sector)) sectors.push(c.sector);
  const t = P.today();
  return `<a class="back" href="${mode === "new" ? ctx.base : `${ctx.base}/${Number(c.lead_id)}`}">→ ${mode === "new" ? "كل الشركات" : "رجوع للشركة"}</a>
  <form class="co-form" id="coForm" novalidate>
    <h1>${mode === "new" ? "شركة جديدة" : "تعديل بيانات " + esc(c.business_name)}</h1>
    ${mode === "new" ? `<p class="muted small" style="margin:4px 0 0">قبل الحفظ بنفحص إذا الشركة موجودة عنا، فما في داعي تفتّشي.</p>` : ""}
    <fieldset><legend>الشركة</legend>
      <label class="f" for="fName">اسم الشركة <span class="req">*</span></label><input class="i" id="fName" name="business_name" maxlength="200" required value="${v("business_name")}">
      <div class="two3">
        <div><label class="f" for="fSector">القطاع <span class="req">*</span></label><select class="i" id="fSector" name="sector" required><option value="">اختاري</option>${sectors.map((s) => `<option value="${esc(s)}" ${c && c.sector === s ? "selected" : ""}>${esc(P.sectorText(s))}</option>`).join("")}</select></div>
        <div><label class="f" for="fCat">التصنيف</label><input class="i" id="fCat" name="category" maxlength="80" placeholder="مثلاً: ملابس، أسنان، حلويات" value="${v("category")}"></div>
      </div>
      <label class="f" for="fGov">المحافظة</label><input class="i" id="fGov" name="governorate" list="fGovs" maxlength="60" value="${v("governorate")}"><datalist id="fGovs">${P.GOVS.map((g) => `<option value="${esc(g)}">`).join("")}</datalist>
    </fieldset>
    <fieldset><legend>التواصل <span class="muted small" style="font:400 13px var(--f-body)">(وحدة على الأقل)</span></legend>
      <div class="two3">
        <div><label class="f" for="fPhone">رقم واتساب / هاتف</label><input class="i ltr" id="fPhone" name="phone" type="tel" inputmode="tel" placeholder="059xxxxxxx" value="${v("phone")}"></div>
        <div><label class="f" for="fIg">Instagram</label><input class="i ltr" id="fIg" name="instagram" autocapitalize="off" placeholder="shop.ps" value="${v("instagram")}"></div>
        <div><label class="f" for="fFb">Facebook</label><input class="i ltr" id="fFb" name="facebook" autocapitalize="off" placeholder="رابط الصفحة" value="${v("facebook")}"></div>
        <div><label class="f" for="fWeb">الموقع</label><input class="i ltr" id="fWeb" name="website" autocapitalize="off" placeholder="example.com" value="${v("website")}"></div>
        <div><label class="f" for="fPerson">الشخص اللي بنحكي معه</label><input class="i" id="fPerson" name="contact_person" maxlength="120" value="${v("contact_person")}"></div>
        <div><label class="f" for="fRole">صفته</label><input class="i" id="fRole" name="contact_role" maxlength="80" placeholder="مثلاً: صاحب المحل" value="${v("contact_role")}"></div>
      </div>
      <label class="f" for="fCh">القناة المفضلة</label><select class="i" id="fCh" name="preferred_channel"><option value="">—</option>${Object.entries(P.CHANNEL).map(([k, x]) => `<option value="${k}" ${c && c.preferred_channel === k ? "selected" : ""}>${x}</option>`).join("")}</select>
    </fieldset>
    ${mode === "new" ? `<fieldset><legend>المنتجات اللي مهتمين فيها <span class="req">*</span></legend>
      <div class="checks">${products.map((p) => `<label><input type="checkbox" name="prod" value="${esc(p.id)}"> ${esc(p.label)}</label>`).join("")}</div></fieldset>
      <div class="two3">
        <div><label class="f" for="fStatus">الحالة</label><select class="i" id="fStatus" name="status">${P.STATUS_ORDER.map((s) => `<option value="${s}">${P.STATUS[s].t}</option>`).join("")}</select></div>
        <div><label class="f" for="fNext">موعد المتابعة</label><input class="i" id="fNext" name="next_follow_up" type="date" min="${t}"></div>
      </div>
      <label class="f" for="fNote">ملاحظة</label><textarea class="i" id="fNote" name="note" rows="3" maxlength="4000" placeholder="شو حكيتوا؟ شو بدهم؟"></textarea>` : ""}
    <div class="err" id="coErr" role="alert"></div>
    <div id="coDup"></div>
    <div class="submit"><button class="btn" type="submit" id="coSave">${mode === "new" ? "حفظ الشركة" : "حفظ التعديل"}</button><a class="btn-line" href="${mode === "new" ? ctx.base : `${ctx.base}/${Number(c.lead_id)}`}" style="text-decoration:none;display:grid;place-items:center">إلغاء</a></div>
  </form>`;
}

function dupHTML(ctx, dups, kind, mode) {
  const li = dups.map((d) => `<li><a href="${ctx.base}/${Number(d.lead_id)}">${esc(d.business_name)}</a> <span class="muted small">(${(d.match || []).map((m) => MATCH[m] || m).join("، ")})</span></li>`).join("");
  if (kind === "strong") {
    return `<div class="co-dup" role="alert"><h2>هالشركة موجودة عنا</h2><ul>${li}</ul><p class="small" style="margin:0">${mode === "new" ? "ما انضافت مرة ثانية." : "ما انحفظ التعديل، لأن هالبيانات لشركة ثانية."}</p>
      <div class="btns"><a class="btn" href="${ctx.base}/${Number(dups[0].lead_id)}" style="text-decoration:none">افتحي ${esc(dups[0].business_name)}</a></div></div>`;
  }
  return `<div class="co-dup" role="alert"><h2>نفس الشركة؟</h2><p class="small" style="margin:0">في شركة عنا بتشبهها:</p><ul>${li}</ul>
    <div class="btns"><a class="btn-line" href="${ctx.base}/${Number(dups[0].lead_id)}" style="text-decoration:none">نعم، نفسها: افتحيها</a>
    <button class="btn" type="button" id="coForce">لا، شركة ثانية: ${mode === "new" ? "أضيفيها" : "احفظي"}</button></div></div>`;
}

async function formView(ctx, products, id) {
  const api = P.api(ctx);
  const el = ctx.el;
  const mode = id ? "edit" : "new";
  let c = null;
  if (id) {
    try { c = await api.company(id); } catch (err) {
      if (err && err.code === "P0002") { el.innerHTML = `<a class="back" href="${ctx.base}">→ كل الشركات</a><div class="empty">هالشركة مش موجودة.</div>`; return; }
      throw err;
    }
    if (!ctx.isCurrent()) return;
  }
  el.innerHTML = formHTML(ctx, c, products, mode);
  const f = $("#coForm", el);
  const val = (n) => { const x = f.elements[n]; return x ? String(x.value || "").trim() : ""; };

  const payload = () => {
    if (mode === "new") {
      const p = {};
      FIELDS.forEach((k) => { if (val(k)) p[k] = val(k); });
      p.products = [...f.querySelectorAll("input[name=prod]:checked")].map((x) => x.value);
      p.status = val("status") || "new";
      if (val("next_follow_up")) p.next_follow_up = val("next_follow_up");
      if (val("note")) p.note = val("note");
      return p;
    }
    const p = {};
    FIELDS.forEach((k) => { if (norm(k, val(k)) !== norm(k, c[k])) p[k] = val(k); });
    return p;
  };
  const check = (p) => {
    if (mode === "new" || "business_name" in p) { if (!val("business_name")) return ["fName", "اكتبي اسم الشركة."]; }
    if (!val("sector")) return ["fSector", "اختاري القطاع."];
    if (!val("phone") && !val("instagram") && !val("facebook") && !val("website")) return ["fPhone", "لازم وسيلة تواصل وحدة على الأقل: رقم، Instagram، Facebook أو موقع."];
    if (val("phone") && cleanPhone(val("phone")).length < 9) return ["fPhone", "رقم الهاتف مش واضح."];
    if (mode === "new" && !p.products.length) return [null, "اختاري منتج واحد على الأقل."];
    if (mode === "new" && p.next_follow_up && p.next_follow_up < P.today()) return ["fNext", "التاريخ لازم يكون اليوم أو بعده."];
    return null;
  };

  const send = async (force) => {
    const p = payload();
    const bad = check(p);
    $("#coDup", el).innerHTML = "";
    if (bad) { $("#coErr", el).textContent = bad[1]; if (bad[0]) $("#" + bad[0], el).focus(); return; }
    if (mode === "edit" && !Object.keys(p).length) { toast("ما في تغيير"); location.hash = `${ctx.base}/${id}`; return; }
    if (force) p.force = true;
    $("#coErr", el).textContent = ""; $("#coSave", el).disabled = true;
    try {
      const r = mode === "new" ? await api.create(p) : await api.update(id, p);
      if (!ctx.isCurrent()) return;
      if (r && (r.created || r.updated)) {
        toast(mode === "new" ? "انضافت الشركة" : "انحفظ التعديل");
        location.hash = `${ctx.base}/${Number(mode === "new" ? r.lead_id : id)}`;
        return;
      }
      const dups = (r && r.duplicates) || [];
      const strong = dups.filter((d) => d.strong);
      if (mode === "new" && r && r.reason === "duplicate" && strong.length) {
        flash = `هالشركة موجودة عنا من قبل (${(strong[0].match || []).map((m) => MATCH[m] || m).join("، ")})، فتحنالك صفحتها. ما انضاف إشي جديد.`;
        location.hash = `${ctx.base}/${Number(strong[0].lead_id)}`;
        return;
      }
      $("#coDup", el).innerHTML = strong.length ? dupHTML(ctx, strong, "strong", mode) : dupHTML(ctx, dups, "weak", mode);
      $("#coDup", el).scrollIntoView({ block: "center" });
      $("#coSave", el).disabled = false;
    } catch (err) {
      $("#coErr", el).textContent = "ما انحفظ: " + P.hubErr(err);
      $("#coSave", el).disabled = false;
    }
  };
  f.addEventListener("submit", (e) => { e.preventDefault(); send(false); });
  el.addEventListener("click", (e) => { if (e.target.closest("#coForce")) send(true); });
  if (mode === "new") $("#fName", el).focus();
}

/* ---------- mount ---------- */
export async function mount(ctx) {
  useStyle("companies", CSS);
  const el = ctx.el;
  const api = P.api(ctx);
  el.innerHTML = `<p class="muted">جارِ التحميل…</p>`;
  const products = await api.products();
  if (!ctx.isCurrent()) return;
  const path = String(ctx.path || "").replace(/\/+$/, "");
  if (path === "new") return formView(ctx, products, null);
  const m = path.match(/^(\d+)(\/edit)?$/);
  if (m) return m[2] ? formView(ctx, products, Number(m[1])) : companyView(ctx, Number(m[1]), products);
  if (path) { el.innerHTML = `<a class="back" href="${ctx.base}">→ كل الشركات</a><div class="empty">الصفحة مش موجودة.</div>`; return; }
  const rows = await api.companies();
  if (!ctx.isCurrent()) return;
  listView(ctx, rows, products);
}
