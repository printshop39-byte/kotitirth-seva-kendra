// GET — सध्या अभिषेक चालू आहे का, हे कुणालाही (public) वाचता येईल असं.
// PIN इथे लागत नाही — फक्त वाचन आहे, बदल करायला /api/abhishek-toggle लागतो.
const { redis } = require("./_redis");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!redis) {
    // Redis अजून जोडलेलं नसेल तर सुरक्षित पर्याय: बंद दाखवा.
    res.status(200).json({ on: false });
    return;
  }
  try {
    const on = (await redis.get("abhishek_on")) === true;
    res.status(200).json({ on });
  } catch (e) {
    res.status(200).json({ on: false });
  }
};
