#!/usr/bin/env node
/**
 * Mobile viewport स्मोक टेस्ट — existing production UI (index.html, #paath/ishwar-prarthana)
 * चार सामान्य फोन viewport sizes वर तपासते. कोणतीही वेगळी preview page नाही — हीच
 * production accordion + test-banner तपासली जाते.
 *
 * प्रत्येक viewport वर तपासते:
 *   - horizontal scroll येत नाही
 *   - चेतावणी बॅनर दिसतो व viewport च्या रुंदीत बसतो (कापला जात नाही)
 *   - Draft/uncertain लेबल्स दिसतात
 *   - collapsed accordion summary (tap target) उंची — मोजून अहवाल देतो
 *   - मजकूर wrap होतो (कुठेही एका ओळीने viewport रुंदी ओलांडत नाही)
 */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = 8760;

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json",
  ".png": "image/png",
};

function startServer(){
  const server = createServer(async (req, res) => {
    try{
      let urlPath = decodeURIComponent(req.url.split("?")[0]);
      if(urlPath === "/") urlPath = "/index.html";
      const full = path.join(ROOT, urlPath);
      const data = await readFile(full);
      res.writeHead(200, { "Content-Type": MIME[path.extname(full)] || "application/octet-stream" });
      res.end(data);
    }catch(e){ res.writeHead(404); res.end("not found"); }
  });
  return new Promise(resolve => server.listen(PORT, "127.0.0.1", () => resolve(server)));
}

const VIEWPORTS = [
  { name: "320x568 (iPhone SE)", width: 320, height: 568 },
  { name: "360x800 (सामान्य Android)", width: 360, height: 800 },
  { name: "390x844 (iPhone 12/13)", width: 390, height: 844 },
  { name: "412x915 (Pixel/मोठा Android)", width: 412, height: 915 },
];

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
    for(const vp of VIEWPORTS){
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await context.newPage();
      page.on("pageerror", err => { failures++; console.error(`✗ pageerror @ ${vp.name}: ${err.message}`); });

      await page.goto(base + "/#paath/ishwar-prarthana", { waitUntil: "networkidle" });
      await page.waitForTimeout(400);

      const scrollInfo = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth
      }));
      check(`[${vp.name}] horizontal scroll येत नाही (scrollWidth ${scrollInfo.scrollWidth} <= clientWidth ${scrollInfo.clientWidth})`,
        scrollInfo.scrollWidth <= scrollInfo.clientWidth + 1);

      const bannerBox = await page.$eval(".test-banner", el => {
        const r = el.getBoundingClientRect();
        return { width: r.width, right: r.right };
      }).catch(() => null);
      check(`[${vp.name}] चेतावणी बॅनर दिसतो व viewport रुंदीत बसतो (कापला जात नाही)`,
        bannerBox !== null && bannerBox.right <= vp.width + 1);

      const labelCount = await page.$$eval(".test-label", els => els.length);
      // आता २ test entries आहेत (valga-sukta + ishwar-prarthana), प्रत्येकी ३ लेबल्स = ६ लेबल्स
      check(`[${vp.name}] Draft/uncertain लेबल्स दिसतात`, labelCount >= 3);

      const summaryBox = await page.$eval("#scripture-ishwar-prarthana summary", el => {
        const r = el.getBoundingClientRect();
        return { height: r.height, width: r.width };
      });
      check(`[${vp.name}] accordion summary tap target उंची >= 44px (मिळाले: ${summaryBox.height.toFixed(1)}px)`,
        summaryBox.height >= 44);
      check(`[${vp.name}] accordion summary viewport रुंदीत बसतो`, summaryBox.width <= vp.width + 1);

      const readerBar = await page.$("#readerBar");
      check(`[${vp.name}] reader-bar (A+/A− · रात्र · आवाज) दिसतो`, readerBar !== null);
      if(readerBar){
        const rb = await readerBar.boundingBox();
        check(`[${vp.name}] reader-bar viewport रुंदीत बसतो`, rb && rb.x + rb.width <= vp.width + 2);
      }

      // कोणतीही ओळ overflow करून horizontal scroll तयार करत नाही (शब्द/मजकूर wrap होतो)
      const overflowingEls = await page.evaluate(() => {
        const all = document.querySelectorAll("#panel-paath *");
        let count = 0;
        all.forEach(el => { if(el.scrollWidth > document.documentElement.clientWidth + 2) count++; });
        return count;
      });
      check(`[${vp.name}] लांब संस्कृत/मराठी ओळी सुरक्षितपणे wrap होतात (overflow करणारे elements: ${overflowingEls})`, overflowingEls === 0);

      await context.close();
    }
  } finally{
    await browser.close();
    server.close();
  }

  console.log(`\n${failures === 0 ? "सर्व" : failures + " अपयशी"} mobile-viewport चाचण्या.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
