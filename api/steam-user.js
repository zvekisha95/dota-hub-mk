// api/steam-user.js
const fetch = require("node-fetch");

module.exports = async (req, res) => {
  try {
    const { steamId } = req.query;
    if (!steamId) return res.status(400).json({ success: false, error: "No steamId" });

    // 1. Основни податоци + MMR + ранг
    const playerRes = await fetch(`https://api.opendota.com/api/players/${steamId}`);
    const player = await playerRes.json();

    // 2. Win/Loss
    const wlRes = await fetch(`https://api.opendota.com/api/players/${steamId}/wl`);
    const wl = await wlRes.json();

    // 3. Последни мечиви
    const recentRes = await fetch(`https://api.opendota.com/api/players/${steamId}/recentMatches`);
    const recentMatches = await recentRes.json();

    // Ако OpenDota не го најде играчот
    if (player?.error || player?.profile === undefined) {
      return res.status(404).json({ success: false, error: "Player not found" });
    }

    res.json({
      success: true,
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
        winrate: wl.win && wl.lose ? (wl.win / (wl.win + wl.lose) * 100).toFixed(1) : 0
      },
      recentMatches: recentMatches || []
    });

  } catch (err) {
    console.error("steam-user error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};
