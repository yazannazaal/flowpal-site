// Local mock only: fake hub_studio_targets / hub_studio_save / hub_studio_cancel for the «تعديل» page of
// modules/content.js (task 005). Same rules as the database functions: only manifest keys,
// the same value check (studio/fields.mjs = hub_studio_check), stale version refused, lock 2 h before the post time /
// published / withdrawn, a newer save supersedes a queued one and keeps the earlier changes, «احفظي ووافقي» approves
// only once the new file is ready, the caption applies at once. The render is faked: queued -> rendering -> done.
// Manifests follow the design team's studio manifests. Posts are invented.
// Loaded ONLY in demo mode; the service worker never caches demo/.
import { checkField, checkBudgets, vlen } from "../studio/fields.mjs";
import { mockReviewBySlug } from "./content-reviews.js";
import { mockCalendarBySlug } from "./content-calendar.js";

const role = () => { try { return sessionStorage.getItem("hub.demoRole"); } catch { return null; } };
// member ids as the database stores them (app_users.member_id); display names come from hub_me().people
const actor = () => ({ admin: "yazan", sales: "dania", content: "dania" }[role()] || role());
const err = (msg, code) => Object.assign(new Error(msg), { code });
const svg = (bg, fg, a, b, h = 1350) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 ${h}"><rect width="1080" height="${h}" fill="${bg}"/>` +
  `<text x="540" y="${h / 2 - 40}" font-family="Tahoma, sans-serif" font-size="74" font-weight="700" fill="${fg}" text-anchor="middle" direction="rtl">${a}</text>` +
  `<text x="540" y="${h / 2 + 80}" font-family="Tahoma, sans-serif" font-size="46" fill="${fg}" fill-opacity=".75" text-anchor="middle" direction="rtl">${b}</text></svg>`);

// manifest fields: the shape the studio sync writes from the design team's manifests: one field per existing bubble ("chat.1.text"), effective max
// = max(size max, length of the approved text), theme keeps the post's modifiers, budgets per size.
const TONE = { key: "tone", label: "لون العنوان الصغير", type: "enum", group: "الألوان", options: ["teal", "signal"],
  option_labels: { teal: "أخضر (الحل، إيجابي)", signal: "برتقالي (المشكلة، تنبيه)" } };
const THEME = { key: "theme", label: "خلفية التصميم", type: "enum", group: "الألوان", options: ["", "dark"], option_labels: { "": "فاتحة", dark: "غامقة (كحلي)" } };
const CAPTION = [{ key: "caption", label: "الكابشن", type: "caption", max: 2200, group: "النص المرافق" },
  { key: "hashtags", label: "الهاشتاغات", type: "hashtags", max: 300, max_count: 30, required: false, group: "النص المرافق" }];
const bubble = (n, max = 45) => ({ key: `chat.${n}.text`, label: `نص فقاعة الرسالة ${n}`, type: "longtext", max, group: "المحادثة" });
// editable keys only (what base_values holds) out of the full values
const pick = (vals, fields) => Object.fromEntries(fields.map((f) => [f.key, f.key.split(".").reduce((o, k) => (o == null ? o : o[k]), vals)]).filter(([, v]) => v !== undefined));

let T = null, E = [], nextId = 501;
function target(id, label, sort, version, template, size, fields, values, media_url, extra = {}) {
  const base = pick(values, fields);
  // base rule: an approved original always re-saves (effective max = max(max, its own visible length))
  fields = fields.map((f) => (["text", "longtext"].includes(f.type) && typeof base[f.key] === "string" ? { ...f, max: Math.max(f.max, vlen(base[f.key])) } : f));
  return { id, post_slug: id.split("/")[0], kind: "image", label, sort, version, media_url,
    manifest: { template, size, values, fields, budgets: extra.budgets || [] }, base_values: base };
}
function seed() {
  const s1 = { eyebrow: "بعد الدوام", tone: "signal", total: "2", headline: "الساعة 11 بالليل…<br>مين <em>بيرد على زبونك</em>؟", sub: "الرسائل ما بتستنى الدوام. الزبون بيسأل وقت ما بدو.", swipe: "اسحب ←" };
  const s2 = { eyebrow: "الحل", tone: "teal", theme: "", headline: "الرد بيوصل <em>بنفس اللحظة</em>", contact: "زبون جديد", contact_initial: "ز", channel: "متصل الآن",
    chat: [{ day: "اليوم" }, { from: "in", text: "مرحبا، بتوصلوا لنابلس؟", time: "11:02 م" }, { from: "out", text: "أهلين! أكيد، التوصيل لنابلس خلال يومين.", time: "11:02 م" },
      { from: "in", text: "تمام، بدي أطلب", time: "11:03 م" }, { badge: "المحادثة وصلتك لتكمّلها", tone: "teal" }] };
  const q1 = { theme: "dark", headline: "نفس السؤال…<br><em>عشرين مرة</em> باليوم", sub: "إذا الأسئلة نفسها بتتكرر كل يوم، في طريقة أسهل." };
  const t1 = { headline: "فريق صغير من <em>فلسطين</em>", sub: "بنبني أدوات بتوفر وقت أصحاب المحلات." };
  T = [
    target("demo-late-night-messages/s1", "الشريحة 1 (الغلاف)", 1, 3, "carousel-cover", "1080x1350", [
      { key: "eyebrow", label: "العنوان الصغير فوق", type: "text", max: 30, group: "العنوان" },
      { key: "headline", label: "العنوان الرئيسي", type: "longtext", max: 50, group: "العنوان" },
      { key: "sub", label: "السطر تحت العنوان", type: "longtext", max: 155, group: "العنوان" },
      { key: "swipe", label: "كلمة «اسحب»", type: "text", max: 20, group: "العنوان" }, TONE], s1,
      svg("#F5F7FA", "#0F1B33", "11:00 بالليل", "الشريحة 1")),
    target("demo-late-night-messages/s2", "الشريحة 2 (المحادثة)", 2, 3, "chat", "1080x1350", [
      { key: "eyebrow", label: "العنوان الصغير فوق", type: "text", max: 30, group: "العنوان" },
      { key: "headline", label: "العنوان", type: "longtext", max: 50, group: "العنوان" },
      bubble(1), bubble(2), bubble(3), { key: "chat.4.badge", label: "نص الشارة تحت المحادثة 1", type: "text", max: 40, group: "المحادثة" }, TONE, THEME], s2,
      svg("#DDF3F2", "#0F1B33", "بنفس اللحظة", "الشريحة 2"), { budgets: [{ size: "1080x1350", keys: ["headline", "chat[i].text"], max_total: 145 }] }),
    { id: "demo-late-night-messages/caption", post_slug: "demo-late-night-messages", kind: "caption", label: "الكابشن", sort: 900, version: 3,
      manifest: { fields: CAPTION },
      base_values: { caption: "الساعة 11 بالليل، والزبون لسا بيسأل عن التوصيل.\nمين بيرد عليه؟\n\nالمساعد بيرد بنفس اللحظة، وبيحوّل المحادثة لإلك إذا احتاجت إنسان.", hashtags: "#Flowpal #مشاريع_صغيرة" },
      media_url: null },
    target("demo-same-question/s1", "الصورة", 1, 1, "statement", "1080x1080", [
      { key: "headline", label: "الجملة الرئيسية", type: "longtext", max: 75, group: "النص" },
      { key: "sub", label: "السطر تحتها", type: "longtext", max: 150, group: "النص" }, THEME], q1,
      svg("#0F1B33", "#F5F7FA", "نفس السؤال", "عشرين مرة باليوم", 1080)),
    { id: "demo-same-question/caption", post_slug: "demo-same-question", kind: "caption", label: "الكابشن", sort: 900, version: 1,
      manifest: { fields: CAPTION },
      base_values: { caption: "«بتوصلوا لجنين؟» «في مقاس L؟»\nإذا نفس الأسئلة بتتكرر كل يوم، في طريقة أسهل.", hashtags: "#Flowpal" }, media_url: null },
    target("demo-team-intro/s1", "الصورة", 1, 1, "statement", "1080x1080", [
      { key: "headline", label: "الجملة الرئيسية", type: "longtext", max: 75, group: "النص" },
      { key: "sub", label: "السطر تحتها", type: "longtext", max: 150, group: "النص" }], t1,
      svg("#1B2B4A", "#E9EFEF", "فريق Flowpal", "من فلسطين", 1080)),
  ];
  // one finished edit from earlier, so the history is not empty
  E = [{ id: 500, target_id: "demo-late-night-messages/s1", post_slug: "demo-late-night-messages", base_version: 2, edit_no: 1,
    edit_values: { sub: "الرسائل ما بتستنى الدوام." }, note: null, approve_on_done: false, needs_render: true, status: "done",
    created_by: "dania", created_at: new Date(Date.now() - 26 * 36e5).toISOString(), finished_at: new Date(Date.now() - 26 * 36e5 + 3e5).toISOString(),
    output_media: [], error: null, t0: 0 }];
}

// test hooks: how long the fake render takes, and make the next one fail
const sim = { queue: 2500, render: 2500, failNext: false };
export function mockStudioSpeed(queueMs, renderMs) { sim.queue = queueMs; sim.render = renderMs; }
export function mockStudioFailNext() { sim.failNext = true; }

function lockReason(slug) {
  const cal = mockCalendarBySlug(slug), r = mockReviewBySlug(slug);
  if (cal.some((c) => c.status === "published")) return "منشور";
  if (cal.some((c) => c.status === "cancelled")) return "ملغي";
  if (r && r.status === "withdrawn") return "مسحوب";
  if (cal.some((c) => c.scheduled_at && new Date(c.scheduled_at).getTime() < Date.now() + 2 * 36e5)) return "قرب موعد النشر";
  return null;
}

function finish(e, ok) {
  const t = T.find((x) => x.id === e.target_id);
  e.status = ok ? "done" : "failed"; e.finished_at = new Date().toISOString();
  if (!ok) { e.error = "render failed"; return; }
  const [w, h] = (t.manifest.size || "1080x1350").split("x").map(Number);
  const v = { ...(t.manifest.values || {}), ...t.base_values, ...e.edit_values };
  const head = String(v.headline || v.title || "").replace(/<[^>]*>/g, "").slice(0, 22);
  e.output_media = [{ type: "image", url: svg(v.theme && v.theme.includes("dark") ? "#0F1B33" : "#F5F7FA", v.theme && v.theme.includes("dark") ? "#F5F7FA" : "#0F1B33", head || "بعد التعديل", `${t.label} · تعديل ${e.edit_no}`, Math.round(1080 * h / w)) }];
  const r = mockReviewBySlug(e.post_slug);
  const waiting = E.some((o) => o.post_slug === e.post_slug && ["queued", "rendering"].includes(o.status));
  if (r) {
    r.media = (r.media || []).map((m) => (m.url === t.media_url ? e.output_media[0] : m));
    if (!r.media.some((m) => m.url === e.output_media[0].url)) r.media.push(e.output_media[0]);
    if (e.approve_on_done && !waiting && r.status === "pending") Object.assign(r, { status: "approved", decided_by: role() + "@demo.invalid", decided_at: new Date().toISOString() });
  }
  t.media_url = e.output_media[0].url;
}

// the fake worker: moves edits along by time each time the page asks
function tick() {
  const now = Date.now();
  for (const e of E) {
    if (e.status === "queued" && now - e.t0 >= sim.queue) e.status = "rendering";
    if (e.status === "rendering" && now - e.t0 >= sim.queue + sim.render) { const fail = sim.failNext; sim.failNext = false; finish(e, !fail); }
  }
}

const pub = (e) => e && ({ id: e.id, edit_no: e.edit_no, status: e.status, values: { ...e.edit_values }, base_version: e.base_version, created_by: e.created_by,
  created_at: e.created_at, finished_at: e.finished_at, output_media: e.output_media, error: e.error, note: e.note, approve_on_done: e.approve_on_done });
const allowed = () => ["admin", "sales", "content"].includes(role());

export async function mockStudioTargets(slug) {
  if (!allowed()) throw err("not allowed", "42501");
  if (!T) seed();
  tick();
  return JSON.parse(JSON.stringify({
    post_slug: slug, locked: lockReason(slug),
    targets: T.filter((t) => t.post_slug === slug).sort((a, b) => a.sort - b.sort).map((t) => {
      const mine = E.filter((e) => e.target_id === t.id && e.status !== "cancelled").sort((a, b) => b.edit_no - a.edit_no);
      return { id: t.id, kind: t.kind, label: t.label, manifest: t.manifest, base_values: t.base_values, source_html: null, media_url: t.media_url,
        version: t.version, last_edit: pub(mine[0]) || null, history: E.filter((e) => e.target_id === t.id).sort((a, b) => b.edit_no - a.edit_no).map(pub) };
    }),
  }));
}

export async function mockStudioSave(targetId, values, baseVersion, note, approve) {
  if (!allowed()) throw err("not allowed", "42501");
  if (!T) seed();
  tick();
  const t = T.find((x) => x.id === targetId);
  if (!t) throw err("not found", "P0002");
  const lock = lockReason(t.post_slug);
  if (lock) throw err("locked: " + lock, "55000");
  if (baseVersion !== t.version) throw err("changed: سلمى غيّرت المنشور، افتحيه من جديد", "40001");
  if (!values || typeof values !== "object" || Array.isArray(values) || !Object.keys(values).length) throw err("no change", "22023");
  for (const [k, v] of Object.entries(values)) {
    const f = t.manifest.fields.find((x) => x.key === k);
    if (!f) throw err("field not editable: " + k, "22023");
    const m = checkField(f, v);
    if (m) throw err(`${f.label || k}: ${m}`, "22023");
  }
  if (String(note || "").length > 500) throw err("note too long", "22023");
  const prevAll = E.filter((e) => e.target_id === t.id && e.base_version === t.version && ["queued", "rendering", "done"].includes(e.status)).sort((a, b) => b.edit_no - a.edit_no)[0];
  const budget = checkBudgets(t.manifest, t.base_values, { ...t.base_values, ...(prevAll ? prevAll.edit_values : {}), ...values });
  if (budget) throw err(budget, "22023");
  const prev = E.filter((e) => e.target_id === t.id && e.base_version === t.version && ["queued", "rendering", "done"].includes(e.status)).sort((a, b) => b.edit_no - a.edit_no)[0];
  const merged = { ...(prev ? prev.edit_values : {}), ...values };
  const render = t.kind !== "caption";
  for (const e of E) if (e.target_id === t.id && e.status === "queued") e.status = "superseded";
  const no = Math.max(0, ...E.filter((e) => e.target_id === t.id).map((e) => e.edit_no)) + 1;
  const e = { id: nextId++, target_id: t.id, post_slug: t.post_slug, base_version: t.version, edit_no: no, edit_values: merged,
    note: String(note || "").trim() || null, approve_on_done: approve !== false, needs_render: render, status: render ? "queued" : "done",
    created_by: actor(), created_at: new Date().toISOString(), finished_at: render ? null : new Date().toISOString(), output_media: [], error: null, t0: Date.now() };
  E.push(e);
  const r = mockReviewBySlug(t.post_slug);
  if (r) {
    const okNow = !render && e.approve_on_done && !E.some((o) => o.post_slug === t.post_slug && o.id !== e.id && ["queued", "rendering"].includes(o.status));
    Object.assign(r, { edited_by: actor(), edited_at: e.created_at, last_edit_id: e.id,
      status: okNow ? "approved" : ["approved", "changes_requested"].includes(r.status) ? "pending" : r.status });
    if (okNow) Object.assign(r, { decided_by: role() + "@demo.invalid", decided_at: new Date().toISOString() });
    if (t.kind === "caption" && "caption" in merged) r.caption = merged.caption;
  }
  return { id: e.id, edit_no: no, status: e.status };
}

export async function mockStudioCancel(editId) {
  if (!allowed()) throw err("not allowed", "42501");
  if (!T) seed();
  tick();
  const e = E.find((x) => x.id === editId && x.status === "queued" && (x.created_by === actor() || role() === "admin"));
  if (!e) throw err("not found or already rendering", "P0002");
  e.status = "cancelled"; e.finished_at = new Date().toISOString();
}

// test hook: سلمى changed the post meanwhile (the sync raised the version)
export function mockStudioBumpVersion(targetId) { if (!T) seed(); const t = T.find((x) => x.id === targetId); if (t) t.version += 1; }

// test hook: a post with more text than the design team measured (the field max allows more than the design holds)
export function mockStudioLoosen(targetId, key, max) {
  if (!T) seed();
  const t = T.find((x) => x.id === targetId); if (!t) return;
  t.manifest.fields = t.manifest.fields.map((f) => (f.key === key ? { ...f, max } : f));
  t.manifest.budgets = [];
}
