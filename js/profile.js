// =======================================================================
// profile.js – Zvekisha Dota Hub (2025 Final Edition + STRATZ Item Fix)
// Hero stats + Recent Matches + Items + Tooltips + Caching
// =======================================================================

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

// =======================================================================
// FIX 2025 – STRATZ CDN WORKING ITEM ICONS
// =======================================================================
function getItemIcon(name) {
  if (!name || name === "empty") {
    return "/img/empty.png"; // стави си празна PNG или остави вака
  }

  // STRATZ CDN – работи во 2025 без блокади
  return `https://cdn.stratz.com/images/dota2/items/${name}.png`;
}

// =======================================================================
// HERO LIST (OpenDota format)
// =======================================================================
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
  111:"oracle",112:"winter_wyvern",113:"arc_warden",114:"monkey_king",119:"dark_willow",
  120:"pangolier",121:"grimstroke",123:"hoodwink",126:"void_spirit",128:"snapfire",
  129:"mars",135:"dawnbreaker",136:"marci",137:"primal_beast",138:"muerta",139:"ringmaster"
};

// =======================================================================
// ITEM LIST (shortened for speed – OpenDota format)
// =======================================================================
const itemNames = {
  0:"empty",
  1:"blink",2:"blades_of_attack",3:"broadsword",4:"chainmail",5:"claymore",
  6:"helm_of_iron_will",7:"javelin",8:"mithril_hammer",9:"platemail",10:"quarterstaff",
  11:"quelling_blade",12:"ring_of_protection",13:"gauntlets",14:"slippers",
  15:"mantle",16:"branches",17:"belt_of_strength",18:"boots_of_elves",19:"robe",
  20:"circlet",21:"ogre_axe",22:"blade_of_alacrity",23:"staff_of_wizardry",
  24:"ultimate_orb",25:"gloves",26:"lifesteal",27:"ring_of_regen",28:"sobi_mask",
  29:"boots",30:"gem",31:"cloak",32:"talisman_of_evasion",33:"cheese",
  34:"magic_stick",36:"magic_wand",38:"clarity",39:"flask",40:"dust",
  41:"bottle",42:"ward_observer",43:"ward_sentry",44:"tango",
  46:"tpscroll",48:"travel_boots",50:"phase_boots",56:"ring_of_health",
  63:"power_treads",65:"hand_of_midas",67:"oblivion_staff",
  102:"rapier",116:"skadi",122:"maelstrom",124:"desolator",
  // ... (другите можам да ги додадам ако сакаш FULL list)
};

// =======================================================================
// CACHE SYSTEM
// =======================================================================
const DOTA_CACHE_TTL_MS = 10 * 60 * 1000;

function getDotaCacheKey(pid) { return "zvek_dota_profile_" + pid; }

function loadFromCache(pid) {
  try {
    const raw = localStorage.getItem(getDotaCacheKey(pid));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.timestamp || !parsed.data) return null;
    if (Date.now() - parsed.timestamp > DOTA_CACHE_TTL_MS) return null;
    return parsed.data;
  } catch { return null; }
}

function saveToCache(pid, data) {
  localStorage.setItem(getDotaCacheKey(pid), JSON.stringify({
    timestamp: Date.now(),
    data
  }));
}

// =======================================================================
// AUTH + PROFILE LOAD
// =======================================================================
auth.onAuthStateChanged(async user => {
  if (!user) return location.href="index.html";

  currentUser = user;
  viewingUserId = getProfileId() || user.uid;

  await loadUserData(viewingUserId);
  await loadDotaData(viewingUserId);
  await loadUserThreads(viewingUserId);
  await loadUserComments(viewingUserId);
});

// =======================================================================
// FIRESTORE PROFILE DATA
// =======================================================================
async function loadUserData(uid) {
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) return;

  const u = snap.data();

  document.getElementById("p_name").textContent = u.username;
  document.getElementById("p_role").textContent = u.role;
  document.getElementById("p_role").className = `role-badge role-${u.role}`;

  if (u.avatarUrl)
    document.getElementById("p_avatar").style.backgroundImage = `url(${u.avatarUrl})`;

  document.getElementById("p_online").textContent = u.online ? "Онлајн 🟢" : "Офлајн";
  document.getElementById("p_created").textContent =
    u.createdAt ? u.createdAt.toDate().toLocaleDateString("mk-MK") : "—";
}

// =======================================================================
// LOAD DOTA DATA
// =======================================================================
async function loadDotaData(uid) {
  const container = document.getElementById("dotaProfile");
  const topHeroesEl = document.getElementById("topHeroes");
  const recentEl = document.getElementById("recentMatches");

  container.innerHTML = "Вчитувам...";
  recentEl.innerHTML = "Вчитувам...";
  topHeroesEl.innerHTML = "";

  const snap = await db.collection("users").doc(uid).get();
  const u = snap.data();
  if (!u) return;

  let pid = u.opendotaId || u.steamId;
  if (!pid) {
    container.innerHTML="Нема Dota ID.";
    return;
  }

  if (pid.toString().length > 10)
    pid = String(BigInt(pid) - BigInt("76561197960265728"));

  const cached = loadFromCache(pid);
  if (cached) {
    renderDotaProfile(cached, container, topHeroesEl, recentEl);
    return;
  }

  const [player, wl, recent, heroes] = await Promise.all([
    fetch(`https://api.opendota.com/api/players/${pid}`).then(r=>r.json()),
    fetch(`https://api.opendota.com/api/players/${pid}/wl`).then(r=>r.json()),
    fetch(`https://api.opendota.com/api/players/${pid}/recentMatches`).then(r=>r.json()),
    fetch(`https://api.opendota.com/api/players/${pid}/heroes`).then(r=>r.json())
  ]);

  const data={ player, wl, recent, heroes };
  saveToCache(pid,data);
  renderDotaProfile(data, container, topHeroesEl, recentEl);
}

// =======================================================================
// RENDER DOTA PROFILE + MATCHES + ITEMS
// =======================================================================
function renderDotaProfile(data, container, topHeroesEl, recentEl) {
  const { player, wl, recent, heroes } = data;

  if (!player || !player.profile) {
    container.innerHTML = "Профилот е приватен.";
    return;
  }

  container.innerHTML = `
    <div style="text-align:center;margin-bottom:30px;">
      <img src="${player.profile.avatarfull}" 
           style="width:130px;height:130px;border-radius:50%;border:5px solid #3b82f6;">
      <h2 style="margin:16px 0;color:#bfdbfe;">
        ${escapeHtml(player.profile.personaname)}
      </h2>
      <a href="${player.profile.profileurl}" target="_blank"
         style="color:#60a5fa;font-size:1.1rem;">Steam профил ↗</a>
    </div>
  `;

  // Rank
  const tier = player.rank_tier || 0;
  document.getElementById("rankImage").src =
    tier ? `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/badges/${tier}_badge.png` : "";
  document.getElementById("rankName").textContent = rankName(tier);

  document.getElementById("p_mmr").textContent =
    player.solo_competitive_rank || player.competitive_rank || "—";

  // WR
  const total = wl.win + wl.lose;
  const wr = total>0 ? ((wl.win/total)*100).toFixed(1):0;
  document.getElementById("p_winrate").textContent = `${wr}% winrate`;

  // TOP HEROES
  const best = heroes.filter(h=>h.games>5)
    .sort((a,b)=>(b.win/b.games)-(a.win/a.games))
    .slice(0,5);

  topHeroesEl.innerHTML = best.map(h=>{
    const wr=(h.win/h.games)*100;
    const heroKey=heroNames[h.hero_id]||"antimage";
    const img=`https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${heroKey}.png`;

    return `
      <div class="hero-box">
        <img src="${img}" class="hero-img">
        <div>
          <div class="hero-name">${heroKey.replace(/_/g," ").toUpperCase()}</div>
          <div class="hero-wr">${wr.toFixed(1)}% WR</div>
          <div class="hero-games">${h.games} игри</div>
        </div>
      </div>`;
  }).join("");

  // =============== RECENT MATCHES (10 matches) ===============
  recentEl.innerHTML = recent.slice(0, 10).map(m => {
    const heroKey = heroNames[m.hero_id] || "antimage";
    const heroImg = `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${heroKey}.png`;
    const win = m.radiant_win === (m.player_slot < 128);
    const color = win ? "#22c55e" : "#ef4444";

    const itemsTop = [m.item_0, m.item_1, m.item_2];
    const itemsBottom = [m.item_3, m.item_4, m.item_5];
    const neutralItem = m.neutral_item;

    function renderItem(id) {
      const name = itemNames[id] || "empty";

      // fallback за празен slot
      if (!id || id === 0 || name === "empty") {
        return `
          <div class="item-slot item-empty">
            <div class="item-empty-box">—</div>
          </div>
        `;
      }

      const icon = getItemIcon(name);

      return `
        <div class="item-slot">
          <img src="${icon}" class="item-img">
        </div>
      `;
    }

    return `
      <div class="match ${win ? "win" : "loss"}">

        <img src="${heroImg}" class="match-hero">

        <div class="match-info">
          <strong style="color:${color};">${win ? "ПОБЕДА" : "ПОРАЗ"}</strong><br>
          <span>K/D/A: <b>${m.kills}/${m.deaths}/${m.assists}</b></span>
        </div>

        <div class="items-wrapper">
          <div class="items-row-3">${itemsTop.map(renderItem).join("")}</div>
          <div class="items-row-3">${itemsBottom.map(renderItem).join("")}</div>
          <div class="neutral-slot">${renderItem(neutralItem)}</div>
        </div>

        <a href="https://www.dotabuff.com/matches/${m.match_id}"
           target="_blank" class="match-link">Dotabuff ↗</a>
      </div>
    `;
  }).join("");
}

// =======================================================================
// USER THREADS + COMMENTS
// =======================================================================
async function loadUserThreads(uid){
  const div=document.getElementById("userThreads");

  const snap=await db.collection("threads")
    .where("authorId","==",uid)
    .orderBy("createdAt","desc")
    .limit(5).get();

  if(snap.empty){
    div.innerHTML="Нема теми.";
    return;
  }

  div.innerHTML=snap.docs.map(doc=>{
    const t=doc.data();
    return `<div><a href="thread.html?id=${doc.id}" class="tlink">
      ${escapeHtml(t.title)}</a></div>`;
  }).join("");
}

async function loadUserComments(uid){
  const div=document.getElementById("userComments");

  const snap=await db.collectionGroup("comments")
    .where("authorId","==",uid)
    .orderBy("createdAt","desc")
    .limit(5).get();

  if(snap.empty){
    div.innerHTML="Нема коментари.";
    return;
  }

  div.innerHTML=snap.docs.map(d=>{
    const c=d.data();
    return `<div class="comment-box">${escapeHtml(c.text)}</div>`;
  }).join("");
}

// =======================================================================
// RANK NAME
// =======================================================================
function rankName(tier){
  const m={0:"Uncalibrated",11:"Herald",22:"Guardian",33:"Crusader",44:"Archon",
           55:"Legend",66:"Ancient",77:"Divine",80:"Immortal"};
  return m[Math.floor(tier/10)*10] || "Uncalibrated";
}

