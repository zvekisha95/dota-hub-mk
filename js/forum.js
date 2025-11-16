// ─────────────────────────────
// 🔥 INIT DATA
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

    const provider = user.providerData[0]?.providerId || "custom";
    const isSteam = provider === "custom" || user.uid.startsWith("steam:");

    if (!isSteam && !user.emailVerified) {
        alert("Мораш да ја верификуваш емаил адресата.");
        location.href = "index.html";
        return;
    }

    currentUser = user;

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
        const snap = await db.collection("threads").get();

        if (snap.empty) {
            list.innerHTML = `<p class="empty">Нема теми за прикажување.</p>`;
            return;
        }

        // Separate sticky first
        const sticky = [];
        const normal = [];

        snap.forEach(doc => {
            const data = doc.data();
            if (data.sticky === true) sticky.push({ id: doc.id, data });
            else normal.push({ id: doc.id, data });
        });

        // Sort sticky by date DESC
        sticky.sort((a, b) => {
            const A = a.data.createdAt?.toDate?.() || 0;
            const B = b.data.createdAt?.toDate?.() || 0;
            return B - A;
        });

        // Sort normal by date DESC
        normal.sort((a, b) => {
            const A = a.data.createdAt?.toDate?.() || 0;
            const B = b.data.createdAt?.toDate?.() || 0;
            return B - A;
        });

        // Final list
        const threads = [...sticky, ...normal];

        list.innerHTML = "";

        for (const t of threads) {
            const thread = t.data;
            const id = t.id;

            const title = escapeHtml(thread.title || "Без наслов");

            const authorName = escapeHtml(
                thread.author ||
                thread.authorName ||
                thread.username ||
                "Непознат"
            );

            const avatar = thread.avatarUrl || "";
            const time = thread.createdAt?.toDate?.().toLocaleString("mk-MK") || "??";
            const isSticky = thread.sticky === true;
            const isLocked = thread.locked === true;

            const commentCount = await getCommentCount(id);

            const canModerate = userRole === "admin" || userRole === "moderator";

            const html = `
                <div class="thread-card ${isSticky ? "sticky-thread" : ""}">

                    <div class="thread-header">
                        ${isSticky ? `<span class="tag-sticky">📌 Sticky</span>` : ""}
                        ${isLocked ? `<span class="tag-locked">🔒 Locked</span>` : ""}

                        <a href="thread.html?id=${id}" class="thread-title">
                            ${title}
                        </a>
                    </div>

                    <div class="thread-info">
                        <div class="author">
                            <div class="avatar" style="${avatar ? `background-image:url('${avatar}')` : ""}">
                                ${!avatar ? authorName.charAt(0).toUpperCase() : ""}
                            </div>
                            <span>${authorName}</span>
                        </div>

                        <div class="meta">
                            <span>${time}</span> •
                            <span>${commentCount} коментари</span>
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
// 💬 COUNT COMMENTS (FAST)
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
