const API = "https://guestbook.maricakes.de/api.php";
async function load() {
  try {
    const res = await fetch(API);
    if (!res.ok) throw new Error();
    const data = await res.json();
    const container = document.getElementById("messages");
    container.innerHTML = "";
    data.forEach(m => {
      const div = document.createElement("div");
      div.className = "message";
      div.innerHTML = `
        <b>${escapeHTML(m.name)}</b> (${m.ts || m.time || ""} UCT)<br>
        ${escapeHTML(m.message).replace(/\n/g, "<br>")}
      `;
      container.appendChild(div);
    });
  } catch {
    guestbookUnreachable(true);
    document.getElementById("messages").innerText =
      "Could not load messages. Try again later.";
  }
}
document.getElementById("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("name").value.trim();
  const message = document.getElementById("message").value.trim();
  const res = await fetch(API, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ name, message })
  });
  if (res.ok) {
    document.getElementById("message").value = "";
    load();
  } else {
    alert("Failed to post");
    guestbookUnreachable(true);
  }
});
function escapeHTML(str) {
  return str.replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;",
    '"':"&quot;", "'":"&#039;"
  }[c]));
}
function guestbookUnreachable(isUnreachable) {
  const status = document.getElementById("status");
  const form = document.getElementById("form");
  const hero = document.getElementById("hero");
  if (isUnreachable) {
    document.body.classList.add("down");
    status.textContent = "Guestbook server is unreachable";
  } else {
    document.body.classList.remove("down");
    status.textContent = "Guestbook server is connected";
  }
}
load();
