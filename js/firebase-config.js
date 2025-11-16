// js/firebase-config.js

// Firebase Core Config
const firebaseConfig = {
  apiKey: "AIzaSyANIOv5fW6WTf24kUAL6T0B1BWqgDBOU24",
  authDomain: "dota2dblogin.firebaseapp.com",
  projectId: "dota2dblogin",
  storageBucket: "dota2dblogin.firebasestorage.app",
  messagingSenderId: "524338285980",
  appId: "1:524338285980:web:d6f1a90ace9290c2c14c59",
};

// Initialize only once
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Core services
const auth = firebase.auth();
const db   = firebase.firestore();

// Firestore settings (stabilizes timestamps)
db.settings({
  ignoreUndefinedProperties: true
});

// Small helper for debugging
console.log("🔥 Firebase Loaded (Zvekisha Hub)");
