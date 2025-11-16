// ─────────────────────────────
// INIT
// ─────────────────────────────
let currentUser = null;

// ─────────────────────────────
// AUTH CHECK (Steam FIXED)
// ─────────────────────────────
auth.onAuthStateChanged(async user => {

    const isSteamUser =
        user && typeof user.uid === "string" && user.uid.startsWith("steam:");

    if (!user) {
        location.href = "index.html";
        return;
    }

    if (!isSteamUser && user.email && !user.emailVerified) {
        alert("Прво мора да ја верификуваш email адресата.");
        location.href = "index.html";
        return;
    }

    currentUser = user;

    // check ban
    const doc = await db.collection("users").doc(user.uid).get();
    const data = doc.exists ? doc.data() : {};

    if (data.banned === true) {
        alert("Баниран си од објавување теми.");
        location.href = "forum.html";
        return;
    }
});

// ─────────────────────────────
// POST THREAD
// ─────────────────────────────
async function postThread() {
    const title = document.getElementById("threadTitle").value.trim();
    const body = document.getElementById("threadBody").value.trim();
    const statusEl = document.getElementById("postStatus");

    statusEl.textContent = "";
    statusEl.className = "status";

    if (!title || !body) {
        statusEl.textContent = "Сите полиња мора да бидат пополнети!";
        statusEl.classList.add("error");
        return;
    }

    try {
        statusEl.textContent = "Објавувам...";
        statusEl.classList.add("loading");

        const u = (await db.collection("users").doc(currentUser.uid).get()).data();

        await db.collection("threads").add({
            title,
            body,
            author: u.username || currentUser.email,
            authorId: currentUser.uid,
            avatarUrl: u.avatarUrl || "",
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            locked: false,
            sticky: false
        });

        statusEl.textContent = "Успешно објавена тема!";
        statusEl.classList.remove("loading");
        statusEl.classList.add("success");

        setTimeout(() => {
            location.href = "forum.html";
        }, 600);

    } catch (err) {
        console.error("THREAD ERROR:", err);
        statusEl.textContent = "Грешка. Обиди се повторно.";
        statusEl.classList.add("error");
    }
}

