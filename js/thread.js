// ─────────────────────────────
// 🔥 INIT
// auth, db доаѓаат од firebase-config.js
// ─────────────────────────────

let currentUser = null;
let userRole = "member";
let threadId = null;

// ─────────────────────────────
// 🧩 Земи ID од URL
// ─────────────────────────────
function getThreadId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

// ─────────────────────────────
// ⛔ ПРОВЕРКА ЗА LOGIN
// ─────────────────────────────
auth.onAuthStateChanged(async user => {
    if (!user || !user.emailVerified) {
        location.href = "index.html";
        return;
    }

    currentUser = user;

    const doc = await db.collection("users").doc(user.uid).get();
    const data = doc.exists ? doc.data() : {};
    userRole = data.role || "member";

    threadId = getThreadId();
    if (!threadId) {
        alert("Недостасува ID на темата.");
        location.href = "forum.html";
        return;
    }

    loadThread();
    loadComments();
});

// ─────────────────────────────
// 📌 LOAD THREAD
// ─────────────────────────────
async function loadThread() {
    const titleEl = document.getElementById("threadTitle");
    const bodyEl = document.getElementById("threadBody");
    const authorEl = document.getElementById("threadAuthor");
    const timeEl = document.getElementById("threadTime");
    const avatarEl = document.getElementById("threadAvatar");

    const doc = await db.collection("threads").doc(threadId).get();

    if (!doc.exists) {
        titleEl.textContent = "Тема не постои.";
        return;
    }

    const t = doc.data();

    const title = escapeHtml(t.title || "Без наслов");
    const body = escapeHtml(t.body || "");
    const author = escapeHtml(t.author || "Непознат");
    const avatar = t.avatarUrl || "";
    const time = t.createdAt?.toDate?.().toLocaleString("mk-MK") || "??";

    titleEl.textContent = title;
    bodyEl.innerHTML = convertLinks(body);
    authorEl.textContent = author;
    timeEl.textContent = time;

    if (avatar) {
        avatarEl.style.backgroundImage = `url('${avatar}')`;
        avatarEl.textContent = "";
    } else {
        avatarEl.textContent = author.charAt(0).toUpperCase();
    }
}

// ─────────────────────────────
// 💬 LOAD COMMENTS
// ─────────────────────────────
async function loadComments() {
    const list = document.getElementById("commentList");
    list.innerHTML = `<div class="loading">Вчитувам...</div>`;

    try {
        const snap = await db.collection("threads")
            .doc(threadId)
            .collection("comments")
            .orderBy("createdAt")
            .get();

        if (snap.empty) {
            list.innerHTML = `<p class="empty">Нема коментари. Биди првиот!</p>`;
            return;
        }

        list.innerHTML = "";

        snap.forEach(doc => {
            const c = doc.data();
            const id = doc.id;

            const text = escapeHtml(c.text || "");
            const author = escapeHtml(c.author || "???");
            const avatar = c.avatarUrl || "";
            const time = c.createdAt?.toDate?.().toLocaleString("mk-MK") || "??";

            // ДАЛИ МОЖЕ EDIT/DELETE?
            const isAuthor = currentUser.uid === c.authorId;
            const isMod = userRole === "admin" || userRole === "moderator";

            const html = `
                <div class="comment">
                    <div class="c-avatar"
                         style="${avatar ? `background-image:url('${avatar}')` : ""}">
                        ${!avatar ? author.charAt(0).toUpperCase() : ""}
                    </div>

                    <div class="c-body">
                        <div class="c-header">
                            <span class="c-author">${author}</span>
                            <span class="c-time">${time}</span>
                        </div>

                        <div class="c-text">${convertLinks(text)}</div>

                        <div class="c-actions">
                            <button class="flag-btn" onclick="flagComment('${id}')">
                                🚩 Пријави
                            </button>

                            ${isAuthor ? `
                                <button class="edit-btn" onclick="editComment('${id}', '${escapeJs(text)}')">Уреди</button>
                                <button class="del-btn" onclick="deleteComment('${id}')">Избриши</button>
                            ` : ""}

                            ${isMod && !isAuthor ? `
                                <button class="mod-del" onclick="deleteComment('${id}')">MOD Delete</button>
                            ` : ""}
                        </div>
                    </div>
                </div>
            `;

            list.insertAdjacentHTML("beforeend", html);
        });

    } catch (err) {
        console.error(err);
        list.innerHTML = `<p class="error">Грешка при вчитување коментари.</p>`;
    }
}

// ─────────────────────────────
// ➕ ADD COMMENT
// ─────────────────────────────
async function addComment() {
    const input = document.getElementById("commentInput");
    const text = input.value.trim();

    if (!text) return alert("Внеси коментар.");

    const userDoc = await db.collection("users").doc(currentUser.uid).get();
    const u = userDoc.data();

    try {
        await db.collection("threads")
            .doc(threadId)
            .collection("comments")
            .add({
                text,
                author: u.username || currentUser.email,
                authorId: currentUser.uid,
                avatarUrl: u.avatarUrl || "",
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                flagged: false,
                flaggedBy: []
            });

        input.value = "";
        loadComments();

    } catch (err) {
        console.error(err);
        alert("Грешка при коментирање.");
    }
}

// ─────────────────────────────
// 🚩 FLAG COMMENT
// ─────────────────────────────
async function flagComment(id) {
    try {
        const ref = db.collection("threads")
            .doc(threadId)
            .collection("comments")
            .doc(id);

        await ref.update({
            flagged: true,
            flaggedBy: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
        });

        alert("Коментарот е пријавен.");
    } catch {
        alert("Грешка.");
    }
}

// ─────────────────────────────
// ✏️ EDIT COMMENT (AUTHOR ONLY)
// ─────────────────────────────
async function editComment(id, oldText) {
    const newText = prompt("Уреди го коментарот:", oldText);
    if (!newText) return;

    try {
        await db.collection("threads")
            .doc(threadId)
            .collection("comments")
            .doc(id)
            .update({
                text: newText
            });

        loadComments();
    } catch {
        alert("Грешка.");
    }
}

// ─────────────────────────────
// ❌ DELETE COMMENT
// ─────────────────────────────
async function deleteComment(id) {
    if (!confirm("Дали сигурно сакаш да избришеш коментар?")) return;

    try {
        await db.collection("threads")
            .doc(threadId)
            .collection("comments")
            .doc(id)
            .delete();

        loadComments();
    } catch (err) {
        console.error(err);
        alert("Грешка при бришење.");
    }
}

// ─────────────────────────────
// 🛡 ESCAPE HTML
// ─────────────────────────────
function escapeHtml(t) {
    const d = document.createElement("div");
    d.textContent = t;
    return d.innerHTML;
}

// ─────────────────────────────
// 🛡 ESCAPE за JS string во prompt()
// ─────────────────────────────
function escapeJs(t) {
    return t.replace(/"/g, '&quot;').replace(/'/g, "\\'");
}

// ─────────────────────────────
// 🔗 АВТОМАПАЊЕ LINKОВИ
// ─────────────────────────────
function convertLinks(text) {
    return text.replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1" target="_blank">$1</a>'
    );
}
