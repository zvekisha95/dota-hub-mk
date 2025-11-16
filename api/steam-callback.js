// api/steam-callback.js
const openid = require("openid");
const admin = require("./firebaseAdmin");

const relyingParty = new openid.RelyingParty(
  process.env.STEAM_CALLBACK_URL, // callback
  null,                            // realm not needed
  true,                            // stateless
  false,                           // insecure -> false (Vercel HTTPS)
  []
);

module.exports = (req, res) => {
  relyingParty.verifyAssertion(req, async (err, result) => {
    if (err || !result || !result.authenticated) {
      console.error("🚨 Steam verify error:", err);
      return res.status(500).send("Steam verify error.");
    }

    try {
      // Extract SteamID64 from claimed identifier
      const claimedId = result.claimedIdentifier; 
      const steamId64 = claimedId.replace(
        "https://steamcommunity.com/openid/id/",
        ""
      );

      const uid = `steam:${steamId64}`;

      // Create a Firebase custom token for this user
      const token = await admin.auth().createCustomToken(uid, {
        steamId64
      });

      // Firestore database reference
      const db = admin.firestore();
      const userRef = db.collection("users").doc(uid);
      const snap = await userRef.get();

      // If new user → create full profile
      if (!snap.exists) {
        await userRef.set({
          username: `SteamUser-${steamId64.slice(-6)}`,
          email: "",
          steamId: steamId64,
          role: "member",
          banned: false,
          avatarUrl: "",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          lastSeen: admin.firestore.FieldValue.serverTimestamp(),
          online: true
        });
      } else {
        // If user already exists → update online status & last seen
        await userRef.set(
          {
            lastSeen: admin.firestore.FieldValue.serverTimestamp(),
            online: true
          },
          { merge: true }
        );
      }

      // Redirect back to frontend with Firebase token
      const redirectUrl =
        "/main.html?steamToken=" + encodeURIComponent(token);

      res.redirect(302, redirectUrl);

    } catch (e) {
      console.error("🔥 Steam callback internal error:", e);
      res.status(500).send("Internal error.");
    }
  });
};
