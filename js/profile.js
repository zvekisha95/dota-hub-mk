/****************************************************
 * PROFILE.JS — FIXED + OPTIMIZED + STEAM READY
 ****************************************************/

let currentUser = null;
let viewingUserId = null;

/****************************************************
 * GET PROFILE ID
 ****************************************************/
function getProfileId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

/****************************************************
 * AUTH + STEAM USER FIX
 ****************************************************/
auth.onAuthStateChanged(async user => {
    const isSteamUser =
        user && typeof user.uid === "string" && user.uid.startsWith("steam:");

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
});

/****************************************************
 * LOAD PROFILE
 ****************************************************/
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

        nameEl.textContent = username;
        roleEl.textContent = role.toUpperCase();
        bannedEl.textContent = banned ? "ДА (BANNED)" : "НЕ";
        bannedEl.style.color = banned ? "#ef4444" : "#22c55e";
        createdEl.textContent = createdAt;
        countryEl.textContent = country;

        if (avatar) {
            avatarEl.style.backgroundImage = `url('${avatar}')`;
            avatarEl.textContent = "";
        } else {
            avatarEl.style.background = `hsl(${username.charCodeAt(0) * 7 % 360},70%,55%)`;
            avatarEl.textContent = username.charAt(0).toUpperCase();
        }

        // Load DOTA
        if (u.steamId) loadDotaProfile(u.steamId);

    } catch (err) {
        console.error(err);
        nameEl.textContent = "Грешка при вчитување.";
    }
}

/****************************************************
 * LOAD USER THREADS
 ****************************************************/
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

            out.insertAdjacentHTML("beforeend", `
                <div class="item">
                    <a href="thread.html?id=${doc.id}" class="item-title">${title}</a>
                </div>
            `);
        });

    } catch (err) {
        console.error(err);
        out.innerHTML = `<p class="error">Грешка при вчитување теми.</p>`;
    }
}

/****************************************************
 * LOAD USER COMMENTS
 ****************************************************/
async function loadUserComments() {
    const out = document.getElementById("userComments");
    const countEl = document.getElementById("commentCountProfile");

    out.innerHTML = `<div class="loading">Вчитувам коментари...</div>`;

    try {
        const threads = await db.collection("threads").get();

        let total = 0;
        let list = [];

        for (const t of threads.docs) {
            const comments = await t.ref
                .collection("comments")
                .where("authorId", "==", viewingUserId)
                .get();

            comments.forEach(c => {
                const text = escapeHtml(c.data().text || "");

                list.push({
                    threadId: t.id,
                    title: escapeHtml(t.data().title || "Без наслов"),
                    text
                });

                total++;
            });
        }

        countEl.textContent = total;

        if (total === 0) {
            out.innerHTML = `<p class="empty">Нема коментари.</p>`;
            return;
        }

        out.innerHTML = "";

        list.forEach(r => {
            out.insertAdjacentHTML("beforeend", `
                <div class="comment-item">
                    <a href="thread.html?id=${r.threadId}" class="cm-thread">${r.title}</a>
                    <div class="cm-text">${convertLinks(r.text)}</div>
                </div>
            `);
        });

    } catch (err) {
        console.error(err);
        out.innerHTML = `<p class="error">Грешка при вчитување коментари.</p>`;
    }
}

/****************************************************
 * DOTA PROFILE (USING YOUR BACKEND)
 ****************************************************/
function rankNameFromTier(rankTier) {
    if (!rankTier) return "Unranked";
    const main = Math.floor(rankTier / 10);
    return [
        "",
        "Herald", "Guardian", "Crusader",
        "Archon", "Legend", "Ancient",
        "Divine", "Immortal"
    ][main] || "Unranked";
}

async function loadDotaProfile(steamId) {
    const out = document.getElementById("dotaProfile");
    out.innerHTML = "Вчитувам Dota податоци...";

    try {
        const res = await fetch(`/api/steam-user?steamId=${steamId}`);
        const data = await res.json();

        if (!data.success) {
            out.innerHTML = "<p class='error'>Нема Dota податоци.</p>";
            return;
        }

        const p = data.basic;
        const ranks = data.ranks;
        const stats = data.stats;
        const matches = data.recentMatches || [];

        const rankTier = ranks.rankTier || 0;
        const main = Math.floor(rankTier / 10);
        const star = rankTier % 10;

        const rankIcon = rankTier
            ? `https://www.opendota.com/assets/images/dota2/rank_icons/rank_icon_${main}_${star}.png`
            : "";

        out.innerHTML = `
            <div class="dota-header">
                <img src="${p.avatar}" class="dota-avatar">
                <div class="dota-info-block">
                    <h2>${p.name}</h2>
                    <a href="${p.profileUrl}" target="_blank" class="dota-link">Steam Profile</a>
                </div>
            </div>

            <div class="dota-grid">
                <div class="dota-card">
                    <h3>Rank</h3>
                    ${rankIcon ? `<img src="${rankIcon}" class="dota-rank">` : "Unranked"}
                    <p>${rankNameFromTier(rankTier)}</p>
                </div>

                <div class="dota-card">
                    <h3>MMR</h3>
                    <p>Solo: ${ranks.soloMMR || "N/A"}</p>
                    <p>Party: ${ranks.partyMMR || "N/A"}</p>
                </div>

                <div class="dota-card">
                    <h3>Stats</h3>
                    <p>Wins: ${stats.wins}</p>
                    <p>Losses: ${stats.losses}</p>
                    <p>Winrate: ${stats.winrate.toFixed(2)}%</p>
                </div>
            </div>

            <h3 class="recent-title">Recent Matches</h3>
            <div class="recent-matches">
                ${matches.slice(0,10).map(m => `
                    <div class="match-row">
                        <span>Hero ID: ${m.hero_id}</span>
                        <span>KDA: ${m.kills}/${m.deaths}/${m.assists}</span>
                        <span>${(m.duration/60).toFixed(0)} мин</span>
                        <a href="https://www.dotabuff.com/matches/${m.match_id}" target="_blank">View</a>
                    </div>
                `).join("")}
            </div>
        `;
    } catch (err) {
        console.error(err);
        out.innerHTML = "<p class='error'>Грешка со Dota API.</p>";
    }
}

/****************************************************
 * ESCAPE + LINKIFY
 ****************************************************/
function escapeHtml(t) {
    const d = document.createElement("div");
    d.textContent = t;
    return d.innerHTML;
}

function convertLinks(text) {
    return text.replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1" target="_blank">$1</a>'
    );
}
