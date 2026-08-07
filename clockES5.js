// --- Helper Functions for PW2 Engine Compatibility ---

function pad(n) {
  return (n < 10 ? '0' : '') + n;
}

function createArrayFilled(size, val) {
  var arr = [];
  for (var i = 0; i < size; i++) {
    arr[i] = val;
  }
  return arr;
}

function getClosestSVG(el) {
  while (el && el !== document) {
    if (el.nodeName && el.nodeName.toLowerCase() === 'svg') {
      return el;
    }
    el = el.parentNode;
  }
  return null;
}

// --- Main Application Functions ---

var colorScheme = function(hue) {
  var lightness = darkMode ? 70 : 30;
  return "hsl(" + hue + ", 30%, " + lightness + "%)";
};

var generatePolygonPath = function(svg, path, level) {
  getTime();
  var pathStr = ["M50,50 "];
  for (var i = 0; i <= time[level]; i++) {
    var theta = (i / sides[level]) * 2 * Math.PI;
    var x = 50 + 50 * Math.sin(theta);
    var y = 50 - 50 * Math.cos(theta);
    pathStr.push("L" + x.toFixed(0) + "," + y.toFixed(0));
  }
  path.setAttribute("d", pathStr.join(" ") + " Z");
  path.setAttribute("fill", colorScheme(hue));
};

var maskPolygon = function(svg, path, level) {
  path.removeAttribute("mask");

  var mask = svg.querySelector("#line" + level);
  var maskLine;

  if (!mask) {
    var oldDefs = svg.querySelector("defs");
    if (oldDefs) svg.removeChild(oldDefs);

    var defs = document.createElementNS(svgNS, "defs");
    mask = document.createElementNS(svgNS, "mask");
    mask.setAttribute("id", "line" + level);
    mask.setAttribute("maskUnits", "userSpaceOnUse");

    var rect = document.createElementNS(svgNS, "path");
    rect.setAttribute("d", "M0 0 H100 V100 H0 Z");
    rect.setAttribute("fill", "white");
    mask.appendChild(rect);

    maskLine = document.createElementNS(svgNS, "path");
    maskLine.setAttribute("stroke", "black");
    maskLine.setAttribute("fill", "none");
    mask.appendChild(maskLine);

    defs.appendChild(mask);
    svg.insertBefore(defs, svg.firstChild);
  } else {
    maskLine = mask.querySelector("path[stroke='black']");
  }

  var d = "";
  for (var i = 1; i <= sides[level]; i++) {
    var theta = ((i + time[level]) / sides[level]) * 2 * Math.PI;
    var x = 50 + 50 * Math.sin(theta);
    var y = 50 - 50 * Math.cos(theta);
    d += "M50 50 L" + x.toFixed(0) + " " + y.toFixed(0) + " ";
  }
  maskLine.setAttribute("d", d.replace(/^\s+|\s+$/g, ''));
  path.setAttribute("mask", "url(#line" + level + ")");
};

var generateBlobPath = function(blo, wavMin, wavMax) {
  getTime();
  var radius = 250;
  var points = 50;
  var variation = 150;
  var path = [];
  var r = createArrayFilled(points + 1, radius);
  var r2 = createArrayFilled(points + 1, radius);

  var x1, y1;

  for (var h = wavMin; h <= wavMax; h++) {
    var amp = variation / (h + 1);
    var phase = timeFracs[h - 1] * 2 * Math.PI;
    for (var i = 0; i <= points; i++) {
      var theta = (i / points) * 2 * Math.PI;
      r[i] += amp * Math.cos((h + 1) * theta - phase);
      var thet2 = ((i - 0.3) / points) * 2 * Math.PI;
      r2[i] += amp * Math.cos((h + 1) * thet2 - phase);
    }
  }

  for (var j = 0; j <= points; j++) {
    var angleTheta = (j / points) * 2 * Math.PI;
    var x = 500 + r[j] * Math.sin(angleTheta);
    var y = 500 - r[j] * Math.cos(angleTheta);
    var angleThet2 = ((j - 0.3) / points) * 2 * Math.PI;
    var x2 = 500 + r2[j] * Math.sin(angleThet2);
    var y2 = 500 - r2[j] * Math.cos(angleThet2);

    if (j === 0) {
      path.push("M " + x.toFixed(0) + "," + y.toFixed(0));
      x1 = 2 * x - x2;
      y1 = 2 * y - y2;
    } else if (j === 1) {
      path.push("C " + x1.toFixed(0) + "," + y1.toFixed(0) + " " + x2.toFixed(0) + "," + y2.toFixed(0) + " " + x.toFixed(0) + "," + y.toFixed(0));
    } else {
      path.push("S " + x2.toFixed(0) + "," + y2.toFixed(0) + " " + x.toFixed(0) + "," + y.toFixed(0));
    }
  }
  blo.setAttribute("d", path.join(" ") + " Z");
  blo.setAttribute("fill", colorScheme(hue));
};

var updateTimeStr = function() {
  getTime();
  document.getElementById("timeStr").textContent = year + " " + monthStr + " " + date + " " + weekday + " " + pad(hour) + ":" + pad(minute) + ":" + pad(second);
  
  var timeZoneSpans = document.querySelectorAll("span.timeZone");
  for (var i = 0; i < timeZoneSpans.length; i++) {
    timeZoneSpans[i].textContent = "" + timeZoneName;
  }
};

var drawBinaryClock = function(svg) {
  svg.innerHTML = '';
  var path = document.createElementNS(svgNS, "path");
  var d = "";
  for (var i = 0; i < 31; i++) {
    if (binary[i] === '1') {
      d += "M" + i + ",0 h1 v1 h-1 Z ";
    }
  }
  path.setAttribute("d", d.replace(/^\s+|\s+$/g, ''));
  path.setAttribute("fill", colorScheme(hue));
  svg.appendChild(path);
};

var createStickFigure = function(svgNS, size, raise) {
  if (size === undefined) size = 1;
  if (raise === undefined) raise = 0;

  var g = document.createElementNS(svgNS, "g");
  var head = document.createElementNS(svgNS, "circle");
  head.setAttribute("cx", 0);
  head.setAttribute("cy", raise + size);
  head.setAttribute("r", (0.2 * size).toFixed(0));
  head.setAttribute("fill", "none");
  head.setAttribute("stroke", "currentColor");
  g.appendChild(head);

  var p = document.createElementNS(svgNS, "path");
  var yHead = raise + 0.5 * size;
  var yWaist = raise + 0.8 * size;
  var yArmTop = raise + 0.6 * size;
  var yArmBottom = raise + 0.95 * size;
  var yFoot = raise;

  var d = (
    "M 0 " + yHead.toFixed(0) + " L 0 " + yWaist.toFixed(0) + " " +
    "M -" + (0.4 * size).toFixed(0) + " " + yArmBottom.toFixed(0) + " L 0 " + yArmTop.toFixed(0) + " L " + (0.4 * size).toFixed(0) + " " + yArmBottom.toFixed(0) + " " +
    "M -" + (0.2 * size).toFixed(0) + " " + yFoot.toFixed(0) + " L 0 " + yHead.toFixed(0) + " L " + (0.2 * size).toFixed(0) + " " + yFoot.toFixed(0)
  );

  p.setAttribute("d", d.replace(/\s+/g, " "));
  p.setAttribute("stroke", "currentColor");
  p.setAttribute("fill", "none");
  g.appendChild(p);
  return g;
};

var describeLitHemisphere = function(r, angle) {
  var x0 = r * Math.cos(angle + Math.PI / 2);
  var y0 = r * Math.sin(angle + Math.PI / 2);
  var x1 = r * Math.cos(angle - Math.PI / 2);
  var y1 = r * Math.sin(angle - Math.PI / 2);
  return "M " + x0.toFixed(3) + "," + y0.toFixed(3) + " A " + r.toFixed(0) + "," + r.toFixed(0) + " 0 0,1 " + x1.toFixed(3) + "," + y1.toFixed(3) + " L 0,0 Z";
};

// ES5 Constructor Function replacing ES6 Class
function CelestialBody(opts) {
  this.name = opts.name;
  this.radius = opts.radius;
  this.orbitR = opts.orbitR;
  this.orbitalPeriod = opts.orbitalPeriod;
  this.orbitStartTime = opts.orbitStartTime;
  this.orbits = opts.orbits;
  this.svg = opts.svg;
  this.tilt = opts.tilt;
  this.w = opts.w;

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
    this.outline.setAttribute("stroke", "currentColor");
    this.outline.setAttribute("fill", "none");
    if (this.svg) {
      var defs = this.svg.insertBefore(document.createElementNS(svgNS, "defs"), this.svg.firstChild);
      var maskId = "orbit";
      defs.innerHTML = (
        '<mask id="' + maskId + '">' +
          '<rect x="0" y="0" width="' + this.w + '" height="' + this.w + '" fill="black"/>' +
          '<circle cx="' + (0.5 * this.w) + '" cy="' + (0.5 * this.w) + '" r="' + this.orbitR + '" fill="white"/>' +
        '</mask>'
      );
      for (var i = -3; i <= 3; i++) {
        var y = 0.5 * this.w + (this.orbitR * i * 10) / this.tilt;
        var h = (this.orbitR * 10) / this.tilt;
        var d = "M0," + y.toFixed(0) + " h" + this.w + " v" + h.toFixed(0) + " h-" + this.w + " Z";
        var path = document.createElementNS(svgNS, "path");
        path.setAttribute("d", d);
        path.setAttribute("fill", "hsl(" + hue + ", 30%, " + (50 - 10 * i) + "%)");
        path.setAttribute("mask", "url(#" + maskId + ")");
        this.svg.appendChild(path);
      }
    }
  }

  if (this.svg) {
    this.svg.appendChild(this.group);
  }
}

CelestialBody.prototype.updateOrbits = function(solTime) {
  var cx = this.orbits ? this.orbits.x : this.w / 2;
  var cy = this.orbits ? this.orbits.y : this.w / 2;
  var parentAngle = this.orbits ? this.orbits.angle : 0;
  this.angle = parentAngle - (2 * Math.PI * (solTime - this.orbitStartTime)) / 24 / 60 / 60 / 1000 / this.orbitalPeriod;
  this.x = cx + this.orbitR * Math.sin(this.angle);
  this.y = cy - this.orbitR * Math.cos(this.angle);
  this.group.setAttribute("transform", "translate(" + this.x.toFixed(3) + ", " + this.y.toFixed(3) + ")");

  if (this.lit && this.orbits) {
    var dx = this.orbits.x - this.w / 2;
    var dy = this.orbits.y - this.w / 2;
    var sunAngle = Math.atan2(dy, dx);
    var r = this.radius;
    var pathStr = describeLitHemisphere(r, sunAngle);
    this.lit.setAttribute("d", pathStr);
  }
};

var formatDateTime = function(ms) {
  var d = new Date(ms);
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
};

// --- Initialization Logic ---

var blobPaths = document.querySelectorAll("path[data-min][data-max]");
for (var b = 0; b < blobPaths.length; b++) {
  var bPath = blobPaths[b];
  var bSvg = getClosestSVG(bPath);
  if (bSvg) bSvg.setAttribute("viewBox", "0 0 1000 1000");
  var minVal = parseInt(bPath.getAttribute("data-min"), 10);
  var maxVal = parseInt(bPath.getAttribute("data-max"), 10);
  generateBlobPath(bPath, minVal, maxVal);
}

var polySvgs = document.querySelectorAll("svg.poly");
for (var p = 0; p < polySvgs.length; p++) {
  (function(svg) {
    var path = svg.querySelector("path");
    var level = parseInt(path.getAttribute("data-level"), 10);
    maskPolygon(svg, path, level);
    generatePolygonPath(svg, path, level);
    svg.setAttribute("viewBox", "0 0 100 100");
    setInterval(function() { maskPolygon(svg, path, level); }, 1000);
    setInterval(function() { generatePolygonPath(svg, path, level); }, 1000);
  })(polySvgs[p]);
}

setInterval(function() {
  getTime();
  var spans = document.querySelectorAll("span[data-level]");
  for (var s = 0; s < spans.length; s++) {
    var level = parseInt(spans[s].getAttribute("data-level"), 10);
    spans[s].textContent = " (" + time[level] + ")";
  }
}, 1000);

if (document.getElementById("timeStr")) {
  updateTimeStr();
  setInterval(updateTimeStr, 1000);
}

var binarySvgs = document.querySelectorAll("svg.binaryClock");
for (var c = 0; c < binarySvgs.length; c++) {
  (function(svg) {
    drawBinaryClock(svg);
    svg.setAttribute("viewBox", "0 0 31 1");
    setInterval(function() { drawBinaryClock(svg); }, 1000);
  })(binarySvgs[c]);
}

var svgSolar = document.querySelector("svg.solar");
var svgLunar = document.querySelector("svg.lunar");

if (svgSolar || svgLunar) {
  var w = 500;
  if (svgSolar) svgSolar.setAttribute("viewBox", "0 0 " + w + " " + w);

  var phases = ['full', 'waxing gibbous', "in its first quarter", 'a waxing crescent', 'new', 'a waning crescent', "in its last quarter", 'waning gibbous'];
  var zodiac = ['\u2648\uFE0E', '\u2649\uFE0E', '\u264A\uFE0E', '\u264B\uFE0E', '\u264C\uFE0E', '\u264D\uFE0E', '\u264E\uFE0E', '\u264F\uFE0E', '\u2650\uFE0E', '\u2651\uFE0E', '\u2652\uFE0E', '\u2653\uFE0E'];
  var zodiacName = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  
  var zodiacGroup = document.createElementNS(svgNS, "g");
  zodiacGroup.setAttribute("class", "zodiac");
  if (svgSolar) svgSolar.appendChild(zodiacGroup);

  var earth = new CelestialBody({
    name: "Earth",
    radius: 0.04 * w,
    orbitR: 0.3 * w,
    orbitalPeriod: 365.256,
    orbitStartTime: Date.UTC(2025, 5, 21, 2, 42),
    orbits: null,
    svg: svgSolar,
    tilt: 23.44,
    w: w
  });

  var moon = new CelestialBody({
    name: "Moon",
    radius: 0.03 * w,
    orbitR: 0.17 * w,
    orbitalPeriod: 29.531,
    orbitStartTime: Date.UTC(2025, 7, 9, 7, 54),
    orbits: earth,
    svg: svgSolar,
    tilt: 0,
    w: w
  });

  for (var z = 0; z < zodiac.length; z++) {
    var angle = -(z + 3.5) * 2 * Math.PI / 12;
    var zx = 0.5 * w + 0.47 * w * Math.sin(angle);
    var zy = 0.5 * w - 0.47 * w * Math.cos(angle);
    var textNode = document.createElementNS(svgNS, "text");
    textNode.setAttribute("x", zx.toFixed(0));
    textNode.setAttribute("y", zy.toFixed(0));
    textNode.textContent = zodiac[z];
    zodiacGroup.appendChild(textNode);
  }

  var getZodiacFromDate = function(date) {
    var month = date.getMonth() + 1;
    var day = date.getDate();
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
  sun.setAttribute("fill", "white");
  sun.setAttribute("transform", "translate(" + (0.5 * w) + ", " + (0.5 * w) + ")");
  sun.setAttribute("r", 0.06 * w);
  if (svgSolar) svgSolar.appendChild(sun);

  if (svgLunar) svgLunar.setAttribute("viewBox", "0 0 " + (0.8 * w) + " " + w);

  var darkSide = document.createElementNS(svgNS, "circle");
  darkSide.setAttribute("cx", (0.4 * w).toFixed(0));
  darkSide.setAttribute("cy", (w / 2).toFixed(0));
  darkSide.setAttribute("r", earth.orbitR.toFixed(0));
  darkSide.setAttribute("fill", "hsl(" + hue + ", 30%, 20%)");
  if (svgLunar) svgLunar.appendChild(darkSide);

  var lightSide = document.createElementNS(svgNS, "path");
  lightSide.setAttribute("fill", "hsl(" + hue + ", 30%, 80%)");
  if (svgLunar) svgLunar.appendChild(lightSide);

  var stickFigure = createStickFigure(svgNS, 0.3 * moon.orbitR, earth.radius);
  if (svgSolar) svgSolar.appendChild(stickFigure);

  var datetimeInput = document.getElementById("datetime");
  var playPauseBtn = document.querySelector(".playPauseBtn");

  var updateSolar = function(solTime) {
    earth.updateOrbits(solTime);
    moon.updateOrbits(solTime);
    var figAngle = ((earth.angle * 180 / Math.PI + 180 - (360 * solTime / 24 / 60 / 60 / 1000)) % 360);
    stickFigure.setAttribute("transform", "translate(" + earth.x.toFixed(1) + ", " + earth.y.toFixed(1) + ") rotate(" + figAngle.toFixed(2) + ")");

    if (datetimeInput) {
      datetimeInput.value = formatDateTime(solTime);
    }

    var tiltSpans = document.querySelectorAll("span.tilt");
    for (var t = 0; t < tiltSpans.length; t++) {
      tiltSpans[t].textContent = "" + (earth.tilt * Math.cos(earth.angle)).toFixed(1);
    }

    var j = getZodiacFromDate(new Date(solTime));
    var currentZodiacSpans = document.querySelectorAll("span.currentZodiac");
    for (var cz = 0; cz < currentZodiacSpans.length; cz++) {
      currentZodiacSpans[cz].textContent = zodiacName[j] + ' ' + zodiac[j];
    }

    var phaseIndex = ((((moon.angle - earth.angle) * 4 / Math.PI + 0.5) % 8) + 8) % 8;
    var moonPhaseSpans = document.querySelectorAll("span.moonPhase");
    for (var mp = 0; mp < moonPhaseSpans.length; mp++) {
      moonPhaseSpans[mp].textContent = phases[Math.floor(phaseIndex)];
    }

    var waxing = Math.sin(moon.angle - earth.angle) >= 0 ? 1 : 0;
    var crescentVal = Math.cos(moon.angle - earth.angle);
    var leftTerminator = crescentVal * Math.sin(moon.angle - earth.angle) >= 0 ? 1 : 0;

    var innerR = Math.abs(crescentVal * earth.orbitR);

    lightSide.setAttribute("d",
      "M " + (0.4 * w).toFixed(0) + " " + (w / 2 + earth.orbitR).toFixed(0) + " " +
      "A " + innerR.toFixed(1) + " " + earth.orbitR.toFixed(0) + " 0 0 " + leftTerminator + " " +
      (0.4 * w).toFixed(0) + " " + (w / 2 - earth.orbitR).toFixed(0) + " " +
      "A " + earth.orbitR.toFixed(0) + " " + earth.orbitR.toFixed(0) + " 0 0 " + waxing + " " +
      (0.4 * w).toFixed(0) + " " + (w / 2 + earth.orbitR).toFixed(0)
    );
  };

  var solTime = Date.now();
  updateSolar(solTime);
  var playing = false;
  var animationTimer = null;

  // Replaced requestAnimationFrame loop with E-ink friendly setTimeout step (1 update per second)
  var animationStep = function() {
    if (playing) {
      solTime += 1000 * 60 * 20;
      updateSolar(solTime);
      animationTimer = setTimeout(animationStep, 1000);
    }
  };

  if (playPauseBtn) {
    playPauseBtn.addEventListener("click", function() {
      playing = !playing;
      playPauseBtn.innerHTML = playing ? "&#9208; Pause" : "&#9654; Play";
      if (playing) {
        animationStep();
      } else {
        clearTimeout(animationTimer);
      }
    });

    if (datetimeInput) {
      datetimeInput.addEventListener("input", function() {
        playing = false;
        clearTimeout(animationTimer);
        playPauseBtn.innerHTML = "&#9654; Play";
        var newTime = new Date(datetimeInput.value).getTime();
        if (!isNaN(newTime)) {
          solTime = newTime;
          updateSolar(solTime);
        }
      });

      datetimeInput.addEventListener("focus", function() {
        playing = false;
        clearTimeout(animationTimer);
        playPauseBtn.innerHTML = "&#9654; Play";
      });
    }
  }
}
