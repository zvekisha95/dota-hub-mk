let currentUser = null;
let userRole = "member";

auth.onAuthStateChanged(async user => {

    if (!user) {
        location.href = "index.html";
        return;
    }

    currentUser = user;

    // FIX — add profile link
    const profileLink = document.getElementById("profileLink");
    if (profileLink) {
        profileLink.href = `profile.html?id=${currentUser.uid}`;
    }

    const doc = await db.collection("users").doc(user.uid).get();
    const data = doc.exists ? doc.data() : {};

    if (data.banned) {
        alert("Ти си баниран.");
        location.href = "main.html";
        return;
    }

    userRole = data.role || "member";

    loadThreads();
});

async function loadThreads() {
    const list = document.getElementById("threadList");
    list.innerHTML = `<div>Вчитувам...</div>`;

    const snap = await db.collection("threads")
        .orderBy("createdAt", "desc")
        .get();

    list.innerHTML = "";

    snap.forEach(doc => {
        const t = doc.data();
        const id = doc.id;

        const html = `
            <div class="thread-card">
                <div class="thread-header">
                    <a class="thread-title" href="thread.html?id=${id}">
                        ${t.title}
                    </a>
                </div>

                <div class="thread-meta">
                    <a href="profile.html?id=${t.authorId}">${t.author}</a> • 
                    ${t.createdAt?.toDate().toLocaleString("mk-MK")} • 
                    ${t.comments || 0} коментари
                </div>
            </div>
        `;

        list.insertAdjacentHTML("beforeend", html);
    });
}
