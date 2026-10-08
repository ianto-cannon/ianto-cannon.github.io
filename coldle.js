// Coldle: guess the mystery peak. peaks.csv columns: name,height,prominence,parent,lat,lon,range,country.
// map.svg is a Lambert cylindrical equal-area projection (x = longitude, y = sin latitude).
const $ = s => document.querySelector(s);
const MAX_GUESSES = 8;
const MAX_ZOOM = 150;
const RAD = Math.PI / 180;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const metres = m => m.toLocaleString() + " m";
const colLabel = m => (m ? metres(m) : "sea level");
const pt = (x, y) => `${x.toFixed(1)},${y.toFixed(1)}`;
const fontPx = () => parseFloat(getComputedStyle(document.body).fontSize);
const colGuess = pct => `hsl(${hue}, 65%, ${20 + 70 * (pct / 100) ** .25}%)`;   // hue: from common.js

const parseCSV = text => text.trim().split(/\r?\n/).map(line =>
  [...line.matchAll(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g)].map(m => m[1].replace(/^"|"$/g, "").replace(/""/g, '"')));

let mode = "daily";
let peaks = [];
let target;
let guesses = [];
let selected = null;

const won = () => guesses.includes(target);
const over = () => won() || guesses.length >= MAX_GUESSES;

function newRound() {
  const day = Math.floor(Date.now() / 864e5);   // hashed so every visitor gets the same daily peak
  target = mode === "daily" ? (day * 2654435761 >>> 0) % peaks.length : Math.floor(Math.random() * peaks.length);
  guesses = [];
  selected = null;
  render();
}
function guess() {
  if (over() || selected === null || guesses.includes(selected)) return;
  guesses.push(selected);
  selected = null;
  render();
  if (won()) confetti();
}
const chain = i => (i < 0 ? [] : [i, ...chain(peaks[i].parent)]);   // a peak and its ancestors

// The lowest col crossed walking from a guess to the target, and its height as % of the target's.
function linkToTarget(g) {
  if (g === target) return { colAlt: peaks[g].height, pct: 100 };
  const a = chain(g);
  const b = chain(target);
  const meet = a.find(i => b.includes(i));   // highest common ancestor, if any
  const crossed = [...a.slice(0, a.indexOf(meet)), ...b.slice(0, b.indexOf(meet))];
  const colAlt = crossed.length ? Math.min(...crossed.map(i => peaks[i].colAlt)) : peaks[g].height;
  return { colAlt, pct: Math.round(100 * colAlt / peaks[target].height) };
}
function render() {
  renderTable();
  drawChart();
  drawMap();
  renderStatus();
  $("#go").textContent = over() ? "share results" : "guess";
}
function renderTable() {
  const rows = guesses.map((g, i) => {
    const { colAlt, pct } = linkToTarget(g);
    return `<tr><td>${i + 1}</td><td>${peaks[g].name}</td><td>${g === target ? "🎯 Correct" : colLabel(colAlt)}</td>`
      + `<td style="color:${colGuess(pct)}">${pct}%</td></tr>`;
  });
  $("#rows").innerHTML = rows.length
    ? `<table><tr><th>#</th><th>Peak</th><th>Linking col</th><th>Linked</th></tr>${rows.join("")}</table>`
    : "";
}
function renderStatus() {
  const p = peaks[target];
  const made = guesses.length;
  $("#sel").innerHTML = over()
    ? `<b>${won() ? `Got it in ${made}!` : "Out of guesses."}</b> The peak was <b>${p.name}</b> in ${p.range}, ${p.country}. `
      + `Pick Random for another peak. <span id="shm"></span>`
    : `The mystery peak has altitude ${metres(p.height)} and its key col is at ${colLabel(p.colAlt)}.`
      + (made >= 3 ? ` Its range is ${p.range}.` : "")
      + (made >= 5 ? ` Its country is ${p.country}.` : "")
      + ` Guess ${made + 1} of ${MAX_GUESSES}. `
      + (selected === null
        ? `Tap ${made ? "another" : "a"} peak on the map, then press Guess.`
        : `Selected: ${peaks[selected].name}. Press Guess to confirm.`);
}
const chartY = alt => 178 - alt / 9000 * 168;   // altitude 0…9000 m → y 178…10 (viewBox height 236)

function drawChart() {
  const chart = $("#ch");
  const viewW = 236 * chart.clientWidth / chart.clientHeight;
  const slotW = (viewW - 36) / (MAX_GUESSES + 1);   // the answer + every possible guess
  const slotX = i => 36 + slotW * (i + .5);
  const base = chartY(0);

  let out = [0, 2000, 4000, 6000, 8000].map(alt =>
    `<line x1="28" x2="${(viewW - 4).toFixed(1)}" y1="${chartY(alt)}" y2="${chartY(alt)}"/>`
    + `<text class="start" x="2" y="${chartY(alt) + 3}">${alt}</text>`).join("");

  const bars = [[slotX(0), peaks[target], over() ? colGuess(100) : "currentColor", peaks[target].height]];
  guesses.forEach((g, i) => {
    const { colAlt, pct } = linkToTarget(g);
    if (g !== target) bars.push([slotX(i + 1), peaks[g], colGuess(pct), colAlt]);
  });
  bars.forEach(([x, p, color, col], k) => {
    const half = slotW * .45;
    const peakY = chartY(p.height);
    const topY = Math.min(chartY(col), base - 2);
    const inset = half * Math.min(1, (base - topY) / (base - peakY));
    const colY = chartY(col);
    const name = k || over() ? p.name : "?";
    if (col < p.height) out += `<polygon class="ghost" points="${pt(x - half, base)} ${pt(x + half, base)} ${pt(x, peakY)}"/>`;
    out += `<polygon fill="${color}" points="${pt(x - half, base)} ${pt(x + half, base)} ${pt(x + half - inset, topY)} ${pt(x - half + inset, topY)}"/>`
      + `<text x="${x.toFixed(1)}" y="${peakY - 3}">${metres(p.height)}</text>`
      + (k ? `<text class="b" x="${x.toFixed(1)}" y="${colY - peakY > 10 ? colY - 2 : colY + 9}">${metres(col)}</text>` : "")
      + `<text class="end" transform="translate(${x + 3} 184) rotate(-45)">${name.length > 17 ? name.slice(0, 16) + "…" : name}</text>`;
  });
  chart.setAttribute("viewBox", `0 0 ${viewW.toFixed(1)} 236`);
  chart.setAttribute("font-size", (fontPx() * 236 / chart.clientHeight).toFixed(2));
  chart.innerHTML = out;
}
function confetti() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const dpr = devicePixelRatio || 1;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.className = "confetti";
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  document.body.appendChild(canvas);

  const btn = $("#go").getBoundingClientRect();
  const colors = ["#0072b2", "#e69f00", "#cc79a7", "#56b4e9", "#009e73", "#f0e442"];
  const particles = Array.from({ length: 160 }, () => {   // launched upwards from the button in a cone
    const angle = -Math.PI / 2 + (Math.random() - .5) * Math.PI * 1.2;
    const speed = (6 + Math.random() * 11) * dpr;
    return {
      x: (btn.left + btn.width / 2) * dpr,
      y: (btn.top + btn.height / 2) * dpr,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: (6 + Math.random() * 6) * dpr,
      rot: Math.random() * 6,
      vr: (Math.random() - .5) * .4,
      color: colors[Math.random() * colors.length | 0],
      life: 0,
    };
  });
  let last = performance.now();
  (function tick(now) {
    const dt = clamp((now - last) / 16.7, 0, 2);
    last = now;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = 0;
    for (const p of particles) {
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
    if (alive) requestAnimationFrame(tick);
    else canvas.remove();
  })(last);
}
let world = { W: 40030, H: 12742, R: 6371, lon0: 0 };
let view = { x: 0, y: 0, w: 40030, h: 12742 };
const mapSvg = $("#mp");

const project = (lat, lon) => [
  world.W / 2 + world.R * (((lon - world.lon0 + 540) % 360) - 180) * RAD,
  world.H / 2 - world.R * Math.sin(lat * RAD),
];
async function load() {
  const [csv, svgText] = await Promise.all(["peaks.csv", "map.svg"].map(async url => {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${url} ${r.status}`);
    return r.text();
  }));
  peaks = parseCSV(csv).slice(1).filter(f => f.length >= 8)
    .map(([name, height, prominence, parent, lat, lon, range, country]) => ({
      name, parent, range, country, lat: +lat, lon: +lon,
      height: +height,
      colAlt: height - prominence,
    }));
  peaks.forEach(p => { p.parent = peaks.findIndex(q => q.name === p.parent); });

  const svg = new DOMParser().parseFromString(svgText, "image/svg+xml").documentElement;
  const data = k => +svg.getAttribute("data-" + k);
  world = { W: svg.viewBox.baseVal.width, H: svg.viewBox.baseVal.height, R: data("r"), lon0: data("lon0") };
  $("#bg").replaceChildren(...[...svg.childNodes].map(n => document.importNode(n, true)));
  peaks.forEach(p => { [p.x, p.y] = project(p.lat, p.lon); });
  resetView();
}
const aspect = () => {
  const r = mapSvg.getBoundingClientRect();
  return r.height ? r.width / r.height : world.W / world.H;
};
const minW = () => world.W / MAX_ZOOM;
const maxW = () => Math.min(world.W, world.H * aspect());

function resetView() {   // centred on 60°E
  const w = maxW();
  const h = w / aspect();
  view = { x: project(0, 60)[0] - w / 2, y: (world.H - h) / 2, w, h };
}
function clampView() {
  view.w = clamp(view.w, minW(), maxW());
  view.h = view.w / aspect();
  view.x = clamp(view.x, 0, world.W - view.w);
  view.y = clamp(view.y, 0, world.H - view.h);
}
const toWorld = (cx, cy) => {
  const r = mapSvg.getBoundingClientRect();
  return [view.x + (cx - r.left) / r.width * view.w, view.y + (cy - r.top) / r.height * view.h];
};
function zoomTo(w, wx, wy, cx, cy) {
  const r = mapSvg.getBoundingClientRect();
  view.w = clamp(w, minW(), maxW());
  view.h = view.w / aspect();
  view.x = wx - (cx - r.left) / r.width * view.w;
  view.y = wy - (cy - r.top) / r.height * view.h;
  drawMap();
}
addEventListener("resize", () => {
  if (peaks.length) {
    drawMap();
    drawChart();
  }
});
const triangle = (x, y, r) => `${pt(x, y - r)} ${pt(x + r * .87, y + r * .5)} ${pt(x - r * .87, y + r * .5)}`;
const diamond = (x, y, r) => `${pt(x, y - r)} ${pt(x + r, y)} ${pt(x, y + r)} ${pt(x - r, y)}`;

function drawMap() {
  clampView();
  mapSvg.setAttribute("viewBox", `${view.x} ${view.y} ${view.w} ${view.h}`);
  const px = view.w / mapSvg.clientWidth;
  const zoomFrac = view.w / world.W;
  const live = !over();
  // draw order: unguessed, guessed, revealed target, selected
  const tiers = [[], [], [], []];
  let labels = "";
  peaks.forEach((p, i) => {
    const guessed = guesses.includes(i);
    const isSel = i === selected;
    const revealed = !live && i === target;
    const tap = live ? ` data-i="${i}"` : "";
    const fill = guessed ? colGuess(linkToTarget(i).pct) : revealed ? colGuess(100) : "";
    const shape = (guessed || revealed ? diamond : triangle)(p.x, p.y, isSel ? 12.6 * px : 7 * px);

    tiers[isSel ? 3 : revealed ? 2 : guessed ? 1 : 0]
      .push(`<polygon${isSel ? ' class="sel"' : ""}${fill && ` style="fill:${fill}"`}${tap} points="${shape}"/>`);
    // label every peak when zoomed in ~3.6x, guessed ones from ~1.8x
    if (zoomFrac <= .28 || isSel || (guessed && zoomFrac <= .56)) {
      labels += `<text${tap} x="${(p.x + 9 * px).toFixed(1)}" y="${(p.y + 4 * px).toFixed(1)}">${p.name}</text>`;
    }
  });
  const layer = $("#pk");
  layer.setAttribute("font-size", (fontPx() * px).toFixed(2));
  layer.innerHTML = tiers.flat().join("") + labels;
}
const pointers = new Map();
let drag = null;
let pinch = null;
let dragged = false;

function nearestPeak(cx, cy) {
  const [wx, wy] = toWorld(cx, cy);
  const reach = 20 * view.w / mapSvg.getBoundingClientRect().width;
  let best = -1;
  let bestDist = reach * reach;
  peaks.forEach((p, i) => {
    const d = (p.x - wx) ** 2 + (p.y - wy) ** 2;
    if (d < bestDist) [best, bestDist] = [i, d];
  });
  return best;
}
function pinchMid() {
  const [a, b] = [...pointers.values()];
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, dist: Math.hypot(a.x - b.x, a.y - b.y) || 1 };
}
function startPinch() {
  const m = pinchMid();
  const [wx, wy] = toWorld(m.x, m.y);
  pinch = { dist: m.dist, w: view.w, wx, wy };
}
mapSvg.onpointerdown = e => {
  if (!peaks.length) return;
  mapSvg.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) {
    const hit = e.target.closest("[data-i]");
    dragged = false;
    drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, hit: hit ? +hit.dataset.i : -1 };
  } else if (pointers.size === 2) {
    dragged = true;
    drag = null;
    startPinch();
  }
};
mapSvg.onpointermove = e => {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size >= 2 && pinch) {
    const m = pinchMid();
    zoomTo(pinch.w * pinch.dist / m.dist, pinch.wx, pinch.wy, m.x, m.y);
  } else if (drag) {
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) dragged = true;   // below 5 px it is still a tap
    if (dragged) {
      const k = view.w / mapSvg.getBoundingClientRect().width;
      view.x = drag.vx - dx * k;
      view.y = drag.vy - dy * k;
      drawMap();
    }
  }
};
mapSvg.onpointerup = mapSvg.onpointercancel = e => {
  if (!pointers.delete(e.pointerId)) return;
  if (pointers.size === 2) {
    startPinch();
  // two → one finger: keep panning
  } else if (pointers.size === 1) {
    const [p] = pointers.values();
    drag = { x: p.x, y: p.y, vx: view.x, vy: view.y, hit: -1 };
    pinch = null;
  } else {
    const hit = drag ? drag.hit : -1;
    drag = pinch = null;
    if (e.type === "pointerup" && !dragged && !over()) {
      const i = hit >= 0 ? hit : nearestPeak(e.clientX, e.clientY);
      if (i >= 0) {
        selected = i;
        renderStatus();
        drawMap();
      }
    }
  }
};
mapSvg.addEventListener("wheel", e => {
  e.preventDefault();
  if (!peaks.length) return;
  const [wx, wy] = toWorld(e.clientX, e.clientY);
  // line-mode deltas are much larger than pixel ones
  const step = e.deltaMode === 1 ? .4 : .012;
  zoomTo(view.w * Math.exp(clamp(e.deltaY, -100, 100) * step), wx, wy, e.clientX, e.clientY);
}, { passive: false });

let toastTimer;
function toast(msg, anchor) {
  if (!$("#toast")) document.body.insertAdjacentHTML("beforeend", '<div id="toast" role="status"></div>');
  const el = $("#toast");
  const r = anchor.getBoundingClientRect();
  el.textContent = msg;
  el.style.left = r.left + r.width / 2 + "px";
  el.style.top = r.top + "px";
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2000);
}
function shareResult() {
  const highest = Math.max(...peaks.map(p => p.height));
  const blocks = guesses.map(g => "▁▂▃▄▅▆▇█"[Math.round(linkToTarget(g).colAlt / highest * 7)]).join("") + (won() ? "🎯" : "");
  const title = mode === "daily" ? new Date().toISOString().slice(0, 10) : "(random)";
  const text = `Coldle ${title} ${won() ? guesses.length : "X"}/${MAX_GUESSES}\n${blocks}\nhttps://ianto-cannon.github.io/coldle.html`;

  const showText = () => {
    const area = Object.assign(document.createElement("textarea"), { value: text, readOnly: true, rows: 8 });
    $("#shm").replaceChildren(area);
    area.select();
  };
  Promise.resolve().then(() => navigator.clipboard.writeText(text))
    .then(() => toast("Copied to clipboard", $("#go")), showText);
}
$("#go").onclick = () => (over() ? shareResult() : guess());
$("#reset").onclick = () => {
  resetView();
  newRound();
};
document.querySelectorAll("input[name=mode]").forEach(radio => {
  radio.onchange = () => {
    mode = radio.value;
    newRound();
  };
});
load().then(newRound).catch(e => { $("#sel").textContent = "Could not load map data: " + e.message; });
