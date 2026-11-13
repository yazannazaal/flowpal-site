// Local mock only: fake research_briefs rows for modules/research.js (?mock= / ?demo on localhost).
// Same columns the module selects. Every finding here is invented for testing the layout.
export function mockResearchBriefs() {
  const ago = (d) => new Date(Date.now() - d * 864e5).toISOString();
  return [
    {
      id: 3, slug: "demo-clinics-reply-times", title: "العيادات: متى تصل الرسائل ومن يرد عليها (تجريبي)", sector: "clinic", grade: "B",
      summary: "أغلب رسائل العيادات في العينة تصل بعد الدوام بين 8 و 11 مساءً.\nالسكرتيرة هي من ترد في معظم الحالات، وصاحب العيادة نادراً ما يرد بنفسه.\n\nماذا يعني لنا: الرسالة الأولى يجب أن تسأل عن المسؤول عن الحجوزات، لا عن صاحب العيادة.\n\nالثقة: متوسطة. عينة صغيرة (9 عيادات) من محافظتين فقط.",
      published_at: ago(1), updated_at: ago(1),
    },
    {
      id: 2, slug: "demo-stores-instagram-dm", title: "متاجر Instagram: الأسئلة التي تتكرر في الرسائل (تجريبي)", sector: "ecommerce", grade: "A",
      summary: "أكثر ثلاثة أسئلة في رسائل المتاجر التي ردت علينا: التوصيل لأي مدينة، المقاسات المتوفرة، ومدة وصول الطلب.\nسبعة من 12 صاحب متجر قالوا إن الرسائل تتراكم في المساء.\n\nماذا يعني لنا: هذه الأسئلة الثلاثة هي أول ما يجب أن يجيب عنه المساعد في العرض التجريبي.",
      published_at: ago(4), updated_at: ago(3),
    },
    {
      id: 1, slug: "demo-cafes-first-look", title: "المقاهي: نظرة أولى قبل التواصل (تجريبي)", sector: "cafes", grade: "D",
      summary: "استنتاج من صفحات 15 مقهى: الحجوزات والأوردرات الخارجية تأتي عبر WhatsApp أكثر من Instagram.\nلم نتحدث مع أي صاحب مقهى بعد، لذلك هذه فرضية تحتاج تأكيداً من المحادثات.",
      published_at: ago(9), updated_at: ago(9),
    },
  ];
}
