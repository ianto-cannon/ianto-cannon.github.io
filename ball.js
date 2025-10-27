const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
if (!reduceMotion.matches) {
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    document.querySelectorAll('.portrait-box').forEach(box => {
      box.querySelector('.portrait-bg').style.transform = `translateY(${.05*window.scrollY}px)`;
    });
  });
}
const addLink = (li) => {
  document.querySelectorAll("input.phone").forEach(honeypot=> {
    if (honeypot.value.trim() !== "") return;
  });
  li.innerHTML = `Say hi at <a href="mailto:
     &#105;&#97;&#110;&#116;&#1`+`11;&#46;&#99;&#97;&#110;&#110;`+`&#111;&#110;&#64;&#1`+`03;&#109;&#97;&#105;`+`&#108;&#46;&#99;&#111;&#109;
     ">
     &#105;&#97;&#110;&#116;&`+`#111;&#46;&#99;&#9`+`7;&#110;&#110;&#11`+`1;&#110;&#64;&#103`+`;&#109;&#97;&#105;&#108;&#46`+`;&#99;&#111;&#109;</a>`
};
const gravity = 0.3;
const bounce = 0.99;
const restitution = 1.0;
const radius = 15;
const resolveCollision = (ballA, ballB) => {
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
};
document.querySelectorAll("svg.ball-box").forEach(svg => {
  svg.innerHTML = '';
  const balls = [];
  const createBall = (x, y) => {
    const ball = {
      x,
      y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      color: randomColor(),
      elem: document.createElementNS(svgNS, "circle")
    };
    ball.elem.setAttribute("r", radius);
    ball.elem.setAttribute("fill", ball.color);
    svg.appendChild(ball.elem);
    document.querySelectorAll("li.contact").forEach(li => {
      if (li.innerHTML.includes("Say")) return; //don't modify this li
      addLink(li);
    });
    return ball;
  };
  const updateBalls = () => {
    for (let i = 0; i < balls.length; i++) {
      const ball = balls[i];
      ball.x += ball.vx;
      ball.vy += 0.5 * gravity;
      ball.y += 0.5 * ball.vy;
      ball.vy += 0.5 * gravity;
      ball.y += 0.5 * ball.vy;
      if (ball.y + radius > svg.clientHeight && ball.vy > 0) {
        ball.y = svg.clientHeight - radius;
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
      if (ball.x + radius > svg.clientWidth && ball.vx > 0) {
        ball.x = svg.clientWidth - radius;
        ball.vx *= -bounce;
      }
      for (let j = i + 1; j < balls.length; j++) {
        resolveCollision(ball, balls[j]);
      }
      ball.elem.setAttribute("cx", ball.x.toFixed(2));
      ball.elem.setAttribute("cy", ball.y.toFixed(2));
    }
    requestAnimationFrame(updateBalls);
  };
  svg.addEventListener("click", (e) => {
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    balls.push(createBall(x, y));
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      balls.push(createBall(svg.clientWidth / 2, svg.clientHeight / 2));
    }
  });
  updateBalls(); // Start the animation loop
});
