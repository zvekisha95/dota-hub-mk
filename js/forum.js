// ─────────────────────────────
// INIT
// ─────────────────────────────
let currentUser = null;
let userRole = "member";

// ─────────────────────────────
// LOGIN + STEAM FIX
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
// LOAD THREADS
// ─────────────────────────────
async function loadThreads() {
    const list = document.getElementById("threadList");
    list.innerHTML = `<div class="loading">Вчитувам...</div>`;

    try {
        const snap = await db.collection("threads")
            .orderBy("createdAt", "desc")
            .get();

        if (snap.empty) {
            list.innerHTML = `<p class="empty">Нема теми.</p>`;
            return;
        }

        list.innerHTML = "";

        for (const doc of snap.docs) {
            const t = doc.data();
            const id = doc.id;

            const title = escapeHtml(t.title || "Без наслов");
            const author = escapeHtml(t.author || "Непознат");
            const avatar = t.avatarUrl || "";
            const time = t.createdAt?.toDate?.().toLocaleString("mk-MK") || "??";
            const comments = await getCommentCount(id);

            let shortDate = time.split(",")[0];
            let shortTime = time.split(",")[1]?.trim()?.slice(0,5);
            let finalDate = `${shortDate} • ${shortTime}`;

            const html = `
                <div class="thread-card">
                    <div class="thread-row">

                        <div class="avatar"
                             style="${avatar ? `background-image:url('${avatar}')` : ""}">
                            ${!avatar ? author.charAt(0).toUpperCase() : ""}
                        </div>

                        <a href="thread.html?id=${id}" class="thread-title">${title}</a>

                        <a href="profile.html?id=${t.authorId}" class="thread-author">
                            ${author}
                        </a>

                        <span class="thread-date">${finalDate}</span>

                        <span class="thread-comments">💬 ${comments}</span>
                    </div>
                </div>
            `;

            list.insertAdjacentHTML("beforeend", html);
        }

    } catch (e) {
        console.error(e);
        list.innerHTML = `<div class="error">Грешка при читање.</div>`;
    }
}

// ─────────────────────────────
// COUNT COMMENTS
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
// SANITIZE
// ─────────────────────────────
function escapeHtml(t) {
    const d = document.createElement("div");
    d.textContent = t;
    return d.innerHTML;
}

