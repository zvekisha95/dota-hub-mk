// api/discord/top10.js – за Discord ботот /top10 команда
import { initializeApp } from "firebase/app";
import { getFirestore, collection, where, orderBy, limit, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyANIOv5fW6WTf24kUAL6T0B1BWqgDBOU24",
  authDomain: "dota2dblogin.firebaseapp.com",
  projectId: "dota2dblogin",
  storageBucket: "dota2dblogin.firebasestorage.app",
  messagingSenderId: "524338285980",
  appId: "1:524338285980:web:d6f1a90ace9290c2c14c59"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default async function handler(req, res) {
  try {
    const snapshot = await getDocs(
      collection(db, "users")
        .where("mmr", ">", 0)
        .orderBy("mmr", "desc")
        .limit(10)
    );

    const top10 = [];
    snapshot.forEach((doc, index) => {
      const d = doc.data();
      top10.push({
        rank: index + 1,
        username: d.username || "Непознат",
        mmr: d.mmr || 0,
        rankName: d.rankName || "Uncalibrated"
      });
    });

    res.status(200).json(top10);
  } catch (error) {
    console.error("Discord /top10 грешка:", error);
    res.status(500).json([]);
  }
}
