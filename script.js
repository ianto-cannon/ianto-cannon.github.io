function anyColor() {
  const r = Math.floor(Math.random() * 200 + 30);
  const g = Math.floor(Math.random() * 200 + 30);
  const b = Math.floor(Math.random() * 200 + 30);
  return `rgb(${r}, ${g}, ${b})`;
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

function createBall(x, y) {
  return {
    x,
    y,
    vx: (Math.random() - 0.5) * 6,
    vy: (Math.random() - 0.5) * 6,
    color: randomColor()
  };
}

function resolveCollision(ballA, ballB) {
  const dx = ballB.x - ballA.x;
  const dy = ballB.y - ballA.y;
  const dist = Math.hypot(dx, dy);

  if (dist === 0 || dist > 2 * radius) return;

  // Unit normal vectors
  const nx = dx / dist;
  const ny = dy / dist;

  // Dot product normal
  const dpNormA = ballA.vx * nx + ballA.vy * ny;
  const dpNormB = ballB.vx * nx + ballB.vy * ny;
  
  if (dpNormB >= dpNormA) return;

  // Unit tangent vectors
  const tx = -ny;
  const ty = nx;

  // Dot product tangential
  const dpTanA = ballA.vx * tx + ballA.vy * ty;
  const dpTanB = ballB.vx * tx + ballB.vy * ty;

  // Elastic collision (equal mass)
  const mA = restitution * dpNormB;
  const mB = restitution * dpNormA;

  ballA.vx = tx * dpTanA + nx * mA;
  ballA.vy = ty * dpTanA + ny * mA;
  ballB.vx = tx * dpTanB + nx * mB;
  ballB.vy = ty * dpTanB + ny * mB;

  // Push them apart to avoid overlap
  const overlap = 2 * radius - dist;
  ballA.x -= nx * overlap / 2;
  ballA.y -= ny * overlap / 2;
  ballB.x += nx * overlap / 2;
  ballB.y += ny * overlap / 2;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < balls.length; i++) {
    const ball = balls[i];

    // Draw ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.fill();
    ctx.closePath();

    // Apply gravity and movement in two steps to minimize energy loss
    ball.x += ball.vx;
    ball.vy += .5*gravity;
    ball.y += .5*ball.vy;
    ball.vy += .5*gravity;
    ball.y += .5*ball.vy;

    // Wall collisions
    if (ball.y + radius > canvas.height && ball.vy > 0) {
      ball.y = canvas.height - radius;
      ball.vy *= -bounce;
    }
    if (ball.y - radius < 0 && ball.vy < 0) {
      ball.y = radius;
      ball.vy *= -bounce;
    }
    if (ball.x - radius < 0 && ball.vx < 0) {
      ball.x = radius;
      ball.vx *= -bounce;
    }
    if (ball.x + radius > canvas.width && ball.vx > 0) {
      ball.x = canvas.width - radius;
      ball.vx *= -bounce;
    }

    // Check collisions with other balls
    for (let j = i + 1; j < balls.length; j++) {
      resolveCollision(balls[i], balls[j]);
    }
  }
  requestAnimationFrame(draw);
}

function generatePolygonPath(path, level) {
  getTime(); 
  const pathStr = [`M50,50 `];
  for (let i = 1; i <= sides[level]; i++) {
    const theta = (i + time[level])/ sides[level] * 2 * Math.PI;
    const x = 50 + 50 * Math.sin(theta);
    const y = 50 - 50 * Math.cos(theta);
    pathStr.push(`L${x.toFixed(2)},${y.toFixed(2)}`);
  }
  path.setAttribute("d", pathStr.join(" ") + " Z");
  path.setAttribute("fill", col);
}

function maskPolygon(svg,path,level){
  // Create defs and mask
  const defs = document.createElementNS(svgNS, "defs");
  const mask = document.createElementNS(svgNS, "mask");
  const maskId = `mask-lines-${level}`;
  mask.setAttribute("id", maskId);
  // Full white background (visible)
  const rect = document.createElementNS(svgNS, "rect");
  rect.setAttribute("x", "0");
  rect.setAttribute("y", "0");
  rect.setAttribute("width", "100");
  rect.setAttribute("height", "100");
  rect.setAttribute("fill", "white");
  mask.appendChild(rect);
  // Add black lines (transparent in mask)
  for (let i = 1; i <= sides[level]; i++) {
    const theta = (i + time[level])/ sides[level] * 2 * Math.PI;
    const x = 50 + 50 * Math.sin(theta);
    const y = 50 - 50 * Math.cos(theta);
    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", 50);
    line.setAttribute("y1", 50);
    line.setAttribute("x2", x);
    line.setAttribute("y2", y);
    line.setAttribute("stroke", "black");
    line.setAttribute("stroke-width", 1);
    mask.appendChild(line);
  }
  defs.appendChild(mask);
  svg.insertBefore(defs, svg.firstChild);
  // Apply mask to path
  path.setAttribute("mask", `url(#${maskId})`);
}

function generateBlobPath(blo,wavMin,wavMax) {
  getTime(); // Run once on page load
  const radius = 20;
  const points = 50;
  const variation = 10;
  const path = [];
  const r = new Array(points).fill(radius);
  for (let h = wavMin; h <= wavMax; h++) {
    const amp = variation / (h+1);
    const phase = timeFracs[h-1] * 2 * Math.PI;
    for (let i = 0; i <= points; i++) {
      const theta = (i / points) * 2 * Math.PI;
      r[i] += amp * Math.cos((h+1) * theta - phase);
    }
  }
  for (let i = 0; i < points; i++) {
    const theta = (i / points) * 2 * Math.PI;
    const x = 50 + r[i] * Math.sin(theta);
    const y = 50 - r[i] * Math.cos(theta);
    path.push(`${i === 0 ? "M" : "L"} ${x.toFixed(2)},${y.toFixed(2)}`);
  }
  blo.setAttribute("d", path.join(" ") + " Z");
  blo.setAttribute("fill", col);
  //console.log('wavMin',wavMin)
  if (wavMax>3) {
    requestAnimationFrame(() => generateBlobPath(blo, wavMin, wavMax));
  }
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

function createWave(t, width, height, lightness, wavesSVG) {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", `hsl(${hue}, 30%, ${lightness}%)`);
  const xrev = 1 - t 
  const pathStr = [];
  for (let i = -5; i <= 5; i++) {
    const x = width * (xrev + .25*i);
    let y = 80;
    if (i === -5) {
      pathStr.push(`M`);
      pathStr.push(`${x.toFixed(2)},100 `);
      pathStr.push(`L`);
    } if (i%2 === 0) {
      pathStr.push(`Q`);
      y = 80 + height;
    } if (i%4 === 0) {
      y = 80 - height;
    }
    pathStr.push(`${x.toFixed(2)},${y.toFixed(2)} `);
    if (i === 5) {
      pathStr.push(`L`);
      pathStr.push(`${x.toFixed(2)},100 `);
      pathStr.push(`Z`);
    }
  }
  path.setAttribute("d", pathStr.join(" "));
  wavesSVG.appendChild(path);
}

function createTriangle(value, width, height, lightness, peaksSVG) {
  for (let i = -1; i <= 1; i++) {
    const left = width*(.5-value+i)
    const mid = width*(1-value+i)
    const right = width*(1.5-value+i)
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("fill", `hsl(${hue}, 30%, ${lightness}%)`);
    path.setAttribute("d", `M${left.toFixed(1)},100 L${mid.toFixed(1)},${100-height} L${right.toFixed(1)},100 Z`);
      peaksSVG.appendChild(path);
  }
}

function createToothedTriangle(value, points, width, height, lightness, peaksSVG) {
  for (let i = -1; i <= 1; i++) {
    const left = width*(.5-value+i)
    const mid = width*(1-value+i)
    const right = width*(1.5-value+i)
    for (let j = 1; j <= points; j++) {
      const l = left + width*j/points
      const m = l + width/points/2
      const r = l + width/points
      const h = 2*height * Math.min(j/points, 1-j/points)
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("fill", `hsl(${hue}, 30%, ${lightness}%)`);
      path.setAttribute("d", `M${l.toFixed(1)},100 L${m.toFixed(1)},${100-h} L${r.toFixed(1)},100 Z`);
      peaksSVG.appendChild(path);
    }
  }
}

function updatePeaks(peaksSVG, wavesSVG) {
  while (peaksSVG.firstChild) {
    peaksSVG.removeChild(peaksSVG.firstChild);
  }
  while (wavesSVG.firstChild) {
    wavesSVG.removeChild(wavesSVG.firstChild);
  }
  const width = 100;//peaksSVG.clientWidth;
  getTime();
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  for (let i = 0; i <= 4; i++) {
    const lightness = prefersDark ? (20 + i*10) : (100 - 20 - i*10);
    //createToothedTriangle(time[i]%1, timePoints[i], width, 70-i*10, lightness, peaksSVG);
    createTriangle(timeFracs[i]%1, width, 70-i*10, lightness, peaksSVG);
    createWave(    timeFracs[i]%1, width, 70-i*10, lightness, wavesSVG);
  }
  //console.log('peaksSVG',peaksSVG)
  requestAnimationFrame(() => updatePeaks(peaksSVG, wavesSVG));
}

function updateTimeStr() {
  getTime();
  console.log('second',second)
  document.getElementById("utc-time").textContent = `${year} ${monthStr} ${date} ${weekday} ${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:${String(second).padStart(2,'0')}`;
}

function getTime() {
  now = new Date();
  year = now.getUTCFullYear();
  monthStr = now.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }); // Jul
  month = now.getUTCMonth(); //Jan=0, Feb=1...
  date = now.getUTCDate();

  //get the week number this month
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const firstDay = (firstOfMonth.getUTCDay() + 6) % 7; // Monday = 0
  const week = Math.floor((firstDay + date - 1) / 7) + 1;
  
  weekday = now.toLocaleString('en-US', { weekday: 'short', timeZone: 'UTC' }); // Thu
  wkday = now.getUTCDay(); //Sun=0, Mon=1...
  hour = now.getUTCHours();
  minute = now.getUTCMinutes();
  second = now.getUTCSeconds();
  millisecond = now.getUTCMilliseconds();
  time= [Math.floor(year/10), year%10, month, week, wkday, hour, Math.floor(minute/10), minute%10, Math.floor(second/10), second%10];
  const secFrac = millisecond/1000;
  const minFrac = (second + secFrac)/60;
  const hrFrac  = (minute + minFrac)/60;
  const dayFrac = (hour + hrFrac)/24;

  //get the day number this year
  const start = Date.UTC(year, 0, 0); // Jan 0 UTC
  const oneDay = 1000 * 60 * 60 * 24;
  const days = Math.floor((now - start) / oneDay);

  const yrFrac = (days + dayFrac)/365.25;
  const milFrac = (year + yrFrac)/1000;
  timeFracs = [milFrac, yrFrac, dayFrac, hrFrac, minFrac, secFrac];
}

const gravity = 0.3;
const bounce = .99;
const restitution = 1.0;
const radius = 15;
const balls = [];
const timePoints = [1e3, 365, 24, 60, 60, 1000]
const sides = [10, 10, 12, 6, 7, 24, 6, 10, 6, 10]
const headings = document.querySelectorAll("h2");  
const canvas = document.getElementById("canvas");
let ctx;
let year, month, date, weekday, hour, minute, second, millisecond
let timeFracs = [];
let time = [];
getTime();
let emoji = "";
let title = ""

if (month === 9 && date === 31) {
  emoji = " 🎃";
  title = "Happy halloween!";
  randomColor = halloweenColor;
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
const col = randomColor()
const hue = rgbToHue(col)

if (canvas) {
  canvas.title = title
  ctx = canvas.getContext("2d");
  draw();
  canvas.addEventListener("click", function(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    balls.push(createBall(x, y));
  });
  document.addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
      balls.push(createBall(canvas.width / 2, canvas.height / 2));
    }
  });
}

const peaksSVG = document.getElementById("peaksSVG");
const wavesSVG = document.getElementById("wavesSVG");
if (peaksSVG && wavesSVG) {
  updatePeaks(peaksSVG,wavesSVG);
}

document.querySelectorAll("path[data-min][data-max]").forEach(path => {
  const min = parseInt(path.dataset.min, 10);
  const max = parseInt(path.dataset.max, 10);
  generateBlobPath(path, min, max);
});

const svgNS = "http://www.w3.org/2000/svg";
document.querySelectorAll("svg").forEach((svg, idx) => {
  const path = svg.querySelector("path");
//document.querySelectorAll("path[data-level]").forEach(path => {
  const level = parseInt(path.dataset.level, 10);
  maskPolygon(svg,path,level);
  generatePolygonPath(path, level);
  setInterval(() => generatePolygonPath(path, level), 1000);
});

setInterval(() => {
  getTime();
  document.querySelectorAll("span[data-level]").forEach(span => {
    const level = parseInt(span.dataset.level, 10);
    span.textContent = " ("+time[level]+")";
  });
}, 1000);

if (document.getElementById("utc-time")) {
  updateTimeStr(); // Run on page load
  setInterval(updateTimeStr, 1000); // Update every second
}
