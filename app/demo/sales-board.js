// Local mock only (?mock= / ?demo on localhost): fake answer of rpc('hub_sales_board') for modules/sales.js.
// Same JSON shape as the real function (ops/hub/001-roles.sql + 001a-pain-fix.sql). Every business is invented.
// Loaded ONLY in demo mode; the service worker never caches demo/.
const NAMES = [
  "متجر الندى", "بيت الأناقة", "ركن الهدايا", "عطور الشرق", "أزياء ليلى", "عالم الأطفال", "مكتبة القلم", "حلويات السنابل",
  "عيادة البسمة", "عيادة النور للأسنان", "مركز الشفاء", "مقهى الزيتونة", "مطعم السفرة", "كافيه المدينة", "متجر الفخامة",
  "إكسسوارات روز", "أحذية الخطوة", "بيت العسل", "ساعات الوقت", "متجر التقنية", "أدوات المطبخ", "زهور الربيع", "مخبز القرية",
  "مطعم الديوان", "عيادة الجلدية الحديثة", "متجر الرياضة", "بوتيك سما", "متجر الألعاب", "منتجات طبيعية", "مقهى الكتب",
];
const GOVS = ["نابلس", "رام الله", "الخليل", "جنين", "بيت لحم", "طولكرم", "قلقيلية"];
const SECTORS = [["ecommerce", "ملابس"], ["ecommerce", "عطور"], ["ecommerce", "هدايا"], ["clinic", "أسنان"], ["restaurants", "مطعم"], ["cafes", "كافيه"], ["ecommerce", "إلكترونيات"]];
const PAINS = ["الرسائل بتتراكم بالليل وما في حدا يرد", "بيسألوا نفس السؤال عن التوصيل كل يوم", "بيضيع عليهم طلبيات من الستوري", "ما بلحقوا يردوا وقت الضغط"];
const SUMMARIES = [
  "ردت الموظفة وقالت إنها رح تسأل صاحب المحل وترجع.",
  "صاحب المحل حكى إنه بيرد بنفسه وبيتأخر بالمسا، وطلب يشوف مثال.",
  "مهتمين، اتفقنا على مكالمة قصيرة الأسبوع الجاي.",
  "قالوا عندهم موظفة بتغطي الرسائل وما بحتاجوا إشي هلأ.",
  "ردوا على التحية وسكتوا بعد الشرح.",
  "",
];

function seeded(n) { let s = n * 9301 + 49297; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); }

export function mockSalesBoard() {
  const rnd = seeded(7);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const now = Date.now();
  const ago = (days, h = 0) => new Date(now - days * 864e5 - h * 36e5).toISOString();
  const out = [];
  for (let i = 0; i < 64; i++) {
    const id = 101 + i;
    const [sector, category] = SECTORS[i % SECTORS.length];
    const name = NAMES[i % NAMES.length] + (i >= NAMES.length ? " ٢" : "") + " (تجريبي)";
    const assignee = i % 3 === 0 ? "yazan" : "dania";
    const channel = i % 4 === 0 ? "whatsapp" : i % 4 === 3 ? "facebook" : "instagram";
    const batch = 1 + (i % 4);
    // Stage mix close to a real board: most sent, some replied, a few with the owner, some not sent / skipped.
    const r = rnd();
    const stage =
      i >= 56 ? "not_sent" : i >= 52 ? "skipped" :
      r < 0.18 ? "sent" : r < 0.36 ? "replied_staff" : r < 0.48 ? "decision_maker" : r < 0.53 ? "call" :
      r < 0.6 ? "interested" : r < 0.7 ? "not_interested" : "no_reply";
    const sent = stage !== "not_sent" && stage !== "skipped";
    const replied = ["replied_staff", "decision_maker", "call", "interested", "not_interested"].includes(stage);
    const firstSent = sent ? ago(3 + Math.floor(rnd() * 24), Math.floor(rnd() * 12)) : null;
    const respMin = replied ? Math.floor(5 + rnd() * 900) : null;
    const firstReply = replied ? new Date(new Date(firstSent).getTime() + respMin * 6e4).toISOString() : null;
    const lastIn = replied ? ago(Math.floor(rnd() * 3), Math.floor(rnd() * 20)) : null;
    const lastOut = sent ? ago(Math.floor(rnd() * 3), Math.floor(rnd() * 20)) : null;
    const level = stage === "interested" || stage === "call" ? "positive" : stage === "decision_maker" ? pick(["positive", "medium"]) :
      stage === "replied_staff" ? pick(["medium", "weak"]) : stage === "not_interested" ? "negative" : null;
    const loss = stage === "not_interested" ? pick(["has_staff", "no_problem", "cost", "prefers_human", null]) :
      stage === "no_reply" ? pick(["no_reply", "silent_after_greeting", null]) : null;
    const owner = ["decision_maker", "call", "interested"].includes(stage) || (stage === "not_interested" && i % 2 === 0);
    const outN = sent ? 1 + Math.floor(rnd() * 6) : 0;
    const inN = replied ? 1 + Math.floor(rnd() * 5) : 0;
    const hasIns = replied && rnd() < 0.55;
    const ins = hasIns ? { willing_to_pay: pick(["yes", "maybe", "no", null]), pain: rnd() < 0.8 ? pick(PAINS) : null } : null;
    const tasks = [];
    if (["replied_staff", "decision_maker", "call", "interested"].includes(stage) && rnd() < 0.6) {
      const d = new Date(now + Math.floor(rnd() * 5) * 864e5).toISOString().slice(0, 10);
      tasks.push({ type: "follow_up", title: stage === "call" ? "مكالمة تعريفية" : "متابعة الرد", goal: "نعرف مين بيرد على الرسائل وقت الضغط",
        on_hold_reason: i % 9 === 0 ? "صيغة العرض" : null, due_date: d, assignee });
    }
    out.push({
      lead_id: id, batch, assignee, channel, stage, opener_variant: sent ? (i % 5 === 0 ? "F" : "G") : null,
      loss_reason: loss, response_minutes: respMin, last_inbound_at: lastIn, last_outbound_at: lastOut,
      sending_account: sent ? (i % 2 ? "company" : "personal") : null, status_level: level,
      first_sent_at: firstSent, first_reply_at: firstReply, last_activity_at: lastIn || lastOut || ago(30),
      summary: sent ? SUMMARIES[i % SUMMARIES.length] || null : null,
      skip_reason: stage === "skipped" ? pick(["ما في واتساب شغال ولا رابط", "متابعين قليل", "مش مناسب لنا", "duplicate of 103"]) : null,
      lead: {
        business_name: name, sector, category, governorate: GOVS[i % GOVS.length],
        instagram: channel !== "whatsapp" ? `https://www.instagram.com/demo_store_${id}/` : null,
        facebook: channel === "facebook" ? `https://www.facebook.com/demo.store.${id}` : null,
        phone_whatsapp: i % 2 === 0 ? `97059000${String(1000 + i).slice(-4)}` : null,
        website: null,
        last_msg: sent ? [{
          direction: replied && lastIn > lastOut ? "in" : "out",
          sender: replied && lastIn > lastOut ? (owner ? "owner" : "staff") : assignee,
          body: replied && lastIn > lastOut ? "أهلين، مين معي؟ شو الخدمة بالزبط؟" : "مرحبا، معك فريق Flowpal. مين المسؤول عن الرد على رسائل الصفحة عندكم؟",
          sent_at: replied && lastIn > lastOut ? lastIn : lastOut,
        }] : [],
        owner_msg: owner ? [{ sent_at: lastIn || firstReply }] : [],
        open_task: tasks,
        insight: ins ? [ins] : [],
        pain_n: [{ count: ins && ins.pain ? 1 : 0 }],
        out_n: [{ count: outN }],
        in_n: [{ count: inN }],
      },
    });
  }
  return out;
}
