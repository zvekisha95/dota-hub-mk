// ─────────────────────────────
// INIT
// ─────────────────────────────
let currentUser = null;
let userRole = "member";

auth.onAuthStateChanged(async user => {
    if (!user || !user.emailVerified) {
        location.href = "index.html";
        return;
    }

    currentUser = user;

    const doc = await db.collection("users").doc(user.uid).get();
    const data = doc.data() || {};

    userRole = data.role || "member";

    if (userRole !== "moderator" && userRole !== "admin") {
        alert("Немаш пристап до мод панел.");
        location.href = "main.html";
        return;
    }

    loadFlaggedComments();
    loadFlaggedThreads();
});

// ─────────────────────────────
// FLAGGED COMMENTS
// ─────────────────────────────
async function loadFlaggedComments() {
    const out = document.getElementById("flaggedComments");
    out.innerHTML = "Вчитувам...";

    try {
        const threads = await db.collection("threads").get();
        let html = "";

        for (const t of threads.docs) {
            const comments = await t.ref
                .collection("comments")
                .where("flagged", "==", true)
                .get();

            comments.forEach(com => {
                const c = com.data();
                html += `
                    <div class="item-row">
                        <div class="item-title">${escapeHtml(c.body)}</div>
                        <div class="item-meta">
                            Автор: ${escapeHtml(c.author)} | Тема ID: ${t.id}
                        </div>
                        <div class="actions">
                            <button class="btn-approve" onclick="unflagComment('${t.id}','${com.id}')">
                                Одфлегирај
                            </button>
                            <button class="btn-delete" onclick="deleteComment('${t.id}','${com.id}')">
                                Избриши
                            </button>
                        </div>
                    </div>
                `;
            });
        }

        out.innerHTML = html || "<div class='empty'>Нема флегирани коментари.</div>";

    } catch (err) {
        console.error(err);
        out.innerHTML = "Грешка.";
    }
}

async function unflagComment(threadId, commentId) {
    await db.collection("threads").doc(threadId)
        .collection("comments").doc(commentId)
        .update({ flagged: false });

    loadFlaggedComments();
}

async function deleteComment(threadId, commentId) {
    await db.collection("threads").doc(threadId)
        .collection("comments").doc(commentId)
        .delete();

    loadFlaggedComments();
}

// ─────────────────────────────
// FLAGGED THREADS
// ─────────────────────────────
async function loadFlaggedThreads() {
    const out = document.getElementById("flaggedThreads");
    out.innerHTML = "Вчитувам...";

    try {
        const flagged = await db.collection("threads")
            .where("flagged", "==", true)
            .get();

        let html = "";

        flagged.forEach(doc => {
            const t = doc.data();
            html += `
                <div class="item-row">
                    <div class="item-title">${escapeHtml(t.title)}</div>
                    <div class="item-meta">
                        Автор: ${escapeHtml(t.author)}
                    </div>
                    <div class="actions">
                        <button class="btn-approve" onclick="unflagThread('${doc.id}')">Одфлегирај</button>
                        <button class="btn-delete" onclick="deleteThread('${doc.id}')">Избриши</button>
                    </div>
                </div>
            `;
        });

        out.innerHTML = html || "<div class='empty'>Нема флегирани теми.</div>";

    } catch (err) {
        console.error(err);
        out.innerHTML = "Грешка.";
    }
}

async function unflagThread(threadId) {
    await db.collection("threads").doc(threadId).update({ flagged: false });
    loadFlaggedThreads();
}

async function deleteThread(threadId) {
    await db.collection("threads").doc(threadId).delete();
    loadFlaggedThreads();
}

// ─────────────────────────────
// ESCAPE
// ─────────────────────────────
function escapeHtml(t) {
    const d = document.createElement("div");
    d.textContent = t;
    return d.innerHTML;
}
