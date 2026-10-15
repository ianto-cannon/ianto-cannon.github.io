// Coldle: guess the mystery peak. peaks.csv columns: name,height,prominence,parent,lat,lon,range,country.
// map.svg is a Lambert cylindrical equal-area projection (x = longitude, y = sin latitude).
// ES5 translation, with a top-N selector (default 50; #125, #37, … in the URL).
(function () {

function $(s) { return document.querySelector(s); }

var MAX_GUESSES = 8;
var MAX_ZOOM = 150;
var RAD = Math.PI / 180;
var DEFAULT_COUNT = 50;
var CHART_ASPECT = 3.142;   // matches #chart { aspect-ratio } in coldle.css
var COARSE = !!(window.matchMedia && matchMedia("(pointer: coarse)").matches);

/* ------------------------------------------------ old-browser helpers */
// SVG elements have no classList or string className in old WebKit, so use the class attribute.
function removeClass(el, c) {
  var cls = " " + (el.getAttribute("class") || "") + " ";
  el.setAttribute("class", cls.replace(" " + c + " ", " ").replace(/^\s+|\s+$/g, ""));
}
function addClass(el, c) {
  removeClass(el, c);
  el.setAttribute("class", ((el.getAttribute("class") || "") + " " + c).replace(/^\s+/, ""));
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function metres(m) { return m.toLocaleString() + " m"; }
function colLabel(m) { return m ? metres(m) : "sea level"; }
function wikiLink(p) {
  return p.wiki
    ? '<a href="https://www.wikidata.org/wiki/Special:GoToLinkedPage/enwiki/' + p.wiki + '"><b>' + p.name + "</b></a>"
    : "<b>" + p.name + "</b>";
}
function getJSON(url, cb) {
  if (window.fetch) {
    fetch(url).then(function (r) { return r.json(); }).then(cb, function () { cb(null); });
  } else {
    var x = new XMLHttpRequest();
    x.onreadystatechange = function () {
      if (x.readyState !== 4) return;
      var j = null;
      try { j = x.status === 200 ? JSON.parse(x.responseText) : null; } catch (e) {}
      cb(j);
    };
    x.open("GET", url);
    x.send();
  }
}
function peakImage(p) {
  if (!p.wiki) return;
  if (p.imgUrl) {
    showPeakImage(p);
    return;
  }
  if (p.imgTried) return;
  p.imgTried = true;
  getJSON("https://www.wikidata.org/w/api.php?action=wbgetclaims&format=json&origin=*"
    + "&entity=" + p.wiki + "&property=P18", function (j) {
    var c = j && j.claims && j.claims.P18 && j.claims.P18[0];
    var v = c && c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value;
    if (typeof v !== "string") return;
    p.imgFile = v;
    commonsThumb(p);
  });
}
function commonsThumb(p) {
  getJSON("https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*"
    + "&prop=imageinfo&iiprop=url&iiurlwidth=480&titles=File:" + encodeURIComponent(p.imgFile),
    function (j) {
      var pages = j && j.query && j.query.pages;
      var page;
      for (var id in pages) { page = pages[id]; break; }
      var ii = page && page.imageinfo && page.imageinfo[0];
      if (!ii || !ii.thumburl) return;
      p.imgUrl = ii.thumburl;
      // Prefetch the bytes so the photo shows instantly when the round ends.
      (new Image()).src = p.imgUrl;
      showPeakImage(p);
    });
}
function showPeakImage(p) {
  var box = $("#peak-image");
  if (!box || !over() || box.getAttribute("data-img") === p.imgUrl) return;
  clearPeakImage();
  box.setAttribute("data-img", p.imgUrl);
  var a = document.createElement("a");
  a.href = "https://commons.wikimedia.org/wiki/File:" + encodeURIComponent(p.imgFile);
  var img = document.createElement("img");
  img.alt = p.name;
  img.onerror = clearPeakImage;
  img.src = p.imgUrl;
  a.appendChild(img);
  box.appendChild(a);
}
function clearPeakImage() {
  var box = $("#peak-image");
  if (!box) return;
  box.removeAttribute("data-img");
  var a = box.querySelector("a");
  if (a) box.removeChild(a);
}
function pt(x, y) { return x.toFixed(1) + "," + y.toFixed(1); }
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
// Old WebKit has no innerHTML on SVG elements, so parse the markup and import the nodes.
function setSvg(el, markup) {
  while (el.firstChild) el.removeChild(el.firstChild);
  var doc = new DOMParser().parseFromString(
    '<svg xmlns="http://www.w3.org/2000/svg">' + markup + "</svg>", "image/svg+xml");
  for (var n = doc.documentElement.firstChild; n; n = n.nextSibling) {
    el.appendChild(document.importNode(n, true));
  }
}
function isoDate() {
  var d = new Date();
  return d.getUTCFullYear() + "-" + ("0" + (d.getUTCMonth() + 1)).slice(-2) + "-" + ("0" + d.getUTCDate()).slice(-2);
}
function fontPx() { return parseFloat(getComputedStyle(document.body).fontSize); }
function colGuess(pct, alpha) {
  if (alpha === undefined) alpha = 1;
  return "hsla(" + hue + ",65%," + (20 + 70 * Math.pow(pct / 100, .25)) + "%," + alpha + ")";
}
var CSV_RE = /(?:^|,)("(?:[^"]|"")*"|[^,]*)/g;
function parseCSV(text) {
  return text.replace(/^\s+|\s+$/g, "").split(/\r?\n/).map(function (line) {
    CSV_RE.lastIndex = 0;
    var fields = [];
    var m;
    while ((m = CSV_RE.exec(line)) !== null) {
      fields.push(m[1].replace(/^"|"$/g, "").replace(/""/g, '"'));
      if (m.index === CSV_RE.lastIndex) CSV_RE.lastIndex++;
    }
    return fields;
  });
}
var mode = "daily";
var allPeaks = null;
var maxCount = 125;
var count = DEFAULT_COUNT;
var peaks = [];
var target;
var guesses = [];
var selected = null;

function won()  { return guesses.indexOf(target) !== -1; }
function over() { return won() || guesses.length >= MAX_GUESSES; }

// Daily target for a game of n peaks. The game size is mixed into the hash so
// that different sizes don't share a sequence of targets.
function imul(a, b) {
  if (Math.imul) return Math.imul(a, b);
  var ah = (a >>> 16) & 0xffff, al = a & 0xffff;
  var bh = (b >>> 16) & 0xffff, bl = b & 0xffff;
  return (al * bl + (((ah * bl + al * bh) << 16) >>> 0)) | 0;
}
function dailyTarget(day, n) {
  var h = imul(day ^ imul(n, 0x9E3779B1), 2654435761) >>> 0;
  h = imul(h ^ (h >>> 15), 0x85EBCA6B) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  return h % n;
}
function newRound() {
  var day = Math.floor(Date.now() / 864e5);
  if (mode === "daily") {
    target = dailyTarget(day, peaks.length);
    // Larger games must never share the default game's mystery peak.
    if (peaks.length > DEFAULT_COUNT && target === dailyTarget(day, DEFAULT_COUNT)) {
      target = (target + 1) % peaks.length;
      if (target === dailyTarget(day, DEFAULT_COUNT)) target = (target + 1) % peaks.length;
    }
  } else {
    target = Math.floor(Math.random() * peaks.length);
  }
  guesses = [];
  selected = null;
  render();
}
function guess() {
  if (over() || selected === null || guesses.indexOf(selected) !== -1) return;
  guesses.push(selected);
  if (over() && !won()) {
    selected = target;
    ensureVisible(target);
  }
  // Fetch the mystery peak's photo once the first guess commits the player to
  // the round, so it's ready (and cached) by the time the round ends.
  if (guesses.length === 1) peakImage(peaks[target]);
  render();
  if (won()) confetti();
  else if (over()) {
    play($("#action"), "shake");
    play(document.body, darkTheme() ? "flash-dark" : "flash");
  }
}
function prefersReducedMotion() {
  return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
}
// Restart a CSS animation class on el (the old class is removed first, so no cleanup handler is needed).
function play(el, cls) {
  if (prefersReducedMotion()) return;
  removeClass(el, "flash");
  removeClass(el, "flash-dark");
  removeClass(el, "shake");
  void el.offsetWidth;
  addClass(el, cls);
}
function darkTheme() {
  return getComputedStyle(document.body).backgroundColor === "rgb(0, 0, 0)";
}
function chain(i) {
  if (i < 0) return [];
  return [i].concat(chain(peaks[i].parent));
}
function linkToTarget(g) {
  if (g === target) return { colAlt: peaks[g].height, pct: 100 };
  var a = chain(g);
  var b = chain(target);
  var meet;
  for (var i = 0; i < a.length; i++) {
    if (b.indexOf(a[i]) !== -1) { meet = a[i]; break; }
  }
  var crossed;
  if (meet === undefined) {
    crossed = a.concat(b);
  } else {
    crossed = a.slice(0, a.indexOf(meet)).concat(b.slice(0, b.indexOf(meet)));
  }
  var colAlt;
  if (crossed.length) {
    colAlt = Infinity;
    for (var j = 0; j < crossed.length; j++) {
      var c = peaks[crossed[j]].colAlt;
      if (c < colAlt) colAlt = c;
    }
  } else {
    colAlt = peaks[g].height;
  }
  return { colAlt: colAlt, pct: Math.round(100 * colAlt / peaks[target].height) };
}
function selectPeak(i, pan) {
  if (pan) ensureVisible(i);
  selected = i;
  render();
}
function render() {
  renderTable();
  drawChart();
  drawMap();
  renderStatus();
  $("#action").textContent = over() ? "share results" : "guess";
}
function renderTable() {
  var tableRows = document.querySelectorAll("#guess-table tbody tr");
  for (var i = 0; i < tableRows.length; i++) {
    var tr = tableRows[i];
    if (i < guesses.length) {
      var g = guesses[i];
      var lt = linkToTarget(g);
      tr.className = g === selected ? "selected" : "";
      tr.cells[1].innerHTML = '<a href="#" data-peak="' + g + '">' + peaks[g].name + '</a>';
      tr.cells[2].textContent = peaks[g].range;
      tr.cells[3].textContent = peaks[g].country;
      tr.cells[4].textContent = g === target ? "🎯 Correct" : colLabel(lt.colAlt);
      tr.cells[5].textContent = lt.pct + "%";
    } else {
      tr.className = "";
      tr.cells[1].innerHTML = "";
      tr.cells[2].textContent = "";
      tr.cells[3].textContent = "";
      tr.cells[4].textContent = "";
      tr.cells[5].textContent = "";
    }
  }
}
function setHidden(el, hide) {
  if (hide) el.setAttribute("hidden", "");
  else el.removeAttribute("hidden");
}
var lastStatus = "";
function renderStatus() {
  var p = peaks[target];
  var made = guesses.length;
  var end = over();
  var box = $("#status");
  var values = {
    heading: end ? "Results" : "Hints",
    height: metres(p.height),
    prominence: metres(p.prominence),
    hint3: (made >= 3 || end)
      ? "The mystery peak is in the <b>" + p.range + "</b>."
      : "The mountain range will be revealed after your <b>third</b> guess.",
    hint4: (made >= 5 || end)
      ? "The mystery peak is in <b>" + p.country + "</b>."
      : "The country will be revealed after your <b>fifth</b> guess.",
    tip1: end
      ? (won()
          ? "Got it in " + made + "! The mystery peak is " + wikiLink(p) + "."
          : "Out of guesses. The mystery peak is " + wikiLink(p) + ".")
      : "Guess " + (made + 1) + " of " + MAX_GUESSES + ".",
    tip2: end
      ? "Select random and click reset for another peak."
      : (selected !== null && guesses.indexOf(selected) === -1
          ? "Selected <b>" + peaks[selected].name + "</b>. Press Guess to confirm."
          : (made === 0
              ? "Tap a peak on the map, then press Guess."
              : "Tap another peak on the map, then press Guess."))
  };
  setHidden(box, false);

  var els = box.querySelectorAll("[data-field]");
  for (var i = 0; i < els.length; i++) {
    els[i].textContent = values[els[i].getAttribute("data-field")];
  }
  els = box.querySelectorAll("[data-field-html]");
  for (var j = 0; j < els.length; j++) {
    els[j].innerHTML = values[els[j].getAttribute("data-field-html")];
  }

  if (!end) {
    setHidden($("#share-output"), true);
    $("#share-text").value = "";
  }
  if (end) peakImage(p);
  else clearPeakImage();

  var state = box.textContent;
  if (state === lastStatus) return;
  lastStatus = state;
  play(box, "flash");
}
function drawChart() {
  var chart = $("#chart");
  var rect = chart.getBoundingClientRect();
  // Old WebKit can report 0 for an SVG's size; fall back to clientWidth /
  // parent width, and derive the height from the CSS aspect ratio.
  var viewW = rect.width || chart.clientWidth || (chart.parentNode && chart.parentNode.offsetWidth);
  var viewH = rect.height || chart.clientHeight || viewW / CHART_ASPECT;
  if (!viewW || !viewH) return;
  var key = [viewW, viewH, fontPx(), target,
             guesses.join(), selected, over(), peaks.length].join();
  if (key === chart.getAttribute("data-cache-key")) return;
  chart.setAttribute("data-cache-key", key);

  // One user unit == one CSS pixel, so sizes only need to be read once.
  var font = fontPx();

  var axisR = 3 * .6 * font + 2;
  var x0 = axisR + 3;
  var x1 = viewW;
  var plotL = x0 + 8;
  var cx = plotL + .93 * (x1 - plotL);
  var wgMax = (x1 - plotL) / 20;
  var W = cx - plotL - .3 * (x1 - plotL);
  var T = peaks[target];

  var base = viewH - 1.5 * font;
  var plotH = 0.95 * base;

  function chartY(alt) { return base - alt / 10000 * plotH; }
  function text(x, y, t, cls) {
    return '<text class="' + (cls || "") + '" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '">' + t + '</text>';
  }
  function hline(y, cls) {
    return '<line' + (cls ? ' class="' + cls + '"' : "") + ' x1="' + x0.toFixed(1) + '" x2="' + x1.toFixed(1)
      + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '"/>';
  }
  function altitude(x, p) { return text(x, chartY(p.height) - 3, metres(p.height)); }
  function label(x, t, i) {
    var h = t.length * .35 * font;
    var tx = text(clamp(x, h, viewW - h), base + 1.1 * font, esc(t), i === selected ? "selected" : "");
    return i === undefined ? tx : '<a href="#" data-peak="' + i + '">' + tx + '</a>';
  }
  var out = "";
  for (var alt = 0; alt <= 10000; alt += 2000) {
    out += (alt ? hline(chartY(alt)) : "") + text(axisR, chartY(alt) + .35 * font, alt/1000+'k', "end");
  }
  var seaL = null, seaR = null;
  for (var si = 0; si < peaks.length; si++) {
    var sp = (si === target) ? { col: T.height, xg: cx, wg: W } : place(si);
    if (sp.col > 0) {
      if (seaR === null || sp.xg - sp.wg < seaR) seaR = sp.xg - sp.wg;
    } else if (seaL === null || sp.xg + sp.wg > seaL) {
      seaL = sp.xg + sp.wg;
    }
  }
  if (seaL !== null) seaL = clamp(seaL, x0, x1);
  if (seaR !== null) seaR = clamp(seaR, x0, x1);
  var hasSea = seaL !== null && seaR !== null && seaR > seaL;

  if (hasSea) {
    var waveN = Math.max(2, Math.round((seaR - seaL) / 7));
    var halfWave = (seaR - seaL) / waveN;
    var sea = "M" + pt(seaL, base) + " Q" + pt(seaL + halfWave / 2, base - 1.5) + " " + pt(seaL + halfWave, base);
    for (var wi = 2; wi <= waveN; wi++) sea += " T" + pt(seaL + wi * halfWave, base);
    out += '<a><path class="sea" d="' + sea + '"/></a>';
  }
  out += hline(chartY(T.height), "target-altitude");

  function place(g) {
    var G = peaks[g];
    var col = Math.min(linkToTarget(g).colAlt, G.height);
    var wg = wgMax * Math.min(1, G.height / T.height);
    var reach = wg * (1 - col / G.height);
    var xg = col > 0 ? cx - W * (1 - col / T.height) - reach : plotL + wg;
    return { G: G, col: col, wg: wg, reach: reach, xg: xg };
  }
  function shape(x, w, G) {
    return 'points="' + pt(x - w, base) + " " + pt(x + w, base) + " " + pt(x, chartY(G.height)) + '"';
  }
  var heights = peaks.map(function (p) { return p.height; });
  var minH = Math.min.apply(null, heights);
  var maxH = Math.max.apply(null, heights);
  function fillFor(G, colored) {
    var f = maxH > minH ? (G.height - minH) / (maxH - minH) : 1;
    return "hsl(" + (colored ? hue + ",30%" : "0,0%") + "," + (40 + 40 * f).toFixed(0) + "%)";
  }
  var order = [];
  for (var gi = 0; gi < peaks.length; gi++) if (gi !== target) order.push(gi);
  // Unguessed peaks first, so guessed peaks are drawn on top; tallest first within each group.
  order.sort(function (a, b) {
    return (guesses.indexOf(a) !== -1) - (guesses.indexOf(b) !== -1)
      || peaks[b].height - peaks[a].height;
  });
  var polys = "";
  var marks = "";
  for (var oi = 0; oi < order.length; oi++) {
    var g = order[oi];
    var pl = place(g);
    var guessed = guesses.indexOf(g) !== -1;
    var isSel = g === selected;
    polys += '<polygon' + (guessed ? (isSel ? ' class="selected"' : "") : ' class="unguessed"')
      + ' style="fill:' + fillFor(pl.G, guessed) + '" ' + shape(pl.xg, pl.wg, pl.G) + '/>';
    if (guessed && isSel) {
      marks += text(pl.xg + pl.reach + 2, chartY(pl.col) - 2, metres(pl.col), "col-altitude")
        + altitude(pl.xg, pl.G) + label(pl.xg, pl.G.name, g);
    }
  }
  polys += '<polygon class="target" style="fill:' + fillFor(T, over()) + '" ' + shape(cx, W, T) + '/>';
  var boxTop = chartY(10000);
  var boxD = "M" + pt(x0, base) + " L" + pt(x0, boxTop) + " L" + pt(x1, boxTop) + " L" + pt(x1, base);
  if (hasSea) {
    if (seaL > x0) boxD += " M" + pt(x0, base) + " L" + pt(seaL, base);
    if (seaR < x1) boxD += " M" + pt(seaR, base) + " L" + pt(x1, base);
  } else {
    boxD += " L" + pt(x0, base);
  }
  var chartBox = '<path class="chart-box" d="' + boxD + '"/>';
  out += polys + chartBox + marks + altitude(cx, T)
    + label(cx, over() ? T.name : "?", over() ? target : undefined);

  chart.setAttribute("viewBox", "0 0 " + viewW.toFixed(1) + " " + viewH.toFixed(1));
  chart.setAttribute("font-size", font.toFixed(2));
  setSvg(chart, out);
}
var raf = window.requestAnimationFrame
  || window.webkitRequestAnimationFrame
  || window.mozRequestAnimationFrame
  || function (fn) { return setTimeout(function () { fn(nowMs()); }, 16); };
var nowMs = (window.performance && window.performance.now)
  ? function () { return window.performance.now(); }
  : function () { return Date.now(); };

function confetti() {
  if (prefersReducedMotion()) return;
  var dpr = window.devicePixelRatio || 1;
  var canvas = $("#confetti");
  var ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  setHidden(canvas, false);

  var btn = $("#action").getBoundingClientRect();
  var colors = ["#0072b2", "#e69f00", "#cc79a7", "#56b4e9", "#009e73", "#f0e442"];
  var particles = [];
  for (var i = 0; i < 160; i++) {
    var angle = -Math.PI / 2 + (Math.random() - .5) * Math.PI * 1.2;
    var speed = (6 + Math.random() * 11) * dpr;
    particles.push({
      x: (btn.left + btn.width / 2) * dpr,
      y: (btn.top + btn.height / 2) * dpr,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: (6 + Math.random() * 6) * dpr,
      rot: Math.random() * 6,
      vr: (Math.random() - .5) * .4,
      color: colors[Math.random() * colors.length | 0],
      life: 0
    });
  }
  var last = nowMs();
  function tick(now) {
    if (now === undefined) now = nowMs();
    var dt = clamp((now - last) / 16.7, 0, 2);
    last = now;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var alive = 0;
    for (var j = 0; j < particles.length; j++) {
      var p = particles[j];
      p.vy += .35 * dpr * dt;
      p.vx *= .99;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.life += dt;
      if (p.y < canvas.height + 20 && p.life < 220) {
        alive++;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.min(1, (220 - p.life) / 40);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
    }
    if (alive) raf(tick);
    else {
      setHidden(canvas, true);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  raf(tick);
}
var world = { W: 40030, H: 12742, R: 6371, lon0: 0 };
var view = { x: 0, y: 0, w: 40030, h: 12742 };
var mapSvg = $("#map");

function project(lat, lon) {
  return [
    world.W / 2 + world.R * (((lon - world.lon0 + 540) % 360) - 180) * RAD,
    world.H / 2 - world.R * Math.sin(lat * RAD)
  ];
}
function injectMap() {
  var basemap = document.getElementById("basemap");
  if (!basemap || typeof MAP_SVG === "undefined") return;
  if (!window.DOMParser) return;
  var doc = new DOMParser().parseFromString(MAP_SVG, "image/svg+xml");
  var root = doc.documentElement;
  if (!root || root.nodeName === "parsererror") return;
  var next = root.firstChild;
  while (next) {
    var following = next.nextSibling;
    var node = document.importNode ? document.importNode(next, true) : next.cloneNode(true);
    basemap.appendChild(node);
    next = following;
  }
}
function load() {
  injectMap();
  var rows = parseCSV(PEAKS_CSV).slice(1).filter(function (f) { return f.length >= 8; });
  allPeaks = rows.map(function (f) {
    return {
      name: f[0],
      parent: f[3],
      range: f[6],
      country: f[7],
      wiki: f[8],
      lat: +f[4],
      lon: +f[5],
      height: +f[1],
      prominence: +f[2],
      colAlt: +f[1] - +f[2]
    };
  });
  for (var i = 0; i < allPeaks.length; i++) {
    var par = allPeaks[i].parent;
    var idx = -1;
    for (var j = 0; j < allPeaks.length; j++) {
      if (allPeaks[j].name === par) { idx = j; break; }
    }
    allPeaks[i].parent = idx;
  }
  for (var m = 0; m < allPeaks.length; m++) {
    var xy = project(allPeaks[m].lat, allPeaks[m].lon);
    allPeaks[m].x = xy[0];
    allPeaks[m].y = xy[1];
  }
  maxCount = allPeaks.length;
}
function readCount() {
  var m = /^#(\d+)$/.exec(location.hash || "");
  if (!m) return DEFAULT_COUNT;
  var n = parseInt(m[1], 10);
  if (!isFinite(n) || n < 1) return DEFAULT_COUNT;
  return Math.min(n, maxCount);
}
function writeCountHash(n) {
  var hash = (n === DEFAULT_COUNT) ? "" : "#" + n;
  var url = location.pathname + location.search + hash;
  if (location.hash === hash) return;
  if (window.history && window.history.replaceState) {
    window.history.replaceState(null, "", url);
  } else if (hash) {
    location.hash = hash;
  } else {
    location.replace(url);
  }
}
function updateCountRadios() {
  var radios = document.querySelectorAll("input[name=count]");
  for (var i = 0; i < radios.length; i++) {
    radios[i].checked = (+radios[i].value === count);
  }
}
function applyCount(n, writeHash) {
  count = clamp(Math.round(n) || DEFAULT_COUNT, 1, maxCount);
  if (writeHash) writeCountHash(count);
  updateCountRadios();
  peaks = allPeaks.slice(0, count);
  resetView();
  newRound();
}
function aspect() {
  var r = mapSvg.getBoundingClientRect();
  return r.width / (r.height || mapSvg.clientHeight || 318);
}
function minW() { return world.W / MAX_ZOOM; }
function maxW() { return Math.min(world.W, world.H * aspect()); }

function resetView() {
  panAnim = null;
  var w = maxW();
  var h = w / aspect();
  view = { x: project(0, 60)[0] - w / 2, y: (world.H - h) / 2, w: w, h: h };
  dragOutward = false;
}
function clampView() {
  view.w = clamp(view.w, minW(), maxW());
  view.h = view.w / aspect();
  view.x = clamp(view.x, 0, world.W - view.w);
  view.y = clamp(view.y, 0, world.H - view.h);
}
// Hand vertical panning back to the browser only when the view has no vertical
// range, or when the user has dragged past a limit and is still pulling outward.
function updateTouchAction() {
  var maxY = world.H - view.h;
  var hasRange = view.h < world.H - .5;
  var atLimit = view.y <= 0 || view.y >= maxY;
  if (!hasRange || (atLimit && dragOutward)) addClass(mapSvg, "pan-y");
  else removeClass(mapSvg, "pan-y");
}
function toWorld(cx, cy) {
  var r = mapSvg.getBoundingClientRect();
  return [view.x + (cx - r.left) / r.width * view.w, view.y + (cy - r.top) / r.height * view.h];
}
function zoomTo(w, wx, wy, cx, cy) {
  panAnim = null;
  var r = mapSvg.getBoundingClientRect();
  view.w = clamp(w, minW(), maxW());
  view.h = view.w / aspect();
  view.x = wx - (cx - r.left) / r.width * view.w;
  view.y = wy - (cy - r.top) / r.height * view.h;
  dragOutward = false;
  drawMap();
}
window.addEventListener("resize", function () {
  if (peaks.length) { drawMap(); drawChart(); }
}, false);
function triangle(x, y, r) {
  return pt(x, y - r) + " " + pt(x + r * .87, y + r * .5) + " " + pt(x - r * .87, y + r * .5);
}
function drawMap() {
  clampView();
  mapSvg.setAttribute("viewBox", view.x + " " + view.y + " " + view.w + " " + view.h);
  updateTouchAction();
  var px = view.w / (mapSvg.getBoundingClientRect().width || mapSvg.parentNode.offsetWidth);
  var live = !over();
  var tiers = [[], [], []];
  var labels = "";
  var top = "";

  // Greedy label placement: selected peak first, then by descending prominence.
  var fs = fontPx() * px;
  var order = [];
  for (var oi = 0; oi < peaks.length; oi++) order.push(oi);
  order.sort(function (a, b) {
    if (a === selected) return -1;
    if (b === selected) return 1;
    return peaks[b].prominence - peaks[a].prominence;
  });
  function labelDx(i) { return (i === selected ? 14 : 9) * px; }
  var markers = [];
  for (var mi = 0; mi < peaks.length; mi++) {
    var mr = (mi === selected ? 12.6 : 7) * px;
    markers.push([peaks[mi].x - .87 * mr, peaks[mi].y - mr, peaks[mi].x + .87 * mr, peaks[mi].y + .5 * mr]);
  }
  var shown = {};
  var flipped = {};
  var boxes = [];
  for (var oj = 0; oj < order.length; oj++) {
    var q = peaks[order[oj]];
    var bx0 = q.x + labelDx(order[oj]);
    var bx1 = bx0 + q.name.length * .55 * fs;
    var by0 = q.y + 4 * px - fs;
    var by1 = q.y + 4 * px + .25 * fs;
    var isSelLabel = order[oj] === selected;
    if (bx1 > world.W && isSelLabel) {
      bx1 = q.x - labelDx(order[oj]);
      bx0 = bx1 - q.name.length * .55 * fs;
      flipped[order[oj]] = true;
    }
    if (!isSelLabel && (bx0 < 0 || bx1 > world.W || by0 < 0 || by1 > world.H)) continue;
    if (bx1 < view.x || bx0 > view.x + view.w || by1 < view.y || by0 > view.y + view.h) continue;
    var clash = false;
    var obstacles = boxes.concat(markers);
    for (var bi = 0; bi < obstacles.length; bi++) {
      if (markers[order[oj]] === obstacles[bi]) continue;
      var b = obstacles[bi];
      if (bx0 < b[2] && bx1 > b[0] && by0 < b[3] && by1 > b[1]) { clash = true; break; }
    }
    if (clash && order[oj] !== selected) continue;
    boxes.push([bx0, by0, bx1, by1]);
    shown[order[oj]] = true;
  }

  for (var i = 0; i < peaks.length; i++) {
    var p = peaks[i];
    var guessed = guesses.indexOf(i) !== -1;
    var isSel = i === selected;
    var revealed = !live && i === target;
    var tap = live ? ' data-peak="' + i + '"' : "";
    var fill = revealed ? colGuess(100) : (guessed ? colGuess(linkToTarget(i).pct) : "");
    var cls = isSel ? "selected" : "";
    var shape = triangle(p.x, p.y, isSel ? 12.6 * px : 7 * px);

    var marker = '<polygon' + (cls ? ' class="' + cls + '"' : "")
      + (fill ? ' style="fill:' + fill + '"' : "") + tap
      + ' points="' + shape + '"/>';
    var label = shown[i]
      ? '<a' + tap + ' href="#"><text' + (isSel ? ' class="selected"' : "")
        + (flipped[i] ? ' text-anchor="end"' : "")
        + ' x="' + (p.x + (flipped[i] ? -1 : 1) * labelDx(i)).toFixed(1) + '" y="' + (p.y + 4 * px).toFixed(1) + '">'
        + esc(p.name) + '</text></a>'
      : "";
    if (isSel) {
      top = marker + label;
    } else {
      tiers[revealed ? 2 : guessed ? 1 : 0].push(marker);
      labels += label;
    }
  }
  var layer = $("#markers");
  layer.setAttribute("font-size", (fontPx() * px).toFixed(2));
  setSvg(layer, tiers[0].join("") + tiers[1].join("") + tiers[2].join("") + labels + top);
}
var pointers = {};
function pointerCount() {
  var n = 0;
  for (var k in pointers) if (pointers.hasOwnProperty(k)) n++;
  return n;
}
function pointerValues() {
  var arr = [];
  for (var k in pointers) if (pointers.hasOwnProperty(k)) arr.push(pointers[k]);
  return arr;
}
function closestPeak(el) {
  while (el && el.getAttribute) {
    if (el.getAttribute("data-peak") !== null) return el;
    el = el.parentNode;
  }
  return null;
}
function closestAnchor(el) {
  while (el && el.tagName) {
    if (el.tagName.toLowerCase() === "a") return el;
    el = el.parentNode;
  }
  return null;
}
var drag = null;
var pinch = null;
var dragged = false;
var dragOutward = false;

function nearestPeak(cx, cy) {
  var w = toWorld(cx, cy);
  var wx = w[0], wy = w[1];
  var reach = (COARSE ? 28 : 20) * view.w / mapSvg.getBoundingClientRect().width;
  var best = -1;
  var bestDist = reach * reach;
  for (var i = 0; i < peaks.length; i++) {
    var p = peaks[i];
    var dx = p.x - wx, dy = p.y - wy;
    var d = dx * dx + dy * dy;
    if (d < bestDist) { best = i; bestDist = d; }
  }
  return best;
}
function pinchMid() {
  var vals = pointerValues();
  var a = vals[0], b = vals[1];
  var dx = a.x - b.x, dy = a.y - b.y;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, dist: Math.sqrt(dx * dx + dy * dy) || 1 };
}
function startPinch() {
  var m = pinchMid();
  var w = toWorld(m.x, m.y);
  pinch = { dist: m.dist, w: view.w, wx: w[0], wy: w[1] };
}
function handleDown(id, cx, cy, target) {
  if (!peaks.length) return;
  panAnim = null;
  pointers[id] = { x: cx, y: cy };
  if (pointerCount() === 1) {
    var hit = closestPeak(target);
    dragged = false;
    drag = { x: cx, y: cy, vx: view.x, vy: view.y,
             hit: hit ? +hit.getAttribute("data-peak") : -1 };
  } else if (pointerCount() === 2) {
    dragged = true;
    drag = null;
    startPinch();
  }
}
function handleMove(id, cx, cy) {
  if (!pointers.hasOwnProperty(id)) return;
  pointers[id] = { x: cx, y: cy };
  if (pointerCount() >= 2 && pinch) {
    var m = pinchMid();
    zoomTo(pinch.w * pinch.dist / m.dist, pinch.wx, pinch.wy, m.x, m.y);
  } else if (drag) {
    var dx = cx - drag.x;
    var dy = cy - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) dragged = true;
    if (dragged) {
      var k = view.w / mapSvg.getBoundingClientRect().width;
      var wantY = drag.vy - dy * k;
      var maxY = world.H - view.h;
      view.x = drag.vx - dx * k;
      view.y = clamp(wantY, 0, maxY);
      if (wantY < 0) dragOutward = dy > 0;
      else if (wantY > maxY) dragOutward = dy < 0;
      else dragOutward = false;
      drawMap();
    }
  }
}
function handleUp(id, cx, cy, isCancel) {
  if (!pointers.hasOwnProperty(id)) return;
  delete pointers[id];
  if (pointerCount() === 2) {
    startPinch();
  } else if (pointerCount() === 1) {
    var vals = pointerValues();
    var p = vals[0];
    drag = { x: p.x, y: p.y, vx: view.x, vy: view.y, hit: -1 };
    pinch = null;
  } else {
    var hit = drag ? drag.hit : -1;
    drag = pinch = null;
    if (!isCancel && !dragged) {
      var i = nearestPeak(cx, cy);
      if (i < 0) i = hit;
      if (i >= 0) selectPeak(i);
    }
  }
}
if ("onpointerdown" in window) {
  mapSvg.onpointerdown = function (e) {
    if (mapSvg.setPointerCapture) {
      try { mapSvg.setPointerCapture(e.pointerId); } catch (err) {}
    }
    handleDown(e.pointerId, e.clientX, e.clientY, e.target);
  };
  mapSvg.onpointermove = function (e) {
    handleMove(e.pointerId, e.clientX, e.clientY);
  };
  mapSvg.onpointerup = function (e) {
    handleUp(e.pointerId, e.clientX, e.clientY, false);
  };
  mapSvg.onpointercancel = function (e) {
    handleUp(e.pointerId, e.clientX, e.clientY, true);
  };
} else {
  mapSvg.addEventListener("touchstart", function (e) {
    var t = e.changedTouches;
    for (var i = 0; i < t.length; i++) {
      handleDown(t[i].identifier, t[i].clientX, t[i].clientY, t[i].target || e.target);
    }
  }, false);
  mapSvg.addEventListener("touchmove", function (e) {
    var t = e.changedTouches;
    for (var i = 0; i < t.length; i++) handleMove(t[i].identifier, t[i].clientX, t[i].clientY);
    if (dragged || pointerCount() >= 2) e.preventDefault();
  }, false);
  var onTouchEnd = function (cancel) {
    return function (e) {
      var t = e.changedTouches;
      for (var i = 0; i < t.length; i++) handleUp(t[i].identifier, t[i].clientX, t[i].clientY, cancel);
      if (!cancel && e.cancelable) e.preventDefault();
    };
  };
  mapSvg.addEventListener("touchend", onTouchEnd(false), false);
  mapSvg.addEventListener("touchcancel", onTouchEnd(true), false);
  mapSvg.addEventListener("mousedown", function (e) {
    handleDown("mouse", e.clientX, e.clientY, e.target);
    e.preventDefault();
  }, false);
  document.addEventListener("mousemove", function (e) {
    handleMove("mouse", e.clientX, e.clientY);
  }, false);
  document.addEventListener("mouseup", function (e) {
    handleUp("mouse", e.clientX, e.clientY, false);
  }, false);
}
mapSvg.addEventListener("wheel", function (e) {
  if (!peaks.length) return;
  var step = e.deltaMode === 1 ? .05 : .0015;
  var w = clamp(view.w * Math.exp(clamp(e.deltaY, -100, 100) * step), minW(), maxW());
  if (Math.abs(w / view.w - 1) < 1e-9) return;
  e.preventDefault();
  var ww = toWorld(e.clientX, e.clientY);
  zoomTo(w, ww[0], ww[1], e.clientX, e.clientY);
}, false);

mapSvg.addEventListener("click", function (e) {
  if (closestAnchor(e.target)) e.preventDefault();
}, false);

function shareResult() {
  var blocks = "";
  for (var i = 0; i < guesses.length; i++) {
    blocks += "▁▂▃▄▅▆▇█".charAt(Math.round(linkToTarget(guesses[i]).pct / 100 * 7));
  }
  blocks += won() ? "🎯" : "";
  var n = guesses.length;
  var summary = won()
    ? "I guessed the correct peak in " + n + " " + (n === 1 ? "try" : "tries") + "!"
    : "I didn't find the mystery peak in " + MAX_GUESSES + " tries.";

  var head = mode === "daily"
    ? "Coldle " + count + " peaks " + isoDate()
    : "Coldle " + count + " peaks random";

  var url = "https://ianto-cannon.github.io/coldle.html"
    + (count === DEFAULT_COUNT ? "" : "#" + count);
  var text = head + "\n" + summary + "\n" + blocks + "\n" + url;

  function showText() {
    var area = $("#share-text");
    area.value = text;
    setHidden($("#share-output"), false);
    if (document.activeElement !== mapSvg) area.select();
  }
  function onCopied() {
    $("#action").textContent = "copied!";
    setTimeout(function () {
      if (over()) $("#action").textContent = "share results";
    }, 2000);
  }
  function tryCopy() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        var pr = navigator.clipboard.writeText(text);
        if (pr && typeof pr.then === "function") pr.then(onCopied, showText);
        else onCopied();
      } catch (err) { showText(); }
    } else {
      showText();
    }
  }
  // On touch devices use the native share sheet, called synchronously from the
  // click so iOS keeps the user-gesture activation.
  if (COARSE && navigator.share) {
    try {
      var sp = navigator.share({ text: text });
      if (sp && typeof sp.then === "function") {
        sp.then(function () {}, function (err) {
          if (!err || err.name !== "AbortError") tryCopy();
        });
      }
      return;
    } catch (err) { /* fall through to copy */ }
  }
  setTimeout(tryCopy, 0);
}
function pickFromLink(e) {
  var link = closestPeak(e.target);
  if (!link) return;
  e.preventDefault();
  selectPeak(+link.getAttribute("data-peak"), true);
}
$("#chart").addEventListener("click", pickFromLink, false);
$("#guess-table").addEventListener("click", pickFromLink, false);
$("#action").onclick = function () { return over() ? shareResult() : guess(); };
$("#reset").onclick = function () {
  resetView();
  newRound();
};
var countRadios = document.querySelectorAll("input[name=count]");
for (var cr = 0; cr < countRadios.length; cr++) {
  (function (radio) {
    radio.onchange = function () {
      if (radio.checked) applyCount(+radio.value, true);
    };
  })(countRadios[cr]);
}
window.addEventListener("hashchange", function () {
  var n = readCount();
  if (n !== count) applyCount(n, false);
}, false);

/* ------------------------------------------------ keyboard */
// Arrow keys step the selection west to east, Enter or Space guesses (or
// shares, once the game is over), Escape clears the selection.
var panAnim = null;
function ensureVisible(i) {
  var p = peaks[i];
  var mx = view.w * .1, my = view.h * .1;
  if (p.x < view.x + mx || p.x > view.x + view.w - mx ||
      p.y < view.y + my || p.y > view.y + view.h - my) {
    var to = {
      x: clamp(p.x - view.w / 2, 0, world.W - view.w),
      y: clamp(p.y - view.h / 2, 0, world.H - view.h)
    };
    if (prefersReducedMotion()) {
      panAnim = null;
      view.x = to.x;
      view.y = to.y;
      return;
    }
    if (!panAnim) raf(panFrame);
    panAnim = { t0: nowMs(), from: { x: view.x, y: view.y }, to: to };
  }
}
function panFrame() {
  if (!panAnim) return;
  var dt = (nowMs() - panAnim.t0) / 400;
  if (dt >= 1) {
    view.x = panAnim.to.x;
    view.y = panAnim.to.y;
    panAnim = null;
  } else {
    var e = 1 - Math.pow(1 - dt, 3);
    view.x = panAnim.from.x + (panAnim.to.x - panAnim.from.x) * e;
    view.y = panAnim.from.y + (panAnim.to.y - panAnim.from.y) * e;
    raf(panFrame);
  }
  drawMap();
}
function stepSelection(dir) {
  var order = [];
  for (var i = 0; i < peaks.length; i++) {
    if (!over() && guesses.indexOf(i) !== -1) continue;
    order.push(i);
  }
  if (!order.length) return;
  order.sort(function (a, b) { return peaks[a].x - peaks[b].x || peaks[a].y - peaks[b].y; });
  var pos = order.indexOf(selected);
  var next;
  if (pos < 0) {
    next = dir > 0 ? order[0] : order[order.length - 1];
    if (selected !== null) {
      for (var k = 0; k < order.length; k++) {
        var ahead = peaks[order[k]].x > peaks[selected].x;
        if (dir > 0 && ahead) { next = order[k]; break; }
        if (dir < 0 && !ahead) next = order[k];
      }
    }
  } else {
    next = order[(pos + dir + order.length) % order.length];
  }
  selectPeak(next, true);
}
document.addEventListener("keydown", function (e) {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  var t = e.target;
  var onMap = t === mapSvg;
  var idle = t === document.body || t === document.documentElement;
  if (!peaks.length) return;
  var k = e.key;
  if (onMap && (k === "ArrowRight" || k === "ArrowDown")) {
    e.preventDefault(); stepSelection(1);
  } else if (onMap && (k === "ArrowLeft" || k === "ArrowUp")) {
    e.preventDefault(); stepSelection(-1);
  } else if (onMap && k === "Escape") {
    selected = null; render();
  } else if ((onMap || idle) && k === "Enter" || (onMap && (k === " " || k === "Spacebar"))) {
    e.preventDefault();
    $("#action").onclick();
  }
}, false);

var radios = document.querySelectorAll("input[name=mode]");
for (var r = 0; r < radios.length; r++) {
  (function (radio) {
    radio.onchange = function () {
      mode = radio.value;
      newRound();
    };
  })(radios[r]);
}
try {
  load();
  applyCount(readCount(), false);
} catch (e) {
  var status = $("#status");
  setHidden(status, false);
  status.textContent = "Could not load map data: " + e.message + (e.line ? " (line " + e.line + ")" : "");
}
})();
