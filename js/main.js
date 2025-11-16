let currentUser = null;
let userRole = "member";

// Escape HTML
function escapeHtml(t) {
  const d = document.createElement("div");
  d.textContent = t;
  return d.innerHTML;
}

// Preview mode
const isPreview = localStorage.getItem("maintenancePreview") === "true";
if (isPreview) localStorage.removeItem("maintenancePreview");

// ─────────────────────────────────────────
// STEAM LOGIN BLOCK REDIRECT
// ─────────────────────────────────────────
const urlCheck = new URL(window.location.href);
if (urlCheck.searchParams.get("steamToken")) {
  window.__steamLoginInProgress = true;
}

// ─────────────────────────────────────────
// STEAM LOGIN HANDLER
// ─────────────────────────────────────────
async function handleSteamLogin() {
  const url = new URL(window.location.href);
  const steamToken = url.searchParams.get("steamToken");

  if (!steamToken) return;

  window.__steamLoginInProgress = true;

  try {
    const userCred = await auth.signInWithCustomToken(steamToken);
    const user = userCred.user;

    await db.collection("users").doc(user.uid).set(
      {
        online: true,
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    window.__steamLoginInProgress = false;

    url.searchParams.delete("steamToken");
    window.history.replaceState({}, document.title, url.toString());

    location.href = "main.html";
  } catch (err) {
    window.__steamLoginInProgress = false;
    alert("Steam login error: " + err.message);
  }
}

handleSteamLogin();

// ─────────────────────────────────────────
// AUTH STATE HANDLER
// ─────────────────────────────────────────
auth.onAuthStateChanged(async user => {
  if (!user) {
    if (window.__steamLoginInProgress) return;
    location.href = "index.html";
    return;
  }

  const isSteamUser = typeof user.uid === "string" && user.uid.startsWith("steam:");

  if (!isSteamUser && user.email && !user.emailVerified) {
    location.href = "index.html";
    return;
  }

  currentUser = user;

  // Load Firestore User Data
  const userDoc = await db.collection("users").doc(user.uid).get();
  const u = userDoc.exists ? userDoc.data() : {};
  userRole = u.role || "member";

  const name =
    u.username ||
    (user.email ? user.email.split("@")[0] : "Корисник");

  const userNameElement = document.getElementById("userName");
  if (userNameElement) userNameElement.textContent = name;

  // ─────────────────────────────────────────
  // FINAL PROFILE FIX — ALWAYS REDIRECT TO profile.html?id=UID
  // ─────────────────────────────────────────
  function goToProfile() {
    if (!currentUser) return;
    window.location.href = `profile.html?id=${currentUser.uid}`;
  }

  const profileLink1 = document.getElementById("profileLink");
  if (profileLink1) {
    profileLink1.href = "#";
    profileLink1.onclick = (e) => {
      e.preventDefault();
      goToProfile();
    };
  }

  const profileLink2 = document.getElementById("profileLink2");
  if (profileLink2) {
    profileLink2.href = "#";
    profileLink2.onclick = (e) => {
      e.preventDefault();
      goToProfile();
    };
  }

  const avatar = document.getElementById("userAvatar");
  if (avatar) {
    avatar.style.cursor = "pointer";
    avatar.onclick = goToProfile;
  }

  // ─────────────────────────────────────────
  // AVATAR RENDER
  // ─────────────────────────────────────────
  if (avatar) {
    const setInitialAvatar = () => {
      avatar.style.background = `hsl(${(name.charCodeAt(0) * 7) % 360},70%,55%)`;
      avatar.style.backgroundImage = "";
      avatar.textContent = name[0].toUpperCase();
    };

    if (u.avatarUrl) {
      const img = new Image();
      img.onload = () => {
        avatar.style.backgroundImage = `url(${u.avatarUrl})`;
        avatar.style.backgroundSize = "cover";
        avatar.style.backgroundPosition = "center";
        avatar.textContent = "";
      };
      img.onerror = setInitialAvatar;
      img.src = u.avatarUrl;
    } else {
      setInitialAvatar();
    }
  }

  // Admin check
  const isAdmin = userRole === "admin";

  // Maintenance mode (admin)
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
        </div>
      `;
    } catch {}
    return;
  }

  // Maintenance mode (users)
  if (!isAdmin) {
    try {
      const maintDoc = await db.collection("config").doc("maintenance").get();
      if (maintDoc.exists && maintDoc.data().enabled) {
        const safeMsg = escapeHtml(maintDoc.data().message);
        document.body.innerHTML = `
          <div class="maintenance-screen">
            <h1>Сајтот е во одржување</h1>
            <p>${safeMsg}</p>
          </div>
        `;
        return;
      }
    } catch {}
  }

  // Show admin panel
  const adminPanel = document.getElementById("adminPanel");
  if (isAdmin && adminPanel) adminPanel.style.display = "block";

  const modPanel = document.getElementById("modPanel");
  if ((isAdmin || userRole === "moderator") && modPanel) {
    modPanel.style.display = "block";
  }

  // Set user online
  await db.collection("users").doc(user.uid).set(
    {
      online: true,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );

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

        const onlineEl = document.getElementById("onlineCount");
        if (onlineEl) onlineEl.textContent = count;
      });
  };

  updateOnlineCount();
  setInterval(updateOnlineCount, 30000);

  // Offline on exit
  window.addEventListener("beforeunload", () => {
    db.collection("users")
      .doc(user.uid)
      .update({
        online: false,
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
      })
      .catch(() => {});
  });
});

// ─────────────────────────────────────────
// STATS
// ─────────────────────────────────────────
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
    console.error("STATS ERROR:", err);
  }
}

// ─────────────────────────────────────────
// LIVE MATCHES
// ─────────────────────────────────────────
const liveCache = {};
const CACHE_TIME = 5 * 60 * 1000;
const MIN_DELAY = 5000;
let lastRequestTime = 0;

async function loadLiveMatches() {
  const out = document.getElementById("liveMatches");
  if (!out) return;

  out.textContent = "Проверувам...";

  try {
    const users = await db.collection("users")
      .where("steamId", "!=", "")
      .limit(1)
      .get();

    const now = Date.now();
    const results = [];

    for (const doc of users.docs) {
      const data = doc.data();
      const steamId = data.steamId;
      const username = data.username || "Играч";

      if (liveCache[steamId] && (now - liveCache[steamId].time) < CACHE_TIME) {
        if (liveCache[steamId].html) results.push(liveCache[steamId].html);
        continue;
      }

      const timeSinceLast = now - lastRequestTime;
      if (timeSinceLast < MIN_DELAY) {
        await new Promise(r => setTimeout(r, MIN_DELAY - timeSinceLast));
      }
      lastRequestTime = Date.now();

      try {
        const url = `https://api.allorigins.win/get?url=${encodeURIComponent(
          "https://api.opendota.com/api/players/" + steamId + "/matches?limit=1"
        )}`;

        const res = await fetch(url);
        if (!res.ok) continue;

        const proxy = await res.json();
        const matches = JSON.parse(proxy.contents);
        if (!Array.isArray(matches) || matches.length === 0) continue;

        const match = matches[0];

        if (!match.start_time || match.duration == null) continue;

        const hero = await getHeroName(match.hero_id);
        const kda = `${match.kills}/${match.deaths}/${match.assists}`;
        const duration = Math.floor((now / 1000 - match.start_time) / 60);

        const html = `
          <div class="live-match">
            <strong>${escapeHtml(username)}</strong> — ${hero}<br>
            KDA: ${kda} | ${duration} мин
          </div>
        `;

        liveCache[steamId] = { html, time: now };
        results.push(html);
      } catch {}
    }

    out.innerHTML = results.length ? results.join("") : "Никој не игра моментално.";
  } catch {
    out.textContent = "Грешка.";
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

// ─────────────────────────────────────────
// COUNTRY + TIME
// ─────────────────────────────────────────
function updateTimeAndCountry() {
  const now = new Date();
  const timeString = now.toLocaleTimeString("mk-MK", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short"
  });

  const timeEl = document.getElementById("currentTime");
  if (timeEl) timeEl.textContent = timeString;

  const cached = localStorage.getItem("countryData");
  const cacheTime = localStorage.getItem("countryDataTime");
  const nowTime = Date.now();

  const countryCodeEl = document.getElementById("userCountry");
  const countryFlagEl = document.getElementById("countryFlag");
  const countryNameEl = document.getElementById("countryName");

  const applyCountry = data => {
    if (countryCodeEl) countryCodeEl.textContent = data.code;
    if (countryFlagEl)
      countryFlagEl.src = `https://flagcdn.com/16x12/${data.code.toLowerCase()}.png`;
    if (countryNameEl) countryNameEl.textContent = data.name;
  };

  if (cached && cacheTime && (nowTime - cacheTime < 300000)) {
    applyCountry(JSON.parse(cached));
    return;
  }

  fetch("https://ipinfo.io/json?token=d509339eb76b5e")
    .then(res => res.json())
    .then(data => {
      const code = data.country || "??";
      const name = code === "MK" ? "Македонија" : (data.country_name || code || "Непозната");

      const countryData = { code, name };
      applyCountry(countryData);

      localStorage.setItem("countryData", JSON.stringify(countryData));
      localStorage.setItem("countryDataTime", String(nowTime));
    })
    .catch(() => {
      applyCountry({ code: "??", name: "Непозната" });
    });
}

setInterval(updateTimeAndCountry, 1000);
updateTimeAndCountry();
