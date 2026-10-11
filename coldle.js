// Coldle: guess the mystery peak. peaks.csv columns: name,height,prominence,parent,lat,lon,range,country.
// map.svg is a Lambert cylindrical equal-area projection (x = longitude, y = sin latitude).
// ES5 translation, with a top-N selector (default 50; #125, #37, … in the URL).
(function () {

function $(s) { return document.querySelector(s); }

var MAX_GUESSES = 8;
var MAX_ZOOM = 150;
var RAD = Math.PI / 180;
var DEFAULT_COUNT = 50;

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function metres(m) { return m.toLocaleString() + " m"; }
function colLabel(m) { return m ? metres(m) : "sea level"; }
function pt(x, y) { return x.toFixed(1) + "," + y.toFixed(1); }
function fontPx() { return parseFloat(getComputedStyle(document.body).fontSize); }
function colGuess(pct, alpha) {
  if (alpha === undefined) alpha = 1;
  return "hsl(" + hue + " 65% " + (20 + 70 * Math.pow(pct / 100, .25)) + "% / " + alpha + ")";
}

/* ------------------------------------------------------------------ CSV */
var CSV_RE = /(?:^|,)("(?:[^"]|"")*"|[^,]*)/g;
function parseCSV(text) {
  return text.trim().split(/\r?\n/).map(function (line) {
    CSV_RE.lastIndex = 0;
    var fields = [];
    var m;
    while ((m = CSV_RE.exec(line)) !== null) {
      fields.push(m[1].replace(/^"|"$/g, "").replace(/""/g, '"'));
      if (m.index === CSV_RE.lastIndex) CSV_RE.lastIndex++; // guard against zero-length matches
    }
    return fields;
  });
}

/* --------------------------------------------------------------- state */
var mode = "daily";
var allPeaks = null;   // every row in peaks.js
var maxCount = 125;    // set once allPeaks is parsed
var count = DEFAULT_COUNT;
var peaks = [];        // allPeaks.slice(0, count) — what the game actually uses
var target;
var guesses = [];
var selected = null;

function won()  { return guesses.indexOf(target) !== -1; }
function over() { return won() || guesses.length >= MAX_GUESSES; }

function newRound() {
  var day = Math.floor(Date.now() / 864e5); // hashed so every visitor gets the same daily peak
  target = mode === "daily"
    ? (day * 2654435761 >>> 0) % peaks.length
    : Math.floor(Math.random() * peaks.length);
  guesses = [];
  selected = null;
  render();
}

function guess() {
  if (over() || selected === null || guesses.indexOf(selected) !== -1) return;
  guesses.push(selected);
  render();
  if (won()) confetti();
  else if (over()) shake($("#go"));
}

function prefersReducedMotion() {
  return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
}

function shake(el) {
  if (prefersReducedMotion()) return;
  el.classList.remove("shake");
  void el.offsetWidth; // restart the animation if it is already running
  el.classList.add("shake");
  var handler = function () {
    el.classList.remove("shake");
    if (el.removeEventListener) el.removeEventListener("animationend", handler, false);
  };
  el.addEventListener("animationend", handler, false);
}

function chain(i) {
  if (i < 0) return [];
  return [i].concat(chain(peaks[i].parent)); // a peak and its ancestors
}

// The lowest col crossed walking from a guess to the target, and its height as % of the target's.
function linkToTarget(g) {
  if (g === target) return { colAlt: peaks[g].height, pct: 100 };
  var a = chain(g);
  var b = chain(target);
  var meet;
  for (var i = 0; i < a.length; i++) {
    if (b.indexOf(a[i]) !== -1) { meet = a[i]; break; } // highest common ancestor
  }
  var crossed;
  if (meet === undefined) {
    crossed = a.concat(b); // no shared ancestor: walk both full chains
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

function selectPeak(i) {
  selected = i;
  render();
}

function render() {
  renderTable();
  drawChart();
  drawMap();
  renderStatus();
  $("#go").textContent = over() ? "share results" : "guess";
}

/* --------------------------------------------------------------- table */
function renderTable() {
  var rows = guesses.map(function (g, i) {
    var lt = linkToTarget(g);
    var colAlt = lt.colAlt, pct = lt.pct;
    return '<tr' + (g === selected ? ' class="sel"' : "") + '>'
      + '<td>' + (i + 1) + '</td>'
      + '<td><a href="#" data-i="' + g + '">' + peaks[g].name + '</a></td>'
      + '<td>' + (g === target ? "🎯 Correct" : colLabel(colAlt)) + '</td>'
      + '<td style="color:' + colGuess(pct) + '">' + pct + '%</td></tr>';
  });
  $("#rows").innerHTML = rows.length
    ? '<table><tr><th>#</th><th>Peak</th><th>Lowest pass</th><th>Connectedness</th></tr>'
      + rows.join("") + '</table>'
    : "";
}

/* -------------------------------------------------------------- status */
function setHidden(el, hide) {
  el.hidden = hide;
  if (hide) el.setAttribute("hidden", "");
  else el.removeAttribute("hidden");
}
function closestHidden(el) {
  while (el) {
    if (el.hidden) return el;
    if (el.getAttribute && el.getAttribute("hidden") !== null) return el;
    el = el.parentNode;
  }
  return null;
}

var lastStatus = "";
function renderStatus() {
  var p = peaks[target];
  var made = guesses.length;
  var end = over();
  var box = $("#status");
  var states = {
    play: !end, over: end, won: won(), lost: end && !won(),
    first: made === 0, more: made > 0,
    picked: selected !== null && guesses.indexOf(selected) === -1,
    unpicked: selected === null || guesses.indexOf(selected) !== -1,
    g3: made >= 3, g5: made >= 5
  };
  var values = {
    height: metres(p.height), col: colLabel(p.colAlt), n: made + 1, max: MAX_GUESSES, made: made,
    sel: selected === null ? "" : peaks[selected].name,
    range: p.range, country: p.country, name: p.name
  };
  setHidden(box, false);

  var els = box.querySelectorAll("[data-when]");
  for (var i = 0; i < els.length; i++) {
    var el = els[i];
    var parts = el.getAttribute("data-when").split(" ");
    var show = true;
    for (var j = 0; j < parts.length; j++) {
      if (!states[parts[j]]) { show = false; break; }
    }
    setHidden(el, !show);
  }

  els = box.querySelectorAll("[data-v]");
  for (var k = 0; k < els.length; k++) {
    var el2 = els[k];
    el2.textContent = closestHidden(el2) ? "" : values[el2.getAttribute("data-v")];
  }

  if (!end) {
    var shm = $("#shm");
    while (shm.firstChild) shm.removeChild(shm.firstChild); // clear a share fallback
  }

  var state = JSON.stringify(states) + box.textContent;
  if (state === lastStatus) return;
  lastStatus = state;
  if (!prefersReducedMotion()) {
    box.classList.remove("flash");
    void box.offsetWidth;
    box.classList.add("flash");
  }
}

/* --------------------------------------------------------------- chart */
function chartY(alt) { return 198 - alt / 9000 * 168; } // 0..9000 m → y 198..30

function drawChart() {
  var chart = $("#ch");
  // peaks.length is in the key so switching 50 ↔ 125 redraws the background trees
  var key = [chart.clientWidth, fontPx(), target, guesses.join(), selected, over(), peaks.length].join();
  if (key === chart.getAttribute("data-key")) return;
  chart.setAttribute("data-key", key);

  var k = 236 / 200;
  var viewW = k * chart.clientWidth;
  var plotL = 36;
  var plotR = viewW - 4;
  var cx = plotL + .93 * (plotR - plotL);
  var wgMax = (plotR - plotL) / 20;
  var W = cx - plotL - .3 * (plotR - plotL);
  var base = chartY(0);
  var T = peaks[target];

  var font = fontPx() * k;
  function half(t) { return t.length * .35 * font; }
  var labels = [];
  function addName(x, t, i) { labels.push([x, t.length > 17 ? t.slice(0, 16) + "…" : t, i]); }
  function text(x, y, t, cls) {
    if (cls === undefined) cls = "";
    return '<text class="' + cls + '" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '">' + t + '</text>';
  }
  function altitude(x, p) { return text(x, chartY(p.height) - 3, metres(p.height)); }

  var out = [0, 2000, 4000, 6000, 8000].map(function (alt) {
    return '<line x1="28" x2="' + (viewW - 4).toFixed(1) + '" y1="' + chartY(alt) + '" y2="' + chartY(alt) + '"/>'
      + text(2, chartY(alt) + 3, alt, "start");
  }).join("");

  var ty = chartY(T.height);
  out += '<line class="target-alt" x1="28" x2="' + (viewW - 4).toFixed(1) + '" y1="' + ty.toFixed(1) + '" y2="' + ty.toFixed(1) + '"/>';
  out += '<line class="sea" x1="28" x2="' + (cx - W).toFixed(1) + '" y1="' + base + '" y2="' + base + '"/>';

  function place(g) {
    var G = peaks[g];
    var lt = linkToTarget(g);
    var col = Math.min(lt.colAlt, G.height);
    var wg = wgMax * Math.min(1, G.height / T.height);
    var reach = wg * (1 - col / G.height);
    var xg = col > 0 ? cx - W * (1 - col / T.height) - reach : plotL + wg;
    return { G: G, col: col, wg: wg, reach: reach, xg: xg, pct: lt.pct };
  }
  function shape(xg, wg, G) {
    return 'points="' + pt(xg - wg, base) + " " + pt(xg + wg, base) + " " + pt(xg, chartY(G.height)) + '"';
  }

  // unguessed background trees
  var treeBuf = "";
  for (var gi = 0; gi < peaks.length; gi++) {
    if (gi === target || guesses.indexOf(gi) !== -1) continue;
    var tp = place(gi);
    treeBuf += '<polygon class="tree" ' + shape(tp.xg, tp.wg, tp.G) + '/>';
  }
  out += treeBuf;

  // guessed peaks; the selected one is drawn last so it appears on top
  var others = [];
  for (var oi = 0; oi < guesses.length; oi++) if (guesses[oi] !== target) others.push(guesses[oi]);
  var selectedLast = [];
  for (var si = 0; si < others.length; si++) if (others[si] !== selected) selectedLast.push(others[si]);
  for (var sj = 0; sj < others.length; sj++) if (others[sj] === selected) selectedLast.push(others[sj]);

  var guessPolys = "";
  var marks = "";
  for (var li = 0; li < selectedLast.length; li++) {
    var g = selectedLast[li];
    var pl = place(g);
    var isSel = g === selected;
    guessPolys += '<polygon' + (isSel ? ' class="sel"' : "")
      + ' fill="' + colGuess(pl.pct, 1) + '" ' + shape(pl.xg, pl.wg, pl.G) + '/>';
    if (isSel) {
      marks += text(pl.xg + pl.reach + 2, chartY(pl.col) - 2, metres(pl.col), "col")
        + altitude(pl.xg, pl.G);
    }
    addName(pl.xg, pl.G.name, g);
  }
  out += guessPolys;
  out += '<polygon class="target"' + (over() ? ' style="fill:' + colGuess(100) + '"' : "")
    + ' points="' + pt(cx - W, base) + " " + pt(cx + W, base) + " " + pt(cx, chartY(T.height)) + '"/>';
  out += marks + altitude(cx, T);
  addName(cx, over() ? T.name : "?", over() ? target : undefined);

  // label layout: first row that doesn't overlap the previous name there
  labels.sort(function (a, b) { return a[0] - b[0]; });
  var rowEnds = [];
  var placed = [];
  for (var li2 = 0; li2 < labels.length; li2++) {
    var lab = labels[li2];
    var x0 = lab[0], t = lab[1], idx = lab[2];
    var h = half(t);
    var lx = clamp(x0, h, viewW - h);
    var row = -1;
    for (var ri = 0; ri < rowEnds.length; ri++) {
      if (lx - h > rowEnds[ri] + 6) { row = ri; break; }
    }
    if (row < 0) row = rowEnds.length;
    rowEnds[row] = lx + h;
    placed.push({ x: x0, lx: lx, t: t, i: idx, row: row });
  }
  var rowH = 1.2 * font;
  var H = base + 1.1 * font + (rowEnds.length - 1) * rowH + .4 * font;
  for (var pi = 0; pi < placed.length; pi++) {
    var pp = placed[pi];
    var y = base + 1.1 * font + pp.row * rowH;
    if (pp.row) {
      out += '<line x1="' + pp.x.toFixed(1) + '" x2="' + pp.x.toFixed(1)
        + '" y1="' + base + '" y2="' + (y - font).toFixed(1) + '"/>'; // leader line
    }
    out += pp.i === undefined
      ? text(pp.lx, y, pp.t)
      : '<a href="#" data-i="' + pp.i + '">' + text(pp.lx, y, pp.t, pp.i === selected ? "sel" : "") + '</a>';
  }

  chart.setAttribute("viewBox", "0 0 " + viewW.toFixed(1) + " " + H.toFixed(1));
  chart.style.height = H / k + "px";
  chart.setAttribute("font-size", font.toFixed(2));
  chart.innerHTML = out;
}

/* ------------------------------------------------------------ confetti */
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
  var canvas = document.createElement("canvas");
  var ctx = canvas.getContext("2d");
  canvas.className = "confetti";
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  document.body.appendChild(canvas);

  var btn = $("#go").getBoundingClientRect();
  var colors = ["#0072b2", "#e69f00", "#cc79a7", "#56b4e9", "#009e73", "#f0e442"];
  var particles = [];
  for (var i = 0; i < 160; i++) { // launched upward from the button in a cone
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
    else if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
  }
  raf(tick);
}

/* ----------------------------------------------------------------- map */
var world = { W: 40030, H: 12742, R: 6371, lon0: 0 }; // must match map.svg: viewBox, data-r, data-lon0
var view = { x: 0, y: 0, w: 40030, h: 12742 };
var mapSvg = $("#mp");

function project(lat, lon) {
  return [
    world.W / 2 + world.R * (((lon - world.lon0 + 540) % 360) - 180) * RAD,
    world.H / 2 - world.R * Math.sin(lat * RAD)
  ];
}

// Parse peaks.js once; slice later depending on how many are in play.
function load() {
  // PEAKS_CSV comes from peaks.js; the map is an <image> in coldle.html (fetch() fails on file://)
  var rows = parseCSV(PEAKS_CSV).slice(1).filter(function (f) { return f.length >= 8; });
  allPeaks = rows.map(function (f) {
    return {
      name: f[0],
      parent: f[3],
      range: f[6],
      country: f[7],
      lat: +f[4],
      lon: +f[5],
      height: +f[1],
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

/* ------------------------------------------------- top-N selector / URL */
// The URL hash is the only source of truth: #50, #125, #37 … no hash → 50.
function readCount() {
  var m = /^#(\d+)$/.exec(location.hash || "");
  if (!m) return DEFAULT_COUNT;
  var n = parseInt(m[1], 10);
  if (!isFinite(n) || n < 1) return DEFAULT_COUNT;
  return Math.min(n, maxCount);
}
function writeCountHash(n) {
  // 50 is the default, so it gets no hash; anything else is pinned in the URL
  var hash = (n === DEFAULT_COUNT) ? "" : "#" + n;
  var url = location.pathname + location.search + hash;
  if (location.hash === hash) return;
  if (window.history && window.history.replaceState) {
    window.history.replaceState(null, "", url); // no history entry
  } else if (hash) {
    location.hash = hash;
  } else {
    location.replace(url); // older browsers: drop the hash without a history entry
  }
}
function updateCountRadios() {
  var radios = document.querySelectorAll("input[name=count]");
  for (var i = 0; i < radios.length; i++) {
    radios[i].checked = (+radios[i].value === count);
  }
}
// writeHash=false on load and on hashchange, so the URL keeps whatever the user typed.
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
  return r.height ? r.width / r.height : world.W / world.H;
}
function minW() { return world.W / MAX_ZOOM; }
function maxW() { return Math.min(world.W, world.H * aspect()); }

function resetView() { // centred on 60°E
  var w = maxW();
  var h = w / aspect();
  view = { x: project(0, 60)[0] - w / 2, y: (world.H - h) / 2, w: w, h: h };
}
function clampView() {
  view.w = clamp(view.w, minW(), maxW());
  view.h = view.w / aspect();
  view.x = clamp(view.x, 0, world.W - view.w);
  view.y = clamp(view.y, 0, world.H - view.h);
}
function toWorld(cx, cy) {
  var r = mapSvg.getBoundingClientRect();
  return [view.x + (cx - r.left) / r.width * view.w, view.y + (cy - r.top) / r.height * view.h];
}
function zoomTo(w, wx, wy, cx, cy) {
  var r = mapSvg.getBoundingClientRect();
  view.w = clamp(w, minW(), maxW());
  view.h = view.w / aspect();
  view.x = wx - (cx - r.left) / r.width * view.w;
  view.y = wy - (cy - r.top) / r.height * view.h;
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
  mapSvg.style.touchAction = view.h < world.H - .5 ? "none" : "pan-y";
  var px = view.w / mapSvg.clientWidth;
  var zoomFrac = view.w / world.W;
  var live = !over();
  // draw order: unguessed, guessed, revealed target, all labels, then the selected marker and label
  var tiers = [[], [], []];
  var labels = "";
  var top = "";
  for (var i = 0; i < peaks.length; i++) {
    var p = peaks[i];
    var guessed = guesses.indexOf(i) !== -1;
    var isSel = i === selected;
    var revealed = !live && i === target;
    var tap = live ? ' data-i="' + i + '"' : "";
    var fill = revealed ? colGuess(100) : (guessed ? colGuess(linkToTarget(i).pct) : "");
    var cls = isSel ? "sel" : "";
    var shape = triangle(p.x, p.y, isSel ? 12.6 * px : 7 * px);

    var marker = '<polygon' + (cls ? ' class="' + cls + '"' : "")
      + (fill ? ' style="fill:' + fill + '"' : "") + tap
      + ' points="' + shape + '"/>';
    // label every peak once zoomed in enough, guessed or not
    var label = (zoomFrac <= .28 || isSel)
      ? '<a' + tap + ' href="#"><text' + (isSel ? ' class="sel"' : "")
        + ' x="' + (p.x + 9 * px).toFixed(1) + '" y="' + (p.y + 4 * px).toFixed(1) + '">'
        + p.name + '</text></a>'
      : "";
    if (isSel) {
      top = marker + label;
    } else {
      tiers[revealed ? 2 : guessed ? 1 : 0].push(marker);
      labels += label;
    }
  }
  var layer = $("#pk");
  layer.setAttribute("font-size", (fontPx() * px).toFixed(2));
  layer.innerHTML = tiers[0].join("") + tiers[1].join("") + tiers[2].join("") + labels + top;
}

/* ------------------------------------------------------ pointer input */
var pointers = {}; // pointerId → {x, y}  (replaces Map)
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
function closestDataI(el) {
  while (el && el.getAttribute) {
    if (el.getAttribute("data-i") !== null) return el;
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

function nearestPeak(cx, cy) {
  var w = toWorld(cx, cy);
  var wx = w[0], wy = w[1];
  var reach = 20 * view.w / mapSvg.getBoundingClientRect().width;
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

mapSvg.onpointerdown = function (e) {
  if (!peaks.length) return;
  if (mapSvg.setPointerCapture) {
    try { mapSvg.setPointerCapture(e.pointerId); } catch (err) {}
  }
  pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
  if (pointerCount() === 1) {
    var hit = closestDataI(e.target);
    dragged = false;
    drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y,
             hit: hit ? +hit.getAttribute("data-i") : -1 };
  } else if (pointerCount() === 2) {
    dragged = true;
    drag = null;
    startPinch();
  }
};

mapSvg.onpointermove = function (e) {
  if (!pointers.hasOwnProperty(e.pointerId)) return;
  pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
  if (pointerCount() >= 2 && pinch) {
    var m = pinchMid();
    zoomTo(pinch.w * pinch.dist / m.dist, pinch.wx, pinch.wy, m.x, m.y);
  } else if (drag) {
    var dx = e.clientX - drag.x;
    var dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) dragged = true; // below 5 px it is still a tap
    if (dragged) {
      var k = view.w / mapSvg.getBoundingClientRect().width;
      view.x = drag.vx - dx * k;
      view.y = drag.vy - dy * k;
      drawMap();
    }
  }
};

mapSvg.onpointerup = mapSvg.onpointercancel = function (e) {
  if (!pointers.hasOwnProperty(e.pointerId)) return;
  delete pointers[e.pointerId];
  if (pointerCount() === 2) {
    startPinch();
  // two → one finger: keep panning
  } else if (pointerCount() === 1) {
    var vals = pointerValues();
    var p = vals[0];
    drag = { x: p.x, y: p.y, vx: view.x, vy: view.y, hit: -1 };
    pinch = null;
  } else {
    var hit = drag ? drag.hit : -1;
    drag = pinch = null;
    if (e.type === "pointerup" && !dragged) {
      var i = hit >= 0 ? hit : nearestPeak(e.clientX, e.clientY);
      if (i >= 0) selectPeak(i);
    }
  }
};

mapSvg.addEventListener("wheel", function (e) {
  if (!peaks.length) return;
  // line-mode deltas are much larger than pixel ones
  var step = e.deltaMode === 1 ? .05 : .0015;
  var w = clamp(view.w * Math.exp(clamp(e.deltaY, -100, 100) * step), minW(), maxW());
  if (Math.abs(w / view.w - 1) < 1e-9) return; // at the zoom limit: let the page scroll
  e.preventDefault();
  var ww = toWorld(e.clientX, e.clientY);
  zoomTo(w, ww[0], ww[1], e.clientX, e.clientY);
}, false);

// the names are links, but selection is handled on pointerup, so stop the anchor navigating
mapSvg.addEventListener("click", function (e) {
  if (closestAnchor(e.target)) e.preventDefault();
}, false);

/* --------------------------------------------------------------- share */
function shareResult() {
  // one block per guess, as tall as its closeness to the mystery peak
  var blocks = "";
  for (var i = 0; i < guesses.length; i++) {
    blocks += "▁▂▃▄▅▆▇█".charAt(Math.round(linkToTarget(guesses[i]).pct / 100 * 7));
  }
  blocks += won() ? "🎯" : "";
  var n = guesses.length;
  var summary = won()
    ? "I guessed the correct peak in " + n + " " + (n === 1 ? "try" : "tries") + "!"
    : "I didn't find the mystery peak in " + MAX_GUESSES + " tries.";

  // daily shows the date and score; random just says "random"
  var head = mode === "daily"
    ? "Coldle " + count + " peaks " + new Date().toISOString().slice(0, 10)
      + " " + (won() ? n : "X") + "/" + MAX_GUESSES
    : "Coldle " + count + " peaks random";

  // the link carries the top-N only when it isn't the default
  var url = "https://ianto-cannon.github.io/coldle.html"
    + (count === DEFAULT_COUNT ? "" : "#" + count);
  var text = head + "\n" + summary + "\n" + blocks + "\n" + url;

  function showText() {
    var area = document.createElement("textarea");
    area.value = text;
    area.readOnly = true;
    area.rows = 8;
    var shm = $("#shm");
    while (shm.firstChild) shm.removeChild(shm.firstChild);
    shm.appendChild(area);
    area.select();
  }

  function onCopied() {
    $("#go").textContent = "copied!";
    setTimeout(function () {
      if (over()) $("#go").textContent = "share results";
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
  setTimeout(tryCopy, 0); // equivalent of Promise.resolve().then(...)
}

/* --------------------------------------------------------------- wiring */
// names in the chart and the list are links that select their peak
function pickFromLink(e) {
  var link = closestDataI(e.target);
  if (!link) return;
  e.preventDefault();
  selectPeak(+link.getAttribute("data-i"));
}
$("#ch").addEventListener("click", pickFromLink, false);
$("#rows").addEventListener("click", pickFromLink, false);

$("#go").onclick = function () { return over() ? shareResult() : guess(); };

$("#reset").onclick = function () {
  resetView();
  newRound();
};

// top-50 / top-125 radios in the subtitle
var countRadios = document.querySelectorAll("input[name=count]");
for (var cr = 0; cr < countRadios.length; cr++) {
  (function (radio) {
    radio.onchange = function () {
      if (radio.checked) applyCount(+radio.value, true); // write #50 / #125
    };
  })(countRadios[cr]);
}
// typing #37 (or deleting the hash) in the address bar re-seeds the game
window.addEventListener("hashchange", function () {
  var n = readCount();
  if (n !== count) applyCount(n, false);
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
  applyCount(readCount(), false); // no hash → 50, without writing one
} catch (e) {
  var status = $("#status");
  status.hidden = false;
  status.textContent = "Could not load map data: " + e.message;
}

})();
