// =======================================================
// profile.js – OPTIMIZED EDITION (Hero stats + Recent + Caching)
// =======================================================

let currentUser = null;
let viewingUserId = null;

function escapeHtml(t) {
  const d = document.createElement("div");
  d.textContent = t;
  return d.innerHTML;
}

function getProfileId() {
  return new URLSearchParams(window.location.search).get("id");
}

// =======================================================
// Hero list (OpenDota format) – FULL 2025 UPDATED
// =======================================================
const heroNames = {
  1:"antimage",2:"axe",3:"bane",4:"bloodseeker",5:"crystal_maiden",6:"drow_ranger",
  7:"earthshaker",8:"juggernaut",9:"mirana",10:"morphling",11:"nevermore",
  12:"phantom_lancer",13:"puck",14:"pudge",15:"razor",16:"sand_king",17:"storm_spirit",
  18:"sven",19:"tiny",20:"vengefulspirit",21:"windrunner",22:"zuus",23:"kunkka",
  25:"lina",26:"lion",27:"shadow_shaman",28:"slardar",29:"tidehunter",30:"witch_doctor",
  31:"lich",32:"riki",33:"enigma",34:"tinker",35:"sniper",36:"necrolyte",37:"warlock",
  38:"beastmaster",39:"queenofpain",40:"venomancer",41:"faceless_void",42:"skeleton_king",
  43:"death_prophet",44:"phantom_assassin",45:"pugna",46:"templar_assassin",
  47:"viper",48:"luna",49:"dragon_knight",50:"dazzle",51:"rattletrap",52:"leshrac",
  53:"furion",54:"life_stealer",55:"dark_seer",56:"clinkz",57:"omniknight",
  58:"enchantress",59:"huskar",60:"night_stalker",61:"broodmother",62:"bounty_hunter",
  63:"weaver",64:"jakiro",65:"batrider",66:"chen",67:"spectre",68:"ancient_apparition",
  69:"doom_bringer",70:"ursa",71:"spirit_breaker",72:"gyrocopter",73:"alchemist",
  74:"invoker",75:"silencer",76:"obsidian_destroyer",77:"lycan",78:"brewmaster",
  79:"shadow_demon",80:"lone_druid",81:"chaos_knight",82:"meepo",83:"treant",
  84:"ogre_magi",85:"undying",86:"rubick",87:"disruptor",88:"nyx_assassin",
  89:"naga_siren",90:"keeper_of_the_light",91:"wisp",92:"visage",93:"slark",
  94:"medusa",95:"troll_warlord",96:"centaur",97:"magnataur",98:"shredder",
  99:"bristleback",100:"tusk",101:"skywrath_mage",102:"abaddon",103:"elder_titan",
  104:"legion_commander",105:"techies",106:"ember_spirit",107:"earth_spirit",
  108:"abyssal_underlord",109:"terrorblade",110:"phoenix",111:"oracle",
  112:"winter_wyvern",113:"arc_warden",114:"monkey_king",119:"dark_willow",
  120:"pangolier",121:"grimstroke",123:"hoodwink",126:"void_spirit",128:"snapfire",
  129:"mars",135:"dawnbreaker",136:"marci",137:"primal_beast",
  138:"muerta",139:"ringmaster"
};

// =======================================================
// CACHING CONFIG (localStorage)
// =======================================================
const DOTA_CACHE_TTL_MS = 10 * 60 * 1000; // 10 минути

function getDotaCacheKey(pid) {
  return "zvek_dota_profile_" + pid;
}

function loadFromCache(pid) {
  try {
    const raw = localStorage.getItem(getDotaCacheKey(pid));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.timestamp || !parsed.data) return null;

    const age = Date.now() - parsed.timestamp;
    if (age > DOTA_CACHE_TTL_MS) return null; // истечен кеш

    return parsed.data;
  } catch (e) {
    console.warn("Dota cache parse error:", e);
    return null;
  }
}

function saveToCache(pid, data) {
  try {
    localStorage.setItem(
      getDotaCacheKey(pid),
      JSON.stringify({
        timestamp: Date.now(),
        data
      })
    );
  } catch (e) {
    console.warn("Dota cache save error:", e);
  }
}

// =======================================================
// AUTH + LOAD PROFILE
// =======================================================
auth.onAuthStateChanged(async user => {
  if (!user) return location.href = "index.html";

  currentUser = user;
  viewingUserId = getProfileId() || user.uid;

  await loadUserData(viewingUserId);
  await loadDotaData(viewingUserId);
  await loadUserThreads(viewingUserId);
  await loadUserComments(viewingUserId);
});

// =======================================================
// FIRESTORE USER BASIC DATA
// =======================================================
async function loadUserData(uid) {
  const snap = await db.collection("users").doc(uid).get();

  if (!snap.exists) return;

  const u = snap.data();

  document.getElementById("p_name").textContent = u.username || "Играч";
  document.getElementById("p_role").textContent = u.role || "member";
  document.getElementById("p_role").className = `role-badge role-${u.role}`;

  if (u.avatarUrl) {
    const a = document.getElementById("p_avatar");
    a.style.backgroundImage = `url(${u.avatarUrl})`;
  }

  document.getElementById("p_online").textContent =
    u.online ? "Онлајн 🟢" : "Офлајн";
  document.getElementById("p_created").textContent =
    u.createdAt ? u.createdAt.toDate().toLocaleDateString("mk-MK") : "—";
}

// =======================================================
// LOAD DOTA PROFILE (WITH CACHING)
// =======================================================
async function loadDotaData(uid) {
  const container = document.getElementById("dotaProfile");
  const topHeroesEl = document.getElementById("topHeroes");
  const recentEl = document.getElementById("recentMatches");

  if (container) container.innerHTML = "Вчитувам Dota податоци...";
  if (topHeroesEl) topHeroesEl.innerHTML = "";
  if (recentEl) recentEl.innerHTML = "<div class='loading'>Вчитувам.</div>";

  try {
    const userDoc = await db.collection("users").doc(uid).get();
    const d = userDoc.data();
    if (!d) {
      if (container) {
        container.innerHTML = "<p style='color:#94a3b8;text-align:center;'>Нема Dota ID.</p>";
      }
      return;
    }

    let pid = d.opendotaId || d.steamId;
    if (!pid) {
      if (container) {
        container.innerHTML = "<p style='color:#94a3b8;text-align:center;'>Нема Dota ID.</p>";
      }
      return;
    }

    // Convert steam64 → dota32 ако е потребно
    if (pid.toString().length > 10) {
      pid = String(BigInt(pid) - BigInt("76561197960265728"));
    }

    // 1) Пробај кеш
    const cached = loadFromCache(pid);
    if (cached) {
      console.log("Dota profile – користам кеш за", pid);
      renderDotaProfile(cached, container, topHeroesEl, recentEl);
      return;
    }

    // 2) Ако нема кеш → API повици
    console.log("Dota profile – повикувам OpenDota за", pid);

    const [player, wl, recent, heroes] = await Promise.all([
      fetch(`https://api.opendota.com/api/players/${pid}`).then(r => r.json()),
      fetch(`https://api.opendota.com/api/players/${pid}/wl`).then(r => r.json()),
      fetch(`https://api.opendota.com/api/players/${pid}/recentMatches`).then(r => r.json()),
      fetch(`https://api.opendota.com/api/players/${pid}/heroes`).then(r => r.json())
    ]);

    const data = { player, wl, recent, heroes };

    // сними во кеш
    saveToCache(pid, data);

    // рендер
    renderDotaProfile(data, container, topHeroesEl, recentEl);

  } catch (err) {
    console.error("Грешка при вчитување на Dota податоци:", err);
    if (container) {
      container.innerHTML = "<p style='color:#ef4444;text-align:center;'>Грешка при вчитување на Dota податоци.</p>";
    }
    if (recentEl) {
      recentEl.innerHTML = "<p style='color:#ef4444;text-align:center;'>Нема податоци.</p>";
    }
  }
}

// =======================================================
// RENDER DOTA PROFILE (player + rank + heroes + matches)
// =======================================================
function renderDotaProfile(data, container, topHeroesEl, recentEl) {
  const { player, wl, recent, heroes } = data;

  if (!player || !player.profile) {
    if (container) {
      container.innerHTML = "<p style='color:#94a3b8;text-align:center;'>Приватен или недостапен профил.</p>";
    }
    return;
  }

  // Rank
  const tier = player.rank_tier || 0;
  const rankImg = tier
    ? `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/badges/${tier}_badge.png`
    : "";

  const rankImageEl = document.getElementById("rankImage");
  const rankNameEl = document.getElementById("rankName");
  const mmrEl = document.getElementById("p_mmr");
  const winrateEl = document.getElementById("p_winrate");

  if (rankImageEl) rankImageEl.src = rankImg;
  if (rankNameEl) rankNameEl.textContent = rankName(tier);

  // MMR
  if (mmrEl) {
    mmrEl.textContent =
      (player.solo_competitive_rank || player.competitive_rank) || "—";
  }

  // Winrate
  if (wl && winrateEl) {
    const total = (wl.win || 0) + (wl.lose || 0);
    const wr = total > 0 ? (wl.win / total) * 100 : 0;
    winrateEl.textContent = `${wr.toFixed(1)}% winrate`;
  }

  // Main block (avatar + name + Steam профил)
  if (container) {
    container.innerHTML = `
      <div style="text-align:center;margin-bottom:30px;">
        <img src="${player.profile.avatarfull}" style="width:130px;height:130px;border-radius:50%;border:5px solid #3b82f6;">
        <h2 style="margin:16px 0;color:#bfdbfe;">${escapeHtml(player.profile.personaname)}</h2>
        <a href="${player.profile.profileurl}" target="_blank" style="color:#60a5fa;font-size:1.1rem;">Steam профил ↗</a>
      </div>
    `;
  }

  // ================= TOP HEROES (populate #topHeroes) =================
  if (topHeroesEl && Array.isArray(heroes)) {
    const best = heroes
      .filter(h => h.games > 5)
      .sort((a, b) => (b.win / b.games) - (a.win / a.games))
      .slice(0, 5);

    if (best.length === 0) {
      topHeroesEl.innerHTML =
        "<p style='color:#94a3b8;'>Нема доволно одиграни игри за статистика.</p>";
    } else {
      topHeroesEl.innerHTML = best.map(h => {
        const winrate = (h.win / h.games) * 100;
        const heroKey = heroNames[h.hero_id] || "antimage";
        const img = `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${heroKey}.png`;

        return `
          <div style="background:rgba(30,41,59,0.7);padding:18px;border-radius:16px;display:flex;align-items:center;gap:18px;">
            <img src="${img}" style="width:90px;border-radius:10px;">
            <div>
              <div style="font-size:1.4rem;color:#bfdbfe;font-weight:bold;">
                ${heroKey.replace(/_/g," ").toUpperCase()}
              </div>
              <div style="color:#22c55e;font-weight:bold;">${winrate.toFixed(1)}% WR</div>
              <div style="color:#94a3b8;">${h.games} игри</div>
            </div>
          </div>
        `;
      }).join("");
    }
  }

  // ================= Recent Matches (populate #recentMatches) =================
  if (recentEl && Array.isArray(recent)) {
    recentEl.innerHTML = recent.slice(0, 10).map(m => {
      const heroKey = heroNames[m.hero_id] || "antimage";
      const img = `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${heroKey}.png`;

      const win = m.radiant_win === (m.player_slot < 128);
      const color = win ? "#22c55e" : "#ef4444";

      return `
        <div class="match ${win ? "win" : "loss"}">
          <img src="${img}" class="match-hero">
          <div style="flex:1;">
            <strong style="font-size:1.2rem;color:${color};">
              ${win ? "ПОБЕДА" : "ПОРАЗ"}
            </strong><br>
            K/D/A: <b>${m.kills}/${m.deaths}/${m.assists}</b>
          </div>
          <a href="https://www.dotabuff.com/matches/${m.match_id}"
             target="_blank"
             style="color:#60a5fa;font-weight:bold;">Dotabuff ↗</a>
        </div>
      `;
    }).join("");
  }
}

// =======================================================
// Load Topics & Comments
// =======================================================
async function loadUserThreads(uid) {
  const div = document.getElementById("userThreads");
  const snap = await db.collection("threads")
    .where("authorId", "==", uid)
    .orderBy("createdAt", "desc")
    .limit(5)
    .get();

  if (snap.empty) {
    div.innerHTML = "Нема теми.";
    return;
  }

  div.innerHTML = snap.docs.map(doc => {
    const t = doc.data();
    return `<div style="margin:8px 0;">
      <a href="thread.html?id=${doc.id}" style="color:#60a5fa;font-size:1.1rem;">
        ${escapeHtml(t.title || "Без наслов")}
      </a>
    </div>`;
  }).join("");
}

async function loadUserComments(uid) {
  const div = document.getElementById("userComments");
  const snap = await db.collectionGroup("comments")
    .where("authorId", "==", uid)
    .orderBy("createdAt", "desc")
    .limit(5)
    .get();

  if (snap.empty) {
    div.innerHTML = "Нема коментари.";
    return;
  }

  div.innerHTML = snap.docs.map(d => {
    const c = d.data();
    const text = c.text || c.content || "";
    return `
      <div style="margin:12px 0;background:rgba(30,41,59,0.7);padding:12px;border-radius:10px;">
        <div>${escapeHtml(text)}</div>
      </div>`;
  }).join("");
}

// =======================================================
// Rank name
// =======================================================
function rankName(tier) {
  const map = {
    0:"Uncalibrated", 11:"Herald", 22:"Guardian", 33:"Crusader",
    44:"Archon", 55:"Legend", 66:"Ancient", 77:"Divine", 80:"Immortal"
  };
  return map[Math.floor(tier / 10) * 10] || "Uncalibrated";
}

