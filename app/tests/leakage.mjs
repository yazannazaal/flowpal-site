import { createRequire } from "module";
const require = createRequire("/opt/node22/lib/node_modules/");
const { chromium } = require("playwright");

const BASE = "http://127.0.0.1:8765/app/";
const OUT = process.env.OUT || "/tmp/hub-shots/";
import { mkdirSync } from "fs"; mkdirSync(OUT, { recursive: true });
const LABELS = { subscribers: "المشتركين", "tech-requests": "الطلبات والمشاكل", sales: "المبيعات", research: "الأبحاث", content: "موافقة المحتوى", finance: "المالية" };
const MONEY = ["سعر", "شيكل", "₪", "$", "دولار", "تكلفة"];
const PEOPLE = {
  yazan: { mods: Object.keys(LABELS), banned: [] },
  asmaa: { mods: ["subscribers", "tech-requests"], banned: ["دانيا", ...MONEY] },
  dania: { mods: ["sales", "research", "content"], banned: ["مشترك", "workflow", "n8n", "عطل", "أسماء", ...MONEY] },
  stranger: { mods: [], banned: Object.values(LABELS) },
};

const browser = await chromium.launch({ args: ["--host-resolver-rules=MAP flowpal.test 127.0.0.1"] });
let fails = 0;
const check = (cond, msg) => { console.log((cond ? "PASS " : "FAIL ") + msg); if (!cond) fails++; };

for (const [who, spec] of Object.entries(PEOPLE)) {
  for (const [vw, size] of [["375", { width: 375, height: 812 }], ["desktop", { width: 1280, height: 860 }]]) {
    const ctx = await browser.newContext({ viewport: size, serviceWorkers: "allow" });
    const page = await ctx.newPage();
    const reqs = [];
    page.on("request", (r) => reqs.push(r.url()));
    const errs = [];
    page.on("pageerror", (e) => errs.push(e.message));
    await page.goto(BASE + "?mock=" + who);
    await page.waitForTimeout(1200);
    // open each own tab
    for (const id of spec.mods) { await page.goto(BASE + "?mock=" + who + "#/" + id); await page.waitForTimeout(700); }
    // try to force other modules via the hash
    for (const id of Object.keys(LABELS).filter((x) => !spec.mods.includes(x))) {
      await page.evaluate((h) => { location.hash = h; }, "#/" + id);
      await page.waitForTimeout(500);
    }
    if (spec.mods[0]) { await page.goto(BASE + "?mock=" + who + "#/" + spec.mods[0]); await page.waitForTimeout(900); }
    await page.screenshot({ path: `${OUT}${who}-${vw}.png`, fullPage: vw === "375" });
    const tabs = await page.$$eval("#tabs .tab", (as) => as.map((a) => a.dataset.id));
    check(JSON.stringify(tabs) === JSON.stringify(spec.mods), `${who}/${vw} tabs = ${JSON.stringify(tabs)}`);
    const html = await page.content();
    for (const [id, label] of Object.entries(LABELS)) {
      if (!spec.mods.includes(id)) check(!html.includes(label), `${who}/${vw} DOM has no label of ${id}`);
    }
    const text = await page.evaluate(() => document.body.innerText);
    for (const w of spec.banned) check(!text.includes(w), `${who}/${vw} text has no «${w}»`);
    const modReqs = reqs.filter((u) => u.includes("/app/modules/")).map((u) => u.split("/app/modules/")[1]);
    check(modReqs.every((f) => spec.mods.includes(f.replace(/\.js.*$/, ""))), `${who}/${vw} module requests ${JSON.stringify([...new Set(modReqs)])}`);
    check(!reqs.some((u) => u.includes("supabase")), `${who}/${vw} no Supabase request in mock`);
    const cache = await page.evaluate(async () => {
      const out = {}; for (const k of await caches.keys()) out[k] = (await (await caches.open(k)).keys()).map((r) => new URL(r.url).pathname);
      return out;
    });
    const cached = Object.values(cache).flat();
    check(!cached.some((p) => p.includes("/modules/") && !spec.mods.some((m) => p.endsWith("/" + m + ".js"))), `${who}/${vw} SW cache only own modules: ${JSON.stringify(cached.filter((p) => p.includes("modules")))}`);
    check(!cached.some((p) => p.includes("/demo/")), `${who}/${vw} SW cache has no demo file`);
    check(errs.length === 0, `${who}/${vw} no JS errors ${errs.join(" | ")}`);
    await ctx.close();
  }
}

// logout clears device data: dania then asmaa on the same browser
{
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "?mock=dania"); await page.waitForTimeout(1500);
  await page.click("#btnAcct"); await page.click("#btnOut"); await page.waitForTimeout(1500);
  const left = await page.evaluate(async () => ({ caches: (await caches.keys()).filter((k) => k.startsWith("hub-modules")), ls: Object.keys(localStorage), ss: Object.keys(sessionStorage), login: !!document.querySelector("#loginForm") }));
  check(left.login && left.ls.length === 0 && left.ss.length === 0, `logout -> login form, storage cleared ${JSON.stringify(left)}`);
  await page.screenshot({ path: OUT + "login-375.png" });
  await page.goto(BASE + "?mock=asmaa"); await page.waitForTimeout(1500);
  const t = await page.evaluate(() => document.body.innerText);
  check(!t.includes("دانيا") && !t.includes("المبيعات"), "after dania logout, asmaa sees nothing of dania");
  // subscriber page screenshot
  await page.goto(BASE + "?mock=asmaa#/subscribers"); await page.waitForTimeout(900);
  const first = await page.$("a.row"); if (first) { await first.click(); await page.waitForTimeout(900); await page.screenshot({ path: OUT + "asmaa-subscriber-375.png", fullPage: true }); }
  await page.goto(BASE + "?mock=asmaa#/tech-requests"); await page.waitForTimeout(900);
  await page.screenshot({ path: OUT + "asmaa-tech-requests-375.png", fullPage: true });
  await ctx.close();
}

// mock is ignored off localhost
{
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();
  const reqs = []; page.on("request", (r) => reqs.push(r.url()));
  await page.goto("http://flowpal.test:8765/app/?mock=yazan"); await page.waitForTimeout(4000);
  const tabs = await page.$$eval("#tabs .tab", (as) => as.length);
  check(tabs === 0 && !reqs.some((u) => u.includes("/demo/")), `off localhost ?mock ignored (tabs=${tabs}, demo file fetched=${reqs.some((u) => u.includes("/demo/"))})`);
  await page.screenshot({ path: OUT + "live-login-375.png" });
  await ctx.close();
}
await browser.close();
console.log(fails ? `\n${fails} FAIL` : "\nALL PASS");
