// js/firebase-config.js – 100% WORKS (NO WARNINGS, NO DOUBLE INIT)

// ===============================
// FIREBASE CONFIG
// ===============================
const firebaseConfig = {
  apiKey: "AIzaSyANIOv5fW6WTf24kUAL6T0B1BWqgDBOU24",
  authDomain: "dota2dblogin.firebaseapp.com",
  projectId: "dota2dblogin",
  storageBucket: "dota2dblogin.firebasestorage.app",
  messagingSenderId: "524338285980",
  appId: "1:524338285980:web:d6f1a90ace9290c2c14c59"
};

// ===============================
// SAFE INITIALIZATION (NO DOUBLE INIT)
// ===============================
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);

  // Firestore settings MUST be inside this block
  firebase.firestore().settings({
    ignoreUndefinedProperties: true,
    merge: true // <— avoids host override warning
  });

} else {
  firebase.app();
}

// ===============================
// EXPORTS
// ===============================
const auth = firebase.auth();
const db = firebase.firestore();

console.log("Firebase вчитан – Zvekisha Dota Hub");

