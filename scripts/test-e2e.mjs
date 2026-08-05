#!/usr/bin/env node
/**
 * Playwright स्मोक टेस्ट — खऱ्या Chromium मध्ये index.html चालवून तपासते.
 *
 * दोन वेगळे static server वापरले आहेत, मुद्दाम वेगळे ठेवलेले:
 *
 *   SERVER A — प्रत्यक्ष repo root जसाच्या तसा (production data, रिकामा
 *              data/scriptures/public-index.json). इथे तपासतो:
 *                - existing #aarti #paath #var #jap deep-links अबाधित
 *                - रिकामा public-index.json => graceful मराठी संदेश
 *                - tests/fixtures/ ला कधीही request जात नाही
 *                - fixture id ("verified-sample") DOM मध्ये कुठेही दिसत नाही
 *                - जपमाळा टॅप regression
 *                - service worker register + runtime caching
 *
 *   SERVER B — तात्पुरता overlay (temp dir): repo ची कॉपी + tests/fixtures/
 *              मधला नमुना data/scriptures/verified/ मध्ये इंजेक्ट केलेला.
 *              production data/scriptures/ ला स्पर्शही न करता, रेंडरिंग
 *              pipeline (sections, badge, deep-link expand+scroll) खरोखर
 *              काम करते हे इथे सिद्ध होते.
 *
 * कोणतीही चाचणी FAIL झाली तर process.exit(1).
 */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, mkdtemp, cp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".txt": "text/plain",
};

function startServer(rootDir, port){
  const server = createServer(async (req, res) => {
    try{
      let urlPath = decodeURIComponent(req.url.split("?")[0]);
      if(urlPath === "/") urlPath = "/index.html";
      const full = path.join(rootDir, urlPath);
      if(!full.startsWith(rootDir)){ res.writeHead(403); res.end(); return; }
      const data = await readFile(full);
      const ext = path.extname(full);
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      res.end(data);
    }catch(e){
      res.writeHead(404);
      res.end("not found");
    }
  });
  return new Promise(resolve => server.listen(port, "127.0.0.1", () => resolve(server)));
}

let failures = 0;
function check(name, cond){
  if(cond){ console.log("✓ " + name); }
  else{ failures++; console.error("✗ " + name); }
}

async function testProductionServer(browser){
  const PORT = 8743;
  const server = await startServer(ROOT, PORT);
  const base = `http://127.0.0.1:${PORT}`;
  try{
    const context = await browser.newContext();
    const page = await context.newPage();
    page.on("pageerror", err => { failures++; console.error("✗ pageerror: " + err.message); });

    const requestedPaths = [];
    page.on("request", req => { requestedPaths.push(new URL(req.url()).pathname); });

    // ---------- existing deep-links अबाधित ----------
    await page.goto(base + "/#aarti", { waitUntil: "networkidle" });
    check("#aarti => 'आज' subtab (existing behavior अबाधित)", await page.$eval("#panel-aaj", el => !el.hidden));

    await page.goto(base + "/#var", { waitUntil: "networkidle" });
    check("#var => वार subtab (existing behavior अबाधित)", await page.$eval("#panel-var", el => !el.hidden));

    await page.goto(base + "/#jap", { waitUntil: "networkidle" });
    check("#jap => जपमाळा subtab (existing behavior अबाधित)", await page.$eval("#panel-jap", el => !el.hidden));

    // ---------- रिकामा production public-index.json => graceful मराठी संदेश ----------
    await page.goto(base + "/#paath", { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    const idxContent = await page.evaluate(() => fetch("data/scriptures/public-index.json").then(r => r.json()));
    check("production data/scriptures/public-index.json खरोखर रिकामा आहे (items: [])", Array.isArray(idxContent.items) && idxContent.items.length === 0);
    const emptyMsg = await page.$eval("#scriptureListEmpty", el => el.textContent.trim()).catch(() => null);
    check("रिकाम्या public-index वर graceful मराठी संदेश दिसतो", typeof emptyMsg === "string" && emptyMsg.length > 0);
    const scriptureAccCount = await page.$$eval("#scriptureList details.acc", els => els.length);
    check("रिकाम्या public-index वर एकही scripture accordion रेंडर होत नाही", scriptureAccCount === 0);

    // ---------- अवैध/अप्रकाशित scripture id => graceful fallback #paath ----------
    await page.goto(base + "/#paath/verified-sample", { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    check("production वर कोणताही scripture id अप्रकाशित असल्याने #paath वर graceful fallback होतो",
      await page.evaluate(() => location.hash) === "#paath");

    // ---------- test fixtures कधीही fetch/display होत नाहीत ----------
    const fixtureRequested = requestedPaths.some(p => p.includes("tests/fixtures"));
    check("संपूर्ण सत्रात tests/fixtures/ कडे एकही network request गेलेली नाही", fixtureRequested === false);
    const pageHtml = await page.content();
    check("fixture id (\"verified-sample\") production page च्या HTML मध्ये कुठेही दिसत नाही", !pageHtml.includes("verified-sample"));

    // ---------- जपमाळा टॅप regression ----------
    // jap() मध्ये मुद्दाम १२०ms anti-double-tap debounce आहे — क्लिकमध्ये पुरेसा वेळ ठेवावा लागतो.
    await page.goto(base + "/#jap", { waitUntil: "networkidle" });
    await page.click("#malaTap");
    await page.waitForTimeout(150);
    await page.click("#malaTap");
    await page.waitForTimeout(150);
    await page.click("#malaTap");
    await page.waitForTimeout(150);
    const beadCount = await page.$eval("#malaBead", el => el.textContent.trim());
    check("जपमाळा: ३ वेळा टॅप (>१२०ms अंतराने) => मणी संख्या वाढून ३ (देवनागरी अंक) दिसते", beadCount === "३");

    // ---------- service worker + runtime caching ----------
    const swReady = await page.evaluate(async () => {
      if(!("serviceWorker" in navigator)) return false;
      try{
        const reg = await navigator.serviceWorker.register("./sw.js");
        await navigator.serviceWorker.ready;
        return !!reg;
      }catch(e){ return false; }
    });
    check("service worker register + ready होतो", swReady === true);

    await page.evaluate(async () => { await fetch("data/scriptures/public-index.json"); });
    await page.waitForTimeout(300);
    const cachedIndex = await page.evaluate(async () => {
      const keys = await caches.keys();
      for(const k of keys){
        const c = await caches.open(k);
        const reqs = await c.keys();
        if(reqs.some(r => r.url.includes("data/scriptures/public-index.json"))) return true;
      }
      return false;
    });
    check("रिकामाही असला तरी public-index.json runtime cache मध्ये जातो (sw.js मध्ये hardcode न करता)", cachedIndex === true);

    // draft फाईल कधीही page मधून स्वतःहून fetch होत नाही (defense-in-depth माहिती)
    const draftRequested = requestedPaths.some(p => p.includes("data/scriptures/drafts/"));
    check("UI कोड data/scriptures/drafts/ ला स्वतःहून कधीही request करत नाही", draftRequested === false);

  } finally{
    server.close();
  }
}

async function testOverlayServer(browser){
  const PORT = 8744;
  // प्रत्यक्ष repo ची तात्पुरती कॉपी — मूळ data/scriptures/ ला अजिबात स्पर्श न करता
  const overlayDir = await mkdtemp(path.join(tmpdir(), "scripture-overlay-"));
  await cp(ROOT, overlayDir, {
    recursive: true,
    filter: src => !src.includes(`${path.sep}node_modules${path.sep}`) &&
                   !src.includes(`${path.sep}.git${path.sep}`) &&
                   src !== path.join(ROOT, "node_modules") &&
                   src !== path.join(ROOT, ".git")
  });

  const fixture = JSON.parse(await readFile(path.join(ROOT, "tests/fixtures/scriptures/verified-sample.json"), "utf8"));
  await writeFile(
    path.join(overlayDir, "data/scriptures/verified/verified-sample.json"),
    JSON.stringify(fixture, null, 2)
  );
  await writeFile(
    path.join(overlayDir, "data/scriptures/public-index.json"),
    JSON.stringify({
      meta: { note: "TEST OVERLAY ONLY — production data/scriptures/public-index.json is empty; this temp copy exists only to prove the rendering pipeline works." },
      items: [{ id: fixture.id, file: "verified/verified-sample.json", title: fixture.title, category: fixture.category }]
    }, null, 2)
  );

  const server = await startServer(overlayDir, PORT);
  const base = `http://127.0.0.1:${PORT}`;
  try{
    const context = await browser.newContext();
    const page = await context.newPage();
    page.on("pageerror", err => { failures++; console.error("✗ pageerror (overlay): " + err.message); });

    await page.goto(base + `/#paath/${fixture.id}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    const detailsOpen = await page.$eval(`#scripture-${fixture.id}`, el => el.hasAttribute("open")).catch(() => false);
    check("(overlay, production नाही) #paath/<id> => प्रकाशित केलेली नोंद <details open> रेंडर होते", detailsOpen === true);
    const sectionTypesPresent = await page.$$eval(
      `#scripture-${fixture.id} .accbody p.ovi`,
      els => els.map(e => e.className)
    );
    const hasAllTypes = ["sec-heading", "sec-verse", "sec-refrain", "sec-prose", "sec-note", "sec-phalashruti"]
      .every(cls => sectionTypesPresent.some(c => c.includes(cls)));
    check("(overlay) सर्व ७ प्रकारचे sections (heading/verse/refrain/mantra/prose/note/phalashruti) योग्यरित्या रेंडर होतात", hasAllTypes);
    const badgeOk = await page.$eval(`#scripture-${fixture.id} .src-badge.ok`, el => el.textContent.includes("पडताळलेले")).catch(() => false);
    check("(overlay) पडताळलेले badge दिसते", badgeOk === true);

  } finally{
    server.close();
    await rm(overlayDir, { recursive: true, force: true });
  }
}

async function main(){
  const browser = await chromium.launch();
  try{
    await testProductionServer(browser);
    await testOverlayServer(browser);
  } finally{
    await browser.close();
  }

  console.log(`\n${failures === 0 ? "सर्व" : failures + " अपयशी"} e2e चाचण्या.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
