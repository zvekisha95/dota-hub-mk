// =======================================================
// 1) Чекај Firebase да се вчита
// =======================================================
document.addEventListener("DOMContentLoaded", async () => {

  console.log("main.js стартува...");

  // Сигурност: чекај 200ms да се вчита firebase-config.js
  await new Promise(res => setTimeout(res, 200));

  if (!firebase || !firebase.auth) {
    console.error("❌ Firebase не е иницијализиран!");
    alert("Грешка: Firebase не е иницијализиран.");
    return;
  }

  const auth = firebase.auth();
  const db = firebase.firestore();

  // =======================================================
  // 2) Читање steamToken од URL
  // =======================================================
  const urlParams = new URLSearchParams(window.location.search);
  const steamToken = urlParams.get("steamToken");

  if (steamToken) {
    console.log("Пронајден Steam token → пробувам Firebase login...");

    try {
      await auth.signInWithCustomToken(steamToken);

      console.log("✔ Steam Firebase login резултат: Успешно!");

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
  // 3) Следење на корисник
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

    const userRef = db.collection("users").doc(user.uid);
    const snap = await userRef.get();
    const userData = snap.exists ? snap.data() : {};

    // Бан чек
    if (userData.banned === true) {
      alert("БАНИРАН СИ ОД САЈТОТ!");
      auth.signOut();
      return;
    }

    // UI Ажурирање
    document.querySelectorAll("#userName").forEach(el => {
      el.textContent = userData.username || "Играч";
    });

    if (userData.avatarUrl) {
      document.querySelectorAll("#userAvatar, .avatar-big").forEach(el => {
        el.style.backgroundImage = `url(${userData.avatarUrl})`;
        el.textContent = "";
      });
    }

    // Роли
    const role = (userData.role || "member").toLowerCase();
    const topLinks = document.querySelector(".top-links");

    if (topLinks && (role === "admin" || role === "moderator")) {
      if (!topLinks.querySelector(".admin-btn")) {
        if (role === "admin") {
          topLinks.insertAdjacentHTML("beforeend",
            `<a href="admin.html" class="admin-btn">Админ Панел</a>`
          );
        }
        topLinks.insertAdjacentHTML("beforeend",
          `<a href="dashboard.html" class="mod-btn">Мод Панел</a>`
        );
      }
    }

    // Онлајн статус
    userRef.set({
      online: true,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // Онлајн пинг
    setInterval(() => {
      userRef.update({
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
      });
    }, 30000);

    // Статистики
    loadStats(db);
    loadLiveMatches(db);

  });

});

// =======================================================
// 4) Функции за статистики
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
// 5) Live matches
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

    let html = "<div style='font-weight:600;color:#22c55e;margin-bottom:10px;'>Активни мечеви:</div>";

    snap.forEach(doc => {
      const u = doc.data();
      html += `
        <div style="margin:6px 0;padding:10px;background:rgba(34,197,94,0.15);
             border-radius:10px;font-weight:500;">
        <strong>${u.username}</strong> е во Dota 2 меч!
        </div>`;
    });

    container.innerHTML = html;

  } catch (err) {
    console.error(err);
    container.innerHTML = "Грешка при проверка.";
  }
}
