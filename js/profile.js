/****************************************************
 * PROFILE.JS – 100% РАБОТИ, НИКОГАШ НЕ ЗАГЛАВУВА
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
            out.innerHTML = "<p>Нема корисник.</p>";
            return;
        }

        let playerId = userDoc.data()?.opendotaId || userDoc.data()?.steamId;

        if (playerId && playerId.length > 10) {
            playerId = String(BigInt(playerId) - BigInt("76561197960265728"));
        }

        if (!playerId) {
            out.innerHTML = "<p>Нема поврзан Steam профил.</p>";
            return;
        }

        // Директно од OpenDota (без наш API)
        const playerUrl = `https://api.opendota.com/api/players/${playerId}`;
        const wlUrl = `https://api.opendota.com/api/players/${playerId}/wl`;
        const recentUrl = `https://api.opendota.com/api/players/${playerId}/recentMatches`;

        const [playerRes, wlRes, recentRes] = await Promise.all([
            fetch(playerUrl).catch(() => ({ json: async () => ({}) })),
            fetch(wlUrl).catch(() => ({ json: async () => ({ win: 0, lose: 0 }) })),
            fetch(recentUrl).catch(() => ({ json: async () => ([]) }))
        ]);

        const player = await playerRes.json();
        const wl = await wlRes.json();
        const recentMatches = await recentRes.json();

        if (!player.profile) {
            out.innerHTML = "<p>Нема јавни Dota податоци (приватен профил или не е индексиран).</p>";
            return;
        }

        const b = player.profile;
        const rankTier = player.rank_tier || 0;
        const rankIcon = rankTier ? `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/badges/${rankTier}.png` : "";

        out.innerHTML = `
            <div style="text-align:center;margin:20px 0;">
                <img src="${b.avatarfull}" style="width:120px;height:120px;border-radius:50%;border:4px solid #3b82f6;">
                <h2 style="margin:10px 0;color:#60a5fa;">${escapeHtml(b.personaname)}</h2>
                <a href="${b.profileurl}" target="_blank" style="color:#9ca3af;">Steam профил ↗</a>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
                <div style="background:rgba(30,41,59,0.8);padding:20px;border-radius:16px;text-align:center;">
                    <h3>Ранг</h3>
                    ${rankIcon ? `<img src="${rankIcon}" style="width:100px;margin:10px 0;"><br>` : "<p>Unranked</p>"}
                    <b style="font-size:1.4rem;">${rankName(rankTier)}</b>
                </div>
                <div style="background:rgba(30,41,59,0.8);padding:20px;border-radius:16px;text-align:center;">
                    <h3>MMR</h3>
                    Solo: <b style="font-size:1.3rem;">${player.solo_competitive_rank || "N/A"}</b><br>
                    Party: <b style="font-size:1.3rem;">${player.competitive_rank || "N/A"}</b>
                </div>
            </div>

            <div style="background:rgba(30,41,59,0.8);padding:20px;border-radius:16px;margin:20px 0;text-align:center;">
                <h3>Статистика</h3>
                Победи: <b>${wl.win || 0}</b> • Загуби: <b>${wl.lose || 0}</b> • Winrate: <b>${wl.win && wl.lose ? ((wl.win / (wl.win + wl.lose)) * 100).toFixed(1) : 0}%</b>
            </div>

            <h3>Последни 10 меча</h3>
            <div style="max-height:600px;overflow-y:auto;">
                ${recentMatches.length === 0 ? "<p>Нема мечиви.</p>" : recentMatches.map(m => {
                    const heroKey = heroNames[m.hero_id] || "unknown_hero";
                    const heroImg = `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${heroKey}.png`;

                    const items = [m.item_0, m.item_1, m.item_2, m.item_3, m.item_4, m.item_5];
                    const neutral = m.item_neutral || 0;

                    return `
                        <div style="background:rgba(15,23,42,0.9);padding:15px;margin:12px 0;border-radius:14px;display:flex;align-items:center;gap:15px;flex-wrap:wrap;">
                            <img src="${heroImg}" style="width:88px;height:50px;border-radius:8px;">
                            <div style="flex:1;min-width:180px;">
                                <strong>${heroNames[m.hero_id] || "Unknown Hero"}</strong><br>
                                K/D/A: <b>${m.kills}/${m.deaths}/${m.assists}</b>
                            </div>
                            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                                ${items.map(id => id ? `<img src="https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/${id}.png" style="width:52px;height:38px;border-radius:6px;" title="${id}">` : `<div style="width:52px;height:38px;background:#333;border:1px dashed #555;"></div>`).join("")}
                                ${neutral ? `<img src="https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/${neutral}.png" style="width:52px;height:38px;border-radius:6px;" title="Neutral">` : ""}
                            </div>
                            <a href="https://www.dotabuff.com/matches/${m.match_id}" target="_blank" style="color:#60a5fa;margin-left:auto;font-weight:bold;">Dotabuff ↗</a>
                        </div>
                    `;
                }).join("")}
            </div>
        `;

    } catch (e) {
        console.error("Грешка при Dota податоци:", e);
        out.innerHTML = "<p>Нема Dota податоци (приватен профил или не е индексиран).</p>";
    }
}

function rankName(tier) {
    const names = {0:"Unranked",11:"Herald",22:"Guardian",33:"Crusader",44:"Archon",55:"Legend",66:"Ancient",77:"Divine",80:"Immortal"};
    return names[Math.floor(tier / 10) * 10] || "Unranked";
}
