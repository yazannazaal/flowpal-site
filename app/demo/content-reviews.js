// Local mock only: fake content_reviews rows and a fake hub_content_decide() for modules/content.js.
// Same rules as the database function. Posts are invented; images are
// drawn locally as SVG data URLs so the mock needs no network.
const svg = (bg, fg, line1, line2) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350"><rect width="1080" height="1350" fill="${bg}"/>` +
  `<rect x="90" y="90" width="900" height="1170" rx="48" fill="none" stroke="${fg}" stroke-opacity=".25" stroke-width="6"/>` +
  `<text x="540" y="620" font-family="Tahoma, sans-serif" font-size="76" font-weight="700" fill="${fg}" text-anchor="middle" direction="rtl">${line1}</text>` +
  `<text x="540" y="740" font-family="Tahoma, sans-serif" font-size="48" fill="${fg}" fill-opacity=".75" text-anchor="middle" direction="rtl">${line2}</text>` +
  `<text x="540" y="1180" font-family="Tahoma, sans-serif" font-size="34" fill="${fg}" fill-opacity=".5" text-anchor="middle">Flowpal · تجريبي</text></svg>`);

let rows = null;
function seed() {
  const day = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
  const ago = (h) => new Date(Date.now() - h * 36e5).toISOString();
  rows = [
    { id: 11, post_slug: "demo-late-night-messages", title: "رسائل آخر الليل (تجريبي)", platforms: ["instagram", "facebook"], planned_for: day(1),
      caption: "الساعة 11 بالليل، والزبون لسا بيسأل عن التوصيل.\nمين بيرد عليه؟\n\nالمساعد بيرد بنفس اللحظة، وبيحوّل المحادثة لإلك إذا احتاجت إنسان.\n\n#Flowpal",
      on_image_text: "11:00 بالليل\nمين بيرد على زبونك؟",
      media: [{ type: "image", url: svg("#0E1F26", "#FFFFFF", "11:00 بالليل", "مين بيرد على زبونك؟") }, { type: "image", url: svg("#14B8A6", "#05221E", "بنفس اللحظة", "والمحادثة بتوصلك إذا لزم") }],
      status: "pending", review_note: null, decided_by: null, decided_at: null, created_at: ago(5), updated_at: ago(5) },
    { id: 10, post_slug: "demo-same-question", title: "نفس السؤال عشرين مرة (تجريبي)", platforms: ["instagram"], planned_for: day(3),
      caption: "«بتوصلوا لجنين؟» «في مقاس L؟»\nإذا نفس الأسئلة بتتكرر كل يوم، في طريقة أسهل.",
      on_image_text: "نفس السؤال… عشرين مرة باليوم",
      media: [{ type: "image", url: svg("#F7F5F0", "#0E1F26", "نفس السؤال", "عشرين مرة باليوم") }],
      status: "changes_requested", review_note: "الجملة الثانية طويلة، قصّروها شوي.", decided_by: "sales@demo.invalid", decided_at: ago(20), created_at: ago(30), updated_at: ago(20) },
    { id: 9, post_slug: "demo-team-intro", title: "تعرّفوا على الفريق (تجريبي)", platforms: ["instagram", "facebook", "linkedin"], planned_for: day(-2),
      caption: "فريق صغير من فلسطين، بنبني أدوات بتوفر وقت أصحاب المحلات.", on_image_text: null,
      media: [{ type: "image", url: svg("#1B323C", "#E9EFEF", "فريق Flowpal", "من فلسطين") }],
      status: "approved", review_note: null, decided_by: "sales@demo.invalid", decided_at: ago(70), created_at: ago(90), updated_at: ago(70) },
    { id: 8, post_slug: "demo-old-idea", title: "فكرة قديمة سحبتها سلمى (تجريبي)", platforms: ["instagram"], planned_for: null,
      caption: "نسخة قديمة.", on_image_text: null, media: [],
      status: "withdrawn", review_note: null, decided_by: null, decided_at: null, created_at: ago(200), updated_at: ago(150) },
  ];
}

export async function mockContentReviews() { if (!rows) seed(); return rows.map((r) => ({ ...r })); }

export async function mockContentDecide(id, decision, note, email) {
  if (!rows) seed();
  if (!["approved", "changes_requested"].includes(decision)) throw Object.assign(new Error("bad decision"), { code: "22023" });
  const n = String(note || "").trim() || null;
  if (decision === "changes_requested" && !n) throw Object.assign(new Error("note required"), { code: "22023" });
  const r = rows.find((x) => x.id === id && ["pending", "changes_requested"].includes(x.status));
  if (!r) throw Object.assign(new Error("not found or already decided"), { code: "P0002" });
  Object.assign(r, { status: decision, review_note: n, decided_by: email, decided_at: new Date().toISOString() });
}

// Studio mock (task 005): hub_studio_save / finish update the approval card of the post (by post_slug).
export function mockReviewBySlug(slug) { if (!rows) seed(); return rows.find((r) => r.post_slug === slug) || null; }
