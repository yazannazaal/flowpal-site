// Flowpal content studio: the edit-form rules, shared by the Hub content tab and its local mock.
// checkField() / checkBudgets() are the same checks as hub_studio_check() / hub_studio_budget() in flowpal-agency
// ops/hub/003-content-edits.sql (rev. 2026-11-14, زياد's rules), so a value the form accepts is a value the database
// accepts. The database still checks everything again.
// Brand options only: tone and theme come from the manifest's options; there is never a free colour.

const DEF_MAX = { text: 120, hashtags: 300, caption: 2200, longtext: 400 };
export const len = (s) => [...String(s ?? "")].length;   // char_length() counts characters, not UTF-16 units
/** زياد's visible length: <em>/<b> not counted, each <br> counts as 15 (it adds a line). = hub_studio_vlen() */
export const vlen = (s) => len(String(s ?? "").replace(/<\/?(em|b)>/gi, "").replace(/<br *\/?>/gi, "x".repeat(15)));
export const isText = (f) => ["text", "longtext", "caption", "hashtags"].includes(f.type);
export const maxOf = (f) => (f.max != null ? Number(f.max) : DEF_MAX[f.type] ?? 400);
/** the length the counter shows and the max applies to */
export const lenOf = (f, v) => (["text", "longtext"].includes(f.type) ? vlen(v) : len(v));

/** One manifest field + one value -> an Arabic message, or null when the value is fine. */
export function checkField(f, v) {
  const t = f.type;
  if (isText(f)) {
    if (typeof v !== "string") return "لازم يكون نص";
    const mx = maxOf(f);
    if (lenOf(f, v) > mx) return `النص أطول من ${mx} حرف`;
    if (t === "text" && !v.trim() && f.required !== false) return "النص فاضي";
    if (/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(v)) return "فيه رموز غير مسموحة";
    if (t === "text" || t === "longtext") {
      let rest = v.replace(/<(em|b)>[^<>]*<\/\1>/gi, "");
      if (t === "longtext") rest = rest.replace(/<br *\/?>/gi, "");
      if (/[<>]/.test(rest)) return t === "text" ? "مسموح بس <em> و <b>" : "مسموح بس <em> و <b> و <br>";
      if ((v.match(/<em>/gi) || []).length > 1) return "مسموح تمييز واحد بس (<em>)";
    } else if (/[<>]/.test(v)) return "ممنوع وسوم بهالنص";
    if (t === "hashtags") {
      if (!/^\s*(#[^\s#]+\s*)*$/.test(v)) return "الهاشتاغات لازم تبدأ ب # ومفصولة بمسافة";
      const mc = Number(f.max_count) || 30;
      if ((v.match(/#/g) || []).length > mc) return `أكثر من ${mc} هاشتاغ`;
    }
    return null;
  }
  if (t === "color" || t === "enum") {
    if (typeof v !== "string") return "اختيار غير صحيح";
    return (f.options || []).includes(v) ? null : "اختيار مش من القائمة";
  }
  if (t === "number") {
    if (typeof v !== "number" || !Number.isFinite(v)) return "لازم يكون رقم";
    if ((f.min != null && v < Number(f.min)) || (f.max != null && v > Number(f.max))) return `الرقم لازم بين ${f.min} و ${f.max}`;
    return null;
  }
  return "حقل غير معروف";
}

/** زياد's budgets: total visible length of the listed keys (chat[i].text = every bubble) per size. = hub_studio_budget() */
export function checkBudgets(manifest, base, values) {
  for (const b of (manifest && manifest.budgets) || []) {
    if (b.size && manifest.size && b.size !== manifest.size) continue;
    const pats = (b.keys || []).map((k) => new RegExp("^" + k.replace(/\./g, "\\.").replace(/\[i\]/g, "\\.[0-9]+") + "$"));
    if (!pats.length) continue;
    const sum = (o) => Object.entries(o || {}).filter(([k, v]) => typeof v === "string" && pats.some((p) => p.test(k))).reduce((n, [, v]) => n + vlen(v), 0);
    if (sum(values) > Math.max(Number(b.max_total), sum(base))) return "النص كتير طويل على هالتصميم، قصّري شوي";
  }
  return null;
}

// Arabic names + swatches for brand options (a manifest's option_labels win).
export const OPTION = {
  teal:   { t: "أخضر", sw: "#1FB1AE" },
  signal: { t: "برتقالي", sw: "#FF5A3C" },
  "":     { t: "فاتحة", sw: "#F5F7FA" },
  dark:   { t: "غامقة (كحلي)", sw: "#0F1B33" },
};
// a theme option keeps the post's own modifiers ("dark compact", "single"): name and swatch come from light/dark
const themeBase = (o) => (String(o).split(/\s+/).includes("dark") ? "dark" : String(o).trim() && !OPTION[o] ? "" : o);
export const optionLabel = (f, o) => (f.option_labels && f.option_labels[o]) || (f.labels && f.labels[o]) ||
  (OPTION[o] && OPTION[o].t) || (f.key === "theme" && OPTION[themeBase(o)] ? OPTION[themeBase(o)].t : o);
export const optionSwatch = (f, o) => (OPTION[o] && OPTION[o].sw) || (f.key === "theme" && OPTION[themeBase(o)] ? OPTION[themeBase(o)].sw : null);
