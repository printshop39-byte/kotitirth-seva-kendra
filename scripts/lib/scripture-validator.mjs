/**
 * data/scriptures/ (किंवा कोणत्याही सुसंगत रचनेच्या) validation साठी पुनर्वापरयोग्य core.
 * scripts/validate-scriptures.mjs (खरा data/scriptures/ वर चालणारा CLI) आणि
 * scripts/test-validation-rules.mjs (तात्पुरत्या fixture फोल्डर्सवर चालणाऱ्या
 * negative/positive चाचण्या) हे दोन्ही हाच core वापरतात — त्यामुळे नियम
 * दोन ठिकाणी वेगळे लिहावे लागत नाहीत.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import Ajv from "ajv";

export function readJSON(full){
  if(!existsSync(full)) return { error: "missing-file", full };
  try{
    return { data: JSON.parse(readFileSync(full, "utf8")), full };
  }catch(e){
    return { error: "invalid-json: " + e.message, full };
  }
}

export function loadSchemas(schemaDir){
  const ajv = new Ajv({ allErrors: true, strict: true, allowUnionTypes: true });
  const scriptureSchema = JSON.parse(readFileSync(path.join(schemaDir, "scripture.schema.json"), "utf8"));
  const indexSchema = JSON.parse(readFileSync(path.join(schemaDir, "public-index.schema.json"), "utf8"));
  return {
    ajv,
    validateScripture: ajv.compile(scriptureSchema),
    validateIndex: ajv.compile(indexSchema)
  };
}

export function canonicalText(doc){
  return (doc.sections || []).map(s => (s.type + "|" + (s.number || "") + "|" + (s.lines || []).join("\u2029"))).join("\u2028");
}

function containsUnclearMarker(doc){
  return (doc.sections || []).some(s => (s.lines || []).some(line => typeof line === "string" && line.includes("[अस्पष्ट")));
}

function isRealCalendarDate(y, mo, d){
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/**
 * एखादा scripture doc verified-by-centre म्हणून प्रकाशित होण्यास पात्र आहे का —
 * याची संपूर्ण semantic (schema-पलीकडची) तपासणी. समस्या असतील तर वाचनीय
 * मराठी संदेशांची array परत करतो; काहीच समस्या नसतील तर रिकामी array.
 */
export function verifiedContentRules(doc, { today = new Date().toISOString().slice(0, 10) } = {}){
  const problems = [];
  const v = doc.verification || {};

  if(v.status !== "verified-by-centre"){
    problems.push(`verification.status "${v.status}" ही "verified-by-centre" नाही`);
  }
  if(v.sourceCompared !== true){
    problems.push(`verification.sourceCompared true नाही (मिळाले: ${JSON.stringify(v.sourceCompared)})`);
  }

  const verifiedBy = typeof v.verifiedBy === "string" ? v.verifiedBy : "";
  if(verifiedBy.trim().length < 3){
    problems.push(`verification.verifiedBy किमान ३ अक्षरांचे खरे नाव असावे (मिळाले: "${v.verifiedBy}")`);
  }

  const dm = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(v.verifiedDate || "");
  if(!dm){
    problems.push(`verification.verifiedDate वैध "YYYY-MM-DD" स्वरूपात नाही (मिळाले: "${v.verifiedDate}")`);
  }else{
    const y = Number(dm[1]), mo = Number(dm[2]), d = Number(dm[3]);
    if(!isRealCalendarDate(y, mo, d)){
      problems.push(`verification.verifiedDate "${v.verifiedDate}" ही खरी कॅलेंडर तारीख नाही`);
    }else if(v.verifiedDate > today){
      problems.push(`verification.verifiedDate "${v.verifiedDate}" भविष्यातील तारीख आहे (आज: ${today}) — भविष्यातील तारखेने पडताळणी शक्य नाही`);
    }
  }

  const pages = doc.source && doc.source.pages;
  if(!Array.isArray(pages) || pages.length < 1){
    problems.push(`source.pages मध्ये किमान एक पान क्रमांक असावा लागतो (मिळाले: ${JSON.stringify(pages)})`);
  }

  const images = doc.source && doc.source.images;
  if(!Array.isArray(images) || images.length < 1 || images.some(i => typeof i !== "string" || !i.trim())){
    problems.push(`source.images रिकामे असू शकत नाही — किमान एक स्रोत फोटो/संदर्भ आवश्यक (मिळाले: ${JSON.stringify(images)})`);
  }

  if(doc.uncertainReadings !== undefined){
    if(!Array.isArray(doc.uncertainReadings) || doc.uncertainReadings.length !== 0){
      problems.push(`uncertainReadings रिकामे असावे किंवा अजिबात नसावे — अजून अस्पष्ट वाचन शिल्लक असल्याचे दिसते (${JSON.stringify(doc.uncertainReadings)})`);
    }
  }

  if(containsUnclearMarker(doc)){
    problems.push(`मजकुरात अजूनही "[अस्पष्ट" अशी खूण आहे — ती स्पष्ट होईपर्यंत verified-by-centre करता येणार नाही`);
  }

  return problems;
}

/**
 * `scripturesRoot` (उदा. data/scriptures/, किंवा एखादे तात्पुरते fixture फोल्डर)
 * यावर संपूर्ण validation चालवतो:
 *   1. JSON Schema (ajv)
 *   2. Manifest/file-existence
 *   3. Extended verified-content rules (verifiedContentRules वरील)
 *   4. Unpublished-draft-exposure
 *   5. (ऐच्छिक) sha256 character-integrity — checksums.json असेल तरच
 *
 * onEvent(level, message) — प्रत्येक तपासणीच्या वेळी streaming callback (ऐच्छिक).
 * परत मिळते: { checks, failures, entries: [{level, message}] }
 */
export function validateScriptureSet({ scripturesRoot, schemaDir, requireChecksums = true, today, onEvent } = {}){
  const dir = scripturesRoot;
  const schDir = schemaDir || path.join(dir, "schema");
  const entries = [];
  let checks = 0, failures = 0;

  function pass(msg){ checks++; entries.push({ level: "pass", message: msg }); if(onEvent) onEvent("pass", msg); }
  function fail(msg){ failures++; entries.push({ level: "fail", message: msg }); if(onEvent) onEvent("fail", msg); }
  const rd = relPath => readJSON(path.join(dir, relPath));

  const { ajv, validateScripture, validateIndex } = loadSchemas(schDir);

  const idxResult = rd("public-index.json");
  if(idxResult.error){
    fail("public-index.json वाचता आले नाही: " + idxResult.error);
    return { checks, failures, entries };
  }
  const publicIndex = idxResult.data;
  if(validateIndex(publicIndex)){
    pass("public-index.json schema वैध आहे");
  }else{
    fail("public-index.json schema अवैध:\n" + ajv.errorsText(validateIndex.errors, { separator: "\n" }));
  }

  const items = Array.isArray(publicIndex.items) ? publicIndex.items : [];
  if(items.length === 0){
    pass("public-index.json रिकामा आहे (items: []) — हे वैध स्थिती आहे, अजून कोणताही मजकूर मानवी पडताळणी पूर्ण करून प्रकाशित झालेला नाही");
  }

  const publicIds = new Set();
  const publicFiles = new Set();
  for(const item of items){
    publicIds.add(item.id);
    publicFiles.add(item.file);

    if(typeof item.file !== "string" || !item.file.startsWith("verified/")){
      fail(`public-index.json मधील "${item.id}" verified/ बाहेरच्या मार्गाकडे निर्देश करतो: ${item.file} (फक्त verified/ परवानगी आहे)`);
      continue;
    }
    pass(`"${item.id}" → ${item.file} (verified/ अंतर्गत)`);

    const fileResult = rd(item.file);
    if(fileResult.error){
      fail(`"${item.id}" ची फाईल सापडली नाही / वाचता आली नाही: ${item.file} (${fileResult.error})`);
      continue;
    }
    pass(`"${item.file}" अस्तित्वात आहे व वैध JSON आहे`);

    const doc = fileResult.data;

    if(validateScripture(doc)){
      pass(`"${item.file}" scripture schema वैध आहे`);
    }else{
      fail(`"${item.file}" scripture schema अवैध:\n` + ajv.errorsText(validateScripture.errors, { separator: "\n" }));
    }

    if(doc.id !== item.id){
      fail(`"${item.file}" चा id ("${doc.id}") manifest मधील id ("${item.id}") शी जुळत नाही`);
    }

    const problems = verifiedContentRules(doc, { today });
    if(problems.length === 0){
      pass(`"${item.id}" विस्तारित verified-content नियम पास (status/sourceCompared/verifiedBy/verifiedDate/pages/images/uncertainReadings/[अस्पष्ट])`);
    }else{
      for(const p of problems) fail(`"${item.id}" (${item.file}): ${p}`);
    }
  }

  const draftsDir = path.join(dir, "drafts");
  const draftFiles = existsSync(draftsDir) ? readdirSync(draftsDir).filter(f => f.endsWith(".json")) : [];
  for(const f of draftFiles){
    const relPath = "drafts/" + f;
    if(publicFiles.has(relPath)){
      fail(`SECURITY: draft फाईल "${relPath}" public-index.json मध्ये संदर्भित आहे — draft कधीही public होऊ नये`);
      continue;
    }
    const { data: doc, error } = rd(relPath);
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

  const verifiedDir = path.join(dir, "verified");
  const verifiedFiles = existsSync(verifiedDir) ? readdirSync(verifiedDir).filter(f => f.endsWith(".json")) : [];
  for(const f of verifiedFiles){
    const relPath = "verified/" + f;
    const { data: doc, error } = rd(relPath);
    if(error){ fail(`"${relPath}" वाचता आले नाही: ${error}`); continue; }
    const problems = verifiedContentRules(doc, { today });
    if(problems.length === 0){
      pass(`"${relPath}" (verified/ फोल्डरमधील फाईल) विस्तारित verified-content नियम पास`);
    }else{
      for(const p of problems) fail(`"${relPath}" (verified/ फोल्डरमधील फाईल, अजून public-index.json मध्ये नसेलही): ${p}`);
    }
  }

  if(requireChecksums){
    const checksumsResult = rd("checksums.json");
    if(checksumsResult.error){
      fail("checksums.json वाचता आले नाही: " + checksumsResult.error);
    }else{
      const { files } = checksumsResult.data;
      for(const [relPath, expectedHash] of Object.entries(files || {})){
        const { data: doc, error } = rd(relPath);
        if(error){ fail(`checksum तपासणीसाठी "${relPath}" वाचता आले नाही: ${error}`); continue; }
        const actualHash = createHash("sha256").update(canonicalText(doc), "utf8").digest("hex");
        if(actualHash === expectedHash){
          pass(`"${relPath}" character-integrity checksum जुळतो (मजकूर जसाच्या तसा आहे)`);
        }else{
          fail(`"${relPath}" checksum जुळत नाही — मजकूर बदलला असण्याची शक्यता!\n    अपेक्षित: ${expectedHash}\n    प्रत्यक्ष:  ${actualHash}`);
        }
      }
    }
  }

  return { checks, failures, entries };
}
