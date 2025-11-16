let currentUser = null;
let userRole = "member";

// 👉 Escape HTML (безбедно)
function escapeHtml(t) {
  const d = document.createElement("div");
  d.textContent = t;
  return d.innerHTML;
}

// ➕ PREVIEW MODE
const isPreview = localStorage.getItem("maintenancePreview") === "true";
if (isPreview) {
  localStorage.removeItem("maintenancePreview");
}

// ─────────────────────────────
// 🎟️ STEAM LOGIN TOKEN HANDLER
// ─────────────────────────────
async function handleSteamLogin() {
  const url = new URL(window.location.href);
  const steamToken = url.searchParams.get("steamToken");

  if (!steamToken) return; // нема steam login

  console.log("Steam token detected:", steamToken);

  try {
    // 👇 Испрати го токенот до backend
    const res = await fetch("/api/steam-complete?token=" + steamToken);
    const data = await res.json();

    if (!data.success) {
      console.error("Steam login failed:", data.error);
      alert("Steam login failed: " + data.error);
      return;
    }

    const fbToken = data.firebaseToken;

    // 👇 Firebase Custom Auth login
    const userCred = await auth.signInWithCustomToken(fbToken);
    const user = userCred.user;

    // 🔥 Запиши/ажурирај профил
    await db.collection("users").doc(user.uid).set({
      username: data.username,
      steamId: data.steamId,
      avatarUrl: data.avatar,
      role: data.role || "member",
      online: true,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // ❌ Исчисти URL параметар
    url.searchParams.delete("steamToken");
    window.history.replaceState({}, document.title, url.toString());

    // ➡️ Напред!
    location.href = "main.html";

  } catch (err) {
    console.error("Steam token error:", err);
    alert("Steam login error: " + err.message);
  }
}

// Активирај веднаш
handleSteamLogin();


// ─────────────────────────────
// 🔐 AUTH & USER LOAD
// ─────────────────────────────
auth.onAuthStateChanged(async user => {
  if (!user || !user.emailVerified) {
    location.href = "index.html";
    return;
  }

  currentUser = user;

  // FIRESTORE DATA
  const userDoc = await db.collection("users").doc(user.uid).get();
  const u = userDoc.exists ? userDoc.data() : {};
  userRole = u.role || "member";

  const name = u.username || user.email.split("@")[0];
  document.getElementById("userName").textContent = name;

  const isAdmin = userRole === "admin";

  // ─────────────────────────────
  // 🖼️ АВАТАР
  // ─────────────────────────────
  const av = document.getElementById("userAvatar");
  if (av) {
    if (u.avatarUrl) {
      const img = new Image();
      img.onload = () => {
        av.style.backgroundImage = `url(${u.avatarUrl})`;
        av.style.backgroundSize = "cover";
        av.style.backgroundPosition = "center";
        av.textContent = "";
      };
      img.onerror = () => { av.textContent = name[0].toUpperCase(); };
      img.src = u.avatarUrl;
    } else {
      av.style.background = `hsl(${(name.charCodeAt(0) * 7) % 360},70%,55%)`;
      av.textContent = name[0].toUpperCase();
    }
  }

  // Профил линк
  const profileLink = document.getElementById("profileLink");
  if (profileLink) profileLink.href = `profile.html?id=${user.uid}`;

  // ─────────────────────────────
  // 🛠️ PREVIEW MODE за админ
  // ─────────────────────────────
  if (isPreview && isAdmin) {
    try {
      const maintDoc = await db.collection("config").doc("maintenance").get();
      const data = maintDoc.exists ? maintDoc.data() : {};
      const safeMsg = escapeHtml(data.message || "Сајтот е во одржување...");

      document.body.innerHTML = `
        <div class="maintenance-screen">
          <h1>Сајтот е во одржување</h1>
          <p>${safeMsg}</p>
          <button class="btn-back" onclick="location.href='admin.html'">Назад</button>
          <div class="note">Ќе се вратиме наскоро!</div>
        </div>
      `;
    } catch {}
    return;
  }

  // ─────────────────────────────
  // 🔒 MAINTENANCE за member/mod
  // ─────────────────────────────
  if (!isAdmin) {
    try {
      const maintDoc = await db.collection("config").doc("maintenance").get();
      if (maintDoc.exists && maintDoc.data().enabled) {
        const safeMsg = escapeHtml(maintDoc.data().message);
        document.body.innerHTML = `
          <div class="maintenance-screen">
            <h1>Сајтот е во одржување</h1>
            <p>${safeMsg}</p>
            <div class="note">Ќе се вратиме наскоро!</div>
          </div>
        `;
        return;
      }
    } catch {}
  }

  // ─────────────────────────────
  // 👑 Панели
  // ─────────────────────────────
  if (userRole === "admin") {
    document.getElementById("adminPanel").style.display = "block";
  }
  if (userRole === "moderator" || userRole === "admin") {
    document.getElementById("modPanel").style.display = "block";
  }

  // ─────────────────────────────
  // 🟢 ONLINE status
  // ─────────────────────────────
  await db.collection("users").doc(user.uid).set({
    online: true,
    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  loadStats();
  loadLiveMatches();
  setInterval(loadLiveMatches, 15000);

  // ONLINE COUNTER
  const updateOnlineCount = () => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

    db.collection("users")
      .where("online", "==", true)
      .get()
      .then(snap => {
        let count = 0;

        snap.forEach(doc => {
          const lastSeen = doc.data().lastSeen;
          if (lastSeen && lastSeen.toDate().getTime() > fiveMinutesAgo) {
            count++;
          }
        });

        document.getElementById("onlineCount").textContent = count;
      });
  };

  updateOnlineCount();
  setInterval(updateOnlineCount, 30000);

  // OFFLINE on close
  const setOffline = () => {
    if (!currentUser) return;
    db.collection("users").doc(currentUser.uid).update({
      online: false,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    });
  };
  window.addEventListener("beforeunload", setOffline);
});


// ─────────────────────────────
// 📊 STATISTIKA
// ─────────────────────────────
async function loadStats() {
  try {
    const users = await db.collection("users").get();
    const threads = await db.collection("threads").get();
    let comments = 0;

    for (const t of threads.docs) {
      const com = await t.ref.collection("comments").get();
      comments += com.size;
    }

    document.getElementById("memberCount").textContent = users.size;
    document.getElementById("threadCount").textContent = threads.size;
    document.getElementById("commentCount").textContent = comments;

  } catch (err) {
    console.error("СТАТИСТИКА ERROR:", err);
  }
}


// ─────────────────────────────
// 🎮 LIVE MATCHES
// ─────────────────────────────
const liveCache = {};
const CACHE_TIME = 5 * 60 * 1000;
const MIN_DELAY = 5000;
let lastRequestTime = 0;

async function loadLiveMatches() {
  const out = document.getElementById("liveMatches");
  out.innerHTML = "Проверувам...";

  try {
    const users = await db.collection("users").where("steamId", "!=", "").limit(1).get();
    const now = Date.now();
    const results = [];

    for (const doc of users.docs) {
      const data = doc.data();
      const steamId = data.steamId;
      const username = data.username || "Играч";

      // Кеш
      if (liveCache[steamId] && (now - liveCache[steamId].time) < CACHE_TIME) {
        if (liveCache[steamId].html) results.push(liveCache[steamId].html);
        continue;
      }

      // Rate-limit
      const timeSinceLast = now - lastRequestTime;
      if (timeSinceLast < MIN_DELAY) {
        await new Promise(r => setTimeout(r, MIN_DELAY - timeSinceLast));
      }
      lastRequestTime = Date.now();

      try {
        const url = `https://api.allorigins.win/get?url=${encodeURIComponent('https://api.opendota.com/api/players/' + steamId + '/matches?limit=1')}`;
        const res = await fetch(url);
        if (!res.ok) continue;

        const proxy = await res.json();
        const matches = JSON.parse(proxy.contents);
        if (!Array.isArray(matches) || matches.length === 0) continue;

        const match = matches[0];
        if (match.duration !== null || !match.start_time) continue;

        const hero = await getHeroName(match.hero_id);
        const kda = `${match.kills}/${match.deaths}/${match.assists}`;
        const duration = Math.floor((now / 1000 - match.start_time) / 60);

        const html = `
          <div class="live-match">
            <span class="live-hero">${username}</span> е во
            <span class="live-hero">${duration < 2 ? "matchmaking" : "game"}</span> со
            <span class="live-hero">${hero}</span><br>
            <span class="live-kda">KDA: ${kda}</span> —
            <span class="live">Време: ${duration} мин</span><br>
            <a href="https://www.dotabuff.com/matches/${match.match_id}" target="_blank" class="watch-btn">ГЛЕДАЈ</a>
          </div>
        `;

        liveCache[steamId] = { html, time: now };
        results.push(html);

      } catch (e) {
        console.error("OpenDota Error:", e);
        liveCache[steamId] = { html: null, time: now };
      }
    }

    out.innerHTML = results.length ? results.join("") : "Никој не игра моментално.";

  } catch (err) {
    out.innerHTML = "Грешка при читање.";
  }
}

const heroCache = {};
async function getHeroName(heroId) {
  if (heroCache[heroId]) return heroCache[heroId];

  try {
    const res = await fetch("https://api.opendota.com/api/constants/heroes");
    const heroes = await res.json();
    const name = heroes[heroId]?.localized_name || "Непознат";
    heroCache[heroId] = name;
    return name;
  } catch {
    return "Непознат";
  }
}


// ─────────────────────────────
// ⏰ Време + Држава (IP)
// ─────────────────────────────
function updateTimeAndCountry() {
  const now = new Date();
  const timeString = now.toLocaleTimeString('mk-MK', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  });

  document.getElementById("currentTime").textContent = timeString;

  const cached = localStorage.getItem("countryData");
  const cacheTime = localStorage.getItem("countryDataTime");
  const nowTime = Date.now();

  if (cached && cacheTime && (nowTime - cacheTime < 300000)) {
    const data = JSON.parse(cached);
    document.getElementById("userCountry").textContent = data.code;
    document.getElementById("countryFlag").src = `https://flagcdn.com/16x12/${data.code.toLowerCase()}.png`;
    document.getElementById("countryName").textContent = data.name;
    return;
  }

  fetch("https://ipinfo.io/json?token=d509339eb76b5e")
    .then(res => res.json())
    .then(data => {
      const countryData = {
        code: data.country || "??",
        name: data.country === "MK" ? "Македонија" : (data.country_name || "Непозната")
      };

      document.getElementById("userCountry").textContent = countryData.code;
      document.getElementById("countryFlag").src = `https://flagcdn.com/16x12/${countryData.code.toLowerCase()}.png`;
      document.getElementById("countryName").textContent = countryData.name;

      localStorage.setItem("countryData", JSON.stringify(countryData));
      localStorage.setItem("countryDataTime", nowTime);
    })
    .catch(() => {
      document.getElementById("userCountry").textContent = "??";
      document.getElementById("countryFlag").src = "https://flagcdn.com/16x12/un.png";
      document.getElementById("countryName").textContent = "Непозната";
    });
}

setInterval(updateTimeAndCountry, 1000);
updateTimeAndCountry();
