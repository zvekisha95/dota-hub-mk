// api/steam-callback.js
const openid = require("openid");
const admin = require("./firebaseAdmin");

// FIX 1: Explicitly set RETURN URL (како што Steam го прати)
const RETURN_URL = process.env.STEAM_CALLBACK_URL;

// FIX 2: Always allow GET params (како што Steam ги праќа)
const relyingParty = new openid.RelyingParty(
  RETURN_URL,   // return URL
  null,         // realm
  true,         // stateless
  false,        // strict mode OFF (fix for Vercel)
  []            // extensions
);

module.exports = (req, res) => {
  // FIX 3: Convert req.query into normal URL params
  const params = { ...req.query };

  // verifyAssertion бара request object со URL query
  relyingParty.verifyAssertion({ query: params }, async (err, result) => {
    if (err || !result || !result.authenticated) {
      console.error("🚨 Steam verify error:", err, params);
      return res.status(500).send("Steam verify error.");
    }

    try {
      const claimedId = result.claimedIdentifier;
      const steamId64 = claimedId.replace(
        "https://steamcommunity.com/openid/id/",
        ""
      );

      const uid = `steam:${steamId64}`;

      const firebaseToken = await admin.auth().createCustomToken(uid, {
        steamId64
      });

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

      const redirectUrl =
        `${process.env.SITE_URL}/main.html?steamToken=${encodeURIComponent(firebaseToken)}`;

      console.log("✔ Redirecting to:", redirectUrl);
      return res.redirect(302, redirectUrl);

    } catch (e) {
      console.error("🔥 Internal error:", e);
      return res.status(500).send("Internal error.");
    }
  });
};
