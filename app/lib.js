// Shared helpers for the shell and every module. No data, no keys, no module names.

export const $ = (s, r = document) => r.querySelector(s);

export const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const safeUrl = (u) => {
  try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : null; } catch { return null; }
};

const dFmt = new Intl.DateTimeFormat("ar-u-nu-latn", { day: "numeric", month: "short", year: "numeric" });
const dtFmt = new Intl.DateTimeFormat("ar-u-nu-latn", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
export const fmtDate = (d) => {
  if (!d) return "—";
  const x = new Date(String(d).length === 10 ? d + "T00:00:00" : d);
  return isNaN(x) ? "—" : dFmt.format(x);
};
export const fmtDT = (d) => { const x = new Date(d); return isNaN(x) ? "" : dtFmt.format(x); };
export const isoDay = (dt) => dt.toISOString().slice(0, 10);

export function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.setAttribute("role", "status");
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

// A module adds its own CSS once, under its own id.
export function useStyle(id, css) {
  const key = "mod-css-" + id;
  if (document.getElementById(key)) return;
  const s = document.createElement("style");
  s.id = key;
  s.textContent = css;
  document.head.appendChild(s);
}

// Supabase result unwrapper: throws on error.
export const ok = ({ data, error }) => { if (error) throw error; return data; };

// Arabic text for common failures, so nobody sees a raw English error alone.
export function errText(err) {
  const m = (err && (err.message || err.error_description)) || "";
  if (/failed to fetch|network/i.test(m)) return "لا يوجد اتصال بالإنترنت. جرّب مرة أخرى بعد عودة الاتصال.";
  if (/42501|not allowed|permission/i.test(m + (err && err.code))) return "ليس لحسابك صلاحية على هذا الجزء.";
  return m || "خطأ غير معروف";
}

// Names of people come from the database (hub_me().people: {member id: display name}), never from the code.
// Without a name the id the database sent is shown as is; the AI analyst keeps his product name.
let PEOPLE = {};
export function setPeople(map) { PEOPLE = map && typeof map === "object" && !Array.isArray(map) ? { ...map } : {}; }
export const who = (id) => (id == null || id === "" ? "" : PEOPLE[id] || (id === "omar" ? "عمر" : String(id)));
export const peopleIds = () => Object.keys(PEOPLE);
