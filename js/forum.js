// ─────────────────────────────
// 🔥 INIT DATA
// (auth, db веќе ти се од firebase-config.js)
// ─────────────────────────────

let currentUser = null;
let userRole = "member";

// ─────────────────────────────
// ⛔ LOGIN + STEAM FIX
// ─────────────────────────────
auth.onAuthStateChanged(async user => {
    if (!user) {
        location.href = "index.html";
        return;
    }

    // Steam users = provider = custom
    const provider = user.providerData[0]?.providerId || "custom";

    // Email/password users must verify
    if (provider === "password" && !user.emailVerified) {
        alert("Мораш да ја верификуваш емаил адресата.");
        location.href = "index.html";
        return;
    }

    currentUser = user;

    // Load Firestore profile
    const doc = await db.collection("users").doc(user.uid).get();
    const data = doc.exists ? doc.data() : {};

    userRole = data.role || "member";

    loadThreads();
});

// ─────────────────────────────
// 📌 LOAD THREADS LIST
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

            // Resolve author fields
            const authorName =
                escapeHtml(thread.author ||
                           thread.authorName ||
                           thread.username ||
                           "Непознат");

            const avatar = thread.avatarUrl || "";
            const time = thread.createdAt?.toDate?.().toLocaleString("mk-MK") || "??";
            const comments = await getCommentCount(id);

            // Can this user moderate?
            const canModerate = userRole === "admin" || userRole === "moderator";

            const html = `
                <div class="thread-card">

                    <div class="thread-header">
                        <a href="thread.html?id=${id}" class="thread-title">
                            ${escapeHtml(thread.title || "Без наслов")}
                        </a>
                    </div>

                    <div class="thread-info">
                        <div class="author">
                            <div class="avatar"
                                 style="${avatar ? `background-image:url('${avatar}')` : ""}">
                                ${!avatar ? authorName.charAt(0).toUpperCase() : ""}
                            </div>
                            <span>${authorName}</span>
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
// 💬 COUNT COMMENTS
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
// ❌ DELETE THREAD (ADMIN/MOD)
// ─────────────────────────────
async function deleteThread(id) {
    if (!confirm("Дали сигурно сакаш да ја избришеш темата?"))
        return;

    try {
        await db.collection("threads").doc(id).delete();
        alert("Темата е избришана.");
        loadThreads();
    } catch (err) {
        console.error(err);
        alert("Грешка при бришење!");
    }
}

// ─────────────────────────────
// 🛡️ SAFE HTML
// ─────────────────────────────
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}
