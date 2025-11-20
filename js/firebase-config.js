// js/firebase-config.js – 100% РАБОТИ И ЛОКАЛНО И НА VERCEL
const firebaseConfig = {
  apiKey: "AIzaSyANIOv5fW6WTf24kUAL6T0B1BWqgDBOU24",
  authDomain: "dota2dblogin.firebaseapp.com",
  projectId: "dota2dblogin",
  storageBucket: "dota2dblogin.firebasestorage.app",
  messagingSenderId: "524338285980",
  appId: "1:524338285980:web:d6f1a90ace9290c2c14c59"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

db.settings({ ignoreUndefinedProperties: true });

console.log("Firebase вчитан – Zvekisha Dota Hub");

