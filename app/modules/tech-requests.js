// Module "tech-requests": requests and problems between the technical team and the tech department,
// plus every open item in the subscribers' logs in one list.
// Data: tech_requests (RLS: hub_can('tech-requests')), subscriber_notes + subscribers (RLS: subscribers staff).
// ?demo: fake data in memory, nothing is saved.
import { $, esc, fmtDT, toast, useStyle, ok, errText } from "../lib.js";

const L = {
  kind: { request: "طلب", bug: "مشكلة", question: "سؤال" },
  noteKind: { note: "ملاحظة", issue: "مشكلة", change: "تعديل", request: "طلب" },
  status: { open: "مفتوح", in_progress: "قيد العمل", done: "منجز", wont_do: "لن يُنفَّذ" },
  priority: { high: "عاجل", normal: "عادي", low: "غير مستعجل" },
  team: { nader: "نادر", tarek: "طارق", heba: "هبة", fadi: "فادي" },
};

const CSS = `
.tr-grid{display:grid;gap:16px}
.tr-new{margin-bottom:14px}
.tr-new summary{list-style:none;cursor:pointer;display:inline-flex}
.tr-new summary::-webkit-details-marker{display:none}
.tr-new[open] summary{margin-bottom:4px}
.tr-new .panel{margin-top:10px}
.prio-high{font-size:12px;font-weight:600;color:#9B2C27;background:#FDECEA;border-radius:6px;padding:2px 8px}
.prio-low{font-size:12px;color:var(--muted)}
.tr-sub{font-weight:500}
.tr-count{font:600 13px/1 var(--f-body);color:var(--muted);margin-inline-start:6px}
@media (min-width:900px){ .tr-grid{grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);align-items:start} }`;

/* ===== Data ===== */
let demo = null;
function demoStore() {
  if (demo) return demo;
  const ago = (d, h = 0) => { const x = new Date(); x.setDate(x.getDate() - d); x.setHours(x.getHours() - h); return x.toISOString(); };
  const subs = [{ id: "demo-store", name: "متجر النخلة (تجريبي)" }, { id: "demo-clinic", name: "عيادة الريحان (تجريبي)" }, { id: "demo-cafe", name: "مقهى الزاوية (تجريبي)" }];
  let nid = 50;
  const reqs = [
    { id: 1, title: "تنبيه عند توقف workflow", body: "أريد رسالة على Telegram إذا توقف أي workflow لمشترك أكثر من 10 دقائق.", kind: "request", status: "in_progress", priority: "high", subscriber_id: null, requested_by: "أسماء", assigned_to: "tarek", ref: "task 004", created_at: ago(2), closed_at: null },
    { id: 2, title: "رسائل الستوري لا تصل للبوت", body: "ردود الستوري على Instagram لا تظهر في سجل المحادثات.", kind: "bug", status: "open", priority: "normal", subscriber_id: "demo-store", requested_by: "أسماء", assigned_to: null, ref: null, created_at: ago(0, 3), closed_at: null },
    { id: 3, title: "أين أجد سجل الأخطاء اليومي؟", body: null, kind: "question", status: "open", priority: "low", subscriber_id: null, requested_by: "أسماء", assigned_to: "heba", ref: null, created_at: ago(1), closed_at: null },
    { id: 4, title: "نسخة اختبار لبوت العيادة", body: "نسخة TEST منفصلة قبل التشغيل.", kind: "request", status: "done", priority: "normal", subscriber_id: "demo-clinic", requested_by: "نادر", assigned_to: "tarek", ref: "changelog", created_at: ago(6), closed_at: ago(4) },
  ];
  const notes = [
    { id: 3, subscriber_id: "demo-store", kind: "issue", title: "رقم لحاله ينقرأ كرقم منتج", status: "in_progress", author: "هبة", at: ago(1), ref: "exec 0000" },
    { id: 4, subscriber_id: "demo-store", kind: "request", title: "الرد على الستوري", status: "open", author: "أسماء", at: ago(0), ref: null },
    { id: 6, subscriber_id: "demo-clinic", kind: "request", title: "تجهيز رقم WhatsApp", status: "open", author: "نادر", at: ago(2), ref: null },
  ];
  demo = {
    async subscribers() { return subs; },
    async list() { return [...reqs].sort((a, b) => b.created_at.localeCompare(a.created_at)); },
    async add(r) { reqs.push({ ...r, id: ++nid, status: "open", created_at: new Date().toISOString(), closed_at: null }); },
    async setStatus(id, status) { const r = reqs.find((x) => x.id === id); if (r) { r.status = status; r.closed_at = (status === "done" || status === "wont_do") ? new Date().toISOString() : null; } },
    async openNotes() { return [...notes].sort((a, b) => b.at.localeCompare(a.at)); },
  };
  return demo;
}

function supaStore(sb) {
  return {
    async subscribers() {
      try { return ok(await sb.from("subscribers").select("id,name").order("name")); } catch { return []; }
    },
    async list() { return ok(await sb.from("tech_requests").select("*").order("created_at", { ascending: false }).limit(300)); },
    async add(r) { ok(await sb.from("tech_requests").insert(r)); },
    async setStatus(id, status) {
      const closed_at = (status === "done" || status === "wont_do") ? new Date().toISOString() : null;
      ok(await sb.from("tech_requests").update({ status, closed_at }).eq("id", id));
    },
    async openNotes() {
      try {
        return ok(await sb.from("subscriber_notes").select("id,subscriber_id,kind,title,status,author,at,ref")
          .in("status", ["open", "in_progress"]).order("at", { ascending: false }).limit(200));
      } catch { return null; }   // no access to the subscribers' logs: the panel says so
    },
  };
}

/* ===== Rendering ===== */
const filter = { status: "active", kind: "all" };
const isClosed = (s) => s === "done" || s === "wont_do";

function filterBtns() {
  const s = [["active", "المفتوحة"], ["closed", "المغلقة"], ["all", "الكل"]];
  const k = [["all", "الكل"], ["bug", "مشاكل"], ["request", "طلبات"], ["question", "أسئلة"]];
  return `<div class="filters" role="group" aria-label="الحالة">${s.map(([v, t]) => `<button class="fbtn" type="button" data-fs="${v}" aria-pressed="${filter.status === v}">${t}</button>`).join("")}</div>
    <div class="filters" role="group" aria-label="النوع">${k.map(([v, t]) => `<button class="fbtn" type="button" data-fk="${v}" aria-pressed="${filter.kind === v}">${t}</button>`).join("")}</div>`;
}

function subLink(ctx, names, sid) {
  if (!sid) return "";
  const name = names.get(sid) || sid;
  return ctx.hasModule("subscribers")
    ? `<a class="tr-sub" href="#/subscribers/s/${encodeURIComponent(sid)}">${esc(name)}</a>`
    : `<span class="tr-sub">${esc(name)}</span>`;
}

function reqsHTML(ctx, reqs, names) {
  const list = reqs.filter((r) =>
    (filter.kind === "all" || r.kind === filter.kind) &&
    (filter.status === "all" || (filter.status === "active" ? !isClosed(r.status) : isClosed(r.status))));
  if (!list.length) {
    return filter.status === "active" && filter.kind === "all"
      ? `<div class="empty">لا توجد طلبات مفتوحة. اكتب طلباً جديداً من الزر بالأعلى.</div>`
      : `<p class="muted small">لا يوجد شيء بهذا الفلتر.</p>`;
  }
  return `<ul class="tl">${list.map((r) => {
    const closed = isClosed(r.status);
    const id = Number(r.id);
    return `<li class="note k-${esc(r.kind)} ${closed ? "closed" : ""}">
      <div class="top"><span class="kind">${esc(L.kind[r.kind] || r.kind)}</span><span class="title">${esc(r.title)}</span>
        <span class="nstat ${esc(r.status)}">${esc(L.status[r.status] || r.status)}</span>
        ${r.priority === "high" ? `<span class="prio-high">${L.priority.high}</span>` : r.priority === "low" ? `<span class="prio-low">${L.priority.low}</span>` : ""}</div>
      ${r.body ? `<p class="body">${esc(r.body)}</p>` : ""}
      <div class="foot"><span>${esc(fmtDT(r.created_at))}</span><span>من ${esc(r.requested_by)}</span>
        <span>${r.assigned_to ? `عند ${esc(L.team[r.assigned_to] || r.assigned_to)}` : "لم يُسنَد بعد"}</span>
        ${subLink(ctx, names, r.subscriber_id)}${r.ref ? `<span class="ref ltr">${esc(r.ref)}</span>` : ""}
        <span class="acts">${closed
          ? `<button class="btn-line" type="button" data-st="open" data-id="${id}">إعادة فتح</button>`
          : `${r.status === "open" ? `<button class="btn-line" type="button" data-st="in_progress" data-id="${id}">بدء العمل</button>` : ""}<button class="btn-line" type="button" data-st="done" data-id="${id}">إغلاق</button>`}</span></div>
    </li>`;
  }).join("")}</ul>`;
}

function notesHTML(ctx, notes, names) {
  if (notes === null) return `<p class="muted small">ليس لحسابك وصول لسجلات المشتركين.</p>`;
  if (!notes.length) return `<div class="empty">لا توجد بنود مفتوحة عند المشتركين.</div>`;
  return `<ul class="tl">${notes.map((n) => `<li class="note k-${esc(n.kind)}">
      <div class="top"><span class="kind">${esc(L.noteKind[n.kind] || n.kind)}</span><span class="title">${esc(n.title)}</span>
        <span class="nstat ${esc(n.status)}">${esc(L.status[n.status] || n.status)}</span></div>
      <div class="foot">${subLink(ctx, names, n.subscriber_id)}<span>${esc(fmtDT(n.at))}</span><span>${esc(n.author)}</span>${n.ref ? `<span class="ref ltr">${esc(n.ref)}</span>` : ""}</div>
    </li>`).join("")}</ul>`;
}

export async function mount(ctx) {
  useStyle("tech-requests", CSS);
  const el = ctx.el;
  const store = ctx.demo ? demoStore() : supaStore(ctx.sb);
  el.innerHTML = `<p class="muted">جارِ التحميل…</p>`;
  const [subs, reqs0, notes] = await Promise.all([store.subscribers(), store.list(), store.openNotes()]);
  if (!ctx.isCurrent()) return;
  const names = new Map(subs.map((s) => [s.id, s.name]));
  let reqs = reqs0;
  const openN = () => reqs.filter((r) => !isClosed(r.status)).length;
  const highN = () => reqs.filter((r) => !isClosed(r.status) && r.priority === "high").length;

  el.innerHTML = `
    <div class="page-head">
      <h1>الطلبات والمشاكل</h1>
      <div class="tally" id="trTally"></div>
    </div>
    <details class="tr-new" id="trNew">
      <summary class="btn">طلب جديد</summary>
      <form class="panel" id="trForm" novalidate>
        <div class="two">
          <div><label class="f" for="tk">النوع</label><select class="i" id="tk">${Object.entries(L.kind).map(([v, t]) => `<option value="${v}">${t}</option>`).join("")}</select></div>
          <div><label class="f" for="tp">الأولوية</label><select class="i" id="tp">${Object.entries(L.priority).map(([v, t]) => `<option value="${v}" ${v === "normal" ? "selected" : ""}>${t}</option>`).join("")}</select></div>
        </div>
        <label class="f" for="tt">العنوان</label><input class="i" id="tt" maxlength="200" required>
        <label class="f" for="tb">التفاصيل (اختياري)</label><textarea class="i" id="tb"></textarea>
        <div class="two">
          <div><label class="f" for="ts">المشترك (اختياري)</label><select class="i" id="ts"><option value="">لا يخص مشتركاً</option>${subs.map((s) => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join("")}</select></div>
          <div><label class="f" for="ta">عند من (اختياري)</label><select class="i" id="ta"><option value="">يحدده نادر</option>${Object.entries(L.team).map(([v, t]) => `<option value="${v}">${t}</option>`).join("")}</select></div>
        </div>
        <label class="f" for="tr">مرجع (اختياري): رقم execution أو workflow أو مهمة</label><input class="i ltr" id="tr" maxlength="300">
        <div class="err" id="trErr" role="alert"></div>
        <button class="btn" type="submit" id="trBtn">إرسال الطلب</button>
      </form>
    </details>
    <div class="tr-grid">
      <section class="panel" id="trPanel">
        <h2>طلبات الفريق التقني</h2>
        <div id="trFilt">${filterBtns()}</div>
        <div id="trList">${reqsHTML(ctx, reqs, names)}</div>
      </section>
      <section class="panel">
        <h2>بنود مفتوحة عند المشتركين<span class="tr-count">${notes ? notes.length : ""}</span></h2>
        <p class="muted small" style="margin:-4px 0 8px">من سجل كل مشترك. تُغلق من صفحة المشترك.</p>
        ${notesHTML(ctx, notes, names)}
      </section>
    </div>`;

  const tally = () => {
    $("#trTally", el).innerHTML = `<span><b>${openN()}</b> مفتوح</span>${highN() ? `<span class="health h-red"><i aria-hidden="true"></i>${highN()} عاجل</span>` : ""}`;
  };
  tally();
  const refresh = async () => {
    reqs = await store.list();
    $("#trList", el).innerHTML = reqsHTML(ctx, reqs, names);
    $("#trFilt", el).innerHTML = filterBtns();
    tally();
  };

  $("#trPanel", el).addEventListener("click", async (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.fs) { filter.status = b.dataset.fs; return refresh(); }
    if (b.dataset.fk) { filter.kind = b.dataset.fk; return refresh(); }
    if (b.dataset.st) {
      b.disabled = true;
      try { await store.setStatus(Number(b.dataset.id), b.dataset.st); await refresh(); toast(b.dataset.st === "done" ? "أُغلق الطلب" : b.dataset.st === "open" ? "أُعيد فتح الطلب" : "الطلب قيد العمل"); }
      catch (err) { b.disabled = false; toast("تعذّر الحفظ: " + errText(err)); }
    }
  });

  $("#trForm", el).addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = $("#tt", el).value.trim();
    if (!title) { $("#trErr", el).textContent = "اكتب عنواناً قصيراً للطلب."; $("#tt", el).focus(); return; }
    const row = {
      title, body: $("#tb", el).value.trim() || null, kind: $("#tk", el).value, priority: $("#tp", el).value,
      subscriber_id: $("#ts", el).value || null, assigned_to: $("#ta", el).value || null,
      ref: $("#tr", el).value.trim() || null, requested_by: ctx.me.name || ctx.me.email || "staff",
    };
    $("#trBtn", el).disabled = true; $("#trErr", el).textContent = "";
    try {
      await store.add(row);
      e.target.reset(); $("#trNew", el).open = false;
      filter.status = "active"; filter.kind = "all";
      await refresh(); toast("أُرسل الطلب");
    } catch (err) { $("#trErr", el).textContent = "تعذّر الإرسال: " + errText(err); }
    $("#trBtn", el).disabled = false;
  });
}
