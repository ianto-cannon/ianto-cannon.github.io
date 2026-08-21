var svgNS = "http://www.w3.org/2000/svg";
var year, month, date, hour, minute, second, millisecond, hue;
var timeFracs=[], time=[], sides=[];
var timeZoneName="", binary="", monthStr="", emoji="", title="", weekday="";
var randomColor=null;
var darkMode = true;

function padStartFn(str, targetLength, padString) {
  str = String(str);
  while (str.length < targetLength) { str = padString + str; }
  return str;
}

// Old browsers (e.g. Kindle's "Experimental Browser") don't support the CSS
// aspect-ratio property, and their e-ink screens can't keep up with a
// requestAnimationFrame loop anyway. We use the same feature check to decide
// both how to size elements and how often to redraw them.
var supportsAspectRatio = !!(window.CSS && CSS.supports && CSS.supports('aspect-ratio', '1'));
var reducedAnimation = !supportsAspectRatio;
var FRAME_MS = reducedAnimation ? 2000 : (1000 / 60);

// Schedules fn to run again for the next animation step. On capable browsers
// this is a normal requestAnimationFrame loop; on old/e-ink browsers it
// falls back to a slow setTimeout so the screen isn't asked to redraw faster
// than it can physically refresh.
function scheduleFrame(fn, reducedMs) {
  if (reducedAnimation) { return setTimeout(fn, reducedMs != null ? reducedMs : FRAME_MS); }
  else if (window.requestAnimationFrame) { return window.requestAnimationFrame(fn); }
  else { return setTimeout(fn, 100); }
}

// Fallback sizing for browsers that ignore the CSS aspect-ratio property:
// sets an explicit pixel height based on each element's rendered width, so
// non-square SVGs (the binary clock, solar/lunar clocks, blobs) don't just
// fall back to the browser's default 300x150 replaced-element box.
var ASPECT_RATIOS = { binaryClock: 31, solar: 1, lunar: 0.8, blob: 1 };
function applyAspectRatioFallback() {
  if (supportsAspectRatio) return;
  for (var cls in ASPECT_RATIOS) {
    var els = document.querySelectorAll("svg." + cls);
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var w = el.clientWidth || (el.parentNode && el.parentNode.clientWidth);
      if (w) el.style.height = (w / ASPECT_RATIOS[cls]).toFixed(0) + "px";
    }
  }
}
applyAspectRatioFallback();
window.addEventListener('resize', applyAspectRatioFallback);

function anyColor() {
  var h = Math.floor(Math.random() * 360);
  var s = Math.floor(Math.random() * 40 + 30);
  var l = Math.floor(Math.random() * 60 + 20);
  return "hsl(" + h + ", " + s + "%, " + l + "%)";
}
function halloweenColor() { var c = ["#8A4985", "#ff7518"]; return c[Math.floor(Math.random() * c.length)]; }
function christmasColor() { var c = ["#ff0000", "#008000"]; return c[Math.floor(Math.random() * c.length)]; }
function newYearColor() { var c = ["#ffdd00", "#add8e6", "#800080"]; return c[Math.floor(Math.random() * c.length)]; }
function valentinesColor() { var c = ["#ff1493", "#db7093"]; return c[Math.floor(Math.random() * c.length)]; }
function prideColor() { var c = ['#e40303', '#ff8c00', '#ffed00', '#008026', '#24408e', '#732982']; return c[Math.floor(Math.random() * c.length)]; }
function earthColor() { var c = ['#008026', '#24408e']; return c[Math.floor(Math.random() * c.length)]; }

function rgbToHue(rgb) {
  var r, g, b;
  if (rgb.charAt(0) === "#") {
    rgb = rgb.substring(1);
    r = parseInt(rgb.substring(0, 2), 16) / 255;
    g = parseInt(rgb.substring(2, 4), 16) / 255;
    b = parseInt(rgb.substring(4, 6), 16) / 255;
  } else {
    var m = rgb.match(/\d+/g);
    r = parseInt(m[0], 10) / 255; g = parseInt(m[1], 10) / 255; b = parseInt(m[2], 10) / 255;
  }
  var max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  var calcHue = 0;
  if (delta !== 0) {
    if (max === r) calcHue = ((g - b) / delta) % 6;
    else if (max === g) calcHue = (b - r) / delta + 2;
    else calcHue = (r - g) / delta + 4;
  }
  calcHue = Math.round(calcHue * 60);
  if (calcHue < 0) calcHue += 360;
  return calcHue;
}

function getTime() {
  var now = new Date();
  try { timeZoneName = now.toTimeString().split('(')[1].split(')')[0]; } catch(e) { timeZoneName = "Local"; }
  year = now.getFullYear(); month = now.getMonth(); 
  monthStr = now.toLocaleString('en-US', {month: 'short'}); 
  date = now.getDate();
  var firstOfMonth = new Date(year, month, 1);
  var lastOfMonth = new Date(year, month + 1, 0);
  var firstDay = (firstOfMonth.getDay() + 6) % 7; 
  var week = Math.floor((firstDay + date - 1) / 7);
  var weeksInMonth = Math.ceil((firstDay + lastOfMonth.getDate()) / 7);
  sides = [9, 9, 11, weeksInMonth-1, 6, 23, 5, 9, 5, 9];
  weekday = now.toLocaleString('en-US', {weekday: 'short'});
  var wkday = (now.getDay()+6)%7; 
  hour = now.getHours(); minute = now.getMinutes(); second = now.getSeconds(); millisecond = now.getMilliseconds();
  time = [Math.floor(year/10)%10, year%10, month, week, wkday, hour, Math.floor(minute/10), minute%10, Math.floor(second/10), second%10];
  var secFrac = millisecond/1000, minFrac = (second + secFrac)/60, hrFrac = (minute + minFrac)/60, dayFrac = (hour + hrFrac)/24;
  var start = new Date(year, 0, 0); 
  var days = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  var yrFrac = (days + dayFrac)/365.25, milFrac = (year + yrFrac)/1000;
  timeFracs = [milFrac, yrFrac, dayFrac, hrFrac, minFrac, secFrac];
  binary = padStartFn(Math.floor(now.getTime() / 1000).toString(2), 31, '0');
}

function createTriangle(value, width, height, lightness, peaksSVG) {
  for (var i = -1; i <= 1; i++) {
    var left = width*(.5-value+i), mid = width*(1-value+i), right = width*(1.5-value+i);
    var path = document.createElementNS(svgNS, "path");
    path.setAttribute("fill", "hsl(" + hue + ", 30%, " + lightness + "%)");
    path.setAttribute("d", "M" + left.toFixed(0) + ",10 L" + mid.toFixed(0) + "," + (10-height) + " L" + right.toFixed(0) + ",10 Z");
    peaksSVG.appendChild(path);
  }
}

function updatePeaks(peaksSVG) {
  while (peaksSVG.firstChild) peaksSVG.removeChild(peaksSVG.firstChild);
  var width = 1000; getTime();
  for (var i = 0; i <= 4; i++) {
    var lightness = darkMode ? (20 + i*10) : (100 - 20 - i*10);
    createTriangle(timeFracs[i]%1, width, 10-i*1.5, lightness, peaksSVG);
  }
  scheduleFrame(function() { updatePeaks(peaksSVG); });
}

var themeToggles = document.querySelectorAll('.theme-toggle');
for (var i = 0; i < themeToggles.length; i++) { themeToggles[i].style.display = 'inline'; }

var themeInputs = document.querySelectorAll('input[name="theme"]');
var darkLink = document.querySelector('link[data-theme="dark"]');

function applyTheme(mode) {
  var isDark;
  if (mode === 'dark') isDark = true;
  else if (mode === 'light') isDark = false;
  else isDark = !(window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches);
  if (darkLink) darkLink.media = isDark ? 'all' : 'not all';
}

var saved = 'browser';
try { saved = localStorage.getItem('theme') || 'browser'; } catch (e) {}
applyTheme(saved);

for (var i = 0; i < themeInputs.length; i++) {
  themeInputs[i].addEventListener('change', function() {
    var mode = this.value;
    try { localStorage.setItem('theme', mode); } catch(e) {}
    applyTheme(mode);
  });
}

var savedThemeInput = document.querySelector('input[value="' + saved + '"]');
if (savedThemeInput) savedThemeInput.checked = true;

getTime();
emoji = ""; title = ""; randomColor = anyColor;

if (month === 9 && date === 31) { emoji = " 🎃"; title = "Happy halloween!"; randomColor = halloweenColor; /* Font loading omitted for Kindle */ }
else if (month === 11 && date >= 24 && date <= 26) { emoji = " 🎄"; title = "Merry Christmas!"; randomColor = christmasColor; }
else if (month === 0 && date <= 3) { emoji = " 🎆"; title = "Happy new year!"; randomColor = newYearColor; }
else if (month === 1 && date === 14) { emoji = " 💘"; title = "Happy Valentine's day!"; randomColor = valentinesColor; }
else if (month === 5 && date === 28) { emoji = " 🌈"; title = "Happy pride!"; randomColor = prideColor; }
else if (month === 3 && date === 22) { emoji = " 🌎"; title = "Happy Earth day!"; randomColor = earthColor; }

var h2Tags = document.querySelectorAll("h2");
for (var i = 0; i < h2Tags.length; i++) { h2Tags[i].textContent += emoji; h2Tags[i].title = title; }

var col = randomColor();
if (col.indexOf("hsl(") === 0) {
  var hueMatch = col.match(/hsl\((\d+),/);
  if (hueMatch) hue = parseInt(hueMatch[1], 10);
} else { hue = rgbToHue(col); }

var lightness = document.body.classList.contains('dark') ? 70 : 30;
var svgPeaks = document.querySelectorAll("svg.peaks");
for (var i = 0; i < svgPeaks.length; i++) {
  updatePeaks(svgPeaks[i]);
  svgPeaks[i].setAttribute("viewBox", "0 0 1000 10");
  svgPeaks[i].setAttribute("preserveAspectRatio", "none");
}
