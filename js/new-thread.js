// js/new-thread.js – PREMIUM FIXED 20.11.2025
// Објавување нова тема – целосно усогласено со премиум thread.js

let currentUser = null;

// AUTH + БАН ПРОВЕРКА
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
// ОБЈАВУВАЊЕ НОВА ТЕМА
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

  if (!body || body.length < 10) {
    statusEl.textContent = "Содржината мора да има барем 10 карактери!";
    statusEl.classList.add("error");
    bodyEl.focus();
    return;
  }

  if (title.length > 120) {
    statusEl.textContent = "Насловот е премногу долг (макс 120 карактери)!";
    statusEl.classList.add("error");
    return;
  }

  // DISABLE BUTTON
  submitBtn.disabled = true;
  submitBtn.textContent = "Објавувам...";

  try {
    const userDoc = await db.collection("users").doc(currentUser.uid).get();
    const userData = userDoc.data();

    // ==========================================================
    // ЗАПИШУВАЊЕ НА ТЕМА (US-KOREKTNO, PREMIUM FORMAT)
    // ==========================================================
    await db.collection("threads").add({
      title,
      body,
      author: userData.username || "Корисник",
      authorId: currentUser.uid,
      avatarUrl: userData.avatarUrl || "",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),

      // PREMIUM систем полиња:
      locked: false,
      sticky: false,
      flagged: false,
      commentCount: 0,
      views: 0,   // ⭐ ОВА Е КЛУЧНО ЗА НОВИОТ thread.js !!!
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

// SUBMIT
document.getElementById("newThreadForm")?.addEventListener("submit", e => {
  e.preventDefault();
  postThread();
});
