// Module "sales": outreach analytics + the businesses list (port of the n8n sales board, Build page jsCode).
// Data: rpc('hub_sales_board') only (security definer, checks hub_can('sales'), fixed field list, no money fields).
// KPI formulas are the same as the board and scripts/kpis.py (kpi-definitions.md): unit = the business,
// no reply is never a refusal, interest is never a subscription, «—» under 5 businesses or under 70% data.
// Read only. Product switcher (task 004 decision 9): the AI employee = Omar's KPIs as before + the 8 sales statuses;
// other products (online stores) = the 8-status funnel and follow-ups only (Omar has no outreach KPIs for them yet);
// «مقارنة» = products side by side. Those parts come from rpc('hub_companies') and rpc('hub_products').
// ?demo: fake data from demo/sales-board.js and demo/hub-sales.js.
import { $, esc, safeUrl, toast, useStyle, errText, who as WHO_NAME } from "../lib.js";
import * as P from "../shared/pipeline.js";

const TZ = "Asia/Hebron";
const STAGE = {
  not_sent: "لسا ما انبعتلها", sent: "انبعتت، ما ردوا لسا", replied_staff: "رد موظف",
  decision_maker: "مع صاحب القرار", call: "مكالمة", interested: "مهتمين",
  not_interested: "مش مهتمين", no_reply: "ما ردوا (مسكّرة)", skipped: "مستبعدة",
};
const STAGE_ORDER = ["interested", "call", "decision_maker", "replied_staff", "sent", "not_interested", "no_reply", "not_sent", "skipped"];
const LEVEL = {
  positive: { label: "إيجابي", cls: "pos", rank: 0 }, medium: { label: "متوسط", cls: "med", rank: 1 },
  weak: { label: "ضعيف", cls: "weak", rank: 2 }, negative: { label: "سلبي", cls: "neg", rank: 4 },
};
const SECTOR = { ecommerce: "متاجر أونلاين", clinic: "عيادات", clinics: "عيادات", real_estate: "عقارات", restaurants: "مطاعم وكافيهات", cafes: "كافيهات", other: "أخرى", unclassified: "غير مصنّف" };
// people names come from hub_me() (lib.js who()), never from the code
const ACCOUNT = { company: "رقم الشركة", personal: "حساب شخصي" };
const SENDER = { owner: "صاحب المحل", staff: "موظف" };
const sender = (s) => SENDER[s] || WHO_NAME(s);
const CHANNEL = { whatsapp: "واتساب", instagram: "Instagram", facebook: "Facebook" };
const ACTIVE = ["sent", "replied_staff", "decision_maker", "call", "interested"];
const DM_STAGES = ["decision_maker", "call", "interested"];
const PAY = { yes: "مستعدين يدفعوا", maybe: "يمكن يدفعوا", no: "مش مستعدين يدفعوا" };
// Same codes as outreach.loss_reason. Wording kept close to the board; "cost" says "budget" only.
const REASON = {
  has_staff: "عندهم موظفين بيغطوا الرسائل", no_problem: "ما في مشكلة / الرسائل قليلة", cost: "الميزانية ما بتسمح",
  other_provider: "شغالين مع شركة أو حل تاني", prefers_human: "بدهم بشري يرد مش آلي", has_website: "عندهم موقع والأوردرات منه",
  needs_trial: "بدون تجربة ما بقدروا يحكموا", timing: "مش هلأ / مؤجل", not_relevant: "مش معنيين بدون سبب",
  silent_after_greeting: "ردوا على التحية وسكتوا", silent_after_pitch: "سكتوا بعد شرح المنتج",
  no_reply: "ما ردوا نهائياً / رد آلي", wrong_contact: "رقم أو حساب غلط",
};
const MIN_N = 5, MIN_COVERAGE = 0.7;
const REPLIED_STAGES = ["replied_staff", "decision_maker", "call", "interested", "not_interested"];
const REFUSAL = ["has_staff", "no_problem", "cost", "other_provider", "prefers_human", "has_website", "not_relevant"];
const DEFERRAL = ["needs_trial", "timing"];
const SILENCE = ["silent_after_greeting", "silent_after_pitch", "no_reply"];
const PAGE = 40;

const CSS = `
.sx-views{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:14px}
.sx-seg{display:inline-flex;background:var(--soft);border-radius:10px;padding:3px}
.sx-seg button{border:0;background:none;border-radius:8px;padding:7px 16px;font-weight:600;cursor:pointer;color:var(--muted)}
.sx-seg button[aria-pressed="true"]{background:var(--card);color:var(--ink);box-shadow:0 1px 2px rgba(14,31,38,.12)}
.sx-views select{flex:0 1 auto;width:auto;margin-inline-start:auto;padding:7px 10px;font-size:14px}
.sx-upd{font-size:12px;color:var(--muted);display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.sx-upd button{font-size:12px;padding:3px 9px}
.sx-kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:14px}
.sx-kpi{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:10px 12px;display:flex;flex-direction:column;gap:1px;min-width:0}
.sx-kpi b{font:700 24px/1.2 var(--f-head);direction:ltr;text-align:right;unicode-bidi:plaintext}
.sx-kpi .kl{font-weight:600;font-size:14px;line-height:1.35}
.sx-kpi .ks{color:var(--muted);font-size:12.5px}
.sx-kpi .kn{color:#9A4E12;font-size:12px}
.sx-kpi details{margin-top:6px;border-top:1px dashed var(--line);padding-top:4px}
.sx-kpi summary{font-size:12px;color:var(--muted);cursor:pointer;list-style:none}
.sx-kpi summary::-webkit-details-marker{display:none}
.sx-kpi summary::after{content:" ؟"}
.sx-kpi details p{margin:2px 0 0;font-size:12px;color:var(--muted)}
.sx-kpi.q{border-top:3px solid var(--h-green)} .sx-kpi.warn{border-top:3px solid var(--h-yellow)}
.sx-grid{display:grid;gap:10px;margin-bottom:12px}
.sx-card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:14px;min-width:0}
.sx-card h3{font-size:15px;margin:0 0 10px}
.sx-card h4{font:600 13px/1.4 var(--f-body);color:var(--muted);margin:12px 0 4px}
.sx-bar{display:grid;grid-template-columns:minmax(84px,40%) 1fr auto;gap:8px;align-items:center;margin:6px 0;font-size:14px}
.sx-bar .bl{line-height:1.35}
.sx-bar .bt{background:var(--soft);border-radius:4px;height:10px;overflow:hidden}
.sx-bar .bt i{display:block;height:100%;background:var(--teal);border-radius:4px}
.sx-bar .bn{font-weight:600;white-space:nowrap}
.sx-bar .bn em{font-style:normal;font-weight:400;color:var(--muted);font-size:12px}
.sx-note{color:#9A4E12;font-size:12.5px;margin:0 0 6px}
.sx-scroll{overflow-x:auto;margin-inline:-14px;padding-inline:14px}
table.sx-bd{border-collapse:collapse;width:100%;font-size:13.5px;min-width:440px}
.sx-bd th,.sx-bd td{padding:7px 6px;border-bottom:1px solid var(--soft);text-align:center;white-space:nowrap}
.sx-bd th{font-weight:500;color:var(--muted);font-size:12px}
.sx-bd th:first-child,.sx-bd td:first-child{text-align:right;white-space:normal}
.sx-tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-bottom:12px}
.sx-tile{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:8px 10px}
.sx-tile b{display:block;font:700 19px/1.2 var(--f-head)}
.sx-tile span{color:var(--muted);font-size:12px}
.sx-find{display:grid;grid-template-columns:1fr;gap:8px;margin-bottom:12px}
.sx-list{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.sx-lead{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:12px 14px;min-width:0}
.sx-lead .hd{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.sx-lead .nm{font:600 16px/1.35 var(--f-head);overflow-wrap:anywhere}
.sx-lead .id{font-size:12px;color:var(--muted);white-space:nowrap}
.sx-lead .where{font-size:13px;color:var(--muted)}
.sx-lead .tags{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 2px}
.sx-st{font-size:12px;padding:3px 8px;border-radius:6px;background:var(--soft);white-space:nowrap}
.sx-st.hot{background:#E2F4EA;color:#145C33}
.sx-st.cold{color:var(--muted)}
.sx-lv{font-size:12px;white-space:nowrap;display:inline-flex;align-items:center;gap:5px;padding:3px 0}
.sx-lv::before{content:"";width:8px;height:8px;border-radius:50%;background:currentColor}
.sx-lv.pos{color:#1F7A45} .sx-lv.med{color:#8A6A00} .sx-lv.weak{color:#B4561A} .sx-lv.neg{color:#A8322C}
.sx-dm{font-size:12px;color:#1F7A45;font-weight:600;padding:3px 0}
.sx-kv{display:grid;grid-template-columns:86px 1fr;gap:4px 10px;margin-top:8px;font-size:14px}
.sx-kv dt{color:var(--muted);font-size:12.5px;padding-top:1px}
.sx-kv dd{margin:0;min-width:0;overflow-wrap:anywhere}
.sx-kv .mut{color:var(--muted);font-size:12.5px}
.sx-kv details summary{cursor:pointer}
.sx-kv .full{margin-top:4px;white-space:pre-wrap}
.sx-ins{margin-top:4px;font-size:13px;color:#1F7A45}
.sx-hold{color:#A8322C;font-size:13px}
.sx-links{display:flex;flex-wrap:wrap;gap:4px 12px}
.sx-more{display:block;margin:14px auto 0}
.sx-foot{margin-top:16px;padding:12px 14px;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);font-size:14px}
.sx-prod{margin-bottom:12px}
.sx-cmp th,.sx-cmp td{text-align:center}
.sx-cmp td b{font-weight:600}
.sx-cmp tr.sum td{border-top:2px solid var(--line);font-weight:600}
@media (min-width:600px){ .sx-kpis{grid-template-columns:repeat(3,minmax(0,1fr))} .sx-tiles{grid-template-columns:repeat(7,minmax(0,1fr))} .sx-find{grid-template-columns:1fr 220px} }
@media (min-width:900px){ .sx-kpis{grid-template-columns:repeat(4,minmax(0,1fr))} .sx-grid{grid-template-columns:repeat(2,minmax(0,1fr))} .sx-list{grid-template-columns:repeat(2,minmax(0,1fr))} }`;

/* ===== helpers ===== */
const cut = (s, n) => { s = String(s ?? "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
const fmt = (iso, withTime = true) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const o = { timeZone: TZ, day: "2-digit", month: "2-digit" };
  if (withTime) Object.assign(o, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return new Intl.DateTimeFormat("en-GB", o).format(d).replace(",", "");
};
const first = (a) => (Array.isArray(a) ? a[0] : a) || null;
const cntOf = (a) => (Array.isArray(a) && a[0] && a[0].count) || 0;
const median = (a) => { if (!a.length) return null; a = a.slice().sort((x, y) => x - y); const m = a.length >> 1; return a.length % 2 ? a[m] : Math.round((a[m - 1] + a[m]) / 2); };
const mins = (m) => m == null ? "-" : m < 60 ? `${m} د` : m < 1440 ? `${Math.round(m / 6) / 10} س` : `${Math.round(m / 144) / 10} يوم`;
const weekOf = (iso) => { const d = new Date(iso); const day = (d.getUTCDay() + 1) % 7; d.setUTCDate(d.getUTCDate() - day); return d.toISOString().slice(0, 10); }; // weeks start Saturday
const waLink = (p) => { const d = String(p || "").replace(/\D/g, ""); return d ? `https://wa.me/${d}` : null; };
function localPhone(p) {
  let d = String(p || "").replace(/\D/g, "");
  if (/^(970|972)5\d{8}$/.test(d)) d = "0" + d.slice(3);
  return d;
}
function channelLink(r, l) {
  if (r.channel === "whatsapp" && l.phone_whatsapp) return waLink(l.phone_whatsapp);
  if (r.channel === "instagram" && l.instagram) return safeUrl(l.instagram);
  if (r.channel === "facebook" && l.facebook) return safeUrl(l.facebook);
  return safeUrl(l.instagram) || safeUrl(l.facebook) || waLink(l.phone_whatsapp) || safeUrl(l.website) || null;
}
function skipGroup(t) {
  t = String(t || "").toLowerCase();
  if (/duplicate|مكرر/.test(t)) return null;   // duplicates are not real businesses
  if (/whatsapp|واتس|dead|ما بفتح|ما في طريقة|no channel|link/.test(t)) return "ما في قناة تواصل شغالة";
  if (/follower|متابعين/.test(t)) return "متابعين قليل";
  if (/removed|yazan/.test(t)) return "انشالت من القائمة";
  if (/مناسب|عميل محتمل|ما بدها|جديد|fit/.test(t)) return "مش مناسب لنا";
  return "أسباب أخرى";
}

/* ===== data ===== */
let cache = null;   // { at, rows } kept in memory for this page load only (logout reloads the page)
async function loadRows(ctx, force) {
  if (!force && cache && Date.now() - cache.at < 120000) return cache;
  let rows;
  if (ctx.demo) {
    rows = (await import("../demo/sales-board.js")).mockSalesBoard();
  } else {
    const { data, error } = await ctx.sb.rpc("hub_sales_board");
    if (error) throw error;
    rows = Array.isArray(data) ? data : [];
  }
  cache = { at: Date.now(), rows };
  return cache;
}

function toItems(rows) {
  const items = rows.filter((r) => r && r.lead_id != null).map((r) => {
    const l = r.lead || {};
    const tasks = Array.isArray(l.open_task) ? l.open_task : [];
    const dm = DM_STAGES.includes(r.stage) || (l.owner_msg || []).length > 0;
    const seg = r.stage === "not_sent" ? "new" : r.stage === "skipped" ? "skip" : "done";
    return { r, l, msg: first(l.last_msg), task: tasks.find((t) => !t.on_hold_reason) || tasks[0] || null, ins: first(l.insight), dm, seg, replied: !!r.first_reply_at };
  });
  const segRank = { done: 0, new: 1, skip: 2 };
  items.sort((a, b) =>
    segRank[a.seg] - segRank[b.seg] ||
    (ACTIVE.includes(b.r.stage) - ACTIVE.includes(a.r.stage)) ||
    ((LEVEL[a.r.status_level] || { rank: 3 }).rank - (LEVEL[b.r.status_level] || { rank: 3 }).rank) ||
    String(b.r.last_activity_at || "").localeCompare(String(a.r.last_activity_at || "")) ||
    a.r.lead_id - b.r.lead_id);
  for (const x of items) {
    x.q = [x.r.lead_id, x.l.business_name, SECTOR[x.l.sector], x.l.sector, x.l.category, x.l.governorate, x.l.instagram, x.l.phone_whatsapp, localPhone(x.l.phone_whatsapp)].join(" ").toLowerCase();
  }
  return items;
}

/* ===== analytics (same formulas as the board / kpis.py) ===== */
const isDup = (x) => x.r.stage === "skipped" && /duplicate|مكرر/i.test(x.r.skip_reason || "");
function stats(list) {
  const c = list.filter((x) => x.r.first_sent_at || cntOf(x.l.out_n) > 0);
  const rep = c.filter((x) => x.r.first_reply_at || REPLIED_STAGES.includes(x.r.stage));
  const repSet = new Set(rep);
  const ownerNo = (x) => x.r.stage === "not_interested" && (x.l.owner_msg || []).length > 0;
  const dm = c.filter((x) => DM_STAGES.includes(x.r.stage) || ownerNo(x));
  const interest = c.filter((x) => ["call", "interested"].includes(x.r.stage) || x.r.status_level === "positive");
  const refused = c.filter((x) => repSet.has(x) && (x.r.stage === "not_interested" || REFUSAL.includes(x.r.loss_reason)));
  const resp = c.map((x) => x.r.response_minutes).filter((m) => m != null && m >= 0);
  return {
    n: list.filter((x) => !isDup(x)).length, c: c.length, rep: rep.length, dm: dm.length, interest: interest.length, refused: refused.length,
    noRep: c.length - rep.length,
    pain: list.filter((x) => cntOf(x.l.pain_n) > 0).length,
    open: list.filter((x) => DM_STAGES.includes(x.r.stage)).length,
    follow: list.filter((x) => REPLIED_STAGES.includes(x.r.stage) && x.r.stage !== "not_interested" && x.r.last_inbound_at &&
      (!x.r.last_outbound_at || x.r.last_inbound_at > x.r.last_outbound_at)).length,
    msgOut: list.reduce((t, x) => t + cntOf(x.l.out_n), 0), msgIn: list.reduce((t, x) => t + cntOf(x.l.in_n), 0),
    skipped: list.filter((x) => x.r.stage === "skipped").length,
    resp: median(resp), respN: resp.length, wtpAns: c.filter((x) => x.ins && x.ins.willing_to_pay).length,
    cList: c, refusedList: refused,
  };
}
function rate(num, den, coverage) {
  if (!den) return { v: "-", note: "ما في جهات بالمقام" };
  if (den < MIN_N) return { v: "—", note: `عينة صغيرة (${den} جهات بس)` };
  if (coverage != null && coverage < MIN_COVERAGE) return { v: "—", note: `البيانات ناقصة (${Math.round(coverage * 100)}% بس معبّاة)` };
  return { v: `${Math.round(100 * num / den)}%`, note: "" };
}
const pv = (n, d) => rate(n, d).v;
const kpi = (label, val, sub, def, tone, note) =>
  `<div class="sx-kpi ${tone || ""}"><b>${esc(val)}</b><span class="kl">${label}</span><span class="ks">${sub}</span>${note ? `<span class="kn">${esc(note)}</span>` : ""}<details><summary>كيف بنحسبها</summary><p>${def}</p></details></div>`;
const rateKpi = (label, num, den, sub, def, tone) => { const r = rate(num, den); return kpi(label, r.v, sub, def, tone, r.note); };
const bar = (label, n, max, extra) =>
  `<div class="sx-bar"><span class="bl">${label}</span><span class="bt"><i style="width:${max ? Math.max(2, Math.round(100 * n / max)) : 0}%"></i></span><span class="bn">${n}${extra ? ` <em>${extra}</em>` : ""}</span></div>`;

function breakdown(title, list, keyFn, labelFn) {
  const groups = {};
  list.forEach((x) => { const k = keyFn(x); if (k == null) return; (groups[k] = groups[k] || []).push(x); });
  const keys = Object.keys(groups).map((k) => [k, stats(groups[k])]).filter(([, s]) => s.c > 0).sort((a, b) => b[1].c - a[1].c);
  if (!keys.length) return "";
  return `<div class="sx-card"><h3>${title}</h3><div class="sx-scroll"><table class="sx-bd"><thead><tr><th></th><th>تواصلنا</th><th>نسبة الرد</th><th>صاحب القرار</th><th>الاهتمام</th><th>رفض العرض</th></tr></thead><tbody>` +
    keys.map(([k, s]) => `<tr><td>${esc(labelFn(k))}</td><td>${s.c}</td><td>${pv(s.rep, s.c)}</td><td>${pv(s.dm, s.c)}</td><td>${pv(s.interest, s.c)}</td><td>${pv(s.refused, s.rep)}</td></tr>`).join("") +
    `</tbody></table></div><p class="muted small" style="margin:6px 0 0">«—» = أقل من 5 جهات، ما منحط نسبة.</p></div>`;
}

function analyticsHTML(list, who) {
  const s = stats(list);
  const withReason = s.refusedList.filter((x) => x.r.loss_reason).length;
  const coverage = s.refused ? withReason / s.refused : 1;
  const cards = [
    kpi("جهات تواصلنا معها", String(s.c), `من ${s.n} مسجلة (بدون تكرار)`, "جهات انبعتلها أول رسالة"),
    rateKpi("نسبة الرد", s.rep, s.c, `${s.rep} من ${s.c}`, "جهات رد فيها شخص حقيقي ÷ جهات تواصلنا معها"),
    rateKpi("الوصول لصاحب القرار", s.dm, s.c, `${s.dm} من ${s.c}`, "صاحب القرار أو مكالمة أو مهتمين (أو صاحب المحل رفض بنفسه) ÷ جهات تواصلنا معها"),
    rateKpi("نسبة الاهتمام", s.interest, s.c, `${s.interest} من ${s.c} · ${pv(s.interest, s.rep)} ممن ردّوا`, "مكالمة أو مهتمين أو مستوى إيجابي ÷ جهات تواصلنا معها. الاهتمام مش اشتراك", "q"),
    rateKpi("نسبة رفض العرض", s.refused, s.rep, `${s.refused} من ${s.rep} ردّوا`, "قالوا لا ÷ جهات ردّت. عدم الرد مش رفض"),
    kpi("لم يردّوا (ليس رفضًا)", String(s.noRep), `${pv(s.noRep, s.c)} من جهات تواصلنا معها`, "جهات تواصلنا معها وما رد فيها شخص"),
    kpi("فرص بيع مفتوحة", String(s.open), "صاحب قرار أو مكالمة أو مهتمين", "المرحلة الحالية بالقاعدة", "q"),
    kpi("يحتاجون متابعة", String(s.follow), "المحل كتب آخر رسالة", "محادثات مفتوحة آخر رسالة فيها منهم", s.follow ? "warn" : ""),
    kpi("احتياجات مذكورة", String(s.pain), "جهات حكت عن مشكلة حقيقية", "جهات إلها ملاحظة فيها مشكلة موصوفة"),
    kpi("وقت أول رد (الوسيط)", mins(s.resp), `من ${s.respN} محادثة`, "بين أول رسالة منا وأول رد منهم"),
    kpi("رسائل", `${s.msgOut} / ${s.msgIn}`, "صادرة / واردة", "عدد رسائل مش جهات، للمعلومة بس"),
    kpi("اشتراكات", "-", "لسا ما في حقل للاشتراك", "الإدارة بتأكد كل اشتراك"),
  ].join("");

  const steps = [["جهات تواصلنا معها", s.c], ["ردّ شخص حقيقي", s.rep], ["وصلنا لصاحب القرار", s.dm], ["مهتمين", s.interest]];
  const funnel = `<div class="sx-card"><h3>مسار التواصل</h3>${steps.map(([l, n], i) => bar(l, n, s.c, i ? pv(n, steps[i - 1][1]) + " من اللي قبل" : "")).join("")}<p class="muted small" style="margin:6px 0 0">الاشتراكات بتنقاس لما ينضاف حقل الاشتراك.</p></div>`;

  const group = (codes, from) => { const m = {}; from.forEach((x) => { const k = x.r.loss_reason; if (codes.includes(k)) m[k] = (m[k] || 0) + 1; }); return m; };
  const block = (title, m, tot) => {
    const ks = Object.keys(m).sort((a, b) => m[b] - m[a]); const mx = ks.length ? m[ks[0]] : 0;
    return ks.length ? `<h4>${title}</h4>` + ks.map((k) => bar(esc(REASON[k] || k), m[k], mx, tot ? pv(m[k], tot) : "")).join("") : "";
  };
  const covNote = coverage < MIN_COVERAGE ? `<p class="sx-note">السبب مسجل لـ ${withReason} من ${s.refused} رفض بس (${Math.round(coverage * 100)}%): الصورة لسا ناقصة.</p>` : "";
  const reasons = `<div class="sx-card"><h3>أسباب الرفض المتكررة (${s.refused} رفض)</h3>${covNote}${block("رفض", group(REFUSAL, s.refusedList), withReason) || `<p class="muted small">لسا ما في أسباب مسجلة.</p>`}${block("مؤجل (مش رفض)", group(DEFERRAL, s.cList))}${block("سكوت (مش رفض)", group(SILENCE, s.cList))}</div>`;

  const sk = {};
  list.filter((x) => x.r.stage === "skipped").forEach((x) => { const g = skipGroup(x.r.skip_reason); if (g) sk[g] = (sk[g] || 0) + 1; });
  const skk = Object.keys(sk).sort((a, b) => sk[b] - sk[a]);
  const skipHtml = skk.length ? `<div class="sx-card"><h3>ليش استبعدنا محلات قبل التواصل (${s.skipped})</h3>${skk.map((k) => bar(k, sk[k], sk[skk[0]])).join("")}</div>` : "";

  const w = { yes: 0, maybe: 0, no: 0 };
  s.cList.forEach((x) => { if (x.ins && w[x.ins.willing_to_pay] != null) w[x.ins.willing_to_pay]++; });
  const wmax = Math.max(w.yes, w.maybe, w.no);
  const wtp = `<div class="sx-card"><h3>الاستعداد للدفع (${s.wtpAns} جاوبوا)</h3>${bar("نعم", w.yes, wmax)}${bar("يمكن", w.maybe, wmax)}${bar("لا", w.no, wmax)}${s.wtpAns < MIN_N ? `<p class="muted small" style="margin:6px 0 0">عينة صغيرة، مؤشر بس.</p>` : ""}</div>`;

  const wk = {};
  s.cList.filter((x) => x.r.first_sent_at).forEach((x) => { const k = weekOf(x.r.first_sent_at); wk[k] = wk[k] || { c: 0, rep: 0 }; wk[k].c++; if (x.r.first_reply_at || REPLIED_STAGES.includes(x.r.stage)) wk[k].rep++; });
  const wks = Object.keys(wk).sort();
  const wmaxc = Math.max(0, ...wks.map((k) => wk[k].c));
  const trend = wks.length ? `<div class="sx-card"><h3>كل أسبوع (حسب تاريخ أول رسالة)</h3>${wks.map((k) => bar("من " + fmt(k + "T12:00:00Z", false), wk[k].c, wmaxc, `الرد ${pv(wk[k].rep, wk[k].c)}`)).join("")}</div>` : "";

  return `<div class="sx-kpis">${cards}</div>
    <div class="sx-grid">${funnel}${reasons}${wtp}${skipHtml}${trend}</div>
    <div class="sx-grid">
      ${breakdown("حسب القطاع", list, (x) => x.l.sector || "unclassified", (k) => SECTOR[k] || k)}
      ${breakdown("حسب القناة", list, (x) => x.r.channel, (k) => CHANNEL[k] || k)}
      ${who === "all" ? breakdown("حسب الشخص", list, (x) => x.r.assignee, (k) => WHO_NAME(k)) : ""}
      ${breakdown("حسب المحافظة", list, (x) => x.l.governorate || "غير محدد", (k) => k)}
      ${breakdown("حسب المجموعة", list, (x) => String(x.r.batch), (k) => k === "0" ? "خارج المجموعات" : "مجموعة " + k)}
      ${breakdown("حسب رسالة الافتتاح", list, (x) => x.r.opener_variant || null, (k) => k === "G" ? "G (تحية فقط، المعتمدة)" : k)}
    </div>
    <p class="muted small">الوحدة هي الجهة مش الرسالة. ما منعرض نسبة إذا المقام أقل من 5 جهات أو البيانات معبّاة لأقل من 70%. التعريفات نفسها اللي بتقارير عمر.</p>`;
}

/* ===== businesses list ===== */
function leadHTML(x) {
  const { r, l, msg, task, ins, dm } = x;
  const href = channelLink(r, l);
  const lv = LEVEL[r.status_level];
  const where = [SECTOR[l.sector] || l.sector, l.category, l.governorate].filter(Boolean).join(" · ");
  const stCls = DM_STAGES.includes(r.stage) ? "hot" : ["no_reply", "not_interested", "skipped"].includes(r.stage) ? "cold" : "";

  const ch = CHANNEL[r.channel] || r.channel || "";
  const links = [];
  if (href) links.push(`<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(ch || "رابط")}</a>`);
  else if (ch) links.push(esc(ch));
  const ig = safeUrl(l.instagram), fb = safeUrl(l.facebook);
  if (ig && ig !== href) links.push(`<a href="${esc(ig)}" target="_blank" rel="noopener noreferrer">Instagram</a>`);
  if (fb && fb !== href) links.push(`<a href="${esc(fb)}" target="_blank" rel="noopener noreferrer">Facebook</a>`);
  const phone = l.phone_whatsapp ? `<span class="ltr mut">${esc(localPhone(l.phone_whatsapp))}</span>` : "";

  let msgCell = `<span class="mut">ما في رسائل</span>`;
  if (msg) {
    const who = msg.direction === "out" ? `منا (${esc(sender(msg.sender))})` : `منهم (${esc(msg.sender ? sender(msg.sender) : "المحل")})`;
    msgCell = `<div class="mut">${who} · <span class="ltr">${fmt(msg.sent_at)}</span></div><div>${esc(cut(msg.body, 140))}</div>`;
  }
  let summary = "";
  const sumText = r.stage === "skipped" ? `سبب الاستبعاد: ${r.skip_reason || ""}` : r.summary;
  if (sumText && String(sumText).trim()) {
    const short = cut(sumText, 150);
    summary = short.length < String(sumText).trim().length
      ? `<details><summary>${esc(short)}</summary><div class="full">${esc(sumText)}</div></details>` : esc(short);
  }
  if (ins && (ins.pain || ins.willing_to_pay)) {
    const pay = PAY[ins.willing_to_pay];
    summary += `<div class="sx-ins">${ins.pain ? "المشكلة: " + esc(cut(ins.pain, 110)) : ""}${pay ? (ins.pain ? " · " : "") + pay : ""}</div>`;
  }
  let taskCell = "";
  if (task) {
    taskCell = `<div><b>${esc(task.title)}</b></div>` +
      (task.goal ? `<div><span class="mut">الهدف:</span> ${esc(task.goal)}</div>` : "") +
      `<div class="mut">${esc(WHO_NAME(task.assignee))}${task.due_date ? ` · لغاية <span class="ltr">${fmt(task.due_date + "T12:00:00Z", false)}</span>` : ""}</div>` +
      (task.on_hold_reason ? `<div class="sx-hold">مستنية موافقة الإدارة: ${esc(task.on_hold_reason)}</div>` : "");
  }
  return `<li class="sx-lead">
    <div class="hd"><div><div class="nm">${esc(l.business_name || "بدون اسم")}</div>${where ? `<div class="where">${esc(where)}</div>` : ""}</div><span class="id">#${esc(r.lead_id)}</span></div>
    <div class="tags"><span class="sx-st ${stCls}">${esc(STAGE[r.stage] || r.stage)}</span>${lv ? `<span class="sx-lv ${lv.cls}">${lv.label}</span>` : ""}${dm ? `<span class="sx-dm">وصلنا لصاحب القرار</span>` : ""}</div>
    <dl class="sx-kv">
      <dt>التواصل</dt><dd><div class="sx-links">${links.join("")}${phone}</div><div class="mut">${esc(WHO_NAME(r.assignee))}${r.sending_account ? " · " + esc(ACCOUNT[r.sending_account] || r.sending_account) : ""}${r.first_sent_at ? ` · أول رسالة <span class="ltr">${fmt(r.first_sent_at, false)}</span>` : ""}</div></dd>
      <dt>آخر رسالة</dt><dd>${msgCell}</dd>
      ${summary ? `<dt>الملخص</dt><dd>${summary}</dd>` : ""}
      ${taskCell ? `<dt>المهمة المفتوحة</dt><dd>${taskCell}</dd>` : ""}
    </dl>
  </li>`;
}

/* ===== per product (hub_companies) ===== */
function prodRows(companies, prod) {
  const out = [];
  companies.forEach((c) => { const p = P.productOf(c, prod); if (p) out.push([c, p]); });
  return out;
}
function prodCounts(companies, prod) {
  const t = P.today(), xs = prodRows(companies, prod).filter(([, p]) => p.status !== "skipped");
  const by = {}; xs.forEach(([, p]) => { by[p.status] = (by[p.status] || 0) + 1; });
  const open = xs.filter(([, p]) => P.openFollowUp(p));
  return { n: xs.length, by, today: open.filter(([, p]) => p.next_follow_up === t).length, late: open.filter(([, p]) => p.next_follow_up < t).length,
    week: open.filter(([, p]) => p.next_follow_up > t && p.next_follow_up <= P.addDays(t, 7)).length,
    won: xs.filter(([, p]) => p.status === "client" && p.client_confirmed).length, wonWait: xs.filter(([, p]) => p.status === "client" && !p.client_confirmed).length,
    rows: xs };
}
function statusFunnel(k, title) {
  const max = Math.max(0, ...P.STATUS_ORDER.map((s) => k.by[s] || 0));
  return `<div class="sx-card" id="sxStatus"><h3>${title}</h3>${P.STATUS_ORDER.map((s) => bar(P.STATUS[s].t, k.by[s] || 0, max, k.n ? pv(k.by[s] || 0, k.n) : "")).join("")}
    ${k.wonWait ? `<p class="muted small" style="margin:6px 0 0">منها ${k.wonWait} «عميل» بانتظار تأكيد الإدارة.</p>` : ""}</div>`;
}
function productHTML(companies, prod, label, ctx) {
  const k = prodCounts(companies, prod);
  const fu = ctx.hasModule("followups");
  const sec = {}; k.rows.forEach(([c]) => { const x = c.sector || "other"; sec[x] = (sec[x] || 0) + 1; });
  const sk = Object.keys(sec).sort((a, b) => sec[b] - sec[a]);
  return `<div class="sx-kpis">
      ${kpi("الشركات", String(k.n), label, "كل شركة مربوطة بهالمنتج (بدون المستبعدة)")}
      ${kpi("للتواصل اليوم", String(k.today), fu ? `<a href="#/followups/${esc(prod)}">افتحي المتابعات</a>` : "حسب موعد المتابعة", "شركات موعد متابعتها اليوم، وحالتها مش مسكّرة", k.today ? "warn" : "")}
      ${kpi("متأخرة", String(k.late), "موعدها فات", "موعد المتابعة قبل اليوم وحالتها مش مسكّرة", k.late ? "warn" : "")}
      ${kpi("عملاء", String(k.won), k.wonWait ? `+ ${k.wonWait} بانتظار تأكيد الإدارة` : "أكّدتهم الإدارة", "حالة «عميل» وأكّدتها الإدارة", "q")}
    </div>
    <div class="sx-grid">${statusFunnel(k, "حسب الحالة")}
      <div class="sx-card"><h3>المتابعات</h3>${bar("متأخرة", k.late, Math.max(k.late, k.today, k.week))}${bar("اليوم", k.today, Math.max(k.late, k.today, k.week))}${bar("الأيام السبعة الجاية", k.week, Math.max(k.late, k.today, k.week))}</div>
      ${sk.length ? `<div class="sx-card"><h3>حسب القطاع</h3>${sk.map((x) => bar(esc(P.sectorText(x)), sec[x], sec[sk[0]])).join("")}</div>` : ""}
    </div>
    <p class="muted small">عمر لسا ما عنده أرقام تواصل (نسبة الرد وغيرها) لهالمنتج، فبنعرض الحالات والمتابعات بس. الأرقام بتبين لما يبدأ يسجّل التواصل.</p>`;
}
function compareHTML(companies, products) {
  const ks = products.map((p) => [p, prodCounts(companies, p.id)]);
  const row = (label, f, cls = "") => `<tr class="${cls}"><td>${label}</td>${ks.map(([, k]) => `<td><b>${f(k)}</b></td>`).join("")}</tr>`;
  return `<div class="sx-card"><h3>المنتجات جنب بعض</h3><div class="sx-scroll"><table class="sx-bd sx-cmp" style="min-width:0"><thead><tr><th></th>${ks.map(([p]) => `<th>${esc(p.short)}</th>`).join("")}</tr></thead><tbody>
    ${row("الشركات", (k) => k.n, "sum")}
    ${P.STATUS_ORDER.map((s) => row(P.STATUS[s].t, (k) => k.by[s] || 0)).join("")}
    ${row("للتواصل اليوم", (k) => k.today, "sum")}${row("متأخرة", (k) => k.late)}
    ${row("عملاء (أكّدتهم الإدارة)", (k) => k.won)}${row("عملاء بانتظار التأكيد", (k) => k.wonWait)}
    </tbody></table></div><p class="muted small" style="margin:6px 0 0">شركة وحدة ممكن تكون مهتمة بأكثر من منتج، فبتنحسب بكل واحد.</p></div>`;
}

/* ===== mount ===== */
const state = { view: "an", who: "", seg: "done", stage: "", q: "", shown: PAGE, prod: "ai_employee" };

export async function mount(ctx) {
  useStyle("sales", CSS);
  const el = ctx.el;
  state.view = ctx.path.startsWith("db") ? "db" : "an";
  const pm = String(ctx.path || "").match(/^p\/([a-z0-9_]+)/);
  state.prod = pm ? pm[1] : "ai_employee";
  el.innerHTML = `<p class="muted">جارِ التحميل…</p>`;
  const papi = P.api(ctx);
  let products = [];
  try { products = await papi.products(); } catch { products = []; }   // the switcher is extra: KPIs still show without it
  if (state.prod !== "ai_employee" && state.prod !== "compare" && !products.some((p) => p.id === state.prod)) state.prod = "ai_employee";
  let data = await loadRows(ctx);
  if (!ctx.isCurrent()) return;
  let items = toItems(data.rows);

  const persons = () => [...new Set(items.map((x) => x.r.assignee).filter(Boolean))].sort();
  const mine = () => state.who ? items.filter((x) => x.r.assignee === state.who) : items;
  const updated = () => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(data.at)).replace(",", "");

  el.innerHTML = `
    <div class="page-head"><h1>التحليلات</h1>
      <div class="sx-upd"><span>آخر تحديث <span class="ltr" id="sxAt"></span> (توقيت فلسطين) · للقراءة فقط</span><button class="btn-line" type="button" id="sxReload">تحديث</button></div></div>
    ${products.length > 1 ? `<div class="pl-seg sx-prod" role="group" aria-label="المنتج" id="sxProd">${products.map((p) => `<button type="button" data-prod="${esc(p.id)}">${esc(p.short)}</button>`).join("")}<button type="button" data-prod="compare">مقارنة</button></div>` : ""}
    <div class="sx-views" id="sxAiBar">
      <div class="sx-seg" role="group" aria-label="العرض">
        <button type="button" data-view="an">التحليلات</button><button type="button" data-view="db">المحلات</button>
      </div>
      <label class="sr" for="sxWho">الشخص</label><select class="i" id="sxWho"></select>
    </div>
    <section id="sxBody"></section>
    <div class="sx-foot">${ctx.hasModule("companies") ? `للتعديل افتحي الشركة من <a href="#/companies">الشركات</a>. كل تعديل بيوصل لعمر.` : "للتعديل ابعتي لعمر على تليجرام: رقم المحل + شو بدك تغيّري."}</div>`;

  const fillWho = () => {
    const ps = persons();
    $("#sxWho", el).innerHTML = `<option value="">الكل${ps.length ? ` (${ps.map((w) => esc(WHO_NAME(w))).join(" و")})` : ""}</option>` + ps.map((w) => `<option value="${esc(w)}">${esc(WHO_NAME(w))}</option>`).join("");
    if (!ps.includes(state.who)) state.who = "";
    $("#sxWho", el).value = state.who;
    $("#sxAt", el).textContent = updated();
  };

  const renderList = () => {
    const list = mine();
    const text = state.q.trim().toLowerCase();
    const hits = list.filter((x) => (state.seg === "all" || x.seg === state.seg) && (!state.stage || x.r.stage === state.stage) && (!text || x.q.includes(text)));
    const box = $("#sxList", el);
    if (!box) return;
    box.innerHTML = hits.length
      ? `<ul class="sx-list">${hits.slice(0, state.shown).map(leadHTML).join("")}</ul>` +
        (hits.length > state.shown ? `<button class="btn-line sx-more" type="button" id="sxMore">عرض المزيد (${hits.length - state.shown})</button>` : "")
      : `<div class="empty">ما في محلات بهالفلتر.</div>`;
    $("#sxHits", el).textContent = `${hits.length} محل`;
  };

  const renderDB = () => {
    const list = mine();
    const n = (f) => list.filter(f).length;
    const tiles = [["مسجلة", list.length], ["تواصلنا معها", n((x) => x.seg === "done")], ["ردوا", n((x) => x.replied)], ["وصلنا لصاحب القرار", n((x) => x.dm)],
      ["إيجابي", n((x) => x.r.status_level === "positive")], ["مهتمين", n((x) => x.r.stage === "interested")], ["لسا ما انبعتلها", n((x) => x.seg === "new")]];
    const segs = [["done", "تواصلنا معها"], ["new", "لسا ما انبعتلها"], ["skip", "مستبعدة"], ["all", "الكل"]];
    const stages = STAGE_ORDER.filter((s) => list.some((x) => x.r.stage === s));
    if (state.stage && !stages.includes(state.stage)) state.stage = "";
    $("#sxBody", el).innerHTML = `
      <div class="sx-tiles">${tiles.map(([t, v]) => `<div class="sx-tile"><b>${v}</b><span>${t}</span></div>`).join("")}</div>
      <div class="filters" role="group" aria-label="القائمة" id="sxSegs">${segs.map(([k, t]) => `<button class="fbtn" type="button" data-seg="${k}" aria-pressed="${state.seg === k}">${t} (${k === "all" ? list.length : n((x) => x.seg === k)})</button>`).join("")}</div>
      <div class="sx-find">
        <label class="sr" for="sxQ">بحث</label><input class="i" id="sxQ" type="search" placeholder="ابحث بالاسم أو الرقم أو المدينة" value="${esc(state.q)}">
        <label class="sr" for="sxStage">المرحلة</label><select class="i" id="sxStage"><option value="">كل المراحل</option>${stages.map((s) => `<option value="${s}" ${state.stage === s ? "selected" : ""}>${STAGE[s]} (${n((x) => x.r.stage === s)})</option>`).join("")}</select>
      </div>
      <p class="muted small" id="sxHits" style="margin:0 0 8px"></p>
      <div id="sxList"></div>`;
    renderList();
  };

  let seq = 0;
  const render = async () => {
    const my = ++seq;
    el.querySelectorAll("#sxProd button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.prod === state.prod)));
    $("#sxAiBar", el).classList.toggle("hidden", state.prod !== "ai_employee");
    if (state.prod !== "ai_employee") {
      $("#sxBody", el).innerHTML = `<p class="muted">جارِ التحميل…</p>`;
      try {
        const cs = await papi.companies();
        if (my !== seq || !ctx.isCurrent()) return;
        const p = products.find((x) => x.id === state.prod);
        $("#sxBody", el).innerHTML = state.prod === "compare" ? compareHTML(cs, products) : productHTML(cs, state.prod, p ? p.label : "", ctx);
      } catch (err) { if (my === seq) $("#sxBody", el).innerHTML = `<p class="err">ما قدرنا نحمّل الشركات: ${esc(errText(err))}</p>`; }
      return;
    }
    el.querySelectorAll(".sx-seg button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === state.view)));
    if (state.view === "db") { renderDB(); return; }
    $("#sxBody", el).innerHTML = analyticsHTML(mine(), state.who || "all");
    if (state.who || !products.length) return;   // sales statuses are per company, not per person
    try {
      const cs = await papi.companies();
      if (my !== seq || !ctx.isCurrent()) return;
      const grid = $("#sxBody .sx-grid", el);
      if (grid) grid.insertAdjacentHTML("afterbegin", statusFunnel(prodCounts(cs, "ai_employee"), "حسب حالات الشركات (من «الشركات»)"));
    } catch { /* KPIs still show */ }
  };

  fillWho();
  render();

  el.addEventListener("click", async (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.prod && b.closest("#sxProd")) {
      if (b.dataset.prod === state.prod) return;
      state.prod = b.dataset.prod;
      history.replaceState(null, "", ctx.base + (state.prod === "ai_employee" ? (state.view === "db" ? "/db" : "") : "/p/" + state.prod));
      render();
    } else if (b.dataset.view && b.dataset.view !== state.view) {
      state.view = b.dataset.view;
      // replaceState: keeps the view in the address (reload opens it) without a hashchange re-mount.
      history.replaceState(null, "", ctx.base + (state.view === "db" ? "/db" : ""));
      render();
    } else if (b.dataset.seg) {
      state.seg = b.dataset.seg; state.stage = ""; state.shown = PAGE; renderDB();
    } else if (b.id === "sxMore") {
      state.shown += PAGE; renderList();
    } else if (b.id === "sxReload") {
      b.disabled = true;
      try { data = await loadRows(ctx, true); P.forget(); items = toItems(data.rows); fillWho(); render(); toast("تم التحديث"); }
      catch (err) { toast("تعذّر التحديث: " + errText(err)); }
      b.disabled = false;
    }
  });
  el.addEventListener("change", (e) => {
    if (e.target.id === "sxWho") { state.who = e.target.value; state.shown = PAGE; render(); }
    if (e.target.id === "sxStage") {
      state.stage = e.target.value; state.shown = PAGE;
      if (state.stage) state.seg = "all";
      renderDB();
    }
  });
  let t = null;
  el.addEventListener("input", (e) => {
    if (e.target.id !== "sxQ") return;
    state.q = e.target.value;
    clearTimeout(t); t = setTimeout(() => { state.shown = PAGE; renderList(); }, 150);
  });
}
