// js/thread.js – PREMIUM ВЕРЗИЈА 21.11.2025
// - Real-time thread
// - Views counter
// - Lock / Unlock
// - Live comments

let currentUser = null;
let currentUserRole = "member";
let threadId = null;
let threadData = null;

let threadUnsub = null;
let commentsUnsub = null;
let viewsIncremented = false;

// ─────────────────────────────────────
// Помошни функции
// ─────────────────────────────────────
function getThreadId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

// Форматирање на датум
function formatDate(ts) {
  if (!ts || !ts.toDate) return "??";
  return ts.toDate().toLocaleString("mk-MK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// ─────────────────────────────────────
// AUTH
// ─────────────────────────────────────
auth.onAuthStateChanged(async (user) => {
  if (!user || !user.uid.startsWith("steam:")) {
    location.href = "index.html";
    return;
  }

  currentUser = user;
  threadId = getThreadId();

  if (!threadId) {
    alert("Грешка: Нема ID на темата.");
    location.href = "forum.html";
    return;
  }

  // Прочитај ја улогата
  try {
    const userSnap = await db.collection("users").doc(user.uid).get();
    const u = userSnap.data() || {};
    currentUserRole = (u.role || "member").toLowerCase();

    if (u.banned) {
      alert("Ти си баниран од форумот.");
      location.href = "main.html";
      return;
    }
  } catch (e) {
    console.warn("Грешка при читање на корисник:", e);
  }

  // Вклучи real-time листенер за темата
  subscribeThread(threadId);
  // Вклучи real-time коментари
  subscribeComments(threadId);

  // Listener за копче „Објави“
  const sendBtn = document.getElementById("sendComment");
  if (sendBtn) {
    sendBtn.addEventListener("click", postComment);
  }
});

// ─────────────────────────────────────
// Real-time Thread Listener
// ─────────────────────────────────────
function subscribeThread(id) {
  const titleEl = document.getElementById("threadTitle");
  const contentEl = document.getElementById("threadContent");
  const authorEl = document.getElementById("threadAuthor");
  const dateEl = document.getElementById("threadDate");
  const viewsEl = document.getElementById("threadViews");
  const commentsMetaEl = document.getElementById("threadComments");
  const lockedBanner = document.getElementById("lockedBanner");
  const commentBox = document.getElementById("commentBox");
  const commentInput = document.getElementById("commentInput");

  if (threadUnsub) threadUnsub();

  threadUnsub = db.collection("threads").doc(id).onSnapshot(
    (doc) => {
      if (!doc.exists) {
        if (titleEl) titleEl.textContent = "Темата не постои или е избришана.";
        if (contentEl) contentEl.textContent = "";
        if (commentBox) commentBox.style.display = "none";
        return;
      }

      threadData = doc.data();

      // Наслов
      if (titleEl) {
        titleEl.textContent = escapeHtml(threadData.title || "Без наслов");
      }

      // Содржина (content / body fallback)
      const bodyText = threadData.content || threadData.body || "";
      if (contentEl) {
        contentEl.innerHTML = escapeHtml(bodyText).replace(/\n/g, "<br>");
      }

      // Автор
      if (authorEl) {
        const authorName = escapeHtml(threadData.author || "Непознат автор");
        const authorId = threadData.authorId || "";
        if (authorId) {
          authorEl.innerHTML = `од <a href="profile.html?id=${authorId}" style="color:#93c5fd;text-decoration:none;">${authorName}</a>`;
        } else {
          authorEl.textContent = authorName;
        }
      }

      // Датум
      if (dateEl) {
        dateEl.textContent = formatDate(threadData.createdAt);
      }

      // Views
      const views = threadData.views || 0;
      if (viewsEl) {
        viewsEl.textContent = `👁 ${views} прегледи`;
      }

      // Comment count (ќе го ажурира и comments listener-от)
      if (commentsMetaEl) {
        const cc = threadData.commentCount || 0;
        commentsMetaEl.textContent = `💬 ${cc} коментари`;
      }

      // Locked state
      const locked = threadData.locked === true;
      if (lockedBanner) lockedBanner.style.display = locked ? "block" : "none";
      if (commentInput) {
        commentInput.disabled = locked;
        commentInput.placeholder = locked
          ? "Оваа тема е заклучена 🔒"
          : "Напиши коментар...";
      }
      const sendBtn = document.getElementById("sendComment");
      if (sendBtn) sendBtn.disabled = locked;

      // Мод панел (само за admin / moderator)
      const modPanel = document.getElementById("modPanel");
      if (modPanel) {
        if (currentUserRole === "admin" || currentUserRole === "moderator") {
          modPanel.style.display = "flex";
        } else {
          modPanel.style.display = "none";
        }
      }

      // Views +1 (само првпат)
      if (!viewsIncremented) {
        viewsIncremented = true;
        db.collection("threads")
          .doc(id)
          .update({
            views: firebase.firestore.FieldValue.increment(1),
          })
          .catch(() => {});
      }
    },
    (err) => {
      console.error("Грешка при слушање на тема:", err);
      if (titleEl) titleEl.textContent = "Грешка при вчитување на темата.";
    }
  );

  // MOD Копчиња
  const deleteBtn = document.getElementById("deleteThread");
  if (deleteBtn) {
    deleteBtn.onclick = handleDeleteThread;
  }

  const toggleLockBtn = document.getElementById("toggleLock");
  if (toggleLockBtn) {
    toggleLockBtn.onclick = handleToggleLock;
  }
}

// ─────────────────────────────────────
// Real-time Comments
// ─────────────────────────────────────
function subscribeComments(id) {
  const list = document.getElementById("commentsList");
  const commentsMetaEl = document.getElementById("threadComments");

  if (!list) return;

  if (commentsUnsub) commentsUnsub();

  commentsUnsub = db
    .collection("threads")
    .doc(id)
    .collection("comments")
    .orderBy("createdAt", "asc")
    .onSnapshot(
      (snap) => {
        if (snap.empty) {
          list.innerHTML =
            "<div style='color:#94a3b8;font-style:italic;padding:10px 0;'>Нема коментари. Биди првиот! 😊</div>";
          if (commentsMetaEl) commentsMetaEl.textContent = "💬 0 коментари";
          // Update thread doc count
          db.collection("threads").doc(id).update({
            commentCount: 0,
          }).catch(() => {});
          return;
        }

        list.innerHTML = "";
        let count = 0;

        snap.forEach((doc) => {
          count++;
          const c = doc.data();

          const authorName = c.author || "Корисник";
          const isOwn = c.authorId === currentUser?.uid;
          const dateStr = c.createdAt
            ? c.createdAt.toDate().toLocaleString("mk-MK", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "??";

          const avatarBg = c.avatarUrl
            ? `background-image:url(${c.avatarUrl});background-size:cover;background-position:center;`
            : `background: hsl(${(authorName.charCodeAt(0) || 0) * 7 % 360},70%,55%);display:flex;align-items:center;justify-content:center;font-weight:bold;`;

          const safeText = escapeHtml(c.text || "").replace(/\n/g, "<br>");

          const canFlag = currentUser && currentUser.uid !== c.authorId;

          const commentHtml = `
            <div class="comment">
              <div class="avatar" style="${avatarBg}">
                ${
                  c.avatarUrl
                    ? ""
                    : escapeHtml(authorName[0]?.toUpperCase() || "?")
                }
              </div>
              <div class="comment-body">
                <div class="comment-user">
                  <span style="color:${isOwn ? "#22c55e" : "#bfdbfe"};">
                    ${escapeHtml(authorName)}
                  </span>
                  <span class="comment-time"> • ${dateStr}</span>
                </div>
                <div class="comment-text">${safeText}</div>
                <div class="comment-actions">
                  <span onclick="quoteComment('${escapeHtml(
                    authorName
                  )}', '${escapeHtml(c.text || "").replace(/'/g, "\\'")}')">
                    💬 Quote
                  </span>
                  ${
                    canFlag
                      ? `<span onclick="flagComment('${doc.id}')">🚩 Пријави</span>`
                      : ""
                  }
                </div>
              </div>
            </div>
          `;

          list.insertAdjacentHTML("beforeend", commentHtml);
        });

        if (commentsMetaEl) {
          commentsMetaEl.textContent = `💬 ${count} ${
            count === 1 ? "коментар" : "коментари"
          }`;
        }

        // Сними го бројот на коментари во thread документот
        db.collection("threads")
          .doc(id)
          .update({
            commentCount: count,
          })
          .catch(() => {});
      },
      (err) => {
        console.error("Грешка при коментари:", err);
        list.innerHTML =
          "<div style='color:#f97316;'>Грешка при вчитување на коментарите.</div>";
      }
    );
}

// ─────────────────────────────────────
// Објавување коментар
// ─────────────────────────────────────
async function postComment() {
  if (!currentUser || !threadId || !threadData) return;

  if (threadData.locked) {
    alert("Оваа тема е заклучена. Не можеш да коментираш.");
    return;
  }

  const input = document.getElementById("commentInput");
  if (!input) return;

  const text = input.value.trim();
  if (!text) {
    alert("Внеси коментар.");
    return;
  }

  try {
    const userSnap = await db.collection("users").doc(currentUser.uid).get();
    const u = userSnap.data() || {};

    await db
      .collection("threads")
      .doc(threadId)
      .collection("comments")
      .add({
        text,
        author: u.username || "Корисник",
        authorId: currentUser.uid,
        avatarUrl: u.avatarUrl || "",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

    input.value = "";
  } catch (e) {
    console.error("Грешка при објавување коментар:", e);
    alert("Грешка при објавување коментар.");
  }
}

// ─────────────────────────────────────
// Quote
// ─────────────────────────────────────
function quoteComment(author, text) {
  const input = document.getElementById("commentInput");
  if (!input) return;

  const cleanText = text.replace(/\r/g, "");
  const prefix = `> ${author} напиша:\n> ${cleanText.replace(
    /\n/g,
    "\n> "
  )}\n\n`;

  input.value = prefix + input.value;
  input.focus();
  input.scrollIntoView({ behavior: "smooth", block: "center" });
}

// ─────────────────────────────────────
// Flag comment
// ─────────────────────────────────────
async function flagComment(commentId) {
  if (!currentUser || !threadId) return;

  if (!confirm("Сигурно сакаш да го пријавиш овој коментар?")) return;

  try {
    await db
      .collection("threads")
      .doc(threadId)
      .collection("comments")
      .doc(commentId)
      .set(
        {
          flagged: true,
        },
        { merge: true }
      );

    alert("Коментарот е пријавен. Модератор ќе го прегледа.");
  } catch (e) {
    console.error("Грешка при пријавување:", e);
    alert("Грешка при пријавување на коментар.");
  }
}

// ─────────────────────────────────────
// MOD FUNKCIИ
// ─────────────────────────────────────
async function handleDeleteThread() {
  if (!(currentUserRole === "admin" || currentUserRole === "moderator")) {
    alert("Немаш привилегии за бришење тема.");
    return;
  }

  if (!threadId) return;

  if (
    !confirm(
      "Сигурно сакаш да ја избришеш оваа тема? Сите коментари ќе бидат изгубени."
    )
  )
    return;

  try {
    // Напомена: Бришењето на сите коментари би требало да оди преку Cloud Function.
    await db.collection("threads").doc(threadId).delete();
    alert("Темата е избришана.");
    location.href = "forum.html";
  } catch (e) {
    console.error("Грешка при бришење тема:", e);
    alert("Грешка при бришење тема.");
  }
}

async function handleToggleLock() {
  if (!(currentUserRole === "admin" || currentUserRole === "moderator")) {
    alert("Немаш привилегии за заклучување.");
    return;
  }

  if (!threadId || !threadData) return;

  const newLocked = !threadData.locked;

  try:
    await db.collection("threads").doc(threadId).update({
      locked: newLocked,
    });
  } catch (e) {
    console.error("Грешка при toggle lock:", e);
    alert("Грешка при промена на состојба на темата.");
  }
}

