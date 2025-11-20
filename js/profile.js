// ===============================
//  PROFILE.JS – PREMIUM FIXED
//  Дата: 20.11.2025
// ===============================

// Global
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

// OPEN DOTA HERO LIST
const heroNames = {
  1:"antimage",2:"axe",3:"bane",4:"bloodseeker",5:"crystal_maiden",6:"drow_ranger",
  7:"earthshaker",8:"juggernaut",9:"mirana",10:"morphling",11:"nevermore",
  12:"phantom_lancer",13:"puck",14:"pudge",15:"razor",16:"sand_king",17:"storm_spirit",
  18:"sven",19:"tiny",20:"vengefulspirit",21:"windrunner",22:"zuus",23:"kunkka",
  25:"lina",26:"lion",27:"shadow_shaman",28:"slardar",29:"tidehunter",30:"witch_doctor",
  31:"lich",32:"riki",33:"enigma",34:"tinker",35:"sniper",36:"necrolyte",
  37:"warlock",38:"beastmaster",39:"queenofpain",40:"venomancer",41:"faceless_void",
  42:"skeleton_king",43:"death_prophet",44:"phantom_assassin",45:"pugna",
  46:"templar_assassin",47:"viper",48:"luna",49:"dragon_knight",50:"dazzle",
  51:"rattletrap",52:"leshrac",53:"furion",54:"life_stealer",55:"dark_seer",
  56:"clinkz",57:"omniknight",58:"enchantress",59:"huskar",60:"night_stalker",
  61:"broodmother",62:"bounty_hunter",63:"weaver",64:"jakiro",65:"batrider",
  66:"chen",67:"spectre",68:"ancient_apparition",69:"doom_bringer",70:"ursa",
  71:"spirit_breaker",72:"gyrocopter",73:"alchemist",74:"invoker",75:"silencer",
  76:"obsidian_destroyer",77:"lycan",78:"brewmaster",79:"shadow_demon",
  80:"lone_druid",81:"chaos_knight",82:"meepo",83:"treant",84:"ogre_magi",
  85:"undying",86:"rubick",87:"disruptor",88:"nyx_assassin",89:"naga_siren",
  90:"keeper_of_the_light",91:"wisp",92:"visage",93:"slark",94:"medusa",
  95:"troll_warlord",96:"centaur",97:"magnataur",98:"shredder",99:"bristleback",
  100:"tusk",101:"skywrath_mage",102:"abaddon",103:"elder_titan",104:"legion_commander",
  105:"techies",106:"ember_spirit",107:"earth_spirit",108:"abyssal_underlord",
  109:"terrorblade",110:"phoenix",111:"oracle",112:"winter_wyvern",113:"arc_warden",
  114:"monkey_king",119:"dark_willow",120:"pangolier",121:"grimstroke",123:"hoodwink",
  126:"void_spirit",128:"snapfire",129:"mars",135:"dawnbreaker",136:"marci",
  137:"primal_beast",138:"muerta",139:"ringmaster"
};

// ===============================
//  AUTH CHECK
// ===============================
auth.onAuthStateChanged(async user => {
  if (!user) return location.href = "index.html";

  currentUser = user;
  viewingUserId = getProfileId() || user.uid;

  await loadUserData(viewingUserId);
  await loadDotaProfile(viewingUserId);
});


// ===============================
//  LOAD USER FIREBASE DATA
// ===============================
async function loadUserData(uid) {
  try {
    const doc = await db.collection("users").doc(uid).get();
    if (!doc.exists) return;

    const u = doc.data();

    // Основно
    document.getElementById("p_name").textContent = escapeHtml(u.username || "Играч");
    document.getElementById("p_role").textContent = u.role || "member";
    document.getElementById("p_role").className = `role-badge role-${u.role || "member"}`;
    document.getElementById("p_created").textContent =
      u.createdAt ? u.createdAt.toDate().toLocaleDateString("mk-MK") : "—";

    document.getElementById("p_country").textContent = u.country || "—";
    document.getElementById("p_flag").textContent = u.flag || "";

    // БАН
    document.getElementById("p_banned").style.display = u.banned ? "inline-block" : "none";

    // Avatar
    const avatar = document.getElementById("p_avatar");
    if (u.avatarUrl) {
      avatar.style.backgroundImage = `url(${u.avatarUrl})`;
      avatar.textContent = "";
    }

    // Online
    document.getElementById("p_online").textContent =
      u.online ? "Онлајн 🟢" : "Офлајн";

  } catch (e) {
    console.error("Грешка во профил:", e);
  }
}


// ===============================
//  LOAD DOTA 2 PROFILE
// ===============================
async function loadDotaProfile(uid) {
  const container = document.getElementById("dotaProfile");
  const recentEl = document.getElementById("recentMatches");

  container.innerHTML = "Вчитувам Dota 2 податоци...";

  try {
    const user = await db.collection("users").doc(uid).get();
    const data = user.data();

    let playerId = data?.opendotaId || data?.steamId;
    if (!playerId) {
      container.innerHTML = "<p style='text-align:center;color:#94a3b8;'>Нема поврзан Steam профил.</p>";
      return;
    }

    // Convert steam64 to account32
    if (playerId.toString().length > 10) {
      playerId = String(BigInt(playerId) - BigInt("76561197960265728"));
    }

    // Fetch 3 API endpoints parallel
    const [pRes, wlRes, rRes] = await Promise.all([
      fetch(`https://api.opendota.com/api/players/${playerId}`),
      fetch(`https://api.opendota.com/api/players/${playerId}/wl`),
      fetch(`https://api.opendota.com/api/players/${playerId}/recentMatches`)
    ]);

    const profile = await pRes.json();
    const wl = await wlRes.json();
    const recent = await rRes.json();

    if (!profile.profile) {
      container.innerHTML =
        "<p style='text-align:center;color:#94a3b8;'>Профилот е приватен или не е индексиран.</p>";
      return;
    }

    const p = profile.profile;
    const rankTier = profile.rank_tier || 0;

    const rankImg = rankTier
      ? `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/badges/${rankTier}_badge.png`
      : "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/badges/0_badge.png";

    const rankNameText = rankName(rankTier);

    // ==========
    // HEADER SECTION
    // ==========
    container.innerHTML = `
      <div style="text-align:center;">
        <img src="${p.avatarfull}" style="width:150px;height:150px;border-radius:50%;border:5px solid #3b82f6;box-shadow:0 0 25px rgba(59,130,246,0.7);">
        <h2 style="margin:16px 0;color:#bfdbfe;font-size:2.2rem;">${escapeHtml(p.personaname)}</h2>
        <a href="${p.profileurl}" target="_blank" style="color:#60a5fa;font-size:1.1rem;">Steam профил ↗</a>

        <div style="margin-top:32px;display:flex;gap:30px;justify-content:center;flex-wrap:wrap;">

          <!-- Rank -->
          <div style="background:rgba(30,41,59,0.7);padding:20px;border-radius:16px;text-align:center;border:1px solid rgba(148,163,184,0.2);">
            <h3 style="color:#60a5fa;margin-bottom:8px;">Ранг</h3>
            <img src="${rankImg}" style="width:110px;margin-bottom:8px;">
            <div style="font-size:1.4rem;font-weight:bold;color:#fbbf24;">${rankNameText}</div>
          </div>

          <!-- MMR -->
          <div style="background:rgba(30,41,59,0.7);padding:20px;border-radius:16px;text-align:center;border:1px solid rgba(148,163,184,0.2);">
            <h3 style="color:#60a5fa;margin-bottom:8px;">MMR</h3>
            <div style="font-size:1.3rem;color:#fbbf24;font-weight:bold;">
              Solo: ${profile.solo_competitive_rank || "N/A"}
            </div>
            <div style="font-size:1.3rem;color:#fbbf24;font-weight:bold;">
              Party: ${profile.competitive_rank || "N/A"}
            </div>
          </div>

          <!-- Winrate -->
          <div style="background:rgba(30,41,59,0.7);padding:20px;border-radius:16px;text-align:center;border:1px solid rgba(148,163,184,0.2);">
            <h3 style="color:#60a5fa;margin-bottom:8px;">Winrate</h3>
            <div style="font-size:2rem;font-weight:900;color:${wl.win ? ((wl.win/(wl.win+wl.lose))>0.5?"#22c55e":"#ef4444"):"#ef4444"};">
              ${wl.win && wl.lose ? ((wl.win/(wl.win+wl.lose))*100).toFixed(1) : "0.0"}%
            </div>
            <div style="color:#94a3b8;margin-top:4px;">
              ${wl.win || 0}W - ${wl.lose || 0}L
            </div>
          </div>

        </div>
      </div>
    `;

    // ==========
    // RECENT MATCHES
    // ==========
    if (!recent.length) {
      recentEl.innerHTML = "<p style='color:#94a3b8;text-align:center;'>Нема последни мечеви.</p>";
      return;
    }

    recentEl.innerHTML = recent.slice(0, 10).map(m => {
      const heroKey = heroNames[m.hero_id] || "npc_dota_hero_base";
      const heroImg = `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${heroKey}.png`;
      const win = m.radiant_win === (m.player_slot < 128);

      return `
        <div class="match ${win ? "win" : "loss"}">
          <img src="${heroImg}" class="match-hero" 
            onerror="this.src='https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/npc_dota_hero_base.png'">
          <div style="flex:1;min-width:200px;">
            <strong style="color:${win ? "#22c55e" : "#ef4444"};font-size:1.1rem;">
              ${win ? "ПОБЕДА" : "ПОРАЗ"}
            </strong><br>
            <span style="color:#bfdbfe;font-weight:bold;">
              ${heroKey.replace(/_/g," ").toUpperCase()}
            </span><br>
            <span class="match-kda">${m.kills}/${m.deaths}/${m.assists} KDA</span>
          </div>
          <div class="items">
            ${[m.item_0,m.item_1,m.item_2,m.item_3,m.item_4,m.item_5]
              .filter(x=>x>0)
              .map(id=>`<img src="https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/${id}.png">`)
              .join("")}
          </div>
          <a href="https://www.dotabuff.com/matches/${m.match_id}" target="_blank" style="color:#60a5fa;font-weight:bold;margin-left:auto;">
            Dotabuff ↗
          </a>
        </div>
      `;
    }).join("");

  } catch (err) {
    console.error("Dota грешка:", err);
    container.innerHTML =
      "<p style='color:#94a3b8;text-align:center;'>Не можев да ги вчитам податоците.</p>";
  }
}


// ===============================
//  RANK NAME
// ===============================
function rankName(tier) {
  const ranks = {
    0:"Uncalibrated", 11:"Herald", 22:"Guardian", 33:"Crusader",
    44:"Archon", 55:"Legend", 66:"Ancient", 77:"Divine", 80:"Immortal"
  };
  return ranks[Math.floor(tier/10)*10] || "Uncalibrated";
}

