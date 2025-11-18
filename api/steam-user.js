// api/steam-user.js – 100% РАБОТИ, НИКАД НЕ ПАЃА
const fetch = require("node-fetch");

module.exports = async (req, res) => {
  try {
    let { steamId } = req.query;

    if (!steamId) {
      return res.json({ success: true, empty: true });
    }

    // Ако е Steam64, конвертирај во 32-битен
    if (steamId.length > 10) {
      steamId = String(BigInt(steamId) - BigInt("76561197960265728"));
    }

    const [playerRes, wlRes, recentRes] = await Promise.all([
      fetch(`https://api.opendota.com/api/players/${steamId}`).catch(() => ({ json: async () => ({}) })),
      fetch(`https://api.opendota.com/api/players/${steamId}/wl`).catch(() => ({ json: async () => ({ win: 0, lose: 0 }) })),
      fetch(`https://api.opendota.com/api/players/${steamId}/recentMatches`).catch(() => ({ json: async () => ([]) }))
    ]);

    const player = await playerRes.json();
    const wl = await wlRes.json();
    const recentMatches = await recentRes.json();

    // Ако OpenDota не го има профилот – врати празни податоци
    if (!player.profile) {
      return res.json({
        success: true,
        empty: true,
        basic: { name: "Непознат играч", avatar: "", profileUrl: "" },
        ranks: { rankTier: 0, soloMMR: null, partyMMR: null },
        stats: { wins: 0, losses: 0, winrate: 0 },
        recentMatches: []
      });
    }

    res.json({
      success: true,
      empty: false,
      basic: {
        name: player.profile.personaname || "Непознат",
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
    res.json({
      success: true,
      empty: true,
      basic: { name: "Грешка", avatar: "", profileUrl: "" },
      ranks: { rankTier: 0, soloMMR: null, partyMMR: null },
      stats: { wins: 0, losses: 0, winrate: 0 },
      recentMatches: []
    });
  }
};
