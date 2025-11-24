
// js/forum.js – PREMIUM FINAL FIX 2025
// Fully compatible with premium thread.js + Firestore rules

let currentUser = null;
let userRole = "member";
let lastDoc = null;
const limit = 20;

function escapeHtml(t) {
  const div = document.createElement("div");
  div.textContent = t;
  return div.innerHTML;
}

// ───────────────────────────────────────────────
// AUTH
// ───────────────────────────────────────────────
auth.onAuthStateChanged(async user => {
  if (!user || !user.uid.startsWith("steam:")) {
    return location.href = "index.html";
  }

  currentUser = user;

  const profileLink = document.getElementById("profileLink");
  if (profileLink) profileLink.href = `profile.html?id=${user.uid}`;

  const snap = await db.collection("users").doc(user.uid).get();
  const data = snap.exists ? snap.data() : {};

  if (data.banned) {
    alert("⛔ Ти си баниран од форумот.");
    return location.href = "main.html";
  }

  userRole = data.role || "member";

  // Load threads + infinite scroll
  loadThreads(true);

  window.addEventListener("scroll", () => {
    const bottomReached = window.innerHeight + window.scrollY >= document.body.offsetHeight - 900;
    if (bottomReached) loadThreads(false);
  });
});


// ───────────────────────────────────────────────
// LOAD THREADS (with sticky, lastActivity, infinite scroll)
// ───────────────────────────────────────────────
async function loadThreads(isFirstLoad = false) {
  const list = document.getElementById("threadList");

  if (!list) return;

  if (isFirstLoad) {
    list.innerHTML = `<div class="loading">Вчитувам теми...</div>`;
    lastDoc = null;
  }

  try {
    // INDEX-SAFE ORDER
    let query = db.collection("threads")
      .orderBy("sticky", "desc")
      .orderBy("lastActivity", "desc")
      .limit(limit);

    if (!isFirstLoad && lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snap = await query.get();

    if (snap.empty) {
      if (isFirstLoad) {
        list.innerHTML = `<div class="empty">Нема теми. Напиши прва! 🚀</div>`;
      }
      lastDoc = null;
      return;
    }

    if (isFirstLoad) list.innerHTML = "";

    snap.docs.forEach(doc => {
      const t = doc.data();
      const id = doc.id;

      const isSticky = t.sticky === true;
      const isLocked = t.locked === true;

      const commentsCount = t.commentCount || 0;
      const views = t.views || 0;
      const title = escapeHtml(t.title || "Без наслов");
      const author = escapeHtml(t.author || "Корисник");
      const authorId = t.authorId || "";

      const date = t.lastActivity?.toDate?.().toLocaleString("mk-MK", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      }) || "??";

      const hue = (author.charCodeAt(0) || 0) * 7 % 360;

      const html = `
        <div class="thread-card ${isSticky ? "sticky" : ""}"
             style="${isSticky ? "border-left:5px solid #22c55e;background:rgba(34,197,94,0.08)" : ""}">

          <div class="thread-horizontal">

            <div class="avatar small" style="background:hsl(${hue},70%,55%)">
              ${author[0]?.toUpperCase() || "?"}
            </div>

            <a class="thread-title" href="thread.html?id=${id}">
              ${isSticky ? "📌 " : ""}${isLocked ? "🔒 " : ""}${title}
            </a>

            <span class="thread-user">
              од <a href="profile.html?id=${authorId}" class="alink">${author}</a>
            </span>

            <span class="thread-date">${date}</span>
            <span class="thread-comments">💬 ${commentsCount}</span>
            <span class="thread-views">👁️ ${views}</span>

          </div>
        </div>
      `;

      list.insertAdjacentHTML("beforeend", html);
    });

    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.size < limit) lastDoc = null;

  } catch (err) {
    console.error("Грешка при вчитување теми:", err);
    list.insertAdjacentHTML(
      "beforeend",
      `<div class="error">Грешка при вчитување на теми.</div>`
    );
  }
}
