// Module "subscribers": port of flowpal.co/subscribers/ (list, subscriber page, daily activity, log).
// Data: Supabase tables subscribers, subscriber_notes, subscriber_metrics_daily (RLS: staff only).
// ?demo: fake data in memory, nothing is saved.
import { $, esc, safeUrl, fmtDate, fmtDT, isoDay, toast, useStyle, ok, errText } from "../lib.js";

const L = {
  status: { onboarding: "قيد التجهيز", live: "يعمل", paused: "متوقف مؤقتاً", ended: "منتهي" },
  health: { green: "سليم", yellow: "يحتاج متابعة", red: "فيه عطل", unknown: "غير معروف" },
  kind: { note: "ملاحظة", issue: "مشكلة", change: "تعديل", request: "طلب" },
  nstat: { open: "مفتوح", in_progress: "قيد العمل", done: "منجز", wont_do: "لن يُنفَّذ" },
  channel: { instagram: "Instagram", messenger: "Messenger", whatsapp: "WhatsApp", web_chat: "دردشة الموقع" },
  contactRole: { owner: "المالك", manager: "المدير", staff: "موظف", tech: "تقني" },
};

// Explicit columns (never "*"): a column added later is not shown until someone adds it here on purpose.
const SUB_COLS = "id,name,sector,city,address,contacts,channels,product,status,start_date,golive_date,end_date,contract_version,systems,links,health,health_note,health_at,notes,created_at,updated_at";

const CSS = `
.subs{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.sub{position:relative;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);overflow:hidden}
.sub a.row{display:grid;grid-template-columns:1fr auto;gap:6px 12px;padding:14px 16px 14px 14px;padding-inline-start:22px;text-decoration:none;color:inherit}
.sub a.row:hover{background:#FCFBF8}
.sub .band,.sp-head .band{position:absolute;inset-block:0;inset-inline-start:0;width:6px;background:var(--h)}
.sub .name{font:600 17px/1.35 var(--f-head)}
.sub .meta{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:13px;color:var(--muted)}
.sub .meta span{white-space:nowrap}
.sub .rt{display:flex;flex-direction:column;align-items:flex-end;gap:6px}
.sub .mid{grid-column:1/-1;display:grid;gap:8px}
.sub .dates{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:13px}
.sub .dates span{white-space:nowrap}
.sub .dates em{font-style:normal;color:var(--muted)}
.status{font-size:12px;padding:4px 8px;border-radius:6px;border:1px solid var(--line);white-space:nowrap}
.status.live{border-color:#9FD9CF;background:#E7F7F4;color:var(--teal-ink)}
.status.paused{background:#FBF1DC;border-color:#EBCF8F}
.status.ended{background:var(--soft);color:var(--muted)}
.sp-head{background:var(--ink);color:#EAF1F1;border-radius:var(--radius);padding:18px;position:relative;overflow:hidden}
.sp-head .band{width:8px}
.sp-head h1{color:#fff;padding-inline-start:6px}
.sp-head .meta{display:flex;flex-wrap:wrap;gap:4px 16px;font-size:13px;color:#A9BCC0;margin-top:6px;padding-inline-start:6px}
.sp-head .healthbox{margin-top:14px;padding:10px 12px;border-radius:8px;background:var(--ink-2);margin-inline-start:6px}
.sp-head .health{color:#fff}
.sp-head .hnote{font-size:13px;color:#C7D4D6;margin-top:4px;overflow-wrap:anywhere}
.facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 16px;margin-top:14px;padding-inline-start:6px}
.facts div{font-size:13px;color:#A9BCC0}
.facts b{display:block;color:#fff;font-weight:500;font-size:14px}
.sgrid{display:grid;gap:16px;margin-top:16px}
dl.kv{margin:0;display:grid;gap:10px}
dl.kv dt{font-size:12px;color:var(--muted)}
dl.kv dd{margin:2px 0 0;overflow-wrap:anywhere}
.wf{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.wf li{border:1px solid var(--line);border-radius:8px;padding:8px 10px}
.wf .id{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;direction:ltr;unicode-bidi:isolate}
.wf .role{font-size:13px;color:var(--muted)}
.contacts{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.contacts li{font-size:14px;overflow-wrap:anywhere}
.days{display:flex;align-items:flex-end;gap:3px;height:120px;direction:ltr;padding-top:6px}
.day{flex:1 1 0;min-width:0;display:flex;flex-direction:column;justify-content:flex-end;height:100%}
.day .bar-v{background:var(--teal);border-radius:3px 3px 0 0;min-height:2px}
.day .hdot{height:5px;border-radius:2px;margin-top:3px;background:var(--h, var(--soft))}
.axis{display:flex;justify-content:space-between;direction:ltr;font-size:11px;color:var(--muted);margin-top:4px}
.mstats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}
.mstats div{background:var(--paper);border-radius:8px;padding:8px 10px;font-size:12px;color:var(--muted)}
.mstats b{display:block;font:600 18px/1.3 var(--f-head);color:var(--ink)}
@media (min-width:760px){
  .sub a.row{grid-template-columns:minmax(0,1.2fr) minmax(0,1fr) 150px;grid-template-areas:"a b c";align-items:center;padding:16px 18px;padding-inline-start:26px}
  .sub a.row > div:first-child{grid-area:a} .sub .mid{grid-area:b;grid-column:auto} .sub .rt{grid-area:c}
  .sgrid{grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);align-items:start}
  .sgrid .full{grid-column:1/-1}
  .facts{grid-template-columns:repeat(4,minmax(0,1fr))}
  .sp-head{padding:22px 24px}
  .days{height:150px}
}`;

/* ===== Data: demo (fake, in memory) or Supabase ===== */
let demo = null;
function demoStore() {
  if (demo) return demo;
  const today = new Date(); const day = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return d; };
  const subs = [
    { id: "demo-store", name: "متجر النخلة (تجريبي)", sector: "متجر إلكتروني / أدوات منزلية", city: "نابلس", address: "شارع تجريبي 1",
      channels: ["instagram", "messenger"], product: "messaging-assistant", status: "live",
      start_date: isoDay(day(20)), golive_date: isoDay(day(18)), end_date: null, contract_version: "v2",
      contacts: [{ role: "owner", name: "صاحب المتجر (وهمي)", channel: "whatsapp", value: "+970 000 000 000" }],
      systems: { meta: "Meta app (demo)", n8n: { host: "n8n.example.com", workflows: [ { id: "DEMOin000000001", name: "[Demo] Messages in", role: "inbound adapter" }, { id: "DEMObot00000002", name: "Demo Staff Reply", role: "AI agent + turns log" } ] }, bot_db: "Demo Postgres, schema bot", dashboard: "Demo client dashboard" },
      links: { dashboard: "https://example.com/dashboard", instagram: "https://example.com/instagram" },
      health: "yellow", health_note: "رسالة فيها رقم فُهمت كرقم منتج. الإصلاح جاهز وينتظر الفحص.", health_at: day(0).toISOString(), notes: "مشترك وهمي للعرض فقط." },
    { id: "demo-clinic", name: "عيادة الريحان (تجريبي)", sector: "عيادة أسنان", city: "رام الله", address: null,
      channels: ["whatsapp"], product: "messaging-assistant", status: "onboarding",
      start_date: isoDay(day(3)), golive_date: null, end_date: null, contract_version: "v1",
      contacts: [{ role: "manager", name: "مديرة العيادة (وهمي)", channel: "phone", value: "+970 000 000 001" }],
      systems: { n8n: { host: "n8n.example.com", workflows: [] } }, links: {},
      health: "unknown", health_note: null, health_at: null, notes: null },
    { id: "demo-cafe", name: "مقهى الزاوية (تجريبي)", sector: "مقهى", city: "جنين", address: null,
      channels: ["instagram"], product: "messaging-assistant", status: "live",
      start_date: isoDay(day(40)), golive_date: isoDay(day(37)), end_date: null, contract_version: "v1",
      contacts: [], systems: { n8n: { host: "n8n.example.com", workflows: [ { id: "DEMOcafe0000003", name: "Cafe bot", role: "AI agent" } ] } }, links: {},
      health: "green", health_note: "لا أخطاء آخر 7 أيام.", health_at: day(0).toISOString(), notes: null },
  ];
  let nid = 100;
  const notes = [
    { id: 1, subscriber_id: "demo-store", kind: "change", title: "تسليم النظام وبدء الاشتراك", body: "Instagram + Messenger شغالين.", status: "done", ref: "contract v2", author: "نادر", at: day(18).toISOString(), closed_at: day(18).toISOString() },
    { id: 2, subscriber_id: "demo-store", kind: "change", title: "فهم الرسائل الصوتية", body: null, status: "done", ref: "changelog", author: "نادر", at: day(9).toISOString(), closed_at: day(9).toISOString() },
    { id: 3, subscriber_id: "demo-store", kind: "issue", title: "رقم لحاله ينقرأ كرقم منتج", body: "الزبون كتب رقماً في رسالته، والبوت أرسل صورة منتج غلط.", status: "in_progress", ref: "exec 0000", author: "هبة", at: day(1).toISOString(), closed_at: null },
    { id: 4, subscriber_id: "demo-store", kind: "request", title: "الرد على الستوري", body: "صاحب المتجر طلب أن يرد البوت على ردود الستوري.", status: "open", ref: null, author: "الفريق التقني (تجريبي)", at: day(0).toISOString(), closed_at: null },
    { id: 5, subscriber_id: "demo-store", kind: "note", title: "ساعات الذروة مساءً", body: "أغلب الرسائل بين 8 و 11 مساءً.", status: "done", ref: null, author: "الفريق التقني (تجريبي)", at: day(5).toISOString(), closed_at: day(5).toISOString() },
    { id: 6, subscriber_id: "demo-clinic", kind: "request", title: "تجهيز رقم WhatsApp", body: null, status: "open", ref: null, author: "نادر", at: day(2).toISOString(), closed_at: null },
    { id: 7, subscriber_id: "demo-cafe", kind: "change", title: "تحديث قائمة المشروبات", body: null, status: "done", ref: null, author: "طارق", at: day(6).toISOString(), closed_at: day(6).toISOString() },
  ];
  const metrics = [];
  for (let i = 13; i >= 0; i--) {
    const t = 30 + Math.round(25 * Math.abs(Math.sin(i * 1.7))) + (i % 7 === 5 ? 20 : 0);
    const err = i === 1 ? 2 : (i === 6 ? 1 : 0);
    metrics.push({ subscriber_id: "demo-store", day: isoDay(day(i)), turns: t, conversations: Math.round(t / 3), bot_errors: err, unanswered: i === 1 ? 1 : 0, handoffs: i % 4 === 0 ? 2 : 1, orders: i % 3, median_reply_sec: 6 + (i % 5), health: err >= 2 ? "yellow" : "green" });
  }
  demo = {
    async listSubscribers() {
      return subs.map((s) => ({ ...s, open_count: notes.filter((n) => n.subscriber_id === s.id && (n.status === "open" || n.status === "in_progress")).length }));
    },
    async getSubscriber(id) { return subs.find((s) => s.id === id) || null; },
    async listNotes(id) { return notes.filter((n) => n.subscriber_id === id).sort((a, b) => b.at.localeCompare(a.at)); },
    async addNote(n) { notes.push({ ...n, id: ++nid, at: new Date().toISOString(), closed_at: n.closed_at || null }); },
    async setNoteStatus(id, status) { const n = notes.find((x) => x.id === id); if (n) { n.status = status; n.closed_at = (status === "done" || status === "wont_do") ? new Date().toISOString() : null; } },
    async metrics(id) { return metrics.filter((m) => m.subscriber_id === id); },
  };
  return demo;
}

function supaStore(sb) {
  return {
    async listSubscribers() {
      const subs = ok(await sb.from("subscribers").select("id,name,sector,city,channels,status,start_date,golive_date,contract_version,health,health_note,health_at").order("name"));
      const open = ok(await sb.from("subscriber_notes").select("subscriber_id").in("status", ["open", "in_progress"]));
      return subs.map((s) => ({ ...s, open_count: open.filter((n) => n.subscriber_id === s.id).length }));
    },
    async getSubscriber(id) { const r = ok(await sb.from("subscribers").select(SUB_COLS).eq("id", id).limit(1)); return r[0] || null; },
    async listNotes(id) { return ok(await sb.from("subscriber_notes").select("*").eq("subscriber_id", id).order("at", { ascending: false }).limit(500)); },
    async addNote(n) { ok(await sb.from("subscriber_notes").insert(n)); },
    async setNoteStatus(id, status) {
      const closed_at = (status === "done" || status === "wont_do") ? new Date().toISOString() : null;
      ok(await sb.from("subscriber_notes").update({ status, closed_at }).eq("id", id));
    },
    async metrics(id) {
      const from = new Date(); from.setDate(from.getDate() - 29);
      return ok(await sb.from("subscriber_metrics_daily").select("day,turns,conversations,bot_errors,unanswered,handoffs,orders,median_reply_sec,health").eq("subscriber_id", id).gte("day", isoDay(from)).order("day"));
    },
  };
}

/* ===== Pieces ===== */
const healthBadge = (h) => { h = L.health[h] ? h : "unknown"; return `<span class="health h-${h}"><i aria-hidden="true"></i>${L.health[h]}</span>`; };
const chips = (arr) => (arr || []).map((c) => `<span class="chip">${esc(L.channel[c] || c)}</span>`).join("");

function chartHTML(rows) {
  const data = (rows || []).filter((r) => r.turns != null || r.bot_errors != null);
  if (!data.length) return `<div class="empty">لا بيانات بعد</div><p class="muted small">الأرقام اليومية تظهر هنا تلقائياً بعد تشغيل المتابعة الليلية.</p>`;
  const max = Math.max(1, ...data.map((r) => r.turns || 0));
  const sum = (k) => data.reduce((a, r) => a + (r[k] || 0), 0);
  const bars = data.map((r) => {
    const pct = Math.round(((r.turns || 0) / max) * 100);
    const h = r.health ? `h-${esc(r.health)}` : "";
    return `<div class="day ${h}" title="${esc(fmtDate(r.day))}: ${r.turns ?? 0} رسالة، ${r.bot_errors ?? 0} خطأ"><div class="bar-v" style="height:${pct}%"></div><div class="hdot"></div></div>`;
  }).join("");
  return `<div role="img" aria-label="رسائل الزبائن اليومية آخر ${data.length} يوم">
      <div class="days">${bars}</div>
      <div class="axis"><span>${esc(fmtDate(data[0].day))}</span><span>${esc(fmtDate(data[data.length - 1].day))}</span></div>
    </div>
    <p class="muted small" style="margin:6px 0 0">طول العمود = رسائل الزبائن في اليوم، والشريط تحته = حالة ذلك اليوم.</p>
    <div class="mstats">
      <div><b>${sum("turns")}</b>رسالة</div>
      <div><b>${sum("bot_errors")}</b>خطأ في البوت</div>
      <div><b>${sum("unanswered")}</b>بدون رد</div>
      <div><b>${sum("handoffs")}</b>تحويل لموظف</div>
      <div><b>${sum("conversations")}</b>زبون</div>
      <div><b>${sum("orders")}</b>طلب</div>
    </div>`;
}

function systemsHTML(s) {
  const sys = s.systems || {};
  const n8n = sys.n8n || {};
  const host = n8n.host ? String(n8n.host).replace(/^https?:\/\//, "").replace(/\/.*$/, "") : null;
  const wfs = Array.isArray(n8n.workflows) ? n8n.workflows : [];
  const wfList = wfs.length ? `<ul class="wf">${wfs.map((w) => {
      const url = host ? safeUrl(`https://${host}/workflow/${encodeURIComponent(w.id || "")}`) : null;
      return `<li><div>${esc(w.name || "workflow")}</div>
        <div>${url ? `<a class="id" href="${esc(url)}" target="_blank" rel="noopener">${esc(w.id)}</a>` : `<span class="id">${esc(w.id)}</span>`}</div>
        ${w.role ? `<div class="role">${esc(w.role)}</div>` : ""}</li>`;
    }).join("")}</ul>` : `<p class="muted small">لا يوجد workflow مسجّل.</p>`;
  const other = Object.entries(sys).filter(([k]) => k !== "n8n");
  return `<dl class="kv">
      <div><dt>n8n${host ? ` <span class="ltr">(${esc(host)})</span>` : ""}</dt><dd>${wfList}</dd></div>
      ${other.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(typeof v === "string" ? v : JSON.stringify(v))}</dd></div>`).join("")}
    </dl>`;
}

function linksHTML(s) {
  const e = Object.entries(s.links || {});
  if (!e.length) return `<p class="muted small">لا توجد روابط.</p>`;
  return `<ul class="contacts">${e.map(([k, v]) => { const u = safeUrl(v); return `<li><span class="muted small">${esc(k)}</span><br>${u ? `<a class="ltr" href="${esc(u)}" target="_blank" rel="noopener">${esc(v)}</a>` : esc(v)}</li>`; }).join("")}</ul>`;
}

function contactsHTML(s) {
  const c = Array.isArray(s.contacts) ? s.contacts : [];
  if (!c.length) return `<p class="muted small">لا توجد جهات اتصال.</p>`;
  return `<ul class="contacts">${c.map((x) => `<li><b>${esc(x.name || "—")}</b> <span class="muted small">${esc(L.contactRole[x.role] || x.role || "")}</span><br><span class="muted small">${esc(x.channel || "")}</span> <span class="ltr">${esc(x.value || "")}</span></li>`).join("")}</ul>`;
}

const noteFilter = { kind: "all", status: "active" };

function notesHTML(notes) {
  const list = notes.filter((n) =>
    (noteFilter.kind === "all" || n.kind === noteFilter.kind) &&
    (noteFilter.status === "all" || (noteFilter.status === "active" ? (n.status === "open" || n.status === "in_progress") : (n.status === "done" || n.status === "wont_do"))));
  if (!list.length) return `<p class="muted small">لا يوجد شيء بهذا الفلتر.</p>`;
  return `<ul class="tl">${list.map((n) => {
    const closed = n.status === "done" || n.status === "wont_do";
    const id = Number(n.id);
    return `<li class="note k-${esc(n.kind)} ${closed ? "closed" : ""}">
      <div class="top"><span class="kind">${esc(L.kind[n.kind] || n.kind)}</span><span class="title">${esc(n.title)}</span><span class="nstat ${esc(n.status)}">${esc(L.nstat[n.status] || n.status)}</span></div>
      ${n.body ? `<p class="body">${esc(n.body)}</p>` : ""}
      <div class="foot"><span>${esc(fmtDT(n.at))}</span><span>${esc(n.author)}</span>${n.ref ? `<span class="ref ltr">${esc(n.ref)}</span>` : ""}
        <span class="acts">${closed
          ? `<button class="btn-line" data-st="open" data-id="${id}">إعادة فتح</button>`
          : `${n.status === "open" ? `<button class="btn-line" data-st="in_progress" data-id="${id}">بدء العمل</button>` : ""}<button class="btn-line" data-st="done" data-id="${id}">إغلاق</button>`}</span></div>
    </li>`;
  }).join("")}</ul>`;
}

function filterBtns() {
  const k = [["all", "الكل"], ["issue", "مشاكل"], ["request", "طلبات"], ["change", "تعديلات"], ["note", "ملاحظات"]];
  const s = [["active", "المفتوحة"], ["closed", "المغلقة"], ["all", "الكل"]];
  return `<div class="filters" role="group" aria-label="النوع">${k.map(([v, t]) => `<button class="fbtn" type="button" data-fk="${v}" aria-pressed="${noteFilter.kind === v}">${t}</button>`).join("")}</div>
    <div class="filters" role="group" aria-label="الحالة">${s.map(([v, t]) => `<button class="fbtn" type="button" data-fs="${v}" aria-pressed="${noteFilter.status === v}">${t}</button>`).join("")}</div>`;
}

/* ===== Views ===== */
async function viewList(el, store, base) {
  el.innerHTML = `<p class="muted">جارِ التحميل…</p>`;
  const subs = await store.listSubscribers();
  const by = (h) => subs.filter((s) => (s.health || "unknown") === h).length;
  const live = subs.filter((s) => s.status === "live").length;
  el.innerHTML = `
    <div class="page-head">
      <h1>المشتركون</h1>
      <div class="tally">
        <span><b>${subs.length}</b> مشترك</span><span><b>${live}</b> يعمل</span>
        ${by("red") ? `<span class="health h-red"><i aria-hidden="true"></i>${by("red")} فيه عطل</span>` : ""}
        ${by("yellow") ? `<span class="health h-yellow"><i aria-hidden="true"></i>${by("yellow")} يحتاج متابعة</span>` : ""}
      </div>
    </div>
    ${subs.length ? "" : `<div class="empty">لا يوجد مشتركون بعد. يضيفهم الفريق التقني من قاعدة البيانات.</div>`}
    <ul class="subs">${subs.map((s) => {
      const h = L.health[s.health] ? s.health : "unknown";
      return `<li class="sub h-${h}"><span class="band" aria-hidden="true"></span>
        <a class="row" href="${base}/s/${encodeURIComponent(s.id)}">
          <div><div class="name">${esc(s.name)}</div>
            <div class="meta"><span>${esc(s.sector || "قطاع غير محدد")}</span><span>${esc(s.city || "")}</span>${s.contract_version ? `<span>عقد ${esc(s.contract_version)}</span>` : ""}</div></div>
          <div class="rt">${healthBadge(h)}<span class="status ${esc(s.status)}">${esc(L.status[s.status] || s.status)}</span></div>
          <div class="mid"><div class="dates"><span><em>البداية</em> ${fmtDate(s.start_date)}</span><span><em>التشغيل</em> ${fmtDate(s.golive_date)}</span>${s.open_count ? `<span><em>بنود مفتوحة</em> ${s.open_count}</span>` : ""}</div>
          <div class="chips">${chips(s.channels)}</div></div>
        </a></li>`;
    }).join("")}</ul>`;
}

async function viewSubscriber(el, store, base, id, me) {
  el.innerHTML = `<p class="muted">جارِ التحميل…</p>`;
  const [s, notes, metrics] = await Promise.all([store.getSubscriber(id), store.listNotes(id), store.metrics(id)]);
  if (!s) { el.innerHTML = `<a class="back" href="${base}">العودة للمشتركين</a><p>هذا المشترك غير موجود.</p>`; return; }
  const h = L.health[s.health] ? s.health : "unknown";
  el.innerHTML = `
    <a class="back" href="${base}">العودة للمشتركين</a>
    <section class="sp-head h-${h}"><span class="band" aria-hidden="true"></span>
      <h1>${esc(s.name)}</h1>
      <div class="meta"><span>${esc(s.sector || "")}</span><span>${esc(s.city || "")}</span>${s.address ? `<span>${esc(s.address)}</span>` : ""}</div>
      <div class="healthbox">${healthBadge(h)}${s.health_note ? `<div class="hnote">${esc(s.health_note)}</div>` : ""}${s.health_at ? `<div class="hnote">آخر تحديث ${esc(fmtDT(s.health_at))}</div>` : ""}</div>
      <div class="facts">
        <div>الحالة<b>${esc(L.status[s.status] || s.status)}</b></div>
        <div>نسخة العقد<b>${esc(s.contract_version || "—")}</b></div>
        <div>بداية الاشتراك<b>${fmtDate(s.start_date)}</b></div>
        <div>بدء التشغيل<b>${fmtDate(s.golive_date)}</b></div>
      </div>
      <div class="chips" style="margin-top:12px;padding-inline-start:6px">${chips(s.channels)}</div>
    </section>
    <div class="sgrid">
      <section class="panel full"><h2>النشاط اليومي</h2>${chartHTML(metrics)}</section>
      <section class="panel" id="tlPanel">
        <h2>السجل</h2>
        <div id="filt">${filterBtns()}</div>
        <div id="tl">${notesHTML(notes)}</div>
        <form class="addform" id="addForm">
          <h2 style="margin-top:12px">إضافة للسجل</h2>
          <div class="two">
            <div><label class="f" for="nk">النوع</label><select class="i" id="nk">${Object.entries(L.kind).map(([v, t]) => `<option value="${v}" ${v === "issue" ? "selected" : ""}>${t}</option>`).join("")}</select></div>
            <div><label class="f" for="ns">الحالة</label><select class="i" id="ns">${["open", "in_progress", "done"].map((v) => `<option value="${v}">${L.nstat[v]}</option>`).join("")}</select></div>
          </div>
          <label class="f" for="nt">العنوان</label><input class="i" id="nt" maxlength="200" required>
          <label class="f" for="nb">التفاصيل (اختياري)</label><textarea class="i" id="nb"></textarea>
          <label class="f" for="nr">مرجع (اختياري): رقم execution أو workflow أو مهمة</label><input class="i ltr" id="nr" maxlength="300">
          <div class="err" id="addErr" role="alert"></div>
          <button class="btn" type="submit" id="addBtn">إضافة للسجل</button>
        </form>
      </section>
      <div class="sgrid" style="margin-top:0;grid-template-columns:minmax(0,1fr)">
        <section class="panel"><h2>الأنظمة</h2>${systemsHTML(s)}</section>
        <section class="panel"><h2>جهات الاتصال</h2>${contactsHTML(s)}</section>
        <section class="panel"><h2>روابط</h2>${linksHTML(s)}</section>
        ${s.notes ? `<section class="panel"><h2>ملاحظات عامة</h2><p style="margin:0;overflow-wrap:anywhere">${esc(s.notes)}</p></section>` : ""}
      </div>
    </div>`;

  const refresh = async () => { const cur = await store.listNotes(id); $("#tl", el).innerHTML = notesHTML(cur); $("#filt", el).innerHTML = filterBtns(); };
  $("#tlPanel", el).addEventListener("click", async (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.fk) { noteFilter.kind = b.dataset.fk; return refresh(); }
    if (b.dataset.fs) { noteFilter.status = b.dataset.fs; return refresh(); }
    if (b.dataset.st) {
      b.disabled = true;
      try { await store.setNoteStatus(Number(b.dataset.id), b.dataset.st); await refresh(); toast(b.dataset.st === "done" ? "أُغلق البند" : b.dataset.st === "open" ? "أُعيد فتح البند" : "البند قيد العمل"); }
      catch (err) { b.disabled = false; toast("تعذّر الحفظ: " + errText(err)); }
    }
  });
  $("#addForm", el).addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = $("#nt", el).value.trim();
    if (!title) { $("#addErr", el).textContent = "اكتب عنواناً قصيراً للبند."; $("#nt", el).focus(); return; }
    const status = $("#ns", el).value;
    const row = { subscriber_id: id, kind: $("#nk", el).value, title, body: $("#nb", el).value.trim() || null, ref: $("#nr", el).value.trim() || null, status,
      author: me.name || me.email || "staff" };
    if (status === "done") row.closed_at = new Date().toISOString();
    $("#addBtn", el).disabled = true; $("#addErr", el).textContent = "";
    try {
      await store.addNote(row);
      e.target.reset(); $("#nk", el).value = "issue";
      if (noteFilter.status === "active" && status === "done") noteFilter.status = "all";
      await refresh(); toast("أُضيف للسجل");
    } catch (err) { $("#addErr", el).textContent = "تعذّر الحفظ: " + errText(err); }
    $("#addBtn", el).disabled = false;
  });
}

/* ===== Entry point called by the shell ===== */
export async function mount(ctx) {
  useStyle("subscribers", CSS);
  const store = ctx.demo ? demoStore() : supaStore(ctx.sb);
  const m = ctx.path.match(/^s\/(.+)$/);
  if (m) await viewSubscriber(ctx.el, store, ctx.base, decodeURIComponent(m[1]), ctx.me);
  else await viewList(ctx.el, store, ctx.base);
}
