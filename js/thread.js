// js/thread.js – ФИНАЛНА ВЕРЗИЈА 20.11.2025 (без грешки!)

let currentUser = null;
let threadId = null;
let threadData = null;

function getThreadId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

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

  await loadThread(threadId);
  loadCommentsRealtime(threadId);
});

// Вчитување на темата
async function loadThread(id) {
  try {
    const doc = await db.collection("threads").doc(id).get();
    if (!doc.exists) {
      document.getElementById("threadTitle").textContent = "Темата не постои или е избришана.";
      return;
    }

    threadData = (await doc).data();

    document.getElementById("threadTitle").textContent = escapeHtml(threadData.title || "Без наслов");

    // Заклучена тема
    if (threadData.locked) {
      document.getElementById("lockedBadge").style.display = "inline-block";
      document.getElementById("commentInput").placeholder = "Оваа тема е заклучена 🔒";
      document.getElementById("commentInput").disabled = true;
      document.querySelector(".new-comment button").disabled = true;
    }

    document.getElementById("threadContent").innerHTML = escapeHtml(threadData.body || "").replace(/\n/g, "<br>");

    // Автор
    document.getElementById("threadAuthor").textContent = escapeHtml(threadData.author || "???");
    document.getElementById("threadDate").textContent = threadData.createdAt?.toDate?.().toLocaleString("mk-MK") || "??";

    const avatar = document.getElementById("threadAuthorAvatar");
    if (threadData.avatarUrl) {
      avatar.style.backgroundImage = `url(${threadData.avatarUrl})`;
      avatar.textContent = "";
    }

  } catch (e) {
    console.error(e);
  }
}

// Реал-тајм коментари
function loadCommentsRealtime(id) {
  const box = document.getElementById("comments");

  db.collection("threads").doc(id).collection("comments")
    .orderBy("createdAt", "asc")
    .onSnapshot(snap => {
      if (snap.empty) {
        box.innerHTML = "<i style='color:#94a3b8;'>Нема коментари. Биди првиот! 😊</i>";
        document.getElementById("commentCount").textContent = "0";
        return;
      }

      box.innerHTML = "";
      let count = 0;

      snap.forEach(doc => {
        count++;
        const c = doc.data();

        const isOwn = c.authorId === currentUser.uid;
        const hue = (c.author?.charCodeAt(0) || 0) * 7 % 360;

        const commentHtml = `
          <div class="comment" id="comment-${doc.id}">
            <div class="comment-header">
              <div class="avatar small" style="background:hsl(${hue},70%,55%)">
                ${c.avatarUrl ? `<img src="${c.avatarUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : (c.author?.[0]?.toUpperCase() || "?")}
              </div>
              <div>
                <b class="comment-author" style="color:${isOwn ? "#22c55e" : "#60a5fa"}">
                  ${escapeHtml(c.author || "Корисник")}
                </b>
                <div class="comment-date">
                  ${c.createdAt?.toDate?.().toLocaleString("mk-MK") || "???"}
                </div>
              </div>
              <div class="comment-actions">
                <button class="quote-btn" onclick="quoteComment('${doc.id}', '${escapeHtml(c.author || "")}', '${escapeHtml(c.text || "")}')">
                  Quote
                </button>
                ${currentUser.uid !== c.authorId ? `<button class="flag-btn" onclick="flagComment('${doc.id}')" title="Пријави">🚩</button>` : ""}
              </div>
            </div>
            <div class="comment-body">
              ${escapeHtml(c.text || "").replace(/\n/g, "<br>")}
            </div>
          </div>
        `;

        box.insertAdjacentHTML("beforeend", commentHtml);
      });

      document.getElementById("commentCount").textContent = count;

      // Ажурирај бројач во темата (за форумот)
      db.collection("threads").doc(id).update({ commentCount: count }).catch(() => {});

    }, err => {
      box.innerHTML = "<p class='error'>Грешка при коментарите.</p>";
    });
}

// Објави коментар
async function postComment() {
  const input = document.getElementById("commentInput");
  const text = input.value.trim();

  if (!text) {
    alert("Внеси коментар!");
    return;
  }

  if (threadData?.locked) {
    alert("Темата е заклучена!");
    return;
  }

  try {
    const userDoc = await db.collection("users").doc(currentUser.uid).get();
    const u = userDoc.data();

    await db.collection("threads").doc(threadId).collection("comments").add({
      text,
      author: u.username || "Корисник",
      authorId: currentUser.uid,
      avatarUrl: u.avatarUrl || "",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    input.value = "";
  } catch (e) {
    alert("Грешка при објавување коментар.");
  }
}

// Quote
function quoteComment(commentId, author, text) {
  const input = document.getElementById("commentInput");
  const quote = `> ${author} рече:\n> ${text.replace(/\n/g, "\n> ")}\n\n`;
  input.value = quote + input.value;
  input.focus();
  input.scrollIntoView({ behavior: "smooth" });
}

// Пријави
async function flagComment(commentId) {
  if (!confirm("Да го пријавам коментарот?")) return;

  try {
    await db.collection("threads").doc(threadId).collection("comments").doc(commentId).update({
      flagged: true
    });
    alert("Коментарот е пријавен. Модератор ќе го прегледа.");
  } catch (e) {
    alert("Грешка при пријавување.");
  }
}
