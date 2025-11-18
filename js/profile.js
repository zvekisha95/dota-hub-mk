/****************************************************
 * PROFILE.JS – СО TURBO ON/OFF КОПЧЕ (2025)
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
        let playerId = userDoc.data()?.opendotaId || userDoc.data()?.steamId;

        if (playerId && playerId.length > 10) {
            playerId = String(BigInt(playerId) - BigInt("76561197960265728"));
        }

        if (!playerId) {
            out.innerHTML = "<p>Нема поврзан Steam профил.</p>";
            return;
        }

        // Земаме Ranked + Turbo податоци
        const rankedRes = await fetch(`https://api.opendota.com/api/players/${playerId}`);
        const ranked = await rankedRes.json();

        const wlRes = await fetch(`https://api.opendota.com/api/players/${playerId}/wl${showTurbo ? '?game_mode=23' : ''}`);
        const wl = await wlRes.json();

        const recentRes = await fetch(`https://api.opendota.com/api/players/${playerId}/recentMatches${showTurbo ? '?game_mode=23' : ''}`);
        const recentMatches = await recentRes.json();

        if (!ranked.profile) {
            out.innerHTML = "<p>Нема јавни Dota податоци (приватен профил или не е индексиран).</p>";
            return;
        }

        renderDotaProfile(ranked, wl, recentMatches);

        // Turbo копче
        const toggleHTML = `
            <div style="text-align:center;margin:30px 0;">
                <button onclick="toggleTurbo()" style="padding:14px 35px;font-size:1.2rem;background:${showTurbo ? '#10b981' : '#3b82f6'};color:white;border:none;border-radius:12px;cursor:pointer;font-weight:bold;box-shadow:0 6px 20px rgba(0,0,0,0.4);">
                    Turbo режим: <strong>${showTurbo ? 'ON' : 'OFF'}</strong>
                </button>
            </div>
        `;
        out.insertAdjacentHTML('afterbegin', toggleHTML);

    } catch (e) {
        console.error(e);
        out.innerHTML = "<p>Грешка при вчитување на Dota податоци.</p>";
    }
}

function renderDotaProfile(player, wl, recentMatches) {
    const b = player.profile;
    const r = player;
    const s = wl;
    const recent = recentMatches || [];

    const rankTier = r.rank_tier || 0;
    const rankIcon = rankTier ? `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/badges/${rankTier}.png` : "";

    const modeText = showTurbo ? "Turbo" : "Ranked";
    const color = showTurbo ? "#10b981" : "#3b82f6";

    document.getElementById("dotaProfile").innerHTML = `
        <div style="text-align:center;margin:20px 0;">
            <img src="${b.avatarfull}" style="width:130px;height:130px;border-radius:50%;border:5px solid ${color};box-shadow:0 10px 30px rgba(0,0,0,0.6);">
            <h2 style="margin:15px 0;color:#60a5fa;font-size:2.4rem;">${escapeHtml(b.personaname)}</h2>
            <p style="font-size:1.6rem;font-weight:bold;color:${color};margin:10px 0;">${modeText} РЕЖИМ</p>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:25px;margin:30px 0;">
            <div style="background:rgba(30,41,59,0.9);padding:25px;border-radius:18px;text-align:center;">
                <h3 style="margin:0 0 15px;color:${color};">Ранг</h3>
                ${rankIcon ? `<img src="${rankIcon}" style="width:110px;margin:15px 0;"><br>` : "<p>Unranked</p>"}
                <b style="font-size:1.8rem;">${rankName(rankTier)}</b>
            </div>
            <div style="background:rgba(30,41,59,0.9);padding:25px;border-radius:18px;text-align:center;">
                <h3 style="margin:0 0 15px;color:${color};">MMR</h3>
                Solo: <b style="font-size:1.6rem;">${r.solo_competitive_rank || "N/A"}</b><br>
                Party: <b style="font-size:1.6rem;">${r.competitive_rank || "N/A"}</b>
            </div>
        </div>

        <div style="background:rgba(30,41,59,0.9);padding:25px;border-radius:18px;margin:30px 0;text-align:center;">
            <h3 style="margin:0;color:${color};">Статистика (${modeText})</h3>
            <div style="margin-top:15px;font-size:1.4rem;">
                Победи: <b>${s.win || 0}</b> • Загуби: <b>${s.lose || 0}</b> • Winrate: <b>${s.win && s.lose ? ((s.win / (s.win + s.lose)) * 100).toFixed(1) : 0}%</b>
            </div>
        </div>

        <h3 style="margin-top:35px;color:${color};">Последни мечиви (${modeText})</h3>
        <div style="max-height:500px;overflow-y:auto;">
            ${recent.length === 0 ? "<p style='text-align:center;color:#9ca3af;padding:30px;'>Нема мечиви.</p>" : recent.map(m => `
                <div style="background:rgba(15,23,42,0.9);padding:15px;margin:12px 0;border-radius:14px;display:flex;justify-content:space-between;align-items:center;font-size:1rem;">
                    <span>Hero ID: ${m.hero_id}</span>
                    <span>K/D/A: ${m.kills}/${m.deaths}/${m.assists}</span>
                    <a href="https://www.dotabuff.com/matches/${m.match_id}" target="_blank" style="color:#60a5fa;font-weight:bold;">Dotabuff ↗</a>
                </div>
            `).join("")}
        </div>
    `;

    // Ажурирај го копчето
    const btn = document.querySelector("button[onclick='toggleTurbo()']");
    if (btn) {
        btn.style.background = showTurbo ? '#10b981' : '#3b82f6';
        btn.querySelector("strong").textContent = showTurbo ? "ON" : "OFF";
    }
}

function toggleTurbo() {
    showTurbo = !showTurbo;
    loadDotaData();
}

function rankName(tier) {
    const names = {0:"Unranked",11:"Herald",22:"Guardian",33:"Crusader",44:"Archon",55:"Legend",66:"Ancient",77:"Divine",80:"Immortal"};
    return names[Math.floor(tier / 10) * 10] || "Unranked";
}
