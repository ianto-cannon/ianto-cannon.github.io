function generatePolygonPath(svg, path, level) {
  getTime();
  const pathStr = [`M50,50 `];
  for (let i = 0; i <= time[level]; i++) {
    const theta = i/ sides[level] * 2 * Math.PI;
    const x = 50 + 50 * Math.sin(theta);
    const y = 50 - 50 * Math.cos(theta);
    pathStr.push(`L${x.toFixed(0)},${y.toFixed(0)}`);
  }
  path.setAttribute("d", pathStr.join(" ") + " Z");
  path.setAttribute("fill", colorScheme(hue));
}

function maskPolygon(svg,path,level){
  path.removeAttribute("mask");
  const oldDefs = svg.querySelector("defs");
  if (oldDefs) svg.removeChild(oldDefs);
  const defs = document.createElementNS(svgNS, "defs");
  const mask = document.createElementNS(svgNS, "mask");
  const maskId = `line${level}`;
  mask.setAttribute("id", maskId);
  mask.setAttribute("maskUnits", "userSpaceOnUse");
  // Full white background (visible)
  const rect = document.createElementNS(svgNS, "path");
  rect.setAttribute("d", "M0 0 H100 V100 H0 Z");
  rect.setAttribute("fill", "white");
  mask.appendChild(rect);
  const maskLine = document.createElementNS(svgNS, "path");
  let d = "";
  for (let i = 1; i <= sides[level]; i++) {
    const theta = (i + time[level]) / sides[level] * 2 * Math.PI;
    const x = 50 + 50 * Math.sin(theta);
    const y = 50 - 50 * Math.cos(theta);
    d += `M50 50 L${x.toFixed(0)} ${y.toFixed(0)} `;
  }
  maskLine.setAttribute("d", d.trim());
  maskLine.setAttribute("stroke", "black");
  maskLine.setAttribute("fill", "none");
  mask.appendChild(maskLine);
  defs.appendChild(mask);
  svg.insertBefore(defs, svg.firstChild);
  path.setAttribute("mask", `url(#${maskId})`);
}

function generateBlobPath(blo,wavMin,wavMax) {
  getTime(); 
  const radius = 250;
  const points = 50;
  const variation = 150;
  const path = [];
  const r = new Array(points+1).fill(radius);
  const r2= new Array(points+1).fill(radius);
  for (let h = wavMin; h <= wavMax; h++) {
    const amp = variation / (h+1);
    const phase = timeFracs[h-1] * 2 * Math.PI;
    for (let i = 0; i <= points; i++) {
      const theta = i / points * 2 * Math.PI;
      r[i] += amp * Math.cos((h+1) * theta - phase);
      const thet2 = (i - .3) / points * 2 * Math.PI;
      r2[i] += amp * Math.cos((h+1) * thet2 - phase);
    }
  }
  let x1, x2;
  for (let i = 0; i <= points; i++) {
    const theta = i / points * 2 * Math.PI;
    const x = 500 + r[i] * Math.sin(theta);
    const y = 500 - r[i] * Math.cos(theta);
    const thet2 = (i - .3) / points * 2 * Math.PI;
    const x2 = 500 + r2[i] * Math.sin(thet2);
    const y2 = 500 - r2[i] * Math.cos(thet2);
    if (i === 0) {
      path.push(`M ${x.toFixed(0)},${y.toFixed(0)}`);
      x1 = 2*x - x2
      y1 = 2*y - y2
    } else if (i === 1) {
      path.push(`C ${x1.toFixed(0)},${y1.toFixed(0)} ${x2.toFixed(0)},${y2.toFixed(0)} ${x.toFixed(0)},${y.toFixed(0)}`);
    } else {
      path.push(`S ${x2.toFixed(0)},${y2.toFixed(0)} ${x.toFixed(0)},${y.toFixed(0)}`);
    }
  }
  blo.setAttribute("d", path.join(" ") + " Z");
  blo.setAttribute("fill", colorScheme(hue));
  requestAnimationFrame(() => generateBlobPath(blo, wavMin, wavMax));
}

function updateTimeStr() {
  getTime();
  document.getElementById("timeStr").textContent = `${year} ${monthStr} ${date} ${weekday} ${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:${String(second).padStart(2,'0')}`;
  document.querySelectorAll("span.timeZone").forEach(span => {
    span.textContent = `${timeZoneName}`;
  });
}


function drawBinaryClock(svg) {
  svg.innerHTML = ''; // Clear existing content
  const path = document.createElementNS(svgNS, "path");
  let d = "";
  for (let i = 0; i < 31; i++) {
    if (binary[i] === '1') {
      // Move to (i, 0), draw a 1x1 square clockwise
      d += `M${i},0 h1 v1 h-1 Z `;
    }
  }
  path.setAttribute("d", d.trim());
  path.setAttribute("fill", colorScheme(hue));
  svg.appendChild(path);
}


function createStickFigure(svgNS, size = 1, raise=0) {
  const g = document.createElementNS(svgNS, "g");

  // Head
  const head = document.createElementNS(svgNS, "circle");
  head.setAttribute("cx", 0);
  head.setAttribute("cy", raise + size);
  head.setAttribute("r", (.2 * size).toFixed(0));
  head.setAttribute("fill", "none");
  head.setAttribute("stroke", "currentColor");
  //head.setAttribute("stroke-width", 2);
  g.appendChild(head);

  // Body, arms, and legs as a single path
  const p = document.createElementNS(svgNS, "path");
  const yHead = raise + 0.5 * size;
  const yWaist = raise + 0.8 * size;
  const yArmTop = raise + 0.6 * size;
  const yArmBottom = raise + 0.95 * size;
  const yFoot = raise;
  const d = `
    M 0 ${yHead.toFixed(0)} L 0 ${yWaist.toFixed(0)}
    M -${(0.4 * size).toFixed(0)} ${yArmBottom.toFixed(0)} L 0 ${yArmTop.toFixed(0)} L ${(0.4 * size).toFixed(0)} ${yArmBottom.toFixed(0)}
    M -${(0.2 * size).toFixed(0)} ${yFoot.toFixed(0)} L 0 ${yHead.toFixed(0)} L ${(0.2 * size).toFixed(0)} ${yFoot.toFixed(0)}
  `.trim();
  p.setAttribute("d", d.replace(/\s+/g, " "));
  p.setAttribute("stroke", "currentColor");
  p.setAttribute("fill", "none");
  //p.setAttribute("stroke-width", 2);
  g.appendChild(p);
  return g;
}

class CelestialBody {
  constructor({ name, radius, orbitR, orbitalPeriod, orbitStartTime, orbits, svg, tilt, w}) {
    this.name = name;
    this.radius = radius;
    this.orbitR = orbitR;
    this.orbitalPeriod = orbitalPeriod;
    this.orbitStartTime = orbitStartTime;
    this.orbits = orbits;
    this.svg = svg;
    this.tilt = tilt;
    this.w = w;

    this.group = document.createElementNS(svgNS, "g");

    //this.orbitCircle = document.createElementNS(svgNS, "circle");
    //this.orbitCircle.setAttribute("r", orbitR);
    //this.orbitCircle.setAttribute("fill", "none");
    //this.orbitCircle.setAttribute("stroke", "currentColor");
    //this.orbitCircle.setAttribute("stroke-width", .2);
    
    // Outline
    this.outline = document.createElementNS(svgNS, "circle");
    this.outline.setAttribute("r", radius);
    this.group.appendChild(this.outline); 

    //Put colors in the Earth's orbit
    if (!this.orbits) {
      this.outline.setAttribute("stroke", "currentColor");
      //this.outline.setAttribute("stroke-width", 2);
      this.outline.setAttribute("fill", "none");
      const defs = svg.insertBefore(document.createElementNS(svgNS, "defs"), svg.firstChild);
      const maskId = "orbit";
      defs.innerHTML = `
        <mask id="${maskId}">
          <rect x="0" y="0" width="${this.w}" height="${this.w}" fill="black"/>
          <circle cx="${.5 * this.w}" cy="${.5 * this.w}" r="${orbitR}" fill="white"/>
        </mask>
      `;
      for (let i = -3; i <= 3; i++) {
        const y = 0.5 * this.w + orbitR * i * 10 / this.tilt;
        const h = orbitR * 10 / this.tilt;
        const d = `M0,${y.toFixed(0)} h${this.w} v${h.toFixed(0)} h-${this.w} Z`;

        const path = document.createElementNS(svgNS, "path");
        path.setAttribute("d", d);
        path.setAttribute("fill", `hsl(${hue}, 30%, ${50 - 10 * i}%)`);
        path.setAttribute("mask", `url(#${maskId})`);
        svg.appendChild(path);
      }
    } else {
      this.outline.setAttribute("fill", `hsl(${hue}, 30%, 20%)`);
      this.lit = document.createElementNS(svgNS, "path");
      this.lit.setAttribute("fill", `hsl(${hue}, 30%, 80%)`);
      this.group.appendChild(this.lit);
    }
    //svg.appendChild(this.orbitCircle);
    svg.appendChild(this.group);
  }

  update(solTime) {
    const cx = this.orbits ? this.orbits.x : this.w/2;
    const cy = this.orbits ? this.orbits.y : this.w/2;
    const parentAngle = this.orbits ? this.orbits.angle : 0;
    this.angle = parentAngle - 2 * Math.PI * (solTime - this.orbitStartTime) / 24 / 60 / 60 / 1000 / this.orbitalPeriod;
    this.x = cx + this.orbitR * Math.sin(this.angle);
    this.y = cy - this.orbitR * Math.cos(this.angle);

    // Position the group
    this.group.setAttribute("transform", `translate(${this.x.toFixed(3)}, ${this.y.toFixed(3)})`);

    if (this.lit) {
      // Calculate angle to sun (center)
      //const dx = this.x - this.w/2;
      //const dy = this.y - this.w/2;
      const dx = this.orbits.x - this.w/2;
      const dy = this.orbits.y - this.w/2;
      const sunAngle = Math.atan2(dy, dx);

      // Lit hemisphere (semi-circle arc path)
      const r = this.radius;
      const path = describeLitHemisphere(r, sunAngle);
      this.lit.setAttribute("d", path);
    }
    //this.orbitCircle.setAttribute("cx", cx.toFixed(1));
    //this.orbitCircle.setAttribute("cy", cy.toFixed(1));
  }
}

// Create a semi-circle path facing the sun
function describeLitHemisphere(r, angle) {
  const x0 = r * Math.cos(angle + Math.PI/2);
  const y0 = r * Math.sin(angle + Math.PI/2);
  const x1 = r * Math.cos(angle - Math.PI/2);
  const y1 = r * Math.sin(angle - Math.PI/2);
  return `M ${x0.toFixed(3)},${y0.toFixed(3)} A ${r.toFixed(0)},${r.toFixed(0)} 0 0,1 ${x1.toFixed(3)},${y1.toFixed(3)} L 0,0 Z`;
}

// Format date to YYYY-MM-DDTHH:MM
function pad(n) {
  return n.toString().padStart(2, '0');
}
function formatDateTime(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

document.querySelectorAll("path[data-min][data-max]").forEach(path => {
  const svg = path.closest("svg");
  if (svg) svg.setAttribute("viewBox", "0 0 1000 1000");
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
    stickFigure.setAttribute("transform", `translate(${earth.x.toFixed(1)}, ${earth.y.toFixed(1)}) rotate(${angle.toFixed(2)})`);
    datetimeInput.value = formatDateTime(solTime);
    document.querySelectorAll("span.tilt").forEach(span => {
      span.textContent = `${(earth.tilt*Math.cos(earth.angle)).toFixed(1)}`;
    });
    const offset = -10 / earth.orbitalPeriod * 2 * Math.PI;
    const j = (Math.round(12 * ((offset - earth.angle) / (2 * Math.PI)) + 2) + 12) % 12;
    document.querySelectorAll("span.currentZodiac").forEach(span => {
      span.textContent = zodiacName[j] + ' ' + zodiac[j];
    });
   const i = ((((moon.angle - earth.angle) * 4 / Math.PI + 0.5) % 8) + 8) % 8;
   document.querySelectorAll("span.moonPhase").forEach(span => {
      span.textContent = phases[Math.floor(i)];
    });
    const waxing = Math.sin(moon.angle - earth.angle) >= 0 ? 1 : 0;
    crescent = Math.cos(moon.angle - earth.angle)
    const leftTerminator = crescent*Math.sin(moon.angle - earth.angle) >= 0 ? 1 : 0;
    lightSide.setAttribute("d", 
      `M ${(.4*w).toFixed(0)} ${(w/2 + earth.orbitR).toFixed(0)}`
      + `A ${(crescent*earth.orbitR).toFixed(1)} ${earth.orbitR.toFixed(0)} 0 0 ${leftTerminator} `
      + `${(.4*w).toFixed(0)} ${(w/2 - earth.orbitR).toFixed(0)}`
      + `A ${(1*earth.orbitR).toFixed(0)} ${earth.orbitR.toFixed(0)} 0 0 ${waxing} `
      + `${(.4*w).toFixed(0)} ${(w/2 + earth.orbitR).toFixed(0)}`
    );
  }
  
  const w = 500//svg.getBoundingClientRect().width;
  svg.setAttribute("viewBox", `0 0 ${w} ${w}`);
  const phases = ['full','waxing gibbous',"in its first quarter",'a waxing crescent','new','a waning crescent',"in its last quarter",'waning gibbous'];
  const zodiac = ['♈︎','♉︎','♊︎','♋︎','♌︎','♍︎','♎︎','♏︎','♐︎','♑︎','♒︎','♓︎'];
  const zodiacName = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const zodiacGroup = document.createElementNS(svgNS, "g");
  zodiacGroup.setAttribute("class", "zodiac");
  svg.appendChild(zodiacGroup);

  const earth = new CelestialBody({
    name: "Earth",
    radius: .04*w,
    orbitR: .3*w,
    orbitalPeriod: 365.256,
    orbitStartTime: Date.UTC(2025, 5, 21, 2, 42),
    orbits: null,
    svg,
    tilt: 23.44,
    w: w
  });

  const moon = new CelestialBody({
    name: "Moon",
    radius: .03*w,
    orbitR: .17*w,
    orbitalPeriod: 29.531,
    orbitStartTime: Date.UTC(2025, 7, 9, 7, 54),
    orbits: earth,
    svg,
    tilt: 0,
    w: w
  });

  zodiac.forEach((sign, i) => {
    const angle = -10 / earth.orbitalPeriod * 2 * Math.PI - (i + 4) / 12 * 2 * Math.PI;
    const x = .5 * w + .47 * w * Math.sin(angle);
    const y = .5 * w - .47 * w * Math.cos(angle);
    const text = document.createElementNS(svgNS, "text");
    text.setAttribute("x", x.toFixed(0));
    text.setAttribute("y", y.toFixed(0));
    text.textContent = sign;
    zodiacGroup.appendChild(text);
  });
  
  const sun = document.createElementNS(svgNS, "circle");
  sun.setAttribute("fill","white")
  sun.setAttribute("transform", `translate(${.5*w}, ${.5*w})`);
  sun.setAttribute("r", .06*w)
  svg.appendChild(sun);
  
  svgLunar = document.querySelector("svg.lunar")
  svgLunar.setAttribute("viewBox", `0 0 ${.8*w} ${w}`);
  const darkSide = document.createElementNS(svgNS, "circle");
  darkSide.setAttribute("cx", (.4*w).toFixed(0));
  darkSide.setAttribute("cy", (w/2).toFixed(0));
  darkSide.setAttribute("r", earth.orbitR.toFixed(0) );
  darkSide.setAttribute("fill", `hsl(${hue}, 30%, 20%)`);
  svgLunar.appendChild(darkSide);
  const lightSide = document.createElementNS(svgNS, "path");
  lightSide.setAttribute("fill", `hsl(${hue}, 30%, 80%)`);
  svgLunar.appendChild(lightSide);

  const stickFigure = createStickFigure(svgNS, .3*moon.orbitR, earth.radius);
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
      solTime += 1000*60*20;
      updateSolar(solTime);
      animationId = requestAnimationFrame(animationStep);
    }
  }
});
