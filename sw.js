/* श्री स्वामी समर्थ सेवा केंद्र — service worker
   काम दोन: (१) "होम स्क्रीनवर ठेवा" सुविधा चालू होते,
            (२) एकदा उघडल्यावर इंटरनेट नसतानाही पान उघडते. */
const CACHE = "seva-kendra-v11";
// फक्त app shell इथे hardcode केलेला आहे.
// data/scriptures/public-index.json व data/scriptures/verified/*.json
// मुद्दाम इथे टाकलेले नाहीत — खालचा fetch handler network-first + cache-on-success
// पद्धतीने प्रत्येक same-origin GET साठी आपोआप runtime caching करतो, त्यामुळे
// नवीन scripture फाईल प्रकाशित केली की sw.js बदलण्याची गरज नाही.
const FILES = ["./", "./index.html", "./manifest.webmanifest",
               "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png",
               "./og-image.png", "./assets/swami-samarth-welcome.webp",
               "./data/aarti.json", "./data/mantra.json",
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

// आधी नेटवर्क; मिळाले नाही तर cache.
// index.html fallback फक्त navigation (HTML page) requests साठी.
// cache:"no-store" मुद्दाम — नाहीतर ब्राउझरचा स्वतःचा HTTP cache या fetch()
// ला जुनेच उत्तर देऊ शकतो आणि "network-first" खरोखर नेटवर्कवर जातच नाही,
// त्यामुळे साईटवर बदल केल्यावरही वापरकर्त्याला जुनेच पान दिसत राहते.
self.addEventListener("fetch", e => {
  if(e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if(url.origin !== location.origin) return;

  e.respondWith(
    fetch(e.request, { cache: "no-store" })
      .then(r => {
        if(r && r.ok){
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return r;
      })
      .catch(async () => {
        const cached = await caches.match(e.request);
        if(cached) return cached;
        const nav = e.request.mode === "navigate" ||
          (e.request.headers.get("accept") || "").includes("text/html");
        if(nav) return caches.match("./index.html");
        return Response.error();
      })
  );
});
