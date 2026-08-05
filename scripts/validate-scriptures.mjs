#!/usr/bin/env node
/**
 * data/scriptures/ साठी validation:
 *  1. JSON Schema validation (ajv)               — scripture.schema.json / public-index.schema.json
 *  2. Manifest/file-existence validation          — public-index.json मधले सर्व file references प्रत्यक्षात असतात का
 *  3. Exact character-integrity test              — checksums.json विरुद्ध sha256 पडताळणी
 *  4. Unpublished-draft-exposure test              — drafts/* कधीही public-index.json मध्ये संदर्भित होत नाहीत,
 *                                                     आणि public-index.json मधला प्रत्येक item खरोखर
 *                                                     verified-by-centre + sourceCompared===true आहे का
 *
 * Exit code 0 = सर्व पास; कोणतीही असमाधानकारक स्थिती आढळल्यास process.exit(1).
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SCRIPT_DIR = path.join(ROOT, "data", "scriptures");

let failures = 0;
let checks = 0;
function fail(msg){ failures++; console.error("✗ " + msg); }
function pass(msg){ checks++; console.log("✓ " + msg); }

function readJSON(relFromScriptDir){
  const full = path.join(SCRIPT_DIR, relFromScriptDir);
  if(!existsSync(full)) return { error: "missing-file", full };
  try{
    return { data: JSON.parse(readFileSync(full, "utf8")), full };
  }catch(e){
    return { error: "invalid-json: " + e.message, full };
  }
}

// ---------- 1. Schemas ----------
const ajv = new Ajv({ allErrors: true, strict: true });
const scriptureSchema = JSON.parse(readFileSync(path.join(SCRIPT_DIR, "schema", "scripture.schema.json"), "utf8"));
const indexSchema = JSON.parse(readFileSync(path.join(SCRIPT_DIR, "schema", "public-index.schema.json"), "utf8"));
const validateScripture = ajv.compile(scriptureSchema);
const validateIndex = ajv.compile(indexSchema);

// ---------- 2. public-index.json ----------
const idxResult = readJSON("public-index.json");
if(idxResult.error){
  fail("public-index.json वाचता आले नाही: " + idxResult.error);
  process.exit(1);
}
const publicIndex = idxResult.data;
if(validateIndex(publicIndex)){
  pass("public-index.json schema वैध आहे");
}else{
  fail("public-index.json schema अवैध:\n" + ajv.errorsText(validateIndex.errors, { separator: "\n" }));
}

const publicIds = new Set();
const publicFiles = new Set();
for(const item of publicIndex.items || []){
  publicIds.add(item.id);
  publicFiles.add(item.file);

  // rule: file must live under verified/
  if(!item.file.startsWith("verified/")){
    fail(`public-index.json मधील "${item.id}" draft/इतर मार्गाकडे निर्देश करतो: ${item.file} (फक्त verified/ परवानगी आहे)`);
    continue;
  }
  pass(`"${item.id}" → ${item.file} (verified/ अंतर्गत)`);

  // rule: file must exist (manifest/file existence validation)
  const fileResult = readJSON(item.file);
  if(fileResult.error){
    fail(`"${item.id}" ची फाईल सापडली नाही / वाचता आली नाही: ${item.file} (${fileResult.error})`);
    continue;
  }
  pass(`"${item.file}" अस्तित्वात आहे व वैध JSON आहे`);

  const doc = fileResult.data;

  // schema validation for the scripture file itself
  if(validateScripture(doc)){
    pass(`"${item.file}" scripture schema वैध आहे`);
  }else{
    fail(`"${item.file}" scripture schema अवैध:\n` + ajv.errorsText(validateScripture.errors, { separator: "\n" }));
  }

  // id must match
  if(doc.id !== item.id){
    fail(`"${item.file}" चा id ("${doc.id}") manifest मधील id ("${item.id}") शी जुळत नाही`);
  }

  // rule 6: only verified-by-centre + sourceCompared === true may appear in public-index.json
  const v = doc.verification || {};
  if(v.status === "verified-by-centre" && v.sourceCompared === true){
    pass(`"${item.id}" verification gate पास (status=verified-by-centre, sourceCompared=true)`);
  }else{
    fail(`"${item.id}" public-index.json मध्ये आहे पण verification gate FAIL: status="${v.status}", sourceCompared=${v.sourceCompared}`);
  }
}

// ---------- 3. Unpublished-draft-exposure test ----------
const draftsDir = path.join(SCRIPT_DIR, "drafts");
const draftFiles = existsSync(draftsDir) ? readdirSync(draftsDir).filter(f => f.endsWith(".json")) : [];
for(const f of draftFiles){
  const relPath = "drafts/" + f;
  if(publicFiles.has(relPath)){
    fail(`SECURITY: draft फाईल "${relPath}" public-index.json मध्ये संदर्भित आहे — draft कधीही public होऊ नये`);
    continue;
  }
  const { data: doc, error } = readJSON(relPath);
  if(error){ fail(`"${relPath}" वाचता आले नाही: ${error}`); continue; }
  if(publicIds.has(doc.id)){
    fail(`SECURITY: draft id "${doc.id}" (${relPath}) public-index.json च्या id list मध्येही आहे — id collision/leak शक्य`);
    continue;
  }
  if(doc.verification && doc.verification.status === "verified-by-centre"){
    fail(`"${relPath}" drafts/ फोल्डरमध्ये आहे पण status=verified-by-centre आहे — विसंगत, verified/ मध्ये हलवा किंवा status बदला`);
    continue;
  }
  pass(`draft "${doc.id}" (${relPath}) public-index.json मध्ये उघड होत नाही`);
}

// every file physically inside verified/ should also be schema-valid + gate-passing,
// even if (by mistake) not yet referenced from public-index.json.
const verifiedDir = path.join(SCRIPT_DIR, "verified");
const verifiedFiles = existsSync(verifiedDir) ? readdirSync(verifiedDir).filter(f => f.endsWith(".json")) : [];
for(const f of verifiedFiles){
  const relPath = "verified/" + f;
  const { data: doc, error } = readJSON(relPath);
  if(error){ fail(`"${relPath}" वाचता आले नाही: ${error}`); continue; }
  const v = doc.verification || {};
  if(v.status !== "verified-by-centre" || v.sourceCompared !== true){
    fail(`"${relPath}" verified/ फोल्डरमध्ये आहे पण verification gate FAIL (status="${v.status}", sourceCompared=${v.sourceCompared})`);
  }else{
    pass(`"${relPath}" (verified/ फोल्डरमधील फाईल) verification gate पास`);
  }
}

// ---------- 4. Exact character-integrity test (checksums.json) ----------
function canonicalText(doc){
  return doc.sections.map(s => (s.type + "|" + (s.number || "") + "|" + s.lines.join("\u2029"))).join("\u2028");
}
const checksumsResult = readJSON("checksums.json");
if(checksumsResult.error){
  fail("checksums.json वाचता आले नाही: " + checksumsResult.error);
}else{
  const { files } = checksumsResult.data;
  for(const [relPath, expectedHash] of Object.entries(files || {})){
    const { data: doc, error } = readJSON(relPath);
    if(error){ fail(`checksum तपासणीसाठी "${relPath}" वाचता आले नाही: ${error}`); continue; }
    const actualHash = createHash("sha256").update(canonicalText(doc), "utf8").digest("hex");
    if(actualHash === expectedHash){
      pass(`"${relPath}" character-integrity checksum जुळतो (मजकूर जसाच्या तसा आहे)`);
    }else{
      fail(`"${relPath}" checksum जुळत नाही — मजकूर बदलला असण्याची शक्यता!\n    अपेक्षित: ${expectedHash}\n    प्रत्यक्ष:  ${actualHash}`);
    }
  }
}

console.log(`\n${checks} तपासण्या पास, ${failures} अपयशी.`);
if(failures > 0){
  console.error("\nFAIL — commit करू नका.");
  process.exit(1);
}else{
  console.log("\nसर्व scripture validations पास.");
}
