/****************************************************
 * PROFILE.JS — FIXED + FULL DOTA STATS 2025
 ****************************************************/

let currentUser = null;
let viewingUserId = null;

function getProfileId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

function escapeHtml(t) {
    const d = document.createElement("div");
    d.textContent = t;
    return d.innerHTML;
}

function rankNameFromTier(tier) {
    const ranks = {
        0: "Unranked", 80: "Herald", 85: "Guardian", 90: "Crusader", 95: "Archon",
        100: "Genuine", 105: "International", 110: "Legend", 115: "Ancient", 120: "Divine"
    };
    return ranks[tier] || "Unranked";
}

function getRankIcon(tier) {
    return `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/rankings/${tier}.png`;
}

auth.onAuthStateChanged(async user => {
    const isSteamUser = user && user.uid.startsWith("steam:");
    if (!user || (!isSteamUser && !user.emailVerified)) {
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
    await loadDotaProfile();
});

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

        nameEl.textContent = escapeHtml(u.username || "???");
        roleEl.textContent = u.role || "member";
        bannedEl.textContent = u.banned ? "Да" : "Не";
        avatarEl.style.backgroundImage = u.avatarUrl ? `url(${u.avatarUrl})` : "";
        createdEl.textContent = u.createdAt ? u.createdAt.toDate().toLocaleDateString("mk-MK") : "—";
        countryEl.textContent = u.country || "—";

    } catch (err) {
        console.error(err);
    }
}

async function loadUserThreads() {
    const countEl = document.getElementById("threadCountProfile");
    const outEl = document.getElementById("userThreads");

    try {
        const snap = await db.collection("threads")
            .where("authorId", "==", viewingUserId)
            .orderBy("createdAt", "desc")
            .limit(10)
            .get();

        countEl.textContent = snap.size;
        outEl.innerHTML = snap.empty ? "<i>Нема објавени теми.</i>" : "";

        snap.forEach(doc => {
            const t = doc.data();
            outEl.innerHTML += `
                <div class="item-title">
                    <a href="thread.html?id=${doc.id}" class="cm-thread">${escapeHtml(t.title)}</a>
                    <span style="font-size:0.85rem;color:#9ca3af">${t.createdAt?.toDate().toLocaleDateString("mk-MK")}</span>
                </div>
            `;
        });
    } catch (err) {
        console.error(err);
    }
}

async function loadUserComments() {
    const countEl = document.getElementById("commentCountProfile");
    const outEl = document.getElementById("userComments");

    try
