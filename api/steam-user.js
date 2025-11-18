// api/steam-user.js
const fetch = require("node-fetch");

module.exports = async (req, res) => {
  try {
    const { steamId, mode } = req.query; // mode = "turbo" или празно

    if (!steamId || isNaN(steamId)) {
      return res.status(400).json({ success: false, error: "Invalid steamId" });
    }

    // Основни податоци (за сите режими)
    const playerRes = await fetch(`https://api.opendota.com/api/players/${steamId}`);
    const player = await playerRes.json();

    if (player?.error || !player.profile) {
      return res.status(404).json({ success: false, error: "Player not found on OpenDota" });
    }

    // Win/Loss – различно за Turbo и Ranked
    const wlEndpoint = mode === "turbo" 
      ? `https://api.opendota.com/api/players/${steamId}/wl?game_mode=23`  // Turbo = game_mode 23
      : `https://api.opendota.com/api/players/${steamId}/wl`;               // Ranked (default)

    const wlRes = await fetch(wlEndpoint);
    const wl = await wlRes.json();

    // Последни мечиви – различно за Turbo и Ranked
    const recentEndpoint = mode === "turbo"
      ? `https://api.opendota.com/api/players/${steamId}/recentMatches?game_mode=23`
      : `https://api.opendota.com/api/players/${steamId}/recentMatches`;

    const recentRes = await fetch(recentEndpoint);
    const recentMatches = await recentRes.json();

    res.json({
      success: true,
      mode: mode === "turbo" ? "Turbo" : "Ranked",
      basic: {
        name: player.profile.personaname || "Unknown",
        avatar: player.profile.avatarfull || "",
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
    res.status(500).json({ success: false, error: "Server error" });
  }
};
