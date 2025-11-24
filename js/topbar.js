// js/topbar.js – PREMIUM FINAL 2025
// Единствен централен топбар за целиот сајт (Steam Login + Roles)

function loadTopbar() {
  // Автоматски вчитување на topbar.html
  fetch("/topbar.html")
    .then(res => {
      if (!res.ok) throw new Error("Topbar не се вчита");
      return res.text();
    })
    .then(html => {
      const container = document.getElementById("topbar");
      if (!container) return;

      container.innerHTML = html;

      initializeProfileLink();
      initializeRoleButtons();
    })
    .catch(err => console.error("Грешка при вчитување topbar:", err));
}

// ───────────────────────────────────────────────
// Профил линк (profileLink → profile.html?id=UID)
// ───────────────────────────────────────────────
function initializeProfileLink() {
  auth.onAuthStateChanged(user => {
    if (!user) return;
    const link = document.getElementById("profileLink");
    if (link) link.href = `profile.html?id=${user.uid}`;
  });
}

// ───────────────────────────────────────────────
// Додавање Admin / Moderator копчиња
// ───────────────────────────────────────────────
function initializeRoleButtons() {
  auth.onAuthStateChanged(async user => {
    if (!user) return;

    try {
      const doc = await db.collection("users").doc(user.uid).get();
      if (!doc.exists) return;

      const data = doc.data();
      const role = (data.role || "member").toLowerCase();

      const topLinks = document.querySelector(".top-links");
      if (!topLinks) return;

      // Спречи дупликирање
      if (
        topLinks.querySelector(".admin-btn") ||
        topLinks.querySelector(".mod-btn")
      ) {
        return;
      }

      // ADMIN PANEL
      if (role === "admin") {
        topLinks.insertAdjacentHTML("beforeend", `
          <a href="admin.html" class="admin-btn" style="
            color:#ff4444;
            font-weight:700;
            margin-left:20px;
            padding:8px 16px;
            border:2px solid #ff4444;
            border-radius:10px;
            background:rgba(239,68,68,0.15);
            transition:all 0.25s;
            cursor:pointer;
          " onmouseover="this.style.background='rgba(239,68,68,0.30)'" 
            onmouseout="this.style.background='rgba(239,68,68,0.15)'">
            Админ Панел
          </a>
        `);
      }

      // MOD PANEL (Модератор + Админ)
      if (role === "admin" || role === "moderator") {
        topLinks.insertAdjacentHTML("beforeend", `
          <a href="dashboard.html" class="mod-btn" style="
            color:#ffaa00;
            font-weight:700;
            margin-left:20px;
            padding:8px 16px;
            border:2px solid #ffaa00;
            border-radius:10px;
            background:rgba(255,170,0,0.15);
            transition:all 0.25s;
            cursor:pointer;
          " onmouseover="this.style.background='rgba(255,170,0,0.30)'" 
            onmouseout="this.style.background='rgba(255,170,0,0.15)'">
            Мод Панел
          </a>
        `);
      }
    } catch (e) {
      console.error("Грешка при додавање на Admin/Mod копчиња:", e);
    }
  });
}

// ───────────────────────────────────────────────
// AUTO RUN
// ───────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", loadTopbar);

// За рачно повикување (по reload на делови)
window.loadTopbar = loadTopbar;
