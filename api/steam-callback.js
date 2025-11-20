// api/steam-callback.js – FIXED 21.11.2025
const admin = require("./firebaseAdmin");
const openid = require("openid");
const fetch = require("node-fetch").default;

// ТОЧНИ ДОМЕНИ — НЕ МЕНУВАЈ
const SITE_URL = process.env.SITE_URL || "https://www.zvekisha.mk";
const STEAM_CALLBACK_URL = process.env.STEAM_CALLBACK_URL || "https://www.zvekisha.mk/api/steam-callback";

// Steam OpenID Relying Party
const relyingParty = new openid.RelyingParty(
  STEAM_CALLBACK_URL,   // return_to
  SITE_URL,             // realm
  true,
  true,
  []
);

module.exports = async (req, res) => {

  try {
    relyingParty.verifyAssertion(req.url, async (err, result) => {

      if (err || !result?.authenticated) {
        console.error("Steam OpenID грешка:", err?.message || "Невалидна OpenID сесија");
        return res.status(401).send("Неуспешно Steam најавување. Обиди се повторно.");
      }

      // SteamID
      const steamId64 = result.claimedIdentifier.split("/").pop();
      const uid = `steam:${steamId64}`;

      // OpenDota ID
      const opendotaId = String(BigInt(steamId64) - BigInt("76561197960265728"));

      // Default вредности
      let steamName = `SteamUser_${steamId64.slice(-6)}`;
      let avatar = "";

      // Steam API (опционално)
      if (process.env.STEAM_API_KEY) {
        try {
          const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${process.env.STEAM_API_KEY}&steamids=${steamId64}`;
          const resp = await fetch(url, { timeout: 7000 });
          const json = await resp.json();

          if (json?.response?.players?.[0]) {
            const p = json.response.players[0];
            steamName = p.personaname || steamName;
            avatar = p.avatarfull || "";
          }
        } catch (apiErr) {
          console.warn("Steam API предупредување:", apiErr.message);
        }
      }

      try {
        // Firebase token
        const firebaseToken = await admin.auth().createCustomToken(uid);

        const db = admin.firestore();
        const userRef = db.collection("users").doc(uid);

        const userData = {
          username: steamName,
          steamId: steamId64,
          opendotaId: opendotaId,
          avatarUrl: avatar,
          online: true,
          lastSeen: admin.firestore.FieldValue.serverTimestamp()
        };

        const snap = await userRef.get();
        if (!snap.exists) {
          await userRef.set({
            ...userData,
            role: "member",
            banned: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
        } else {
          await userRef.set(userData, { merge: true });
        }

        // УСПЕШНА НАЈАВА → redirect назад кон main.html
        const redirectUrl = `${SITE_URL}/main.html?steamToken=${firebaseToken}`;
        return res.redirect(302, redirectUrl);

      } catch (firebaseErr) {
        console.error("Firebase грешка:", firebaseErr);
        return res.status(500).send("Грешка при креирање на сесија. Обиди се повторно.");
      }

    });
  } catch (fatalErr) {
    console.error("Fatal Steam callback грешка:", fatalErr);
    return res.status(500).send("Серверска грешка.");
  }

};

