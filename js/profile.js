// =======================================================================
// profile.js – Zvekisha Dota Hub (2025 Final Edition)
// Hero stats + Recent Matches + Full Items + Tooltips + Caching
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
// FIX: DOTA ITEM ICON HELPER (2025)
// =======================================================================
function getItemIcon(name) {
  if (!name || name === "empty") {
    return "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/items/emptyitemshadow_lg.png";
  }

  // Поправки за предмети со различни CDN имиња
  const alias = {
    "dust": "dust_of_appearance",
    "tpscroll": "tp_scroll",
    "magic_stick": "magic_stick",
    "travel_boots": "travel_boots",
    "travel_boots_2": "travel_boots_2",
    "ward_sentry": "ward_sentry",
    "ward_observer": "ward_observer",
    "power_treads": "power_treads",
    "phase_boots": "phase_boots",
  };

  const finalName = alias[name] || name;

  return `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/items/${finalName}_lg.png`;
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
// FULL DOTA ITEM LIST (All Items 2025)
// =======================================================================
const itemNames = {
  0:"empty",
  1:"blink",2:"blades_of_attack",3:"broadsword",4:"chainmail",5:"claymore",6:"helm_of_iron_will",
  7:"javelin",8:"mithril_hammer",9:"platemail",10:"quarterstaff",11:"quelling_blade",
  12:"ring_of_protection",13:"gauntlets",14:"slippers",15:"mantle",16:"branches",
  17:"belt_of_strength",18:"boots_of_elves",19:"robe",20:"circlet",21:"ogre_axe",
  22:"blade_of_alacrity",23:"staff_of_wizardry",24:"ultimate_orb",25:"gloves",
  26:"lifesteal",27:"ring_of_regen",28:"sobi_mask",29:"boots",30:"gem",31:"cloak",
  32:"talisman_of_evasion",33:"cheese",34:"magic_stick",35:"recipe_magic_wand",
  36:"magic_wand",37:"ghost",38:"clarity",39:"flask",40:"dust",
  41:"bottle",42:"ward_observer",43:"ward_sentry",44:"tango",45:"courier",
  46:"tpscroll",47:"recipe_travel_boots",48:"travel_boots",49:"recipe_phase_boots",
  50:"phase_boots",51:"demon_edge",52:"eagle",53:"reaver",54:"relic",55:"hyperstone",
  56:"ring_of_health",57:"void_stone",58:"mystic_staff",59:"energy_booster",
  60:"point_booster",61:"vitality_booster",62:"recipe_power_treads",63:"power_treads",
  64:"recipe_hand_of_midas",65:"hand_of_midas",66:"recipe_oblivion_staff",67:"oblivion_staff",
  68:"pers",69:"recipe_poor_mans_shield",70:"poor_mans_shield",71:"recipe_bracer",
  72:"bracer",73:"recipe_wraith_band",74:"wraith_band",75:"recipe_null_talisman",
  76:"null_talisman",77:"recipe_necronomicon",78:"necronomicon",79:"recipe_aghanims_scepter",
  80:"ultimate_scepter",81:"recipe_refresher",82:"refresher",83:"recipe_assault",
  84:"assault",85:"recipe_heart",86:"heart",87:"recipe_black_king_bar",
  88:"black_king_bar",89:"aegis",90:"recipe_shivas_guard",91:"shivas_guard",
  92:"recipe_bloodstone",93:"bloodstone",94:"recipe_sphere",95:"sphere",96:"recipe_vanguard",
  97:"vanguard",98:"recipe_blade_mail",99:"blade_mail",100:"soul_booster",
  101:"hood_of_defiance",102:"recipe_rapier",103:"rapier",104:"recipe_crimson_guard",
  105:"crimson_guard",106:"recipe_armlet",107:"armlet",108:"invis_sword",109:"recipe_sange_and_yasha",
  110:"sange_and_yasha",111:"recipe_satanic",112:"satanic",113:"recipe_mjollnir",
  114:"mjollnir",115:"recipe_skadi",116:"skadi",117:"recipe_sange",118:"sange",
  119:"recipe_helm_of_the_dominator",120:"helm_of_the_dominator",121:"recipe_maelstrom",
  122:"maelstrom",123:"recipe_desolator",124:"desolator",125:"recipe_yasha",126:"yasha",
  127:"recipe_mask_of_madness",128:"mask_of_madness",129:"recipe_diffusal_blade",130:"diffusal_blade",
  131:"recipe_ethereal_blade",132:"ethereal_blade",133:"recipe_soul_ring",134:"soul_ring",
  135:"recipe_arcane_boots",136:"arcane_boots",137:"orb_of_venom",138:"stout_shield",
  139:"recipe_orb_of_venom",140:"recipe_medallion_of_courage",141:"medallion_of_courage",
  142:"smoke_of_deceit",143:"recipe_veil_of_discord",144:"veil_of_discord",
  145:"recipe_necronomicon_2",146:"recipe_necronomicon_3",147:"necronomicon_2",
  148:"necronomicon_3",149:"recipe_diffusal_blade_2",150:"diffusal_blade_2",
  151:"recipe_travel_boots_2",152:"travel_boots_2",

  // NEUTRAL ITEMS
  300:"trusty_shovel",301:"arcane_ring",302:"broom_handle",303:"faded_broach",304:"paladin_sword",
  305:"mango_tree",306:"keen_optic",307:"royal_jelly",308:"pupils_gift",309:"tome_of_aghanim",
  310:"ironwood_tree",311:"mysterious_hat",312:"possessed_mask",313:"misericorde",314:"seer_stone"
};

// =======================================================================
// CACHING CONFIG
// =======================================================================
const DOTA_CACHE_TTL_MS = 10 * 60 * 1000;

function getDotaCacheKey(pid) {
  return "zvek_dota_profile_" + pid;
}
function loadFromCache(pid) {
  try {
    const raw = localStorage.getItem(getDotaCacheKey(pid));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.timestamp || !parsed.data) return null;
    if (Date.now() - parsed.timestamp > DOTA_CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
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
// LOAD FIRESTORE PROFILE
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
// LOAD DOTA PROFILE
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
// RENDER PLAYER + RANK + HEROES + MATCHES
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

  // ========================= TOP HEROES =========================
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

  /// ========================= RECENT MATCHES (6 ITEMS + NEUTRAL) =========================
recentEl.innerHTML = recent.slice(0, 10).map(m => {
  const heroKey = heroNames[m.hero_id] || "antimage";
  const heroImg = `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${heroKey}.png`;
  const win = m.radiant_win === (m.player_slot < 128);
  const color = win ? "#22c55e" : "#ef4444";

  // 6 основни + 1 neutral
  const itemsTop = [m.item_0, m.item_1, m.item_2];
  const itemsBottom = [m.item_3, m.item_4, m.item_5];
  const neutralItem = m.neutral_item;

  function renderItem(id) {
    const name = itemNames[id] || "empty";
    const icon = getItemIcon(name);

    return `
      <div class="item-slot">
        <img src="${icon}" class="item-img">
        <div class="item-tip">
          <img src="${icon}" class="item-tip-img">
          <div class="item-tip-name">${name.replace(/_/g, " ")}</div>
        </div>
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

        <div class="items-row-3">
          ${itemsTop.map(renderItem).join("")}
        </div>

        <div class="items-row-3">
          ${itemsBottom.map(renderItem).join("")}
        </div>

        <div class="neutral-slot">
          ${renderItem(neutralItem)}
        </div>

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
    const text=c.text || c.content || "";
    return `<div class="comment-box">${escapeHtml(text)}</div>`;
  }).join("");
}

// =======================================================================
// RANK
// =======================================================================
function rankName(tier){
  const m={0:"Uncalibrated",11:"Herald",22:"Guardian",33:"Crusader",44:"Archon",
           55:"Legend",66:"Ancient",77:"Divine",80:"Immortal"};
  return m[Math.floor(tier/10)*10] || "Uncalibrated";
}

