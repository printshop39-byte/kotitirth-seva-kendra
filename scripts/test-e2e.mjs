#!/usr/bin/env node
/**
 * Playwright स्मोक टेस्ट — खऱ्या Chromium मध्ये index.html चालवून तपासते.
 *
 * दोन वेगळे static server वापरले आहेत, मुद्दाम वेगळे ठेवलेले:
 *
 *   SERVER A — प्रत्यक्ष repo root जसाच्या तसा (production data — यात आता
 *              "ishwar-prarthana" ही visibility="test" तात्पुरती public
 *              draft-test नोंद आहे). इथे तपासतो:
 *                - existing #aarti #paath #var #jap deep-links अबाधित
 *                - "ishwar-prarthana" चेतावणी बॅनर + Draft/uncertain लेबल्ससह
 *                  रेंडर होते, "पडताळलेले" बॅज कधीही दिसत नाही
 *                - #paath/ishwar-prarthana deep-link तसेच सामान्य Paath UI
 *                  (accordion क्लिक) दोन्हीतून पोहोचता येते
 *                - मजकूर अक्षरशः तसाच आहे ("approach" कुठेही नाही)
 *                - drafts/swami-jap.json (visibility=test नसलेला) कधीही
 *                  fetch होत नाही; drafts/ishwar-prarthana.json (visibility
 *                  =test असलेला) मात्र जाणीवपूर्वक fetch होतो
 *                - tests/fixtures/ ला कधीही request जात नाही
 *                - जपमाळा टॅप regression
 *                - service worker register + runtime caching
 *
 *   SERVER B — तात्पुरता overlay (temp dir): repo ची कॉपी + tests/fixtures/
 *              मधला नमुना data/scriptures/verified/ मध्ये इंजेक्ट केलेला.
 *              production data/scriptures/ ला स्पर्शही न करता, सामान्य
 *              (visibility=test नसलेल्या) verified-by-centre रेंडरिंग
 *              pipeline अजूनही तशीच काम करते हे सिद्ध होते.
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

    // ---------- production public-index.json मध्ये visibility=test नोंदी ----------
    await page.goto(base + "/#paath", { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    const idxContent = await page.evaluate(() => fetch("data/scriptures/public-index.json").then(r => r.json()));
    check("production public-index.json मध्ये फक्त visibility=test नोंदी आहेत",
      Array.isArray(idxContent.items) && idxContent.items.length > 0 &&
      idxContent.items.every(it => it.visibility === "test"));

    const scriptureAccCount = await page.$$eval("#scriptureList details.acc", els => els.length);
    check("production वर योग्य संख्येने scripture accordions रेंडर होतात", scriptureAccCount === idxContent.items.length);

    const testEl = "#scripture-ishwar-prarthana";
    check("visibility=test नोंद 'acc-test' वर्गासह रेंडर होते", await page.$eval(testEl, el => el.classList.contains("acc-test")).catch(() => false));

    const summaryChip = await page.$eval(`${testEl} summary .chip.c-test`, el => el.textContent.trim()).catch(() => null);
    check("collapsed स्थितीतही 'DRAFT · TEST' chip summary मध्ये दिसतो", summaryChip === "DRAFT · TEST");

    // ---------- बॅनर + लेबल्स + "पडताळलेले" बॅज कधीही नाही ----------
    await page.click(`${testEl} summary`);
    await page.waitForTimeout(200);
    const bannerText = await page.$eval(`${testEl} .test-banner-msg`, el => el.textContent.trim()).catch(() => null);
    check('बॅनर नेमका "फक्त मोबाईल चाचणीसाठी — मजकूर अजून अंतिम किंवा पडताळलेला नाही" असा दिसतो',
      bannerText === "फक्त मोबाईल चाचणीसाठी — मजकूर अजून अंतिम किंवा पडताळलेला नाही");

    const labelTexts = await page.$$eval(`${testEl} .test-label`, els => els.map(e => e.textContent.trim()));
    check('"Draft" लेबल दिसते', labelTexts.includes("Draft"));
    check('"source comparison incomplete" लेबल दिसते', labelTexts.includes("source comparison incomplete"));
    check('"N readings pending human review" लेबल दिसते (uncertainReadings.length वरून dynamic)', labelTexts.some(t => t.includes("readings pending human review")));

    const bannerNote = await page.$eval(`${testEl} .test-banner-note`, el => el.textContent.trim()).catch(() => null);
    check('banner note मध्ये uncertainReadings ची संख्या दिसते', bannerNote && bannerNote.includes("अजून मानवी पडताळणीसाठी बाकी आहेत"));

    const verifiedBadgePresent = await page.$(`${testEl} .src-badge.ok`);
    check('visibility=test नोंदीवर "पडताळलेले" बॅज कधीही दिसत नाही', verifiedBadgePresent === null);
    const bodyTextForThisItem = await page.$eval(`${testEl} .accbody`, el => el.textContent);
    check('"पडताळलेले" हा शब्द visibility=test नोंदीच्या मजकुरात कुठेही नाही', !bodyTextForThisItem.includes("पडताळलेले"));

    // ---------- मजकूर अक्षरशः तसाच — कोणताही शब्द बदललेला नाही ----------
    check('"approach" हा शब्द कुठेही नाही (आधीची चूक अजूनही दुरुस्तच आहे)', !bodyTextForThisItem.includes("approach"));
    check('मूळ मंत्र "॥ श्री स्वामी समर्थ ॥" जसाच्या तसा दिसतो', bodyTextForThisItem.includes("॥ श्री स्वामी समर्थ ॥"));
    check('दुरुस्त केलेली ओळ "तूच आमचे सर्वस्व आहेस।" जशीच्या तशी दिसते', bodyTextForThisItem.includes("तूच आमचे सर्वस्व आहेस।"));

    // ---------- existing Paath UI (accordion क्लिक) व #paath/<id> दोन्हीतून पोहोचता येते ----------
    // आधीच्या बॅनर-तपासणीत ही नोंद उघडलेली असू शकते — इथे स्वच्छ सुरुवात करण्यासाठी स्पष्टपणे बंद करतो.
    await page.goto(base + "/#paath", { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    await page.$eval(testEl, el => el.removeAttribute("open"));
    const openBeforeClick = await page.$eval(testEl, el => el.hasAttribute("open"));
    await page.click(`${testEl} summary`);
    await page.waitForTimeout(150);
    const openAfterClick = await page.$eval(testEl, el => el.hasAttribute("open"));
    check("सामान्य Paath UI मध्ये accordion वर टॅप करून नोंद उघडता येते", openBeforeClick === false && openAfterClick === true);

    await page.goto(base + "/#paath/ishwar-prarthana", { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    const openViaDeepLink = await page.$eval(testEl, el => el.hasAttribute("open")).catch(() => false);
    check("#paath/ishwar-prarthana deep-link ने नोंद auto-open होते", openViaDeepLink === true);

    // ---------- अवैध/अप्रकाशित scripture id => graceful fallback #paath ----------
    await page.goto(base + "/#paath/verified-sample", { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    check("अप्रकाशित/अवैध scripture id साठी #paath वर graceful fallback होतो",
      await page.evaluate(() => location.hash) === "#paath");

    // ---------- test fixtures कधीही fetch/display होत नाहीत ----------
    const fixtureRequested = requestedPaths.some(p => p.includes("tests/fixtures"));
    check("संपूर्ण सत्रात tests/fixtures/ कडे एकही network request गेलेली नाही", fixtureRequested === false);
    const pageHtml = await page.content();
    check("fixture id (\"verified-sample\") production page च्या HTML मध्ये कुठेही दिसत नाही", !pageHtml.includes("verified-sample"));

    // ---------- वाचन सोयी: A+/A− · डार्क मोड · डबल-टॅप आवडते · ऐका बटण ----------
    await page.goto(base + "/#paath", { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    check("reader-bar (#readerBar) दिसतो", await page.$("#readerBar") !== null);
    check("भाषिणी सेटअप पॅनेल (#bhashiniBox) दिसतो", await page.$("#bhashiniBox") !== null);
    check("भाषिणी userID / API Key इनपुट्स आहेत",
      await page.$("#bhUserId") !== null && await page.$("#bhApiKey") !== null);
    const bhHelpers = await page.evaluate(() => {
      const b = window.__bhashini;
      if(!b) return null;
      return {
        configured: b.configured(),
        chunks: b.chunk("एक। दोन। तीन।", 8),
        hasPipeline: !!b.defaultPipeline,
        configHost: (b.configUrl || "").includes("ulcacontrib.org")
      };
    });
    check("window.__bhashini हेल्पर्स उपलब्ध", !!bhHelpers);
    check("भाषिणी सुरूवातीला unconfigured (की commit नाहीत)", bhHelpers && bhHelpers.configured === false);
    check("मराठी chunk helper मजकूर तोडतो", bhHelpers && Array.isArray(bhHelpers.chunks) && bhHelpers.chunks.length >= 1);
    check("भाषिणी ULCA config URL / default pipeline सेट आहे", bhHelpers && bhHelpers.hasPipeline && bhHelpers.configHost);
    // की सेव्ह → localStorage; खरा API कॉल e2e मध्ये नाही (की/नेटवर्क/CORS)
    await page.$eval("#bhashiniBox", el => { el.open = true; });
    const saved = await page.evaluate(() => {
      document.getElementById("bhUserId").value = "test-user";
      document.getElementById("bhApiKey").value = "test-key";
      document.getElementById("bhEngine").value = "browser";
      document.getElementById("bhSave").click();
      return JSON.parse(localStorage.getItem("bhashini.creds.v1") || "null");
    });
    check("भाषिणी की localStorage (bhashini.creds.v1) मध्ये सेव्ह होतात",
      saved && saved.userId === "test-user" && saved.apiKey === "test-key" && saved.engine === "browser");
    const cleared = await page.evaluate(() => {
      document.getElementById("bhClear").click();
      return localStorage.getItem("bhashini.creds.v1");
    });
    check("भाषिणी की काढल्यावर localStorage रिकामे", cleared === null);
    const fsBefore = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--read-fs").trim());
    await page.click("#fsUp");
    await page.waitForTimeout(50);
    const fsAfter = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--read-fs").trim());
    check("A+ दाबल्यावर --read-fs वाढतो", parseFloat(fsAfter) > parseFloat(fsBefore || "1"));
    await page.click("#themeToggle");
    await page.waitForTimeout(50);
    check("☾ रात्र दाबल्यावर html[data-theme=dark] लागतो",
      await page.evaluate(() => document.documentElement.getAttribute("data-theme") === "dark"));
    // पहिले paath accordion उघडा — ऐका/आवडते tools दिसले पाहिजेत
    const firstPaath = "#paath details.acc[data-fav-key]";
    await page.click(`${firstPaath} summary`);
    await page.waitForTimeout(150);
    check("उघडलेल्या पाठात 🔊 ऐका बटण दिसते", await page.$(`${firstPaath} .btn-speak`) !== null);
    check("उघडलेल्या पाठात ☆ आवडते बटण दिसते", await page.$(`${firstPaath} .btn-fav`) !== null);
    await page.click(`${firstPaath} .btn-fav`);
    await page.waitForTimeout(100);
    check("आवडते दाबल्यावर .fav वर्ग लागतो", await page.$eval(firstPaath, el => el.classList.contains("fav")));
    const favStored = await page.evaluate(() => JSON.parse(localStorage.getItem("paath.fav.v1") || "[]"));
    check("आवडते localStorage (paath.fav.v1) मध्ये सेव्ह होते", Array.isArray(favStored) && favStored.length >= 1);
    // डार्क मोड बंद — पुढील चाचण्यांसाठी स्वच्छ
    await page.click("#themeToggle");

    // ---------- जपमाळा टॅप regression ----------
    // jap() मध्ये मुद्दाम १२०ms anti-double-tap debounce आहे — क्लिकमध्ये पुरेसा वेळ ठेवावा लागतो.
    // डबल टॅप मोजणीसाठी वापरत नाही (एकदा दाबा = एक जप).
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

    await page.evaluate(async () => {
      await fetch("data/scriptures/public-index.json");
      await fetch("data/scriptures/drafts/ishwar-prarthana.json");
    });
    await page.waitForTimeout(300);
    const cached = await page.evaluate(async () => {
      const keys = await caches.keys();
      let hasIndex = false, hasDraft = false;
      for(const k of keys){
        const c = await caches.open(k);
        const reqs = await c.keys();
        for(const r of reqs){
          if(r.url.includes("data/scriptures/public-index.json")) hasIndex = true;
          if(r.url.includes("data/scriptures/drafts/ishwar-prarthana.json")) hasDraft = true;
        }
      }
      return { hasIndex, hasDraft };
    });
    check("public-index.json runtime cache मध्ये जातो (sw.js मध्ये hardcode न करता)", cached.hasIndex === true);
    check("जाणीवपूर्वक fetch केलेली drafts/ishwar-prarthana.json सुद्धा runtime cache मध्ये जाते (सामान्य वर्तनाशी सुसंगत)", cached.hasDraft === true);

    // visibility=test नसलेली draft फाईल (swami-jap) कधीही fetch होत नाही;
    // फक्त visibility=test असलेली ishwar-prarthana फाईल जाणीवपूर्वक fetch होते.
    const swamiJapRequested = requestedPaths.some(p => p.includes("data/scriptures/drafts/swami-jap.json"));
    check("visibility=test नसलेली drafts/swami-jap.json कधीही fetch होत नाही", swamiJapRequested === false);
    const ishwarDraftRequested = requestedPaths.some(p => p.includes("data/scriptures/drafts/ishwar-prarthana.json"));
    check("visibility=test असलेली drafts/ishwar-prarthana.json जाणीवपूर्वक fetch होते", ishwarDraftRequested === true);

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
    const noTestBannerOnNormalItem = await page.$(`#scripture-${fixture.id} .test-banner`);
    check("(overlay) सामान्य verified-by-centre नोंदीवर test-banner कधीही दिसत नाही", noTestBannerOnNormalItem === null);

  } finally{
    server.close();
    await rm(overlayDir, { recursive: true, force: true });
  }
}

async function testClientSideGateNotWeakened(browser){
  const PORT = 8745;
  // तात्पुरता overlay: public-index.json मध्ये drafts/ कडे निर्देश करणारी नोंद,
  // पण visibility="test" न लावता — client-side loader नेही ती नाकारायलाच हवी
  // (defense-in-depth — फक्त server-side validator वर अवलंबून नाही).
  const overlayDir = await mkdtemp(path.join(tmpdir(), "scripture-gate-test-"));
  await cp(ROOT, overlayDir, {
    recursive: true,
    filter: src => !src.includes(`${path.sep}node_modules${path.sep}`) &&
                   !src.includes(`${path.sep}.git${path.sep}`) &&
                   src !== path.join(ROOT, "node_modules") &&
                   src !== path.join(ROOT, ".git")
  });
  await writeFile(
    path.join(overlayDir, "data/scriptures/public-index.json"),
    JSON.stringify({
      meta: { note: "GATE TEST OVERLAY — visibility=test शिवाय drafts/ कडे निर्देश, client-side ने नाकारायलाच हवे" },
      items: [{ id: "swami-jap", file: "drafts/swami-jap.json", title: "श्री स्वामी समर्थ", category: "mantra" }]
    }, null, 2)
  );

  const server = await startServer(overlayDir, PORT);
  const base = `http://127.0.0.1:${PORT}`;
  try{
    const context = await browser.newContext();
    const page = await context.newPage();
    page.on("pageerror", err => { failures++; console.error("✗ pageerror (gate-test overlay): " + err.message); });

    await page.goto(base + "/#paath", { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    const rendered = await page.$("#scripture-swami-jap");
    check("(gate-test overlay) visibility=test शिवाय drafts/ कडे निर्देश असलेली नोंद client-side वरही रेंडर होत नाही (गेट सैल केलेला नाही)", rendered === null);
    const emptyMsgShown = await page.$eval("#scriptureListEmpty", el => el.textContent.trim()).catch(() => null);
    check("(gate-test overlay) नाकारल्यानंतर रिकाम्या यादीचा graceful संदेश दिसतो", typeof emptyMsgShown === "string" && emptyMsgShown.length > 0);

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
    await testClientSideGateNotWeakened(browser);
  } finally{
    await browser.close();
  }

  console.log(`\n${failures === 0 ? "सर्व" : failures + " अपयशी"} e2e चाचण्या.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
