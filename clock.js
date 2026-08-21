function colorScheme(h) {
  var l = darkMode ? 70 : 30;
  return "hsl(" + h + ", 30%, " + l + "%)";
}
function pad(n) { return padStartFn(n.toString(), 2, '0'); } // Uses padStartFn from common.js

function generatePolygonPath(svg, path, level) {
  getTime();
  var pathStr = ["M50,50 "];
  for (var i = 0; i <= time[level]; i++) {
    var theta = i / sides[level] * 2 * Math.PI;
    var x = 50 + 50 * Math.sin(theta), y = 50 - 50 * Math.cos(theta);
    pathStr.push("L" + x.toFixed(0) + "," + y.toFixed(0));
  }
  path.setAttribute("d", pathStr.join(" ") + " Z");
  path.setAttribute("fill", colorScheme(hue));
}

function maskPolygon(svg, path, level) {
  path.removeAttribute("mask");
  // Old browsers (the same ones that miss aspect-ratio support) have been
  // seen to fail to resolve a dynamically-created <mask> element and hide
  // the masked shape entirely instead of ignoring the mask. Skip masking
  // there so the polygon stays visible; it just loses the thin decorative
  // notch line at the current position.
  if (reducedAnimation) return;
  var mask = svg.querySelector("#line" + level), maskLine;
  if (!mask) {
    var oldDefs = svg.querySelector("defs");
    if (oldDefs) svg.removeChild(oldDefs);
    var defs = document.createElementNS(svgNS, "defs");
    mask = document.createElementNS(svgNS, "mask");
    mask.setAttribute("id", "line" + level); mask.setAttribute("maskUnits", "userSpaceOnUse");
    var rect = document.createElementNS(svgNS, "path");
    rect.setAttribute("d", "M0 0 H100 V100 H0 Z"); rect.setAttribute("fill", "white");
    mask.appendChild(rect);
    maskLine = document.createElementNS(svgNS, "path");
    maskLine.setAttribute("stroke", "black"); maskLine.setAttribute("fill", "none");
    mask.appendChild(maskLine);
    defs.appendChild(mask); svg.insertBefore(defs, svg.firstChild);
  } else { maskLine = mask.querySelector("path[stroke='black']"); }
  var d = "";
  for (var i = 1; i <= sides[level]; i++) {
    var theta = (i + time[level]) / sides[level] * 2 * Math.PI;
    var x = 50 + 50 * Math.sin(theta), y = 50 - 50 * Math.cos(theta);
    d += "M50 50 L" + x.toFixed(0) + " " + y.toFixed(0) + " ";
  }
  maskLine.setAttribute("d", d.trim());
  path.setAttribute("mask", "url(#line" + level + ")");
}

function generateBlobPath(blo, wavMin, wavMax) {
  getTime();
  var radius = 250, points = 50, variation = 150, path = [], r = [], r2 = [];
  for(var i=0; i<=points; i++) { r.push(radius); r2.push(radius); }
  var x1, y1;
  for (var h = wavMin; h <= wavMax; h++) {
    var amp = variation / (h + 1), phase = timeFracs[h - 1] * 2 * Math.PI;
    for (var i = 0; i <= points; i++) {
      var theta = i / points * 2 * Math.PI;
      r[i] += amp * Math.cos((h + 1) * theta - phase);
      var thet2 = (i - .3) / points * 2 * Math.PI;
      r2[i] += amp * Math.cos((h + 1) * thet2 - phase);
    }
  }
  for (var i = 0; i <= points; i++) {
    var theta = i / points * 2 * Math.PI;
    var x = 500 + r[i] * Math.sin(theta), y = 500 - r[i] * Math.cos(theta);
    var thet2 = (i - .3) / points * 2 * Math.PI;
    var x2 = 500 + r2[i] * Math.sin(thet2), y2 = 500 - r2[i] * Math.cos(thet2);
    if (i === 0) { path.push("M " + x.toFixed(0) + "," + y.toFixed(0)); x1 = 2 * x - x2; y1 = 2 * y - y2; }
    else if (i === 1) { path.push("C " + x1.toFixed(0) + "," + y1.toFixed(0) + " " + x2.toFixed(0) + "," + y2.toFixed(0) + " " + x.toFixed(0) + "," + y.toFixed(0)); }
    else { path.push("S " + x2.toFixed(0) + "," + y2.toFixed(0) + " " + x.toFixed(0) + "," + y.toFixed(0)); }
  }
  blo.setAttribute("d", path.join(" ") + " Z");
  blo.setAttribute("fill", colorScheme(hue));
  scheduleFrame(function() { generateBlobPath(blo, wavMin, wavMax); }, 300);
}

function updateTimeStr() {
  getTime();
  document.getElementById("timeStr").textContent = year + " " + monthStr + " " + date + " " + weekday + " " + pad(hour) + ":" + pad(minute) + ":" + pad(second);
  var tzSpans = document.querySelectorAll("span.timeZone");
  for (var i = 0; i < tzSpans.length; i++) { tzSpans[i].textContent = timeZoneName; }
}

function drawBinaryClock(svg) {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  var path = document.createElementNS(svgNS, "path"), d = "";
  for (var i = 0; i < 31; i++) { if (binary[i] === '1') { d += "M" + i + ",0 h1 v1 h-1 Z "; } }
  path.setAttribute("d", d.trim()); path.setAttribute("fill", colorScheme(hue));
  svg.appendChild(path);
}

function createStickFigure(svgNS, size, raise) {
  size = size || 1; raise = raise || 0;
  var g = document.createElementNS(svgNS, "g");
  var head = document.createElementNS(svgNS, "circle");
  head.setAttribute("cx", 0); head.setAttribute("cy", raise + size); head.setAttribute("r", (.2 * size).toFixed(0));
  head.setAttribute("fill", "none"); head.setAttribute("stroke", "currentColor");
  g.appendChild(head);
  var p = document.createElementNS(svgNS, "path");
  var yH = raise + 0.5 * size, yW = raise + 0.8 * size, yAT = raise + 0.6 * size, yAB = raise + 0.95 * size, yF = raise;
  var d = "M 0 " + yH.toFixed(0) + " L 0 " + yW.toFixed(0) + " M -" + (0.4 * size).toFixed(0) + " " + yAB.toFixed(0) + " L 0 " + yAT.toFixed(0) + " L " + (0.4 * size).toFixed(0) + " " + yAB.toFixed(0) + " M -" + (0.2 * size).toFixed(0) + " " + yF.toFixed(0) + " L 0 " + yH.toFixed(0) + " L " + (0.2 * size).toFixed(0) + " " + yF.toFixed(0);
  p.setAttribute("d", d); p.setAttribute("stroke", "currentColor"); p.setAttribute("fill", "none");
  g.appendChild(p); return g;
}

function describeLitHemisphere(r, angle) {
  var x0 = r * Math.cos(angle + Math.PI / 2), y0 = r * Math.sin(angle + Math.PI / 2);
  var x1 = r * Math.cos(angle - Math.PI / 2), y1 = r * Math.sin(angle - Math.PI / 2);
  return "M " + x0.toFixed(3) + "," + y0.toFixed(3) + " A " + r.toFixed(0) + "," + r.toFixed(0) + " 0 0,1 " + x1.toFixed(3) + "," + y1.toFixed(3) + " L 0,0 Z";
}

function CelestialBody(opts) {
  this.name = opts.name; this.radius = opts.radius; this.orbitR = opts.orbitR;
  this.orbitalPeriod = opts.orbitalPeriod; this.orbitStartTime = opts.orbitStartTime;
  this.orbits = opts.orbits; this.svg = opts.svg; this.tilt = opts.tilt; this.w = opts.w;
  this.group = document.createElementNS(svgNS, "g");
  this.outline = document.createElementNS(svgNS, "circle");
  this.outline.setAttribute("r", this.radius);
  this.group.appendChild(this.outline);

  if (this.orbits) {
    this.outline.setAttribute("fill", "hsl(" + hue + ", 30%, 20%)");
    this.lit = document.createElementNS(svgNS, "path");
    this.lit.setAttribute("fill", "hsl(" + hue + ", 30%, 80%)");
    this.group.appendChild(this.lit);
  } else {
    this.outline.setAttribute("stroke", "currentColor"); this.outline.setAttribute("fill", "none");
    if (this.svg) {
      var defs = document.createElementNS(svgNS, "defs");
      this.svg.insertBefore(defs, this.svg.firstChild);
      var maskId = "orbit";
      var orbitMask = document.createElementNS(svgNS, "mask");
      orbitMask.setAttribute("id", maskId);
      var maskBg = document.createElementNS(svgNS, "rect");
      maskBg.setAttribute("x", 0); maskBg.setAttribute("y", 0);
      maskBg.setAttribute("width", this.w); maskBg.setAttribute("height", this.w);
      maskBg.setAttribute("fill", "black");
      orbitMask.appendChild(maskBg);
      var maskCircle = document.createElementNS(svgNS, "circle");
      maskCircle.setAttribute("cx", .5 * this.w); maskCircle.setAttribute("cy", .5 * this.w);
      maskCircle.setAttribute("r", this.orbitR); maskCircle.setAttribute("fill", "white");
      orbitMask.appendChild(maskCircle);
      defs.appendChild(orbitMask);
      for (var i = -3; i <= 3; i++) {
        var y = 0.5 * this.w + this.orbitR * i * 10 / this.tilt, h = this.orbitR * 10 / this.tilt;
        var d = "M0," + y.toFixed(0) + " h" + this.w + " v" + h.toFixed(0) + " h-" + this.w + " Z";
        var path = document.createElementNS(svgNS, "path");
        path.setAttribute("d", d); path.setAttribute("fill", "hsl(" + hue + ", 30%, " + (50 - 10 * i) + "%)");
        path.setAttribute("mask", "url(#" + maskId + ")");
        this.svg.appendChild(path);
      }
    }
  }
  if (this.svg) this.svg.appendChild(this.group);
}

CelestialBody.prototype.updateOrbits = function(solTime) {
  var cx = this.orbits ? this.orbits.x : this.w / 2;
  var cy = this.orbits ? this.orbits.y : this.w / 2;
  var parentAngle = this.orbits ? this.orbits.angle : 0;
  this.angle = parentAngle - 2 * Math.PI * (solTime - this.orbitStartTime) / 24 / 60 / 60 / 1000 / this.orbitalPeriod;
  this.x = cx + this.orbitR * Math.sin(this.angle);
  this.y = cy - this.orbitR * Math.cos(this.angle);
  this.group.setAttribute("transform", "translate(" + this.x.toFixed(3) + ", " + this.y.toFixed(3) + ")");
  if (this.lit && this.orbits) {
    var dx = this.orbits.x - this.w / 2, dy = this.orbits.y - this.w / 2;
    var sunAngle = Math.atan2(dy, dx);
    this.lit.setAttribute("d", describeLitHemisphere(this.radius, sunAngle));
  }
};

function formatDateTime(ms) {
  var d = new Date(ms);
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

var pathsWithMinMax = document.querySelectorAll("path[data-min][data-max]");
for (var i = 0; i < pathsWithMinMax.length; i++) {
  var path = pathsWithMinMax[i];
  var svg = path.parentNode;
  while (svg && svg.tagName !== 'svg') svg = svg.parentNode; // closest polyfill
  if (svg) svg.setAttribute("viewBox", "0 0 1000 1000");
  var min = parseInt(path.getAttribute("data-min"), 10), max = parseInt(path.getAttribute("data-max"), 10);
  generateBlobPath(path, min, max);
}

var polySvgs = document.querySelectorAll("svg.poly");
for (var i = 0; i < polySvgs.length; i++) {
  var svg = polySvgs[i], path = svg.querySelector("path");
  var level = parseInt(path.getAttribute("data-level"), 10);
  maskPolygon(svg, path, level); generatePolygonPath(svg, path, level);
  svg.setAttribute("viewBox", "0 0 100 100");
  setInterval(function() { maskPolygon(svg, path, level); }, 1000);
  setInterval(function() { generatePolygonPath(svg, path, level); }, 1000);
}

setInterval(function() {
  getTime();
  var spans = document.querySelectorAll("span[data-level]");
  for (var i = 0; i < spans.length; i++) { 
    var level = parseInt(spans[i].getAttribute("data-level"), 10);
    spans[i].textContent = " (" + time[level] + ")";
  }
}, 1000);

if (document.getElementById("timeStr")) { updateTimeStr(); setInterval(updateTimeStr, 1000); }

var binaryClocks = document.querySelectorAll("svg.binaryClock");
for (var i = 0; i < binaryClocks.length; i++) {
  drawBinaryClock(binaryClocks[i]);
  binaryClocks[i].setAttribute("viewBox", "0 0 31 1");
  setInterval(function(svg) { return function() { drawBinaryClock(svg); }; }(binaryClocks[i]), 1000);
}

var svgSolar = document.querySelector("svg.solar"), svgLunar = document.querySelector("svg.lunar");

if (svgSolar || svgLunar) {
  var w = 500;
  if (svgSolar) svgSolar.setAttribute("viewBox", "0 0 " + w + " " + w);
  var phases = ['full', 'waxing gibbous', "in its first quarter", 'a waxing crescent', 'new', 'a waning crescent', "in its last quarter", 'waning gibbous'];
  var zodiac = ['♈︎', '♉︎', '♊︎', '♋︎', '♌︎', '♍︎', '♎︎', '♏︎', '♐︎', '♑︎', '♒︎', '♓︎'];
  var zodiacName = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  var zodiacGroup = document.createElementNS(svgNS, "g");
  zodiacGroup.setAttribute("class", "zodiac");
  if (svgSolar) svgSolar.appendChild(zodiacGroup);

  var earth = new CelestialBody({ name: "Earth", radius: .04 * w, orbitR: .3 * w, orbitalPeriod: 365.256, orbitStartTime: Date.UTC(2025, 5, 21, 2, 42), orbits: null, svg: svgSolar, tilt: 23.44, w: w });
  var moon = new CelestialBody({ name: "Moon", radius: .03 * w, orbitR: .17 * w, orbitalPeriod: 29.531, orbitStartTime: Date.UTC(2025, 7, 9, 7, 54), orbits: earth, svg: svgSolar, tilt: 0, w: w });

  for (var i = 0; i < zodiac.length; i++) {
    var angle = -((i + 3.5) * 2 * Math.PI / 12);
    var x = .5 * w + .47 * w * Math.sin(angle), y = .5 * w - .47 * w * Math.cos(angle);
    var text = document.createElementNS(svgNS, "text");
    text.setAttribute("x", x.toFixed(0)); text.setAttribute("y", y.toFixed(0)); text.textContent = zodiac[i];
    zodiacGroup.appendChild(text);
  }

  var getZodiacFromDate = function(date) {
    var month = date.getMonth() + 1, day = date.getDate();
    if ((month == 3 && day >= 21) || (month == 4 && day <= 19)) return 0;
    if ((month == 4 && day >= 20) || (month == 5 && day <= 20)) return 1;
    if ((month == 5 && day >= 21) || (month == 6 && day <= 20)) return 2;
    if ((month == 6 && day >= 21) || (month == 7 && day <= 22)) return 3;
    if ((month == 7 && day >= 23) || (month == 8 && day <= 22)) return 4;
    if ((month == 8 && day >= 23) || (month == 9 && day <= 22)) return 5;
    if ((month == 9 && day >= 23) || (month == 10 && day <= 22)) return 6;
    if ((month == 10 && day >= 23) || (month == 11 && day <= 21)) return 7;
    if ((month == 11 && day >= 22) || (month == 12 && day <= 21)) return 8;
    if ((month == 12 && day >= 22) || (month == 1 && day <= 19)) return 9;
    if ((month == 1 && day >= 20) || (month == 2 && day <= 18)) return 10;
    if ((month == 2 && day >= 19) || (month == 3 && day <= 20)) return 11;
    return 0;
  };

  var sun = document.createElementNS(svgNS, "circle");
  sun.setAttribute("fill", "white"); sun.setAttribute("transform", "translate(" + (.5 * w) + ", " + (.5 * w) + ")");
  sun.setAttribute("r", .06 * w);
  if (svgSolar) svgSolar.appendChild(sun);

  if (svgLunar) svgLunar.setAttribute("viewBox", "0 0 " + (.8 * w) + " " + w);
  var darkSide = document.createElementNS(svgNS, "circle");
  darkSide.setAttribute("cx", (.4 * w).toFixed(0)); darkSide.setAttribute("cy", (w / 2).toFixed(0));
  darkSide.setAttribute("r", earth.orbitR.toFixed(0)); darkSide.setAttribute("fill", "hsl(" + hue + ", 30%, 20%)");
  if (svgLunar) svgLunar.appendChild(darkSide);
  
  var lightSide = document.createElementNS(svgNS, "path");
  lightSide.setAttribute("fill", "hsl(" + hue + ", 30%, 80%)");
  if (svgLunar) svgLunar.appendChild(lightSide);

  var stickFigure = createStickFigure(svgNS, .3 * moon.orbitR, earth.radius);
  if (svgSolar) svgSolar.appendChild(stickFigure);
  
  var datetimeInput = document.getElementById("datetime");
  var playPauseBtn = document.querySelector(".playPauseBtn");

  var updateSolar = function(solTime) {
    earth.updateOrbits(solTime); moon.updateOrbits(solTime);
    var angle = (earth.angle * 180 / Math.PI + 180 - 360 * solTime / 24 / 60 / 60 / 1000) % 360;
    stickFigure.setAttribute("transform", "translate(" + earth.x.toFixed(1) + ", " + earth.y.toFixed(1) + ") rotate(" + angle.toFixed(2) + ")");
    if (datetimeInput) datetimeInput.value = formatDateTime(solTime);
    var tiltSpans = document.querySelectorAll("span.tilt");
    for (var i = 0; i < tiltSpans.length; i++) tiltSpans[i].textContent = (earth.tilt * Math.cos(earth.angle)).toFixed(1);
    var j = getZodiacFromDate(new Date(solTime));
    var czSpans = document.querySelectorAll("span.currentZodiac");
    for (var i = 0; i < czSpans.length; i++) czSpans[i].textContent = zodiacName[j] + ' ' + zodiac[j];
    var i_val = ((((moon.angle - earth.angle) * 4 / Math.PI + 0.5) % 8) + 8) % 8;
    var mpSpans = document.querySelectorAll("span.moonPhase");
    for (var i = 0; i < mpSpans.length; i++) mpSpans[i].textContent = phases[Math.floor(i_val)];
    var waxing = Math.sin(moon.angle - earth.angle) >= 0 ? 1 : 0;
    var crescentVal = Math.cos(moon.angle - earth.angle);
    var leftTerminator = crescentVal * Math.sin(moon.angle - earth.angle) >= 0 ? 1 : 0;
    var innerR = Math.abs(crescentVal * earth.orbitR);
    lightSide.setAttribute("d", "M " + (.4 * w).toFixed(0) + " " + (w / 2 + earth.orbitR).toFixed(0) + "A " + innerR.toFixed(1) + " " + earth.orbitR.toFixed(0) + " 0 0 " + leftTerminator + " " + (.4 * w).toFixed(0) + " " + (w / 2 - earth.orbitR).toFixed(0) + "A " + earth.orbitR.toFixed(0) + " " + earth.orbitR.toFixed(0) + " 0 0 " + waxing + " " + (.4 * w).toFixed(0) + " " + (w / 2 + earth.orbitR).toFixed(0));
  };

  var solTime = Date.now(), playing = false, animationId = null;
  updateSolar(solTime);

  // Simulated minutes advanced per redraw, scaled so the clock covers the
  // same simulated time per real second whether redrawing at 60fps or, on
  // old/e-ink browsers, once every couple of seconds via scheduleFrame.
  var simMsPerRedraw = 1000 * 60 * 20 * (FRAME_MS / (1000 / 60));

  var animationStep = function() {
    if (playing) {
      solTime += simMsPerRedraw;
      updateSolar(solTime);
      animationId = scheduleFrame(animationStep);
    }
  };

  var stopAnimation = function() {
    if (window.cancelAnimationFrame) window.cancelAnimationFrame(animationId);
    clearTimeout(animationId);
  };

  if (playPauseBtn) {
    playPauseBtn.addEventListener("click", function() {
      playing = !playing;
      playPauseBtn.innerHTML = playing ? "&#9208; Pause" : "&#9654; Play";
      if (playing) { animationId = scheduleFrame(animationStep); }
      else { stopAnimation(); }
    });
    if (datetimeInput) {
      datetimeInput.addEventListener("input", function() {
        playing = false;
        stopAnimation();
        playPauseBtn.innerHTML = "&#9654; Play";
        var newTime = new Date(datetimeInput.value).getTime();
        if (!isNaN(newTime)) { solTime = newTime; updateSolar(solTime); }
      });
      datetimeInput.addEventListener("focus", function() {
        playing = false;
        stopAnimation();
        playPauseBtn.innerHTML = "&#9654; Play";
      });
    }
  }
}
