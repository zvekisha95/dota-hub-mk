// api/firebaseAdmin.js
// Firebase Admin иницијализација за Cloud Functions / Vercel API

const admin = require("firebase-admin");

// Спречува дуплирање при hot-reload (важно за Vercel)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FB_PROJECT_ID,
        clientEmail: process.env.FB_CLIENT_EMAIL,
        privateKey: process.env.FB_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
      databaseURL: `https://${process.env.FB_PROJECT_ID}.firebaseio.com`, // опционално
    });
    console.log("Firebase Admin успешно иницијализиран");
  } catch (error) {
    console.error("Грешка при иницијализација на Firebase Admin:", error);
  }
}

module.exports = admin;
