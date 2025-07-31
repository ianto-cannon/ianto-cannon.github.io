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
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

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
    if (ball.y + radius > canvas.clientHeight && ball.vy > 0) {
      ball.y = canvas.clientHeight - radius;
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
    if (ball.x + radius > canvas.clientWidth && ball.vx > 0) {
      ball.x = canvas.clientWidth - radius;
      ball.vx *= -bounce;
    }

    // Check collisions with other balls
    for (let j = i + 1; j < balls.length; j++) {
      resolveCollision(balls[i], balls[j]);
    }
  }
  requestAnimationFrame(draw);
}


