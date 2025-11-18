// api/steam-user.js – ВРАЌАМЕ НА РАБОТЕЧКАТА ВЕРЗИЈА
const fetch = require("node-fetch");

module.exports = async (req, res) => {
  try {
    const { steamId } = req.query;

    if (!steamId) {
      return res.status(400).json({ success: false, error: "Missing steamId" });
    }

    const playerRes = await fetch(`https://api.opendota.com/api/players/${steamId}`);
    const playerData = await playerRes.json();

    if (!playerData || !playerData.profile) {
      return res.status(404).json({ success: false, error: "Player not found on OpenDota" });
    }

    const profile = playerData.profile;

    const rankTier = playerData.rank_tier || null;
    const soloMMR = playerData.solo_competitive_rank || null;
    const partyMMR = playerData.competitive_rank || null;

    const wlRes = await fetch(`https://api.opendota.com/api/players/${steamId}/wl`);
    const wlData = await wlRes.json();

    const recentMatchesRes = await fetch(`https://api.opendota.com/api/players/${steamId}/recentMatches`);
    const recentMatches = await recentMatchesRes.json();

    const fullData = {
      success: true,
      steamId: steamId,

      basic: {
        name: profile.personaname || "Unknown",
        avatar: profile.avatarfull || "",
        profileUrl: profile.profileurl || "",
      },

      ranks: {
        rankTier,
        soloMMR,
        partyMMR
      },

      stats: {
        wins: wlData?.win || 0,
        losses: wlData?.lose || 0,
        winrate: wlData?.win && wlData?.lose ? (wlData.win / (wlData.win + wlData.lose)) * 100 : 0
      },

      recentMatches: recentMatches || []
    };

    return res.status(200).json(.fullData);

  } catch (err) {
    console.error("🔥 steam-user API error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};
