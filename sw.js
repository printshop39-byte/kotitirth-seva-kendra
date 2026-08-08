/* श्री स्वामी समर्थ सेवा केंद्र — service worker
   काम दोन: (१) "होम स्क्रीनवर ठेवा" सुविधा चालू होते,
            (२) एकदा उघडल्यावर इंटरनेट नसतानाही पान उघडते. */
const CACHE = "seva-kendra-v2";
const FILES = ["./", "./index.html", "./manifest.webmanifest",
               "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png",
               // आजचे पंचांग (Marathi Panchang) — ऑफलाइनसाठी
               "./assets/panchang/panchang.css",
               "./assets/vendor/astronomy.browser.min.js",
               "./assets/panchang/config.js",
               "./assets/panchang/marathi.js",
               "./assets/panchang/engine.js",
               "./assets/panchang/festival-rules.js",
               "./assets/data/local-events.js",
               "./assets/panchang/moon.js",
               "./assets/panchang/ui.js"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n))))
    .then(() => self.clients.claim()));
});

// आधी नेटवर्क, मिळाले नाही तर साठवलेले पान
self.addEventListener("fetch", e => {
  if(e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then(r => {
        if(r && r.ok && new URL(e.request.url).origin === location.origin){
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return r;
      })
      .catch(() => caches.match(e.request).then(m => m || caches.match("./index.html")))
  );
});
