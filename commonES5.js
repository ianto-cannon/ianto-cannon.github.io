var svgNS = "http://www.w3.org/2000/svg";
var year, month, date, hour, minute, second, millisecond, hue; // numbers
var timeFracs = [], time = [], sides = [];
var timeZoneName = "", binary = "", monthStr = "", emoji = "", title = "", weekday = ""; // strings
var randomColor = null;
var darkMode = true;

var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

var anyColor = function() {
  var h = Math.floor(Math.random() * 360);
  var s = Math.floor(Math.random() * 40 + 30);
  var l = Math.floor(Math.random() * 60 + 20);
  return "hsl(" + h + ", " + s + "%, " + l + "%)";
};

var halloweenColor = function() {
  var colors = ["#8A4985", "#ff7518"];
  return colors[Math.floor(Math.random() * colors.length)];
};

var christmasColor = function() {
  var colors = ["#ff0000", "#008000"];
  return colors[Math.floor(Math.random() * colors.length)];
};

var newYearColor = function() {
  var colors = ["#ffdd00", "#add8e6", "#800080"];
  return colors[Math.floor(Math.random() * colors.length)];
};

var valentinesColor = function() {
  var colors = ["#ff1493", "#db7093"];
  return colors[Math.floor(Math.random() * colors.length)];
};

var prideColor = function() {
  var colors = ['#e40303', '#ff8c00', '#ffed00', '#008026', '#24408e', '#732982'];
  return colors[Math.floor(Math.random() * colors.length)];
};

var earthColor = function() {
  var colors = ['#008026', '#24408e'];
  return colors[Math.floor(Math.random() * colors.length)];
};

var rgbToHue = function(rgb) {
  var r, g, b;
  if (rgb.indexOf("#") === 0) {
    rgb = rgb.replace(/^#/, '');
    r = parseInt(rgb.slice(0, 2), 16) / 255;
    g = parseInt(rgb.slice(2, 4), 16) / 255;
    b = parseInt(rgb.slice(4, 6), 16) / 255;
  } else {
    var matches = rgb.match(/\d+/g);
    r = parseInt(matches[0], 10) / 255;
    g = parseInt(matches[1], 10) / 255;
    b = parseInt(matches[2], 10) / 255;
  }
  
  var max = Math.max(r, g, b);
  var min = Math.min(r, g, b);
  var delta = max - min;
  var calculatedHue = 0;
  
  if (delta === 0) {
    calculatedHue = 0;
  } else if (max === r) {
    calculatedHue = ((g - b) / delta) % 6;
  } else if (max === g) {
    calculatedHue = (b - r) / delta + 2;
  } else {
    calculatedHue = (r - g) / delta + 4;
  }
  calculatedHue = Math.round(calculatedHue * 60);
  if (calculatedHue < 0) calculatedHue += 360;
  return calculatedHue;
};

var getTime = function() {
  var now = new Date();
  
  // Fallback for Intl.DateTimeFormat
  var tzMatch = now.toString().match(/\(([^)]+)\)/);
  timeZoneName = tzMatch ? tzMatch[1] : "";
  
  year = now.getFullYear();
  month = now.getMonth(); 
  monthStr = monthNames[month];
  date = now.getDate();
  
  var firstOfMonth = new Date(year, month, 1);
  var lastOfMonth = new Date(year, month + 1, 0);
  var firstDay = (firstOfMonth.getDay() + 6) % 7;
  var week = Math.floor((firstDay + date - 1) / 7);
  var totalDays = lastOfMonth.getDate();
  var weeksInMonth = Math.ceil((firstDay + totalDays) / 7);
  
  sides = [9, 9, 11, weeksInMonth - 1, 6, 23, 5, 9, 5, 9];
  weekday = dayNames[now.getDay()];
  var wkday = (now.getDay() + 6) % 7; 
  hour = now.getHours();
  minute = now.getMinutes();
  second = now.getSeconds();
  millisecond = now.getMilliseconds();
  
  time = [Math.floor(year / 10) % 10, year % 10, month, week, wkday, hour, Math.floor(minute / 10), minute % 10, Math.floor(second / 10), second % 10];
  
  var secFrac = millisecond / 1000;
  var minFrac = (second + secFrac) / 60;
  var hrFrac  = (minute + minFrac) / 60;
  var dayFrac = (hour + hrFrac) / 24;
  
  var start = new Date(year, 0, 0); 
  var oneDay = 1000 * 60 * 60 * 24;
  var days = Math.floor((now - start) / oneDay);
  var yrFrac = (days + dayFrac) / 365.25;
  var milFrac = (year + yrFrac) / 1000;
  timeFracs = [milFrac, yrFrac, dayFrac, hrFrac, minFrac, secFrac];
  
  var unixTime = Math.floor(now.getTime() / 1000);
  var binaryStr = unixTime.toString(2);
  while (binaryStr.length < 31) {
    binaryStr = '0' + binaryStr;
  }
  binary = binaryStr;
};

var createTriangle = function(value, width, height, lightness, peaksSVG) {
  for (var i = -1; i <= 1; i++) {
    var left = width * (0.5 - value + i);
    var mid = width * (1 - value + i);
    var right = width * (1.5 - value + i);
    var path = document.createElementNS(svgNS, "path");
    path.setAttribute("fill", "hsl(" + hue + ", 30%, " + lightness + "%)");
    path.setAttribute("d", "M" + left.toFixed(0) + ",10 L" + mid.toFixed(0) + "," + (10 - height) + " L" + right.toFixed(0) + ",10 Z");
    peaksSVG.appendChild(path);
  }
};

var updatePeaks = function(peaksSVG) {
  while (peaksSVG.firstChild) {
    peaksSVG.removeChild(peaksSVG.firstChild);
  }
  var width = 1000;
  getTime();
  for (var i = 0; i <= 4; i++) {
    var lightness = darkMode ? (20 + i * 10) : (100 - 20 - i * 10);
    createTriangle(timeFracs[i] % 1, width, 10 - i * 1.5, lightness, peaksSVG);
  }
  
  // Replaced requestAnimationFrame with setTimeout (1fps) for Kindle E-Ink optimization
  setTimeout(function() {
    updatePeaks(peaksSVG);
  }, 1000);
};

// --- Initialization & Setup ---

var toggles = document.querySelectorAll('.theme-toggle');
for (var i = 0; i < toggles.length; i++) {
  toggles[i].style.display = 'inline';
}

var themeInputs = document.querySelectorAll('input[name="theme"]');
var darkLink = document.querySelector('link[data-theme="dark"]');

function applyTheme(mode) {
  if (mode === 'dark') {
    darkMode = true;
  } else if (mode === 'light') {
    darkMode = false;
  } else {
    var matchMediaObj = (typeof window !== 'undefined' && window.matchMedia);
    darkMode = matchMediaObj ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;
  }
  if (darkLink) {
    darkLink.media = darkMode ? 'all' : 'not all';
  }
}

var saved = localStorage.getItem('theme') || 'browser';
applyTheme(saved);

for (var k = 0; k < themeInputs.length; k++) {
  themeInputs[k].addEventListener('change', function() {
    var mode = this.value;
    localStorage.setItem('theme', mode);
    applyTheme(mode);
  });
}

var savedThemeInput = document.querySelector('input[value="' + saved + '"]');
if (savedThemeInput) {
  savedThemeInput.checked = true;
}

getTime();
emoji = "";
var headers;
var idx;

if (month === 9 && date === 31) { // October 31
  emoji = " 🎃";
  title = "Happy halloween!";
  randomColor = halloweenColor;
  var style = document.createElement("style");
  style.textContent = "@font-face {font-family: 'Creepster'; src: url('creepster.woff2') format('woff2');}";
  document.head.appendChild(style);
  headers = document.querySelectorAll('h1, h2, h3');
  for (idx = 0; idx < headers.length; idx++) {
    headers[idx].className += ' halloween';
  }
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
  headers = document.querySelectorAll('h1, h2, h3');
  for (idx = 0; idx < headers.length; idx++) {
    headers[idx].className += ' valentines';
  }
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

var h2s = document.querySelectorAll("h2");
for (var h2i = 0; h2i < h2s.length; h2i++) {
  h2s[h2i].textContent += emoji;
  h2s[h2i].title = title;
}

var col = randomColor();
if (col.indexOf("hsl(") === 0) {
  var matchHsl = col.match(/hsl\((\d+),/);
  hue = matchHsl ? parseInt(matchHsl[1], 10) : 0;
} else {
  hue = rgbToHue(col);
}

var bodyDark = document.body.className.indexOf('dark') !== -1;
var documentLightness = bodyDark ? 70 : 30;
col = "hsl(" + hue + ", 30%, " + documentLightness + "%)";

var peakSvgs = document.querySelectorAll("svg.peaks");
for (var p = 0; p < peakSvgs.length; p++) {
  var currentSvg = peakSvgs[p];
  updatePeaks(currentSvg);
  currentSvg.setAttribute("viewBox", "0 0 1000 10");
  currentSvg.setAttribute("preserveAspectRatio", "none");
}
