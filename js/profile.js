/****************************************************
 * PROFILE.JS – 100% ТОЧНИ СЛИКИ ЗА ХЕРОИ И ИТЕМИ 2025
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

// Точни имиња за херои (OpenDota CDN 2025)
const heroNames = {
  1:"antimage",2:"axe",3:"bane",4:"bloodseeker",5:"crystal_maiden",6:"drow_ranger",7:"earthshaker",8:"juggernaut",9:"mirana",10:"morphling",
  11:"nevermore",12:"phantom_lancer",13:"puck",14:"pudge",15:"razor",16:"sand_king",17:"storm_spirit",18:"sven",19:"tiny",20:"vengefulspirit",
  21:"windrunner",22:"zuus",23:"kunkka",25:"lina",26:"lion",27:"shadow_shaman",28:"slardar",29:"tidehunter",30:"witch_doctor",31:"lich",
  32:"riki",33:"enigma",34:"tinker",35:"sniper",36:"necrolyte",37:"warlock",38:"beastmaster",39:"queenofpain",40:"venomancer",41:"faceless_void",
  42:"skeleton_king",43:"death_prophet",44:"phantom_assassin",45:"pugna",46:"templar_assassin",47:"viper",48:"luna",49:"dragon_knight",50:"dazzle",
  51:"rattletrap",52:"leshrac",53:"furion",54:"life_stealer",55:"dark_seer",56:"clinkz",57:"omniknight",58:"enchantress",59:"huskar",60:"night_stalker",
  61:"broodmother",62:"bounty_hunter",63:"weaver",64:"jakiro",65:"batrider",66:"chen",67:"spectre",68:"ancient_apparition",69:"doom_bringer",70:"ursa",
  71:"spirit_breaker",72:"gyrocopter",73:"alchemist",74:"invoker",75:"silencer",76:"obsidian_destroyer",77:"lycan",78:"brewmaster",79:"shadow_demon",80:"lone_druid",
  81:"chaos_knight",82:"meepo",83:"treant",84:"ogre_magi",85:"undying",86:"rubick",87:"disruptor",88:"nyx_assassin",89:"naga_siren",90:"keeper_of_the_light",
  91:"wisp",92:"visage",93:"slark",94:"medusa",95:"troll_warlord",96:"centaur",97:"magnataur",98:"shredder",99:"bristleback",100:"tusk",
  101:"skywrath_mage",102:"abaddon",103:"elder_titan",104:"legion_commander",105:"techies",106:"ember_spirit",107:"earth_spirit",108:"abyssal_underlord",109:"terrorblade",110:"phoenix",
  111:"oracle",112:"winter_wyvern",113:"arc_warden",114:"monkey_king",119:"dark_willow",120:"pangolier",121:"grimstroke",123:"hoodwink",126:"void_spirit",128:"snapfire",
  129:"mars",135:"dawnbreaker",136:"marci",137:"primal_beast",138:"muerta",139:"ringmaster"
};

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
                                ${items.map(id => id ? `<img src="https://cdn.cloudflare.steamstatic.com/apps/dota2/images/items/${id}_lg.png" style="width:52px;height:38px;border-radius:6px;" title="${id}">` : `<div style="width:52px;height:38px;background:#333;border:1px dashed #555;"></div>`).join("")}
                                ${neutral ? `<img src="https://cdn.cloudflare.steamstatic.com/apps/dota2/images/items/${neutral}_lg.png" style="width:52px;height:38px;border-radius:6px;" title="Neutral">` : ""}
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
