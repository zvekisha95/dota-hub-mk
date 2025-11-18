/****************************************************
 * PROFILE.JS – 100% ТОЧНИ ИКОНИ ЗА ХЕРОИ И ИТЕМИ (2025)
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

// Херои имиња (за брзина)
const heroNames = {1:"Anti-Mage",2:"Axe",3:"Bane",4:"Bloodseeker",5:"Crystal Maiden",6:"Drow Ranger",7:"Earthshaker",8:"Juggernaut",9:"Mirana",10:"Morphling",11:"Shadow Fiend",12:"Phantom Lancer",13:"Puck",14:"Pudge",15:"Razor",16:"Sand King",17:"Storm Spirit",18:"Sven",19:"Tiny",20:"Vengeful Spirit",21:"Windranger",22:"Zeus",23:"Kunkka",25:"Lina",26:"Lion",27:"Shadow Shaman",28:"Slardar",29:"Tidehunter",30:"Witch Doctor",31:"Lich",32:"Riki",33:"Enigma",34:"Tinker",35:"Sniper",36:"Necrophos",37:"Warlock",38:"Beastmaster",39:"Queen of Pain",40:"Venomancer",41:"Faceless Void",42:"Wraith King",43:"Death Prophet",44:"Phantom Assassin",45:"Pugna",46:"Templar Assassin",47:"Viper",48:"Luna",49:"Dragon Knight",50:"Dazzle",51:"Clockwerk",52:"Leshrac",53:"Nature's Prophet",54:"Lifestealer",55:"Dark Seer",56:"Clinkz",57:"Omniknight",58:"Enchantress",59:"Huskar",60:"Night Stalker",61:"Broodmother",62:"Bounty Hunter",63:"Weaver",64:"Jakiro",65:"Batrider",66:"Chen",67:"Spectre",68:"Ancient Apparition",69:"Doom",70:"Ursa",71:"Spirit Breaker",72:"Gyrocopter",73:"Alchemist",74:"Invoker",75:"Silencer",76:"Outworld Destroyer",77:"Lycan",78:"Brewmaster",79:"Shadow Demon",80:"Lone Druid",81:"Chaos Knight",82:"Meepo",83:"Treant Protector",84:"Ogre Magi",85:"Undying",86:"Rubick",87:"Disruptor",88:"Nyx Assassin",89:"Naga Siren",90:"Keeper of the Light",91:"Io",92:"Visage",93:"Slark",94:"Medusa",95:"Troll Warlord",96:"Centaur Warrunner",97:"Magnus",98:"Timbersaw",99:"Bristleback",100:"Tusk",101:"Skywrath Mage",102:"Abaddon",103:"Elder Titan",104:"Legion Commander",105:"Techies",106:"Ember Spirit",107:"Earth Spirit",108:"Underlord",109:"Terrorblade",110:"Phoenix",111:"Oracle",112:"Winter Wyvern",113:"Arc Warden",114:"Monkey King",119:"Dark Willow",120:"Pangolier",121:"Grimstroke",123:"Hoodwink",126:"Void Spirit",128:"Snapfire",129:"Mars",135:"Dawnbreaker",136:"Marci",137:"Primal Beast",138:"Muerta",139:"Ringmaster"};

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
        let playerId = userDoc.data()?.opendotaId || userDoc.data()?.steamId;

        if (playerId && playerId.length > 10) {
            playerId = String(BigInt(playerId) - BigInt("76561197960265728"));
        }

        if (!playerId) {
            out.innerHTML = "<p>Нема поврзан Steam профил.</p>";
            return;
        }

        const playerRes = await fetch(`https://api.opendota.com/api/players/${playerId}`);
        const player = await playerRes.json();

        const wlRes = await fetch(`https://api.opendota.com/api/players/${playerId}/wl`);
        const wl = await wlRes.json();

        const recentRes = await fetch(`https://api.opendota.com/api/players/${playerId}/recentMatches`);
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
                    const heroName = heroNames[m.hero_id] || "Unknown Hero";
                    const heroImg = `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${m.hero_id}.png?3`;

                    const items = [m.item_0, m.item_1, m.item_2, m.item_3, m.item_4, m.item_5];
                    const neutral = m.item_neutral || 0;

                    return `
                        <div style="background:rgba(15,23,42,0.9);padding:15px;margin:12px 0;border-radius:14px;display:flex;align-items:center;gap:15px;flex-wrap:wrap;">
                            <img src="${heroImg}" style="width:88px;height:50px;border-radius:8px;">
                            <div style="flex:1;min-width:180px;">
                                <strong>${heroName}</strong><br>
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
        console.error(e);
        out.innerHTML = "<p>Грешка при вчитување на Dota податоци.</p>";
    }
}

function rankName(tier) {
    const names = {0:"Unranked",11:"Herald",22:"Guardian",33:"Crusader",44:"Archon",55:"Legend",66:"Ancient",77:"Divine",80:"Immortal"};
    return names[Math.floor(tier / 10) * 10] || "Unranked";
}
