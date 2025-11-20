// js/profile.js – Уперана верзија (Safe Mode)
// Профил со Dota 2 статистика, MMR, ранг, последни мечеви

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

// Dota hero map
const heroNames = {
  1:"antimage",2:"axe",3:"bane",4:"bloodseeker",5:"crystal_maiden",6:"drow_ranger",
  7:"earthshaker",8:"juggernaut",9:"mirana",10:"morphling",11:"nevermore",
  12:"phantom_lancer",13:"puck",14:"pudge",15:"razor",16:"sand_king",17:"storm_spirit",
  18:"sven",19:"tiny",20:"vengefulspirit",21:"windrunner",22:"zuus",23:"kunkka",
  25:"lina",26:"lion",27:"shadow_shaman",28:"slardar",29:"tidehunter",30:"witch_doctor",
  31:"lich",32:"riki",33:"enigma",34:"tinker",35:"sniper",36:"necrolyte",37:"warlock",
  38:"beastmaster",39:"queenofpain",40:"venomancer",41:"faceless_void",42:"skeleton_king",
  43:"death_prophet",44:"phantom_assassin",45:"pugna",46:"templar_assassin",47:"viper",
  48:"luna",49:"dragon_knight",50:"dazzle",51:"rattletrap",52:"leshrac",53:"furion",
  54:"life_stealer",55:"dark_seer",56:"clinkz",57:"omniknight",58:"enchantress",
  59:"huskar",60:"night_stalker",61:"broodmother",62:"bounty_hunter",63:"weaver",
  64:"jakiro",65:"batrider",66:"chen",67:"spectre",68:"ancient_apparition",69:"doom_bringer",
  70:"ursa",71:"spirit_breaker",72:"gyrocopter",73:"alchemist",74:"invoker",75:"silencer",
  76:"obsidian_destroyer",77:"lycan",78:"brewmaster",79:"shadow_demon",80:"lone_druid",
  81:"chaos_knight",82:"meepo",83:"treant",84:"ogre_magi",85:"undying",86:"rubick",
  87:"disruptor",88:"nyx_assassin",89:"naga_siren",90:"keeper_of_the_light",91:"wisp",
  92:"visage",93:"slark",94:"medusa",95:"troll_warlord",96:"centaur",97:"magnataur",
  98:"shredder",99:"bristleback",100:"tusk",101:"skywrath_mage",102:"abaddon",
  103:"elder_titan",104:"legion_commander",105:"techies",106:"ember_spirit",
  107:"earth_spirit",108:"abyssal_underlord",109:"terrorblade",110:"phoenix",
  111:"oracle",112:"winter_wyvern",113:"arc_warden",114:"monkey_king",
  119:"dark_willow",120:"pangolier",121:"grimstroke",123:"hoodwink",126:"void_spirit",
  128:"snapfire",129:"mars",135:"dawnbreaker",136:"marci",137:"primal_beast",
  138:"muerta",139:"ringmaster"
};

auth.onAuthStateChanged(async user => {
  if (!user) return location.href = "index.html";
  
  currentUser = user;
  viewingUserId = getProfileId() || user.uid;

  await loadUserData(viewingUserId);
  await loadDotaProfile(viewingUserId);
});

// LOAD USER DATA
async function loadUserData(uid) {
  try {
    const doc = await db.collection("users").doc(uid).get();
    if (!doc.exists) return;

    const u = doc.data();

    document.getElementById("p_name").textContent = escapeHtml(u.username || "???");
    document.getElementById("p_role").textContent = u.role || "member";
    document.getElementById("p_role").className = `role-badge role-${u.role || "member"}`;
    document.getElementById("p_created").textContent = u.createdAt ? u.createdAt.toDate().toLocaleDateString("mk-MK") : "—";
    document.getElementById("p_country").textContent = u.country || "—";
    document.getElementById("p_flag").textContent = u.flag || "";

    if (u.avatarUrl) {
      const av = document.getElementById("p_avatar");
      av.style.backgroundImage = `url(${u.avatarUrl})`;
      av.textContent = "";
    }

    document.getElementById("p_online").textContent = u.online ? "Онлајн 🟢" : "Офлајн";

  } catch (e) {
    console.error("profile load error:", e);
  }
}

// LOAD DOTA PROFILE
async function loadDotaProfile(uid) {
  const container = document.getElementById("dotaProfile");
  const recentEl = document.getElementById("recentMatches");

  container.innerHTML = "Вчитувам Dota податоци...";

  try {
    const doc = await db.collection("users").doc(uid).get();
    const user = doc.data();

    let pid = user?.opendotaId || user?.steamId;
    if (!pid) {
      container.innerHTML = "<p style='text-align:center;color:#94a3b8;'>Нема поврзан Steam профил.</p>";
      return;
    }

    if (pid.length > 10) {
      pid = String(BigInt(pid) - BigInt("76561197960265728"));
    }

    const [resP, resWL, resRM] = await Promise.all([
      fetch(`https://api.opendota.com/api/players/${pid}`),
      fetch(`https://api.opendota.com/api/players/${pid}/wl`),
      fetch(`https://api.opendota.com/api/players/${pid}/recentMatches`)
    ]);

    const player = await resP.json();
    const wl = await resWL.json();
    const recent = await resRM.json();

    if (!player.profile) {
      container.innerHTML =
        "<p style='text-align:center;color:#94a3b8;'>Профилот е приватен или не е индексиран.</p>";
      return;
    }

    const p = player.profile;

    const rankTier = player.rank_tier || 0;
    const rankImg = rankTier
      ? `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/badges/${rankTier}_badge.png`
      : "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/badges/rank_icon_placeholder.png";

    const solo = player.solo_competitive_rank || "—";
    const party = player.competitive_rank || "—";

    const winrate = wl.win + wl.lose > 0 ? ((wl.win / (wl.win + wl.lose)) * 100).toFixed(1) : "0.0";

    container.innerHTML = `
      <div style="text-align:center;margin-bottom:30px;">
        <img src="${p.avatarfull}" style="width:130px;height:130px;border-radius:50%;border:5px solid #3b82f6;">
        <h2 style="margin:16px 0;font-size:2.2rem;color:#bfdbfe;">${escapeHtml(p.personaname)}</h2>
        <a href="${p.profileurl}" target="_blank" style="color:#60a5fa;font-size:1.1rem;">Steam профил ↗</a>
      </div>

      <div style="display:grid;gap:20px;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));">

        <div style="background:#1e293bda;padding:24px;border-radius:18px;text-align:center;">
          <h3 style="color:#60a5fa;">Ранг</h3>
          <img src="${rankImg}" style="width:110px;margin:12px 0;">
          <div style="font-size:1.8rem;font-weight:800;color:#fbbf24;">${rankName(rankTier)}</div>
        </div>

        <div style="background:#1e293bda;padding:24px;border-radius:18px;text-align:center;">
          <h3 style="color:#60a5fa;">MMR</h3>
          <div>Solo: <b style="font-size:1.6rem;color:#fbbf24;">${solo}</b></div>
          <div>Party: <b style="font-size:1.6rem;color:#fbbf24;">${party}</b></div>
        </div>

        <div style="background:#1e293bda;padding:24px;border-radius:18px;text-align:center;">
          <h3 style="color:#60a5fa;">Winrate</h3>
          <div style="font-size:2.4rem;font-weight:800;color:${winrate > 50 ? "#22c55e" : "#ef4444"}">
            ${winrate}%
          </div>
          <div style="margin-top:8px;color:#94a3b8;">
            ${wl.win || 0}W - ${wl.lose || 0}L
          </div>
        </div>

      </div>
    `;

    // RECENT MATCHES
    if (recent.length === 0) {
      recentEl.innerHTML = "<p style='text-align:center;color:#94a3b8;padding:40px;'>Нема мечеви.</p>";
      return;
    }

    recentEl.innerHTML = recent
      .map(m => {
        const heroKey = heroNames[m.hero_id] || "npc_dota_hero_base";
        const heroImg =
          `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${heroKey}.png`;

        const win = m.radiant_win === (m.player_slot < 128);

        return `
          <div style="background:#0f172adaa;padding:18px;margin:12px 0;border-radius:16px;display:flex;gap:18px;flex-wrap:wrap;border-left:6px solid ${
            win ? "#22c55e" : "#ef4444"
          };">
            <img src="${heroImg}" style="width:92px;height:52px;border-radius:10px;" onerror="this.src='https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/npc_dota_hero_base.png'">

            <div style="flex:1;min-width:200px;">
              <strong style="font-size:1.2rem;color:${win ? "#22c55e" : "#ef4444"};">
                ${win ? "ПОБЕДА" : "ПОРАЗ"}
              </strong><br>
              K/D/A: <b>${m.kills}/${m.deaths}/${m.assists}</b>
            </div>

            <a href="https://www.dotabuff.com/matches/${m.match_id}" target="_blank" style="color:#60a5fa;font-weight:bold;margin-left:auto;">
              Dotabuff ↗
            </a>
          </div>
        `;
      })
      .join("");

  } catch (err) {
    console.error("Dota error:", err);
    container.innerHTML = "<p style='text-align:center;color:#94a3b8;'>Не можев да ги вчитам податоците.</p>";
  }
}

// Rank text
function rankName(tier) {
  if (!tier) return "Uncalibrated";
  const groups = {
    10: "Herald", 20: "Guardian", 30: "Crusader", 40: "Archon",
    50: "Legend", 60: "Ancient", 70: "Divine", 80: "Immortal"
  };
  const base = Math.floor(tier / 10) * 10;
  return groups[base] || "Uncalibrated";
}
