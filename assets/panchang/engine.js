/* ============================================================
   panchangEngine — सूर्योदयाधारित पंचांग गणना (no API, offline)
   ------------------------------------------------------------
   आधार: astronomy-engine (MIT, Don Cross) — फक्त खगोलीय स्थान/उदयास्त.
   तिथी/नक्षत्र/योग/करण/मास/चंद्रकला यांची गणना इथे केली जाते.

   पद्धत (methodology):
   • तिथी  = चंद्र-सूर्य अंतर (elongation) / १२°   → अयनांश-निरपेक्ष.
   • नक्षत्र = निरयन (सायन − लाहिरी अयनांश) चंद्र-रेखांश / १३°२०'.
   • योग   = निरयन (सूर्य + चंद्र) रेखांश / १३°२०'.
   • करण   = elongation / ६°  (६० अर्धतिथी).
   • मास (अमांत) = ज्या राशीत अमावस्येच्या (मासारंभीच्या) क्षणी सूर्य असतो
                    त्यावरून नाव;  त्या चांद्रमासात संक्रांत नसल्यास 'अधिक'.
   • तिथी/नक्षत्र/योग हे सूर्योदयाच्या क्षणी घेतले जातात (उदयतिथी संकेत).

   मर्यादा README मध्ये नोंदवल्या आहेत.  मूल्य विश्वसनीय नसल्यास ते वगळले
   जाते — चुकीचे धार्मिक-दिनदर्शिका मूल्य कधीही दाखवले जात नाही.
   ============================================================ */
(function () {
  "use strict";
  window.KT = window.KT || {};
  var A = window.Astronomy;
  var CFG = (window.KT && window.KT.PanchangConfig) || {};

  var LAT = CFG.latitude, LON = CFG.longitude, ELEV = CFG.elevation || 0;
  var TZ = CFG.tzOffsetMinutes || 330;
  var DAYMS = 86400000;

  var norm = function (x) { return ((x % 360) + 360) % 360; };
  var jd = function (d) { return d.getTime() / DAYMS + 2440587.5; };
  // लाहिरी अयनांश — रेखीय मॉडेल (~50.29"/वर्ष, संदर्भ J2000.0)
  var ayan = function (d) { return 23.8531 + 0.013969 * ((jd(d) - 2451545.0) / 365.25); };

  var TITHI_STEP = 12, NAK_STEP = 360 / 27, YOGA_STEP = 360 / 27, KARANA_STEP = 6;

  function istMidnight(y, mo, d) { return new Date(Date.UTC(y, mo, d) - TZ * 60000); }
  function istPartsOf(date) {
    var t = new Date(date.getTime() + TZ * 60000);
    return { y: t.getUTCFullYear(), mo: t.getUTCMonth(), d: t.getUTCDate(),
      h: t.getUTCHours(), wd: t.getUTCDay() };
  }
  function obs() { return new A.Observer(LAT, LON, ELEV); }
  function riseSet(body, dir, start) {
    var r = A.SearchRiseSet(body, obs(), dir, start, 1);
    return r ? r.date : null;
  }

  function sidMoonLon(t) { return norm(A.EclipticGeoMoon(t).lon - ayan(t)); }
  function sidSunLon(t) { return norm(A.SunPosition(t).elon - ayan(t)); }

  // fn(date)->deg वाढते असताना target ओलांडण्याची वेळ (bisection)
  function crossTime(fn, start, target, maxDays) {
    var a = start.getTime();
    var g = function (ms) { return ((fn(new Date(ms)) - target + 540) % 360) - 180; };
    var dt = 0.02 * DAYMS, ga = g(a), lo = a, hi = null;
    for (var ms = a + dt; ms <= a + maxDays * DAYMS; ms += dt) {
      var gm = g(ms);
      if (ga <= 0 && gm > 0) { lo = ms - dt; hi = ms; break; }
      ga = gm;
    }
    if (hi === null) return null;
    for (var i = 0; i < 42; i++) {
      var mid = (lo + hi) / 2;
      if (g(mid) > 0) hi = mid; else lo = mid;
    }
    return new Date((lo + hi) / 2);
  }

  function tithiNumAt(t) { return Math.floor(A.MoonPhase(t) / TITHI_STEP) + 1; }

  // अमांत मास : सूर्योदय-क्षणाशी संबंधित चांद्रमास [P,N)
  function masaAt(ref) {
    var nm = [], c = A.SearchMoonPhase(0, new Date(ref.getTime() - 40 * DAYMS), 45);
    while (c) {
      nm.push(c.date);
      if (c.date.getTime() > ref.getTime() + 45 * DAYMS) break;
      c = A.SearchMoonPhase(0, new Date(c.date.getTime() + 2 * DAYMS), 45);
      if (nm.length > 6) break;
    }
    var P = null, N = null;
    for (var i = 0; i < nm.length; i++) {
      if (nm[i].getTime() <= ref.getTime()) P = nm[i]; else { N = nm[i]; break; }
    }
    var MONTH = ["वैशाख", "ज्येष्ठ", "आषाढ", "श्रावण", "भाद्रपद", "आश्विन",
      "कार्तिक", "मार्गशीर्ष", "पौष", "माघ", "फाल्गुन", "चैत्र"];
    if (!P || !N) return { name: null, adhik: false };
    var rP = Math.floor(sidSunLon(new Date(P.getTime() + 1000)) / 30);
    var rN = Math.floor(sidSunLon(new Date(N.getTime() - 1000)) / 30);
    if (rP !== rN) return { name: MONTH[rP], adhik: false };
    return { name: MONTH[rP], adhik: true };  // संक्रांत नाही → अधिक मास
  }

  // पाच कालखंडाचे क्षण (सूर्योदय-सूर्यास्त-रात्र)
  function kaalInstants(sr, ss, nextSr) {
    var day = ss - sr;
    var night = nextSr ? (nextSr - ss) : (12 * 3600000);
    return {
      sunrise: sr,
      madhyahna: new Date(sr.getTime() + 0.5 * day),
      aparahna: new Date(sr.getTime() + 0.7 * day),
      pradosh: new Date(ss.getTime() + 0.10 * night),
      nishita: new Date(ss.getTime() + 0.5 * night)
    };
  }

  function compute(inputDate) {
    if (!A) return { ok: false, reason: "astronomy-unavailable" };
    try {
      var ip = istPartsOf(inputDate || new Date());
      var t0 = istMidnight(ip.y, ip.mo, ip.d);          // आजची IST मध्यरात्र
      var dayEnd = new Date(t0.getTime() + DAYMS);

      var sunrise = riseSet(A.Body.Sun, +1, t0);
      var sunset = riseSet(A.Body.Sun, -1, sunrise || t0);
      var moonrise = riseSet(A.Body.Moon, +1, t0);
      var moonset = riseSet(A.Body.Moon, -1, t0);
      var nextSr = sunset ? riseSet(A.Body.Sun, +1, new Date(sunset.getTime() + 3600000)) : null;
      var ref = sunrise || new Date(t0.getTime() + 6 * 3600000);

      // ---- तिथी (उदय) ----
      var phase = A.MoonPhase(ref);
      var tIdx = Math.floor(phase / TITHI_STEP);        // 0..29
      var tithiNum = tIdx + 1;
      var paksha = tithiNum <= 15 ? "shukla" : "krishna";
      var teAstro = A.SearchMoonPhase(((tIdx + 1) * TITHI_STEP) % 360, ref, 2);
      var tithiEnd = teAstro ? teAstro.date : null;
      var nextTithi = null;
      if (tithiEnd && tithiEnd < dayEnd) {
        var nn = (tithiNum % 30) + 1;
        nextTithi = { num: nn };
      }

      // ---- नक्षत्र (निरयन चंद्र) ----
      var sm = sidMoonLon(ref);
      var nIdx = Math.floor(sm / NAK_STEP);
      var nakEnd = crossTime(sidMoonLon, ref, ((nIdx + 1) * NAK_STEP) % 360, 2);

      // ---- योग (निरयन सूर्य+चंद्र) ----
      var yogaFn = function (t) { return norm(sidSunLon(t) + sidMoonLon(t)); };
      var yIdx = Math.floor(yogaFn(ref) / YOGA_STEP);
      var yogaEnd = crossTime(yogaFn, ref, ((yIdx + 1) * YOGA_STEP) % 360, 2);

      // ---- करण ----
      var kIdx = Math.floor(phase / KARANA_STEP);       // 0..59
      var keAstro = A.SearchMoonPhase(((kIdx + 1) * KARANA_STEP) % 360, ref, 1);
      var karanaEnd = keAstro ? keAstro.date : null;

      // ---- मास ----
      var masa = masaAt(ref);

      // ---- चंद्रकला ----
      var illum = A.Illumination(A.Body.Moon, ref);

      // ---- कालखंड-तिथी (सण-नियमांसाठी) ----
      var K = (sunrise && sunset) ? kaalInstants(sunrise, sunset, nextSr) : null;
      var kaalTithi = null;
      if (K) {
        kaalTithi = {
          sunrise: tithiNumAt(K.sunrise),
          madhyahna: tithiNumAt(K.madhyahna),
          aparahna: tithiNumAt(K.aparahna),
          pradosh: tithiNumAt(K.pradosh),
          nishita: tithiNumAt(K.nishita)
        };
      }

      // ---- संक्रांत (सौर) : आज सूर्य नवीन राशीत जातो का? ----
      var makarSankranti = false, sankrantiRashi = null;
      if (sunrise) {
        var rNow = Math.floor(sidSunLon(sunrise) / 30);
        var rTom = Math.floor(sidSunLon(new Date(sunrise.getTime() + DAYMS)) / 30);
        if (rNow !== rTom) {
          sankrantiRashi = rTom;
          // संक्रमणाचा क्षण सूर्यास्तापूर्वी असल्यास आजचाच दिवस
          var trans = crossTime(sidSunLon, sunrise, (rTom * 30) % 360, 1.2);
          if (rTom === 9 && trans && sunset && trans <= sunset) makarSankranti = true; // मकर
        }
      }

      // ---- निरीक्षणे (observances) — विश्वसनीय गणनेवरूनच ----
      var moonriseTithi = moonrise ? tithiNumAt(moonrise) : null;

      // 'वृद्धी' (एकच तिथी सलग दोन सूर्योदयांना/चंद्रोदयांना) मुळे व्रत-बॅज सलग दोन
      // दिवस दिसू नये — म्हणून प्रत्येक निरीक्षण त्याच्या 'run' च्या पहिल्या दिवशीच
      // दाखवतो (मागील दिवसाच्या संदर्भ-तिथीशी तुलना करून).
      var prevT0 = new Date(t0.getTime() - DAYMS);
      var pSr = riseSet(A.Body.Sun, +1, prevT0);
      var prevSrTithi = pSr ? tithiNumAt(pSr) : -1;
      var pMr = riseSet(A.Body.Moon, +1, prevT0);
      var prevMoonriseTithi = pMr ? tithiNumAt(pMr) : -1;
      var prevPradoshTithi = -1;
      if (pSr) {
        var pSs = riseSet(A.Body.Sun, -1, pSr);
        if (pSs) {
          var pNextSr = riseSet(A.Body.Sun, +1, new Date(pSs.getTime() + 3600000));
          var pNight = pNextSr ? (pNextSr - pSs) : (12 * 3600000);
          prevPradoshTithi = tithiNumAt(new Date(pSs.getTime() + 0.10 * pNight));
        }
      }
      var firstOfRun = function (x) { return tithiNum === x && prevSrTithi !== x; };
      var pradoshTithi = kaalTithi ? kaalTithi.pradosh : null;

      var flags = {
        amavasya: firstOfRun(30),
        purnima: firstOfRun(15),
        ekadashi: firstOfRun(11) || firstOfRun(26),
        chaturthiShukla: firstOfRun(4),
        chaturthiKrishna: tithiNum === 19,   // (अंतर्गत; बॅज नाही)
        // प्रदोष : त्रयोदशी प्रदोषकाळी (वृद्धी असल्यास पहिलाच दिवस)
        pradosh: !!(pradoshTithi && (pradoshTithi === 13 || pradoshTithi === 28) && prevPradoshTithi !== pradoshTithi),
        // संकष्टी : कृष्ण चतुर्थी चंद्रोदयी (वृद्धी असल्यास पहिलाच दिवस)
        sankashti: (moonriseTithi === 19 && prevMoonriseTithi !== 19),
        makarSankranti: makarSankranti
      };

      return {
        ok: true,
        ref: ref,
        istParts: ip,
        weekdayIndex: ip.wd,
        gregorian: new Date(Date.UTC(ip.y, ip.mo, ip.d, 6, 0, 0)),
        sunrise: sunrise, sunset: sunset, moonrise: moonrise, moonset: moonset,
        tithi: { num: tithiNum, paksha: paksha, endTime: tithiEnd, next: nextTithi },
        nakshatra: { num: nIdx + 1, endTime: nakEnd },
        yoga: { num: yIdx + 1, endTime: yogaEnd },
        karana: { index: kIdx, endTime: karanaEnd },
        masa: masa,
        moon: {
          illumFraction: illum.phase_fraction,
          phaseAngle: phase,          // 0=अमावस्या,90,180=पौर्णिमा,270
          waxing: phase < 180         // वाढता (शुक्ल) / घटता (कृष्ण)
        },
        kaalTithi: kaalTithi,
        sankrantiRashi: sankrantiRashi,
        flags: flags
      };
    } catch (e) {
      try { console.error("[panchang] compute failed:", e); } catch (_) {}
      return { ok: false, reason: "compute-error", error: e };
    }
  }

  window.KT.PanchangEngine = { compute: compute, _internal: { ayan: ayan, masaAt: masaAt } };
})();
