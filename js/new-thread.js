// js/new-thread.js – PREMIUM FIXED FINAL 2025
// Објавување нова тема – целосно усогласено со premium thread.js + anti-spam

let currentUser = null;

// ==========================================================
// AUTH + BAN CHECK
// ==========================================================
auth.onAuthStateChanged(async user => {
  if (!user || !user.uid.startsWith("steam:")) {
    location.href = "index.html";
    return;
  }

  currentUser = user;

  const doc = await db.collection("users").doc(user.uid).get();
  const data = doc.exists ? doc.data() : {};

  if (data.banned === true) {
    alert("⛔ Баниран си од објавување теми!");
    location.href = "forum.html";
    return;
  }
});

// ==========================================================
// CREATE NEW THREAD
// ==========================================================
async function postThread() {
  const titleEl = document.getElementById("threadTitle");
  const bodyEl = document.getElementById("threadBody");
  const statusEl = document.getElementById("postStatus");
  const submitBtn =
    document.querySelector("button[type='submit']") ||
    document.querySelector("button");

  const title = titleEl.value.trim();
  const body = bodyEl.value.trim();

  statusEl.textContent = "";
  statusEl.className = "status";

  // VALIDATION
  if (!title || title.length < 3) {
    statusEl.textContent = "Насловот мора да има барем 3 карактери!";
    statusEl.classList.add("error");
    titleEl.focus();
    return;
  }

  if (title.length > 150) {
    statusEl.textContent = "Насловот е премногу долг (макс 150 карактери)!";
    statusEl.classList.add("error");
    return;
  }

  if (!body || body.length < 10) {
    statusEl.textContent = "Содржината мора да има барем 10 карактери!";
    statusEl.classList.add("error");
    bodyEl.focus();
    return;
  }

  // ==========================================================
  // ANTI-SPAM CHECK (ако anti-spam.js е вклучен)
  // ==========================================================
  if (window.SpamGuard && typeof window.SpamGuard.checkThread === "function") {
    if (!window.SpamGuard.checkThread()) {
      return;
    }
  }

  // DISABLE BUTTON
  submitBtn.disabled = true;
  submitBtn.textContent = "Објавувам...";

  try {
    const userDoc = await db.collection("users").doc(currentUser.uid).get();
    const userData = userDoc.data() || {};

    // ==========================================================
    // FIRESTORE THREAD DOCUMENT – PREMIUM FORMAT
    // ==========================================================
    await db.collection("threads").add({
      title,
      body,
      author: userData.username || "Корисник",
      authorId: currentUser.uid,
      avatarUrl: userData.avatarUrl || "",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),

      // PREMIUM систем полиња:
      locked: false,               // 🔒
      sticky: false,               // 📌
      flagged: false,              // 🚩 за модератори
      views: 0,                    // 👁 view counter
      commentCount: 0,             // 💬 број коментари
      lastActivity: firebase.firestore.FieldValue.serverTimestamp()
    });

    statusEl.textContent = "Твојата тема е објавена! Пренасочувам... ✅";
    statusEl.classList.add("success");

    setTimeout(() => {
      location.href = "forum.html";
    }, 1200);

  } catch (err) {
    console.error("Грешка при објавување тема:", err);
    statusEl.textContent = "Грешка при објавување. Обиди се повторно.";
    statusEl.classList.add("error");
    submitBtn.disabled = false;
    submitBtn.textContent = "Објави тема";
  }
}

// ==========================================================
// SUBMIT HANDLER
// ==========================================================
document.getElementById("newThreadForm")?.addEventListener("submit", e => {
  e.preventDefault();
  postThread();
});
