// ─────────────────────────────
// 🔥 INIT DATA
// ─────────────────────────────

let currentUser = null;
let userRole = "member";

// ─────────────────────────────
// ⛔ LOGIN + STEAM FIX
// ─────────────────────────────
auth.onAuthStateChanged(async user => {

    const isSteamUser =
        user && typeof user.uid === "string" && user.uid.startsWith("steam:");

    if (!user) {
        location.href = "index.html";
        return;
    }

    if (!isSteamUser && user.email && !user.emailVerified) {
        alert("Мораш да ја верификуваш email адресата.");
        location.href = "index.html";
        return;
    }

    currentUser = user;

    const doc = await db.collection("users").doc(user.uid).get();
    const data = doc.exists ? doc.data() : {};

    if (data.banned === true) {
        alert("Ти си баниран од форумот.");
        location.href = "main.html";
        return;
    }

    userRole = data.role || "member";

    loadThreads();
});

// ─────────────────────────────
// 📌 LOAD THREADS (BLIZZARD STYLE)
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
            const type = escapeHtml(thread.type || "Обична");
            const author = escapeHtml(thread.author || "Непознат");
            const avatar = thread.avatarUrl || "";
            const time = thread.createdAt?.toDate?.().toLocaleString("mk-MK") || "??";
            const comments = await getCommentCount(id);

            const canModerate = userRole === "admin" || userRole === "moderator";

            const html = `
                <div class="thread-card">
                    <div class="thread-horizontal">

                        <div class="avatar small"
                             style="${avatar ? `background-image:url('${avatar}')` : ""}">
                            ${!avatar ? author.charAt(0).toUpperCase() : ""}
                        </div>

                        <a href="thread.html?id=${id}" class="thread-title">${title}</a>

                        <span class="thread-type">${type}</span>
                        <span class="thread-user">${author}</span>
                        <span class="thread-date">${time}</span>
                        <span class="thread-comments">${comments} коментари</span>

                    </div>

                    ${canModerate ?
                        `<button onclick="deleteThread('${id}')" class="btn-delete">Избриши</button>`
                        : ""
                    }
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
// ❌ DELETE THREAD
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
// 🛡 ESCAPE
// ─────────────────────────────
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

