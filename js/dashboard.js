// js/dashboard.js – PREMIUM FINAL 2025
// Модератор + Админ панел (flagged систем, sticky, lock, delete)

let currentUser = null;
let userRole = "member";

// ───────────────────────────────────────────────
// AUTH + ROLE CHECK
// ───────────────────────────────────────────────
auth.onAuthStateChanged(async user => {
  if (!user || !user.uid.startsWith("steam:")) {
    location.href = "index.html";
    return;
  }

  currentUser = user;

  try {
    const doc = await db.collection("users").doc(user.uid).get();
    const data = doc.exists ? doc.data() : {};

    userRole = (data.role || "member").toLowerCase();

    if (!["admin", "moderator"].includes(userRole)) {
      alert("⛔ Немаш дозвола за овој панел!");
      location.href = "main.html";
      return;
    }

    // Сè е во ред – вчитај панел
    loadFlaggedComments();
    loadFlaggedThreads();

  } catch (err) {
    console.error("Грешка при провера на пристап:", err);
    location.href = "main.html";
  }
});

// ───────────────────────────────────────────────
// ФЛЕГИРАНИ КОМЕНТАРИ
// ───────────────────────────────────────────────
async function loadFlaggedComments() {
  const container = document.getElementById("flaggedComments");
  container.innerHTML = `<div class="loading">Вчитувам флегирани коментари...</div>`;

  try {
    const threadsSnap = await db.collection("threads").get();
    let flagged = [];

    // Читање на flagged comments од сите теми
    for (const t of threadsSnap.docs) {
      const threadId = t.id;
      const threadTitle = escapeHtml(t.data().title || "Без наслов");

      const commentsSnap = await t.ref
        .collection("comments")
        .where("flagged", "==", true)
        .get();

      commentsSnap.forEach(c => {
        const com = c.data();

        flagged.push({
          threadId,
          commentId: c.id,
          threadTitle,
          author: escapeHtml(com.author || "???"),
          text: escapeHtml(com.text || "(празно)"),
          date: com.createdAt?.toDate?.().toLocaleString("mk-MK") || "??"
        });
      });
    }

    if (flagged.length === 0) {
      container.innerHTML = `<p class="empty">🟢 Нема флегирани коментари.</p>`;
      return;
    }

    container.innerHTML = "";

    flagged.forEach(item => {
      container.insertAdjacentHTML("beforeend", `
        <div class="item">
          <div class="item-header">
            <div class="item-title">📢 ${item.author}</div>
            <div class="item-meta">${item.date}</div>
          </div>

          <div class="item-content">
            "${item.text}"
            <br><br>
            <a href="thread.html?id=${item.threadId}" target="_blank" style="color:#60a5fa;">
              → Тема: ${item.threadTitle}
            </a>
          </div>

          <div class="item-actions">
            <button class="btn btn-approve"
              onclick="unflagComment('${item.threadId}','${item.commentId}')">
              🟢 Одфлегирај
            </button>

            <button class="btn btn-delete"
              onclick="deleteComment('${item.threadId}','${item.commentId}')">
              🔴 Избриши
            </button>
          </div>
        </div>
      `);
    });

  } catch (err) {
    console.error("Грешка при вчитување флегирани коментари:", err);
    container.innerHTML = `<p class="error">Грешка при вчитување.</p>`;
  }
}

// ───────────────────────────────────────────────
// ФЛЕГИРАНИ ТЕМИ + МОДЕРАЦИЈА НА ТЕМИ
// ───────────────────────────────────────────────
async function loadFlaggedThreads() {
  const container = document.getElementById("flaggedThreads");
  container.innerHTML = `<div class="loading">Вчитувам теми...</div>`;

  try {
    // Флегирани теми
    const flaggedSnap = await db.collection("threads")
      .where("flagged", "==", true)
      .orderBy("createdAt", "desc")
      .get();

    // Сите теми
    const allSnap = await db.collection("threads")
      .orderBy("sticky", "desc")
      .orderBy("createdAt", "desc")
      .get();

    const flaggedIds = flaggedSnap.docs.map(doc => doc.id);

    // Merge: flagged теми први, останати после нив
    const allThreads = [
      ...flaggedSnap.docs,
      ...allSnap.docs.filter(d => !flaggedIds.includes(d.id))
    ];

    if (allThreads.length === 0) {
      container.innerHTML = `<p class="empty">Нема теми.</p>`;
      return;
    }

    container.innerHTML = "";

    allThreads.forEach(doc => {
      const t = doc.data();
      const id = doc.id;

      const isFlagged = t.flagged === true;
      const isSticky = t.sticky === true;
      const isLocked = t.locked === true;

      container.insertAdjacentHTML("beforeend", `
        <div class="item" style="${isFlagged ? 'border-left:5px solid #ef4444;' : ''}">
          
          <div class="item-header">
            <div class="item-title">
              ${isSticky ? "📌 " : ""}
              ${isLocked ? "🔒 " : ""}
              ${isFlagged ? "🚩 " : ""}
              <strong>${escapeHtml(t.title || "Без наслов")}</strong>
            </div>
            <div class="item-meta">
              ${escapeHtml(t.author || "???")} • 
              ${t.createdAt?.toDate?.().toLocaleDateString("mk-MK") || "??"}
            </div>
          </div>

          <div class="item-actions">
            ${isFlagged ? `
              <button class="btn btn-approve" onclick="unflagThread('${id}')">
                Одфлегирај
              </button>
            ` : ""}

            <button class="btn" style="background:${isSticky ? '#f59e0b' : '#3b82f6'};"
              onclick="toggleSticky('${id}', ${isSticky})">
              ${isSticky ? "Одлепи" : "Залепи"}
            </button>

            <button class="btn" style="background:${isLocked ? '#22c55e' : '#64748b'};"
              onclick="toggleLock('${id}', ${isLocked})">
              ${isLocked ? "Отклучи" : "Заклучи"}
            </button>

            <button class="btn btn-delete" onclick="deleteThread('${id}')">
              Избриши
            </button>
          </div>

        </div>
      `);
    });

  } catch (err) {
    console.error("Грешка при вчитување теми:", err);
    container.innerHTML = `<p class="error">Грешка при вчитување.</p>`;
  }
}

// ───────────────────────────────────────────────
// АКЦИИ — COMMENT MODERATION
// ───────────────────────────────────────────────
async function unflagComment(threadId, commentId) {
  if (!confirm("Одфлегирај коментар?")) return;
  await db.collection("threads").doc(threadId)
    .collection("comments")
    .doc(commentId)
    .update({ flagged: false });

  loadFlaggedComments();
}

async function deleteComment(threadId, commentId) {
  if (!confirm("Избриши коментар?")) return;
  await db.collection("threads").doc(threadId)
    .collection("comments")
    .doc(commentId)
    .delete();

  loadFlaggedComments();
}

// ───────────────────────────────────────────────
// АКЦИИ — THREAD MODERATION
// ───────────────────────────────────────────────
async function unflagThread(id) {
  if (!confirm("Одфлегирај тема?")) return;
  await db.collection("threads").doc(id).update({ flagged: false });
  loadFlaggedThreads();
}

async function deleteThread(id) {
  if (!confirm("Сигурен си дека сакаш да ја избришеш целата тема?")) return;

  // Бриши ја темата и сите коментари
  const commentsSnap = await db.collection("threads").doc(id)
    .collection("comments").get();

  const batch = db.batch();

  commentsSnap.forEach(doc => batch.delete(doc.ref));
  batch.delete(db.collection("threads").doc(id));

  await batch.commit();

  loadFlaggedThreads();
}

async function toggleSticky(id, current) {
  await db.collection("threads").doc(id).update({ sticky: !current });
  loadFlaggedThreads();
}

async function toggleLock(id, current) {
  await db.collection("threads").doc(id).update({ locked: !current });
  loadFlaggedThreads();
}

// ───────────────────────────────────────────────
// SAFE ESCAPE
// ───────────────────────────────────────────────
function escapeHtml(t) {
  const d = document.createElement("div");
  d.textContent = t || "";
  return d.innerHTML;
}

