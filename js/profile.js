// ─────────────────────────────
// 🔥 INIT (auth, db од firebase-config.js)
// ─────────────────────────────

let currentUser = null;
let viewingUserId = null;

// ─────────────────────────────
// 🧩 Земи ID од URL: profile.html?id=XXXXX
// ─────────────────────────────
function getProfileId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

// ─────────────────────────────
// 🚪 Провери дали е логирани
// ─────────────────────────────
auth.onAuthStateChanged(async user => {
    if (!user || !user.emailVerified) {
        location.href = "index.html";
        return;
    }

    currentUser = user;
    viewingUserId = getProfileId();

    if (!viewingUserId) {
        alert("Missing profile ID.");
        location.href = "forum.html";
        return;
    }

    await loadProfile();
    await loadUserThreads();
    await loadUserComments();
});

// ─────────────────────────────
// 👤 LOAD PROFILE INFO
// ─────────────────────────────
async function loadProfile() {
    const nameEl = document.getElementById("p_name");
    const avatarEl = document.getElementById("p_avatar");
    const roleEl = document.getElementById("p_role");
    const bannedEl = document.getElementById("p_banned");
    const createdEl = document.getElementById("p_created");
    const countryEl = document.getElementById("p_country");

    try {
        const doc = await db.collection("users").doc(viewingUserId).get();

        if (!doc.exists) {
            nameEl.textContent = "Непознат корисник";
            return;
        }

        const u = doc.data();

        const username = escapeHtml(u.username || "???");
        const role = u.role || "member";
        const banned = u.banned === true;
        const avatar = u.avatarUrl || "";
        const createdAt = u.createdAt?.toDate?.().toLocaleString("mk-MK") || "??";
        const country = escapeHtml(u.country || "Непознато");

        // Име
        nameEl.textContent = username;

        // Улога
        roleEl.textContent = role.toUpperCase();

        // БАН
        bannedEl.textContent = banned ? "DA (BANNED)" : "NE";
        bannedEl.style.color = banned ? "#ef4444" : "#22c55e";

        // Датум
        createdEl.textContent = createdAt;

        // ЗЕМЈА (ако ја чуваш во user doc)
        countryEl.textContent = country;

        // Аватар
        if (avatar) {
            avatarEl.style.backgroundImage = `url('${avatar}')`;
            avatarEl.textContent = "";
        } else {
            avatarEl.textContent = username.charAt(0).toUpperCase();
        }

    } catch (err) {
        console.error(err);
        nameEl.textContent = "Грешка при вчитување.";
    }
}

// ─────────────────────────────
// 🧵 LOAD USER THREADS
// ─────────────────────────────
async function loadUserThreads() {
    const out = document.getElementById("userThreads");
    const countEl = document.getElementById("threadCountProfile");

    out.innerHTML = `<div class="loading">Вчитувам теми...</div>`;

    try {
        const snap = await db.collection("threads")
            .where("authorId", "==", viewingUserId)
            .orderBy("createdAt", "desc")
            .get();

        countEl.textContent = snap.size;

        if (snap.empty) {
            out.innerHTML = `<p class="empty">Нема објавено теми.</p>`;
            return;
        }

        out.innerHTML = "";

        snap.forEach(doc => {
            const t = doc.data();
            const title = escapeHtml(t.title || "Без наслов");

            const html = `
                <div class="item">
                    <a href="thread.html?id=${doc.id}" class="item-title">${title}</a>
                </div>
            `;

            out.insertAdjacentHTML("beforeend", html);
        });

    } catch (err) {
        console.error(err);
        out.innerHTML = `<p class="error">Грешка при вчитување теми.</p>`;
    }
}

// ─────────────────────────────
// 💬 LOAD USER COMMENTS
// ─────────────────────────────
async function loadUserComments() {
    const out = document.getElementById("userComments");
    const countEl = document.getElementById("commentCountProfile");

    out.innerHTML = `<div class="loading">Вчитувам коментари...</div>`;

    try {
        // НЕМА директно query за субколекции → па мора loop, ама оптимизиран
        const threads = await db.collection("threads").get();

        let totalComments = 0;
        let results = [];

        for (const t of threads.docs) {
            const comments = await t.ref
                .collection("comments")
                .where("authorId", "==", viewingUserId)
                .get();

            if (!comments.empty) {
                comments.forEach(c => {
                    totalComments++;

                    const text = escapeHtml(c.data().text || "");
                    results.push({
                        threadId: t.id,
                        threadTitle: escapeHtml(t.data().title || "Без наслов"),
                        text
                    });
                });
            }
        }

        countEl.textContent = totalComments;

        if (totalComments === 0) {
            out.innerHTML = `<p class="empty">Нема коментари.</p>`;
            return;
        }

        out.innerHTML = "";

        results.forEach(r => {
            const html = `
                <div class="comment-item">
                    <a class="cm-thread" href="thread.html?id=${r.threadId}">
                        ${r.threadTitle}
                    </a>
                    <div class="cm-text">${convertLinks(r.text)}</div>
                </div>
            `;
            out.insertAdjacentHTML("beforeend", html);
        });

    } catch (err) {
        console.error(err);
        out.innerHTML = `<p class="error">Грешка при вчитување коментари.</p>`;
    }
}

// ─────────────────────────────
// 🛡 ESCAPE HTML (anti XSS)
// ─────────────────────────────
function escapeHtml(t) {
    const d = document.createElement("div");
    d.textContent = t;
    return d.innerHTML;
}

// ─────────────────────────────
// 🔗 Конвертирај линкови
// ─────────────────────────────
function convertLinks(text) {
    return text.replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1" target="_blank">$1</a>'
    );
}
