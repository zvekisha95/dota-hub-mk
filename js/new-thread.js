// ─────────────────────────────
// 🔥 INIT (auth, db од firebase-config.js)
// ─────────────────────────────

let currentUser = null;
let userRole = "member";

// ─────────────────────────────
// 🚪 LOGIN + STEAM FIX
// ─────────────────────────────
auth.onAuthStateChanged(async user => {
    if (!user) {
        location.href = "index.html";
        return;
    }

    // Allow Steam users (uids start with "steam:")
    const isSteamUser =
        user && typeof user.uid === "string" && user.uid.startsWith("steam:");

    // Email/password users → must verify
    if (!isSteamUser && user.email && !user.emailVerified) {
        alert("Мораш да го верификуваш email-от.");
        location.href = "index.html";
        return;
    }

    currentUser = user;

    // Load user Firestore data
    const doc = await db.collection("users").doc(user.uid).get();
    const data = doc.exists ? doc.data() : {};

    // Banned check
    if (data.banned === true) {
        alert("Ти си баниран и не можеш да креираш теми.");
        location.href = "forum.html";
        return;
    }

    userRole = data.role || "member";

    // Show author name on page
    const nameEl = document.getElementById("authorName");
    if (nameEl) nameEl.textContent = data.username || user.email || "Корисник";
});

// ─────────────────────────────
// ➕ КРЕИРАЊЕ НОВА ТЕМА
// ─────────────────────────────
async function postThread() {

    const titleInput = document.getElementById("threadTitle");
    const bodyInput = document.getElementById("threadBody");
    const statusEl = document.getElementById("postStatus");

    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();

    statusEl.textContent = "";
    statusEl.className = "";

    if (!title || !body) {
        statusEl.textContent = "Сите полиња мора да бидат пополнети.";
        statusEl.className = "error";
        return;
    }

    try {
        statusEl.textContent = "Се објавува...";
        statusEl.className = "loading";

        const userDoc = await db.collection("users").doc(currentUser.uid).get();
        const u = userDoc.data();

        await db.collection("threads").add({
            title,
            body,
            author: u.username || currentUser.email,
            authorId: currentUser.uid,
            avatarUrl: u.avatarUrl || "",
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            locked: false,
            sticky: false,
            flagged: false
        });

        // Clear inputs
        titleInput.value = "";
        bodyInput.value = "";

        alert("Темата е успешно објавена!");
        location.href = "forum.html";

    } catch (err) {
        console.error(err);
        statusEl.textContent = "Грешка при објавување.";
        statusEl.className = "error";
    }
}

// ─────────────────────────────
// 🛡 ESCAPE HTML
// ─────────────────────────────
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}
