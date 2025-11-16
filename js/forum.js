let currentUser = null;
let userRole = "member";

// Escape HTML (безбедно)
function escapeHtml(t) {
    const d = document.createElement("div");
    d.textContent = t;
    return d.innerHTML;
}

auth.onAuthStateChanged(async user => {
    if (!user) {
        location.href = "index.html";
        return;
    }

    currentUser = user;

    // FIX — поправен линк кон профил
    const profileLink = document.getElementById("profileLink");
    if (profileLink) {
        profileLink.href = `profile.html?id=${currentUser.uid}`;
    }

    // Load user data
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

// Load all threads
async function loadThreads() {
    const list = document.getElementById("threadList");
    list.innerHTML = `<div class="loading">Вчитувам теми...</div>`;

    try {
        const snap = await db.collection("threads")
            .orderBy("createdAt", "desc")
            .get();

        if (snap.empty) {
            list.innerHTML = `<div class="empty">Нема објавени теми.</div>`;
            return;
        }

        list.innerHTML = "";

        snap.forEach(doc => {
            const t = doc.data();
            const id = doc.id;

            const title = escapeHtml(t.title || "Без наслов");
            const author = escapeHtml(t.author || "Корисник");
            const authorId = t.authorId || "";
            const comments = t.comments || 0;

            // Датум
            const date = t.createdAt
                ? t.createdAt.toDate().toLocaleString("mk-MK")
                : "—";

            // Темплејт
            const html = `
                <div class="thread-card">
                    <div class="thread-horizontal">

                        <div class="avatar small"
                             style="background:hsl(${(author.charCodeAt(0) * 7) % 360},70%,55%)">
                            ${author[0]?.toUpperCase()}
                        </div>

                        <a class="thread-title" href="thread.html?id=${id}">
                            ${title}
                        </a>

                        <span class="thread-user">
                            <a href="profile.html?id=${authorId}" style="color:#9ca3af;text-decoration:none;">
                                ${author}
                            </a>
                        </span>

                        <span class="thread-date">${date}</span>

                        <span class="thread-comments">${comments} коментари</span>
                    </div>
                </div>
            `;

            list.insertAdjacentHTML("beforeend", html);
        });

    } catch (err) {
        console.error(err);
        list.innerHTML = `<div class="error">Грешка при читање на темите.</div>`;
    }
}
