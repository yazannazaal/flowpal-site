// Flowpal Hub service worker (scope /app/).
// - Caches ONLY the app shell (and the offline page + icons) so the app installs and opens fast.
// - Never touches Supabase or any other origin: data is always live and never stored here.
// - Never precaches modules/*.js, shared/*.js (code shared by some modules) or studio/ (the content editor and its brand templates). A module file is cached only after this person opened it (runtime),
//   and logout deletes every hub-* cache.
const VERSION = "v4";
const SHELL_CACHE = `hub-shell-${VERSION}`;
const MOD_CACHE = `hub-modules-${VERSION}`;
const OFFLINE_URL = "./offline.html";
const SHELL_FILES = [
  "./", "./index.html", "./app.css", "./shell.js", "./lib.js", "./manifest.webmanifest", OFFLINE_URL,
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("hub-") && k !== SHELL_CACHE && k !== MOD_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Network first (so a new deploy shows at once), cache as fallback when offline.
async function networkFirst(request, cacheName) {
  try {
    const res = await fetch(request);
    if (res.ok) (await caches.open(cacheName)).put(request, res.clone());
    return res;
  } catch {
    const hit = await caches.match(request, { ignoreSearch: true });
    if (hit) return hit;
    throw new Error("offline");
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;          // Supabase, CDN, fonts: untouched, never cached
  const scope = new URL(self.registration.scope);
  if (!url.pathname.startsWith(scope.pathname)) return;

  if (request.mode === "navigate") {
    // no-cache: always ask the server, so an old copy from the browser cache never opens without a connection.
    event.respondWith(fetch(request.url, { cache: "no-cache", credentials: "same-origin" }).catch(async () => (await caches.match(OFFLINE_URL)) || Response.error()));
    return;
  }
  const rel = url.pathname.slice(scope.pathname.length);
  if (rel.startsWith("modules/") || rel.startsWith("shared/") || rel.startsWith("studio/")) { event.respondWith(networkFirst(request, MOD_CACHE)); return; }
  if (rel.startsWith("demo/")) return;                       // demo data: never cached
  event.respondWith(networkFirst(request, SHELL_CACHE));
});
