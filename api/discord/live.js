// api/discord/live.js – за Discord ботот /live команда
import { initializeApp } from "firebase/app";
import { getFirestore, collection, where, getDocs } from "firebase/firestore";

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
  // Само за Discord ботот – враќyва листа на играчи во меч
  try {
    const snapshot = await getDocs(collection(db, "users").where("inGame", "==", true));
    const players = [];

    snapshot.forEach(doc => {
      const d = doc.data();
      players.push({
        username: d.username || "Непознат",
        uid: doc.id.replace("steam:", ""), // чист steamID за профилот
        avatar: d.avatarUrl || ""
      });
    });

    res.status(200).json(players);
  } catch (error) {
    console.error("Discord /live грешка:", error);
    res.status(500).json([]);
  }
}
