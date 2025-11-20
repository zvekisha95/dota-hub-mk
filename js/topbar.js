// js/topbar.js – ФИНАЛНА ВЕРЗИЈА 20.11.2025
// ЕДИНСТВЕН ТОПБАР ЗА ЦЕЛИОТ САЈТ

function loadTopbar() {
  fetch("/topbar.html")
    .then(res => {
      if (!res.ok) throw new Error("Topbar не се вчита");
      return res.text();
    })
    .then(html => {
      const container = document.getElementById("topbar");
      if (!container) return;

      container.innerHTML = html;

      updateProfileLink();
      addRoleButtons();
    })
    .catch(err => console.error("Грешка при вчитување topbar:", err));
}

function updateProfileLink() {
  auth.onAuthStateChanged(user => {
    if (user) {
      const link = document.getElementById("profileLink");
      if (link) link.href = `profile.html?id=${user.uid}`;
    }
  });
}

async function addRoleButtons() {
  auth.onAuthStateChanged(async user => {
    if (!user) return;

    try {
      const doc = await db.collection("users").doc(user.uid).get();
      if (!doc.exists) return;

      const role = (doc.data().role || "member").toLowerCase();
      const topLinks = document.querySelector(".top-links");
      if (!topLinks) return;

      // Спречи дупликати
      if (topLinks.querySelector(".admin-btn, .mod-btn")) return;

      // АДМИН ПАНЕЛ
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
            transition:all 0.3s;
          " onmouseover="this.style.background='rgba(239,68,68,0.3)'" 
            onmouseout="this.style.background='rgba(239,68,68,0.15)'">
            Админ Панел
          </a>
        `);
      }

      // МОДЕРАТОР ПАНЕЛ (админ + модератор)
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
            transition:all 0.3s;
          " onmouseover="this.style.background='rgba(255,170,0,0.3)'" 
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

// Автоматски старт
document.addEventListener("DOMContentLoaded", loadTopbar);

// За рачно повикување
window.loadTopbar = loadTopbar;

