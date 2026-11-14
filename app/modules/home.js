// Module "home": what to do today, on one page. Today's tasks (done button), companies to contact today and overdue
// per product (tap -> follow-ups), today's posts (tap -> calendar), latest updates, a summary per product.
// Data: rpc('hub_overview') only. It returns only the parts of the caller's roles (sales and/or content), so a
// content-only person gets the posts part and nothing about companies. Writes: rpc('hub_task_done') on her own tasks.
// ?demo: demo/hub-sales.js.
import { $, esc, toast, useStyle } from "../lib.js";
import * as P from "../shared/pipeline.js";

const TYPE = { post: "بوست", carousel: "كاروسيل", reel: "ريل", story: "ستوري", video: "فيديو", ad: "إعلان", other: "غير ذلك" };
const CSTATUS = { idea: "فكرة", in_progress: "قيد التجهيز", ready: "جاهز", scheduled: "مجدول", published: "منشور" };
const PLATFORM = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", linkedin: "LinkedIn", whatsapp: "واتساب", other: "غير ذلك" };
const EVENT = {
  lead_created: "شركة جديدة", lead_updated: "تعديل بيانات الشركة", status: "تغيير الحالة", note: "ملاحظة جديدة",
  contacted: "تواصل معهم", postponed: "تأجيل المتابعة", follow_up_set: "موعد متابعة", products: "تعديل المنتجات",
  task_done: "مهمة خلصت", client_claimed: "عميل جديد (بانتظار تأكيد الإدارة)",
};

const CSS = P.CSS + `
.hm-head{margin-bottom:14px}
.hm-head h1{margin-bottom:2px}
.hm-due{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-bottom:14px}
.hm-due a{display:flex;flex-direction:column;gap:2px;background:var(--ink);color:var(--on-ink);border-radius:var(--radius);padding:12px 14px;text-decoration:none;min-width:0}
.hm-due a:hover{background:var(--ink-2)}
.hm-due .pn{font:600 14px/1.3 var(--f-head);color:#fff}
.hm-due .nums{display:flex;gap:14px;margin-top:6px}
.hm-due .nums b{display:block;font:700 26px/1.1 var(--f-head);color:#fff}
.hm-due .nums span{font-size:12px;color:var(--on-ink-2)}
.hm-due .nums .late b{color:#FFB4AE}
.hm-grid{display:grid;gap:12px}
.hm-grid .panel > h2{display:flex;align-items:baseline;gap:8px}
.hm-grid .panel > h2 .n{font:400 13px var(--f-body);color:var(--muted)}
.hm-list{list-style:none;margin:0;padding:0}
.hm-list > li{padding:10px 0;border-top:1px solid var(--soft)}
.hm-list > li:first-child{border-top:0;padding-top:2px}
.hm-task .top{display:flex;align-items:flex-start;gap:10px}
.hm-task .tt{flex:1;min-width:0}
.hm-task .tt b{display:block;font-weight:600}
.hm-task .tt a{font-size:14px}
.hm-task .meta{font-size:12.5px;color:var(--muted)}
.hm-task .hi{font-size:11.5px;font-weight:600;color:#A8322C;margin-inline-start:6px}
.hm-task .btn{padding:7px 12px;font-size:14px;flex:none}
.hm-task details{margin-top:6px;font-size:14px}
.hm-task summary{cursor:pointer;color:var(--teal-ink);font-size:13px}
.hm-task .msg{background:var(--soft);border-radius:8px;padding:8px 10px;margin-top:6px;white-space:pre-wrap;overflow-wrap:anywhere}
.hm-task .msg button{display:block;margin-top:6px;font-size:12px;padding:3px 9px}
.hm-post a{display:grid;grid-template-columns:52px 1fr;gap:10px;align-items:center;text-decoration:none;color:inherit}
.hm-post .hr{font:600 15px/1 var(--f-head);direction:ltr;text-align:center;background:var(--soft);border-radius:8px;padding:9px 0}
.hm-post .tl2{font-weight:600;line-height:1.4}
.hm-post .meta{font-size:12.5px;color:var(--muted)}
.hm-pend{display:block;background:#FBF1DC;color:#5E4204;border-radius:8px;padding:9px 12px;margin-bottom:8px;text-decoration:none;font-size:14px;font-weight:600}
.hm-upd a,.hm-upd > div{display:block;text-decoration:none;color:inherit}
.hm-upd .w{font-weight:600}
.hm-upd .meta{font-size:12.5px;color:var(--muted)}
.hm-upd .sum{font-size:13.5px;color:var(--ink-3);margin-top:2px;overflow-wrap:anywhere}
.hm-prod{display:grid;gap:10px}
.hm-prod .pc h3{font-size:15px;margin:0 0 6px;display:flex;justify-content:space-between;gap:8px}
.hm-prod .pc h3 span{font:400 13px var(--f-body);color:var(--muted)}
.hm-prod .row{display:flex;flex-wrap:wrap;gap:6px}
.hm-prod .row .pl-st b{font-weight:700;margin-inline-start:4px}
.hm-prod .pc + .pc{border-top:1px solid var(--soft);padding-top:10px}
@media (min-width:900px){ .hm-grid{grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);align-items:start} .hm-col{display:grid;gap:12px;align-content:start} }
@media (max-width:899px){ .hm-col{display:contents} }`;

function greet(name) {
  const h = Number(P.hourOf(new Date().toISOString()).slice(0, 2));
  const first = String(name || "").replace(/\(.*\)/, "").trim().split(/\s+/)[0] || "";
  return (h < 12 ? "صباح الخير" : "مساء الخير") + (first ? "، " + first : "");
}
function ago(iso) {
  const m = Math.round((Date.now() - new Date(iso)) / 6e4);
  if (!isFinite(m)) return "";
  if (m < 2) return "هلأ";
  if (m < 60) return `قبل ${m} دقيقة`;
  if (m < 1440) return `قبل ${Math.round(m / 60)} ساعة`;
  const d = Math.round(m / 1440);
  return d === 1 ? "مبارح" : d < 30 ? `قبل ${d} يوم` : P.when(iso);
}

function taskHTML(k, ctx, t) {
  const late = k.due_date < t;
  const co = k.lead_id && ctx.hasModule("companies") ? `<a href="#/companies/${Number(k.lead_id)}">${esc(k.business_name || "الشركة")}</a>` : esc(k.business_name || "");
  return `<li class="hm-task" data-task="${Number(k.id)}"><div class="top"><div class="tt">
      <b>${esc(k.title)}${k.priority === "high" ? `<span class="hi">مستعجلة</span>` : ""}</b>${co}
      <div class="meta">${k.goal ? "الهدف: " + esc(k.goal) + " · " : ""}<span class="pl-due ${late ? "late" : "now"}">${late ? esc(P.dueText(k.due_date, t)) : "اليوم"}</span></div>
      ${k.on_hold_reason ? `<div class="meta" style="color:#A8322C">لا تبعتي هلأ: بانتظار الإدارة (${esc(k.on_hold_reason)})</div>` : ""}
    </div><button class="btn" type="button" data-done="${Number(k.id)}">خلصت</button></div>
    ${k.suggested_message ? `<details><summary>الرسالة المقترحة</summary><div class="msg"><span>${esc(k.suggested_message)}</span><button class="btn-line" type="button" data-copy>نسخ</button></div></details>` : ""}
  </li>`;
}

function postHTML(c, ctx) {
  const inner = `<span class="hr">${esc(P.hourOf(c.scheduled_at))}</span><span><span class="tl2">${esc(c.title)}</span>
    <span class="meta" style="display:block">${esc(TYPE[c.content_type] || c.content_type)} · ${esc((c.platforms || []).map((p) => PLATFORM[p] || p).join("، "))} · ${esc(CSTATUS[c.status] || c.status)}</span></span>`;
  return `<li class="hm-post">${ctx.hasModule("content") ? `<a href="#/content/p/${encodeURIComponent(c.id)}">${inner}</a>` : `<div style="display:grid;grid-template-columns:52px 1fr;gap:10px">${inner}</div>`}</li>`;
}

function updHTML(u, ctx) {
  const who = u.actor ? P.who(u.actor) : (u.type === "omar" ? "عمر" : "");
  let what, sum = "";
  if (u.type === "omar") { what = "عمر: " + (P.OMAR_STAGE[u.stage] || u.stage); sum = u.summary || ""; }
  else {
    what = EVENT[u.kind] || "تحديث";
    if (u.kind === "status" && u.to) what += ": " + ((P.STATUS[u.to] || {}).t || u.to);
    if (who) what += " · " + who;
  }
  const body = `<span class="w">${esc(u.business_name || "")}</span><span class="meta" style="display:block">${esc(what)} · ${esc(ago(u.at))}</span>${sum ? `<div class="sum">${esc(sum.length > 140 ? sum.slice(0, 139) + "…" : sum)}</div>` : ""}`;
  return `<li class="hm-upd">${u.lead_id && ctx.hasModule("companies") ? `<a href="#/companies/${Number(u.lead_id)}">${body}</a>` : `<div>${body}</div>`}</li>`;
}

function render(ctx, d) {
  const t = d.today || P.today();
  const sales = Array.isArray(d.products);
  const content = Array.isArray(d.posts_today);
  const prods = sales ? d.products : [];
  const tasks = sales ? (d.tasks_today || []) : [];
  const fu = ctx.hasModule("followups");
  const due = sales ? `<div class="hm-due">${prods.map((p) => {
    const inner = `<span class="pn">${esc(p.label)}</span><span class="nums"><span><b>${Number(p.due_today) || 0}</b><span>للتواصل اليوم</span></span><span class="late"><b>${Number(p.overdue) || 0}</b><span>متأخرة</span></span></span>`;
    return fu ? `<a href="#/followups/${esc(p.product)}" data-prod="${esc(p.product)}">${inner}</a>` : `<a>${inner}</a>`;
  }).join("")}</div>` : "";

  const tasksPanel = sales ? `<section class="panel"><h2>مهامك اليوم <span class="n">${tasks.length}</span></h2>
    ${tasks.length ? `<ul class="hm-list" id="hmTasks">${tasks.map((k) => taskHTML(k, ctx, t)).join("")}</ul>` : `<div class="empty">ما في مهام إلك اليوم.</div>`}</section>` : "";

  const posts = content ? d.posts_today : [];
  const pend = content ? Number(d.reviews_pending) || 0 : 0;
  const postsPanel = content ? `<section class="panel"><h2>منشورات اليوم <span class="n">${posts.length}</span></h2>
    ${pend ? `<a class="hm-pend" href="#/content">${pend === 1 ? "منشور واحد بانتظار موافقتك" : `${pend} منشورات بانتظار موافقتك`} ←</a>` : ""}
    ${posts.length ? `<ul class="hm-list">${posts.map((c) => postHTML(c, ctx)).join("")}</ul>` : `<div class="empty">ما في منشورات مجدولة اليوم.</div>`}</section>` : "";

  const latest = sales ? (d.latest || []).slice(0, 12) : [];
  const latestPanel = sales ? `<section class="panel"><h2>آخر التحديثات</h2>
    ${latest.length ? `<ul class="hm-list">${latest.map((u) => updHTML(u, ctx)).join("")}</ul>` : `<div class="empty">ما في تحديثات بعد.</div>`}</section>` : "";

  const sumPanel = sales ? `<section class="panel"><h2>ملخص المنتجات</h2><div class="hm-prod">${prods.map((p) => {
    const by = p.by_status || {};
    const chips = P.STATUS_ORDER.filter((s) => by[s]).map((s) => `<span class="pl-st ${P.STATUS[s].c}">${P.STATUS[s].t}<b>${Number(by[s])}</b></span>`).join("");
    return `<div class="pc"><h3>${esc(p.label)} <span>${Number(p.companies) || 0} شركة</span></h3><div class="row">${chips || `<span class="muted small">لسا ما في شركات.</span>`}</div>
      ${ctx.hasModule("sales") ? `<a class="small" href="#/sales/p/${esc(p.product)}">التحليلات ←</a>` : ""}</div>`;
  }).join("")}</div></section>` : "";

  ctx.el.innerHTML = `<div class="hm-head page-head"><div><h1>${esc(greet(ctx.me.name))}</h1><span class="muted">${esc(P.longDay(t))}</span></div></div>
    ${due}
    <div class="hm-grid"><div class="hm-col">${tasksPanel}${postsPanel}</div><div class="hm-col">${latestPanel}${sumPanel}</div></div>`;
}

export async function mount(ctx) {
  useStyle("home", CSS);
  const el = ctx.el;
  const api = P.api(ctx);
  el.innerHTML = `<p class="muted">جارِ التحميل…</p>`;
  let d = await api.overview();
  if (!ctx.isCurrent()) return;
  render(ctx, d || {});

  el.addEventListener("click", async (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.done) {
      b.disabled = true;
      try {
        await api.taskDone(Number(b.dataset.done));
        toast("تمام، المهمة خلصت");
        d = await api.overview();
        if (ctx.isCurrent()) render(ctx, d || {});
      } catch (err) { b.disabled = false; toast("ما انحفظ: " + P.hubErr(err)); }
    } else if (b.hasAttribute("data-copy")) {
      const txt = b.parentElement.querySelector("span").textContent;
      try { await navigator.clipboard.writeText(txt); toast("انتسخت الرسالة"); } catch { toast("ما زبط النسخ، حدّدي النص يدوياً"); }
    }
  });
}
