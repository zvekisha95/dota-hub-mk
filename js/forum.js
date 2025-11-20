// js/forum.js – ФИНАЛНА ВЕРЗИЈА 20.11.2025
// Infinite scroll + Sticky + Locked + Real-time коментари

let currentUser = null;
let userRole = "member";
let lastDoc = null;
const limit = 20; // теми по страница

function escapeHtml(t) {
  const div = document.createElement("div");
  div.textContent = t;
  return div.innerHTML;
}

auth.onAuthStateChanged(async user => {
  if (!user) {
    location.href = "index.html";
    return;
  }

  currentUser = user;

  // Профил линк
  const profileLink = document.getElementById("profileLink");
  if (profileLink) profileLink.href = `profile.html?id=${user.uid}`;

  // Бан проверка
  const doc = await db.collection("users").doc(user.uid).get();
  const data = doc.exists ? doc.data() : {};

  if (data.banned) {
    alert("Ти си баниран од форумот.");
    location.href = "main.html";
    return;
  }

  userRole = data.role || "member";

  // Вчитај први теми
  loadThreads(true);

  // Infinite scroll
  window.addEventListener("scroll", () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000) {
      loadThreads(false);
    }
  });
});

// Главна функција за вчитување теми
async function loadThreads(isFirstLoad = false) {
  if (!isFirstLoad && !lastDoc) return; // нема повеќе

  const list = document.getElementById("threadList");
  if (isFirstLoad) {
    list.innerHTML = `<div class="loading">Вчитувам теми...</div>`;
  }

  try {
    let query = db.collection("threads")
      .orderBy("sticky", "desc")
      .orderBy("createdAt", "desc")
      .limit(limit);

    if (!isFirstLoad && lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snap = await query.get();

    if (snap.empty) {
      if (isFirstLoad) {
        list.innerHTML = `<div class="empty">Нема објавени теми. Биди првиот! 🚀</div>`;
      }
      lastDoc = null;
      return;
    }

    if (isFirstLoad) list.innerHTML = "";

    snap.forEach(doc => {
      const t = doc.data();
      const id = doc.id;

      const isSticky = t.sticky === true;
      const isLocked = t.locked === true;
      const commentsCount = t.commentCount || 0;

      const title = escapeHtml(t.title || "Без наслов");
      const author = escapeHtml(t.author || "Корисник");
      const authorId = t.authorId || "";

      const date = t.createdAt?.toDate?.().toLocaleString("mk-MK", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      }) || "??";

      const hue = (author.charCodeAt(0) || 0) * 7 % 360;

      const html = `
        <div class="thread-card ${isSticky ? "sticky" : ""}" style="${isSticky ? "border-left:5px solid #22c55e;background:rgba(34,197,94,0.08)" : ""}">
          <div class="thread-horizontal">

            <div class="avatar small" style="background:hsl(${hue},70%,55%)">
              ${author[0]?.toUpperCase() || "?"}
            </div>

            <a class="thread-title" href="thread.html?id=${id}">
              ${isSticky ? "📌 " : ""}${isLocked ? "🔒 " : ""}${title}
            </a>

            <span class="thread-user">
              од <a href="profile.html?id=${authorId}" style="color:#94a3b8;text-decoration:none;">${author}</a>
            </span>

            <span class="thread-date">${date}</span>

            <span class="thread-comments">
              💬 ${commentsCount} ${commentsCount === 1 ? "коментар" : "коментари"}
            </span>

          </div>
        </div>
      `;

      list.insertAdjacentHTML("beforeend", html);
    });

    lastDoc = snap.docs[snap.docs.length - 1];

    // Ако има помалку од limit – крај
    if (snap.size < limit) lastDoc = null;

  } catch (err) {
    console.error("Грешка при вчитување теми:", err);
    list.innerHTML += `<div class="error">Грешка при вчитување.</div>`;
  }
}
