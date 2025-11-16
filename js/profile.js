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
// 🚪 Провери дали е логирани (STEAM FIX JOINED)
// ─────────────────────────────
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

        nameEl.textContent = username;

        roleEl.textContent = role.toUpperCase();

        bannedEl.textContent = banned ? "DA (BANNED)" : "NE";
        bannedEl.style.color = banned ? "#ef4444" : "#22c55e";

        createdEl.textContent = createdAt;

        countryEl.textContent = country;

        if (avatar) {
            avatarEl.style.backgroundImage = `url('${avatar}')`;
            avatarEl.textContent = "";
        } else {
            avatarEl.textContent = username.charAt(0).toUpperCase();
        }

        // 🚀 Dota Profile Load
        if (u.steamId) {
            loadDotaProfile(u.steamId);
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
        const threads = await db.collection("threads").get();

        let totalComments = 0;
        let results = [];

        for (const t of threads.docs) {
            const comments = await t.ref
                .collection("comments")
                .where("authorId", "==", viewingUserId)
                .get();

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
// 🔥 LOAD DOTA PROFILE
// ─────────────────────────────
function rankNameFromTier(rankTier) {
    if (!rankTier) return "Unranked";

    const main = Math.floor(rankTier / 10);

    switch (main) {
        case 1: return "Herald";
        case 2: return "Guardian";
        case 3: return "Crusader";
        case 4: return "Archon";
        case 5: return "Legend";
        case 6: return "Ancient";
        case 7: return "Divine";
        case 8: return "Immortal";
        default: return "Unranked";
    }
}

async function loadDotaProfile(steamId) {
    const out = document.getElementById("dotaProfile");
    out.innerHTML = "Вчитувам Dota податоци...";

    try {
        const res = await fetch(`/api/steam-user?steamId=${steamId}`);
        const data = await res.json();

        if (!data.success) {
            out.innerHTML = "<p class='error'>Нема Dota податоци за овој корисник.</p>";
            return;
        }

        const p = data.basic;
        const ranks = data.ranks;
        const stats = data.stats;
        const matches = data.recentMatches;

        const rankTier = ranks.rankTier || 0;
        const rankMain = Math.floor(rankTier / 10);
        const rankStar = rankTier % 10;
        const rankIcon = rankTier
            ? `https://www.opendota.com/assets/images/dota2/rank_icons/rank_icon_${rankMain}_${rankStar}.png`
            : "";
        const rankName = rankNameFromTier(rankTier);

        out.innerHTML = `
            <div class="dota-header">
                <img src="${p.avatar}" class="dota-avatar" />
                <div class="dota-info-block">
                    <h2>${p.name}</h2>
                    <a href="${p.profileUrl}" class="dota-link" target="_blank">Steam Profile</a>
                </div>
            </div>

            <div class="dota-grid">
                <div class="dota-card">
                    <h3>Rank</h3>
                    ${rankIcon ? `<img src="${rankIcon}" class="dota-rank" />` : "Unranked"}
                    <p>${rankName}</p>
                    ${ranks.leaderboardRank ? `<p>Leaderboard #${ranks.leaderboardRank}</p>` : ""}
                </div>

                <div class="dota-card">
                    <h3>MMR</h3>
                    <p>Solo: ${ranks.soloMMR || "N/A"}</p>
                    <p>Party: ${ranks.partyMMR || "N/A"}</p>
                </div>

                <div class="dota-card">
                    <h3>Statistics</h3>
                    <p>Wins: ${stats.wins}</p>
                    <p>Losses: ${stats.losses}</p>
                    <p>Winrate: ${stats.winrate.toFixed(2)}%</p>
                </div>
            </div>

            <h3 class="recent-title">Recent Matches</h3>
            <div class="recent-matches">
                ${matches.slice(0, 10).map(m => `
                    <div class="match-row">
                        <span>Hero ID: ${m.hero_id}</span>
                        <span>KDA: ${m.kills}/${m.deaths}/${m.assists}</span>
                        <span>${(m.duration / 60).toFixed(0)} мин</span>
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

// ─────────────────────────────
// 🛡 ESCAPE HTML
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
