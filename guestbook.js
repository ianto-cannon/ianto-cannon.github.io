const API = "https://guestbook.maricakes.de/api.php";
let timeline, t0, t1, guestbookData = [];
function escapeHTML(str) {
  return str.replace(/[&<>"']/g, c => ({
    "&": "&amp;", 
    "<": "&lt;", 
    ">": "&gt;",
    '"': "&quot;", 
    "'": "&#39;"
  }[c]));
}
function guestbookUnreachable(isUnreachable) {
  const status = document.getElementById("status");
  if (isUnreachable) {
    document.body.classList.add("down");
    status.textContent = "Guestbook server is unreachable";
  } else {
    document.body.classList.remove("down");
    status.textContent = "Guestbook server is connected";
  }
}
function render() {
  const container = document.getElementById("messages");
  if (!container || !guestbookData.length) return;
  if (timeline) timeline.remove();
  timeline = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  timeline.style.position = "absolute";
  timeline.style.inset = "0";
  timeline.style.pointerEvents = "none";
  timeline.style.color = "inherit";
  container.prepend(timeline);
  const msgs = [...container.querySelectorAll(".message")];
  if (!msgs.length) return;
  const lastMsg = msgs[msgs.length - 1];
  const h = lastMsg.offsetTop; 
  timeline.setAttribute("width", container.clientWidth);
  timeline.setAttribute("height", h);
  const x = 0;
  const vline = document.createElementNS("http://www.w3.org/2000/svg", "line");
  vline.setAttribute("x1", x);
  vline.setAttribute("y1", 0);
  vline.setAttribute("x2", x);
  vline.setAttribute("y2", h);
  vline.setAttribute("stroke", "currentColor");
  vline.setAttribute("stroke-width", "0.5");
  timeline.appendChild(vline);
  msgs.forEach((msg, i) => {
    if (!guestbookData[i]) return;
    const t = new Date(guestbookData[i].ts).getTime();
    const y = ((t1 - t) / (t1 - t0 || 1)) * h;
    const link = document.createElementNS("http://www.w3.org/2000/svg", "line");
    link.setAttribute("x1", x);
    link.setAttribute("y1", y);
    link.setAttribute("x2", msg.offsetLeft);
    link.setAttribute("y2", msg.offsetTop);
    link.setAttribute("stroke", "currentColor");
    link.setAttribute("stroke-width", "0.5");
    timeline.appendChild(link);
  });
}
async function load() {
  try {
    const res = await fetch(API);
    if (!res.ok) throw new Error();
    guestbookData = await res.json();
    const container = document.getElementById("messages");
    container.innerHTML = "";
    const timesArr = guestbookData.map(m => new Date(m.ts).getTime());
    t0 = Math.min(...timesArr);
    t1 = Math.max(...timesArr);
    guestbookData.forEach(m => {
      const div = document.createElement("div");
      div.className = "message";
      div.innerHTML = `
        <b>${escapeHTML(m.name)}</b> (${m.ts || ""} UTC)<br>
        ${escapeHTML(m.message).replace(/\n/g, "<br>")}
      `;
      container.appendChild(div);
    });
    render();
    guestbookUnreachable(false);
  } catch (err) {
    guestbookUnreachable(true);
    document.getElementById("messages").innerText = "Could not load messages. Try again later.";
  }
}
document.getElementById("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const honeypot = document.getElementById("honeypot").value.trim();
  const name = document.getElementById("nameBox").value.trim();
  const message = document.getElementById("messageBox").value.trim();
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ honeypot, name, message })
    });
    if (res.ok) {
      document.getElementById("messageBox").value = "";
      load();
    } else {
      const errorResult = await res.json();
      alert(`Submission Failed: ${errorResult.error || 'Unknown Error'}`); 
    }
  } catch (err) {
    alert("Network error: Could not submit message.");
  }
});
window.addEventListener("resize", render);
load();
