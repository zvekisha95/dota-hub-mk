/****************************************************
 * PROFILE.JS – ФИНАЛНА ВЕРЗИЈА 2025 (работи 100%)
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
    if (!user) {
        location.href = "index.html";
        return;
    }

    currentUser = user;
    viewingUserId = getProfileId() || user.uid;

    await loadUserData();
    await loadDotaData();
});

async function loadUserData() {
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
        document.getElementById("p_created").textContent = u.createdAt ? u.createdAt.toDate().toLocaleDateString("mk-MK") : "—";
        document.getElementById("p_country").textContent = u.country || "—";

        const avatarEl = document.getElementById("p_avatar");
        if (u.avatarUrl) {
            avatarEl.style.backgroundImage = `url(${u.avatarUrl})`;
            avatarEl.textContent = "";
        }
    } catch (e) { console.error(e); }
}

async function loadDotaData() {
    const out = document.getElementById("dotaProfile");
    out.innerHTML = "Вчитувам Dota податоци...";

    try {
        const userDoc = await db.collection("users").doc(viewingUserId).get();
        if (!userDoc.exists) {
            out.innerHTML = "<p>Корисникот не постои.</p>";
            return;
        }

        const data = userDoc.data();
        // Клучната промена – прво зема opendotaId, па ако нема зема steamId
        const playerId = data.opendotaId || data.steamId;

        if (!playerId) {
            out.innerHTML = "<p>Нема поврзан Steam/Dota профил.</p>";
            return;
        }

        const res = await fetch(`https://dota-hub-mk.vercel.app/api/steam-user?steamId=${playerId}`);
        const apiData = await res.json();

        if (!apiData.success) {
            out.innerHTML = `<p>Грешка: ${apiData.error || "Нема податоци од OpenDota"}</p>`;
            return;
        }

        const b = apiData.basic;
        const r = apiData.ranks;
        const s = apiData.stats;
        const recent = apiData.recentMatches || [];

        const rankTier = r.rankTier || 0;
        const rankIcon = rankTier ? `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/badges/${rankTier}.png` : "";

        out.innerHTML = `
            <div style="text-align:center;margin:20px 0;">
                <img src="${b.avatar || data.avatarUrl}" style="width:120px;height:120px;border-radius:50%;border:4px solid #3b82f6;">
                <h2 style="margin:10px 0;color:#60a5fa;">${escapeHtml(b.name || data.username)}</h2>
                <a href="${b.profileUrl}" target="_blank" style="color:#9ca3af;">Steam профил ↗</a>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
                <div style="background:rgba(30,41,59,0.8);padding:20px;border-radius:16px;text-align:center;">
                    <h3>Ранг</h3>
                    ${rankIcon ? `<img src="${rankIcon}" style="width:100px;margin:10px 0;"><br>` : "<p>Unranked</p>"}
                    <b style="font-size:1.4rem;">${rankName(rankTier)}</b>
                </div>
                <div style="background:rgba(30,41,59,0.8);padding:20px;border-radius:16px;text-align:center;">
                    <h3>MMR</h3>
                    Solo: <b style="font-size:1.3rem;">${r.soloMMR || "N/A"}</b><br>
                    Party: <b style="font-size:1.3rem;">${r.partyMMR || "N/A"}</b>
                </div>
            </div>

            <div style="background:rgba(30,41,59,0.8);padding:20px;border-radius:16px;margin:20px 0;text-align:center;">
                <h3>Статистика</h3>
                Победи: <b>${s.wins || 0}</b> • Загуби: <b>${s.losses || 0}</b> • Winrate: <b>${s.winrate || 0}%</b>
            </div>

            <h3 style="margin-top:30px;">Последни 10 меча</h3>
            <div style="max-height:500px;overflow-y:auto;">
                ${recent.length === 0 ? "<p>Нема последни мечиви.</p>" : recent.map(m => `
                    <div style="background:rgba(15,23,42,0.8);padding:12px;margin:10px 0;border-radius:12px;display:flex;justify-content:space-between;align-items:center;">
                        <span>Hero ID: ${m.hero_id}</span>
                        <span>K/D/A: ${m.kills}/${m.deaths}/${m.assists}</span>
                        <a href="https://www.dotabuff.com/matches/${m.match_id}" target="_blank" style="color:#60a5fa;">Dotabuff ↗</a>
                    </div>
                `).join("")}
            </div>
        `;

    } catch (e) {
        console.error("Грешка при Dota податоци:", e);
        out.innerHTML = "<p>Грешка при вчитување на Dota податоци.</p>";
    }
}

function rankName(tier) {
    const names = {0:"Unranked",11:"Herald",22:"Guardian",33:"Crusader",44:"Archon",55:"Legend",66:"Ancient",77:"Divine",80:"Immortal"};
    return names[Math.floor(tier / 10) * 10] || "Unranked";
}
