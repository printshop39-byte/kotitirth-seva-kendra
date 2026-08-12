// POST { pin, on } — फक्त बरोबर PIN (Vercel env var ABHISHEK_PIN) दिला तरच चालू/बंद बदलतं.
const { redis } = require("./_redis");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST वापरा" });
    return;
  }
  if (!redis) {
    console.error("abhishek-toggle: redis client null — KV_REST_API_URL/TOKEN (किंवा UPSTASH_REDIS_REST_URL/TOKEN) env vars सापडले नाहीत");
    res.status(500).json({ error: "सर्व्हर सेटअप अजून पूर्ण नाही (Redis जोडलेलं नाही)" });
    return;
  }
  const pin = process.env.ABHISHEK_PIN;
  if (!pin) {
    console.error("abhishek-toggle: process.env.ABHISHEK_PIN रिकामं/undefined आहे");
    res.status(500).json({ error: "सर्व्हर सेटअप अजून पूर्ण नाही (ABHISHEK_PIN)" });
    return;
  }
  const body = req.body || {};
  if (body.pin !== pin) {
    res.status(401).json({ error: "चुकीचा पिन" });
    return;
  }
  const on = body.on === true;
  try {
    await redis.set("abhishek_on", on);
  } catch (e) {
    console.error("abhishek-toggle: redis.set अयशस्वी —", e && e.message);
    res.status(500).json({ error: "Redis मध्ये लिहिता आलं नाही" });
    return;
  }
  res.status(200).json({ on });
};
