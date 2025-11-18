/****************************************************
 * PROFILE.JS – СО TURBO / RANKED TOGGLE 2025
 ****************************************************/

let currentUser = null;
let viewingUserId = null;
let showTurbo = false; // false = Ranked, true = Turbo

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
    await loadDotaData(); // прво Ranked
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
        const playerId = userDoc.data()?.opendotaId || userDoc.data()?.steamId;

        if (!playerId) {
            out.innerHTML = "<p>Нема поврзан Steam профил.</p>";
            return;
        }

        // Земаме и Ranked и Turbo податоци
        const [rankedRes, turboRes] = await Promise.all([
            fetch(`https://dota-hub-mk.vercel.app/api/steam-user?steamId=${playerId}&mode=ranked`),
            fetch(`https://dota-hub-mk.vercel.app/api/steam-user?steamId=${playerId}&mode=turbo`)
        ]);

        const rankedData = await rankedRes.json();
        const turboData = await turboRes.json();

        if (!rankedData.success && !turboData.success) {
            out.innerHTML = "<p>Грешка при вчитување на Dota податоци.</p>";
            return;
        }

        // Почетно прикажување (Ranked)
        renderDotaProfile(rankedData, turboData);

        // Додаваме копче за toggle
        const toggleHTML = `
            <div style="text-align:center;margin:20px 0;">
                <button onclick="toggleTurbo()" id="toggleBtn" style="padding:10px 25px;font-size:1rem;background:#3b82f6;color:white;border:none;border-radius:8px;cursor:pointer;">
                    Turbo: <span id="toggleText">OFF</span>
                </button>
            </div>
        `;

        out.insertAdjacentHTML('afterbegin', toggleHTML);

    } catch (e) {
        console.error(e);
        out.innerHTML = "<p>Грешка при вчитување на Dota податоци.</p>";
    }
}

function renderDotaProfile(ranked, turbo) {
    const data = showTurbo ? (turbo.success ? turbo : ranked) : (ranked.success ? ranked : turbo);
    const b = data.basic;
    const r = data.ranks;
    const s = data.stats;
    const recent = data.recentMatches || [];

    const rankTier = r.rankTier || 0;
    const rankIcon = rankTier ? `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/badges/${rankTier}.png` : "";

    const modeText = showTurbo ? "Turbo" : "Ranked";

    document.getElementById("dotaProfile").innerHTML = `
        <div style="text-align:center;margin:20px 0;">
            <img src="${b.avatar}" style="width:120px;height:120px;border-radius:50%;border:4px solid ${showTurbo ? '#10b981' : '#3b82f6'}">
            <h2 style="margin:10px 0;color:#60a5fa;">${escapeHtml(b.name)}</h2>
            <p style="font-size:1.4rem;font-weight:bold;color:${showTurbo ? '#10b981' : '#3b82f6'}">${modeText} Режим</p>
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
            <h3>Статистика (${modeText})</h3>
            Победи: <b>${s.wins}</b> • Загуби: <b>${s.losses}</b> • Winrate: <b>${s.winrate}%</b>
        </div>

        <h3>Последни мечиви (${modeText})</h3>
        <div style="max-height:500px;overflow-y:auto;">
            ${recent.length === 0 ? "<p>Нема мечиви.</p>" : recent.map(m => `
                <div style="background:rgba(15,23,42,0.8);padding:12px;margin:10px 0;border-radius:12px;display:flex;justify-content:space-between;align-items:center;">
                    <span>Hero ID: ${m.hero_id}</span>
                    <span>K/D/A: ${m.kills}/${m.deaths}/${m.assists}</span>
                    <a href="https://www.dotabuff.com/matches/${m.match_id}" target="_blank" style="color:#60a5fa;">Dotabuff ↗</a>
                </div>
            `).join("")}
        </div>
    `;

    document.getElementById("toggleText").textContent = showTurbo ? "ON" : "OFF";
}

// Глобална функција за toggle
function toggleTurbo() {
    showTurbo = !showTurbo;
    loadDotaData(); // повторно вчитува со нов режим
}

function rankName(tier) {
    const names = {0:"Unranked",11:"Herald",22:"Guardian",33:"Crusader",44:"Archon",55:"Legend",66:"Ancient",77:"Divine",80:"Immortal"};
    return names[Math.floor(tier / 10) * 10] || "Unranked";
}
