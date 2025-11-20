
// js/admin.js – ФИНАЛНА ВЕРЗИЈА 20.11.2025
// Само за admin (со Steam поддршка)

let currentUser = null;

const userListEl = document.getElementById("userList");
const maintEnabledEl = document.getElementById("maintEnabled");
const maintMessageEl = document.getElementById("maintMessage");
const maintStatusEl = document.getElementById("maintStatus");

// Проверка дали е админ
auth.onAuthStateChanged(async user => {
  if (!user || !user.uid.startsWith("steam:")) {
    location.href = "index.html";
    return;
  }

  currentUser = user;

  try {
    const doc = await db.collection("users").doc(user.uid).get();
    if (!doc.exists || doc.data().role !== "admin") {
      alert("Само админ има пристап до оваа страница!");
      location.href = "main.html";
      return;
    }

    loadUsers();
    loadMaintenanceConfig();

  } catch (err) {
    console.error("Грешка при проверка на админ:", err);
    alert("Грешка при вчитување на податоци.");
    location.href = "main.html";
  }
});

// Вчитување на сите корисници
async function loadUsers() {
  userListEl.innerHTML = `<div class="loading">Вчитувам корисници...</div>`;

  try {
    const snap = await db.collection("users")
      .orderBy("createdAt", "desc")
      .get();

    if (snap.empty) {
      userListEl.innerHTML = `<p class="empty">Нема регистрирани корисници.</p>`;
      return;
    }

    userListEl.innerHTML = "";

    snap.forEach(doc => {
      const u = doc.data();
      const id = doc.id;
      const isSelf = id === currentUser.uid;

      const username = escapeHtml(u.username || "Непознат");
      const role = u.role || "member";
      const banned = u.banned === true;
      const created = u.createdAt?.toDate?.().toLocaleString("mk-MK") || "Непознат";

      const roleColor = role === "admin" ? "#ef4444" : role === "moderator" ? "#f59e0b" : "#22c55e";

      const html = `
        <div class="user-row" style="position:relative;padding-left:${isSelf ? "50px" : "16px"}">
          ${isSelf ? `<div style="position:absolute;left:10px;top:16px;font-size:1.5rem;">👑</div>` : ""}

          <div class="user-main">
            <div class="user-name">${username} ${isSelf ? "<small style='color:#60a5fa'>(ти)</small>" : ""}</div>
            <div class="user-meta">
              Улога: <span class="tag" style="background:${roleColor};color:#000">${role}</span>
              • Бан: <span class="tag ${banned ? "tag-banned" : "tag-ok"}">${banned ? "ДА" : "НЕ"}</span>
              • Креиран: ${created}
            </div>
          </div>

          <div class="user-actions">
            <select onchange="changeRole('${id}', this.value)" ${isSelf ? "disabled" : ""}>
              <option value="member" ${role === "member" ? "selected" : ""}>Член</option>
              <option value="moderator" ${role === "moderator" ? "selected" : ""}>Модератор</option>
              <option value="admin" ${role === "admin" ? "selected" : ""}>Админ</option>
            </select>

            <button onclick="toggleBan('${id}', ${banned})" 
                    ${isSelf ? "disabled title='Не можеш да се банираш самиот себе!'" : ""}
                    style="background:${banned ? "#22c55e" : "#ef4444"}">
              ${banned ? "Одбанирај" : "Банирај"}
            </button>
          </div>
        </div>
      `;

      userListEl.insertAdjacentHTML("beforeend", html);
    });

  } catch (err) {
    console.error("Грешка при вчитување корисници:", err);
    userListEl.innerHTML = `<p class="error">Грешка при вчитување.</p>`;
  }
}

// Промена на улога
async function changeRole(userId, newRole) {
  const rolesMK = { member: "член", moderator: "модератор", admin: "админ" };

  if (!confirm(`Да ја сменам улогата во "${rolesMK[newRole]}"?`)) {
    loadUsers();
    return;
  }

  try {
    await db.collection("users").doc(userId).update({ role: newRole });
    alert("Улогата е променета!");
    loadUsers();
  } catch (err) {
    console.error(err);
    alert("Грешка при промена на улога.");
  }
}

// Бан / одбан
async function toggleBan(userId, currentlyBanned) {
  const action = currentlyBanned ? "одбанирање" : "банирање";
  if (!confirm(`Сигурен си за ${action}?`)) return;

  try {
    await db.collection("users").doc(userId).update({ banned: !currentlyBanned });
    alert(currentlyBanned ? "Корисникот е одбаниран!" : "Корисникот е баниран!");
    loadUsers();
  } catch (err) {
    console.error(err);
    alert("Грешка при бан.");
  }
}

// Maintenance config
async function loadMaintenanceConfig() {
  try {
    const doc = await db.collection("config").doc("maintenance").get();
    if (doc.exists) {
      const d = doc.data();
      maintEnabledEl.checked = !!d.enabled;
      maintMessageEl.value = d.message || "";
      maintStatusEl.textContent = "Конфигурацијата е вчитана.";
    } else {
      maintEnabledEl.checked = false;
      maintMessageEl.value = "";
      maintStatusEl.textContent = "Maintenance е исклучен.";
    }
  } catch (err) {
    maintStatusEl.textContent = "Грешка при вчитување.";
  }
}

async function saveMaintenanceConfig() {
  const enabled = maintEnabledEl.checked;
  const message = maintMessageEl.value.trim() || "Сајтот е во одржување...";

  maintStatusEl.textContent = "Се зачувува...";

  try {
    await db.collection("config").doc("maintenance").set({
      enabled,
      message
    }, { merge: true });

    maintStatusEl.textContent = "Зачувано!";
  } catch (err) {
    maintStatusEl.textContent = "Грешка при зачувување.";
  }
}

function previewMaintenance() {
  localStorage.setItem("maintenancePreview", "true");
  window.open("main.html", "_blank");
}

// Безбеден escape
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
