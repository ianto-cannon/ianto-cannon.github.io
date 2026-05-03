const API = "https://guestbook.maricakes.de/api.php";
async function load() {
    const res = await fetch(API);
    const data = await res.json();
    const container = document.getElementById("messages");
    container.innerHTML = "";
    data.forEach(m => {
        const div = document.createElement("div");
        div.className = "message";
        div.innerHTML = `
            <b>${escapeHTML(m.name)}</b> (${m.ts || m.time || ""})<br>
            ${escapeHTML(m.message).replace(/\n/g, "<br>")}
        `;
        container.appendChild(div);
    });
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
    }
});
function escapeHTML(str) {
    return str.replace(/[&<>"']/g, c => ({
        "&":"&amp;", "<":"&lt;", ">":"&gt;",
        '"':"&quot;", "'":"&#039;"
    }[c]));
}
load();
