// Coldle — guess the mystery peak.
// Peaks come from peaks.csv: name,height,prominence,parent,lat,lon,range,country.
// The map is a Lambert cylindrical equal-area projection (x = longitude, y = sin latitude);
// its geometry comes from map.svg, where 1 unit = 1 km at the equator.

// ── Helpers ──────────────────────────────────────────────────────────────────
const $ = selector => document.querySelector(selector);
const MAX_GUESSES = 8;

const bodyFontSize = () => parseFloat(getComputedStyle(document.body).fontSize);
const toRad = deg => deg * Math.PI / 180;

const colLabel = m => (m ? m.toLocaleString() + " m" : "sea level");

// ── CSV parsing ──────────────────────────────────────────────────────────────
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {          // "" inside quotes is a literal quote
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {  // \r\n counts as one row break
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }

  if (field !== "" || row.length) {         // final row without trailing newline
    row.push(field);
    rows.push(row);
  }

  return rows;
}

// ── Game state ───────────────────────────────────────────────────────────────
let mode = "daily";       // "daily" (same peak for everyone today) or "random"
let peaks = [];           // all peaks, in CSV order
let byName = {};          // peak name → index in peaks
let target = null;        // index of the mystery peak
let guesses = [];         // indices of guessed peaks, in order
let selected = null;      // index of the peak currently picked on the map
let roundOver = false;

// ── Rounds ───────────────────────────────────────────────────────────────────
function newRound() {
  // Daily peak: hash the day count so every visitor gets the same one.
  const day = Math.floor(Date.now() / 864e5);
  target = mode === "daily"
    ? ((day * 2654435761) >>> 0) % peaks.length
    : Math.floor(Math.random() * peaks.length);

  guesses = [];
  roundOver = false;
  selected = null;
  render();
}

function guess() {
  const guessed = selected;
  if (roundOver || guessed === null || guesses.includes(guessed)) return;

  guesses.push(guessed);
  selected = null;
  roundOver = guessed === target || guesses.length >= MAX_GUESSES;

  render();
  if (guessed === target) confetti();
}

// ── Rendering ────────────────────────────────────────────────────────────────
function render() {
  renderTable();
  drawChart();
  drawMap();
  renderStatus();
  $("#go").textContent = roundOver ? "share results" : "guess";
}

function renderTable() {
  const rows = guesses.map((peakIdx, i) => {
    const peak = peaks[peakIdx];
    const info = linkToTarget(peakIdx);
    const colour = colGuess(info.pct);
    const col = peakIdx === target ? "🎯 Correct" : colLabel(info.colAlt);
    return `<tr><td>${i + 1}</td><td>${peak.name}</td><td>${col}</td>`
         + `<td style="color:${colour}">${info.pct}%</td></tr>`;
  });

  $("#rows").innerHTML = rows.length
    ? `<table><tr><th>#</th><th>Peak</th><th>Linking col</th><th>Linked</th></tr>${rows.join("")}</table>`
    : "";
}

// One status field (#sel) for instructions, hints and the round-over summary.
function renderStatus() {
  const peak = peaks[target];

  if (roundOver) {
    const won = guesses.includes(target);
    const headline = won ? `Got it in ${guesses.length}!` : "Out of guesses.";
    $("#sel").innerHTML =
      `<b>${headline}</b> The peak was <b>${peak.name}</b> in ${peak.range}, ${peak.country}.`
      + ` Pick Random for another peak. <span id="shm"></span>`;
    return;
  }

  const made = guesses.length;
  const instruction = selected !== null
    ? `Selected: ${peaks[selected].name}. Press Guess to confirm.`
    : made
      ? "Tap another peak on the map, then press Guess."
      : "Tap a peak on the map, then press Guess.";

  let hint = `Guess ${made + 1} of ${MAX_GUESSES} · Target: altitude ${peak.height.toLocaleString()} m, key col ${colLabel(peak.colAlt)}`;
  if (made >= 3) hint += ` · Range: ${peak.range}`;
  if (made >= 5) hint += ` · Country: ${peak.country}`;

  $("#sel").textContent = `${instruction} ${hint}`;
}

// ── Peak relationships ───────────────────────────────────────────────────────
// Each peak has a "parent": the higher peak that is key to its prominence.
const parentIdx = i => (peaks[i].parent ? byName[peaks[i].parent] : -1);

// The peak and every ancestor above it.
function parentChain(i) {
  const chain = [i];
  for (let p = parentIdx(i); p >= 0; p = parentIdx(p)) chain.push(p);
  return chain;
}

// Walking from one peak to the other: the lowest col you must cross, and how
// high it is as a percentage of the target's altitude.
function link(guessIdx, targetIdx) {
  const chainA = parentChain(guessIdx);
  const chainB = parentChain(targetIdx);
  const meet = chainA.find(i => chainB.includes(i));   // highest common peak, or undefined

  // The key col of every peak before the meeting point must be crossed. With no
  // shared peak, indexOf returns -1 and slice(0,-1) drops each chain's summit.
  const crossed = [...chainA.slice(0, chainA.indexOf(meet)), ...chainB.slice(0, chainB.indexOf(meet))];
  const colAlt = crossed.length
    ? Math.min(...crossed.map(i => peaks[i].colAlt))
    : peaks[guessIdx].height;   // nothing in the way: measured from the summit itself

  const pct = Math.round(100 * colAlt / peaks[targetIdx].height);
  return { colAlt, pct };
}

// How a guess relates to the target: its linking col and score. The target
// itself scores its own summit, i.e. 100%.
const linkToTarget = gi => gi === target
  ? { colAlt: peaks[gi].height, pct: 100 }
  : link(gi, target);

function colGuess(linked) {
  //const l = 50 + .3 * linked;
  const l = 20 + 70 * (linked / 100) ** .25;   // quartic root spreads out the low scores
  return `hsl(${hue}, 65%, ${l}%)`;
}

// ── Chart: one bar per guess ─────────────────────────────────────────────────
function drawChart() {
  const chart = $("#ch");
  const pxW = chart.clientWidth;           // element size in CSS px
  const pxH = chart.clientHeight;
  const viewW = 236 * pxW / pxH;   // widen on wide screens so bars spread out
  const scale = pxH / 236;
  const fontUnits = bodyFontSize() / scale;       // body font size in viewBox units

  const slotW = (viewW - 36) / 9;                 // 9 slots: up to 8 guesses + the answer
  const slotX = i => 36 + slotW * (i + 0.5);
  const barW = slotW * 0.9;
  const MIN_BAR_H = 2;
  const yFor = alt => 178 - alt / 9000 * 168;     // altitude 0…9000 m → y 178…10

  chart.setAttribute("viewBox", `0 0 ${viewW.toFixed(1)} 236`);

  let out = "";

  [0, 2000, 4000, 6000, 8000].forEach(alt => {
    out += `<line x1="28" x2="${(viewW - 4).toFixed(1)}" y1="${yFor(alt)}" y2="${yFor(alt)}"/>`;
    out += `<text class="start" x="2" y="${yFor(alt) + 3}">${alt}</text>`;
  });

  const trimName = name => (name.length > 17 ? name.slice(0, 16) + "…" : name);
  const nameLabel = (x, name) =>
    `<text class="end" transform="translate(${x + 3} 184) rotate(-45)">${trimName(name)}</text>`;

  // Each peak is a triangle: the solid part is the slice up to the col; the grey
  // "ghost" triangle behind it shows the hidden part up to the summit.
  const bar = (x, peak, colo, colAlt) => {
    const baseY = yFor(0);
    const peakY = yFor(peak.height);
    const topY = Math.min(yFor(colAlt), baseY - MIN_BAR_H);   // never thinner than MIN_BAR_H
    const x0 = x - barW / 2;
    const x1 = x + barW / 2;
    const pt = (px, py) => `${px.toFixed(1)},${py.toFixed(1)}`;

    const ghost = colAlt < peak.height
      ? `<polygon class="ghost" points="${pt(x0, baseY)} ${pt(x1, baseY)} ${pt(x, peakY)}"/>`
      : "";
    // width of the triangle at the col line shrinks linearly towards the summit
    const frac = Math.min(1, (baseY - topY) / (baseY - peakY));
    const half = barW / 2 * (1 - frac);
    const solid = `<polygon fill="${colo}" points="${pt(x0, baseY)} ${pt(x1, baseY)} ${pt(x + half, topY)} ${pt(x - half, topY)}"/>`;
    return ghost + solid;
  };

  // One entry per bar: the mystery peak always in the leftmost slot, then each guess
  // to its right. A correct guess isn't drawn again (the target is already there).
  // The mystery peak is one solid triangle, black until the round ends.
  const entries = [];
  guesses.forEach((gi, i) => {
    if (gi === target) return;
    const info = linkToTarget(gi);
    entries.push({ x: slotX(i + 1), peak: peaks[gi], colo: colGuess(info.pct), colAlt: info.colAlt, showCol: true });
  });
  const answer = peaks[target];
  entries.unshift({
    x: slotX(0),
    peak: answer,
    colo: roundOver ? colGuess(100) : "currentColor",
    colAlt: answer.height,   // whole triangle in one colour, no key col shown
    showCol: false,
    secret: !roundOver,      // the name stays hidden until the end
  });

  for (const { x, peak, colo, colAlt, showCol, secret } of entries) {
    out += bar(x, peak, colo, colAlt);
    out += `<text x="${x.toFixed(1)}" y="${yFor(peak.height) - 3}">${peak.height.toLocaleString()}</text>`;
    if (showCol) {
      const colY = yFor(colAlt);
      const labelY = colY - yFor(peak.height) > 10 ? colY - 2 : colY + 9;
      out += `<text x="${x.toFixed(1)}" y="${labelY}" class="b">${colAlt.toLocaleString()}</text>`;
    }
    out += nameLabel(x, secret ? "?" : peak.name);
  }

  chart.setAttribute("font-size", fontUnits.toFixed(2));
  chart.innerHTML = out;
}

// ── Confetti (canvas overlay) ────────────────────────────────────────────────
function confetti() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const dpr = devicePixelRatio || 1;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.className = "confetti";   // look & positioning come from coldle.css
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  document.body.appendChild(canvas);

  const btn = $("#go").getBoundingClientRect();
  const originX = (btn.left + btn.width / 2) * dpr;
  const originY = (btn.top + btn.height / 2) * dpr;
  const colors = ["#0072b2", "#e69f00", "#cc79a7", "#56b4e9", "#009e73", "#f0e442"];

  // Particles launch upwards from the Guess button in a cone.
  const particles = Array.from({ length: 160 }, () => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.2;
    const speed = (6 + Math.random() * 11) * dpr;
    return {
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: (6 + Math.random() * 6) * dpr,
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.4,
      color: colors[Math.random() * colors.length | 0],
      life: 0,
    };
  });

  let last = performance.now();

  function tick(now) {
    const dt = Math.max(0, Math.min(2, (now - last) / 16.7));   // clamp to 2 frames of motion
    last = now;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = 0;

    for (const p of particles) {
      p.vy += 0.35 * dpr * dt;
      p.vx *= 0.99;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.life += dt;

      if (p.y < canvas.height + 20 && p.life < 220) {
        alive++;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.min(1, (220 - p.life) / 40);   // fade out at end of life
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
    }

    if (alive) requestAnimationFrame(tick);
    else canvas.remove();
  }

  tick(last);
}

// ── Map: world, projection, data ─────────────────────────────────────────────
let world = { W: 40030, H: 12742, R: 6371, lon0: 0 };   // world size + projection info (replaced by load())
let view = { x: 0, y: 0, w: 40030, h: 12742 };          // visible rectangle, in world units

const MAX_ZOOM = 150;   // view never narrower than world.W / MAX_ZOOM
const mapSvg = $("#mp");
const markerLayer = $("#pk");
const mapLayer = $("#bg");

// Longitude/latitude → world units; longitudes wrap around the central meridian.
function project(lat, lon) {
  const dLon = ((lon - world.lon0 + 540) % 360) - 180;
  return [
    world.W / 2 + world.R * toRad(dLon),
    world.H / 2 - world.R * Math.sin(toRad(lat)),
  ];
}

async function load() {
  const [csv, svgText] = await Promise.all(
    ["peaks.csv", "map.svg"].map(url =>
      fetch(url).then(r => {
        if (!r.ok) throw new Error(url + " " + r.status);
        return r.text();
      })
    )
  );

  peaks = parseCSV(csv)
    .slice(1)
    .filter(fields => fields.length >= 8)
    .map(([name, height, prominence, parent, lat, lon, range, country]) => ({
      name, parent, range, country,
      height: +height,
      colAlt: +height - +prominence,   // key col altitude
      lat: +lat,
      lon: +lon,
    }));
  peaks.forEach((p, i) => { byName[p.name] = i; });

  const svg = new DOMParser().parseFromString(svgText, "image/svg+xml").documentElement;
  const dataAttr = name => +svg.getAttribute("data-" + name);
  world = {
    W: svg.viewBox.baseVal.width,
    H: svg.viewBox.baseVal.height,
    R: dataAttr("r"),
    lon0: dataAttr("lon0"),
  };

  mapLayer.replaceChildren(...[...svg.childNodes].map(node => document.importNode(node, true)));

  peaks.forEach(p => { [p.x, p.y] = project(p.lat, p.lon); });

  resetView();
}

// ── Map: view state (pan & zoom) ─────────────────────────────────────────────
const mapAspect = () => {
  const rect = mapSvg.getBoundingClientRect();
  return rect.height ? rect.width / rect.height : world.W / world.H;
};

const minViewW = () => world.W / MAX_ZOOM;
const maxViewW = () => Math.min(world.W, world.H * mapAspect());

// Start centred on 60°E, vertically centred on the world.
function resetView() {
  const w = maxViewW();
  const h = w / mapAspect();
  const centreX = project(0, 60)[0];
  view = { x: centreX - w / 2, y: (world.H - h) / 2, w, h };
}

function clampView() {
  view.w = Math.max(minViewW(), Math.min(maxViewW(), view.w));
  view.h = view.w / mapAspect();
  view.x = Math.max(0, Math.min(world.W - view.w, view.x));
  view.y = Math.max(0, Math.min(world.H - view.h, view.y));
}

// Screen (client) coordinates → world units.
function clientToWorld(cx, cy) {
  const rect = mapSvg.getBoundingClientRect();
  return [
    view.x + (cx - rect.left) / rect.width * view.w,
    view.y + (cy - rect.top) / rect.height * view.h,
  ];
}

// Resize the view to width w (clamped), keeping world point (wx,wy) under
// screen point (cx,cy). Shared by wheel-zoom and pinch.
function zoomTo(w, wx, wy, cx, cy) {
  const rect = mapSvg.getBoundingClientRect();
  view.w = Math.max(minViewW(), Math.min(maxViewW(), w));
  view.h = view.w / mapAspect();
  view.x = wx - (cx - rect.left) / rect.width * view.w;
  view.y = wy - (cy - rect.top) / rect.height * view.h;
  drawMap();
}

// Zoom by factor, keeping the world point under (cx, cy) fixed on screen.
function zoomAt(factor, cx, cy) {
  const [wx, wy] = clientToWorld(cx, cy);
  zoomTo(view.w * factor, wx, wy, cx, cy);
}

// Back to the full-world view.
function resetMap() {
  resetView();
  drawMap();
}

addEventListener("resize", () => {
  if (!peaks.length) return;
  drawMap();
  drawChart();
});

// ── Map: drawing ─────────────────────────────────────────────────────────────
// Name-label visibility, by visible width as a fraction of the whole world:
const LABELS_ALL = 0.28;      // zoomed in ~3.6×: label every peak
const LABELS_GUESSED = 0.56;  // zoomed in ~1.8×: also label peaks already guessed

function drawMap() {
  clampView();

  const unitsPerPx = view.w / (mapSvg.clientWidth);
  const labelFont = bodyFontSize() * unitsPerPx;   // labels stay body-sized on screen at any zoom
  const zoomFrac = view.w / world.W;

  mapSvg.setAttribute("viewBox", `${view.x} ${view.y} ${view.w} ${view.h}`);

  const R = 7 * unitsPerPx;   // marker radius: 7 px on screen at any zoom
  const pt = (x, y) => `${x.toFixed(1)},${y.toFixed(1)}`;
  const triangle = (x, y, r) => `${pt(x, y - r)} ${pt(x + r * .87, y + r * .5)} ${pt(x - r * .87, y + r * .5)}`;
  const diamond = (x, y, r) => `${pt(x, y - r)} ${pt(x + r, y)} ${pt(x, y + r)} ${pt(x - r, y)}`;

  // Draw order (later = on top): unguessed, guessed, revealed target, selected, then labels.
  const tiers = [[], [], [], []];
  let labels = "";

  peaks.forEach((p, i) => {
    const isGuessed = guesses.includes(i);
    const isSelected = i === selected;
    const isRevealed = roundOver && i === target;
    const tapAttr = roundOver ? "" : ` data-i="${i}"`;   // only clickable while the round is live

    // Unguessed peaks are triangles; guessed (and the revealed target) are diamonds.
    let fill = "";
    if (isGuessed) fill = colGuess(linkToTarget(i).pct);
    else if (isRevealed) fill = colGuess(100);
    const fillAttr = fill ? ` style="fill:${fill}"` : "";
    const r = isSelected ? R * 1.8 : R;
    const shape = isGuessed || isRevealed ? diamond(p.x, p.y, r) : triangle(p.x, p.y, r);

    const tier = isSelected ? 3 : isRevealed ? 2 : isGuessed ? 1 : 0;
    tiers[tier].push(`<polygon class="${isSelected ? "sel" : ""}"${fillAttr}${tapAttr} points="${shape}"/>`);

    const showLabel = zoomFrac <= LABELS_ALL || isSelected
      || (isGuessed && zoomFrac <= LABELS_GUESSED);
    if (showLabel) {
      labels += `<text${tapAttr} x="${(p.x + R + 2 * unitsPerPx).toFixed(1)}" y="${(p.y + 4 * unitsPerPx).toFixed(1)}">${p.name}</text>`;
    }
  });

  const out = tiers.flat().join("") + labels;

  markerLayer.setAttribute("font-size", labelFont.toFixed(2));
  markerLayer.innerHTML = out;
}

// ── Map: selecting a peak ────────────────────────────────────────────────────
// Peak index within ~20 px of the tap/click, or -1. Fallback for taps that miss
// a marker; direct hits are resolved by the DOM via data-i.
function nearestPeak(cx, cy) {
  const [wx, wy] = clientToWorld(cx, cy);
  const radius = 20 * view.w / mapSvg.getBoundingClientRect().width;   // 20 px, in world units
  const maxDist = radius * radius;

  let best = -1;
  let bestDist = maxDist;

  peaks.forEach((p, i) => {
    const dist = (p.x - wx) ** 2 + (p.y - wy) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  });

  return best;
}

function selectPeak(i) {
  selected = i;
  renderStatus();
  drawMap();
}

// ── Map: pointer input ───────────────────────────────────────────────────────
// One pointer pans, two pointers pinch-zoom (anchored at the midpoint).
// Taps on a marker or label select that peak: the hit is recorded on
// pointerdown, because setPointerCapture retargets pointerup to #mp.
const pointers = new Map();
let dragged = false;
let drag = null;
let pinch = null;

function pinchMidpoint() {
  const [a, b] = [...pointers.values()];
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
  };
}

function startPinch() {
  const m = pinchMidpoint();
  const [wx, wy] = clientToWorld(m.x, m.y);
  pinch = { dist: m.dist, viewW: view.w, worldX: wx, worldY: wy };
}

mapSvg.onpointerdown = e => {
  if (!peaks.length) return;
  mapSvg.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (pointers.size === 1) {
    dragged = false;
    const hit = e.target.closest("[data-i]");
    drag = {
      x: e.clientX,
      y: e.clientY,
      viewX: view.x,
      viewY: view.y,
      hitPeak: hit ? +hit.dataset.i : -1,
    };
  } else if (pointers.size === 2) {
    dragged = true;
    drag = null;
    startPinch();
  }
};

mapSvg.onpointermove = e => {
  if (!pointers.has(e.pointerId)) return;   // pure hover — cursor styling handled by CSS
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (pointers.size >= 2 && pinch) {
    // Pinch: scale the view around the world point where the pinch started.
    const m = pinchMidpoint();
    zoomTo(pinch.viewW * pinch.dist / m.dist, pinch.worldX, pinch.worldY, m.x, m.y);
  } else if (drag) {
    // Pan (only once the pointer moves more than 5 px).
    const rect = mapSvg.getBoundingClientRect();
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) dragged = true;

    if (dragged) {
      const worldPerPx = view.w / rect.width;
      view.x = drag.viewX - dx * worldPerPx;
      view.y = drag.viewY - dy * worldPerPx;
      drawMap();
    }
  }
};

function endPointer(e) {
  if (!pointers.delete(e.pointerId)) return;

  if (pointers.size === 2) {
    startPinch();   // three → two fingers: re-anchor the pinch
  } else if (pointers.size === 1) {
    // two → one: keep panning with the remaining finger
    const [p] = pointers.values();
    drag = { x: p.x, y: p.y, viewX: view.x, viewY: view.y, hitPeak: -1 };
    pinch = null;
  } else {
    // last pointer up: maybe it was a tap
    const hit = drag ? drag.hitPeak : -1;
    drag = null;
    pinch = null;
    if (e.type === "pointerup" && !dragged && !roundOver) {
      const i = hit >= 0 ? hit : nearestPeak(e.clientX, e.clientY);
      if (i >= 0) selectPeak(i);
    }
  }
}

mapSvg.onpointerup = endPointer;
mapSvg.onpointercancel = endPointer;

mapSvg.addEventListener("wheel", e => {
  e.preventDefault();
  if (!peaks.length) return;
  const step = e.deltaMode === 1 ? 0.4 : 0.012;   // line-mode deltas are much larger than pixel ones
  const clamped = Math.max(-100, Math.min(100, e.deltaY));
  zoomAt(Math.exp(clamped * step), e.clientX, e.clientY);
}, { passive: false });

// ── Controls, share, boot ────────────────────────────────────────────────────
 $("#go").onclick = () => (roundOver ? shareResult() : guess());
// Reset: start the round again (same peak in daily mode, new one in random) with the full map.
$("#reset").onclick = () => { newRound(); resetMap(); };
document.querySelectorAll("input[name=mode]").forEach(radio => {
  radio.onchange = () => {
    mode = radio.value;
    newRound();
  };
});

// Brief message that fades by itself, shown just above `anchor` (an element).
let toastTimer = null;
function toast(msg, anchor, ms = 2000) {
  let el = $("#toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  const r = anchor.getBoundingClientRect();
  el.textContent = msg;
  el.style.left = (r.left + r.width / 2) + "px";
  el.style.top = r.top + "px";
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), ms);
}

function shareResult() {
  const won = guesses.includes(target);
  const highest = Math.max(...peaks.map(p => p.height));

  // One block per guess, sized by the col height relative to the highest peak.
  const blocks = guesses
    .map(g => "▁▂▃▄▅▆▇█"[Math.round(linkToTarget(g).colAlt / highest * 7)])
    .join("") + (won ? "🎯" : "");

  const title = mode === "daily" ? new Date().toISOString().slice(0, 10) : "(random)";
  const score = `${won ? guesses.length : "X"}/${MAX_GUESSES}`;
  const text = `Coldle ${title} ${score}\n${blocks}\nhttps://ianto-cannon.github.io/coldle.html`;

  const showFallback = () => {
    const box = $("#shm");
    box.textContent = "";
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.readOnly = true;
    textarea.rows = 8;
    box.appendChild(textarea);
    textarea.select();
  };

  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(
      () => toast("Copied to clipboard", $("#go")),
      showFallback);
  } else {
    showFallback();
  }
}

load()
  .then(newRound)
  .catch(e => { $("#sel").textContent = "Could not load map data: " + e.message; });
