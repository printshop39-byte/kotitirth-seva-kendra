#!/usr/bin/env node
/**
 * data/scriptures/ CLI validator — प्रत्यक्ष प्रोडक्शन फोल्डरवर चालतो.
 * नियम/तपासण्यांचे तपशील scripts/lib/scripture-validator.mjs मध्ये (जे
 * scripts/test-validation-rules.mjs हे fixture-आधारित चाचण्यांसाठीही वापरते).
 *
 * Exit code 0 = सर्व पास; कोणतीही असमाधानकारक स्थिती आढळल्यास process.exit(1).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateScriptureSet } from "./lib/scripture-validator.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SCRIPTURES_ROOT = path.join(ROOT, "data", "scriptures");

const { checks, failures } = validateScriptureSet({
  scripturesRoot: SCRIPTURES_ROOT,
  requireChecksums: true,
  onEvent: (level, message) => {
    console.log((level === "pass" ? "✓ " : "✗ ") + message);
  }
});

console.log(`\n${checks} तपासण्या पास, ${failures} अपयशी.`);
if(failures > 0){
  console.error("\nFAIL — commit करू नका.");
  process.exit(1);
}else{
  console.log("\nसर्व scripture validations पास.");
}
