/* ============================================================
   MoonPhase — आजच्या प्रत्यक्ष चंद्रकलेचे SVG चित्र
   ------------------------------------------------------------
   illumFraction (०..१) व waxing (वाढता/घटता) यावरून प्रकाशित भाग
   अचूक दाखवतो.  खोटी लूप-ॲनिमेशन नाही; फक्त लोड होताना सौम्य
   ४००–७००ms रिव्हील.  prefers-reduced-motion असल्यास ॲनिमेशन नाही
   (साइटच्या विद्यमान reduced-motion नियमामुळे आपोआप बंद).
   ============================================================ */
(function () {
  "use strict";
  window.KT = window.KT || {};
  var NS = "http://www.w3.org/2000/svg";

  // प्रकाशित भागाचा path — parametric polygon (arc-flag गोंधळ टाळण्यासाठी).
  // उत्तर गोलार्ध संकेत: वाढता (शुक्ल) चंद्र → उजवीकडे प्रकाश;
  // घटता (कृष्ण) चंद्र → डावीकडे प्रकाश.
  // बाह्य अर्धवर्तुळ (प्रकाशित कड) + terminator अर्ध-लंबवर्तुळ (x-त्रिज्या = R(1−2f)).
  function litPath(R, f, waxing) {
    f = Math.max(0, Math.min(1, f));
    if (f <= 0.005) return "";                 // अमावस्या — काहीच प्रकाशित नाही
    if (f >= 0.995) {                           // पौर्णिमा — पूर्ण वर्तुळ
      return "M0," + (-R) + " A " + R + "," + R + " 0 1 1 0," + R +
             " A " + R + "," + R + " 0 1 1 0," + (-R) + " Z";
    }
    var xr = R * (1 - 2 * f), N = 48, pts = [], i, t, x;
    for (i = 0; i <= N; i++) { t = Math.PI * i / N; pts.push([R * Math.sin(t), -R * Math.cos(t)]); }
    for (i = 0; i <= N; i++) { t = Math.PI * i / N; pts.push([xr * Math.sin(t), R * Math.cos(t)]); }
    if (!waxing) { for (i = 0; i < pts.length; i++) pts[i][0] = -pts[i][0]; }
    var d = "M";
    for (i = 0; i < pts.length; i++) {
      x = pts[i];
      d += (i ? "L" : "") + x[0].toFixed(2) + "," + x[1].toFixed(2) + " ";
    }
    return d + "Z";
  }

  function el(name, attrs) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) n.setAttribute(k, attrs[k]);
    return n;
  }

  // container मध्ये चंद्र काढतो
  function render(container, opts) {
    opts = opts || {};
    var f = typeof opts.illumFraction === "number" ? opts.illumFraction : 0;
    var waxing = !!opts.waxing;
    var size = opts.size || 132;
    var R = 46, CX = 60, CY = 60, VB = 120;
    var uid = "pcmoon" + Math.floor(Math.random() * 1e6);

    var svg = el("svg", {
      viewBox: "0 0 " + VB + " " + VB, width: size, height: size,
      class: "pc-moon", role: "img", focusable: "false"
    });
    svg.setAttribute("aria-hidden", "true");

    var defs = el("defs", {});
    // प्रकाशित पृष्ठाचा सौम्य ग्रेडियंट
    var g1 = el("radialGradient", { id: uid + "-lit", cx: "42%", cy: "38%", r: "72%" });
    g1.appendChild(el("stop", { offset: "0%", "stop-color": "#FFFDF2" }));
    g1.appendChild(el("stop", { offset: "62%", "stop-color": "#F6E7BE" }));
    g1.appendChild(el("stop", { offset: "100%", "stop-color": "#E6C97F" }));
    defs.appendChild(g1);
    // छायाभाग (रात्रीचा निळसर)
    var g2 = el("radialGradient", { id: uid + "-dark", cx: "50%", cy: "50%", r: "70%" });
    g2.appendChild(el("stop", { offset: "0%", "stop-color": "#2A2F52" }));
    g2.appendChild(el("stop", { offset: "100%", "stop-color": "#1C1F3B" }));
    defs.appendChild(g2);
    svg.appendChild(defs);

    var grp = el("g", { transform: "translate(" + CX + "," + CY + ")" });

    // छायाडिस्क (नेहमी)
    grp.appendChild(el("circle", { r: R, fill: "url(#" + uid + "-dark)" }));

    // प्रकाशित भाग
    var d = litPath(R, f, waxing);
    if (d) {
      var lit = el("path", { d: d, fill: "url(#" + uid + "-lit)", class: "pc-moon-lit" });
      grp.appendChild(lit);
    }

    // सौम्य विवरे (craters) — फक्त सजावट
    var craters = [[-14, -8, 5], [10, 6, 6.5], [-4, 16, 3.5], [16, -14, 3]];
    craters.forEach(function (c) {
      grp.appendChild(el("circle", { cx: c[0], cy: c[1], r: c[2],
        fill: "#000", "fill-opacity": "0.06" }));
    });

    // बाह्य कड
    grp.appendChild(el("circle", { r: R, fill: "none",
      stroke: "rgba(140,29,43,.20)", "stroke-width": "1" }));

    svg.appendChild(grp);
    container.innerHTML = "";
    container.appendChild(svg);

    // सौम्य रिव्हील (reduced-motion असल्यास साइटच्या CSS मुळे लगेच)
    svg.classList.add("pc-moon-enter");
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { svg.classList.add("pc-moon-in"); });
    });
    return svg;
  }

  window.KT.Moon = { render: render, litPath: litPath };
})();
