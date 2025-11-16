// api/steam-callback.js
const admin = require("./firebaseAdmin");
const fetch = require("node-fetch");

// Extract SteamID64
function extractSteamId64(claimed) {
  if (!claimed) return null;
  return claimed.replace("https://steamcommunity.com/openid/id/", "");
}

module.exports = async (req, res) => {
  try {
    const params = req.query;
    const claimedId = params["openid.claimed_id"];

    if (!claimedId) {
      console.error("❌ No claimed_id from Steam!", params);
      return res.status(400).send("Missing claimed_id from Steam.");
    }

    const steamId64 = extractSteamId64(claimedId);
    if (!steamId64) {
      console.error("❌ Failed extracting SteamID64!", claimedId);
      return res.status(400).send("Invalid SteamID.");
    }

    const uid = `steam:${steamId64}`;

    // 🔥 NEW — Fetch Steam Profile Data
    const apiKey = process.env.STEAM_API_KEY;
    let steamName = `SteamUser-${steamId64.slice(-6)}`;
    let avatar = "";

    try {
      const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamId64}`;
      const response = await fetch(url);
      const json = await response.json();

      if (json?.response?.players?.length > 0) {
        const p = json.response.players[0];
        steamName = p.personaname || steamName;
        avatar = p.avatarfull || "";
      }

    } catch (e) {
      console.error("⚠ Steam API error:", e);
    }

    // Firebase Custom Token
    const firebaseToken = await admin.auth().createCustomToken(uid, { steamId64 });

    // Firestore User
    const db = admin.firestore();
    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.get();

    if (!snap.exists) {
      await userRef.set({
        username: steamName,
        steamId: steamId64,
        avatarUrl: avatar,
        role: "member",
        banned: false,
        online: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSeen: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      await userRef.set({
        username: steamName,
        avatarUrl: avatar,
        online: true,
        lastSeen: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    const redirectUrl = `${process.env.SITE_URL}/main.html?steamToken=${encodeURIComponent(firebaseToken)}`;
    console.log("✔ Redirecting to:", redirectUrl);
    return res.redirect(302, redirectUrl);

  } catch (e) {
    console.error("🔥 ERROR in steam-callback:", e);
    return res.status(500).send("Internal error.");
  }
};
