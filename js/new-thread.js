// ─────────────────────────────
// 🔥 INIT (auth, db од firebase-config.js)
// ─────────────────────────────

let currentUser = null;
let userRole = "member";

// ─────────────────────────────
// 🚪 Проверка дали е логирани
// ─────────────────────────────
auth.onAuthStateChanged(async user => {
    if (!user || !user.emailVerified) {
        location.href = "index.html";
        return;
    }

    currentUser = user;

    // Вчитај податоци за корисникот
    const doc = await db.collection("users").doc(user.uid).get();
    const data = doc.exists ? doc.data() : {};

    // banned?
    if (data.banned === true) {
        alert("Ти си баниран од креирање теми.");
        location.href = "forum.html";
        return;
    }

    userRole = data.role || "member";

    document.getElementById("authorName").textContent =
        data.username || user.email;
});

// ─────────────────────────────
// ➕ КРЕИРАЊЕ НОВА ТЕМА
// ─────────────────────────────
async function postThread() {

    const title = document.getElementById("threadTitle").value.trim();
    const body = document.getElementById("threadBody").value.trim();
    const statusEl = document.getElementById("postStatus");

    statusEl.textContent = "";

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

        // чистење
        document.getElementById("threadTitle").value = "";
        document.getElementById("threadBody").value = "";

        // redirect
        alert("Темата е успешно објавена!");
        location.href = "forum.html";

    } catch (err) {
        console.error(err);
        statusEl.textContent = "Грешка при објавување.";
        statusEl.className = "error";
    }
}

// ─────────────────────────────
// 🧼 ESCAPE HTML — анти XSS
// ─────────────────────────────
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}
