/* ============================================================
   festivalRules — सण/पर्व ठरवण्याचे नियम (astronomically derived)
   ------------------------------------------------------------
   तीन स्तर वेगळे ठेवले आहेत:
     A) खगोलीय-गणित सण  (मास + तिथी + योग्य कालखंड)  — इथे.
     B) स्थिर ग्रेगोरियन दिवस (उदा. स्वातंत्र्य दिन)   — इथे (fixedGreg).
     C) केंद्राचे स्थानिक कार्यक्रम                    — assets/data/local-events.js

   प्रत्येक मोठ्या सणासाठी योग्य 'कालखंड' वापरला आहे:
     • sunrise   = उदयतिथी          (पौर्णिमा, एकादशी इ.)
     • madhyahna = मध्यान्ह          (गणेश चतुर्थी, रामनवमी)
     • aparahna  = अपराह्न           (विजयादशमी/दसरा)
     • pradosh   = प्रदोष (सूर्यास्तानंतर)  (लक्ष्मीपूजन/अमावस्या)
     • nishita   = निशिथ (मध्यरात्र)  (महाशिवरात्री)
   हे नियम २०२६ मधील प्रकाशित तारखांशी पडताळले आहेत (validation.html पाहा).

   मर्यादा: एकादशी/इतर तिथी 'क्षय' (सूर्योदय न स्पर्शणारी) असल्यास ती
   दाखवली जात नाही — चुकीचा दिवस दाखवण्यापेक्षा न दाखवणे योग्य.
   ============================================================ */
(function () {
  "use strict";
  window.KT = window.KT || {};

  // मोठे सण — मोडल (popup) योग्य
  var MAJORS = [
    { id: "makar-sankranti", solar: true, nameMr: "मकर संक्रांत",
      descMr: "सूर्य मकर राशीत प्रवेश — स्नान, दान व तिळगूळाचे पर्व. ‘तिळगूळ घ्या, गोड बोला.’" },
    { id: "mahashivratri", masa: "माघ", tithi: 29, kaal: "nishita", nameMr: "महाशिवरात्री",
      descMr: "शिवभक्तीची रात्र — उपवास व जागरण. निशिथकाळी विशेष पूजा." },
    { id: "ram-navami", masa: "चैत्र", tithi: 9, kaal: "madhyahna", nameMr: "श्रीराम नवमी",
      descMr: "प्रभू श्रीरामांचा जन्मोत्सव — मध्यान्ह जन्मकाळी विशेष सेवा." },
    { id: "hanuman-jayanti", masa: "चैत्र", tithi: 15, kaal: "sunrise", nameMr: "हनुमान जयंती",
      descMr: "श्री हनुमंतांचा जन्मोत्सव — भक्तीसेवा व दर्शन." },
    { id: "ashadhi-ekadashi", masa: "आषाढ", tithi: 11, kaal: "sunrise", nameMr: "आषाढी एकादशी",
      descMr: "पंढरपूर वारी — विठ्ठल भक्ती व उपवास." },
    { id: "guru-pournima", masa: "आषाढ", tithi: 15, kaal: "sunrise", nameMr: "गुरुपौर्णिमा",
      descMr: "गुरुपूजनाचा दिवस — सद्गुरूंच्या चरणी कृतज्ञता." },
    { id: "gokulashtami", masa: "श्रावण", tithi: 23, kaal: "sunrise", nameMr: "गोकुळाष्टमी",
      descMr: "श्रीकृष्ण जन्माष्टमी — भक्ती, कीर्तन व उपवास." },
    { id: "ganesh-chaturthi", masa: "भाद्रपद", tithi: 4, kaal: "madhyahna", nameMr: "गणेश चतुर्थी",
      descMr: "श्री गणेशाचे आगमन — मध्यान्ह पूजनाचा शुभकाळ." },
    { id: "dasara", masa: "आश्विन", tithi: 10, kaal: "aparahna", nameMr: "दसरा (विजयादशमी)",
      descMr: "विजयाचा सण — सीमोल्लंघन व शस्त्र/ग्रंथ पूजन (अपराह्नकाळ)." },
    { id: "lakshmi-pujan", masa: "आश्विन", tithi: 30, kaal: "pradosh", nameMr: "लक्ष्मीपूजन (दिवाळी)",
      descMr: "प्रदोषकाळी श्री लक्ष्मीपूजन — दीपोत्सवाचा मंगलदिन." },
    { id: "kartiki-ekadashi", masa: "कार्तिक", tithi: 11, kaal: "sunrise", nameMr: "कार्तिकी एकादशी",
      descMr: "प्रबोधिनी एकादशी — विठ्ठल भक्ती व उपवास." }
  ];

  // स्थिर ग्रेगोरियन दिवस (राष्ट्रीय) — फक्त सूचना (badge), मोडल नाही
  var FIXED_GREG = [
    { id: "independence-day", month: 8, day: 15, nameMr: "स्वातंत्र्य दिन" },
    { id: "republic-day", month: 1, day: 26, nameMr: "प्रजासत्ताक दिन" },
    { id: "gandhi-jayanti", month: 10, day: 2, nameMr: "गांधी जयंती" }
  ];

  // छोटी निरीक्षणे → badge/banner (मोडल नाही)
  var OBSERVANCE_LABEL = {
    ekadashi: "एकादशी",
    pradosh: "प्रदोष",
    sankashti: "संकष्टी चतुर्थी",
    amavasya: "अमावस्या",
    purnima: "पौर्णिमा",
    chaturthiShukla: "विनायक चतुर्थी"
  };

  function evaluate(P) {
    var out = { major: [], observances: [] };
    if (!P || !P.ok) return out;

    // ---- मोठे सण ----
    for (var i = 0; i < MAJORS.length; i++) {
      var m = MAJORS[i];
      var hit = false;
      if (m.solar) {
        hit = (m.id === "makar-sankranti") && P.flags.makarSankranti;
      } else if (!P.masa.adhik && P.masa.name === m.masa && P.kaalTithi) {
        hit = P.kaalTithi[m.kaal] === m.tithi;
      }
      if (hit) out.major.push(m);
    }

    // कोणती निरीक्षणे मोठ्या सणाने आधीच कव्हर झाली ती वगळा
    var suppress = {};
    out.major.forEach(function (m) {
      if (m.tithi === 30 || m.id === "lakshmi-pujan") suppress.amavasya = true;
      if (m.tithi === 15) suppress.purnima = true;
      if (m.tithi === 11) suppress.ekadashi = true;
    });

    // ---- निरीक्षणे ----
    var f = P.flags;
    ["amavasya", "purnima", "ekadashi", "sankashti", "pradosh", "chaturthiShukla"].forEach(function (key) {
      if (f[key] && !suppress[key]) out.observances.push({ id: key, label: OBSERVANCE_LABEL[key] });
    });

    // ---- स्थिर ग्रेगोरियन ----
    var ip = P.istParts;
    FIXED_GREG.forEach(function (g) {
      if (g.month === ip.mo + 1 && g.day === ip.d) {
        out.observances.push({ id: g.id, label: g.nameMr, civic: true });
      }
    });

    return out;
  }

  window.KT.FestivalRules = { evaluate: evaluate, majors: MAJORS, fixedGreg: FIXED_GREG };
})();
