// ======================================================================
// api/steam-user.js – Zvekisha Dota Hub
// Optimized Version (Server Cache + Firestore Cache + Error Handling)
// ======================================================================

const fetch = require("node-fetch").default;
const admin = require("./firebaseAdmin");

// In-memory cache (Vercel serverless will persist ~5–90 sec depending on cold start)
globalThis.__STEAM_CACHE = globalThis.__STEAM_CACHE || {};

// Firestore instance
const db = admin.firestore();

// Cache TTL
const MEMORY_CACHE_MS = 5 * 60 * 1000;     // 5 минути (server memory)
const FIRESTORE_CACHE_MS = 60 * 60 * 1000; // 1 час (Firestore persistent cache)

module.exports = async (req, res) => {
  try {
    const { steamId } = req.query;

    if (!steamId) {
      return res.status(400).json({ error: "Missing steamId parameter" });
    }

    // Convert Steam64 → Dota32 if necessary
    let pid = steamId;
    if (pid.toString().length > 10) {
      pid = String(BigInt(pid) - BigInt("76561197960265728"));
    }

    // ============================
    // 1) TRY MEMORY CACHE
    // ============================
    const mem = globalThis.__STEAM_CACHE[pid];
    if (mem && Date.now() - mem.timestamp < MEMORY_CACHE_MS) {
      console.log("steam-user.js → MEMORY CACHE HIT for", pid);
      return res.status(200).json(mem.data);
    }

    console.log("steam-user.js → MISS, checking Firestore cache…");

    // ============================
    // 2) TRY FIRESTORE CACHE
    // ============================
    const docRef = db.collection("cache_dota").doc(pid);
    const doc = await docRef.get();

    if (doc.exists) {
      const d = doc.data();
      const age = Date.now() - d.timestamp;

      if (age < FIRESTORE_CACHE_MS) {
        console.log("steam-user.js → FIRESTORE CACHE HIT for", pid);

        // update memory cache
        globalThis.__STEAM_CACHE[pid] = {
          timestamp: Date.now(),
          data: d.data
        };

        return res.status(200).json(d.data);
      }
    }

    console.log("steam-user.js → CACHE MISS → calling OpenDota API…");

    // ============================
    // 3) FETCH FROM OPEN-DOTA API
    // ============================
    const [player, wl, recentMatches, heroes] = await Promise.all([
      fetch(`https://api.opendota.com/api/players/${pid}`).then(r => r.json()),
      fetch(`https://api.opendota.com/api/players/${pid}/wl`).then(r => r.json()),
      fetch(`https://api.opendota.com/api/players/${pid}/recentMatches`).then(r => r.json()),
      fetch(`https://api.opendota.com/api/players/${pid}/heroes`).then(r => r.json())
    ]);

    if (!player || player.error) {
      return res.status(500).json({ error: "Failed to fetch OpenDota player data" });
    }

    const result = {
      basic: {
        name: player.profile?.personaname || "Unknown",
        avatar: player.profile?.avatarfull || "",
        profileUrl: player.profile?.profileurl || ""
      },
      ranks: {
        rankTier: player.rank_tier || 0,
        soloMMR: player.solo_competitive_rank || null,
        partyMMR: player.competitive_rank || null,
        leaderboardRank: player.leaderboard_rank || null
      },
      stats: {
        wins: wl.win || 0,
        losses: wl.lose || 0,
        winrate:
          wl.win + wl.lose > 0
            ? Math.round((wl.win / (wl.win + wl.lose)) * 100)
            : 0
      },
      heroes: Array.isArray(heroes) ? heroes : [],
      recentMatches: Array.isArray(recentMatches) ? recentMatches : []
    };

    // ============================
    // 4) SAVE TO FIRESTORE CACHE
    // ============================
    await docRef.set({
      timestamp: Date.now(),
      data: result
    });

    // ============================
    // 5) SAVE TO MEMORY CACHE
    // ============================
    globalThis.__STEAM_CACHE[pid] = {
      timestamp: Date.now(),
      data: result
    };

    // respond
    return res.status(200).json(result);

  } catch (err) {
    console.error("steam-user.js → ERROR:", err);
    return res.status(500).json({ error: "Server error", details: err.toString() });
  }
};
