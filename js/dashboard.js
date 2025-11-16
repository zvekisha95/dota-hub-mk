// ─────────────────────────────
// 🔥 INIT
// ─────────────────────────────

let currentUser = null;
let userRole = "member";

// ─────────────────────────────
// 🚪 Проверка за login + улога
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

    if (userRole !== "admin" && userRole !== "moderator") {
        alert("Немаш дозвола да влезеш во мод панел.");
        location.href = "main.html";
        return;
    }

    loadFlaggedComments();
    loadThreads();
});

// ─────────────────────────────
// 🚩 LOAD FLAGGED COMMENTS
// ─────────────────────────────
async function loadFlaggedComments() {
    const out = document.getElementById("flaggedComments");
    out.innerHTML = `<div class="loading">Вчитувам...</div>`;

    try {
        const threadsSnap = await db.collection("threads").get();
        let results = [];

        for (const t of threadsSnap.docs) {
            const comments = await t.ref
                .collection("comments")
                .where("flagged", "==", true)
                .get();

            comments.forEach(doc => {
                results.push({
                    threadId: t.id,
                    threadTitle: escapeHtml(t.data().title || "Без наслов"),
                    id: doc.id,
                    text: escapeHtml(doc.data().text || ""),
                    author: escapeHtml(doc.data().author || "???")
                });
            });
        }

        if (results.length === 0) {
            out.innerHTML = `<p class="empty">Нема пријавени коментари.</p>`;
            return;
        }

        out.innerHTML = "";

        results.forEach(c => {
            const html = `
                <div class="flag-item">
                    <div class="flag-info">
                        <strong>${c.author}</strong>: ${c.text}
                        <br>
                        <a href="thread.html?id=${c.threadId}" class="small-link">
                            → Отиди на тема
                        </a>
                    </div>

                    <div class="flag-actions">
                        <button onclick="unflagComment('${c.threadId}', '${c.id}')">Unflag</button>
                        <button onclick="deleteComment('${c.threadId}', '${c.id}')">Delete</button>
                    </div>
                </div>
            `;
            out.insertAdjacentHTML("beforeend", html);
        });

    } catch (err) {
        console.error(err);
        out.innerHTML = `<p class="error">Грешка при вчитување.</p>`;
    }
}

// ─────────────────────────────
// 🗂️ LOAD THREADS (за модерација)
// ─────────────────────────────
async function loadThreads() {
    const out = document.getElementById("modThreads");
    out.innerHTML = `<div class="loading">Вчитувам...</div>`;

    try {
        const snap = await db.collection("threads")
            .orderBy("createdAt", "desc")
            .get();

        if (snap.empty) {
            out.innerHTML = `<p class="empty">Нема теми.</p>`;
            return;
        }

        out.innerHTML = "";

        snap.forEach(doc => {
            const t = doc.data();

            const html = `
                <div class="thread-item">
                    <div>
                        <strong>${escapeHtml(t.title || "Без наслов")}</strong>
                        <br>
                        <span class="author">${escapeHtml(t.author || "???")}</span>
                        <br>
                        <a href="thread.html?id=${doc.id}" class="small-link">→ Отвори</a>
                    </div>

                    <div class="thread-actions">
                        <button onclick="toggleSticky('${doc.id}', ${t.sticky === true})">
                            ${t.sticky ? "Unsticky" : "Sticky"}
                        </button>

                        <button onclick="toggleLock('${doc.id}', ${t.locked === true})">
                            ${t.locked ? "Unlock" : "Lock"}
                        </button>

                        <button onclick="deleteThread('${doc.id}')" class="danger">
                            Delete
                        </button>
                    </div>
                </div>
            `;
            out.insertAdjacentHTML("beforeend", html);
        });

    } catch (err) {
        console.error(err);
        out.innerHTML = `<p class="error">Грешка.</p>`;
    }
}

// ─────────────────────────────
// 🔧 UNFLAG COMMENT
// ─────────────────────────────
async function unflagComment(threadId, commentId) {
    try {
        await db.collection("threads")
            .doc(threadId)
            .collection("comments")
            .doc(commentId)
            .update({ flagged: false, flaggedBy: [] });

        loadFlaggedComments();
    } catch {
        alert("Грешка.");
    }
}

// ─────────────────────────────
// ❌ DELETE COMMENT
// ─────────────────────────────
async function deleteComment(threadId, commentId) {
    if (!confirm("Избриши го коментарот?")) return;

    try {
        await db.collection("threads")
            .doc(threadId)
            .collection("comments")
            .doc(commentId)
            .delete();

        loadFlaggedComments();
    } catch {
        alert("Грешка при бришење.");
    }
}

// ─────────────────────────────
// ❌ DELETE THREAD
// ─────────────────────────────
async function deleteThread(id) {
    if (!confirm("Избриши цела тема?")) return;

    try {
        await db.collection("threads").doc(id).delete();
        loadThreads();
        alert("Темата е избришана.");
    } catch {
        alert("Грешка.");
    }
}

// ─────────────────────────────
// 📌 STICKY / UNSTICKY
// ─────────────────────────────
async function toggleSticky(id, current) {
    try {
        await db.collection("threads").doc(id).update({
            sticky: !current
        });
        loadThreads();
    } catch {
        alert("Грешка.");
    }
}

// ─────────────────────────────
// 🔒 LOCK / UNLOCK THREAD
// ─────────────────────────────
async function toggleLock(id, current) {
    try {
        await db.collection("threads").doc(id).update({
            locked: !current
        });
        loadThreads();
    } catch {
        alert("Грешка.");
    }
}

// ─────────────────────────────
// 🛡 Sanitize HTML
// ─────────────────────────────
function escapeHtml(t) {
    const d = document.createElement("div");
    d.textContent = t;
    return d.innerHTML;
}
