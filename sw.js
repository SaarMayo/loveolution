/* Offline copy of the schedule.
   Pages: try the network briefly (fresh schedule), fall back to the saved copy when there's no reception.
   Everything else: saved copy first. Bump VERSION when publishing a new version of the files. */
const VERSION = "lv19-v8";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png", "./favicon.png", "./map.jpg", "./poster-thu.jpg", "./poster-fri.jpg", "./poster-sat.jpg"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const timeout = ms => new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    const net = fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put("./index.html", copy)); }
      return res;
    });
    e.waitUntil(net.catch(() => {}));
    // weak reception: don't wait more than 3 seconds before showing the saved copy
    e.respondWith(
      Promise.race([net, timeout(3000)])
        .catch(() => caches.match("./index.html").then(r => r || caches.match("./")).then(r => r || net))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }))
  );
});
