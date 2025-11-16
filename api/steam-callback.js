// api/steam-callback.js
const openid = require("openid");
const admin = require("./firebaseAdmin");

// Steam OpenID config
const relyingParty = new openid.RelyingParty(
  process.env.STEAM_CALLBACK_URL,
  null,
  true,
  false,
  []
);

module.exports = (req, res) => {
  relyingParty.verifyAssertion(req, async (err, result) => {
    if (err || !result || !result.authenticated) {
      console.error("🚨 Steam verify error:", err);
      return res.status(500).send("Steam verify error.");
    }

    try {
      // Extract SteamID64
      const claimedId = result.claimedIdentifier;
      const steamId64 = claimedId.replace(
        "https://steamcommunity.com/openid/id/",
        ""
      );

      const uid = `steam:${steamId64}`;

      // 👉 Create Firebase Custom Token
      const firebaseToken = await admin.auth().createCustomToken(uid, {
        steamId64
      });

      // Firestore
      const db = admin.firestore();
      const userRef = db.collection("users").doc(uid);
      const snap = await userRef.get();

      if (!snap.exists) {
        await userRef.set({
          username: `SteamUser-${steamId64.slice(-6)}`,
          steamId: steamId64,
          avatarUrl: "",
          role: "member",
          banned: false,
          online: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          lastSeen: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        await userRef.set(
          {
            online: true,
            lastSeen: admin.firestore.FieldValue.serverTimestamp()
          },
          { merge: true }
        );
      }

      // 🔥 FIX: Use FULL redirect URL
      const redirectUrl =
        process.env.SITE_URL +
        "/main.html?steamToken=" +
        encodeURIComponent(firebaseToken);

      console.log("✔ Redirecting user to:", redirectUrl);

      return res.redirect(302, redirectUrl);

    } catch (e) {
      console.error("🔥 Steam callback internal error:", e);
      return res.status(500).send("Internal error.");
    }
  });
};
