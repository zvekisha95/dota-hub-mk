// =======================================================
// main.js – Главна страна (Steam login + Stats + Live Matches)
// Верзија: 21.11.2025
// =======================================================

document.addEventListener("DOMContentLoaded", async () => {
  console.log("main.js стартува...");

  // Мало чекање за firebase-config.js
  await new Promise(res => setTimeout(res, 200));

  if (!window.firebase || !firebase.auth || !firebase.firestore) {
    console.error("❌ Firebase не е иницијализиран!");
    alert("Грешка: Firebase не е иницијализиран.");
    return;
  }

  const auth = firebase.auth();
  const db = firebase.firestore();

  // =====================================================
  // 1) Steam custom token login (steamToken во URL)
  // =====================================================
  const url = new URL(window.location.href);
  const steamToken = url.searchParams.get("steamToken");

  if (steamToken) {
    console.log("Пронајден Steam token – пробувам Firebase login...");

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

  // =====================================================
  // 2) Auth listener
  // =====================================================
  auth.onAuthStateChanged(async user => {
    if (!user) {
      console.warn("⚠ Нема најавен корисник – враќам на index.html");
      location.href = "index.html";
      return;
    }

    if (!user.uid.startsWith("steam:")) {
      alert("Само Steam login е дозволен.");
      await auth.signOut();
      return;
    }

    console.log("✔ Најавен корисник:", user.uid);

    const userRef = db.collection("users").doc(user.uid);
    const snap = await userRef.get();
    const userData = snap.exists ? snap.data() : {};

    // Бан проверка
    if (userData.banned === true) {
      alert("БАНИРАН СИ ОД САЈТОТ!");
      await auth.signOut();
      return;
    }

    // Име и аватар
    document.querySelectorAll("#userName").forEach(el => {
      el.textContent = userData.username || "Играч";
    });

    const avatarUrl = userData.avatarUrl || "";
    if (avatarUrl) {
      document.querySelectorAll("#userAvatar, .avatar-big").forEach(el => {
        el.style.backgroundImage = `url(${avatarUrl})`;
        el.style.backgroundSize = "cover";
        el.style.backgroundPosition = "center";
        el.textContent = "";
      });
    } else {
      // иницијал
      const initial = (userData.username || "U")[0].toUpperCase();
      const avatarEl = document.getElementById("userAvatar");
      if (avatarEl) avatarEl.textContent = initial;
    }

    // ЛИЧЕН STATUS: "Zvekisha игра Dota 2" (само за тековниот)
    const selfStatusEl = document.getElementById("selfGameStatus");
    if (selfStatusEl) {
      if (userData.inGame === true) {
        selfStatusEl.style.display = "block";
        selfStatusEl.textContent = `${userData.username || "Играч"} моментално игра Dota 2 🎮`;
      } else {
        selfStatusEl.style.display = "none";
      }
    }

    // Онлајн статус
    await userRef.set({
      online: true,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // Пинг на секои 30 секунди
    setInterval(() => {
      userRef.update({
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
      }).catch(() => {});
    }, 30000);

    // AUTO INIT – креирај community stats + прва тема ако нема
    await initForum(db);

    // Статистики + live matches
    loadStats(db);
    subscribeLiveMatches(db);
  });

});

// =======================================================
// INIT FORUM – stats + прва тема
// =======================================================
async function initForum(db) {
  try {
    const statsRef = db.collection("stats").doc("community");
    const statsSnap = await statsRef.get();

    if (!statsSnap.exists) {
      await statsRef.set({
        members: 1,
        threads: 1,
        comments: 0
      });
      console.log("✔ initForum: community stats created");
    }

    const threadSnap = await db.collection("threads").limit(1).get();
    if (threadSnap.empty) {
      await db.collection("threads").add({
        title: "Добредојдовте на форумот!",
        body: "Форумот е успешно поставен. Креирај нова тема од менито! 😊",
        author: "System",
        authorId: "system",
        avatarUrl: "",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        locked: false,
        sticky: false,
        flagged: false,
        commentCount: 0,
        views: 0,
        lastActivity: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log("✔ initForum: first default thread created");
    }

  } catch (err) {
    console.error("❌ initForum error:", err);
  }
}

// =======================================================
// Статистики (online count + threads + comments)
// =======================================================
function loadStats(db) {
  // Online count
  db.collection("users")
    .where("online", "==", true)
    .onSnapshot(snap => {
      const el = document.getElementById("onlineCount");
      if (el) el.textContent = snap.size;
    });

  // Community stats
  const statsRef = db.collection("stats").doc("community");
  statsRef.onSnapshot(snap => {
    if (!snap.exists) return;
    const d = snap.data() || {};

    const m = document.getElementById("memberCount");
    const t = document.getElementById("threadCount");
    const c = document.getElementById("commentCount");

    if (m) m.textContent = d.members || 0;
    if (t) t.textContent = d.threads || 0;
    if (c) c.textContent = d.comments || 0;
  });
}

// =======================================================
// LIVE MATCHES – целосен список
// Firestore очекува полина:
// - inGame: true
// - currentMatchId: string или number (опционално)
// - currentMatchDurationSec: number (секунди, опционално)
// - currentMatchTeam: "radiant" или "dire" (опционално)
// - currentMatchRadiantScore / currentMatchDireScore: number (опционално)
// =======================================================
function subscribeLiveMatches(db) {
  const container = document.getElementById("liveMatches");
  if (!container) return;

  container.textContent = "Проверувам активни мечеви...";

  db.collection("users")
    .where("inGame", "==", true)
    .onSnapshot(snap => {
      if (snap.empty) {
        container.textContent = "Никој не игра моментално.";
        return;
      }

      let html = "";

      snap.forEach(doc => {
        const u = doc.data() || {};
        const name = u.username || "Играч";

        const matchId = u.currentMatchId || null;
        const durSec = u.currentMatchDurationSec || null;
        const team = (u.currentMatchTeam || "").toLowerCase();

        const radScore = typeof u.currentMatchRadiantScore === "number" ? u.currentMatchRadiantScore : null;
        const direScore = typeof u.currentMatchDireScore === "number" ? u.currentMatchDireScore : null;

        // Времетраење во минути
        let durationText = "Времетраење: непознато";
        if (typeof durSec === "number" && durSec > 0) {
          const mins = Math.floor(durSec / 60);
          durationText = `${mins} минути`;
        }

        // Тим текст
        let sideText = "Radiant vs Dire";
        if (team === "radiant") sideText = "Radiant vs Dire";
        else if (team === "dire") sideText = "Dire vs Radiant";

        // Лидер
        let leadText = "";
        if (radScore !== null && direScore !== null) {
          if (radScore > direScore) {
            leadText = `Radiant води ${radScore}:${direScore}`;
          } else if (direScore > radScore) {
            leadText = `Dire води ${direScore}:${radScore}`;
          } else {
            leadText = `Изедначено ${radScore}:${direScore}`;
          }
        }

        // Пример формат:
        // Zvekisha – Match ID 7612345678 – Radiant vs Dire – 12 минути
        html += `
          <div class="live-match-row">
            <div class="live-match-name">${name} моментално игра Dota 2</div>
            <div class="live-match-meta">
              ${matchId ? `<span>Match ID: <strong>${matchId}</strong></span>` : ""}
              <span>${sideText}</span>
              <span>${durationText}</span>
              ${leadText ? `<div>${leadText}</div>` : ""}
            </div>
          </div>
        `;
      });

      container.innerHTML = html;
    }, err => {
      console.error("Грешка при live matches:", err);
      container.textContent = "Грешка при проверка.";
    });
}

