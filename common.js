function anyColor() {
  const h = Math.floor(Math.random() * 360);        
  const s = Math.floor(Math.random() * 40 + 30);    
  const l = Math.floor(Math.random() * 60 + 20);    
  return `hsl(${h}, ${s}%, ${l}%)`;
}

function halloweenColor() {
  const colors = ["#8A4985", "#ff7518"];
  return colors[Math.floor(Math.random() * colors.length)];
}

function christmasColor() {
  const colors = ["#ff0000", "#008000"];
  return colors[Math.floor(Math.random() * colors.length)];
}

function newYearColor() {
  const colors = ["#ffdd00", "#add8e6", "#800080"];
  return colors[Math.floor(Math.random() * colors.length)];
}

function valentinesColor() {
  const colors = ["#ff1493", "#db7093"];
  return colors[Math.floor(Math.random() * colors.length)];
}

function prideColor() {
  const colors = ['#e40303', '#ff8c00', '#ffed00', '#008026', '#24408e', '#732982'];
  return colors[Math.floor(Math.random() * colors.length)];
}

function earthColor() {
  const colors = ['#008026', '#24408e'];
  return colors[Math.floor(Math.random() * colors.length)];
}

function colorScheme(hue) {
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const lightness = prefersDark ? 70 : 30;
  return `hsl(${hue}, 30%, ${lightness}%)`;
}

function rgbToHue(rgb) {
  let r, g, b
  if (rgb.startsWith("#")) {
    rgb = rgb.replace(/^#/, '');
    // Parse RGB components
    r = parseInt(rgb.slice(0, 2), 16) / 255;
    g = parseInt(rgb.slice(2, 4), 16) / 255;
    b = parseInt(rgb.slice(4, 6), 16) / 255;
  } else {
    [r, g, b] = rgb.match(/\d+/g).map(Number).map(v => v / 255);
  }
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta === 0) {
    hue = 0;
  } else if (max === r) {
    hue = ((g - b) / delta) % 6;
  } else if (max === g) {
    hue = (b - r) / delta + 2;
  } else {
    hue = (r - g) / delta + 4;
  }
  hue = Math.round(hue * 60);
  if (hue < 0) hue += 360;
  return hue;
}

function getTime() {
  now = new Date();
  timeZoneName = Intl.DateTimeFormat(undefined, { timeZoneName: 'short' }).format(now).split(' ').pop();
  year = now.getFullYear();
  month = now.getMonth(); //Jan=0, Feb=1...
  monthStr = now.toLocaleString('en-US', { month: 'short'}); // Jul
  date = now.getDate();

  //get the week number this month
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const firstDay = (firstOfMonth.getDay() + 6) % 7; // Monday = 0
  const week = Math.floor((firstDay + date - 1) / 7);
  const totalDays = lastOfMonth.getDate();
  const weeksInMonth = Math.ceil((firstDay + totalDays) / 7);
  sides = [9, 9, 11, weeksInMonth-1, 6, 23, 5, 9, 5, 9]
  weekday = now.toLocaleString('en-US', { weekday: 'short'}); // Thu
  const wkday = (now.getDay()+6)%7; //Sun=6, Mon=0...
  hour = now.getHours();
  minute = now.getMinutes();
  second = now.getSeconds();
  millisecond = now.getMilliseconds();
  time= [Math.floor(year/10)%10, year%10, month, week, wkday, hour, Math.floor(minute/10), minute%10, Math.floor(second/10), second%10];
  const secFrac = millisecond/1000;
  const minFrac = (second + secFrac)/60;
  const hrFrac  = (minute + minFrac)/60;
  const dayFrac = (hour + hrFrac)/24;

  //get the day number this year
  const start = new Date(year, 0, 0); // Jan 1 
  const oneDay = 1000 * 60 * 60 * 24;
  const days = Math.floor((now - start) / oneDay);

  const yrFrac = (days + dayFrac)/365.25;
  const milFrac = (year + yrFrac)/1000;
  timeFracs = [milFrac, yrFrac, dayFrac, hrFrac, minFrac, secFrac];
  
  const unixTime = Math.floor(now.getTime() / 1000);
  binary = unixTime.toString(2).padStart(31, '0');
}

function createTriangle(value, width, height, lightness, peaksSVG) {
  for (let i = -1; i <= 1; i++) {
    const left = width*(.5-value+i)
    const mid = width*(1-value+i)
    const right = width*(1.5-value+i)
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("fill", `hsl(${hue}, 30%, ${lightness}%)`);
    path.setAttribute("d", `M${left.toFixed(1)},100 L${mid.toFixed(1)},${100-height} L${right.toFixed(1)},100 Z`);
      peaksSVG.appendChild(path);
  }
}

function updatePeaks(peaksSVG) {
  while (peaksSVG.firstChild) {
    peaksSVG.removeChild(peaksSVG.firstChild);
  }
  const width = 100;
  getTime();
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  for (let i = 0; i <= 4; i++) {
    const lightness = prefersDark ? (20 + i*10) : (100 - 20 - i*10);
    createTriangle(timeFracs[i]%1, width, 100-i*15, lightness, peaksSVG);
  }
  requestAnimationFrame(() => updatePeaks(peaksSVG));
}

const gravity = 0.3;
const bounce = .99;
const restitution = 1.0;
const radius = 15;
const balls = [];
const timePoints = [1e3, 365, 24, 60, 60, 1000]
const svgNS = "http://www.w3.org/2000/svg";
const headings = document.querySelectorAll("h2");  
const canvas = document.getElementById("canvas");
let ctx;
let timeZoneName;
let now
let year, month, date, weekday, hour, minute, second, millisecond
let timeFracs = [];
let time = [];
let sides = [];
let binary;
getTime();
let emoji = "";
let title = ""
let randomColor;

//if (month === 9 && date === 31) {
if (month === 6 && date === 31) {
  emoji = " 🎃";
  title = "Happy halloween!";
  randomColor = halloweenColor;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Creepster&display=swap";
  document.head.appendChild(link);
  document.querySelectorAll('h1, h2, h3').forEach(el => {
    el.classList.add('halloween');
  });
} else if (month === 11 && date >= 24 && date <= 26) {
  emoji = " 🎄"; 
  title = "Merry Christmas!";
  randomColor = christmasColor;
} else if (month === 0 && date <= 3) {
  emoji = " 🎆"; 
  title = "Happy new year!";
  randomColor = newYearColor;
} else if (month === 1 && date === 14) {
  emoji = " 💘"; 
  title = "Happy Valentine's day!";
  randomColor = valentinesColor;
  document.querySelectorAll('h1, h2, h3').forEach(el => {
    el.classList.add('valentines');
  });
} else if (month === 5 && date === 28) {
  emoji = " 🌈"; 
  title = "Happy pride!";
  randomColor = prideColor;
} else if (month === 3 && date === 22) {
  emoji = " 🌎"; 
  title = "Happy Earth day!";
  randomColor = earthColor;
} else {
  randomColor = anyColor;
}

headings.forEach(h => {
  h.textContent += emoji;
  h.title = title;
});

let col = randomColor()
let hue;
if (col.startsWith("hsl(")) {
  hue = parseInt(col.match(/hsl\((\d+),/)[1], 10);
} else {
  hue = rgbToHue(col); 
}
const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
const lightness = prefersDark ? 70 : 30;
col = `hsl(${hue}, 30%, ${lightness}%)`;

if (canvas) {
  canvas.title = title
  ctx = canvas.getContext("2d");
  // Get the DPR and size of the canvas
  const dpr = window.devicePixelRatio;
  const rect = canvas.getBoundingClientRect();
  // Set the "actual" size of the canvas
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  // Scale the context to ensure correct drawing operations
  ctx.scale(dpr, dpr);
  // Set the "drawn" size of the canvas
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  //import { draw } from './balls.js';
  draw();
  canvas.addEventListener("click", function(e) {
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    balls.push(createBall(x, y));
  });
  document.addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
      balls.push(createBall(canvas.clientWidth / 2, canvas.clientHeight / 2));
    }
  });
}

document.querySelectorAll("svg.peaks").forEach(svg => {
  updatePeaks(svg);
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("preserveAspectRatio", "none");
});

document.querySelectorAll("svg.waves").forEach(svg => {
  updateWaves(svg);
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("preserveAspectRatio", "none");
});

document.querySelectorAll("path[data-min][data-max]").forEach(path => {
  const svg = path.closest("svg");
  if (svg) svg.setAttribute("viewBox", "0 0 100 100");
  const min = parseInt(path.dataset.min, 10);
  const max = parseInt(path.dataset.max, 10);
  generateBlobPath(path, min, max);
});

document.querySelectorAll("svg.poly").forEach(svg => {
  const path = svg.querySelector("path");
  const level = parseInt(path.dataset.level, 10);
  maskPolygon(svg,path,level);
  generatePolygonPath(svg, path, level);
  svg.setAttribute("viewBox", "0 0 100 100");
  setInterval(() => maskPolygon(svg, path, level), 1000);
  setInterval(() => generatePolygonPath(svg, path, level), 1000);
});

setInterval(() => {
  getTime();
  document.querySelectorAll("span[data-level]").forEach(span => {
    const level = parseInt(span.dataset.level, 10);
    span.textContent = " ("+time[level]+")";
  });
}, 1000);

if (document.getElementById("timeStr")) {
  updateTimeStr(); // Run on page load
  setInterval(updateTimeStr, 1000); // Update every second
}

document.querySelectorAll("svg.binaryClock").forEach(svg => {
  drawBinaryClock(svg);
  svg.setAttribute("viewBox", "0 0 31 1");
  setInterval(() => drawBinaryClock(svg), 1000);
});


document.querySelectorAll("svg.solar").forEach(svg => {
  
  function updateSolar(solTime) {
    earth.update(solTime);
    moon.update(solTime);
    const angle = ( earth.angle*180/Math.PI + 180 - 360*solTime/24/60/60/1000 ) % 360 
    stickFigure.setAttribute("transform", `translate(${earth.x.toFixed(1)}, ${earth.y.toFixed(1)}) rotate(${angle.toFixed(1)})`);
    datetimeInput.value = formatDateTime(solTime);
    document.querySelectorAll("span.tilt").forEach(span => {
      span.textContent = `${(23.4*Math.cos(earth.angle)).toFixed(2)}`;
    });
    //The Earth's tilt is <span class="tilt"></span>, the Moon is <span class="moonPhase"></span>, and <span class="currentZodiac"></span> is in the night sky.
  }
  const w = svg.getBoundingClientRect().width;
  const zodiac = ['♈︎','♉︎','♊︎','♋︎','♌︎','♍︎','♎︎','♏︎','♐︎','♑︎','♒︎','♓︎'];
  const zodiacGroup = document.createElementNS(svgNS, "g");
  zodiacGroup.setAttribute("class", "zodiac");
  svg.appendChild(zodiacGroup);
  zodiac.forEach((sign, i) => {
    const angle = -10 / 365.25 * 2 * Math.PI - (i - 2) / 12 * 2 * Math.PI;
    const x = .5 * w + .47 * w * Math.sin(angle);
    const y = .5 * w - .47 * w * Math.cos(angle);
    const text = document.createElementNS(svgNS, "text");
    text.setAttribute("x", x.toFixed(1));
    text.setAttribute("y", y.toFixed(1));
    text.textContent = sign;
    zodiacGroup.appendChild(text);
  });

  const earth = new CelestialBody({
    name: "Earth",
    radius: .04*w,
    orbitRadius: .3*w,
    orbitalPeriod: 365.256,
    orbitStartTime: Date.UTC(2025, 5, 21, 2, 42),
    orbits: null,
    svg,
  });

  const moon = new CelestialBody({
    name: "Moon",
    radius: .03*w,
    orbitRadius: .17*w,
    orbitalPeriod: 29.531,
    orbitStartTime: Date.UTC(2025, 7, 9, 7, 54),
    orbits: earth,
    svg,
  });
  
  const sun = document.createElementNS(svgNS, "circle");
  sun.setAttribute("fill","white")
  sun.setAttribute("transform", `translate(${.5*w}, ${.5*w})`);
  sun.setAttribute("r", .06*w)
  svg.appendChild(sun);

  const stickFigure = createStickFigure(svgNS, .4*moon.orbitRadius, earth.radius);
  svg.appendChild(stickFigure)
  const datetimeInput = document.getElementById("datetime");
  const playPauseBtn = document.querySelector(".playPauseBtn");

  let solTime = Date.now();  
  updateSolar(solTime);
  let playing = false;
  let animationId = null;

  // Play/pause toggle
  playPauseBtn.addEventListener("click", () => {
    playing = !playing;
    playPauseBtn.textContent = playing ? "Pause" : "Play";
    if (playing) {
      animationId = requestAnimationFrame(animationStep);
    } else {
      cancelAnimationFrame(animationId);
    }
  });

  // User input changes date/time, pause animation and update solTime
  datetimeInput.addEventListener("input", () => {
    playing = false;
    cancelAnimationFrame(animationId);
    playPauseBtn.textContent = "Play";
    const newTime = new Date(datetimeInput.value).getTime();
    if (!isNaN(newTime)) {
      solTime = newTime;
      updateSolar(solTime);
    }
  });

  // Pause when the input is focused (user is interacting)
  datetimeInput.addEventListener("focus", () => {
    playing = false;
    cancelAnimationFrame(animationId);
    playPauseBtn.textContent = "Play";
  });

  // Animation loop
  function animationStep(timestamp) {
    if (playing) {
      solTime += 1000*60*60;
      updateSolar(solTime);
      animationId = requestAnimationFrame(animationStep);
    }
  }
});

