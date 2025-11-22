// api/steam-callback.js – FIXED VERSION FOR VERCEL + STEAM
// 100% компатибилно со твојот проект (firebaseAdmin, Steam, OpenDota)

const admin = require("./firebaseAdmin");
const openid = require("openid");
const fetch = require("node-fetch").default;

// 👇 SITE_URL и CALLBACK_URL земени од ENV, без тврд кодирање
const SITE_URL =
  process.env.SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const STEAM_CALLBACK_URL =
  process.env.STEAM_CALLBACK_URL || `${SITE_URL}/api/steam-callback`;

// Steam OpenID Relying Party
const relyingParty = new openid.RelyingParty(
  STEAM_CALLBACK_URL, // return_to
  SITE_URL,           // realm
  true,               // stateless
  true,               // strict mode
  []
);

module.exports = (req, res) => {
  try {
    // ⭐ ВАЖНО: овде на verifyAssertion му го даваме целиот `req`, а не само req.url
    relyingParty.verifyAssertion(req, async (err, result) => {
      if (err || !result || !result.authenticated) {
        console.error("Steam OpenID грешка:", err?.message || "Невалидна OpenID сесија", {
          url: req.url,
          host: req.headers.host,
        });

        return res
          .status(401)
          .send("Неуспешно Steam најавување. Обиди се повторно.");
      }

      // Проверка дали имаме валиден claimedIdentifier
      if (!result.claimedIdentifier) {
        console.error("Нема claimedIdentifier во Steam резултатот:", result);
        return res
          .status(401)
          .send("Неуспешно Steam најавување. Обиди се повторно.");
      }

      // Извлечи SteamID (64-bit)
      const parts = result.claimedIdentifier.split("/");
      const steamId64 = parts[parts.length - 1];

      if (!steamId64 || !/^\d+$/.test(steamId64)) {
        console.error("Невалиден SteamID од claimedIdentifier:", result.claimedIdentifier);
        return res
          .status(401)
          .send("Неуспешно Steam најавување. Обиди се повторно.");
      }

      const uid = `steam:${steamId64}`;

      // Пресметај OpenDota ID (32-bit)
      const opendotaId = String(
        BigInt(steamId64) - BigInt("76561197960265728")
      );

      // Default вредности – ако Steam API не одговори
      let steamName = `SteamUser_${steamId64.slice(-6)}`;
      let avatar = "";

      // 🚀 Steam Web API (опционално – ако имаш STEAM_API_KEY во ENV)
      if (process.env.STEAM_API_KEY) {
        try {
          const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${process.env.STEAM_API_KEY}&steamids=${steamId64}`;
          const resp = await fetch(url, { timeout: 8000 });
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
        // ✅ Креирај Firebase custom token за овој Steam корисник
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
          await userRef.set({
            ...userData,
            role: "member",
            banned: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          await userRef.set(userData, { merge: true });
        }

        // УСПЕШНА НАЈАВА → redirect назад кон main.html со токен
        const redirectUrl = `${SITE_URL}/main.html?steamToken=${firebaseToken}`;
        console.log("Steam login успешен → redirect:", redirectUrl);

        return res.redirect(302, redirectUrl);
      } catch (firebaseErr) {
        console.error("Firebase грешка при креирање на custom token:", firebaseErr);
        return res
          .status(500)
          .send("Грешка при креирање на сесија. Обиди се повторно.");
      }
    });
  } catch (fatalErr) {
    console.error("Fatal Steam callback грешка:", fatalErr);
    return res.status(500).send("Серверска грешка.");
  }
};

