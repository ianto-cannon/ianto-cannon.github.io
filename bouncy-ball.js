const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const gravity = 0.3;
const bounce = .99;
const restitution = 1.0;
const radius = 15;
const balls = [];

const heading = document.getElementById("ball-heading");
const now = new Date();
const month = now.getMonth(); // 0 = Jan, 11 = Dec
const date = now.getDate();

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

if (month === 9 && date === 31) {
  heading.textContent += " 🎃";
  canvas.title = heading.title = "Happy halloween!";
  randomColor = halloweenColor;
//} else if (month === 11 && date >= 24 && date <= 26) {
} else if (month === 6 && date === 22) {
  heading.textContent += " 🎄"; 
  canvas.title = heading.title = "Merry Christmas!";
  randomColor = christmasColor;
} else if (month === 0 && date <= 3) {
  heading.textContent += " 🎆"; 
  canvas.title = heading.title = "Happy new year!";
  randomColor = newYearColor;
} else if (month === 1 && date === 14) {
  heading.textContent += " 💘"; 
  canvas.title = heading.title = "Happy Valentine's day!";
  randomColor = valentinesColor;
} else if (month === 5 && date === 28) {
  heading.textContent += " 🌈"; 
  canvas.title = heading.title = "Happy pride!";
  randomColor = prideColor;
} else if (month === 3 && date === 22) {
  heading.textContent += " 🌎"; 
  canvas.title = heading.title = "Happy Earth day!";
  randomColor = earthColor;
} else {
  randomColor = anyColor;
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
draw();
