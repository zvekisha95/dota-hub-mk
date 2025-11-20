// api/steam-login.js – ФИНАЛНА ВЕРЗИЈА 20.11.2025
const openid = require("openid");

module.exports = (req, res) => {
  // Проверка за callback URL
  const STEAM_CALLBACK_URL = process.env.STEAM_CALLBACK_URL;

  if (!STEAM_CALLBACK_URL) {
    console.error("STEAM_CALLBACK_URL не е поставен во Vercel Environment Variables!");
    return res.status(500).send("Серверска грешка – контакт со админ.");
  }

  // OpenID Relying Party
  const relyingParty = new openid.RelyingParty(
    STEAM_CALLBACK_URL,     // каде Steam враќа
    null,                   // realm (не е потребен на Vercel HTTPS)
    true,                   // stateless
    false,                  // strict mode (препорачано)
    []                      // extensions
  );

  // Започни Steam OpenID login
  relyingParty.authenticate("https://steamcommunity.com/openid", false, (error, authUrl) => {
    if (error || !authUrl) {
      console.error("Steam OpenID грешка:", error?.message || "Нема URL");
      return res.status(500).send("Не можев да се поврзам со Steam. Обиди се повторно.");
    }

    console.log("Успешно генериран Steam login URL →", authUrl);
    res.redirect(302, authUrl);
  });
};
