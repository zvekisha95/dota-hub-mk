// api/steam-callback.js
const admin = require("./firebaseAdmin");
const fetch = require("node-fetch"); // ➕ додадено за fetch

// Extract SteamID64 from Steam OpenID URL
function extractSteamId64(claimed) {
  if (!claimed) return null;
  return claimed.replace("https://steamcommunity.com/openid/id/", "");
}

module.exports = async (req, res) => {
  try {
    const params = req.query;

    // Steam return parameter
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

    // 🔥 NEW — земи го вистинското Steam име + аватар
    let personaName = `SteamUser-${steamId64.slice(-6)}`;
    let avatarFull = "";

    try {
      const steamKey = process.env.STEAM_API_KEY; // треба да додадеш во Vercel
      const apiUrl =
        `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${steamKey}&steamids=${steamId64}`;

      const resp = await fetch(apiUrl);
      const json = await resp.json();
      const p = json?.response?.players?.[0];

      if (p) {
        personaName = p.personaname || personaName;
        avatarFull = p.avatarfull || "";
      }
    } catch (err) {
      console.error("⚠️ Could not load Steam name/avatar:", err);
    }

    // Create Firebase custom token
    const firebaseToken = await admin.auth().createCustomToken(uid, {
      steamId64
    });

    // Firestore
    const db = admin.firestore();
    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.get();

    if (!snap.exists) {
      await userRef.set({
        username: personaName,   // 🔥 користи вистинско Steam име
        steamId: steamId64,
        avatarUrl: avatarFull,   // 🔥 користи вистински аватар
        role: "member",
        banned: false,
        online: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSeen: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      await userRef.set(
        {
          username: personaName,     // 🔥 auto-update име
          avatarUrl: avatarFull,     // 🔥 auto-update аватар
          online: true,
          lastSeen: admin.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    }

    const redirectUrl =
      `${process.env.SITE_URL}/main.html?steamToken=${encodeURIComponent(firebaseToken)}`;

    console.log("✔ Redirecting to:", redirectUrl);
    return res.redirect(302, redirectUrl);

  } catch (e) {
    console.error("🔥 ERROR in steam-callback:", e);
    return res.status(500).send("Internal error.");
  }
};
