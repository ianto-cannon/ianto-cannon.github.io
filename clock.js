const colorScheme = (hue) => {
  const lightness = darkMode ? 70 : 30;
  return `hsl(${hue}, 30%, ${lightness}%)`;
};

const generatePolygonPath = (svg, path, level) => {
  getTime();
  const pathStr = [`M50,50 `];
  for (let i = 0; i <= time[level]; i++) {
    const theta = i / sides[level] * 2 * Math.PI;
    const x = 50 + 50 * Math.sin(theta);
    const y = 50 - 50 * Math.cos(theta);
    pathStr.push(`L${x.toFixed(0)},${y.toFixed(0)}`);
  }
  path.setAttribute("d", pathStr.join(" ") + " Z");
  path.setAttribute("fill", colorScheme(hue));
};

const maskPolygon = (svg, path, level) => {
  path.removeAttribute("mask");
  
  // Check if mask already exists to prevent DOM thrashing
  let mask = svg.querySelector(`#line${level}`);
  let maskLine;

  if (!mask) {
    const oldDefs = svg.querySelector("defs");
    if (oldDefs) svg.removeChild(oldDefs); // Only remove if creating fresh

    const defs = document.createElementNS(svgNS, "defs");
    mask = document.createElementNS(svgNS, "mask");
    mask.setAttribute("id", `line${level}`);
    mask.setAttribute("maskUnits", "userSpaceOnUse");
    
    const rect = document.createElementNS(svgNS, "path");
    rect.setAttribute("d", "M0 0 H100 V100 H0 Z");
    rect.setAttribute("fill", "white");
    mask.appendChild(rect);

    maskLine = document.createElementNS(svgNS, "path");
    maskLine.setAttribute("stroke", "black");
    maskLine.setAttribute("fill", "none");
    mask.appendChild(maskLine);

    defs.appendChild(mask);
    svg.insertBefore(defs, svg.firstChild);
  } else {
    // Reuse existing mask line
    maskLine = mask.querySelector("path[stroke='black']");
  }

  // Update only the 'd' attribute
  let d = "";
  for (let i = 1; i <= sides[level]; i++) {
    const theta = (i + time[level]) / sides[level] * 2 * Math.PI;
    const x = 50 + 50 * Math.sin(theta);
    const y = 50 - 50 * Math.cos(theta);
    d += `M50 50 L${x.toFixed(0)} ${y.toFixed(0)} `;
  }
  maskLine.setAttribute("d", d.trim());
  path.setAttribute("mask", `url(#line${level})`);
};

const generateBlobPath = (blo, wavMin, wavMax) => {
  getTime();
  const radius = 250;
  const points = 50;
  const variation = 150;
  const path = [];
  const r = new Array(points + 1).fill(radius);
  const r2 = new Array(points + 1).fill(radius);
  
  let x1, y1; // Fixed: declared y1

  for (let h = wavMin; h <= wavMax; h++) {
    const amp = variation / (h + 1);
    const phase = timeFracs[h - 1] * 2 * Math.PI;
    for (let i = 0; i <= points; i++) {
      const theta = i / points * 2 * Math.PI;
      r[i] += amp * Math.cos((h + 1) * theta - phase);
      const thet2 = (i - .3) / points * 2 * Math.PI;
      r2[i] += amp * Math.cos((h + 1) * thet2 - phase);
    }
  }
  
  for (let i = 0; i <= points; i++) {
    const theta = i / points * 2 * Math.PI;
    const x = 500 + r[i] * Math.sin(theta);
    const y = 500 - r[i] * Math.cos(theta);
    const thet2 = (i - .3) / points * 2 * Math.PI;
    const x2 = 500 + r2[i] * Math.sin(thet2);
    const y2 = 500 - r2[i] * Math.cos(thet2);
    if (i === 0) {
      path.push(`M ${x.toFixed(0)},${y.toFixed(0)}`);
      x1 = 2 * x - x2;
      y1 = 2 * y - y2;
    } else if (i === 1) {
      path.push(`C ${x1.toFixed(0)},${y1.toFixed(0)} ${x2.toFixed(0)},${y2.toFixed(0)} ${x.toFixed(0)},${y.toFixed(0)}`);
    } else {
      path.push(`S ${x2.toFixed(0)},${y2.toFixed(0)} ${x.toFixed(0)},${y.toFixed(0)}`);
    }
  }
  blo.setAttribute("d", path.join(" ") + " Z");
  blo.setAttribute("fill", colorScheme(hue));
  requestAnimationFrame(() => generateBlobPath(blo, wavMin, wavMax));
};

const updateTimeStr = () => {
  getTime();
  document.getElementById("timeStr").textContent = `${year} ${monthStr} ${date} ${weekday} ${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:${String(second).padStart(2,'0')}`;
  document.querySelectorAll("span.timeZone").forEach(span => {
    span.textContent = `${timeZoneName}`;
  });
};

const drawBinaryClock = (svg) => {
  svg.innerHTML = ''; // Clear existing content
  const path = document.createElementNS(svgNS, "path");
  let d = "";
  for (let i = 0; i < 31; i++) {
    if (binary[i] === '1') {
      d += `M${i},0 h1 v1 h-1 Z `;
    }
  }
  path.setAttribute("d", d.trim());
  path.setAttribute("fill", colorScheme(hue));
  svg.appendChild(path);
};

const createStickFigure = (svgNS, size = 1, raise = 0) => {
  const g = document.createElementNS(svgNS, "g");
  const head = document.createElementNS(svgNS, "circle");
  head.setAttribute("cx", 0);
  head.setAttribute("cy", raise + size);
  head.setAttribute("r", (.2 * size).toFixed(0));
  head.setAttribute("fill", "none");
  head.setAttribute("stroke", "currentColor");
  g.appendChild(head);
  
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
  g.appendChild(p);
  return g;
};

const describeLitHemisphere = (r, angle) => {
  const x0 = r * Math.cos(angle + Math.PI / 2);
  const y0 = r * Math.sin(angle + Math.PI / 2);
  const x1 = r * Math.cos(angle - Math.PI / 2);
  const y1 = r * Math.sin(angle - Math.PI / 2);
  return `M ${x0.toFixed(3)},${y0.toFixed(3)} A ${r.toFixed(0)},${r.toFixed(0)} 0 0,1 ${x1.toFixed(3)},${y1.toFixed(3)} L 0,0 Z`;
};

class CelestialBody {
  constructor({ name, radius, orbitR, orbitalPeriod, orbitStartTime, orbits, svg, tilt, w }) {
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
    this.outline = document.createElementNS(svgNS, "circle");
    this.outline.setAttribute("r", radius);
    this.group.appendChild(this.outline);

    if (this.orbits) {
      this.outline.setAttribute("fill", `hsl(${hue}, 30%, 20%)`);
      this.lit = document.createElementNS(svgNS, "path");
      this.lit.setAttribute("fill", `hsl(${hue}, 30%, 80%)`);
      this.group.appendChild(this.lit);
    } else {
      this.outline.setAttribute("stroke", "currentColor");
      this.outline.setAttribute("fill", "none");
      if (svg) {
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
      }
    }
    svg?.appendChild(this.group);
  }
  
  updateOrbits(solTime) {
    const cx = this.orbits ? this.orbits.x : this.w / 2;
    const cy = this.orbits ? this.orbits.y : this.w / 2;
    const parentAngle = this.orbits ? this.orbits.angle : 0;
    this.angle = parentAngle - 2 * Math.PI * (solTime - this.orbitStartTime) / 24 / 60 / 60 / 1000 / this.orbitalPeriod;
    this.x = cx + this.orbitR * Math.sin(this.angle);
    this.y = cy - this.orbitR * Math.cos(this.angle);
    this.group.setAttribute("transform", `translate(${this.x.toFixed(3)}, ${this.y.toFixed(3)})`);
    
    if (this.lit && this.orbits) { // Fixed: Check if this.orbits exists
      const dx = this.orbits.x - this.w / 2;
      const dy = this.orbits.y - this.w / 2;
      const sunAngle = Math.atan2(dy, dx);
      const r = this.radius;
      const path = describeLitHemisphere(r, sunAngle);
      this.lit.setAttribute("d", path);
    }
  }
}

const pad = (n) => n.toString().padStart(2, '0');
const formatDateTime = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Initialization Logic
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
  maskPolygon(svg, path, level);
  generatePolygonPath(svg, path, level);
  svg.setAttribute("viewBox", "0 0 100 100");
  setInterval(() => maskPolygon(svg, path, level), 1000);
  setInterval(() => generatePolygonPath(svg, path, level), 1000);
});

setInterval(() => {
  getTime();
  document.querySelectorAll("span[data-level]").forEach(span => {
    const level = parseInt(span.dataset.level, 10);
    span.textContent = " (" + time[level] + ")";
  });
}, 1000);

if (document.getElementById("timeStr")) {
  updateTimeStr();
  setInterval(updateTimeStr, 1000);
}

document.querySelectorAll("svg.binaryClock").forEach(svg => {
  drawBinaryClock(svg);
  svg.setAttribute("viewBox", "0 0 31 1");
  setInterval(() => drawBinaryClock(svg), 1000);
});

let svgSolar = document.querySelector("svg.solar");
let svgLunar = document.querySelector("svg.lunar");

if (svgSolar || svgLunar) {
  const w = 500;
  svgSolar?.setAttribute("viewBox", `0 0 ${w} ${w}`);
  const phases = ['full', 'waxing gibbous', "in its first quarter", 'a waxing crescent', 'new', 'a waning crescent', "in its last quarter", 'waning gibbous'];
  const zodiac = ['♈︎', '♉︎', '♊︎', '♋︎', '♌︎', '♍︎', '♎︎', '♏︎', '♐︎', '♑︎', '♒︎', '♓︎'];
  const zodiacName = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const zodiacGroup = document.createElementNS(svgNS, "g");
  zodiacGroup.setAttribute("class", "zodiac");
  svgSolar?.appendChild(zodiacGroup);

  const earth = new CelestialBody({
    name: "Earth",
    radius: .04 * w,
    orbitR: .3 * w,
    orbitalPeriod: 365.256,
    orbitStartTime: Date.UTC(2025, 5, 21, 2, 42),
    orbits: null,
    svg: svgSolar,
    tilt: 23.44,
    w: w
  });

  const moon = new CelestialBody({
    name: "Moon",
    radius: .03 * w,
    orbitR: .17 * w,
    orbitalPeriod: 29.531,
    orbitStartTime: Date.UTC(2025, 7, 9, 7, 54),
    orbits: earth,
    svg: svgSolar,
    tilt: 0,
    w: w
  });

  zodiac.forEach((sign, i) => {
    const angle = -(i + 3.5) * 2 * Math.PI / 12;
    const x = .5 * w + .47 * w * Math.sin(angle);
    const y = .5 * w - .47 * w * Math.cos(angle);
    const text = document.createElementNS(svgNS, "text");
    text.setAttribute("x", x.toFixed(0));
    text.setAttribute("y", y.toFixed(0));
    text.textContent = sign;
    zodiacGroup.appendChild(text);
  });

  const getZodiacFromDate = (date) => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    if ((month == 3 && day >= 21) || (month == 4 && day <= 19)) return 0;
    if ((month == 4 && day >= 20) || (month == 5 && day <= 20)) return 1;
    if ((month == 5 && day >= 21) || (month == 6 && day <= 20)) return 2;
    if ((month == 6 && day >= 21) || (month == 7 && day <= 22)) return 3;
    if ((month == 7 && day >= 23) || (month == 8 && day <= 22)) return 4;
    if ((month == 8 && day >= 23) || (month == 9 && day <= 22)) return 5;
    if ((month == 9 && day >= 23) || (month == 10 && day <= 22)) return 6;
    if ((month == 10 && day >= 23) || (month == 11 && day <= 21)) return 7;
    if ((month == 11 && day >= 22) || (month == 12 && day <= 21)) return 8;
    if ((month == 12 && day >= 22) || (month == 1 && day <= 19)) return 9;
    if ((month == 1 && day >= 20) || (month == 2 && day <= 18)) return 10;
    if ((month == 2 && day >= 19) || (month == 3 && day <= 20)) return 11;
    return 0;
  };

  const sun = document.createElementNS(svgNS, "circle");
  sun.setAttribute("fill", "white");
  sun.setAttribute("transform", `translate(${.5 * w}, ${.5 * w})`);
  sun.setAttribute("r", .06 * w);
  svgSolar?.appendChild(sun);

  svgLunar?.setAttribute("viewBox", `0 0 ${.8 * w} ${w}`);
  const darkSide = document.createElementNS(svgNS, "circle");
  darkSide.setAttribute("cx", (.4 * w).toFixed(0));
  darkSide.setAttribute("cy", (w / 2).toFixed(0));
  darkSide.setAttribute("r", earth.orbitR.toFixed(0));
  darkSide.setAttribute("fill", `hsl(${hue}, 30%, 20%)`);
  svgLunar?.appendChild(darkSide);
  
  const lightSide = document.createElementNS(svgNS, "path");
  lightSide.setAttribute("fill", `hsl(${hue}, 30%, 80%)`);
  svgLunar?.appendChild(lightSide);

  const stickFigure = createStickFigure(svgNS, .3 * moon.orbitR, earth.radius);
  svgSolar?.appendChild(stickFigure);
  
  const datetimeInput = document.getElementById("datetime");
  const playPauseBtn = document.querySelector(".playPauseBtn");

  const updateSolar = (solTime) => {
    earth.updateOrbits(solTime);
    moon.updateOrbits(solTime);
    const angle = (earth.angle * 180 / Math.PI + 180 - 360 * solTime / 24 / 60 / 60 / 1000) % 360;
    stickFigure.setAttribute("transform", `translate(${earth.x.toFixed(1)}, ${earth.y.toFixed(1)}) rotate(${angle.toFixed(2)})`);
    
    if (datetimeInput) {
      datetimeInput.value = formatDateTime(solTime);
    }
    document.querySelectorAll("span.tilt").forEach(span => {
      span.textContent = `${(earth.tilt * Math.cos(earth.angle)).toFixed(1)}`;
    });
    
    const j = getZodiacFromDate(new Date(solTime));
    document.querySelectorAll("span.currentZodiac").forEach(span => {
      span.textContent = zodiacName[j] + ' ' + zodiac[j];
    });
    
    const i = ((((moon.angle - earth.angle) * 4 / Math.PI + 0.5) % 8) + 8) % 8;
    document.querySelectorAll("span.moonPhase").forEach(span => {
      span.textContent = phases[Math.floor(i)];
    });
    
    const waxing = Math.sin(moon.angle - earth.angle) >= 0 ? 1 : 0;
    const crescentVal = Math.cos(moon.angle - earth.angle); // Fixed: declared properly
    const leftTerminator = crescentVal * Math.sin(moon.angle - earth.angle) >= 0 ? 1 : 0;
    
    // Fixed: use Math.abs to ensure radius is never negative
    const innerR = Math.abs(crescentVal * earth.orbitR);
    
    lightSide.setAttribute("d",
      `M ${(.4 * w).toFixed(0)} ${(w / 2 + earth.orbitR).toFixed(0)}`
      + `A ${innerR.toFixed(1)} ${earth.orbitR.toFixed(0)} 0 0 ${leftTerminator} `
      + `${(.4 * w).toFixed(0)} ${(w / 2 - earth.orbitR).toFixed(0)}`
      + `A ${earth.orbitR.toFixed(0)} ${earth.orbitR.toFixed(0)} 0 0 ${waxing} `
      + `${(.4 * w).toFixed(0)} ${(w / 2 + earth.orbitR).toFixed(0)}`
    );
  };

  let solTime = Date.now();
  updateSolar(solTime);
  let playing = false;
  let animationId = null;

  const animationStep = () => {
    if (playing) {
      solTime += 1000 * 60 * 20;
      updateSolar(solTime);
      animationId = requestAnimationFrame(animationStep);
    }
  };

  if (playPauseBtn) {
    playPauseBtn.addEventListener("click", () => {
      playing = !playing;
      playPauseBtn.innerHTML = playing ? "&#9208; Pause" : "&#9654; Play";
      if (playing) {
        animationId = requestAnimationFrame(animationStep);
      } else {
        cancelAnimationFrame(animationId);
      }
    });
    
    if (datetimeInput) {
      datetimeInput.addEventListener("input", () => {
        playing = false;
        cancelAnimationFrame(animationId);
        playPauseBtn.innerHTML = "&#9654; Play";
        const newTime = new Date(datetimeInput.value).getTime();
        if (!isNaN(newTime)) {
          solTime = newTime;
          updateSolar(solTime);
        }
      });
      
      datetimeInput.addEventListener("focus", () => {
        playing = false;
        cancelAnimationFrame(animationId);
        playPauseBtn.innerHTML = "&#9654; Play";
      });
    }
  }
}
