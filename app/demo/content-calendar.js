// Local mock only: fake answer of rpc('hub_content_calendar', {p_from, p_to}) for modules/content.js and the home page.
// Same JSON shape as the database function: rows of content_calendar between two days
// (Asia/Hebron) plus undated ideas, each with the approval state of the linked content_reviews row (by post_slug).
// Three posts link to the reviews of demo/content-reviews.js, so approving here shows on the calendar at once.
// Posts are invented. Loaded ONLY in demo mode; the service worker never caches demo/.
import { mockContentReviews } from "./content-reviews.js";

const TZ = "Asia/Hebron";
const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const hmFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const today = () => dayFmt.format(new Date());
const addDays = (day, n) => { const d = new Date(day + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
/** day + "HH:MM" in Palestine time -> ISO (UTC). */
function at(day, hm) {
  const guess = new Date(`${day}T${hm}:00Z`);
  const [h, m] = hmFmt.format(guess).split(":").map(Number);
  const [h0, m0] = hm.split(":").map(Number);
  const off = ((h * 60 + m) - (h0 * 60 + m0) + 1440) % 1440;
  return new Date(guess.getTime() - off * 6e4).toISOString();
}

const role = () => { try { return sessionStorage.getItem("hub.demoRole"); } catch { return null; } };
const svg = (bg, fg, a, b) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350"><rect width="1080" height="1350" fill="${bg}"/>` +
  `<text x="540" y="640" font-family="Tahoma, sans-serif" font-size="74" font-weight="700" fill="${fg}" text-anchor="middle" direction="rtl">${a}</text>` +
  `<text x="540" y="760" font-family="Tahoma, sans-serif" font-size="46" fill="${fg}" fill-opacity=".75" text-anchor="middle" direction="rtl">${b}</text>` +
  `<text x="540" y="1180" font-family="Tahoma, sans-serif" font-size="34" fill="${fg}" fill-opacity=".5" text-anchor="middle">Flowpal · تجريبي</text></svg>`);

let rows = null;
function seed() {
  const t = today();
  const d = (n) => addDays(t, n);
  const row = (id, title, type, platforms, when, status, extra = {}) => ({
    id, post_slug: null, title, content_type: type, platforms, scheduled_at: when, status, stage: null, pillar: null,
    summary: null, caption: null, media: [], published_url: null, ...extra,
  });
  rows = [
    row("D01", "قصة: يوم بمحل ملابس (تجريبي)", "story", ["instagram"], at(t, "13:00"), "published",
      { pillar: "قصص أصحاب المحلات", summary: "ستوري قصيرة من 3 شرائح عن الرسائل وقت الضغط.", published_url: "https://www.instagram.com/" }),
    row("D02", "ريل: الزبون سأل الساعة 11 بالليل (تجريبي)", "reel", ["instagram", "facebook"], at(t, "20:30"), "scheduled",
      { pillar: "المشكلة", summary: "ريل 20 ثانية: رسالة بتوصل بالليل وما حدا بيرد.", caption: "الساعة 11 بالليل، والزبون لسا بيسأل.\nمين بيرد عليه؟", media: [{ type: "image", url: svg("#0E1F26", "#FFFFFF", "11:00 بالليل", "مين بيرد؟") }] }),
    row("D03", "رسائل آخر الليل (تجريبي)", "carousel", ["instagram", "facebook"], at(d(1), "19:00"), "ready",
      { post_slug: "demo-late-night-messages", pillar: "المشكلة", summary: "كاروسيل من صورتين، بانتظار موافقتك." }),
    row("D04", "نفس السؤال عشرين مرة (تجريبي)", "post", ["instagram"], at(d(3), "18:00"), "in_progress",
      { post_slug: "demo-same-question", stage: "copy", pillar: "الأسئلة المتكررة", summary: "عم نعدّل النص حسب ملاحظتك." }),
    row("D05", "تعرّفوا على الفريق (تجريبي)", "post", ["instagram", "facebook", "linkedin"], at(d(-2), "17:00"), "published",
      { post_slug: "demo-team-intro", pillar: "مين إحنا", published_url: "https://www.instagram.com/" }),
    row("D06", "ستوري: سؤال للمتابعين (تجريبي)", "story", ["instagram"], at(d(2), "21:00"), "ready",
      { pillar: "تفاعل", summary: "استفتاء: كم رسالة بتوصلكم باليوم؟" }),
    row("D07", "فيديو: كيف بيشتغل الموظف الذكي (تجريبي)", "video", ["facebook", "instagram"], at(d(5), "20:00"), "in_progress",
      { stage: "visual", pillar: "المنتج", summary: "فيديو دقيقة بيشرح الرد والتحويل للإنسان." }),
    row("D08", "ريل: متجرك أونلاين بأسبوع (تجريبي)", "reel", ["instagram", "tiktok"], at(d(8), "20:30"), "idea",
      { pillar: "المتاجر", summary: "فكرة ريل عن متجر إلكتروني لمحل صغير." }),
    row("D09", "كاروسيل: 5 أسئلة بيسألها كل زبون (تجريبي)", "carousel", ["instagram"], at(d(-6), "19:00"), "published", { pillar: "الأسئلة المتكررة" }),
    row("D10", "فكرة: قبل وبعد الرد السريع (تجريبي)", "post", ["instagram"], null, "idea", { pillar: "النتيجة", summary: "مقارنة بسيطة بصورتين." }),
    row("D11", "فكرة: سؤال من عيادة (تجريبي)", "reel", ["instagram", "facebook"], null, "in_progress", { stage: "brief", pillar: "العيادات" }),
  ];
}

export async function mockContentCalendar(from, to) {
  if (!["admin", "sales", "content"].includes(role())) throw Object.assign(new Error("not allowed"), { code: "42501" });
  if (!from || !to || to < from) throw Object.assign(new Error("bad range"), { code: "22023" });
  if (!rows) seed();
  const reviews = await mockContentReviews();
  return rows
    .filter((c) => c.status !== "cancelled" && (c.scheduled_at
      ? (dayFmt.format(new Date(c.scheduled_at)) >= from && dayFmt.format(new Date(c.scheduled_at)) <= to)
      : ["idea", "in_progress"].includes(c.status)))
    .sort((a, b) => (a.scheduled_at ? 0 : 1) - (b.scheduled_at ? 0 : 1) || String(a.scheduled_at).localeCompare(String(b.scheduled_at)) || a.id.localeCompare(b.id))
    .map((c) => {
      const r = c.post_slug && reviews.find((x) => x.post_slug === c.post_slug);
      return JSON.parse(JSON.stringify({ ...c, review: r ? { id: r.id, status: r.status, note: r.review_note, decided_at: r.decided_at } : null }));
    });
}

// Studio mock (task 005): the lock rule needs the calendar row of a post. Test hook: move a post's time.
export function mockCalendarBySlug(slug) { if (!rows) seed(); return rows.filter((c) => c.post_slug === slug).map((c) => ({ ...c })); }
export function mockSetSchedule(slug, iso, status) {
  if (!rows) seed();
  for (const c of rows) if (c.post_slug === slug) { c.scheduled_at = iso; if (status) c.status = status; }
}
