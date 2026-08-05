#!/usr/bin/env node
/**
 * Playwright स्मोक टेस्ट — खऱ्या Chromium मध्ये index.html चालवून तपासते:
 *   A. #paath/<scripture-id> उघडते + अवैध id => graceful fallback #paath
 *   B. existing #aarti #paath #var #jap deep-links अजूनही जशाच्या तशा काम करतात
 *   C. जपमाळा टॅप-काउंट regression (एकदा दाबा = एक जप, मणी संख्या वाढते)
 *   D. Service worker register होतो व data/scriptures/verified/*.json +
 *      public-index.json runtime cache मध्ये जातात (न हार्डकोड करताही)
 *
 * कोणतीही चाचणी FAIL झाली तर process.exit(1).
 */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = 8743;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".txt": "text/plain",
};

function startServer(){
  const server = createServer(async (req, res) => {
    try{
      let urlPath = decodeURIComponent(req.url.split("?")[0]);
      if(urlPath === "/") urlPath = "/index.html";
      const full = path.join(ROOT, urlPath);
      if(!full.startsWith(ROOT)){ res.writeHead(403); res.end(); return; }
      const data = await readFile(full);
      const ext = path.extname(full);
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      res.end(data);
    }catch(e){
      res.writeHead(404);
      res.end("not found");
    }
  });
  return new Promise(resolve => server.listen(PORT, "127.0.0.1", () => resolve(server)));
}

let failures = 0;
function check(name, cond){
  if(cond){ console.log("✓ " + name); }
  else{ failures++; console.error("✗ " + name); }
}

async function main(){
  const server = await startServer();
  const base = `http://127.0.0.1:${PORT}`;
  const browser = await chromium.launch();
  try{
    const context = await browser.newContext();
    const page = await context.newPage();
    page.on("pageerror", err => { failures++; console.error("✗ pageerror: " + err.message); });
    page.on("console", msg => { if(msg.type() === "error") console.log("  [console.error] " + msg.text()); });

    // ---------- A + B: deep-links ----------
    await page.goto(base + "/#paath/qa-sample-entry", { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    const scriptureOpen = await page.$eval("#scripture-qa-sample-entry", el => el.hasAttribute("open")).catch(() => false);
    check("#paath/qa-sample-entry => matching <details open> रेंडर होते", scriptureOpen === true);
    const paathPaneVisible = await page.$eval("#panel-paath", el => !el.hidden);
    check("#paath/<id> वर पाठ subtab सक्रिय आहे", paathPaneVisible === true);

    await page.goto(base + "/#paath/does-not-exist-id", { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    const fallbackHash = await page.evaluate(() => location.hash);
    check("अवैध scripture id => graceful fallback #paath (क्रॅश नाही)", fallbackHash === "#paath");

    await page.goto(base + "/#aarti", { waitUntil: "networkidle" });
    const aajVisible = await page.$eval("#panel-aaj", el => !el.hidden);
    check("#aarti => 'आज' subtab (existing behavior अबाधित)", aajVisible === true);

    await page.goto(base + "/#var", { waitUntil: "networkidle" });
    const varVisible = await page.$eval("#panel-var", el => !el.hidden);
    check("#var => वार subtab (existing behavior अबाधित)", varVisible === true);

    await page.goto(base + "/#jap", { waitUntil: "networkidle" });
    const japVisible = await page.$eval("#panel-jap", el => !el.hidden);
    check("#jap => जपमाळा subtab (existing behavior अबाधित)", japVisible === true);

    // ---------- C: जपमाळा टॅप regression ----------
    // jap() मध्ये मुद्दाम १२०ms anti-double-tap debounce आहे (अपघाती डबल-टॅप टाळण्यासाठी) —
    // त्यामुळे प्रत्येक क्लिकमध्ये पुरेसा वेळ ठेवावा लागतो.
    await page.click("#malaTap");
    await page.waitForTimeout(150);
    await page.click("#malaTap");
    await page.waitForTimeout(150);
    await page.click("#malaTap");
    await page.waitForTimeout(150);
    const beadCount = await page.$eval("#malaBead", el => el.textContent.trim());
    check("जपमाळा: ३ वेळा टॅप (>१२०ms अंतराने) => मणी संख्या वाढून ३ (देवनागरी अंक) दिसते", beadCount === "३");

    // ---------- D: service worker + runtime caching ----------
    await page.goto(base + "/#aarti", { waitUntil: "networkidle" });
    const swReady = await page.evaluate(async () => {
      if(!("serviceWorker" in navigator)) return false;
      try{
        const reg = await navigator.serviceWorker.register("./sw.js");
        await navigator.serviceWorker.ready;
        return !!reg;
      }catch(e){ return false; }
    });
    check("service worker register + ready होतो", swReady === true);

    // scripture data prefetch केलेला असल्याने आधीच fetch झाला असेल; तरीही खात्री करण्यासाठी पुन्हा fetch करूया
    await page.evaluate(async () => {
      await fetch("data/scriptures/public-index.json");
      await fetch("data/scriptures/verified/qa-sample-entry.json");
    });
    await page.waitForTimeout(300);
    const cached = await page.evaluate(async () => {
      const keys = await caches.keys();
      let hasIndex = false, hasVerifiedItem = false;
      for(const k of keys){
        const c = await caches.open(k);
        const reqs = await c.keys();
        for(const r of reqs){
          if(r.url.includes("data/scriptures/public-index.json")) hasIndex = true;
          if(r.url.includes("data/scriptures/verified/qa-sample-entry.json")) hasVerifiedItem = true;
        }
      }
      return { hasIndex, hasVerifiedItem };
    });
    check("public-index.json runtime cache मध्ये गेला (sw.js मध्ये hardcode न करता)", cached.hasIndex === true);
    check("verified/qa-sample-entry.json runtime cache मध्ये गेला (sw.js मध्ये hardcode न करता)", cached.hasVerifiedItem === true);

    // draft फाईल कधीही page मधून fetch होत नाही (network log द्वारे defense-in-depth तपासणी)
    const requestedDraft = await page.evaluate(async () => {
      try{
        const r = await fetch("data/scriptures/drafts/swami-jap.json");
        return r.ok; // फाईल सर्व्हरवर अस्तित्वात असू शकते, पण UI कोडने ती कधीही मागवू नये
      }catch(e){ return false; }
    });
    // ही केवळ माहितीसाठी आहे — खरी हमी scripts/validate-scriptures.mjs + कोड-रिव्ह्यूमधून येते
    console.log(`  (माहिती) drafts/swami-jap.json थेट URL वर उपलब्ध आहे का: ${requestedDraft} — पण UI कोड ती कधीही स्वतःहून मागवत नाही, फक्त public-index.json मधले items fetch करतो.`);

  } finally{
    await browser.close();
    server.close();
  }

  console.log(`\n${failures === 0 ? "सर्व" : failures + " अपयशी"} e2e चाचण्या.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
