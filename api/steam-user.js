// api/steam-user.js
const fetch = require("node-fetch");

module.exports = async (req, res) => {
  try {
    const { steamId } = req.query;

    if (!steamId) {
      return res.status(400).json({ error: "Missing steamId" });
    }

    // ============== 1) Основни Steam податоци (OpenDota) ==============
    const playerRes = await fetch(`https://api.opendota.com/api/players/${steamId}`);
    const playerData = await playerRes.json();

    // Ако нема профил
    if (!playerData || !playerData.profile) {
      return res.status(404).json({ error: "Player not found on OpenDota" });
    }

    const profile = playerData.profile;

    // ============== 2) Rank / MMR ==============
    const rankTier = playerData.rank_tier || null;
    const leaderboardRank = playerData.leaderboard_rank || null;
    const soloMMR = playerData.solo_competitive_rank || null;
    const partyMMR = playerData.competitive_rank || null;

    // ============== 3) Win/Loss статистика ==============
    const wlRes = await fetch(`https://api.opendota.com/api/players/${steamId}/wl`);
    const wlData = await wlRes.json();

    // ============== 4) Напредни OpenDota податоци ==============
    const recentMatchesRes = await fetch(`https://api.opendota.com/api/players/${steamId}/recentMatches`);
    const recentMatches = await recentMatchesRes.json();

    // ============== 5) Состави финален објект ==============
    const fullData = {
      success: true,
      steamId: steamId,

      basic: {
        name: profile.personaname || "Unknown",
        avatar: profile.avatarfull || "",
        avatarMedium: profile.avatarmedium || "",
        avatarSmall: profile.avatar || "",
        profileUrl: profile.profileurl || "",
        steamId64: profile.steamid,
        country: profile.loccountrycode || null,
      },

      ranks: {
        rankTier,
        leaderboardRank,
        soloMMR,
        partyMMR
      },

      stats: {
        wins: wlData?.win || 0,
        losses: wlData?.lose || 0,
        winrate:
          wlData?.win && wlData?.lose
            ? (wlData.win / (wlData.win + wlData.lose)) * 100
            : 0
      },

      recentMatches: recentMatches || []
    };

    return res.status(200).json(fullData);

  } catch (err) {
    console.error("🔥 steam-user API error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
