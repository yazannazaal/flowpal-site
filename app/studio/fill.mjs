// Flowpal content studio: fill a brand template with values, exactly like the brand renderer (render.py)
// (prepare() + the {{key}} fill + the size/zoom style). One implementation for the browser preview (Hub content
// tab) and the render worker (node + a headless browser screenshot), so the preview is the file that gets made.
// Keep it in step with render.py: the parity test (internal repo, studio-parity) renders every
// sample both ways and fails on a pixel difference over 0.5 %.
// No DOM, no network, no dependencies: plain string work that runs the same in node and in the browser.

export const LOGO_DIR = "logo";   // in app/studio/tpl/ (the renderer uses the brand logo folder)

const TICKS = '<svg class="ticks" viewBox="0 0 30 18"><path d="M1 10l5 5L15 4M11 13l2 2L24 4" fill="none" ' +
  'stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// Python str() of a JSON value, so values like true / null print the way render.py prints them.
function pyStr(v) {
  if (v === true) return "True";
  if (v === false) return "False";
  if (v === null || v === undefined) return "None";
  if (Array.isArray(v) || typeof v === "object") return JSON.stringify(v);
  return String(v);
}

// html.escape(s, quote=False), then the few inline tags copy may use: <em>, <b>, <br>, <span class="latin">.
export function esc(s) {
  let x = pyStr(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  x = x.replace(/&lt;(\/?)(em|b|br)&gt;/g, "<$1$2>");
  return x.split("&lt;span class=&quot;latin&quot;&gt;").join('<span class="latin">')
    .split('&lt;span class="latin"&gt;').join('<span class="latin">')
    .split("&lt;/span&gt;").join("</span>");
}

// Python f"{x:.0f}": round half to even.
function fmt0(x) {
  const f = Math.floor(x), d = x - f;
  const r = d > 0.5 ? f + 1 : d < 0.5 ? f : (f % 2 === 0 ? f : f + 1);
  return String(r === 0 ? 0 : r);
}

function buildChat(items) {
  const out = [];
  for (const it of items || []) {
    if ("day" in it) out.push(`<div class="day">${esc(it.day)}</div>`);
    else if ("badge" in it) out.push(`<div class="badge ${it.tone ?? ""}">${esc(it.badge)}</div>`);
    else if (it.typing) out.push('<div class="typing"><i></i><i></i><i></i></div>');
    else {
      const side = ["out", "business", "shop"].includes(it.from) ? "out" : "in";
      const ticks = side === "out" && (it.ticks ?? true) ? TICKS : "";
      const t = it.time ? `<time>${esc(it.time ?? "")}${ticks}</time>` : "";
      out.push(`<div class="msg ${side}"><p>${esc(it.text)}</p>${t}</div>`);
    }
  }
  return out.join("\n");
}

// Highlight-cover icons (same drawing as render.py ICONS)
const ST = 'fill="none" stroke="#F5F7FA" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"';
const ICONS = {
  messages: `<path d="M12 9h18a6 6 0 0 1 6 6v8a6 6 0 0 1-6 6H20l-8 6v-6a6 6 0 0 1-6-6v-8a6 6 0 0 1 6-6z" ${ST}/>` +
    '<circle cx="15" cy="19" r="2" fill="#F5F7FA"/><circle cx="21" cy="19" r="2" fill="#F5F7FA"/>' +
    '<circle cx="27" cy="19" r="2" fill="#F5F7FA"/><circle cx="39" cy="35" r="5" fill="#1FB1AE"/>',
  tips: `<path d="M24 5a12.5 12.5 0 0 0-7.3 22.6c1.4 1 2.3 2.4 2.3 4V33h10v-1.4c0-1.6.9-3 2.3-4A12.5 12.5 0 0 0 24 5z" ${ST}/>` +
    `<path d="M19 38.5h10M21 43h6" ${ST}/><circle cx="24" cy="18" r="4.5" fill="#1FB1AE"/>`,
  workshop: `<path d="M16 13L6 24l10 11M32 13l10 11-10 11" ${ST}/><circle cx="24" cy="24" r="4.5" fill="#1FB1AE"/>`,
  ask: `<path d="M24 6a17 17 0 1 0 8.6 31.7L41 41l-2.6-8.2A17 17 0 0 0 24 6z" ${ST}/>` +
    `<path d="M19.5 19a4.8 4.8 0 1 1 6.7 4.4c-1.3.6-2.2 1.7-2.2 3.1V28" ${ST}/><circle cx="24" cy="33.5" r="2.6" fill="#1FB1AE"/>`,
};

function iconHtml(name, mark) {
  if (["about", "logo", "mark"].includes(name) || !ICONS[name]) return `<img src="${mark}" alt="FlowPal" style="height:62%;display:block">`;
  return `<svg viewBox="0 0 48 48" style="width:100%;height:100%;display:block">${ICONS[name]}</svg>`;
}

function buildBars(items) {
  const xs = items || [];
  const top = xs.length ? Math.max(...xs.map((b) => parseFloat(b.pct ?? 0))) : 0;
  return xs.map((b) => {
    const pct = parseFloat(b.pct ?? 0);
    const cls = pct === top && top > 0 ? "on" : "";
    return `<div class="bar ${cls}"><i style="width:${fmt0(pct)}%"></i><span class="lbl">${esc(b.label ?? "")}</span>` +
      `<span class="pct latin">${fmt0(pct)}%</span></div>`;
  }).join("");
}

function buildItems(items, tone) {
  if (!items || !items.length) return "";
  return `<ul class="items ${tone === "teal" ? "teal" : ""}">${items.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`;
}

const yes = (x) => ["1", "true", "yes"].includes(pyStr(x));
const defaultUrl = (p) => p;   // URLs and template-relative paths pass; the worker can pass its own resolver

/** render.py prepare(): defaults + derived keys, every text escaped. opts: {logoDir, toUrl}. */
export function prepare(values, template, opts = {}) {
  const logoDir = opts.logoDir ?? LOGO_DIR;
  const toUrl = (p) => (!p || /^(https?|file|data):/.test(p) ? p : (opts.toUrl || defaultUrl)(p));
  const v = {
    theme: "", tone: "signal", handle: "@flowpal.co", contact: "زبون جديد", contact_initial: "ز",
    channel: "متصل الآن", status_class: "", eyebrow: "", sub: "", guides: "0",
    photo: "", photo_label: "مكان الصورة: محل حقيقي أو مشهد بدون نص", note: "", note_time: "",
    swipe: "اسحب للتالي ←", series: "", index: "1", total: "5", number: "1",
    ...values,
  };
  if (template === "highlight-cover" && !v.theme) v.theme = "dark";
  const dark = pyStr(v.theme).includes("dark");
  v.logo_dir = logoDir;
  if (!v.logo) v.logo = `${logoDir}/flowpal-lockup-${dark ? "color-on-dark" : "color"}.svg`;
  if (!v.logo_tagline) v.logo_tagline = `${logoDir}/flowpal-lockup-tagline-${dark ? "color-on-dark" : "color"}.svg`;
  if (!v.mark) v.mark = `${logoDir}/flowpal-mark-${dark ? "color-on-dark" : "color"}.svg`;
  v.guides_display = yes(v.guides) ? "block" : "none";
  v.photo = toUrl(v.photo);
  v.post = toUrl(v.post ?? "");
  v.post_class = v.post ? "" : "empty";
  v.post_img = v.post ? `<img src="${v.post}" alt="">` : "";
  v.stamp_display = yes(v.verified ?? "0") ? "none" : "flex";
  v.icon_html = iconHtml(v.icon ?? "about", v.mark);
  v.bars_html = buildBars(v.bars);
  v.items_html = buildItems(v.items, v.items_tone ?? "signal");
  v.wa_display = v.whatsapp ? "flex" : "none";
  v.photo_class = v.photo ? "" : "empty";
  v.photo_style = v.photo ? `background-image:url('${v.photo}')` : "";
  const i = parseInt(v.index, 10), n = parseInt(v.total, 10);
  v.dots = Array.from({ length: Math.max(0, n || 0) }, (_, k) => `<i class="${k < i ? "on" : ""}"></i>`).join("");
  const raw = new Set(["logo", "logo_tagline", "mark", "logo_dir", "post", "photo", "theme", "tone", "status_class", "guides_display",
    "photo_class", "photo_style", "dots", "chat", "post_class", "post_img", "stamp_display", "icon_html", "bars_html", "bars",
    "items_html", "items", "wa_display"]);
  const out = {};
  for (const [k, val] of Object.entries(v)) {
    if (k === "chat") out[k] = buildChat(val);
    else if (k === "bars" || k === "items") continue;
    else if (raw.has(k)) out[k] = pyStr(val);
    else out[k] = esc(val);
  }
  return out;
}

/** Base size of a template page (its data-size attribute). */
export function baseSize(src) {
  const m = /data-size="(\d+)x(\d+)"/.exec(src);
  if (!m) throw new Error("template has no data-size");
  return [Number(m[1]), Number(m[2])];
}

/**
 * render.py render() without the screenshot: template page source + {template, size, values} -> the page to load.
 * opts: {logoDir, toUrl, baseHref} (baseHref adds <base>, for a page loaded from a blob URL).
 * Returns {html, width, height}: load html in a width x height viewport and screenshot it.
 */
export function fillPage(src, spec, opts = {}) {
  const [bw, bh] = baseSize(src);
  const [tw, th] = String(spec.size || `${bw}x${bh}`).split("x").map(Number);
  const zoom = tw / bw;
  const vals = prepare(spec.values || {}, spec.template, opts);
  let page = src.replace(/\{\{(\w+)\}\}/g, (_, k) => (Object.prototype.hasOwnProperty.call(vals, k) ? vals[k] : ""));
  const inject = `<style>:root{--w:${bw}px;--h:${(th / zoom).toFixed(2)}px} html{zoom:${zoom.toFixed(5)}}</style>`;
  page = page.replace("</head>", inject + "</head>");
  if (opts.baseHref) page = page.replace(/<head>/i, `<head><base href="${String(opts.baseHref).replace(/"/g, "&quot;")}">`);
  return { html: page, width: tw, height: th };
}

/**
 * Put an edit (only the changed keys) onto the post's full values, the way the render worker does: dotted keys
 * reach into lists, e.g. "chat.1.text" (bubble 1), "items.2" (item 2), "headline". A list item that does not exist
 * is an error (the studio never adds, removes or reorders bubbles or items). Returns a new object.
 */
export function applyEdit(values, edit) {
  const out = JSON.parse(JSON.stringify(values || {}));
  for (const [key, val] of Object.entries(edit || {})) {
    const parts = String(key).split(".");
    if (parts.some((p) => !p || p === "__proto__" || p === "constructor" || p === "prototype")) throw new Error(`bad key ${key}`);
    let cur = out;
    for (const p of parts.slice(0, -1)) {
      if (Array.isArray(cur)) {
        if (!/^\d+$/.test(p) || +p >= cur.length) throw new Error(`key ${key}: list item missing`);
        cur = cur[+p];
      } else {
        if (cur[p] === undefined || cur[p] === null) cur[p] = {};
        cur = cur[p];
      }
      if (typeof cur !== "object" || cur === null) throw new Error(`key ${key}: not a list or object`);
    }
    const last = parts[parts.length - 1];
    if (Array.isArray(cur)) {
      if (!/^\d+$/.test(last) || +last >= cur.length) throw new Error(`key ${key}: list item missing`);
      cur[+last] = val;
    } else cur[last] = val;
  }
  return out;
}

/** Read one value by a dotted key (same paths as applyEdit). */
export function getPath(values, key) {
  let cur = values;
  for (const p of String(key).split(".")) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = Array.isArray(cur) ? (/^\d+$/.test(p) ? cur[+p] : undefined) : cur[p];
  }
  return cur;
}

/**
 * Does the filled page still fit its design? The design team's fit check (the measure behind the manifest lengths),
 * the same measure he used for the manifest lengths: no fixed box overflows, nothing is clipped (e.g. old chat bubbles
 * pushed out of the top of .msgs), no text leaves the canvas, no two blocks overlap (logo included).
 * Self-contained (no imports, no closures) so the worker can run it as page.evaluate(fitCheck, probe), and the
 * preview as fitCheck(probe, iframeDocument). Run it after document.fonts.ready.
 * Returns {bad: [...problems], lines: number of lines of the text containing probe}. bad empty = it fits.
 */
export function fitCheck(probe, doc) {
  doc = doc || document;
  const win = doc.defaultView;
  const body = doc.body, B = body.getBoundingClientRect();
  const bad = [];
  const name = (el) => el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).join(".") : "");
  const vis = (el) => {
    for (let e = el; e && e !== doc.documentElement; e = e.parentElement) {
      const cs = win.getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
      if (e.classList.contains("gz") || e.classList.contains("stamp")) return false;
    }
    return true;
  };
  for (const el of body.querySelectorAll("*")) {
    if (!vis(el)) continue;
    const cs = win.getComputedStyle(el);
    const fixed = cs.overflow !== "visible" || (cs.position === "absolute" && cs.top !== "auto" && cs.bottom !== "auto");
    if (!fixed) continue;
    if (el.clientHeight > 0 && el.scrollHeight > el.clientHeight + 3) bad.push("overflowY:" + name(el));
    if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 3) bad.push("overflowX:" + name(el));
  }
  for (const el of body.querySelectorAll("*")) {
    if (!vis(el)) continue;
    if (win.getComputedStyle(el).overflow === "visible") continue;
    const R = el.getBoundingClientRect();
    for (const c of el.querySelectorAll("*")) {
      if (!vis(c) || c.children.length) continue;
      const x = c.getBoundingClientRect();
      if (x.width && x.height && (x.top < R.top - 2 || x.bottom > R.bottom + 2 || x.left < R.left - 2 || x.right > R.right + 2)) { bad.push("clipped:" + name(el)); break; }
    }
  }
  if (body.scrollHeight > body.clientHeight + 3) bad.push("overflowY:body");
  const tw = doc.createTreeWalker(body, 4 /* NodeFilter.SHOW_TEXT */);
  const blocks = new Map(); const probeRects = [];
  const top = (el) => { let e = el; while (e.parentElement && e.parentElement !== body) e = e.parentElement; return e; };
  let n;
  while ((n = tw.nextNode())) {
    if (!n.textContent.trim() || !vis(n.parentElement)) continue;
    const r = doc.createRange(); r.selectNodeContents(n);
    const rs = [...r.getClientRects()].filter((x) => x.width > 0 && x.height > 0);
    for (const x of rs) {
      if (x.top < B.top - 1 || x.bottom > B.bottom + 1 || x.left < B.left - 1 || x.right > B.right + 1) bad.push("offcanvas:" + name(n.parentElement));
      const t = top(n.parentElement); if (!blocks.has(t)) blocks.set(t, []); blocks.get(t).push(x);
    }
    if (probe && n.textContent.includes(probe)) probeRects.push(...rs);
  }
  for (const img of body.querySelectorAll("img")) {
    if (!vis(img)) continue;
    const t = top(img), x = img.getBoundingClientRect();
    if (!blocks.has(t)) blocks.set(t, []); blocks.get(t).push(x);
  }
  const ks = [...blocks.keys()];
  const hit = (a, c) => a.left < c.right - 2 && c.left < a.right - 2 && a.top < c.bottom - 2 && c.top < a.bottom - 2;
  for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) {
    if (blocks.get(ks[i]).some((a) => blocks.get(ks[j]).some((c) => hit(a, c)))) bad.push("overlap:" + name(ks[i]) + "|" + name(ks[j]));
  }
  const tops = [];
  for (const x of probeRects) if (!tops.some((t) => Math.abs(t - x.top) < x.height * 0.5)) tops.push(x.top);
  return { bad: [...new Set(bad)], lines: tops.length };
}

/** New problems an edit adds compared with the approved original (a design that was already tight is not blamed on her). */
export const newProblems = (now, base) => (now || []).filter((x) => !(base || []).includes(x));
