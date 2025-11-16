module.exports = (req, res) => {
  res.json({
    SITE_URL: process.env.SITE_URL || "undefined",
    STEAM_CALLBACK_URL: process.env.STEAM_CALLBACK_URL || "undefined"
  });
};
