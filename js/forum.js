// ─────────────────────────────
// ⛔ LOGIN + STEAM FIX
// ─────────────────────────────
auth.onAuthStateChanged(async user => {

    // Дали е Steam user?
    const isSteamUser =
        user && typeof user.uid === "string" && user.uid.startsWith("steam:");

    // Ако НЕ е логирани → назад
    if (!user) {
        location.href = "index.html";
        return;
    }

    // Ако е email/password без верификација → назад
    if (!isSteamUser && user.email && !user.emailVerified) {
        alert("Мораш да ја верификуваш email адресата.");
        location.href = "index.html";
        return;
    }

    currentUser = user;

    // Load Firestore data
    const doc = await db.collection("users").doc(user.uid).get();
    const data = doc.exists ? doc.data() : {};

    // banned?
    if (data.banned === true) {
        alert("Ти си баниран од форумот.");
        location.href = "main.html";
        return;
    }

    userRole = data.role || "member";

    loadThreads();
});
