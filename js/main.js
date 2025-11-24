// =======================================================
// main.js – PREMIUM FINAL 2025
// Полно фиксиран, стабилен, компатибилен со сите твој системи
// =======================================================

// Чекај DOM + Firebase да се вчита
document.addEventListener("DOMContentLoaded", async () => {

  console.log("main.js стартува...");

  // Чекај firebase-config да се вчита
  await new Promise(res => setTimeout(res, 200));

  if (!firebase || !firebase.auth) {
    console.error("❌ Firebase не е иницијализиран!");
    alert("Грешка: Firebase не е иницијализиран.");
    return;
  }

  const auth = firebase.auth();
  const db = firebase.firestore();

  // =======================================================
  // AUTO INIT FORUM – креирање stats + прва тема
  // =======================================================
  async function initForum() {
    try {
      const statsRef = db.collection("stats").doc("community");
      const statsSnap = await statsRef.get();

      // Креирање статистики ако не постојат
      if (!statsSnap.exists) {
        await statsRef.set({
          members: 1,
          threads: 1,
          comments: 0
        });
        console.log("✔ initForum: community stats created");
      }

      // Проверка дали threads има барем една тема
      const threadSnap = await db.collection("threads").limit(1).get();

      if (threadSnap.empty) {
        await db.collection("threads").add({
          title: "Добредојдовте на форумот!",
          body: "Форумот е успешно поставен. Креирај нова тема од менито! 😊",
          author: "System",
          authorId: "system",
          avatarUrl: "",
          sticky: true,
          locked: false,
          flagged: false,
          commentCount: 0,
          views: 0,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastActivity: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log("✔ initForum: default sticky thread created");
      }

    } catch (err) {
      console.error("❌ initForum error:", err);
    }
  }

  // =======================================================
  // STEAM TOKEN LOGIN
  // =======================================================
  const urlParams = new URLSearchParams(window.location.search);
  const steamToken = urlParams.get("steamToken");

  if (steamToken) {
    console.log("Пронајден Steam token → пробувам Firebase login...");

    try {
      await auth.signInWithCustomToken(steamToken);
      console.log("✔ Steam Firebase login успеа!");

      // Исчисти го token од URL
      window.history.replaceState({}, document.title, "main.html");

    } catch (err) {
      console.error("❌ Грешка при Steam Firebase login:", err);
      alert("Грешка при поврзување со Steam. Обиди се повторно.");
      location.href = "index.html";
      return;
    }
  }

  // =======================================================
  // ФИНАЛЕН AUTH LISTENER
  // =======================================================
  auth.onAuthStateChanged(async user => {

    if (!user) {
      console.warn("⚠ Нема корисник, враќам назад на index...");
      location.href = "index.html";
      return;
    }

    if (!user.uid.startsWith("steam:")) {
      alert("Само Steam login е дозволен.");
      auth.signOut();
      return;
    }

    console.log("✔ Корисник е најавен:", user.uid);

    // AUTO INIT (само еднаш)
    await initForum();

    const userRef = db.collection("users").doc(user.uid);
    const snap = await userRef.get();
    const userData = snap.exists ? snap.data() : {};

    // BAN CHECK
    if (userData.banned === true) {
      alert("⛔ БАНИРАН СИ ОД САЈТОТ!");
      auth.signOut();
      return;
    }

    // UI – username
    document.querySelectorAll("#userName").forEach(el => {
      el.textContent = userData.username || "Играч";
    });

    // UI – avatar
    if (userData.avatarUrl) {
      document.querySelectorAll("#userAvatar, .avatar-big").forEach(el => {
        el.style.backgroundImage = `url(${userData.avatarUrl})`;
        el.textContent = "";
      });
    }

    // ADMIN / MOD LINKS
    const role = (userData.role || "member").toLowerCase();
    const topLinks = document.querySelector(".top-links");

    if (topLinks && (role === "admin" || role === "moderator")) {
      if (!topLinks.querySelector(".admin-btn")) {

        if (role === "admin") {
          topLinks.insertAdjacentHTML(
            "beforeend",
            `<a href="admin.html" class="admin-btn">Админ Панел</a>`
          );
        }

        topLinks.insertAdjacentHTML(
          "beforeend",
          `<a href="dashboard.html" class="mod-btn">Мод Панел</a>`
        );
      }
    }

    // ONLINE STATUS
    userRef.set({
      online: true,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // KEEP-ALIVE пинг (на секои 30 сек)
    setInterval(() => {
      userRef.update({
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
      });
    }, 30000);

    // Load UI data
    loadStats(db);
    loadLiveMatches(db);

  });

});


// =======================================================
// Лајв статистики (online, members, threads, comments)
// =======================================================
function loadStats(db) {

  db.collection("users")
    .where("online", "==", true)
    .onSnapshot(snap => {
      const el = document.getElementById("onlineCount");
      if (el) el.textContent = snap.size;
    });

  const statsRef = db.collection("stats").doc("community");

  statsRef.onSnapshot(snap => {
    if (!snap.exists) return;
    const d = snap.data();

    document.getElementById("memberCount").textContent = d.members || 0;
    document.getElementById("threadCount").textContent = d.threads || 0;
    document.getElementById("commentCount").textContent = d.comments || 0;
  });
}


// =======================================================
// Лајв Dota мечеви (играчи кои имаат inGame = true)
// =======================================================
async function loadLiveMatches(db) {
  const container = document.getElementById("liveMatches");
  if (!container) return;

  container.innerHTML = "Проверувам активни мечеви...";

  try {
    const snap = await db.collection("users")
      .where("inGame", "==", true)
      .get();

    if (snap.empty) {
      container.innerHTML = "Никој не игра моментално.";
      return;
    }

    let html = `
      <div style='font-weight:600;color:#22c55e;margin-bottom:10px;'>
        Активни мечеви:
      </div>
    `;

    snap.forEach(doc => {
      const u = doc.data();
      html += `
        <div style="
          margin:6px 0;
          padding:10px;
          background:rgba(34,197,94,0.15);
          border-radius:10px;
          font-weight:500;">
          <strong>${u.username}</strong> е во Dota 2 меч!
        </div>
      `;
    });

    container.innerHTML = html;

  } catch (err) {
    console.error("loadLiveMatches error:", err);
    container.innerHTML = "Грешка при проверка.";
  }
}
