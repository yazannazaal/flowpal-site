// Client questionnaire (flowpal-agency ops/forms/): flowpal.co/q/?f=<slug>&t=<token>
// Questions: ./forms/<slug>.json (built by ops/forms/build_form.py). Answers: rpc submit_client_form (anon key;
// the function checks the slug + token, nothing else is readable). A draft is kept in this browser until sent.
const SB_URL = "https://kltkjkraevxltmxfetng.supabase.co";
const SB_KEY = "sb_publishable_YOUiGYUqctqUkB63MIkVmw_raLYKQ6v";

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const p = new URLSearchParams(location.search);
const slug = (p.get("f") || "").toLowerCase();
const token = p.get("t") || "";
const main = $("#main");
const DKEY = "fp.q." + slug;

function fail(msg) { main.innerHTML = `<div class="msg">${esc(msg)}</div>`; }
const draft = { get() { try { return JSON.parse(localStorage.getItem(DKEY) || "{}"); } catch { return {}; } },
  set(v) { try { localStorage.setItem(DKEY, JSON.stringify(v)); } catch { /* private mode */ } },
  clear() { try { localStorage.removeItem(DKEY); } catch { /* ignore */ } } };

async function start() {
  if (!/^[a-z0-9-]{2,60}$/.test(slug) || token.length < 16) return fail("الرابط مش كامل. افتحوا الرابط زي ما وصلكم بالزبط.");
  let form;
  try {
    const r = await fetch(`./forms/${slug}.json`, { cache: "no-cache" });
    if (!r.ok) throw new Error(r.status);
    form = await r.json();
  } catch { return fail("ما قدرنا نفتح الاستبيان. تأكدوا من الرابط أو جربوا كمان شوي."); }
  document.title = form.title + " · FlowPal";
  const saved = draft.get();
  const qs = form.sections.flatMap((s) => s.questions);
  main.innerHTML = `<h1>${esc(form.title)}</h1><p class="intro">${esc(form.intro)}</p>
    <p class="note">إجاباتكم بتنحفظ على هالجهاز أول بأول، فبتقدروا تكمّلوا بعدين من نفس الرابط.</p>
    <form id="qform" novalidate>${form.sections.map((s) => `<section class="card"><h2><span class="n">${Number(s.n)}.</span>${esc(s.title)}</h2>
      ${s.questions.map((q) => `<div class="q"><label for="${esc(q.id)}">${esc(q.text)}</label>
        <textarea id="${esc(q.id)}" name="${esc(q.id)}" maxlength="3000" rows="3">${esc(saved[q.id] || "")}</textarea></div>`).join("")}</section>`).join("")}
      <div class="err" id="err" role="alert"></div></form>`;
  $("#bar").classList.remove("hidden");
  const f = $("#qform");
  const prog = () => { const n = qs.filter((q) => f.elements[q.id].value.trim()).length; $("#prog").textContent = `جاوبتوا ${n} من ${qs.length}`; return n; };
  prog();
  f.addEventListener("input", () => { const v = {}; for (const q of qs) v[q.id] = f.elements[q.id].value; draft.set(v); prog(); });
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!prog()) { $("#err").textContent = "جاوبوا على سؤال واحد على الأقل قبل الإرسال."; return; }
    const answers = {};
    for (const s of form.sections) for (const q of s.questions) {
      const v = f.elements[q.id].value.trim();
      if (v) answers[q.id] = { section: s.title, q: q.text, a: v };
    }
    const btn = $("#send"); btn.disabled = true; btn.textContent = "جارِ الإرسال…"; $("#err").textContent = "";
    try {
      const r = await fetch(`${SB_URL}/rest/v1/rpc/submit_client_form`, { method: "POST",
        headers: { "Content-Type": "application/json", apikey: SB_KEY, Authorization: "Bearer " + SB_KEY },
        body: JSON.stringify({ p_slug: slug, p_token: token, p_answers: answers, p_user_agent: navigator.userAgent }) });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        const m = String(j.message || "");
        throw new Error(m.includes("wait") ? "استنوا دقيقة وجربوا مرة ثانية." : m.includes("not found") ? "الرابط مش صحيح أو مسكّر." : "ما انبعتت الإجابات. جربوا كمان شوي.");
      }
      draft.clear();
      $("#bar").classList.add("hidden");
      main.innerHTML = `<div class="done"><div class="tick">✓</div><h1>وصلتنا إجاباتكم، شكراً إلكم</h1>
        <p class="intro">رح نقراها ونبلّش نجهّز التجربة على منتجاتكم، وبنتواصل معكم قريباً.</p></div>`;
      scrollTo(0, 0);
    } catch (err) { btn.disabled = false; btn.textContent = "إرسال"; $("#err").textContent = err.message || "ما انبعتت الإجابات."; }
  });
}
start();
