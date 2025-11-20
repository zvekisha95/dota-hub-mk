// api/steam-callback.js – ФИНАЛНА ВЕРЗИЈА 20.11.2025
const admin = require("./firebaseAdmin");
const openid = require("openid");
const fetch = require("node-fetch").default;

module.exports = async (req, res) => {
  const STEAM_RETURN_URL = process.env.STEAM_RETURN_URL || "https://dota-hub-mk.vercel.app/api/steam-callback";
  const SITE_URL = process.env.SITE_URL || "https://dota-hub-mk.vercel.app";

  const relyingParty = new openid.RelyingParty(
    STEAM_RETURN_URL,
    SITE_URL,
    true,  // useCookies
    true,  // strict
    []
  );

  try {
    relyingParty.verifyAssertion(req.url, async (err, result) => {
      if (err || !result?.authenticated) {
        console.error("Steam OpenID грешка:", err?.message || "Неуспешно");
        return res.status(401).send("Неуспешно Steam најавување. Обиди се повторно.");
      }

      const steamId64 = result.claimedIdentifier.split("/").pop();
      const uid = `steam:${steamId64}`;

      // OpenDota 32-битен ID (за API повици)
      const opendotaId = String(BigInt(steamId64) - BigInt("76561197960265728"));

      let steamName = `SteamUser_${steamId64.slice(-6)}`;
      let avatar = "";

      // Земи име и аватар од Steam API (ако имаш клуч)
      if (process.env.STEAM_API_KEY) {
        try {
          const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${process.env.STEAM_API_KEY}&steamids=${steamId64}`;
          const resp = await fetch(url, { timeout: 8000 });
          const json = await resp.json();

          if (json?.response?.players?.[0]) {
            const p = json.response.players[0];
            steamName = p.personaname?.trim() || steamName;
            avatar = p.avatarfull || "";
          }
        } catch (apiErr) {
          console.warn("Steam API не работи (но не е критична грешка):", apiErr.message);
          // Продолжува и без Steam API – нема да падне сè!
        }
      }

      try {
        // Креирај Firebase Custom Token
        const firebaseToken = await admin.auth().createCustomToken(uid);

        const db = admin.firestore();
        const userRef = db.collection("users").doc(uid);

        const userData = {
          username: steamName,
          steamId: steamId64,
          opendotaId: opendotaId,
          avatarUrl: avatar,
          online: true,
          lastSeen: admin.firestore.FieldValue.serverTimestamp(),
        };

        const snap = await userRef.get();
        if (!snap.exists) {
          // Нов корисник
          await userRef.set({
            ...userData,
            role: "member",
            banned: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log(`Нов корисник: ${steamName} (${uid})`);
        } else {
          // Постоечки – само ажурирај
          await userRef.set(userData, { merge: true });
          console.log(`Најавен: ${steamName} (${uid})`);
        }

        // Пренасочи со токен
        const redirectUrl = `${SITE_URL}/main.html?steamToken=${firebaseToken}`;
        res.redirect(302, redirectUrl);

      } catch (firebaseErr) {
        console.error("Firebase грешка при најава:", firebaseErr);
        res.status(500).send("Грешка при креирање на сесија. Обиди се повторно.");
      }
    });
  } catch (globalErr) {
    console.error("Критична грешка во steam-callback:", globalErr);
    res.status(500).send("Серверска грешка. Админот е известен.");
  }
};
