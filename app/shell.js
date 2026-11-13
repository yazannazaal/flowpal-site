/* Flowpal Hub shell (flowpal.co/app/).
   Rules (ADR-002, agents/tech-lead/tasks/003-flowpal-hub.md in the agency repo):
   - The shell has NO list of modules and NO module labels. After login it asks the database (rpc hub_me)
     which modules this person has, builds the tabs from that answer, and import()s only ./modules/<id>.js
     for those ids, and only when the person opens that tab.
   - The only key here is the Supabase publishable (anon) key. It is public by design; Row Level Security and
     the hub_* functions protect the data. Never put a service_role key in any file of this app.
   - Mock mode runs everything on fake data (no Supabase at all), ONLY on localhost / 127.0.0.1 (for هبة's tests):
     ?mock=yazan|asmaa|dania|stranger  (or ?demo&role=admin|tech|sales|content|none). On flowpal.co both are ignored. */
import { $, esc, errText, toast } from "./lib.js";

const SUPABASE_URL = "https://kltkjkraevxltmxfetng.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_YOUiGYUqctqUkB63MIkVmw_raLYKQ6v";
const SUPABASE_JS = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";

const ID_RE = /^[a-z][a-z0-9-]+$/;
const params = new URLSearchParams(location.search);
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.hostname.endsWith(".localhost");
const DEMO = LOCAL && (params.has("demo") || params.has("mock"));
const DEMO_ROLES = [["tech", "تقني"], ["admin", "إدارة"], ["sales", "مبيعات"], ["content", "محتوى"], ["none", "بلا صلاحية"]];
const MOCK_PEOPLE = { yazan: "admin", asmaa: "tech", dania: "sales", stranger: "none" };

const app = $("#app");

/* ---------- icons by name (the DB says which icon a module uses) ---------- */
const ICONS = {
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19c.6-3.2 3-5 6-5s5.4 1.8 6 5"/><circle cx="17" cy="9" r="2.4"/><path d="M16.5 14.2c2.3.2 3.9 1.8 4.5 4.3"/>',
  wrench: '<path d="M14.5 5.5a4 4 0 0 0 4.9 4.9l-8.9 8.9a2.1 2.1 0 0 1-3-3l8.9-8.9a4 4 0 0 0-1.9-1.9z"/><path d="M14.5 5.5 17 3l1.5 1.5"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',
  book: '<path d="M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h9"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="m4 18 5.5-5 4 3.5 2.5-2 4 3.5"/>',
  wallet: '<rect x="3.5" y="6" width="17" height="13" rx="2"/><path d="M16 12.5h4.5M6 6l9-2.5 1 2.5"/>',
  dot: '<circle cx="12" cy="12" r="4"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.dot}</svg>`;

/* ---------- auth + hub_me: live Supabase or demo ---------- */
function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src; s.onload = res; s.onerror = () => rej(new Error("Failed to fetch " + src));
    document.head.appendChild(s);
  });
}

async function liveAuth() {
  if (!window.supabase) await loadScript(SUPABASE_JS);
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  return {
    sb,
    async session() { const { data } = await sb.auth.getSession(); return data.session ? { email: data.session.user.email } : null; },
    async signIn(email, password) { const { error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw error; },
    async signOut() { try { await sb.auth.signOut(); } catch { /* offline: local session is still removed below */ } },
    async setPassword(pw) { const { error } = await sb.auth.updateUser({ password: pw }); if (error) throw error; },
    async hubMe() { const { data, error } = await sb.rpc("hub_me"); if (error) throw error; return data; },
  };
}

function demoAuth() {
  const KEY = "hub.demoRole";
  const get = () => { try { return sessionStorage.getItem(KEY); } catch { return null; } };
  const set = (v) => { try { v ? sessionStorage.setItem(KEY, v) : sessionStorage.removeItem(KEY); } catch { /* private mode */ } };
  const fromUrl = MOCK_PEOPLE[params.get("mock")] || params.get("role");
  if (fromUrl && DEMO_ROLES.some(([r]) => r === fromUrl)) set(fromUrl);
  return {
    sb: null,
    role: () => get(),
    async session() { return get() ? { email: get() + "@demo.invalid" } : null; },
    async signIn(_email, _pw, role) { set(role || "tech"); },
    async signOut() { set(null); },
    async setPassword() {},
    async hubMe() { const m = await import("./demo/hub-me.js"); return m.mockHubMe(get()); },
  };
}

/* ---------- state ---------- */
let auth = null;
let me = null;              // hub_me() answer: { email, name, is_admin, modules:[{id,label,icon}] }
let allowed = [];           // modules from hub_me, ids checked
const loaded = new Map();   // id -> imported module (only ids in `allowed` ever get here)
let renderSeq = 0;

/* ---------- chrome ---------- */
function setDemoFlag() {
  const f = $("#demoFlag");
  if (!DEMO) return;
  // Only this person's own mode is written here: no list of other roles or people, so the DOM of one role never
  // names another. To switch person: log out, or open ?mock=<name> (same path as a real logout).
  f.innerHTML = `<span>وضع تجريبي محلي: كل البيانات وهمية والتعديلات لا تُحفظ.</span>`;
  f.classList.remove("hidden");
}

function setChrome(person) {
  const on = !!person;
  $("#btnAcct").classList.toggle("hidden", !on);
  if (on) {
    const name = person.name || person.email || "";
    $("#acctName").textContent = name;
    $("#acctInitial").textContent = name.trim().charAt(0) || "؟";
    $("#acctWho").textContent = person.name || "";
    $("#acctEmail").textContent = person.email || "";
  }
  $("#pwForm").classList.toggle("hidden", DEMO);
}

function buildTabs() {
  const nav = $("#tabs");
  nav.innerHTML = allowed.map((m) =>
    `<a class="tab" href="#/${m.id}" data-id="${m.id}">${icon(m.icon)}<span>${esc(m.label)}</span></a>`).join("");
  const show = allowed.length > 0;
  nav.classList.toggle("hidden", !show);
  document.body.classList.toggle("has-tabs", show);
}

function markTab(id) {
  document.querySelectorAll("#tabs .tab").forEach((a) => {
    if (a.dataset.id === id) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
}

/* ---------- full-page views ---------- */
function viewLogin(msg = "") {
  me = null; allowed = []; buildTabs(); setChrome(null);
  document.title = "تسجيل الدخول | Flowpal";
  app.innerHTML = `<section class="gate">
    <img class="mark" src="./icons/icon-192.png" alt="">
    <h1>تسجيل الدخول</h1>
    <p class="muted small" style="margin:0">لفريق Flowpal فقط. الحسابات يضيفها الفريق التقني، ولا يوجد تسجيل جديد من هنا.</p>
    <form class="panel" id="loginForm" novalidate>
      ${DEMO ? `<label class="f" for="role">الدخول كـ (وضع تجريبي)</label>
        <select class="i" id="role">${DEMO_ROLES.map(([r, t]) => `<option value="${r}">${t}</option>`).join("")}</select>` : ""}
      <label class="f" for="em">البريد الإلكتروني</label>
      <input class="i ltr" id="em" type="email" autocomplete="username" ${DEMO ? 'value="demo@demo.invalid"' : ""} required>
      <label class="f" for="pw">كلمة المرور</label>
      <input class="i ltr" id="pw" type="password" autocomplete="current-password" ${DEMO ? 'value="demo-demo"' : ""} required>
      <button class="btn" type="submit" id="loginBtn">دخول</button>
      <div class="err" id="loginErr" role="alert">${esc(msg)}</div>
    </form></section>`;
  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("#em").value.trim(), pw = $("#pw").value;
    if (!email || !pw) { $("#loginErr").textContent = "اكتب البريد الإلكتروني وكلمة المرور."; return; }
    $("#loginBtn").disabled = true; $("#loginErr").textContent = "";
    try {
      await auth.signIn(email, pw, DEMO ? $("#role").value : undefined);
      if (DEMO) setDemoFlag();
      await start();
    } catch (err) {
      $("#loginErr").textContent = /invalid/i.test(err.message || "") ? "البريد أو كلمة المرور غير صحيحة." : "تعذّر الدخول: " + errText(err);
      $("#loginBtn").disabled = false;
    }
  });
  if (!DEMO) $("#em").focus();
}

function viewNoAccess(email) {
  setChrome({ email, name: email });
  document.title = "لا توجد صلاحية | Flowpal";
  app.innerHTML = `<section class="gate"><img class="mark" src="./icons/icon-192.png" alt="">
    <h1>حسابك غير مفعّل هنا</h1>
    <p class="muted">دخلت بالبريد <span class="ltr">${esc(email)}</span>، لكنه غير مضاف لفريق التطبيق أو أنه موقوف. اطلب من الفريق التقني إضافته، ثم سجّل الدخول من جديد.</p></section>`;
}

function viewNoModules() {
  document.title = "Flowpal";
  app.innerHTML = `<section class="gate"><h1>لا توجد أقسام لحسابك بعد</h1>
    <p class="muted">حسابك مفعّل، لكن لم يُعطَ أي قسم حتى الآن. اطلب من الفريق التقني إضافة القسم الذي تحتاجه.</p></section>`;
}

function viewFatal(err) {
  app.innerHTML = `<section class="gate"><h1>تعذّر فتح التطبيق</h1>
    <p class="err">${esc(errText(err))}</p>
    <p class="muted small">حدّث الصفحة. إذا تكرر الخطأ أبلغ الفريق التقني.</p>
    <button class="btn-line" type="button" onclick="location.reload()">تحديث الصفحة</button></section>`;
}

/* ---------- router: #/<module-id>/<rest> ---------- */
function parseHash() {
  const m = location.hash.match(/^#\/([^/?]*)\/?(.*)$/);
  return { id: m ? decodeURIComponent(m[1]) : "", rest: m ? m[2] : "" };
}

async function route() {
  if (!me) return;
  const seq = ++renderSeq;
  const { id, rest } = parseHash();
  const mod = allowed.find((m) => m.id === id);
  if (!mod) {
    if (!allowed.length) return viewNoModules();
    location.replace("#/" + allowed[0].id);   // unknown or not granted: go to the first own module
    return;
  }
  markTab(mod.id);
  document.title = `${mod.label} | Flowpal`;

  let code = loaded.get(mod.id);
  if (!code) {
    app.innerHTML = `<p class="muted">جارِ التحميل…</p>`;
    try {
      code = await import(`./modules/${mod.id}.js`);   // mod.id passed ID_RE and came from hub_me
      loaded.set(mod.id, code);
    } catch (err) {
      if (seq !== renderSeq) return;
      app.innerHTML = navigator.onLine
        ? `<section class="gate"><h1>${esc(mod.label)}</h1><p class="muted">هذا القسم قيد البناء ولم يُنشر بعد. سيظهر هنا تلقائياً عند نشره.</p></section>`
        : `<section class="gate"><h1>لا يوجد اتصال</h1><p class="muted">افتح هذا القسم مرة واحدة وأنت متصل بالإنترنت.</p></section>`;
      return;
    }
  }
  if (seq !== renderSeq) return;
  const el = document.createElement("div");
  app.replaceChildren(el);
  try {
    await code.mount({
      el, path: rest, base: "#/" + mod.id, demo: DEMO, sb: auth.sb,
      me: { email: me.email, name: me.name, is_admin: !!me.is_admin },
      hasModule: (x) => allowed.some((m) => m.id === x),
      isCurrent: () => seq === renderSeq,
    });
    if (seq === renderSeq && !rest) window.scrollTo(0, 0);
  } catch (err) {
    if (seq !== renderSeq) return;
    el.innerHTML = `<p class="err">تعذّر تحميل البيانات: ${esc(errText(err))}</p><p class="muted small">حدّث الصفحة، وإذا تكرر الخطأ أبلغ الفريق التقني.</p>`;
  }
}

/* ---------- start / logout ---------- */
async function start() {
  const sess = await auth.session();
  if (!sess) return viewLogin();
  let answer;
  try { answer = await auth.hubMe(); } catch (err) { return viewFatal(err); }
  if (!answer || !answer.email) return viewNoAccess(sess.email);
  me = answer;
  const seen = new Set();
  allowed = (Array.isArray(me.modules) ? me.modules : [])
    .filter((m) => m && typeof m.id === "string" && ID_RE.test(m.id) && !seen.has(m.id) && seen.add(m.id))
    .map((m) => ({ id: m.id, label: String(m.label || m.id), icon: String(m.icon || "") }));
  setChrome(me);
  buildTabs();
  await route();
}

async function clearDeviceData() {
  // Caches of this app (shell + any module file this person loaded) and anything the app kept in storage.
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("hub-")).map((k) => caches.delete(k)));
    }
  } catch { /* no cache API */ }
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith("hub.") || k.startsWith("sb-")) localStorage.removeItem(k);
  } catch { /* storage blocked */ }
  try {
    for (const k of Object.keys(sessionStorage)) if (k.startsWith("hub.")) sessionStorage.removeItem(k);
  } catch { /* storage blocked */ }
}

async function logout() {
  $("#acctDlg").open && $("#acctDlg").close();
  await auth.signOut();
  await clearDeviceData();
  // Full reload: no module code or data stays in memory for the next person on this phone.
  const q = DEMO ? "?demo" : "";
  location.replace(location.pathname + q + "#/");
}

/* ---------- account dialog ---------- */
const dlg = $("#acctDlg");
$("#btnAcct").addEventListener("click", () => { $("#pwForm").reset(); $("#pwErr").textContent = ""; dlg.showModal(); });
$("#acctClose").addEventListener("click", () => dlg.close());
$("#btnOut").addEventListener("click", () => logout());
$("#pwForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const a = $("#pw1").value, b = $("#pw2").value;
  if (a.length < 8) { $("#pwErr").textContent = "كلمة المرور يجب أن تكون 8 أحرف على الأقل."; return; }
  if (a !== b) { $("#pwErr").textContent = "الكلمتان غير متطابقتين."; return; }
  $("#pwSave").disabled = true;
  try { await auth.setPassword(a); dlg.close(); toast("تم تغيير كلمة المرور"); }
  catch (err) { $("#pwErr").textContent = "تعذّر التغيير: " + errText(err); }
  $("#pwSave").disabled = false;
});

/* ---------- service worker (installable app, offline page) ---------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(() => { /* app still works without it */ });
  });
}

/* ---------- boot ---------- */
window.addEventListener("hashchange", route);
(async () => {
  try {
    auth = DEMO ? demoAuth() : await liveAuth();
  } catch (err) {
    return viewFatal(err);
  }
  if (DEMO) setDemoFlag();
  if (auth.sb) {
    auth.sb.auth.onAuthStateChange((ev) => {
      if (ev === "SIGNED_OUT" && me) { clearDeviceData().then(() => location.replace(location.pathname + "#/")); }
    });
  }
  await start();
})();
