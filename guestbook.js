var API = "https://guestbook.maricakes.de/api.php";
var timeline, t0, t1, guestbookData = [];

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, function(c) {
    return ({
      "&": "&amp;", 
      "<": "&lt;", 
      ">": "&gt;",
      '"': "&quot;", 
      "'": "&#39;"
    })[c];
  });
}

function guestbookUnreachable(isUnreachable) {
  var status = document.getElementById("status");
  if (isUnreachable) {
    document.body.classList.add("down");
    status.textContent = "Guestbook server is unreachable";
  } else {
    document.body.classList.remove("down");
    status.textContent = "Guestbook server is connected";
  }
}

function render() {
  var container = document.getElementById("messages");
  if (!container || !guestbookData.length) return;
  if (timeline && timeline.parentNode) timeline.parentNode.removeChild(timeline);
  
  timeline = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  timeline.style.position = "absolute";
  timeline.style.top = "0"; timeline.style.left = "0"; 
  timeline.style.right = "0"; timeline.style.bottom = "0"; // Replaced inset
  timeline.style.pointerEvents = "none";
  timeline.style.color = "inherit";
  container.insertBefore(timeline, container.firstChild); // Replaced prepend

  var msgs = Array.prototype.slice.call(container.querySelectorAll(".message"));
  if (!msgs.length) return;
  var lastMsg = msgs[msgs.length - 1];
  var h = lastMsg.offsetTop; 
  timeline.setAttribute("width", container.clientWidth);
  timeline.setAttribute("height", h);
  var x = 0;
  
  var vline = document.createElementNS("http://www.w3.org/2000/svg", "line");
  vline.setAttribute("x1", x); vline.setAttribute("y1", 0);
  vline.setAttribute("x2", x); vline.setAttribute("y2", h);
  vline.setAttribute("stroke", "currentColor");
  vline.setAttribute("stroke-width", "0.5");
  timeline.appendChild(vline);

  for (var i = 0; i < msgs.length; i++) {
    var msg = msgs[i];
    if (!guestbookData[i]) continue;
    var t = new Date(guestbookData[i].ts).getTime();
    var y = ((t1 - t) / (t1 - t0 || 1)) * h;
    var link = document.createElementNS("http://www.w3.org/2000/svg", "line");
    link.setAttribute("x1", x); link.setAttribute("y1", y);
    link.setAttribute("x2", msg.offsetLeft); link.setAttribute("y2", msg.offsetTop);
    link.setAttribute("stroke", "currentColor");
    link.setAttribute("stroke-width", "0.5");
    timeline.appendChild(link);
  }
}

function load() {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", API, true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          guestbookData = JSON.parse(xhr.responseText);
          var container = document.getElementById("messages");
          container.innerHTML = "";
          var timesArr = guestbookData.map(function(m) { return new Date(m.ts).getTime(); });
          t0 = Math.min.apply(null, timesArr);
          t1 = Math.max.apply(null, timesArr);
          
          for (var i = 0; i < guestbookData.length; i++) {
            var m = guestbookData[i];
            var div = document.createElement("div");
            div.className = "message";
            div.innerHTML = '<b>' + escapeHTML(m.name) + '</b> (' + (m.ts || "") + ' UTC)<br>' + escapeHTML(m.message).replace(/\n/g, "<br>");
            container.appendChild(div);
          }
          render();
          guestbookUnreachable(false);
        } catch (err) {
          guestbookUnreachable(true);
          document.getElementById("messages").innerText = "Could not load messages. Try again later.";
        }
      } else {
        guestbookUnreachable(true);
        document.getElementById("messages").innerText = "Could not load messages. Try again later.";
      }
    }
  };
  xhr.send();
}

document.getElementById("form").addEventListener("submit", function(e) {
  e.preventDefault();
  var honeypot = document.getElementById("honeypot").value.trim();
  var name = document.getElementById("nameBox").value.trim();
  var message = document.getElementById("messageBox").value.trim();
  
  var xhr = new XMLHttpRequest();
  xhr.open("POST", API, true);
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      if (xhr.status >= 200 && xhr.status < 300) {
        document.getElementById("messageBox").value = "";
        load();
      } else {
        var errorMsg = 'Unknown Error';
        try {
          var errorResult = JSON.parse(xhr.responseText);
          if (errorResult.error) errorMsg = errorResult.error;
        } catch (err) {}
        alert("Submission Failed: " + errorMsg); 
      }
    }
  };
  try {
    xhr.send(JSON.stringify({ honeypot: honeypot, name: name, message: message }));
  } catch (err) {
    alert("Network error: Could not submit message.");
  }
});

window.addEventListener("resize", function() { render(); });
load();
