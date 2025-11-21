// js/thread.js – PREMIUM ВЕРЗИЈА 21.11.2025
// - Real-time коментари
// - 👍 Like систем
// - Quote / Reply
// - Edit & Delete сопствен коментар
// - Flag (report)
// - View counter
// - Locked / Sticky поддршка
// - Mod панел (admin / moderator)

let currentUser = null;
let currentUserRole = "member";
let threadId = null;
let threadData = null;

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────
function getThreadId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function escapeHtml(text = "") {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(ts) {
  if (!ts || !ts.toDate) return "??";
  return ts.toDate().toLocaleString("mk-MK", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// ─────────────────────────────────────────
// Main auth flow
// ─────────────────────────────────────────
auth.onAuthStateChanged(async user => {
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

  // Вчитај улога на корисник
  try {
    const userSnap = await db.collection("users").doc(user.uid).get();
    if (userSnap.exists) {
      const u = userSnap.data();
      currentUserRole = (u.role || "member").toLowerCase();
    }
  } catch (e) {
    console.warn("Не можам да ја вчитам улогата:", e);
  }

  // Врзи UI handler-и
  bindUiHandlers();

  // Вчитај тема + коментари
  await loadThread(threadId);
  listenCommentsRealtime(threadId);
});

// ─────────────────────────────────────────
// Bind UI handlers
// ─────────────────────────────────────────
function bindUiHandlers() {
  const sendBtn = document.getElementById("sendComment");
  const textarea = document.getElementById("commentInput");

  if (sendBtn) {
    sendBtn.addEventListener("click", postComment);
  }

  if (textarea) {
    textarea.addEventListener("keydown", e => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        postComment();
      }
    });
  }

  const delBtn = document.getElementById("deleteThread");
  const lockBtn = document.getElementById("toggleLock");

  if (delBtn) delBtn.addEventListener("click", deleteThread);
  if (lockBtn) lockBtn.addEventListener("click", toggleLock);
}

// ─────────────────────────────────────────
// Load thread data
// ─────────────────────────────────────────
async function loadThread(id) {
  const titleEl = document.getElementById("threadTitle");
  const authorEl = document.getElementById("threadAuthor");
  const dateEl = document.getElementById("threadDate");
  const viewsEl = document.getElementById("threadViews");
  const lockedBanner = document.getElementById("lockedBanner");
  const contentEl = document.getElementById("threadContent");
  const modPanel = document.getElementById("modPanel");
  const commentBox = document.getElementById("commentBox");

  try {
    const snap = await db.collection("threads").doc(id).get();
    if (!snap.exists) {
      if (titleEl) titleEl.textContent = "Темата не постои или е избришана.";
      if (contentEl) contentEl.textContent = "";
      if (commentBox) commentBox.style.display = "none";
      return;
    }

    threadData = snap.data();

    const title = threadData.title || "Без наслов";
    const author = threadData.author || "Непознат";
    const createdAt = threadData.createdAt;
    const locked = threadData.locked === true;
    const currentViews = threadData.views || 0;
    const sticky = threadData.sticky === true;

    if (titleEl) titleEl.textContent = title;

    if (authorEl) {
      authorEl.innerHTML = `
        од <strong class="author-tag">${escapeHtml(author)}</strong>
        ${sticky ? `<span class="meta-pill">📌 Sticky</span>` : ""}
      `;
    }

    if (dateEl) dateEl.textContent = formatDate(createdAt);

    if (viewsEl) {
      viewsEl.textContent = `Прегледи: ${currentViews + 1}`;
    }

    if (contentEl) {
      const body = threadData.body || threadData.content || "";
      contentEl.innerHTML = escapeHtml(body).replace(/\n/g, "<br>");
    }

    if (locked && lockedBanner && commentBox) {
      lockedBanner.style.display = "block";
      const textarea = document.getElementById("commentInput");
      const button = document.getElementById("sendComment");
      if (textarea) {
        textarea.disabled = true;
        textarea.placeholder = "Оваа тема е заклучена 🔒";
      }
      if (button) button.disabled = true;
    }

    // View counter (+1)
    db.collection("threads").doc(id)
      .update({ views: firebase.firestore.FieldValue.increment(1) })
      .catch(() => {});

    // Мод панел
    if (modPanel && (currentUserRole === "admin" || currentUserRole === "moderator")) {
      modPanel.style.display = "flex";
    }

  } catch (e) {
    console.error("Грешка при вчитување на темата:", e);
  }
}

// ─────────────────────────────────────────
// Real-time comments
// ─────────────────────────────────────────
function listenCommentsRealtime(id) {
  const listEl = document.getElementById("commentsList");
  const countMeta = document.getElementById("threadComments");

  if (!listEl) return;

  db.collection("threads").doc(id).collection("comments")
    .orderBy("createdAt", "asc")
    .onSnapshot(snap => {
      if (snap.empty) {
        listEl.innerHTML = "<i style='color:#94a3b8;'>Нема коментари. Биди првиот! 😊</i>";
        if (countMeta) countMeta.textContent = "Коментари: 0";
        // update thread doc counter
        db.collection("threads").doc(id).update({ commentCount: 0 }).catch(() => {});
        return;
      }

      listEl.innerHTML = "";
      let count = 0;

      snap.forEach(doc => {
        count++;
        const c = doc.data();
        const cid = doc.id;

        const isOwn = c.authorId === currentUser.uid;
        const isThreadAuthor = threadData && c.authorId === threadData.authorId;
        const likedBy = Array.isArray(c.likedBy) ? c.likedBy : [];
        const liked = likedBy.includes(currentUser.uid);
        const likesCount = c.likesCount || likedBy.length || 0;

        const letter = (c.author || "?")[0]?.toUpperCase() || "?";
        const hue = (c.author?.charCodeAt(0) || 0) * 7 % 360;

        const created = formatDate(c.createdAt);
        const editedMark = c.edited ? " <span style='font-size:0.8rem;color:#9ca3af'>(уредено)</span>" : "";

        // Подготовка на текст за quote (без HTML)
        const plainText = (c.text || "").replace(/"/g, "&quot;").replace(/\n/g, "\\n");

        const commentHtml = `
          <div class="comment" id="comment-${cid}">
            <div class="avatar" style="background:hsl(${hue},70%,45%)">
              ${
                c.avatarUrl
                  ? `<img src="${c.avatarUrl}" alt="">`
                  : `${letter}`
              }
            </div>
            <div class="comment-body">
              <div class="comment-user-line">
                <span class="comment-user" style="color:${isOwn ? "#22c55e" : "#bfdbfe"}">
                  ${escapeHtml(c.author || "Корисник")}
                </span>
                ${isThreadAuthor ? `<span class="comment-author-tag">Автор на темата</span>` : ""}
              </div>
              <div class="comment-time">${created}${editedMark}</div>
              <div class="comment-text">
                ${escapeHtml(c.text || "").replace(/\n/g, "<br>")}
              </div>
              <div class="comment-actions">
                <span 
                  class="like-btn ${liked ? "like-active" : ""}" 
                  onclick="toggleLike('${cid}')">
                  👍 <span class="like-count" id="like-count-${cid}">${likesCount}</span>
                </span>
                <span onclick="quoteComment('${cid}', '${escapeHtml(c.author || "")}', \`${plainText}\`)">
                  💬 Quote
                </span>
                ${isOwn ? `
                  <span onclick="editComment('${cid}')">✏️ Уреди</span>
                  <span onclick="deleteComment('${cid}')">🗑 Избриши</span>
                ` : `
                  <span onclick="flagComment('${cid}')">🚩 Пријави</span>
                `}
              </div>
            </div>
          </div>
        `;

        listEl.insertAdjacentHTML("beforeend", commentHtml);
      });

      if (countMeta) countMeta.textContent = `Коментари: ${count}`;

      // update thread doc counter
      db.collection("threads").doc(id).update({
        commentCount: count
      }).catch(() => {});
    }, err => {
      console.error("Грешка при коментари:", err);
      listEl.innerHTML = "<p class='error'>Грешка при вчитување на коментарите.</p>";
      if (countMeta) countMeta.textContent = "Коментари: —";
    });
}

// ─────────────────────────────────────────
// Post comment
// ─────────────────────────────────────────
async function postComment() {
  const textarea = document.getElementById("commentInput");
  const btn = document.getElementById("sendComment");

  if (!textarea || !currentUser || !threadId) return;

  const text = textarea.value.trim();
  if (!text) {
    alert("Внеси коментар.");
    return;
  }

  if (threadData && threadData.locked) {
    alert("Темата е заклучена. Нема нови коментари.");
    return;
  }

  try {
    btn && (btn.disabled = true);

    const userSnap = await db.collection("users").doc(currentUser.uid).get();
    const u = userSnap.exists ? userSnap.data() : {};

    await db.collection("threads").doc(threadId).collection("comments").add({
      text,
      author: u.username || "Корисник",
      authorId: currentUser.uid,
      avatarUrl: u.avatarUrl || "",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      likedBy: [],
      likesCount: 0,
      edited: false
    });

    // Инкрементирај глобален бројач на коментари (по желба)
    db.collection("stats").doc("community").set({
      comments: firebase.firestore.FieldValue.increment(1)
    }, { merge: true }).catch(() => {});

    textarea.value = "";

  } catch (e) {
    console.error("Грешка при објавување коментар:", e);
    alert("Грешка при објавување коментар.");
  } finally {
    btn && (btn.disabled = false);
  }
}

// ─────────────────────────────────────────
// Like / Unlike comment
// ─────────────────────────────────────────
async function toggleLike(commentId) {
  if (!currentUser || !threadId) return;

  const ref = db.collection("threads").doc(threadId).collection("comments").doc(commentId);

  try {
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) return;

      const data = snap.data();
      const likedBy = Array.isArray(data.likedBy) ? data.likedBy : [];
      const hasLiked = likedBy.includes(currentUser.uid);

      let newLikedBy, increment;
      if (hasLiked) {
        newLikedBy = likedBy.filter(id => id !== currentUser.uid);
        increment = -1;
      } else {
        newLikedBy = [...likedBy, currentUser.uid];
        increment = 1;
      }

      tx.update(ref, {
        likedBy: newLikedBy,
        likesCount: (data.likesCount || likedBy.length || 0) + increment
      });
    });
  } catch (e) {
    console.error("Грешка при like:", e);
  }
}

// ─────────────────────────────────────────
// Quote comment
// ─────────────────────────────────────────
function quoteComment(commentId, author, rawText) {
  const textarea = document.getElementById("commentInput");
  if (!textarea) return;

  const text = (rawText || "").replace(/\\n/g, "\n");
  const quoted = text.split("\n").map(l => `> ${l}`).join("\n");

  const header = `> ${author} рече:\n`;
  textarea.value = `${header}${quoted}\n\n` + textarea.value;
  textarea.focus();
  textarea.scrollIntoView({ behavior: "smooth", block: "center" });
}

// ─────────────────────────────────────────
// Edit own comment
// ─────────────────────────────────────────
async function editComment(commentId) {
  if (!currentUser || !threadId) return;

  const ref = db.collection("threads").doc(threadId).collection("comments").doc(commentId);

  try {
    const snap = await ref.get();
    if (!snap.exists) return;

    const data = snap.data();
    if (data.authorId !== currentUser.uid) {
      alert("Не можеш да уредуваш туѓ коментар.");
      return;
    }

    const currentText = data.text || "";
    const newText = prompt("Уреди го коментарот:", currentText);
    if (newText === null) return;

    const trimmed = newText.trim();
    if (!trimmed) {
      alert("Коментарот не може да биде празен.");
      return;
    }

    await ref.update({
      text: trimmed,
      edited: true
    });

  } catch (e) {
    console.error("Грешка при уредување коментар:", e);
    alert("Грешка при уредување на коментар.");
  }
}

// ─────────────────────────────────────────
// Delete own comment
// ─────────────────────────────────────────
async function deleteComment(commentId) {
  if (!currentUser || !threadId) return;

  if (!confirm("Дали сигурно сакаш да го избришеш овој коментар?")) return;

  const ref = db.collection("threads").doc(threadId).collection("comments").doc(commentId);

  try {
    const snap = await ref.get();
    if (!snap.exists) return;

    const data = snap.data();
    if (data.authorId !== currentUser.uid && currentUserRole === "member") {
      alert("Не можеш да бришеш туѓ коментар.");
      return;
    }

    await ref.delete();

    // Ако брише мод/админ, не го менуваме stats/community (keep it simple)

  } catch (e) {
    console.error("Грешка при бришење коментар:", e);
    alert("Грешка при бришење на коментар.");
  }
}

// ─────────────────────────────────────────
// Flag comment (report)
// ─────────────────────────────────────────
async function flagComment(commentId) {
  if (!currentUser || !threadId) return;
  if (!confirm("Да го пријавам коментарот до модераторите?")) return;

  try {
    await db.collection("threads").doc(threadId).collection("comments").doc(commentId).set({
      flagged: true
    }, { merge: true });

    alert("Коментарот е пријавен. Модератор ќе го прегледа.");
  } catch (e) {
    console.error("Грешка при пријавување:", e);
    alert("Грешка при пријавување.");
  }
}

// ─────────────────────────────────────────
// Moderator actions
// ─────────────────────────────────────────
async function deleteThread() {
  if (currentUserRole !== "admin" && currentUserRole !== "moderator") {
    alert("Немаш дозвола да бришеш тема.");
    return;
  }

  if (!threadId) return;
  if (!confirm("Сигурно сакаш да ја избришеш целата тема и сите коментари?")) return;

  try {
    // Бришење на сите коментари (simple, без batch pagination)
    const commentsSnap = await db.collection("threads").doc(threadId).collection("comments").get();
    const batch = db.batch();

    commentsSnap.forEach(doc => batch.delete(doc.ref));
    batch.delete(db.collection("threads").doc(threadId));

    await batch.commit();

    alert("Темата е избришана.");
    location.href = "forum.html";

  } catch (e) {
    console.error("Грешка при бришење на тема:", e);
    alert("Грешка при бришење тема.");
  }
}

async function toggleLock() {
  if (currentUserRole !== "admin" && currentUserRole !== "moderator") {
    alert("Немаш дозвола да ја менуваш заклученоста.");
    return;
  }
  if (!threadId) return;

  try {
    const ref = db.collection("threads").doc(threadId);
    const snap = await ref.get();
    if (!snap.exists) return;

    const locked = !!snap.data().locked;
    await ref.update({ locked: !locked });

    alert(!locked ? "Темата е заклучена." : "Темата е отклучена.");
    // refresh view
    loadThread(threadId);

  } catch (e) {
    console.error("Грешка при toggle lock:", e);
    alert("Грешка при смена на статусот на темата.");
  }
}

