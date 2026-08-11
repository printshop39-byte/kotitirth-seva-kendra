/* ============================================================
   PanchangCard + FestivalNotice/Modal — जोडणी व दर्शन
   ------------------------------------------------------------
   • #panchangRoot मध्ये कार्ड तयार करते.
   • कोणतीही गणना अयशस्वी झाल्यास "आजचे पंचांग सध्या उपलब्ध नाही."
     दाखवते — बाकी साइट (विशेषतः जपमाळा) कधीही थांबत नाही.
   • चाचणीसाठी: ?panchang-date=YYYY-MM-DD  ने कोणताही दिवस पाहता येतो.
   ============================================================ */
(function () {
  "use strict";
  var KT = window.KT || {};
  var M = KT.PanchangMarathi, E = KT.PanchangEngine, FR = KT.FestivalRules,
      Moon = KT.Moon, LE = KT.LocalEvents;

  function ready(fn) {
    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  function dev(x) { return M ? M.dev(x) : String(x); }

  // चाचणी-तारीख (उपलब्ध असल्यास) अन्यथा आजची
  function targetDate() {
    try {
      var q = new URLSearchParams(location.search).get("panchang-date");
      if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) {
        var p = q.split("-").map(Number);
        return new Date(Date.UTC(p[0], p[1] - 1, p[2], 12, 0, 0) - 330 * 60000);
      }
    } catch (e) {}
    return new Date();
  }

  function hhmm12(date) {
    if (!date || !M) return "—";
    var ip = M.istParts(date), h = ip.h % 12; if (h === 0) h = 12;
    return dev(h) + ":" + dev(String(ip.mi != null ? ip.mi : new Date(date.getTime() + 330 * 60000).getUTCMinutes()).padStart(2, "0"));
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function phaseLabel(P) {
    if (P.flags.amavasya) return "अमावस्या";
    if (P.flags.purnima) return "पौर्णिमा";
    return P.moon.waxing ? "शुक्ल पक्ष · वाढता चंद्र" : "कृष्ण पक्ष · घटता चंद्र";
  }

  function endText(end, ref) {
    var s = M.formatClock(end, ref);
    return s ? s + " पर्यंत" : null;
  }

  function drow(k, v, cls) {
    if (v == null || v === "") return "";
    return '<div class="pc-drow' + (cls ? " " + cls : "") + '"><span class="k">' + esc(k) + '</span><span class="v">' + v + "</span></div>";
  }

  // राहू काळ — केंद्राच्या छापील मासिक दिनदर्शिकेतील स्थिर, वारानुसार तक्ता
  // (सूर्योदय/सूर्यास्तावरून दर दिवशी वेगळी गणना करत नाही — कॅलेंडरमध्ये
  // वर्षभर हाच एकच तक्ता छापलेला आहे). स्रोत: श्री स्वामी समर्थ सेवा व
  // आध्यात्मिक विकास मार्ग (दिंडोरी प्रणीत) मासिक कॅलेंडर, सप्टें–डिसें २०२६.
  // माहिती टॅबवरील आठवडाभराचा तक्ता व आठवण-बटण यांनाही हाच डेटा (KT.RahuKaal) वापरतो.
  var RAHU_KAAL = [
    { label:"सायं. ४:३० ते ६:००",    startH:16, startM:30, endH:18, endM:0  }, // रविवार
    { label:"सकाळी ७:३० ते ९:००",    startH:7,  startM:30, endH:9,  endM:0  }, // सोमवार
    { label:"दुपारी ३:०० ते ४:३०",   startH:15, startM:0,  endH:16, endM:30 }, // मंगळवार
    { label:"दुपारी १२:०० ते १:३०",  startH:12, startM:0,  endH:13, endM:30 }, // बुधवार
    { label:"दुपारी १:३० ते ३:००",   startH:13, startM:30, endH:15, endM:0  }, // गुरुवार
    { label:"सकाळी १०:३० ते १२:००",  startH:10, startM:30, endH:12, endM:0  }, // शुक्रवार
    { label:"सकाळी ९:०० ते १०:३०",   startH:9,  startM:0,  endH:10, endM:30 }  // शनिवार
  ];
  KT.RahuKaal = RAHU_KAAL;
  window.KT = KT;

  function buildCard(root, P, fest, localEv) {
    var pakName = M.paksha[P.tithi.paksha];
    var tithiName = M.tithiName(P.tithi.num);

    // बॅनर (badges)
    var badges = [];
    fest.major.forEach(function (m) { badges.push('<span class="pc-badge major">' + esc(m.nameMr) + "</span>"); });
    localEv.forEach(function (e) { if (e.type !== "observance") badges.push('<span class="pc-badge major">' + esc(e.titleMr) + "</span>"); });
    fest.observances.forEach(function (o) {
      badges.push('<span class="pc-badge' + (o.civic ? " civic" : "") + '">' + esc(o.label) + "</span>");
    });
    var bannerHtml = badges.length ? '<div class="pc-banner">' + badges.join("") + "</div>" : "";

    // तिथी शेवट + पुढील
    var tEnd = endText(P.tithi.endTime, P.ref);
    var nextHtml = "";
    if (P.tithi.next) nextHtml = '<span class="pc-tithi-next">त्यानंतर ' + esc(M.tithiName(P.tithi.next.num)) + "</span>";

    // सविस्तर rows
    var details = "";
    details += drow("वार", esc(M.weekday[P.weekdayIndex]));
    details += drow("पक्ष", esc(pakName));
    details += drow("मास", esc((P.masa.adhik ? "अधिक " : "") + (P.masa.name || "—")));
    details += drow("तिथी", esc(tithiName) + (tEnd ? ' <span style="font-weight:400;color:var(--shai-soft)">(' + tEnd + ")</span>" : ""));
    details += drow("नक्षत्र", esc(M.nakshatra[P.nakshatra.num - 1]) + (P.nakshatra.endTime ? ' <span style="font-weight:400;color:var(--shai-soft)">(' + endText(P.nakshatra.endTime, P.ref) + ")</span>" : ""));
    details += drow("योग", esc(M.yoga[P.yoga.num - 1]) + (P.yoga.endTime ? ' <span style="font-weight:400;color:var(--shai-soft)">(' + endText(P.yoga.endTime, P.ref) + ")</span>" : ""));
    details += drow("करण", esc(M.karanaName(P.karana.index)));
    details += drow("सूर्योदय", P.sunrise ? esc(M.formatClock(P.sunrise)) : "—");
    details += drow("सूर्यास्त", P.sunset ? esc(M.formatClock(P.sunset)) : "—");
    details += drow("राहू काळ", esc((RAHU_KAAL[P.weekdayIndex] || {}).label || "—"), "pc-warn");
    if (P.moonrise) details += drow("चंद्रोदय", esc(M.formatClock(P.moonrise)));
    if (P.moonset) details += drow("चंद्रास्त", esc(M.formatClock(P.moonset)));
    details += drow("चंद्रकला", dev(Math.round(P.moon.illumFraction * 100)) + "% प्रकाशित");

    root.innerHTML =
      bannerHtml +
      '<div class="pc-date">' + esc(M.formatGregorian(P.gregorian)) + "</div>" +
      '<div class="pc-masa">' + esc((P.masa.name || "") + (P.masa.name ? " • " : "") + pakName) + "</div>" +
      '<div class="pc-moonwrap"><div class="pc-moon-holder"></div>' +
        '<div class="pc-phaselabel">' + esc(phaseLabel(P)) + "</div></div>" +
      '<div class="pc-tithi"><b class="pc-tithi-name">' + esc(tithiName) + "</b>" +
        (tEnd ? '<span class="pc-tithi-end">' + esc(tEnd) + "</span>" : "") +
        nextHtml + "</div>" +
      '<div class="pc-suntimes">' +
        (P.sunrise ? "<span>☀️ सूर्योदय " + hhmm12(P.sunrise) + "</span>" : "") +
        (P.sunset ? "<span>🌇 सूर्यास्त " + hhmm12(P.sunset) + "</span>" : "") + "</div>" +
      '<div class="pc-nak">नक्षत्र: <b>' + esc(M.nakshatra[P.nakshatra.num - 1]) + "</b></div>" +
      '<button type="button" class="pc-expand" aria-expanded="false" aria-controls="pc-details">' +
        'सविस्तर पंचांग <span class="pc-caret" aria-hidden="true">▾</span></button>' +
      '<div class="pc-details" id="pc-details" hidden>' + details +
        '<p class="pc-note">गणना कोल्हापूरच्या स्थानानुसार · भारतीय प्रमाणवेळ · सूर्योदयाधारित तिथी.</p>' +
      "</div>";

    // चंद्र
    try {
      Moon.render(root.querySelector(".pc-moon-holder"),
        { illumFraction: P.moon.illumFraction, waxing: P.moon.waxing });
    } catch (e) { try { console.error("[panchang] moon render:", e); } catch (_) {} }

    // सविस्तर टॉगल (accessible)
    var btn = root.querySelector(".pc-expand");
    var panel = root.querySelector("#pc-details");
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", open ? "false" : "true");
      panel.hidden = open;
      btn.firstChild && (btn.childNodes[0].nodeValue = open ? "सविस्तर पंचांग " : "थोडक्यात पंचांग ");
    });
  }

  // ---------------- सण मोडल (focus trap + Esc) ----------------
  var lastFocus = null;
  function dismissKey(iso, id) { return "panchang.fest." + iso + "." + id; }
  function isDismissed(iso, id) { try { return localStorage.getItem(dismissKey(iso, id)) === "1"; } catch (e) { return false; } }
  function setDismissed(iso, id) { try { localStorage.setItem(dismissKey(iso, id), "1"); } catch (e) {} }

  function sevaScroll() {
    // main च्या 🏠 आज पानावर वेळापत्रकाचा id "tlToday" आहे; आरती पानावर "tl".
    var el = document.getElementById("tlToday") || document.getElementById("tl") || document.getElementById("panchang");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openModal(item, iso) {
    lastFocus = document.activeElement;
    var overlay = document.createElement("div");
    overlay.className = "pc-overlay";
    overlay.innerHTML =
      '<div class="pc-modal" role="dialog" aria-modal="true" aria-labelledby="pc-modal-title" aria-describedby="pc-modal-desc">' +
      '<button type="button" class="pc-modal-x" aria-label="बंद करा">×</button>' +
      '<div class="pc-modal-eyebrow">🙏 आज विशेष दिवस</div>' +
      '<h3 id="pc-modal-title">' + esc(item.nameMr) + "</h3>" +
      '<p id="pc-modal-desc">' + esc(item.descMr || "") + "</p>" +
      '<div class="pc-modal-acts">' +
        (item.ctaText ? '<button type="button" class="pc-btn pc-btn-primary" data-cta="1">' + esc(item.ctaText) + "</button>" : "") +
        '<button type="button" class="pc-btn pc-btn-ghost" data-close="1">बंद करा</button>' +
      "</div></div>";
    document.body.appendChild(overlay);
    document.body.classList.add("pc-modal-open");

    var modal = overlay.querySelector(".pc-modal");
    function focusables() {
      return modal.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])');
    }
    function close() {
      setDismissed(iso, item.id);
      overlay.remove();
      document.body.classList.remove("pc-modal-open");
      document.removeEventListener("keydown", onKey, true);
      if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
    }
    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key === "Tab") {
        var f = focusables(); if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener("keydown", onKey, true);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    overlay.querySelector(".pc-modal-x").addEventListener("click", close);
    var closeBtn = overlay.querySelector('[data-close="1"]');
    if (closeBtn) closeBtn.addEventListener("click", close);
    var cta = overlay.querySelector('[data-cta="1"]');
    if (cta) cta.addEventListener("click", function () { close(); if (item.ctaTarget === "seva") sevaScroll(); });

    // focus trap: पहिल्या बटणावर फोकस
    var f = focusables(); if (f.length) f[0].focus();
  }

  function maybeShowModal(fest, localEv, iso) {
    var candidates = [];
    fest.major.forEach(function (m) {
      candidates.push({ id: m.id, nameMr: m.nameMr, descMr: m.descMr,
        ctaText: "आजची सेवा पहा", ctaTarget: "seva", priority: 8 });
    });
    localEv.forEach(function (e) {
      if (e.showPopup) candidates.push({ id: "local-" + (e.date || "") + "-" + (e.titleMr || ""),
        nameMr: e.titleMr, descMr: e.descMr, ctaText: e.ctaText, ctaTarget: e.ctaTarget || "seva",
        priority: (typeof e.priority === "number" ? e.priority : 5) });
    });
    candidates = candidates.filter(function (c) { return !isDismissed(iso, c.id); });
    if (!candidates.length) return;
    candidates.sort(function (a, b) { return b.priority - a.priority; });
    var pick = candidates[0];
    // सण-मोडल फक्त welcome popup बंद झाल्यावरच दाखवा — त्यावर कधीही चढवू नका.
    // welcome खूप वेळ उघडा राहिल्यास (वापरकर्ता बंद करत नसल्यास) मोडल वगळा
    // (बॅज कार्डवर दिसतोच). यामुळे दोन modal एकावर एक कधीच येत नाहीत.
    setTimeout(function () {
      var waited = 0, MAXMS = 30000, STEP = 400;
      (function waitAndShow() {
        if (document.querySelector(".pc-overlay")) return;       // आधीच एक सण-मोडल उघडा
        if (document.querySelector(".welcome.open")) {           // welcome अजून उघडा आहे
          if (waited >= MAXMS) return;                           // इतका वेळ उघडा → वगळा (चढवू नका)
          waited += STEP; setTimeout(waitAndShow, STEP); return;
        }
        openModal(pick, iso);                                    // welcome बंद — आता सुरक्षित
      })();
    }, 550);
  }

  function init() {
    var root = document.getElementById("panchangRoot");
    if (!root) return;
    if (!E || !window.Astronomy) {
      root.innerHTML = '<p class="pc-fallback">आजचे पंचांग सध्या उपलब्ध नाही.</p>';
      return;
    }
    try {
      var when = targetDate();
      var P = E.compute(when);
      if (!P || !P.ok) {
        root.innerHTML = '<p class="pc-fallback">आजचे पंचांग सध्या उपलब्ध नाही.</p>';
        return;
      }
      var ip = P.istParts;
      var iso = ip.y + "-" + String(ip.mo + 1).padStart(2, "0") + "-" + String(ip.d).padStart(2, "0");
      var fest = FR ? FR.evaluate(P) : { major: [], observances: [] };
      var localEv = (LE && LE.forDate) ? LE.forDate(ip.y, ip.mo + 1, ip.d) : [];
      // स्थानिक "major/event" बॅजमध्ये दिसावे म्हणून observances मध्ये नको
      buildCard(root, P, fest, localEv);
      maybeShowModal(fest, localEv, iso);
    } catch (e) {
      try { console.error("[panchang] init failed:", e); } catch (_) {}
      root.innerHTML = '<p class="pc-fallback">आजचे पंचांग सध्या उपलब्ध नाही.</p>';
    }
  }

  ready(init);
})();
