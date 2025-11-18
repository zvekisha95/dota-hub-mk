// api/steam-user.js – ПОДДРЖУВА RANKED И TURBO
const fetch = require("node-fetch");

module.exports = async (req, res) => {
  try {
    let { steamId, mode } = req.query; // mode = "turbo" или празно

    if (!steamId) {
      return res.status(400).json({ success: false, error: "Нема steamId" });
    }

    // Ако е Steam64 ID, конвертирај во OpenDota 32-битен
    if (steamId.length > 10) {
      steamId = String(BigInt(steamId) - BigInt("76561197960265728"));
    }

    // OpenDota endpoints
    const base = `https://api.opendota.com/api/players/${steamId}`;
    const wlEndpoint = mode === "turbo" 
      ? `${base}/wl?game_mode=23`  // Turbo mode
      : `${base}/wl`;              // Ranked (default)

    const recentEndpoint = mode === "turbo"
      ? `${base}/recentMatches?game_mode=23`
      : `${base}/recentMatches`;

    const [playerRes, wlRes, recentRes] = await Promise.all([
      fetch(base),
      fetch(wlEndpoint),
      fetch(recentEndpoint)
    ]);

    const player = await playerRes.json();
    const wl = await wlRes.json();
    const recentMatches = await recentRes.json();

    if (!player.profile) {
      return res.json({ success: true, empty: true });
    }

    res.json({
      success: true,
      empty: false,
      basic: {
        name: player.profile.personaname || "Непознат",
        avatar: player.Profile.avatarfull || "",
        profileUrl: player.profile.profileurl || ""
      },
      ranks: {
        rankTier: player.rank_tier || 0,
        soloMMR: player.solo_competitive_rank || null,
        partyMMR: player.competitive_rank || null
      },
      stats: {
        wins: wl.win || 0,
        losses: wl.lose || 0,
        winrate: wl.win && wl.lose ? ((wl.win / (wl.win + wl.lose)) * 100).toFixed(1) : 0
      },
      recentMatches: recentMatches.slice(0, 10) || []
    });

  } catch (err) {
    console.error("steam-user error:", err);
    res.json({ success: true, empty: true });
  }
};
