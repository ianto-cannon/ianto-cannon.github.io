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

function generateBlobPath() {
  const radius = 20;
  const points = 40;
  const variation = 10;
  const path = [];
  const time = [hours/24, minutes/60, seconds/60]
  const r = new Array(points).fill(radius);
  for (let h = 2; h <= 4; h++) {
    const amp = variation / h;
    const phase = time[h-2] * 2 * Math.PI;
    for (let i = 0; i <= points; i++) {
      const theta = (i / points) * 2 * Math.PI;
      r[i] += amp * Math.sin(h * theta + phase);
    }
  }
  for (let i = 0; i < points; i++) {
    const theta = (i / points) * 2 * Math.PI;
    const x = 50 + r[i] * Math.cos(theta);
    const y = 50 + r[i] * Math.sin(theta);
    path.push(`${i === 0 ? "M" : "L"} ${x.toFixed(2)},${y.toFixed(2)}`);
  }
  blob.setAttribute("d", path.join(" ") + " Z");
  blob.setAttribute("fill", col);
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

function createTriangle(value, maxValue, width, height, svg) {
  //path.setAttribute("d", `M${width*(1-(value-5)/maxValue)},100 L${width*(1-value/maxValue)},${100-height} L${width*(1-(value+5)/maxValue)},100 Z`);
  for (let i = -1; i <= 1; i++) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("fill", `hsl(${hue}, 30%, ${110-height}%)`);
    path.setAttribute("d", `M${width*(value/maxValue-.5+i)},100 L${width*(value/maxValue+i)},${100-height} L${width*(value/maxValue+.5+i)},100 Z`);
    svg.appendChild(path);
  }
}

function updateWaves() {
  const svg = document.getElementById("wave-svg");
  const width = 100//svg.clientWidth;
  getTime();
  svg.innerHTML = "";
  createTriangle(year, 3000, width, 100, svg);
  createTriangle(month, 12, width, 90, svg);
  createTriangle(date, 31, width, 80, svg);
  createTriangle(hours, 24, width, 70, svg);
  createTriangle(minutes, 60, width, 60, svg);
  createTriangle(seconds, 60, width, 50, svg);
}

function createPolygon(value, maxValue, width, height, svg) {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", `hsl(340, 30%, ${110-height}%)`);
  //console.log('value',value)
  path.setAttribute("d", `M${width*(1-(value-5)/maxValue)},100 L${width*(1-value/maxValue)},${100-height} L${width*(1-(value+5)/maxValue)},100 Z`);
  svg.appendChild(path);
}

function updateUtcTime() {
  getTime();
  const utcString = `${year} ${monthStr} ${date} ${weekday} ${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
  document.getElementById("utc-time").textContent = `Current coordinated universal time (UTC): ${utcString}`;
}

function getTime() {
  now = new Date();
  year = now.getUTCFullYear();
  monthStr = now.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }); // Jul
  month = now.getUTCMonth(); // Jul
  date = now.getUTCDate()
  weekday = now.toLocaleString('en-US', { weekday: 'short', timeZone: 'UTC' }); // Thu
  hours = now.getUTCHours()
  minutes = now.getUTCMinutes()
  seconds = now.getUTCSeconds()
}

const gravity = 0.3;
const bounce = .99;
const restitution = 1.0;
const radius = 15;
const balls = [];
const headings = document.querySelectorAll("h2");  
const canvas = document.getElementById("canvas");
const blob = document.querySelector("#blob path");
let ctx;
let year, month, date, weekday, hours, minutes, seconds, milliseconds
getTime();
let emoji = "";
let title = ""

if (month === 9 && date === 31) {
  emoji = " 🎃";
  title = "Happy halloween!";
  randomColor = halloweenColor;
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

if (document.getElementById("wave-svg")) {
  getTime();
  updateWaves();
  setInterval(updateWaves, 1000);
}
if (blob) {
  generateBlobPath();
  setInterval(generateBlobPath, 1000);
}

if (document.getElementById("utc-time")) {
  updateUtcTime(); // Run once on page load
  setInterval(updateUtcTime, 1000); // Update every second
}
