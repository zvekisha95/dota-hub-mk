// api/steam-user.js – ФИНАЛНА ВЕРЗИЈА 20.11.2025
// Враќа Dota 2 податоци од OpenDota по steamId (32-битен)

const fetch = require("node-fetch").default;

module.exports = async (req, res) => {
  try {
    const { steamId } = req.query;

    if (!steamId || steamId.length < 5) {
      return res.status(400).json({ success: false, error: "Недостасува или невалиден steamId" });
    }

    // 1. Основни податоци + MMR + ранг
    const playerUrl = `https://api.opendota.com/api/players/${steamId}`;
    const playerRes = await fetch(playerUrl);

    if (!playerRes.ok) {
      return res.status(404).json({ success: false, error: "Играчот не е пронајден на OpenDota" });
    }

    const playerData = await playerRes.json();

    // 2. Win/Loss статистика
    const wlRes = await fetch(`https://api.opendota.com/api/players/${steamId}/wl`);
    const wlData = wlRes.ok ? await wlRes.json() : { win: 0, lose: 0 };

    // 3. Последни 20 мечиви
    const recentRes = await fetch(`https://api.opendota.com/api/players/${steamId}/recentMatches`);
    const recentMatches = recentRes.ok ? await recentRes.json() : [];

    // Профил податоци
    const profile = playerData.profile || {};
    const rankTier = playerData.rank_tier || null;
    const soloMMR = playerData.solo_competitive_rank || null;
    const partyMMR = playerData.competitive_rank || null;

    const totalGames = (wlData.win || 0) + (wlData.lose || 0);
    const winrate = totalGames > 0 ? ((wlData.win / totalGames) * 100).toFixed(2) : 0;

    const response = {
      success: true,
      steamId: steamId,
      basic: {
        name: profile.personaname || "Непознат играч",
        avatar: profile.avatarfull || "",
        profileUrl: profile.profileurl || `https://steamcommunity.com/profiles/${BigInt(steamId) + BigInt("76561197960265728")}`,
      },
      ranks: {
        rankTier,
        soloMMR,
        partyMMR,
        leaderboard: playerData.leaderboard_rank || null
      },
      stats: {
        wins: wlData.win || 0,
        losses: wlData.lose || 0,
        total: totalGames,
        winrate: parseFloat(winrate)
      },
      recentMatches: recentMatches.slice(0, 20) // земи само последни 20
    };

    // Кеширање за 5 минути (препорачано за OpenDota)
    res.setHeader("Cache-Control", "public, max-age=300");
    res.status(200).json(response);

  } catch (err) {
    console.error("steam-user API грешка:", err.message);
    res.status(500).json({ success: false, error: "Серверска грешка" });
  }
};
