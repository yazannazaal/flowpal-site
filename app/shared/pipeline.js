// Shared by the sales-side modules (home, companies, followups, sales). No data, no keys.
// Loaded only by those modules (so only after hub_me() gave one of them); the service worker caches it at runtime
// like a module file, and logout deletes it with every hub-* cache.
// Data: the hub_* database functions (security definer, each checks hub_can()).
// ?demo: the same calls answered by demo/hub-sales.js (same rules, fake companies, nothing saved).
import { esc, safeUrl, ok, errText } from "../lib.js";

export const TZ = "Asia/Hebron";

export const STATUS = {
  new: { t: "جديد", c: "st-new" }, contacted: { t: "تم التواصل", c: "st-mid" }, waiting_reply: { t: "بانتظار الرد", c: "st-wait" },
  interested: { t: "مهتم", c: "st-hot" }, meeting: { t: "اجتماع", c: "st-hot" }, negotiation: { t: "تفاوض", c: "st-hot" },
  client: { t: "عميل", c: "st-win" }, not_interested: { t: "غير مهتم", c: "st-off" }, skipped: { t: "مستبعدة", c: "st-off" },
};
export const STATUS_ORDER = ["new", "contacted", "waiting_reply", "interested", "meeting", "negotiation", "client", "not_interested"];
export const CLOSED = ["client", "not_interested", "skipped"];
export const OMAR_STAGE = {
  not_sent: "لسا ما انبعتلها", sent: "انبعتت، ما ردوا لسا", replied_staff: "رد موظف", decision_maker: "مع صاحب القرار",
  call: "مكالمة", interested: "مهتمين", not_interested: "مش مهتمين", no_reply: "ما ردوا (مسكّرة)", skipped: "مستبعدة",
};
export const SECTOR = { ecommerce: "متاجر أونلاين", clinic: "عيادات", clinics: "عيادات", restaurants: "مطاعم وكافيهات", cafes: "كافيهات", real_estate: "عقارات", other: "أخرى" };
export const NEW_SECTORS = ["ecommerce", "clinic", "restaurants"];   // the 3 approved sectors (DB check)
export const CHANNEL = { whatsapp: "واتساب", instagram: "Instagram", facebook: "Facebook", call: "مكالمة", visit: "زيارة", email: "إيميل", other: "غير ذلك" };
export const GOVS = ["نابلس", "رام الله والبيرة", "الخليل", "جنين", "بيت لحم", "طولكرم", "قلقيلية", "سلفيت", "طوباس", "أريحا", "القدس"];
export { who } from "../lib.js";   // names of people come from hub_me(), never from the code

/* ---------- dates (Asia/Hebron) ---------- */
const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
export const today = () => dayFmt.format(new Date());
export const dayOf = (iso) => { const d = new Date(iso); return isNaN(d) ? null : dayFmt.format(d); };
export function addDays(day, n) {
  const d = new Date(day + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
}
const dLong = new Intl.DateTimeFormat("ar-u-nu-latn", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
const dShort = new Intl.DateTimeFormat("ar-u-nu-latn", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });
const tFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const dtFmt = new Intl.DateTimeFormat("ar-u-nu-latn", { timeZone: TZ, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
export const longDay = (day) => dLong.format(new Date(day + "T12:00:00Z"));
export const shortDay = (day) => dShort.format(new Date(day + "T12:00:00Z"));
export const hourOf = (iso) => { const d = new Date(iso); return isNaN(d) ? "" : tFmt.format(d); };
export const when = (iso) => { const d = new Date(iso); return isNaN(d) ? "" : dtFmt.format(d); };
/** «اليوم» / «بكرة» / «مبارح» / «متأخرة 3 أيام» / date, for a follow-up day. */
export function dueText(day, t = today()) {
  if (!day) return "";
  const diff = Math.round((new Date(day + "T12:00:00Z") - new Date(t + "T12:00:00Z")) / 864e5);
  if (diff === 0) return "اليوم";
  if (diff === 1) return "بكرة";
  if (diff === -1) return "متأخرة يوم";
  if (diff < 0) return `متأخرة ${-diff} ${-diff <= 10 ? "أيام" : "يوم"}`;
  return shortDay(day);
}
export const dueClass = (day, t = today()) => !day ? "" : day < t ? "late" : day === t ? "now" : "";

/* ---------- labels and small pieces of HTML ---------- */
export function statusText(p) {
  if (!p) return "";
  const s = STATUS[p.status] || { t: p.status };
  return p.status === "client" && !p.client_confirmed ? "عميل (بانتظار تأكيد الإدارة)" : s.t;
}
export const statusChip = (p) => `<span class="pl-st ${(STATUS[p.status] || {}).c || ""}">${esc(statusText(p))}</span>`;
export const sectorText = (s) => SECTOR[s] || s || "";
export function localPhone(p) {
  let d = String(p || "").replace(/\D/g, "");
  if (/^(970|972)5\d{8}$/.test(d)) d = "0" + d.slice(3);
  return d;
}
export const waLink = (p) => { const d = String(p || "").replace(/\D/g, ""); return d.length >= 9 ? `https://wa.me/${d}` : null; };
export function igLink(v) {
  const s = String(v || "").trim();
  if (!s) return null;
  if (/instagram\.com/i.test(s)) return safeUrl(/^https?:/i.test(s) ? s : "https://" + s);
  const h = s.replace(/^@/, "");
  return /^[A-Za-z0-9._]{1,30}$/.test(h) ? `https://www.instagram.com/${h}/` : null;
}
export const fbLink = (v) => { const s = String(v || "").trim(); if (!s) return null; return safeUrl(/^https?:/i.test(s) ? s : /facebook\.com|fb\.com/i.test(s) ? "https://" + s : `https://www.facebook.com/${s}`); };
export const webLink = (v) => { const s = String(v || "").trim(); if (!s) return null; return safeUrl(/^https?:/i.test(s) ? s : "https://" + s); };
/** Contact links of a company: [{t, href}] in a fixed order. */
export function contactLinks(c) {
  const out = [];
  const wa = waLink(c.phone); if (wa) out.push({ k: "whatsapp", t: "واتساب", href: wa });
  const ig = igLink(c.instagram); if (ig) out.push({ k: "instagram", t: "Instagram", href: ig });
  const fb = fbLink(c.facebook); if (fb) out.push({ k: "facebook", t: "Facebook", href: fb });
  const w = webLink(c.website); if (w) out.push({ k: "website", t: "الموقع", href: w });
  return out;
}
export const linksHTML = (c, cls = "pl-links") => {
  const l = contactLinks(c);
  return l.length ? `<span class="${cls}">${l.map((x) => `<a href="${esc(x.href)}" target="_blank" rel="noopener noreferrer">${x.t}</a>`).join("")}</span>` : "";
};
export const productOf = (c, id) => (c.products || []).find((p) => p.product === id) || null;
/** The status row that matters most for a company in lists (first open product, else the first one). */
export const mainProduct = (c) => (c.products || []).find((p) => !CLOSED.includes(p.status)) || (c.products || [])[0] || null;
export const isArchived = (c) => (c.products || []).length > 0 && c.products.every((p) => p.status === "skipped");

/** Is this follow-up still open (not closed) and due on or before `day`? */
export const openFollowUp = (p) => p && p.next_follow_up && !CLOSED.includes(p.status);

export const CSS = `
.pl-st{font-size:12px;font-weight:600;padding:3px 8px;border-radius:6px;white-space:nowrap;background:var(--soft);color:var(--ink)}
.pl-st.st-new{background:#EAF0FB;color:#2B4C8C} .pl-st.st-mid{background:#EEF3F3;color:#2A4651} .pl-st.st-wait{background:#FBF1DC;color:#7A5605}
.pl-st.st-hot{background:#E2F4EA;color:#145C33} .pl-st.st-win{background:#0E1F26;color:#fff} .pl-st.st-off{background:var(--soft);color:var(--muted)}
.pl-due{font-size:12px;font-weight:600;white-space:nowrap;color:var(--muted)}
.pl-due.now{color:#0B7A6E} .pl-due.late{color:#A8322C}
.pl-links{display:inline-flex;flex-wrap:wrap;gap:4px 12px}
.pl-links a{font-size:14px}
.pl-prod{font-size:12px;color:var(--muted)}
.pl-seg{display:flex;background:var(--soft);border-radius:10px;padding:3px;gap:2px;overflow-x:auto;scrollbar-width:none}
.pl-seg::-webkit-scrollbar{display:none}
.pl-seg button,.pl-seg a{flex:1 0 auto;border:0;background:none;border-radius:8px;padding:8px 12px;font-weight:600;cursor:pointer;color:var(--muted);text-decoration:none;text-align:center;font-size:14px;white-space:nowrap}
.pl-seg [aria-pressed="true"],.pl-seg [aria-current="page"]{background:var(--card);color:var(--ink);box-shadow:0 1px 2px rgba(14,31,38,.12)}
.pl-seg .n{font-weight:400;color:var(--muted);font-size:12px;margin-inline-start:4px}
.pl-quick{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.pl-quick button{font-size:13px;padding:5px 10px}
dialog.pl-sheet{width:min(460px,calc(100vw - 24px));padding:18px}
dialog.pl-sheet h2{margin-bottom:2px}
dialog.pl-sheet .btns{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}
dialog.pl-sheet .btns .btn,dialog.pl-sheet .btns .btn-line{padding:11px 10px;font-size:15px}
@media (max-width:759px){ dialog.pl-sheet{margin:auto auto 0;border-radius:14px 14px 0 0;width:100vw;max-width:100vw;padding-bottom:calc(18px + env(safe-area-inset-bottom,0px))} }
`;

/* ---------- errors in Arabic ---------- */
export function hubErr(err) {
  const m = String((err && err.message) || "");
  if (/date in the past/i.test(m)) return "التاريخ لازم يكون اليوم أو بعده.";
  if (/date required/i.test(m)) return "اختاري تاريخ.";
  if (/business_name required/i.test(m)) return "اكتبي اسم الشركة.";
  if (/sector must be/i.test(m)) return "اختاري القطاع.";
  if (/products required/i.test(m)) return "اختاري منتج واحد على الأقل.";
  if (/bad instagram/i.test(m)) return "حساب Instagram مش واضح. اكتبيه مثل shop.ps أو الرابط كامل.";
  if (/bad phone/i.test(m)) return "رقم الهاتف مش واضح.";
  if (/one contact/i.test(m)) return "لازم وسيلة تواصل وحدة على الأقل: رقم، Instagram، Facebook أو موقع.";
  if (/note required/i.test(m)) return "اكتبي الملاحظة.";
  if (/bad (status|product|channel|action)|bad range/i.test(m)) return "في قيمة مش صحيحة. حدّثي الصفحة وجرّبي مرة ثانية.";
  if ((err && err.code) === "P0002" || /not found/i.test(m)) return "مش موجودة، أو انحذفت. حدّثي الصفحة.";
  return errText(err);
}

/* ---------- data ---------- */
let companiesCache = null;   // { at, rows } for this page load only (logout reloads the page)
let productsCache = null;
export const forget = () => { companiesCache = null; };

function demoApi() { return import("../demo/hub-sales.js"); }

export function api(ctx) {
  const rpc = async (fn, args) => ok(await ctx.sb.rpc(fn, args));
  const call = async (name, live, ...args) => {
    if (ctx.demo) { const m = await demoApi(); return m[name](...args); }
    return live();
  };
  const write = async (name, live, ...args) => { const r = await call(name, live, ...args); forget(); return r; };
  return {
    async products() {
      if (!productsCache) productsCache = await call("products", () => rpc("hub_products"));
      return Array.isArray(productsCache) ? productsCache : [];
    },
    async companies(force) {
      if (!force && companiesCache && Date.now() - companiesCache.at < 120000) return companiesCache.rows;
      const rows = await call("companies", () => rpc("hub_companies"));
      companiesCache = { at: Date.now(), rows: Array.isArray(rows) ? rows : [] };
      return companiesCache.rows;
    },
    companiesAt: () => (companiesCache ? companiesCache.at : null),
    company: (id) => call("company", () => rpc("hub_company", { p_lead_id: id }), id),
    overview: () => call("overview", () => rpc("hub_overview")),
    create: (p) => write("leadCreate", () => rpc("hub_lead_create", { p }), p),
    update: (id, p) => write("leadUpdate", () => rpc("hub_lead_update", { p_lead_id: id, p }), id, p),
    setStatus: (id, product, status, note) => write("setStatus", () => rpc("hub_set_status", { p_lead_id: id, p_product: product, p_status: status, p_note: note || null }), id, product, status, note),
    setProducts: (id, products) => write("setProducts", () => rpc("hub_set_products", { p_lead_id: id, p_products: products }), id, products),
    addNote: (id, body, product) => write("addNote", () => rpc("hub_add_note", { p_lead_id: id, p_body: body, p_product: product || null }), id, body, product),
    followUp: (id, product, action, next, note, channel) => write("followUp", () => rpc("hub_follow_up", {
      p_lead_id: id, p_product: product, p_action: action, p_next: next || null, p_note: note || null, p_channel: channel || null,
    }), id, product, action, next, note, channel),
    taskDone: (taskId) => write("taskDone", () => rpc("hub_task_done", { p_task_id: taskId }), taskId),
  };
}

/* ---------- the follow-up sheet (used by followups, companies and home) ---------- */
// One <dialog> for «تواصلت» / «أجّل» / «حدّدي تاريخ». Resolves with the updated company, or null when closed.
export function followUpSheet(ctx, company, product, action) {
  const t = today();
  const label = (productOf(company, product) || {}).label || "";
  const title = action === "contacted" ? "تواصلت معهم" : action === "postponed" ? "أجّلي المتابعة" : "موعد المتابعة الجاية";
  const quick = [["بكرة", 1], ["بعد 3 أيام", 3], ["بعد أسبوع", 7], ["بعد أسبوعين", 14]];
  const dlg = document.createElement("dialog");
  dlg.className = "pl-sheet";
  dlg.setAttribute("aria-labelledby", "plSheetT");
  dlg.innerHTML = `<form method="dialog" novalidate>
    <h2 id="plSheetT">${title}</h2>
    <p class="muted small" style="margin:0">${esc(company.business_name)}${label ? " · " + esc(label) : ""}</p>
    ${action === "contacted" ? `<label class="f" for="plCh">كيف تواصلتِ؟</label>
      <select class="i" id="plCh">${Object.entries(CHANNEL).map(([k, v]) => `<option value="${k}" ${k === (company.preferred_channel || "whatsapp") ? "selected" : ""}>${v}</option>`).join("")}</select>` : ""}
    <label class="f" for="plNext">${action === "contacted" ? "متى نتابع معهم مرة ثانية؟" : "التاريخ الجديد"}</label>
    <input class="i" id="plNext" type="date" min="${t}" value="${action === "contacted" ? addDays(t, 3) : addDays(t, 1)}">
    <div class="pl-quick">${quick.map(([q, n]) => `<button class="btn-line" type="button" data-add="${n}">${q}</button>`).join("")}${action === "contacted" ? `<button class="btn-line" type="button" data-add="none">بدون موعد</button>` : ""}</div>
    <label class="f" for="plNote">ملاحظة ${action === "contacted" ? "(شو صار؟)" : "(اختياري)"}</label>
    <textarea class="i" id="plNote" maxlength="2000" rows="3" placeholder="${action === "contacted" ? "مثلاً: ردّ صاحب المحل وطلب نحكي بعد العيد" : ""}"></textarea>
    <div class="err" id="plErr" role="alert"></div>
    <div class="btns"><button class="btn" type="submit" value="save" id="plSave">حفظ</button><button class="btn-line" type="button" id="plCancel">رجوع</button></div>
  </form>`;
  document.body.appendChild(dlg);
  const q = (s) => dlg.querySelector(s);
  return new Promise((resolve) => {
    let result = null;
    dlg.addEventListener("close", () => { dlg.remove(); resolve(result); });
    q("#plCancel").addEventListener("click", () => dlg.close());
    dlg.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-add]"); if (!b) return;
      q("#plNext").value = b.dataset.add === "none" ? "" : addDays(t, Number(b.dataset.add));
    });
    q("form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const next = q("#plNext").value || null;
      const note = q("#plNote").value.trim();
      if (action !== "contacted" && !next) { q("#plErr").textContent = "اختاري تاريخ."; return; }
      if (next && next < t) { q("#plErr").textContent = "التاريخ لازم يكون اليوم أو بعده."; return; }
      q("#plSave").disabled = true; q("#plErr").textContent = "";
      try {
        result = await api(ctx).followUp(company.lead_id, product, action, next, note, action === "contacted" ? q("#plCh").value : null);
        dlg.close();
      } catch (err) { q("#plErr").textContent = "ما انحفظ: " + hubErr(err); q("#plSave").disabled = false; }
    });
    dlg.showModal();
    q(action === "contacted" ? "#plCh" : "#plNext").focus();
  });
}
