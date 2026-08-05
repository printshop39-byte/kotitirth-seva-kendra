#!/usr/bin/env node
/**
 * scripts/lib/scripture-validator.mjs मधील extended verified-content नियमांच्या
 * negative/positive चाचण्या — प्रत्येक तात्पुरत्या (os.tmpdir()) fixture
 * फोल्डरवर चालतात, त्यामुळे प्रत्यक्ष data/scriptures/ ला स्पर्शही होत नाही.
 *
 * सिद्ध करते:
 *   - योग्यरित्या भरलेली verified-by-centre नोंद पास होते (sanity/positive control)
 *   - भविष्यातील verifiedDate असलेली नोंद अपयशी ठरते
 *   - रिकामे/खूप छोटे verifiedBy अपयशी ठरते
 *   - uncertainReadings शिल्लक असलेली किंवा "[अस्पष्ट" खूण असलेली नोंद अपयशी ठरते
 *   - draft फाईल public-index.json मध्ये संदर्भित केली तर अपयशी ठरते (आधीचा नियम अजूनही काम करतो)
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateScriptureSet } from "./lib/scripture-validator.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const REAL_SCHEMA_DIR = path.join(ROOT, "data", "scriptures", "schema");
const TODAY = "2025-06-15"; // निश्चित संदर्भ-तारीख — सिस्टिम घड्याळावर अवलंबून नाही

let failures = 0;
function ok(name, cond, extra){
  if(cond){ console.log("✓ " + name); }
  else{ failures++; console.error("✗ " + name + (extra ? "\n    " + extra : "")); }
}

function baseGoodDoc(overrides = {}){
  return Object.assign({
    id: "sample-item",
    title: "नमुना",
    language: "mr",
    script: "Devanagari",
    category: "test",
    kadhi: null,
    verification: {
      status: "verified-by-centre",
      verifiedBy: "केंद्रातील अधिकृत सेवेकरी",
      verifiedDate: "2025-06-01",
      sourceCompared: true
    },
    source: {
      label: "चाचणी स्रोत",
      pages: [3],
      images: ["p003.jpg"]
    },
    sections: [
      { type: "verse", lines: ["ही एक ओळ आहे."] }
    ]
  }, overrides);
}

function makeFixtureRoot({ items = [], verifiedDocs = {}, draftDocs = {} }){
  const dir = mkdtempSync(path.join(tmpdir(), "scripture-rules-test-"));
  mkdirSync(path.join(dir, "verified"), { recursive: true });
  mkdirSync(path.join(dir, "drafts"), { recursive: true });
  writeFileSync(path.join(dir, "public-index.json"), JSON.stringify({
    meta: { note: "test fixture" },
    items
  }, null, 2));
  for(const [file, doc] of Object.entries(verifiedDocs)){
    writeFileSync(path.join(dir, "verified", file), JSON.stringify(doc, null, 2));
  }
  for(const [file, doc] of Object.entries(draftDocs)){
    writeFileSync(path.join(dir, "drafts", file), JSON.stringify(doc, null, 2));
  }
  return dir;
}

function run(dir){
  const result = validateScriptureSet({
    scripturesRoot: dir,
    schemaDir: REAL_SCHEMA_DIR,
    requireChecksums: false,
    today: TODAY
  });
  rmSync(dir, { recursive: true, force: true });
  return result;
}

// ---------- 1. Sanity/positive control: सर्व योग्य असलेली नोंद पास व्हावी ----------
{
  const doc = baseGoodDoc({ id: "good-item" });
  const dir = makeFixtureRoot({
    items: [{ id: "good-item", file: "verified/good-item.json", title: doc.title, category: doc.category }],
    verifiedDocs: { "good-item.json": doc }
  });
  const { failures: f, entries } = run(dir);
  ok(
    "sanity: पूर्ण योग्य verified-by-centre नोंद पास होते (false-positive नियम नाहीत)",
    f === 0,
    entries.filter(e => e.level === "fail").map(e => e.message).join("\n    ")
  );
}

// ---------- 2. भविष्यातील verifiedDate अपयशी ठरते ----------
{
  const doc = baseGoodDoc({ id: "future-date-item", verification: {
    status: "verified-by-centre", verifiedBy: "सेवेकरी अ", verifiedDate: "2025-06-16" /* TODAY+1 */, sourceCompared: true
  }});
  const dir = makeFixtureRoot({
    items: [{ id: "future-date-item", file: "verified/future-date-item.json", title: doc.title, category: doc.category }],
    verifiedDocs: { "future-date-item.json": doc }
  });
  const { entries } = run(dir);
  const hasFutureDateFailure = entries.some(e => e.level === "fail" && e.message.includes("भविष्यातील तारीख"));
  ok("भविष्यातील verifiedDate असलेली नोंद अपयशी ठरते", hasFutureDateFailure);
}

// ---------- 3. रिकामे / खूप छोटे verifiedBy अपयशी ठरते ----------
{
  const doc = baseGoodDoc({ id: "empty-verifiedby-item", verification: {
    status: "verified-by-centre", verifiedBy: "  ", verifiedDate: "2025-06-01", sourceCompared: true
  }});
  const dir = makeFixtureRoot({
    items: [{ id: "empty-verifiedby-item", file: "verified/empty-verifiedby-item.json", title: doc.title, category: doc.category }],
    verifiedDocs: { "empty-verifiedby-item.json": doc }
  });
  const { entries } = run(dir);
  const hasFailure = entries.some(e => e.level === "fail" && e.message.includes("verifiedBy किमान ३ अक्षरांचे"));
  ok("रिकामे/खूप छोटे verifiedBy असलेली नोंद अपयशी ठरते", hasFailure);
}

// ---------- 4a. uncertainReadings शिल्लक असलेली नोंद अपयशी ठरते ----------
{
  const doc = baseGoodDoc({
    id: "uncertain-readings-item",
    uncertainReadings: [{ location: "ओळ २", visible_text: "...", possible_text: "...", confidence: "low" }]
  });
  const dir = makeFixtureRoot({
    items: [{ id: "uncertain-readings-item", file: "verified/uncertain-readings-item.json", title: doc.title, category: doc.category }],
    verifiedDocs: { "uncertain-readings-item.json": doc }
  });
  const { entries } = run(dir);
  const hasFailure = entries.some(e => e.level === "fail" && e.message.includes("uncertainReadings रिकामे असावे"));
  ok("uncertainReadings शिल्लक असलेली नोंद अपयशी ठरते", hasFailure);
}

// ---------- 4b. "[अस्पष्ट" खूण असलेली नोंद अपयशी ठरते ----------
{
  const doc = baseGoodDoc({
    id: "unclear-marker-item",
    sections: [{ type: "verse", lines: ["ही ओळ आहे [अस्पष्ट: संभाव्य शब्द] इथे."] }]
  });
  const dir = makeFixtureRoot({
    items: [{ id: "unclear-marker-item", file: "verified/unclear-marker-item.json", title: doc.title, category: doc.category }],
    verifiedDocs: { "unclear-marker-item.json": doc }
  });
  const { entries } = run(dir);
  const hasFailure = entries.some(e => e.level === "fail" && e.message.includes('"[अस्पष्ट" अशी खूण आहे'));
  ok('मजकुरात "[अस्पष्ट" खूण शिल्लक असलेली नोंद अपयशी ठरते', hasFailure);
}

// ---------- 5. draft leakage अजूनही अपयशी ठरते ----------
{
  const draftDoc = baseGoodDoc({ id: "leaked-draft", verification: {
    status: "draft", verifiedBy: "", verifiedDate: "", sourceCompared: false
  }});
  const dir = makeFixtureRoot({
    items: [{ id: "leaked-draft", file: "drafts/leaked-draft.json", title: draftDoc.title, category: draftDoc.category }],
    draftDocs: { "leaked-draft.json": draftDoc }
  });
  const { entries } = run(dir);
  const hasSchemaOrSecurityFailure = entries.some(e => e.level === "fail" &&
    (e.message.includes("draft") || e.message.includes("verified/")));
  ok("public-index.json मधून drafts/ कडे निर्देश केल्यास अपयशी ठरते (draft-leak अजूनही पकडला जातो)", hasSchemaOrSecurityFailure);
}

// ---------- bonus: rिकामी pages/images असलेली verified नोंद अपयशी ठरते ----------
{
  const doc = baseGoodDoc({ id: "empty-source-item", source: { label: "स्रोत", pages: [], images: [] } });
  const dir = makeFixtureRoot({
    items: [{ id: "empty-source-item", file: "verified/empty-source-item.json", title: doc.title, category: doc.category }],
    verifiedDocs: { "empty-source-item.json": doc }
  });
  const { entries } = run(dir);
  const hasPagesFailure = entries.some(e => e.level === "fail" && e.message.includes("source.pages"));
  const hasImagesFailure = entries.some(e => e.level === "fail" && e.message.includes("source.images"));
  ok("(bonus) रिकामे source.pages अपयशी ठरते", hasPagesFailure);
  ok("(bonus) रिकामे source.images अपयशी ठरते", hasImagesFailure);
}

console.log(`\n${failures === 0 ? "सर्व" : failures + " अपयशी"} validation-rule चाचण्या.`);
process.exit(failures === 0 ? 0 : 1);
