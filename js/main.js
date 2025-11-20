// js/main.js – ФИНАЛНА ВЕРЗИЈА 20.11.2025
// Главна страница – онлајн каунтер, live мечеви, статистики

let currentUser = null;

auth.onAuthStateChanged(async user => {
  if (!user) {
    location.href = "index.html";
    return;
  }

  if (!user.uid.startsWith("steam:")) {
    alert("Само Steam login е дозволен.");
    auth.signOut();
    return;
  }

  currentUser = user;

  const userDoc = await db.collection("users").doc(user.uid).get();
  const userData = userDoc.exists ? userDoc.data() : {};

  if (userData.banned === true) {
    alert("Баниран си од сајтот.");
    auth.signOut();
    return;
  }

  // Име и аватар
  if (userData.username) {
    document.querySelectorAll("#userName").forEach(el => el.textContent = userData.username);
  }

  if (userData.avatarUrl) {
    document.querySelectorAll("#userAvatar, .avatar-big").forEach(el => {
      el.style.backgroundImage = `url(${userData.avatarUrl})`;
      el.textContent = "";
    });
  }

  // ADMIN / MOD КОПЧИЊА
  const role = (userData.role || "member").toLowerCase();
  const topLinks = document.querySelector(".top-links");
  if (topLinks && (role === "admin" || role === "moderator")) {
    if (topLinks.querySelector(".admin-btn, .mod-btn")) return; // спречи дупликати

    if (role === "admin") {
      topLinks.insertAdjacentHTML("beforeend", 
        `<a href="admin.html" style="color:#ff4444;font-weight:bold;margin-left:18px;padding:6px 12px;border:2px solid #ff4444;border-radius:8px;background:rgba(239,68,68,0.15);">
          Админ Панел
        </a>`
      );
    }

    topLinks.insertAdjacentHTML("beforeend", 
      `<a href="dashboard.html" style="color:#ffaa00;font-weight:bold;margin-left:18px;padding:6px 12px;border:2px solid #ffaa00;border-radius:8px;background:rgba(255,170,0,0.15);">
        Мод Панел
      </a>`
    );
  }

  // Онлајн статус
  await db.collection("users").doc(user.uid).set({
    online: true,
    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  loadGlobalStats();
  loadLiveMatches();

  // Пинг за онлајн
  setInterval(() => {
    db.collection("users").doc(user.uid).update({
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(() => {});
  }, 30000);
});

// Глобални статистики
function loadGlobalStats() {
  // Онлајн корисници
  db.collection("users")
    .where("online", "==", true)
    .onSnapshot(snap => {
      const el = document.getElementById("onlineCount");
      if (el) el.textContent = snap.size;
    });

  // Статистики од /stats/community
  const statsRef = db.collection("stats").doc("community");
  statsRef.onSnapshot(snap => {
    if (!snap.exists) return;
    const d = snap.data();

    // ОВА Е ПРАВИЛНОТО Мапирање!
    const memberEl = document.getElementById("memberCount");
    if (memberEl) memberEl.textContent = d.members || 0;

    const threadEl = document.getElementById("threadCount");
    if (threadEl) threadEl.textContent = d.threads || 0;

    const commentEl = document.getElementById("commentCount");
    if (commentEl) commentEl.textContent = d.comments || 0;
  });
}

// Live мечеви
async function loadLiveMatches() {
  const container = document.getElementById("liveMatches");
  if (!container) return;

  container.innerHTML = "Проверувам активни мечеви...";

  try {
    const snap = await db.collection("users")
      .where("inGame", "==", true)
      .limit(10)
      .get();

    if (snap.empty) {
      container.innerHTML = "Никој не игра моментално.";
      return;
    }

    let html = "<div style='font-weight:600;color:#22c55e;margin-bottom:10px;'>Активни мечеви:</div>";
    snap.forEach(doc => {
      const u = doc.data();
      html += `<div style="margin:8px 0;padding:10px;background:rgba(34,197,94,0.15);border-radius:10px;font-weight:500;">
                 <strong>${u.username || "Играч"}</strong> е во Dota 2 меч!
               </div>`;
    });
    container.innerHTML = html;

  } catch (e) {
    container.innerHTML = "Грешка при проверка.";
    console.error(e);
  }
}

