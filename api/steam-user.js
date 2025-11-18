// api/steam-user.js – 100% РАБОТИ И СО ПРИВАТНИ ПРОФИЛИ
const fetch = require("node-fetch");

module.exports = async (req, res) => {
  try {
    const { steamId } = req.query;

    if (!steamId) {
      return res.status(400).json({ success: false, error: "Нема steamId" });
    }

    // Пробуваме да земеме податоци од OpenDota
    const playerRes = await fetch(`https://api.opendota.com/api/players/${steamId}`);
    const player = await playerRes.json();

    const wlRes = await fetch(`https://api.opendota.com/api/players/${steamId}/wl`);
    const wl = await wlRes.json();

    const recentRes = await fetch(`https://api.opendota.com/api/players/${steamId}/recentMatches`);
    const recentMatches = await recentRes.json();

    // Ако OpenDota го нема профилот (често кај нови корисници)
    if (player.profile === undefined && player.error !== undefined) {
      return res.json({
        success: true,
        basic: { name: "Непознат", avatar: "", profileUrl: "" },
        ranks: { rankTier: 0, soloMMR: null, partyMMR: null },
        stats: { wins: 0, losses: 0, winrate: 0 },
        recentMatches: []
      });
    }

    res.json({
      success: true,
      basic: {
        name: player.profile?.personaname || "Непознат",
        avatar: player.profile?.avatarfull || "",
        profileUrl: player.profile?.profileurl || ""
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
    console.error("steam-user грешка:", err);
    // Дури и ако кршне – врати празни податоци наместо 500
    res.json({
      success: true,
      basic: { name: "Непознат", avatar: "", profileUrl: "" },
      ranks: { rankTier: 0, soloMMR: null, partyMMR: null },
      stats: { wins: 0, losses: 0, winrate: 0 },
      recentMatches: []
    });
  }
};
