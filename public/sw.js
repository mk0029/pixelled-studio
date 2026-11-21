/* PixleLED Studio Service Worker */
const CACHE_VERSION = "pixleled-v1";
const PRECACHE_ASSETS = [
  "/_next/static/6w0BpCkokt_9T5W1m7Yi0/_buildManifest.js",
  "/_next/static/6w0BpCkokt_9T5W1m7Yi0/_ssgManifest.js",
  "/_next/static/chunks/139.7a5a8e93a21948c1.js",
  "/_next/static/chunks/255-0e5ac6cd71b0e266.js",
  "/_next/static/chunks/496.ec739da482fc3f5a.js",
  "/_next/static/chunks/4bd1b696-c023c6e3521b1417.js",
  "/_next/static/chunks/646.f342b7cffc01feb0.js",
  "/_next/static/chunks/902.deeb9269ee64c1a1.js",
  "/_next/static/chunks/903-0be822a29f9ff6e6.js",
  "/_next/static/chunks/app/layout-d7c0ef88ac1fd59e.js",
  "/_next/static/chunks/app/manifest.webmanifest/route-5f84df3797c68d7b.js",
  "/_next/static/chunks/app/opengraph-image/route-5f84df3797c68d7b.js",
  "/_next/static/chunks/app/page-f7562c396a46b35a.js",
  "/_next/static/chunks/app/robots.txt/route-5f84df3797c68d7b.js",
  "/_next/static/chunks/app/sitemap.xml/route-5f84df3797c68d7b.js",
  "/_next/static/chunks/app/_not-found/page-db2d03402f22d612.js",
  "/_next/static/chunks/framework-c726bb0f54a6cca6.js",
  "/_next/static/chunks/main-77317541716c8c39.js",
  "/_next/static/chunks/main-app-24653419219c1d42.js",
  "/_next/static/chunks/pages/_app-82835f42865034fa.js",
  "/_next/static/chunks/pages/_error-013f4188946cdd04.js",
  "/_next/static/chunks/polyfills-42372ed130431b0a.js",
  "/_next/static/chunks/webpack-4f3e45b0b6a77efd.js",
  "/_next/static/css/890ad42988c44bb6.css",
  "/helper/README.md",
  "/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/manifest.webmanifest",
  "/ruffle/172de42e6619eac8f371.wasm",
  "/ruffle/878d548199cddef07035.wasm",
  "/ruffle/core.ruffle.16d61072ac7fdc4d5013.js",
  "/ruffle/core.ruffle.994eeef0a471a88cd0e3.js",
  "/ruffle/ruffle.js",
  "/sw.js",
  "/vercel.json",
  "/_headers",
  "/"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Navigation requests: network-first with cache fallback to root shell
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(req).then((r) => r || caches.match("/") || caches.match("/index.html"))
        )
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.endsWith(".js") || url.pathname.endsWith(".css") || url.pathname.endsWith(".wasm") || url.pathname.endsWith(".png") || url.pathname.endsWith(".svg") || url.pathname.endsWith(".webmanifest"))) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
    })
  );
});
