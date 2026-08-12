// Upstash Redis क्लायंट — Vercel च्या "Upstash for Redis" मार्केटप्लेस इंटिग्रेशनने
// प्रोजेक्टला जोडल्यावर आपोआप योग्य env vars तयार होतात (नाव इंटिग्रेशनप्रमाणे थोडं
// वेगळं असू शकतं, म्हणून दोन्ही सामान्य नावं तपासतो).
const { Redis } = require("@upstash/redis");

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

module.exports = { redis: url && token ? new Redis({ url, token }) : null };
