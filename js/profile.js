/****************************************************
 * PROFILE.JS — 100% РАБОТИ НА ZVEKISHA.MK 2025
 ****************************************************/

let currentUser = null;
let viewingUserId = null;

function getProfileId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

auth.onAuthStateChanged(async user => {
    if (!user) { location.href = "index.html"; return; }

    currentUser = user;
    viewingUserId = getProfileId() || user.uid;

    if (!viewingUserId) {
        alert("Нема ID");
        location.href = "forum.html";
        return;
    }

    await loadFullProfile();
    await loadDotaStats();
    await loadThreadsAndComments();
});

async function loadFullProfile() {
    try {
        const doc = await db.collection("users").doc(viewingUserId).get();
        if (!doc.exists) {
            document.getElementById("p_name").textContent = "Непознат корисник";
            return;
        }

        const u = doc.data();

        document.getElementById("p_name").textContent = escapeHtml(u.username || "???");
        document.getElementById("p_role").textContent = u.role || "member";
        document.getElementById("p_banned").textContent = u.banned ? "Да" : "Не";
        document.getElementById("p_created").textContent = u.createdAt?.toDate().toLocaleDateString("mk-MK") || "—";
        document.getElementById("p_country").textContent = u.country || "—";

        const avatarEl = document.getElementById("p_avatar");
        if (u.avatarUrl) {
            avatarEl.style.backgroundImage = `url(${u.avatarUrl})`;
            avatarEl.textContent = "";
        } else {
            avatarEl.style.backgroundImage = "";
            avatarEl.textContent = (u.username?.[0] || "?").toUpperCase();
        }

    } catch (e) { console.error(e); }
}

async function loadDotaStats() {
    const out = document.getElementById("dotaProfile");
    out.innerHTML = "Вчитувам Dota податоци...";

    try {
        const userDoc = await db.collection("users").doc(viewingUserId).get();
        const steamId = userDoc.data()?.steamId;

        if (!steamId) {
            out.innerHTML = "<p>Нема поврзан Steam профил.</p>";
            return;
        }

        const apiUrl = `https://dota-hub-mk.vercel.app/api/steam-user?steamId=${steamId}`;
        const res = await fetch(apiUrl);
        const data = await res.json();

        if (!data.success) {
            out.innerHTML = "<p>Грешка при вчитување на Dota податоци.</p>";
            return;
        }

        const b = data.basic;
        const r = data.ranks;
        const s = data.stats;
        const recent = data.recentMatches.slice(0, 10);

        const rankTier = r.rankTier || 0;
        const rankIcon = rankTier ? `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/badges/${rankTier}.png` : "";

        out.innerHTML = `
            <div style="text-align:center;margin-bottom:20px;">
                <img src="${b.avatar}" style="width:100px;height:100px;border-radius:50%;border:3px solid #3b82f6;">
                <h2 style="margin:10px 0;color:#60a5fa;">${escapeHtml(b.name)}</h2>
                <a href="${b.profileUrl}" target="_blank" style="color:#9ca3af;">Steam профил ↗</a>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin:20px 0;">
                <div style="background:rgba(30,41,59,0.8);padding:15px;border-radius:12px;text-align:center;">
                    <h3>Ранг</h3>
                    ${rankIcon ? `<img src="${rankIcon}" style="width:80px;"><br>` : ""}
                    <b>${rankName(rankTier)}</b>
                </div>
                <div style="background:rgba(30,41,59,0.8);padding:15px;border-radius:12px;text-align:center;">
                    <h3>MMR</h3>
                    Solo: <b>${r.soloMMR || "N/A"}</b><br>
                    Party: <b>${r.partyMMR || "N/A"}</b>
                </div>
            </div>

            <div style="background:rgba(30,41,59,0.8);padding:15px;border-radius:12px;text-align:center;margin:20px 0;">
                <h3>Статистика</h3>
                Победи: <b>${s.wins}</b> • Загуби: <b>${s.losses}</b> • Winrate: <b>${s.winrate.toFixed(1)}%</b>
            </div>

            <h3 style="margin-top:25px;">Последни 10 меча</h3>
            <div style="max-height:400px;overflow-y:auto;">
                ${recent.map(m => `
                    <div style="background:rgba(15,23,42,0.8);padding:10px;margin:8px 0;border-radius:8px;display:flex;justify-content:space-between;align-items:center;">
                        <span>Hero ID: ${m.hero_id}</span>
                        <span>K/D/A: ${m.kills}/${m.deaths}/${m.assists}</span>
                        <a href="https://dotabuff.com/matches/${m.match_id}" target="_blank" style="color:#60a5fa;">↗ Dotabuff</a>
                    </div>
                `).join("")}
            </div>
        `;

    } catch (e) {
        console.error(e);
        out.innerHTML = "<p>Грешка при вчитување на Dota податоци.</p>";
    }
}

function rankName(tier) {
    const names = {0:"Unranked",11:"Herald",22:"Guardian",33:"Crusader",44:"Archon",55:"Legend",66:"Ancient",77:"Divine",80:"Immortal"};
    return names[Math.floor(tier / 10) * 10] || "Unranked";
}

async function loadThreadsAndComments() {
    try {
        const threadSnap = await db.collection("threads").where("authorId","==",viewingUserId).orderBy("createdAt","desc").limit(10).get();
        document.getElementById("threadCountProfile").textContent = threadSnap.size;
        const threadOut = document.getElementById("userThreads");
        threadOut.innerHTML = threadSnap.empty ? "<i>Нема теми</i>" : "";
        threadSnap.forEach(t => {
            const d = t.data();
            threadOut.innerHTML += `<div style="margin:8px 0;"><a href="thread.html?id=${t.id}" style="color:#60a5fa;">${escapeHtml(d.title)}</a></div>`;
        });

        // Коментари (едноставно)
        document.getElementById("commentCountProfile").textContent = "скоро...";

    } catch (e) { console.error(e); }
}
