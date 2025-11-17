// api/steam-callback.js
const admin = require("./firebaseAdmin");
const openid = require('openid');
const fetch = require("node-fetch");

module.exports = async (req, res) => {
  // ОВА Е КЛУЧНО – relyingParty мора да се креира ВНАТРЕ во handler-от!
  const STEAM_RETURN_URL = process.env.STEAM_RETURN_URL || "https://dota-hub-mk.vercel.app/api/steam-callback";
  const SITE_URL = process.env.SITE_URL || "https://dota-hub-mk.vercel.app";

  const relyingParty = new openid.RelyingParty(
    STEAM_RETURN_URL,
    SITE_URL,
    true,  // stateless
    true,  // strict
    []
  );

  relyingParty.verifyAssertion(req.url, async (err, result) => {
    if (err || !result?.authenticated) {
      console.error("Steam OpenID грешка:", err || result);
      return res.status(401).send("Неуспешно Steam најавување");
    }

    const steamId64 = result.claimedIdentifier.split('/').pop();
    const uid = `steam:${steamId64}`;

    let steamName = `SteamUser-${steamId64.slice(-6)}`;
    let avatar = "";

    try {
      const apiKey = process.env.STEAM_API_KEY;
      if (apiKey) {
        const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamId64}`;
        const resp = await fetch(url);
        const json = await resp.json();
        if (json?.response?.players?.[0]) {
          const p = json.response.players[0];
          steamName = p.personaname || steamName;
          avatar = p.avatarfull || "";
        }
      }
    } catch (e) {
      console.error("Steam API грешка:", e);
    }

    try {
      const firebaseToken = await admin.auth().createCustomToken(uid);

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

      const redirectUrl = `${SITE_URL}/main.html?steamToken=${firebaseToken}`;
      res.redirect(302, redirectUrl);

    } catch (firebaseErr) {
      console.error("Firebase грешка:", firebaseErr);
      res.status(500).send("Грешка при креирање на сесија");
    }
  });
};
