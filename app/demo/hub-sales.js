// Local mock only (?mock= / ?demo on localhost): fake answers of the hub_* functions of ops/hub/002-dania-workspace.sql
// for the home, companies, followups and sales modules. Same JSON shapes and the same rules as the SQL:
// duplicate check (Instagram / Facebook / website / phone+name = refused; phone or name only = ask, then force),
// status derived from Omar's stage with the same precedence, follow-up rules (no past dates), own tasks only.
// Every business is invented. State lives in memory for this page load (a reload starts again).
// Loaded ONLY in demo mode; the service worker never caches demo/.
import { mockSalesBoard } from "./sales-board.js";
import { mockContentCalendar } from "./content-calendar.js";
import { mockContentReviews } from "./content-reviews.js";

const TZ = "Asia/Hebron";
const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const today = () => dayFmt.format(new Date());
const addDays = (day, n) => { const d = new Date(day + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const ago = (h) => new Date(Date.now() - h * 36e5).toISOString();
const now = () => new Date().toISOString();
const copy = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));
const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };

const PRODUCTS = [
  { id: "ai_employee", label: "الموظف الذكي لخدمة العملاء", short: "الموظف الذكي", sort: 10 },
  { id: "online_store", label: "المتاجر الإلكترونية", short: "المتاجر", sort: 20 },
];
const STATUSES = ["new", "contacted", "waiting_reply", "interested", "meeting", "negotiation", "client", "not_interested"];
const CHANNELS = ["whatsapp", "instagram", "facebook", "call", "visit", "email", "other"];

/* ---------- who is acting (same as hub_can / hub_actor) ---------- */
const ROLE_MODS = {
  sales: ["home", "companies", "followups", "sales", "content", "research"],
  content: ["home", "content"],
};
const role = () => { try { return sessionStorage.getItem("hub.demoRole"); } catch { return null; } };
const can = (m) => role() === "admin" || (ROLE_MODS[role()] || []).includes(m);
const member = () => (role() === "admin" ? "yazan" : role() === "sales" ? "dania" : null);
const actor = () => member() || (role() + "@demo.invalid");
const need = (...mods) => { if (!mods.some(can)) fail("42501", "not allowed"); };

/* ---------- ports of the SQL helpers ---------- */
export function normIg(v) {
  const s = String(v || "").trim().toLowerCase();
  if (!s) return null;
  let h;
  if (s.includes("instagram.com")) {
    h = s.replace(/^.*instagram\.com\//, "").split("?")[0].split("/")[0];
    if (["", "p", "reel", "reels", "stories", "explore", "tv", "accounts"].includes(h)) return null;
  } else if (/[/ ]/.test(s)) return null;
  else h = s;
  h = h.replace(/^@+/, "");
  return /^[a-z0-9._]{1,30}$/.test(h) ? h : null;
}
export function normFb(v) {
  const s = String(v || "").trim();
  if (!s) return null;
  if (!/(facebook\.com|fb\.com)/i.test(s)) return /^[A-Za-z0-9.\-]{2,}$/.test(s) ? s.toLowerCase().replace(/^\/+|\/+$/g, "") : null;
  const p = s.replace(/^.*?(facebook\.com|fb\.com)\/?/i, "");
  if (/^profile\.php/i.test(p)) { const m = p.match(/id=(\d+)/); return m ? "id:" + m[1] : null; }
  const parts = p.split("?")[0].split("/").filter(Boolean);
  if (!parts.length) return null;
  const head = parts[0].toLowerCase();
  if (head === "share") return parts[1] ? "share:" + parts[1] : null;
  if (["pages", "people", "p", "pg"].includes(head)) {
    if (parts.length < 2) return null;
    const tail = parts[parts.length - 1]; const m = tail.match(/(\d{6,})$/);
    return m ? "id:" + m[1] : tail.toLowerCase();
  }
  if (["groups", "watch", "events", "photo", "photo.php", "story.php", "permalink.php"].includes(head)) return null;
  const m = parts[0].match(/(?:^|-)(\d{6,})$/);
  if (m && (/^\d{6,}$/.test(parts[0]) || /-\d{6,}$/.test(parts[0]))) return "id:" + m[1];
  return head;
}
export function normPhone(v) {
  let d = String(v || "").replace(/\D/g, ""); let cc, nat;
  if (d.startsWith("00")) d = d.slice(2);
  if ((d.startsWith("970") || d.startsWith("972")) && d.length >= 11) { cc = d.slice(0, 3); nat = d.slice(3).replace(/^0+/, ""); }
  else if (d.startsWith("0")) { cc = "970"; nat = d.replace(/^0+/, ""); }
  else if (d.length === 9 && d.startsWith("5")) { cc = "970"; nat = d; }
  else return d.length >= 10 ? "intl:" + d : null;
  if (nat.length === 9 && nat.startsWith("5")) return "m:" + nat;
  return nat.length >= 7 ? cc + ":" + nat : null;
}
export function cleanPhone(v) {
  let d = String(v || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0") && d.length === 10) d = "970" + d.slice(1);
  return d || null;
}
export function normWeb(v) {
  let h = String(v || "").trim().toLowerCase();
  if (!h) return null;
  h = h.replace(/^[a-z]+:\/\//, "").split("/")[0].split("?")[0].split("#")[0].split(":")[0].replace(/^www\./, "");
  if (!h || !h.includes(".")) return null;
  if (/(^|\.)(instagram\.com|facebook\.com|fb\.com|wa\.me|whatsapp\.com|linktr\.ee|tiktok\.com|t\.me|youtube\.com|google\.com|goo\.gl)$/.test(h)) return null;
  return h;
}
export const normName = (v) => {
  const s = String(v || "").toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/ـ/g, "")
    .replace(/[\s\p{P}\p{S}]+/gu, "");
  return s || null;
};
const stageStatus = (stage, wonAt) => wonAt ? "client" : stage == null ? null : ({
  not_sent: "new", skipped: "skipped", sent: "contacted", replied_staff: "contacted", decision_maker: "contacted",
  interested: "interested", call: "meeting", not_interested: "not_interested", no_reply: "not_interested",
})[stage] || null;
const rank = (p) => ({ not_interested: -1, skipped: -2, new: 0, contacted: 1, waiting_reply: 1, interested: 2, meeting: 3, negotiation: 4, client: 5 })[p] ?? -3;
const ts = (x) => (x ? new Date(x).getTime() : -Infinity);
function effective(manual, manualAt, derived, lastAct, wonAt) {
  if (wonAt) return "client";
  if (manual == null) return derived || "new";
  if (derived == null) return manual;
  if (ts(manualAt) >= ts(lastAct)) return manual;
  if (derived === "not_interested" || rank(derived) > rank(manual)) return derived;
  return manual;
}
const maxIso = (...a) => a.filter(Boolean).sort().pop() || null;

/* ---------- seed ---------- */
let S = null;
function seed() {
  const t = today();
  S = { leads: new Map(), outreach: new Map(), pipe: new Map(), profiles: new Map(), notes: [], events: [], messages: [], tasks: [], seq: { note: 1, ev: 1, task: 1, lead: 300 } };
  const pk = (id, p) => id + "|" + p;
  const board = mockSalesBoard();
  board.forEach((r, i) => {
    const l = r.lead;
    const ig = normIg(l.instagram), fb = normFb(l.facebook);
    S.leads.set(r.lead_id, {
      id: r.lead_id, source_key: ig ? "instagram:" + ig : fb ? "facebook:" + fb : "name:" + normName(l.business_name),
      business_name: l.business_name, sector: l.sector, category: l.category, governorate: l.governorate,
      phone_whatsapp: l.phone_whatsapp, instagram: ig, facebook: l.facebook, website: l.website, created_at: ago(24 * 40),
    });
    const open = ["sent", "replied_staff", "decision_maker", "call", "interested"].includes(r.stage);
    const fu = !open ? null : [t, addDays(t, -2), addDays(t, 2), null, addDays(t, -5), null, addDays(t, 6)][i % 7];
    S.outreach.set(r.lead_id, {
      stage: r.stage, won_at: null, follow_up_date: fu, last_activity_at: r.last_activity_at,
      last_outbound_at: r.last_outbound_at, summary: r.summary, assignee: r.assignee, channel: r.channel,
    });
    (l.last_msg || []).forEach((m) => S.messages.push({ lead_id: r.lead_id, ...m }));
    if (r.first_sent_at && (l.last_msg || [])[0] && l.last_msg[0].direction === "in") {
      S.messages.push({ lead_id: r.lead_id, direction: "out", sender: r.assignee, body: "مرحبا، معك فريق Flowpal. مين المسؤول عن الرد على رسائل الصفحة عندكم؟", sent_at: r.first_sent_at });
    }
  });
  // Yazan confirmed one client (won_at), Dania set her own status on a few AI-employee companies
  const byStage = (st) => board.filter((r) => r.stage === st).map((r) => r.lead_id);
  const won = byStage("interested")[0]; if (won) S.outreach.get(won).won_at = ago(24 * 3);
  const dm = byStage("decision_maker");
  if (dm[0]) S.pipe.set(pk(dm[0], "ai_employee"), pipeRow(dm[0], "ai_employee", { status: "negotiation", status_at: ago(2), status_by: "dania", next_follow_up: t, follow_up_set_at: ago(2) }));
  const sent = byStage("sent");
  if (sent[0]) S.pipe.set(pk(sent[0], "ai_employee"), pipeRow(sent[0], "ai_employee", { status: "waiting_reply", status_at: ago(1), status_by: "dania", next_follow_up: addDays(t, -1), follow_up_set_at: ago(30) }));
  // an AI-employee company that is also interested in an online store
  const both = byStage("replied_staff")[0];
  if (both) S.pipe.set(pk(both, "online_store"), pipeRow(both, "online_store", { status: "interested", status_at: ago(5), status_by: "dania", next_follow_up: t, follow_up_set_at: ago(5) }));

  // companies Dania added herself (not in Omar's outreach), mostly online stores
  const extra = [
    ["بوتيك ريتال (تجريبي)", "ecommerce", "ملابس", "نابلس", { instagram: "retal.boutique.demo" }, ["online_store"], "negotiation", t, "ريتال", "صاحبة المحل"],
    ["حلويات الشام (تجريبي)", "restaurants", "حلويات", "رام الله والبيرة", { phone_whatsapp: "970599000201" }, ["online_store"], "meeting", addDays(t, -2), "أبو سامر", "المالك"],
    ["عيادة الريم للأسنان (تجريبي)", "clinic", "أسنان", "الخليل", { instagram: "alreem.dental.demo" }, ["ai_employee", "online_store"], "contacted", addDays(t, 1), "د. ريم", "طبيبة"],
    ["متجر زين للإلكترونيات (تجريبي)", "ecommerce", "إلكترونيات", "جنين", { website: "https://zain-demo.example/shop" }, ["online_store"], "client", null, "زين", null],
    ["عطور ليان (تجريبي)", "ecommerce", "عطور", "بيت لحم", { instagram: "layan.perfume.demo", phone_whatsapp: "970569000202" }, ["online_store"], "waiting_reply", addDays(t, -1), null, null],
    ["مكتبة الأمل (تجريبي)", "ecommerce", "قرطاسية", "طولكرم", { facebook: "https://www.facebook.com/alamal.library.demo" }, ["online_store"], "not_interested", null, null, null],
    ["مخبز البلد (تجريبي)", "restaurants", "مخبز", "قلقيلية", { phone_whatsapp: "970599000203" }, ["online_store"], "new", t, null, null],
  ];
  extra.forEach(([name, sector, category, gov, links, prods, status, next, person, prole], i) => {
    const id = 201 + i;
    S.leads.set(id, {
      id, source_key: links.instagram ? "instagram:" + links.instagram : links.website ? "web:" + normWeb(links.website) : "name:" + normName(name),
      business_name: name, sector, category, governorate: gov, phone_whatsapp: links.phone_whatsapp || null,
      instagram: links.instagram || null, facebook: links.facebook || null, website: links.website || null,
      notes: "OFF-LIST: added in Flowpal Hub by dania", created_at: ago(24 * (10 - i)),
    });
    S.profiles.set(id, { contact_person: person, contact_role: prole, preferred_channel: links.instagram ? "instagram" : "whatsapp", updated_at: ago(24 * (10 - i)) });
    prods.forEach((p) => S.pipe.set(pk(id, p), pipeRow(id, p, {
      status: p === "ai_employee" && status === "contacted" ? "contacted" : p === "online_store" && prods.length > 1 ? "new" : status,
      status_at: ago(24 * (5 - (i % 5)) + 1), status_by: "dania", next_follow_up: next, follow_up_set_at: next ? ago(30) : null,
      last_contacted_at: status === "new" ? null : ago(24 * (3 + i)), last_channel: status === "new" ? null : links.instagram ? "instagram" : "whatsapp",
    })));
    ev(id, prods[0], "lead_created", { products: prods, status }, "dania", ago(24 * (10 - i)));
  });
  note(201, "online_store", "بدها متجر بسيط فيه 40 قطعة تقريباً وتوصيل لكل الضفة. حكينا عن موعد البدء.", "dania", ago(26));
  note(201, null, "الأفضل نحكي معها بعد الساعة 4.", "dania", ago(70));
  note(202, "online_store", "اتفقنا على اجتماع بالمحل، بدهم يشوفوا مثال متجر قبل.", "dania", ago(50));
  note(205, null, "بعتتلي على Instagram إنها رح ترد بعد ما تحكي مع أختها.", "dania", ago(28));
  ev(201, "online_store", "status", { from: "meeting", to: "negotiation" }, "dania", ago(26));
  ev(202, "online_store", "contacted", { channel: "visit", next: addDays(t, -2) }, "dania", ago(50));

  // tasks (Omar's tasks table): two for Dania today, one overdue, one for Yazan (must never show for Dania)
  const act = board.filter((r) => ["replied_staff", "decision_maker", "interested", "call"].includes(r.stage));
  const dTasks = act.filter((r) => r.assignee === "dania").slice(0, 3), yTask = act.find((r) => r.assignee === "yazan");
  dTasks.forEach((r, i) => S.tasks.push({
    id: S.seq.task++, lead_id: r.lead_id, assignee: "dania", type: i === 1 ? "reach_decision_maker" : "reply",
    title: i === 1 ? "نوصل لصاحب المحل" : "ردّي على آخر رسالة", goal: i === 1 ? "نعرف مين بيقرر" : "نعرف كم رسالة بتجيهم بالليل",
    suggested_message: i === 0 ? "أهلين، شكراً على الرد. بس حابين نعرف: الرسائل اللي بتيجي بالليل مين بيرد عليها عندكم؟" : null,
    on_hold_reason: null, due_date: i === 2 ? addDays(t, -1) : t, priority: i === 0 ? "high" : "normal", done: false,
  }));
  if (yTask) S.tasks.push({ id: S.seq.task++, lead_id: yTask.lead_id, assignee: "yazan", type: "call", title: "مكالمة يزن (تجريبي)", goal: null, suggested_message: null, on_hold_reason: null, due_date: t, priority: "normal", done: false });
}
function pipeRow(lead_id, product, x) {
  return { lead_id, product, active: true, status: null, status_at: null, status_by: null, next_follow_up: null, follow_up_set_at: null,
    last_contacted_at: null, last_channel: null, created_at: ago(24 * 20), updated_at: x.status_at || ago(24 * 20), ...x };
}
function ev(lead_id, product, kind, payload, who, at) {
  S.events.push({ id: S.seq.ev++, lead_id, product, kind, payload, actor: who, created_at: at || now() });
}
function note(lead_id, product, body, author, at) {
  const id = S.seq.note++;
  S.notes.push({ id, lead_id, product, body, author, created_at: at || now() });
  return id;
}
const st = () => { if (!S) seed(); return S; };

/* ---------- hub_company_json ---------- */
function companyJson(id) {
  const s = st(), l = s.leads.get(id);
  if (!l) return null;
  const o = s.outreach.get(id), pr = s.profiles.get(id);
  const prods = [];
  const ai = s.pipe.get(id + "|ai_employee");
  if ((o && (ai ? ai.active : true)) || (!o && ai && ai.active)) {
    const derived = o ? stageStatus(o.stage, o.won_at) : null;
    const eff = effective(ai && ai.status, ai && ai.status_at, derived, o && o.last_activity_at, o && o.won_at);
    prods.push({
      product: "ai_employee", status: eff, status_source: ai && ai.status && eff === ai.status ? "dania" : "omar", won_at: o && o.won_at,
      next_follow_up: ai && ai.follow_up_set_at ? ai.next_follow_up : (o && o.follow_up_date) || null,
      last_contacted_at: maxIso(ai && ai.last_contacted_at, o && o.last_outbound_at), last_channel: (ai && ai.last_channel) || null,
    });
  }
  for (const p of PRODUCTS) {
    if (p.id === "ai_employee") continue;
    const r = s.pipe.get(id + "|" + p.id);
    if (r && r.active) prods.push({ product: p.id, status: r.status || "new", status_source: "dania", won_at: null, next_follow_up: r.next_follow_up, last_contacted_at: r.last_contacted_at, last_channel: r.last_channel });
  }
  const myNotes = s.notes.filter((n) => n.lead_id === id).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const pipeUpd = [...s.pipe.values()].filter((r) => r.lead_id === id).map((r) => r.updated_at);
  return {
    lead_id: l.id, business_name: l.business_name, sector: l.sector, category: l.category, governorate: l.governorate,
    phone: l.phone_whatsapp, instagram: l.instagram, facebook: l.facebook, website: l.website,
    contact_person: pr ? pr.contact_person : null, contact_role: pr ? pr.contact_role : null,
    preferred_channel: (pr && pr.preferred_channel) || (o && o.channel) || null,
    assignee: o ? o.assignee : null, in_outreach: !!o, omar_stage: o ? o.stage : null, omar_summary: o ? o.summary : null,
    products: prods.map((x) => ({
      product: x.product, label: PRODUCTS.find((p) => p.id === x.product).short, status: x.status, status_source: x.status_source,
      client_confirmed: x.status === "client" && !!x.won_at, next_follow_up: x.next_follow_up, last_contacted_at: x.last_contacted_at, last_channel: x.last_channel,
    })),
    last_note: myNotes[0] ? { body: myNotes[0].body, author: myNotes[0].author, at: myNotes[0].created_at } : null,
    last_update_at: maxIso(o && o.last_activity_at, myNotes[0] && myNotes[0].created_at, ...pipeUpd, pr && pr.updated_at, l.created_at),
  };
}

function findDuplicates(name, phone, ig, fb, web, exclude) {
  const k = { ig: normIg(ig), fb: normFb(fb), web: normWeb(web), ph: normPhone(phone), nm: normName(name) };
  const out = [];
  for (const l of [...st().leads.values()].sort((a, b) => a.id - b.id)) {
    if (exclude != null && l.id === exclude) continue;
    const hits = [];
    if (k.ig && (normIg(l.instagram) === k.ig || l.source_key === "instagram:" + k.ig)) hits.push("instagram");
    if (k.fb && (normFb(l.facebook) === k.fb || l.source_key === "facebook:" + k.fb)) hits.push("facebook");
    if (k.web && (normWeb(l.website) === k.web || l.source_key === "web:" + k.web)) hits.push("website");
    if (k.ph && normPhone(l.phone_whatsapp) === k.ph) hits.push("phone");
    if (k.nm && normName(l.business_name) === k.nm) hits.push("name");
    if (hits.length) out.push({ lead_id: l.id, business_name: l.business_name, match: hits,
      strong: hits.some((h) => ["instagram", "facebook", "website"].includes(h)) || (hits.includes("phone") && hits.includes("name")) });
  }
  return out;
}

function ensurePipe(id, product) {
  if (!st().leads.has(id)) fail("P0002", "not found");
  if (!PRODUCTS.some((p) => p.id === product)) fail("22023", "bad product");
  const key = id + "|" + product;
  if (!S.pipe.has(key)) S.pipe.set(key, pipeRow(id, product, { updated_at: now() }));
  return S.pipe.get(key);
}
const touch = (r) => { r.updated_at = now(); };
const nz = (v) => { const s = String(v ?? "").trim(); return s ? s : null; };

/* ---------- read RPCs ---------- */
export async function products() {
  need("companies", "home", "sales");
  return PRODUCTS.map(({ id, label, short }) => ({ id, label, short }));
}
export async function companies() {
  need("companies", "followups", "sales");
  const s = st();
  return [...s.leads.keys()].sort((a, b) => a - b)
    .filter((id) => s.outreach.has(id) || [...s.pipe.values()].some((r) => r.lead_id === id && r.active))
    .map(companyJson);
}
export async function company(id) {
  need("companies");
  const c = companyJson(id);
  if (!c || (!c.in_outreach && !c.products.length)) fail("P0002", "not found");
  const s = st();
  return copy({
    ...c,
    notes: s.notes.filter((n) => n.lead_id === id).sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map(({ id: nid, product, body, author, created_at }) => ({ id: nid, product, body, author, at: created_at })),
    messages: s.messages.filter((m) => m.lead_id === id).sort((a, b) => b.sent_at.localeCompare(a.sent_at)).slice(0, 10)
      .map(({ direction, sender, body, sent_at }) => ({ direction, sender, body, sent_at })),
    open_tasks: s.tasks.filter((k) => k.lead_id === id && !k.done).sort((a, b) => a.due_date.localeCompare(b.due_date))
      .map(({ id: tid, type, title, suggested_message, goal, on_hold_reason, due_date, priority, assignee }) => ({ id: tid, type, title, suggested_message, goal, on_hold_reason, due_date, priority, assignee })),
    history: s.events.filter((e) => e.lead_id === id).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 30)
      .map((e) => ({ kind: e.kind, product: e.product, payload: e.payload, actor: e.actor, at: e.created_at })),
  });
}

/* ---------- write RPCs ---------- */
export async function leadCreate(p) {
  need("companies");
  p = p || {};
  const name = nz(p.business_name), sector = p.sector, phone = cleanPhone(p.phone), ig = normIg(p.instagram);
  const fb = nz(p.facebook), web = nz(p.website);
  const prods = [...new Set(Array.isArray(p.products) ? p.products : [])];
  const status = nz(p.status) || "new", next = nz(p.next_follow_up);
  if (!name || name.length > 200) fail("22023", "business_name required");
  if (!["ecommerce", "clinic", "restaurants"].includes(sector)) fail("22023", "sector must be ecommerce, clinic or restaurants");
  if (!prods.length || prods.some((x) => !PRODUCTS.some((q) => q.id === x))) fail("22023", "products required");
  if (!STATUSES.includes(status)) fail("22023", "bad status");
  if (nz(p.instagram) && !ig) fail("22023", "bad instagram");
  if (phone && !normPhone(phone)) fail("22023", "bad phone");
  if (!phone && !ig && !fb && !web) fail("22023", "one contact (phone, instagram, facebook or website) required");
  const dups = findDuplicates(name, phone, ig, fb, web);
  if (dups.some((d) => d.strong)) return copy({ created: false, reason: "duplicate", duplicates: dups });
  if (dups.length && p.force !== true) return copy({ created: false, reason: "possible_duplicate", duplicates: dups });
  const s = st(), id = s.seq.lead++, who = actor();
  let key = ig ? "instagram:" + ig : normFb(fb) ? "facebook:" + normFb(fb) : normWeb(web) ? "web:" + normWeb(web) : "name:" + normName(name);
  if ([...s.leads.values()].some((l) => l.source_key === key)) key += ":hub" + Date.now();
  s.leads.set(id, { id, source_key: key, business_name: name, sector, governorate: nz(p.governorate), category: nz(p.category), website: web,
    instagram: ig, facebook: fb, phone_whatsapp: phone, notes: "OFF-LIST: added in Flowpal Hub by " + who, created_at: now() });
  s.profiles.set(id, { contact_person: nz(p.contact_person), contact_role: nz(p.contact_role), preferred_channel: nz(p.preferred_channel), updated_at: now() });
  prods.forEach((x) => s.pipe.set(id + "|" + x, pipeRow(id, x, { status, status_at: now(), status_by: who, next_follow_up: next, follow_up_set_at: next ? now() : null, updated_at: now() })));
  if (nz(p.note)) note(id, null, nz(p.note), who);
  ev(id, null, "lead_created", { products: prods, status, source_key: key }, who);
  if (dups.length) ev(id, null, "possible_duplicate", { duplicates: dups }, who);
  return { created: true, lead_id: id };
}

export async function leadUpdate(id, p) {
  need("companies");
  const s = st(), l = s.leads.get(id);
  if (!l) fail("P0002", "not found");
  const has = (k) => Object.prototype.hasOwnProperty.call(p, k);
  const name = has("business_name") ? nz(p.business_name) : l.business_name;
  const sector = has("sector") ? p.sector : l.sector;
  const phone = has("phone") ? cleanPhone(p.phone) : l.phone_whatsapp;
  const ig = has("instagram") ? normIg(p.instagram) : l.instagram;
  const fb = has("facebook") ? nz(p.facebook) : l.facebook;
  const web = has("website") ? nz(p.website) : l.website;
  if (!name) fail("22023", "business_name required");
  if (has("sector") && !["ecommerce", "clinic", "restaurants"].includes(sector)) fail("22023", "sector must be ecommerce, clinic or restaurants");
  if (has("instagram") && nz(p.instagram) && !ig) fail("22023", "bad instagram");
  if (has("phone") && phone && !normPhone(phone)) fail("22023", "bad phone");
  let dups = [];
  if (["business_name", "phone", "instagram", "facebook", "website"].some(has)) {
    dups = findDuplicates(has("business_name") ? name : null, has("phone") ? phone : null, has("instagram") ? ig : null,
      has("facebook") ? fb : null, has("website") ? web : null, id);
    if (dups.some((d) => d.strong) || (dups.length && p.force !== true)) return copy({ updated: false, reason: "duplicate", duplicates: dups });
  }
  const pick = (o) => ({ business_name: o.business_name, sector: o.sector, category: o.category, governorate: o.governorate, phone: o.phone_whatsapp, instagram: o.instagram, facebook: o.facebook, website: o.website });
  const before = pick(l);
  Object.assign(l, { business_name: name, sector, phone_whatsapp: phone, instagram: ig, facebook: fb, website: web,
    category: has("category") ? nz(p.category) : l.category, governorate: has("governorate") ? nz(p.governorate) : l.governorate });
  if (["contact_person", "contact_role", "preferred_channel"].some(has)) {
    const pr = s.profiles.get(id) || { contact_person: null, contact_role: null, preferred_channel: null };
    if (has("contact_person")) pr.contact_person = nz(p.contact_person);
    if (has("contact_role")) pr.contact_role = nz(p.contact_role);
    if (has("preferred_channel")) pr.preferred_channel = nz(p.preferred_channel);
    pr.updated_at = now(); s.profiles.set(id, pr);
  }
  ev(id, null, "lead_updated", { before, after: pick(l), possible_duplicates: dups }, actor());
  return { updated: true };
}

export async function setStatus(id, product, status, n) {
  need("companies", "followups");
  if (!STATUSES.includes(status)) fail("22023", "bad status");
  const r = ensurePipe(id, product);
  const old = (companyJson(id).products.find((x) => x.product === product) || {}).status || null;
  Object.assign(r, { status, status_at: now(), status_by: actor(), active: true }); touch(r);
  if (nz(n)) note(id, product, nz(n), actor());
  ev(id, product, status === "client" ? "client_claimed" : "status", { from: old, to: status, note: nz(n) }, actor());
  return copy(companyJson(id));
}

export async function setProducts(id, list) {
  need("companies");
  if (!Array.isArray(list) || !list.length) fail("22023", "products required");
  list.forEach((x) => ensurePipe(id, x));
  for (const r of S.pipe.values()) if (r.lead_id === id) { r.active = list.includes(r.product); touch(r); }
  if (S.outreach.has(id) && !list.includes("ai_employee")) { const r = ensurePipe(id, "ai_employee"); r.active = false; }
  ev(id, null, "products", { products: list }, actor());
  return copy(companyJson(id));
}

export async function addNote(id, body, product) {
  need("companies", "followups");
  if (!nz(body)) fail("22023", "note required");
  if (!st().leads.has(id)) fail("P0002", "not found");
  if (product && !PRODUCTS.some((p) => p.id === product)) fail("22023", "bad product");
  const nid = note(id, product || null, nz(body), actor());
  ev(id, product || null, "note", { note_id: nid }, actor());
  return { id: nid };
}

export async function followUp(id, product, action, next, n, channel) {
  need("followups", "companies");
  if (!["contacted", "postponed", "set"].includes(action)) fail("22023", "bad action");
  if (["postponed", "set"].includes(action) && !next) fail("22023", "date required");
  if (next && next < today()) fail("22023", "date in the past");
  if (channel && !CHANNELS.includes(channel)) fail("22023", "bad channel");
  const r = ensurePipe(id, product);
  const cur = (companyJson(id).products.find((x) => x.product === product) || {}).status || "new";
  Object.assign(r, { active: true, next_follow_up: next || null, follow_up_set_at: now() });
  if (action === "contacted") {
    r.last_contacted_at = now(); r.last_channel = channel || r.last_channel;
    if (cur === "new") Object.assign(r, { status: "contacted", status_at: now(), status_by: actor() });
  }
  touch(r);
  if (nz(n)) note(id, product, nz(n), actor());
  ev(id, product, action === "contacted" ? "contacted" : action === "postponed" ? "postponed" : "follow_up_set", { next: next || null, channel: channel || null, note: nz(n) }, actor());
  return copy(companyJson(id));
}

export async function taskDone(taskId) {
  need("home");
  const k = st().tasks.find((x) => x.id === taskId && !x.done && (x.assignee === member() || role() === "admin"));
  if (!k) fail("P0002", "not found");
  k.done = true; k.done_at = now();
  ev(k.lead_id, null, "task_done", { task_id: taskId }, actor());
}

export async function overview() {
  need("home");
  const t = today(), r = { today: t };
  if (can("companies") || can("followups")) {
    const s = st(), me = member();
    const cs = await companies();
    r.tasks_today = s.tasks.filter((k) => !k.done && k.due_date <= t && (k.assignee === me || (me == null && role() === "admin")))
      .sort((a, b) => (b.priority === "high") - (a.priority === "high") || a.due_date.localeCompare(b.due_date))
      .map((k) => ({ id: k.id, lead_id: k.lead_id, business_name: (s.leads.get(k.lead_id) || {}).business_name || null, type: k.type, title: k.title,
        suggested_message: k.suggested_message, goal: k.goal, on_hold_reason: k.on_hold_reason, due_date: k.due_date, priority: k.priority }));
    const open = (x) => !["client", "not_interested", "skipped"].includes(x.status);
    r.products = PRODUCTS.map((p) => {
      const xs = cs.flatMap((c) => c.products.filter((x) => x.product === p.id));
      const by = {}; xs.forEach((x) => { by[x.status] = (by[x.status] || 0) + 1; });
      return { product: p.id, label: p.short, companies: xs.filter((x) => x.status !== "skipped").length,
        due_today: xs.filter((x) => x.next_follow_up === t && open(x)).length,
        overdue: xs.filter((x) => x.next_follow_up && x.next_follow_up < t && open(x)).length, by_status: by };
    });
    const hub = s.events.filter((e) => e.kind !== "possible_duplicate").sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 10)
      .map((e) => ({ type: "hub", kind: e.kind, lead_id: e.lead_id, business_name: (s.leads.get(e.lead_id) || {}).business_name || null, product: e.product, actor: e.actor, at: e.created_at, to: e.payload && e.payload.to }));
    const om = [...s.outreach.entries()].filter(([, o]) => !["not_sent", "skipped"].includes(o.stage))
      .sort((a, b) => String(b[1].last_activity_at).localeCompare(String(a[1].last_activity_at))).slice(0, 10)
      .map(([id, o]) => ({ type: "omar", lead_id: id, business_name: s.leads.get(id).business_name, stage: o.stage, summary: o.summary, at: o.last_activity_at }));
    r.latest = [...hub, ...om].sort((a, b) => String(b.at).localeCompare(String(a.at)));
  }
  if (can("content")) {
    const rows = await mockContentCalendar(t, t);
    r.posts_today = rows.filter((c) => c.scheduled_at).map(({ id, title, content_type, platforms, scheduled_at, status }) => ({ id, title, content_type, platforms, scheduled_at, status }));
    r.reviews_pending = (await mockContentReviews()).filter((x) => x.status === "pending").length;
  }
  return copy(r);
}
