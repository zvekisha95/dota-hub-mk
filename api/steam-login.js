// api/steam-login.js
const openid = require("openid");

module.exports = (req, res) => {
  const callback = process.env.STEAM_CALLBACK_URL;

  // 🛑 Без callback URL нема login — прави стабилна проверка
  if (!callback) {
    console.error("🚨 ERROR: Missing STEAM_CALLBACK_URL in Vercel environment!");
    return res.status(500).send("Server configuration error.");
  }

  // 🟢 OpenID конфигурација за Steam
  const relyingParty = new openid.RelyingParty(
    callback,  // каде Steam треба да те врати
    null,      // без realm — Vercel HTTPS е доволен
    true,      // stateless
    false,     // insecure = false (Vercel е HTTPS)
    []         // опции
  );

  // 🟢 Започни Steam login redirect
  relyingParty.authenticate(
    "https://steamcommunity.com/openid",
    false,
    (err, url) => {
      if (err || !url) {
        console.error("🚨 Steam login error:", err);
        return res.status(500).send("Steam login error.");
      }

      // 🟢 Debug log (ќе го гледаш во Vercel → Logs)
      console.log("🔗 Redirecting to Steam OpenID:", url);

      // 🟢 Префрли го корисникот на Steam за login
      res.redirect(302, url);
    }
  );
};
