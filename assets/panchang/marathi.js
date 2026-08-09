/* ============================================================
   panchangMarathi — मराठी नावे व वेळेचे स्वरूप (mapping layer)
   ------------------------------------------------------------
   सर्व मराठी मजकूर व अंक-रूपांतर इथे एकत्र.  गणनेच्या कोडात
   मराठी मजकूर विखुरलेला नाही — फक्त क्रमांक/की येतात, नाव इथून मिळते.
   ============================================================ */
(function () {
  "use strict";
  window.KT = window.KT || {};

  // ०१२३४५६७८९ — इंग्रजी अंकांचे देवनागरी रूप
  var dev = function (s) {
    return String(s).replace(/[0-9]/g, function (d) { return "०१२३४५६७८९"[+d]; });
  };

  var WEEKDAY = ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];

  var GREG_MONTH = ["जानेवारी", "फेब्रुवारी", "मार्च", "एप्रिल", "मे", "जून",
    "जुलै", "ऑगस्ट", "सप्टेंबर", "ऑक्टोबर", "नोव्हेंबर", "डिसेंबर"];

  // तिथी नावे — क्रमांक १..३० (१५ = पौर्णिमा, ३० = अमावस्या)
  var TITHI = ["प्रतिपदा", "द्वितीया", "तृतीया", "चतुर्थी", "पंचमी", "षष्ठी", "सप्तमी",
    "अष्टमी", "नवमी", "दशमी", "एकादशी", "द्वादशी", "त्रयोदशी", "चतुर्दशी"];

  var NAKSHATRA = ["अश्विनी", "भरणी", "कृत्तिका", "रोहिणी", "मृग", "आर्द्रा", "पुनर्वसु",
    "पुष्य", "आश्लेषा", "मघा", "पूर्वा फाल्गुनी", "उत्तरा फाल्गुनी", "हस्त", "चित्रा",
    "स्वाती", "विशाखा", "अनुराधा", "ज्येष्ठा", "मूळ", "पूर्वाषाढा", "उत्तराषाढा",
    "श्रवण", "धनिष्ठा", "शततारका", "पूर्वा भाद्रपदा", "उत्तरा भाद्रपदा", "रेवती"];

  var YOGA = ["विष्कंभ", "प्रीति", "आयुष्मान", "सौभाग्य", "शोभन", "अतिगंड", "सुकर्मा",
    "धृति", "शूल", "गंड", "वृद्धि", "ध्रुव", "व्याघात", "हर्षण", "वज्र", "सिद्धि",
    "व्यतीपात", "वरीयान", "परिघ", "शिव", "सिद्ध", "साध्य", "शुभ", "शुक्ल",
    "ब्रह्म", "ऐंद्र", "वैधृति"];

  var KARANA_CHARA = ["बव", "बालव", "कौलव", "तैतिल", "गरज", "वणिज", "विष्टि"];
  var KARANA_STHIRA_END = ["शकुनि", "चतुष्पाद", "नाग"]; // ५७,५८,५९
  // करण index 0..59
  function karanaName(k) {
    if (k <= 0) return "किंस्तुघ्न";
    if (k >= 57) return KARANA_STHIRA_END[k - 57];
    return KARANA_CHARA[(k - 1) % 7];
  }

  function tithiName(n) {
    if (n === 15) return "पौर्णिमा";
    if (n === 30) return "अमावस्या";
    return TITHI[(n - 1) % 15];
  }

  // वेळेचा प्रहर-शब्द (तासावरून)
  function timePeriod(h) {
    if (h < 4) return "रात्री";
    if (h < 6) return "पहाटे";
    if (h < 12) return "सकाळी";
    if (h < 16) return "दुपारी";
    if (h < 20) return "सायं.";
    return "रात्री";
  }

  // IST घटक काढणे (कोणत्याही ब्राउझर-वेळक्षेत्राची पर्वा न करता)
  var TZ = 330;
  function istParts(date) {
    var t = new Date(date.getTime() + TZ * 60000);
    return {
      y: t.getUTCFullYear(), mo: t.getUTCMonth(), d: t.getUTCDate(),
      h: t.getUTCHours(), mi: t.getUTCMinutes(), wd: t.getUTCDay()
    };
  }

  // "रात्री १०:४२" स्वरूप.  refDate दिल्यास व वेगळा दिवस असल्यास "(उद्या)" जोडते.
  function formatClock(date, refDate) {
    if (!date) return null;
    var p = istParts(date);
    var h12 = p.h % 12; if (h12 === 0) h12 = 12;
    var s = timePeriod(p.h) + " " + dev(h12) + ":" + dev(String(p.mi).padStart(2, "0"));
    if (refDate) {
      var r = istParts(refDate);
      if (p.y !== r.y || p.mo !== r.mo || p.d !== r.d) s += " (उद्या)";
    }
    return s;
  }

  // "शनिवार, ८ ऑगस्ट २०२६"
  function formatGregorian(date) {
    var p = istParts(date);
    return WEEKDAY[p.wd] + ", " + dev(p.d) + " " + GREG_MONTH[p.mo] + " " + dev(p.y);
  }

  window.KT.PanchangMarathi = {
    dev: dev,
    weekday: WEEKDAY,
    gregMonth: GREG_MONTH,
    paksha: { shukla: "शुक्ल पक्ष", krishna: "कृष्ण पक्ष" },
    nakshatra: NAKSHATRA,
    yoga: YOGA,
    tithiName: tithiName,
    karanaName: karanaName,
    timePeriod: timePeriod,
    formatClock: formatClock,
    formatGregorian: formatGregorian,
    istParts: istParts
  };
})();
