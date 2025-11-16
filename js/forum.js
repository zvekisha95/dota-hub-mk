// ─────────────────────────────
// 🔥 INIT DATA
// (auth, db веќе ти се од firebase-config.js)
// ─────────────────────────────

let currentUser = null;
let userRole = "member";

// ─────────────────────────────
// ⛔ REDIRECT ако не си логирани
// ─────────────────────────────
auth.onAuthStateChanged(async user => {
    if (!user || !user.emailVerified) {
        location.href = "index.html";
        return;
    }

    currentUser = user;

    // Вчитај податоци од Firestore
    const doc = await db.collection("users").doc(user.uid).get();
    const data = doc.exists ? doc.data() : {};

    userRole = data.role || "member";

    loadThreads();
});

// ─────────────────────────────
// 📌 LOAD THREADS
// ─────────────────────────────
async function loadThreads() {
    const list = document.getElementById("threadList");
    list.innerHTML = `<div class="loading">Вчитувам...</div>`;

    try {
        const snap = await db.collection("threads")
            .orderBy("createdAt", "desc")
            .get();

        if (snap.empty) {
            list.innerHTML = `<p class="empty">Нема теми за прикажување.</p>`;
            return;
        }

        list.innerHTML = "";

        for (const doc of snap.docs) {
            const thread = doc.data();
            const id = doc.id;

            const title = escapeHtml(thread.title || "Без наслов");
            const author = escapeHtml(thread.author || "Непознат");
            const avatar = thread.avatarUrl || "";
            const time = thread.createdAt?.toDate?.().toLocaleString("mk-MK") || "??";
            const comments = await getCommentCount(id);

            // MOD/ADMIN алатки?
            const canModerate = userRole === "admin" || userRole === "moderator";

            const html = `
                <div class="thread-card">
                    <div class="thread-header">
                        <a href="thread.html?id=${id}" class="thread-title">${title}</a>
                    </div>

                    <div class="thread-info">
                        <div class="author">
                            <div class="avatar"
                                 style="${avatar ? `background-image:url('${avatar}')` : ""}">
                                ${!avatar ? author.charAt(0).toUpperCase() : ""}
                            </div>
                            <span>${author}</span>
                        </div>

                        <div class="meta">
                            <span>${time}</span> • 
                            <span>${comments} коментари</span>
                        </div>
                    </div>

                    ${canModerate ? `
                        <div class="mod-tools">
                            <button onclick="deleteThread('${id}')" class="btn-delete">Избриши</button>
                        </div>
                    ` : ""}
                </div>
            `;

            list.insertAdjacentHTML("beforeend", html);
        }

    } catch (err) {
        console.error(err);
        list.innerHTML = `<p class="error">Грешка при вчитувањето на темите.</p>`;
    }
}

// ─────────────────────────────
// 💬 БРОЈАЧ НА КОМЕНТАРИ
// ─────────────────────────────
async function getCommentCount(threadId) {
    try {
        const snap = await db.collection("threads")
            .doc(threadId)
            .collection("comments")
            .get();
        return snap.size;
    } catch {
        return 0;
    }
}

// ─────────────────────────────
// ❌ DELETE THREAD (MOD/ADMIN)
// ─────────────────────────────
async function deleteThread(id) {
    if (!confirm("Дали сигурно сакаш да ја избришеш темата?"))
        return;

    try {
        await db.collection("threads").doc(id).delete();
        alert("Тема е избришана.");
        loadThreads();
    } catch (err) {
        console.error(err);
        alert("Грешка при бришење!");
    }
}

// ─────────────────────────────
// 🛡️ SANITIZE HTML
// ─────────────────────────────
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}
