var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
if (!reduceMotion || !reduceMotion.matches) {
  window.addEventListener('scroll', function() {
    var portraitBoxes = document.querySelectorAll('.portrait-box');
    for (var i = 0; i < portraitBoxes.length; i++) {
      var bg = portraitBoxes[i].querySelector('.portrait-bg');
      if (bg) bg.style.transform = "translateY(" + (.1 * window.scrollY) + "px)";
    }
  });
}

function addLink(li) {
  var phones = document.querySelectorAll("input.phone");
  for (var i = 0; i < phones.length; i++) { if (phones[i].value.trim() !== "") return; }
  li.innerHTML = 'Say hi at <a href="mailto:&#105;&#97;&#110;&#116;&#1' + '11;&#46;&#99;&#97;&#110;&#110;' + '&#111;&#110;&#64;&#1' + '03;&#109;&#97;&#105;' + '&#108;&#46;&#99;&#111;&#109;">&#105;&#97;&#110;&#116;&' + '#111;&#46;&#99;&#9' + '7;&#110;&#110;&#11' + '1;&#110;&#64;&#103' + ';&#109;&#97;&#105;&#108;&#46' + ';&#99;&#111;&#109;</a>';
}

var gravity = 0.3, bounce = 0.99, restitution = 1.0, radius = 15;

function resolveCollision(ballA, ballB) {
  var dx = ballB.x - ballA.x, dy = ballB.y - ballA.y;
  var dist = Math.sqrt(dx * dx + dy * dy); // Math.hypot polyfill
  if (dist === 0 || dist > 2 * radius) return;
  var nx = dx / dist, ny = dy / dist;
  var dpNormA = ballA.vx * nx + ballA.vy * ny, dpNormB = ballB.vx * nx + ballB.vy * ny;
  if (dpNormB >= dpNormA) return;
  var tx = -ny, ty = nx;
  var dpTanA = ballA.vx * tx + ballA.vy * ty, dpTanB = ballB.vx * tx + ballB.vy * ty;
  var mA = restitution * dpNormB, mB = restitution * dpNormA;
  ballA.vx = tx * dpTanA + nx * mA; ballA.vy = ty * dpTanA + ny * mA;
  ballB.vx = tx * dpTanB + nx * mB; ballB.vy = ty * dpTanB + ny * mB;
  var overlap = 2 * radius - dist;
  ballA.x -= nx * overlap / 2; ballA.y -= ny * overlap / 2;
  ballB.x += nx * overlap / 2; ballB.y += ny * overlap / 2;
}

var ballSvgs = document.querySelectorAll("svg.ball-box");
for (var s = 0; s < ballSvgs.length; s++) {
  (function(svg) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var balls = [];
    var createBall = function(x, y) {
      var ball = {
        x: x, y: y,
        vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6,
        color: randomColor(), elem: document.createElementNS(svgNS, "circle")
      };
      ball.elem.setAttribute("r", radius);
      ball.elem.setAttribute("fill", ball.color);
      svg.appendChild(ball.elem);
      var contacts = document.querySelectorAll("li.contact");
      for (var i = 0; i < contacts.length; i++) {
        if (contacts[i].innerHTML.indexOf("Say") !== -1) continue;
        addLink(contacts[i]);
      }
      return ball;
    };
    
    var updateBalls = function() {
      for (var i = 0; i < balls.length; i++) {
        var ball = balls[i];
        ball.x += ball.vx; ball.vy += 0.5 * gravity; ball.y += 0.5 * ball.vy;
        ball.vy += 0.5 * gravity; ball.y += 0.5 * ball.vy;
        if (ball.y + radius > svg.clientHeight && ball.vy > 0) { ball.y = svg.clientHeight - radius; ball.vy *= -bounce; }
        if (ball.y - radius < 0 && ball.vy < 0) { ball.y = radius; ball.vy *= -bounce; }
        if (ball.x - radius < 0 && ball.vx < 0) { ball.x = radius; ball.vx *= -bounce; }
        if (ball.x + radius > svg.clientWidth && ball.vx > 0) { ball.x = svg.clientWidth - radius; ball.vx *= -bounce; }
        for (var j = i + 1; j < balls.length; j++) resolveCollision(ball, balls[j]);
        ball.elem.setAttribute("cx", ball.x.toFixed(2));
        ball.elem.setAttribute("cy", ball.y.toFixed(2));
      }
      if (window.requestAnimationFrame) window.requestAnimationFrame(updateBalls);
      else setTimeout(updateBalls, 1000/60);
    };
    
    svg.addEventListener("click", function(e) {
      var rect = svg.getBoundingClientRect();
      balls.push(createBall(e.clientX - rect.left, e.clientY - rect.top));
    });
    document.addEventListener("keydown", function(e) {
      if (e.keyCode === 13) balls.push(createBall(svg.clientWidth / 2, svg.clientHeight / 2));
    });
    updateBalls();
  })(ballSvgs[s]);
}
