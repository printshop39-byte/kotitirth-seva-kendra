// GET — सध्या अभिषेक चालू आहे का, हे कुणालाही (public) वाचता येईल असं.
// PIN इथे लागत नाही — फक्त वाचन आहे, बदल करायला /api/abhishek-toggle लागतो.
const { redis } = require("./_redis");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!redis) {
    console.error("abhishek-status: redis client null — KV_REST_API_URL/TOKEN (किंवा UPSTASH_REDIS_REST_URL/TOKEN) env vars सापडले नाहीत");
    // Redis अजून जोडलेलं नसेल तर सुरक्षित पर्याय: बंद दाखवा, पण admin पानाला कळावं म्हणून configured:false.
    res.status(200).json({ on: false, configured: false });
    return;
  }
  try {
    const on = (await redis.get("abhishek_on")) === true;
    res.status(200).json({ on, configured: true });
  } catch (e) {
    console.error("abhishek-status: redis.get अयशस्वी —", e && e.message);
    res.status(200).json({ on: false, configured: false });
  }
};
