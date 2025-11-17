/****************************************************
 * THREAD.JS – 100% FIXED
 ****************************************************/

let currentUser = null;

/****************************************************
 * GET THREAD ID
 ****************************************************/
function getThreadId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id"); // ← ВАЖНО!!!
}

/****************************************************
 * AUTH HANDLER
 ****************************************************/
auth.onAuthStateChanged(async user => {
    if (!user) {
        location.href = "index.html";
        return;
    }

    currentUser = user;

    const threadId = getThreadId();

    if (!threadId) {
        alert("Грешка: Нема ID.");
        location.href = "forum.html";
        return;
    }

    loadThread(threadId);
    loadComments(threadId);
});

/****************************************************
 * LOAD THREAD CONTENT
 ****************************************************/
async function loadThread(id) {
    const doc = await db.collection("threads").doc(id).get();

    if (!doc.exists) {
        document.getElementById("threadTitle").textContent = "Темата не постои.";
        return;
    }

    const t = doc.data();

    document.getElementById("threadTitle").textContent = t.title || "Без наслов";
    document.getElementById("threadContent").innerHTML = t.content || "";
}

/****************************************************
 * LOAD COMMENTS
 ****************************************************/
async function loadComments(id) {
    const box = document.getElementById("comments");
    box.innerHTML = "Вчитувам...";

    const snap = await db.collection("threads")
        .doc(id)
        .collection("comments")
        .orderBy("createdAt", "asc")
        .get();

    if (snap.empty) {
        box.innerHTML = "<i>Нема коментари.</i>";
        return;
    }

    box.innerHTML = "";

    snap.forEach(doc => {
        const c = doc.data();
        const text = c.text || "";
        const author = c.author || "Корисник";

        box.innerHTML += `
            <div class="comment">
                <b>${author}</b><br>
                ${text}
            </div>
        `;
    });
}

/****************************************************
 * POST COMMENT
 ****************************************************/
async function postComment() {
    const text = document.getElementById("commentInput").value.trim();
    const threadId = getThreadId();

    if (!text) {
        alert("Внеси текст.");
        return;
    }

    const userDoc = await db.collection("users").doc(currentUser.uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    await db.collection("threads")
        .doc(threadId)
        .collection("comments")
        .add({
            text,
            author: userData.username || currentUser.email || "Корисник",
            authorId: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

    document.getElementById("commentInput").value = "";
    loadComments(threadId);
}
