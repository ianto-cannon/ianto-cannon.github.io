// Coldle: guess the mystery peak. peaks.csv columns: name,height,prominence,parent,lat,lon,range,country.
// map.svg is a Lambert cylindrical equal-area projection (x = longitude, y = sin latitude).
// ES5 translation, with a top-N selector (default 50; #125, #37, … in the URL).
(function () {

function $(s) { return document.querySelector(s); }

var MAX_GUESSES = 8;
var MAX_ZOOM = 150;
var RAD = Math.PI / 180;
var DEFAULT_COUNT = 50;
var COARSE = !!(window.matchMedia && matchMedia("(pointer: coarse)").matches);

/* ------------------------------------------------ old-browser helpers */
function addClass(el, c) {
  if (el.classList) { el.classList.add(c); return; }
  var parts = (el.className || "").split(/\s+/);
  for (var i = 0; i < parts.length; i++) if (parts[i] === c) return;
  el.className = el.className ? el.className + " " + c : c;
}
function removeClass(el, c) {
  if (el.classList) { el.classList.remove(c); return; }
  var parts = (el.className || "").split(/\s+/);
  var out = [];
  for (var i = 0; i < parts.length; i++) if (parts[i] && parts[i] !== c) out.push(parts[i]);
  el.className = out.join(" ");
}
var supportsHidden = (function () {
  var d = document.createElement("div");
  d.hidden = true;
  return d.hidden === true;
})();
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function metres(m) { return m.toLocaleString() + " m"; }
function colLabel(m) { return m ? metres(m) : "sea level"; }
function pt(x, y) { return x.toFixed(1) + "," + y.toFixed(1); }
function fontPx() { return parseFloat(getComputedStyle(document.body).fontSize); }
function colGuess(pct, alpha) {
  if (alpha === undefined) alpha = 1;
  return "hsl(" + hue + " 65% " + (20 + 70 * Math.pow(pct / 100, .25)) + "% / " + alpha + ")";
}
var CSV_RE = /(?:^|,)("(?:[^"]|"")*"|[^,]*)/g;
function parseCSV(text) {
  return text.trim().split(/\r?\n/).map(function (line) {
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

function newRound() {
  var day = Math.floor(Date.now() / 864e5);
  target = mode === "daily"
    ? (day * 2654435761 >>> 0) % peaks.length
    : target = Date.now() % peaks.length;
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
  removeClass(el, "shake");
  void el.offsetWidth;
  addClass(el, "shake");
  var handler = function () {
    removeClass(el, "shake");
    if (el.removeEventListener) el.removeEventListener("animationend", handler, false);
  };
  el.addEventListener("animationend", handler, false);
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
function renderTable() {
  var tableRows = document.querySelectorAll("#rows tbody tr");
  for (var i = 0; i < tableRows.length; i++) {
    var tr = tableRows[i];
    if (i < guesses.length) {
      var g = guesses[i];
      var lt = linkToTarget(g);
      tr.className = g === selected ? "sel" : "";
      tr.cells[1].innerHTML = '<a href="#" data-i="' + g + '">' + peaks[g].name + '</a>';
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
  if (supportsHidden) {
    el.hidden = hide;
  } else {
    el.style.display = hide ? "none" : "";
  }
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
          ? "Got it in " + made + "! The mystery peak is <b>" + p.name + "</b>."
          : "Out of guesses. The mystery peak is <b>" + p.name + "</b>.")
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

  var els = box.querySelectorAll("[data-v]");
  for (var i = 0; i < els.length; i++) {
    els[i].textContent = values[els[i].getAttribute("data-v")];
  }
  els = box.querySelectorAll("[data-vhtml]");
  for (var j = 0; j < els.length; j++) {
    els[j].innerHTML = values[els[j].getAttribute("data-vhtml")];
  }

  if (!end) {
    var shm = $("#shm");
    while (shm.firstChild) shm.removeChild(shm.firstChild);
  }

  var state = box.textContent;
  if (state === lastStatus) return;
  lastStatus = state;
  if (!prefersReducedMotion()) {
    removeClass(box, "flash");
    void box.offsetWidth;
    addClass(box, "flash");
  }
}
function chartY(alt) { return 198 - alt / 9000 * 168; }

function drawChart() {
  var chart = $("#ch");
  var key = [chart.clientWidth, chart.clientHeight, fontPx(), target,
             guesses.join(), selected, over(), peaks.length].join();
  if (key === chart.getAttribute("data-key")) return;
  chart.setAttribute("data-key", key);

  var chartH = chart.clientHeight;
  if (!chartH) return;

  var k = 236 / 200;
  var viewW = k * chart.clientWidth;
  var viewH = k * chartH;

  var plotL = 36;
  var plotR = viewW - 4;
  var cx = plotL + .93 * (plotR - plotL);
  var wgMax = (plotR - plotL) / 20;
  var W = cx - plotL - .3 * (plotR - plotL);
  var T = peaks[target];

  var font = fontPx() * k;
  var labelArea = 1.5 * font;

  var base = viewH - labelArea;
  var plotH = 0.848 * base;

  function chartY(alt) { return base - alt / 9000 * plotH; }
  function text(x, y, t, cls) {
    if (cls === undefined) cls = "";
    return '<text class="' + cls + '" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '">' + t + '</text>';
  }
  function altitude(x, p) { return text(x, chartY(p.height) - 3, metres(p.height)); }
  // Name under the baseline, kept inside the chart. i is the peak index if the name is a link.
  function label(x, t, i) {
    var h = t.length * .35 * font;
    var y = base + 1.1 * font;
    var tx = text(clamp(x, h, viewW - h), y, t, i === selected ? "sel" : "");
    return i === undefined ? tx : '<a href="#" data-i="' + i + '">' + tx + '</a>';
  }

  var out = [0, 2000, 4000, 6000, 8000].map(function (alt) {
    return '<line x1="28" x2="' + (viewW - 4).toFixed(1) + '" y1="' + chartY(alt) + '" y2="' + chartY(alt) + '"/>'
      + text(2, chartY(alt) + 3, alt, "start");
  }).join("");

  // Sea: a filled rectangle 4 pixels tall, sitting on top of sea level, no outline.
  var seaH = 4 * k;
  out += '<rect class="sea" x="60" y="' + (base - seaH).toFixed(1)
    + '" width="' + (cx - W).toFixed(1)
    + '" height="' + seaH.toFixed(1) + '"/>';

  var ty = chartY(T.height);
  out += '<line class="target-alt" x1="28" x2="' + (viewW - 4).toFixed(1) + '" y1="' + ty.toFixed(1) + '" y2="' + ty.toFixed(1) + '"/>';

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
        + altitude(pl.xg, pl.G)
        + label(pl.xg, pl.G.name, g);
    }
  }
  out += guessPolys;
  out += '<polygon class="target"' + (over() ? ' style="fill:' + colGuess(100) + '"' : "")
    + ' points="' + pt(cx - W, base) + " " + pt(cx + W, base) + " " + pt(cx, chartY(T.height)) + '"/>';
  out += marks + altitude(cx, T);

  out += label(cx, over() ? T.name : "?", over() ? target : undefined);

  chart.setAttribute("viewBox", "0 0 " + viewW.toFixed(1) + " " + viewH.toFixed(1));
  chart.setAttribute("font-size", font.toFixed(2));
  chart.innerHTML = out;
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
  var canvas = document.createElement("canvas");
  var ctx = canvas.getContext("2d");
  canvas.className = "confetti";
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  document.body.appendChild(canvas);

  var btn = $("#go").getBoundingClientRect();
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
    else if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
  }
  raf(tick);
}
var world = { W: 40030, H: 12742, R: 6371, lon0: 0 };
var view = { x: 0, y: 0, w: 40030, h: 12742 };
var mapSvg = $("#mp");

function project(lat, lon) {
  return [
    world.W / 2 + world.R * (((lon - world.lon0 + 540) % 360) - 180) * RAD,
    world.H / 2 - world.R * Math.sin(lat * RAD)
  ];
}
function injectMap() {
  var bg = document.getElementById("bg");
  if (!bg || typeof MAP_SVG === "undefined") return;
  if (!window.DOMParser) return;
  var doc = new DOMParser().parseFromString(MAP_SVG, "image/svg+xml");
  var root = doc.documentElement;
  if (!root || root.nodeName === "parsererror") return;
  var next = root.firstChild;
  while (next) {
    var following = next.nextSibling;
    var node = document.importNode ? document.importNode(next, true) : next.cloneNode(true);
    bg.appendChild(node);
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
  return r.height ? r.width / r.height : world.W / world.H;
}
function minW() { return world.W / MAX_ZOOM; }
function maxW() { return Math.min(world.W, world.H * aspect()); }

function resetView() {
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
  var live = !over();
  var tiers = [[], [], []];
  var labels = "";
  var top = "";

  // Greedy label placement: the selected peak first, then by descending prominence.
  // A label is shown only if its box doesn't overlap a label already placed.
  var fs = fontPx() * px;
  var order = [];
  for (var oi = 0; oi < peaks.length; oi++) order.push(oi);
  order.sort(function (a, b) {
    if (a === selected) return -1;
    if (b === selected) return 1;
    return peaks[b].prominence - peaks[a].prominence;
  });
  function labelDx(i) { return (i === selected ? 14 : 9) * px; }
  // Triangle markers are obstacles too (the selected one is drawn larger).
  var markers = [];
  for (var mi = 0; mi < peaks.length; mi++) {
    var mr = (mi === selected ? 12.6 : 7) * px;
    markers.push([peaks[mi].x - .87 * mr, peaks[mi].y - mr, peaks[mi].x + .87 * mr, peaks[mi].y + .5 * mr]);
  }
  var shown = {};
  var boxes = [];
  for (var oj = 0; oj < order.length; oj++) {
    var q = peaks[order[oj]];
    var bx0 = q.x + labelDx(order[oj]);
    var bx1 = bx0 + q.name.length * .55 * fs;
    var by0 = q.y + 4 * px - fs;
    var by1 = q.y + 4 * px + .25 * fs;
    if (bx1 < view.x || bx0 > view.x + view.w || by1 < view.y || by0 > view.y + view.h) continue;
    var clash = false;
    var obstacles = boxes.concat(markers);
    for (var bi = 0; bi < obstacles.length; bi++) {
      if (markers[order[oj]] === obstacles[bi]) continue; // its own marker
      var b = obstacles[bi];
      if (bx0 < b[2] && bx1 > b[0] && by0 < b[3] && by1 > b[1]) { clash = true; break; }
    }
    if (clash && order[oj] !== selected) continue; // the selected label is always shown
    boxes.push([bx0, by0, bx1, by1]);
    shown[order[oj]] = true;
  }

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
    var label = shown[i]
      ?'<a' + tap + ' href="#"><text' + (isSel ? ' class="sel"' : "")
        + ' x="' + (p.x + labelDx(i)).toFixed(1) + '" y="' + (p.y + 4 * px).toFixed(1) + '">'
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
  pointers[id] = { x: cx, y: cy };
  if (pointerCount() === 1) {
    var hit = closestDataI(target);
    dragged = false;
    drag = { x: cx, y: cy, vx: view.x, vy: view.y,
             hit: hit ? +hit.getAttribute("data-i") : -1 };
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
      view.x = drag.vx - dx * k;
      view.y = drag.vy - dy * k;
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
      // nearest peak to the tap wins; the polygon that was hit is only a fallback
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
      // stop the browser from also firing synthesized mouse events (double select)
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
    ? "Coldle " + count + " peaks " + new Date().toISOString().slice(0, 10)
    : "Coldle " + count + " peaks random";

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
  // On touch devices use the native share sheet, called synchronously from the
  // click so iOS keeps the user-gesture activation.
  if (COARSE && navigator.share) {
    try {
      var sp = navigator.share({ text: text });
      if (sp && typeof sp.then === "function") {
        sp.then(function () {}, function (err) {
          // user dismissed the sheet: do nothing; any other failure: fall back
          if (!err || err.name !== "AbortError") tryCopy();
        });
      }
      return;
    } catch (err) { /* fall through to copy */ }
  }
  setTimeout(tryCopy, 0);
}
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
  status.textContent = "Could not load map data: " + e.message;
}
})();
