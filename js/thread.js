const url = new URL(window.location.href);
const threadId = url.searchParams.get("id");

if (!threadId) {
    document.body.innerHTML = "<h1>Грешка: Нема ID.</h1>";
}

auth.onAuthStateChanged(async user => {
    if (!user) location.href = "index.html";

    loadThread();
    loadComments();
});


async function loadThread() {
    const doc = await db.collection("threads").doc(threadId).get();
    if (!doc.exists) {
        document.getElementById("threadTitle").textContent = "Темата не постои.";
        return;
    }

    const t = doc.data();

    document.getElementById("threadTitle").textContent = t.title;
    document.getElementById("threadContent").innerHTML = t.content;
}


async function loadComments() {
    const list = document.getElementById("comments");
    list.innerHTML = "Вчитувам...";

    const snap = await db.collection("threads")
        .doc(threadId)
        .collection("comments")
        .orderBy("createdAt", "asc")
        .get();

    if (snap.empty) {
        list.innerHTML = "<i>Нема коментари.</i>";
        return;
    }

    list.innerHTML = "";

    snap.forEach(doc => {
        const c = doc.data();
        const html = `
            <div class="comment">
                <strong>${c.author}</strong><br>
                ${c.text}<br>
                <small>${c.createdAt.toDate().toLocaleString("mk-MK")}</small>
            </div>
        `;
        list.insertAdjacentHTML("beforeend", html);
    });
}


async function postComment() {
    const text = document.getElementById("commentInput").value.trim();
    if (!text) return alert("Празен коментар");

    const user = auth.currentUser;
    const userDoc = await db.collection("users").doc(user.uid).get();
    const u = userDoc.data();

    await db.collection("threads")
        .doc(threadId)
        .collection("comments")
        .add({
            author: u.username || "Корисник",
            userId: user.uid,
            text,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

    document.getElementById("commentInput").value = "";
    loadComments();
}
