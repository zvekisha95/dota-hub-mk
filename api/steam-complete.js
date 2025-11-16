// api/steam-complete.js
const admin = require("./firebaseAdmin");

module.exports = async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) {
      return res.status(400).json({ success: false, error: "Missing token" });
    }

    // Verify Firebase custom token
    const decoded = await admin.auth().verifyIdToken(token);

    const steamId64 = decoded.steamId64;
    const uid = `steam:${steamId64}`;

    // Load user data from Firestore
    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: "User does not exist after callback" 
      });
    }

    const userData = userDoc.data();

    // Return data to frontend
    res.json({
      success: true,
      firebaseToken: token,
      username: userData.username,
      steamId: userData.steamId,
      avatar: userData.avatarUrl || "",
      role: userData.role || "member"
    });

  } catch (err) {
    console.error("🔥 steam-complete ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};
