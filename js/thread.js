// ─────────────────────────────
// 🔥 INIT
// ─────────────────────────────
let currentUser = null;
let userRole = "member";
let threadId = null;
let threadLocked = false;

// ─────────────────────────────
// 🧩 GET THREAD ID
// ─────────────────────────────
function getThreadId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

// ─────────────────────────────
// ⛔ LOGIN + STEAM FIX
// ─────────────────────────────
auth.onAuthStateChanged(async user => {
    if (!user) {
        location.href = "index.html";
        return;
    }

    const provider = user.providerData[0]?.providerId || "custom";
    const isSteam = provider === "custom" || user.uid.startsWith("steam:");

    // Email users must verify
    if (!isSteam && !user.emailVerified) {
        alert("Прво потврди го email-от.");
        location.href = "index.html";
        return;
    }

    currentUser = user;

    const doc = await db.collection("users").doc(user.uid).get();
    const data = doc.exists ? doc.data() : {};

    // banned?
    if (data.banned === true) {
        alert("Ти си баниран од форумот.");
        location.href = "main.html";
        return;
    }

    userRole = data.role || "member";

    threadId = getThreadId();
    if (!threadId) {
        alert("Недостасува ID на темата.");
        location.href = "forum.html";
        return;
    }

    await loadThread();
    await loadComments();
});

// ─────────────────────────────
// 📌 LOAD THREAD
// ─────────────────────────────
async function loadThread() {
    const doc = await db.collection("threads").doc(threadId).get();
    const titleEl = document.getElementById("threadTitle");
    const bodyEl = document.getElementById("threadBody");
    const authorEl = document.getElementById("threadAuthor");
    const timeEl = document.getElementById("threadTime");
    const avatarEl = document.getElementById("threadAvatar");
    const lockedEl = document.getElementById("lockedBanner");

    if (!doc.exists) {
        if (titleEl) titleEl.textContent = "Тема не постои.";
        return;
    }

    const t = doc.data();

    // LOCK?
    threadLocked = t.locked === true;
    if (threadLocked && lockedEl) lockedEl.style.display = "block";

    const authorName = escapeHtml(t.author || "Непознат");

    if (titleEl) titleEl.textContent = escapeHtml(t.title || "Без наслов");
    if (bodyEl) bodyEl.innerHTML = convertLinks(escapeHtml(t.body || ""));
    if (authorEl) authorEl.innerHTML = `<a href="profile.html?id=${t.authorId}" class="profile-link">${authorName}</a>`;
    if (timeEl) timeEl.textContent = t.createdAt?.toDate?.().toLocaleString("mk-MK") || "??";

    // Avatar
    if (avatarEl) {
        if (t.avatarUrl) {
            avatarEl.style.backgroundImage = `url('${t.avatarUrl}')`;
            avatarEl.textContent = "";
        } else {
            avatarEl.style.background = "#1f2937";
            avatarEl.textContent = authorName.charAt(0).toUpperCase();
        }
    }
}

// ─────────────────────────────
// 💬 LOAD COMMENTS
// ─────────────────────────────
async function loadComments() {
    const list = document.getElementById("commentList");
    if (!list) return;

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

            const author = escapeHtml(c.author || "Непознат");
            const avatar = c.avatarUrl || "";
            const text = escapeHtml(c.text || "");
            const time = c.createdAt?.toDate?.().toLocaleString("mk-MK") || "??";

            const isAuthor = currentUser.uid === c.authorId;
            const isMod = userRole === "admin" || userRole === "moderator";

            const html = `
                <div class="comment">
                    <div class="c-avatar" style="${avatar ? `background-image:url('${avatar}')` : ""}">
                        ${!avatar ? author.charAt(0).toUpperCase() : ""}
                    </div>

                    <div class="c-body">

                        <div class="c-header">
                            <a href="profile.html?id=${c.authorId}" class="c-author">${author}</a>
                            <span class="c-time">${time}</span>
                        </div>

                        <div class="c-text">${convertLinks(text)}</div>

                        <div class="c-actions">
                            <button class="flag-btn" onclick="flagComment('${id}')">🚩 Пријави</button>

                            ${(!threadLocked && isAuthor) ? `
                                <button class="edit-btn" onclick="editComment('${id}', '${escapeJs(text)}')">Уреди</button>
                                <button class="del-btn" onclick="deleteComment('${id}')">Избриши</button>
                            ` : ""}

                            ${(isMod && !isAuthor) ? `
                                <button class="mod-del" onclick="deleteComment('${id}')">MOD Бришење</button>
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
    if (threadLocked) {
        alert("Темата е заклучена.");
        return;
    }

    const input = document.getElementById("commentInput");
    const text = input.value.trim();
    if (!text) return alert("Внеси коментар.");

    const userDoc = await db.collection("users").doc(currentUser.uid).get();
    const u = userDoc.exists ? userDoc.data() : {};

    const usernameSafe =
        u.username ||
        u.displayName ||
        currentUser.displayName ||
        "Unknown";

    try {
        await db.collection("threads")
            .doc(threadId)
            .collection("comments")
            .add({
                text: text,
                author: usernameSafe,
                authorId: currentUser.uid,
                avatarUrl: u.avatarUrl || "",
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                flagged: false,
                flaggedBy: []
            });

        input.value = "";
        loadComments();

    } catch (err) {
        console.error("Comment error:", err);
        alert("Грешка при коментирање.");
    }
}

// ─────────────────────────────
// 🚩 FLAG COMMENT
// ─────────────────────────────
async function flagComment(id) {
    try {
        await db.collection("threads")
            .doc(threadId)
            .collection("comments")
            .doc(id)
            .update({
                flagged: true,
                flaggedBy: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
            });

        alert("Коментарот е пријавен.");
    } catch {
        alert("Грешка.");
    }
}

// ─────────────────────────────
// ✏️ EDIT COMMENT
// ─────────────────────────────
async function editComment(id, oldText) {
    const newText = prompt("Уреди го коментарот:", oldText);
    if (!newText) return;

    try {
        await db.collection("threads")
            .doc(threadId)
            .collection("comments")
            .doc(id)
            .update({ text: newText });

        loadComments();
    } catch {
        alert("Грешка.");
    }
}

// ─────────────────────────────
// ❌ DELETE COMMENT
// ─────────────────────────────
async function deleteComment(id) {
    if (!confirm("Дали сигурно?")) return;

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
// ESCAPES
// ─────────────────────────────
function escapeHtml(t) {
    const d = document.createElement("div");
    d.textContent = t;
    return d.innerHTML;
}

function escapeJs(t) {
    return t.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/'/g, "\\'");
}

function convertLinks(text) {
    return text.replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1" target="_blank">$1</a>'
    );
}
