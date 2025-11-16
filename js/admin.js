// admin.js
// auth и db доаѓаат од firebase-config.js

let currentUser = null;
let userRole = "member";

// Елементи од DOM
const userListEl = document.getElementById("userList");
const maintEnabledEl = document.getElementById("maintEnabled");
const maintMessageEl = document.getElementById("maintMessage");
const maintStatusEl = document.getElementById("maintStatus");

// 🔐 Проверка за admin
auth.onAuthStateChanged(async user => {
  if (!user || !user.emailVerified) {
    location.href = "index.html";
    return;
  }

  currentUser = user;

  try {
    const doc = await db.collection("users").doc(user.uid).get();
    const data = doc.exists ? doc.data() : {};
    userRole = data.role || "member";

    if (userRole !== "admin") {
      alert("Само админ има пристап до оваа страница.");
      location.href = "main.html";
      return;
    }

    loadUsers();
    loadMaintenanceConfig();
  } catch (err) {
    console.error("Грешка при проверка на админ:", err);
    alert("Грешка при читање на кориснички податоци.");
    location.href = "main.html";
  }
});

// 🧾 Вчитување корисници
async function loadUsers() {
  userListEl.innerHTML = `<div class="loading">Вчитувам корисници...</div>`;

  try {
    const snap = await db.collection("users").orderBy("createdAt", "desc").get();

    if (snap.empty) {
      userListEl.innerHTML = `<p class="empty">Нема корисници во базата.</p>`;
      return;
    }

    userListEl.innerHTML = "";

    snap.forEach(doc => {
      const u = doc.data();
      const id = doc.id;

      const username = escapeHtml(u.username || "???");
      const email = escapeHtml(u.email || "");
      const role = u.role || "member";
      const banned = u.banned === true;

      const created = u.createdAt?.toDate?.().toLocaleString("mk-MK") || "??";

      const isSelf = id === currentUser.uid;

      const html = `
        <div class="user-row">
          <div class="user-main">
            <div class="user-name">${username}</div>
            <div class="user-email">${email}</div>
            <div class="user-meta">
              Role: <span class="tag tag-role">${role}</span>
              • Banned: <span class="tag ${banned ? "tag-banned" : "tag-ok"}">
                ${banned ? "DA" : "NE"}
              </span>
              • Created: ${created}
            </div>
          </div>

          <div class="user-actions">
            <select onchange="changeRole('${id}', this.value)" ${isSelf ? "disabled" : ""}>
              <option value="member" ${role === "member" ? "selected" : ""}>member</option>
              <option value="moderator" ${role === "moderator" ? "selected" : ""}>moderator</option>
              <option value="admin" ${role === "admin" ? "selected" : ""}>admin</option>
            </select>

            <button onclick="toggleBan('${id}', ${banned})"
                    ${isSelf ? "disabled" : ""}>
              ${banned ? "Unban" : "Ban"}
            </button>
          </div>
        </div>
      `;

      userListEl.insertAdjacentHTML("beforeend", html);
    });

  } catch (err) {
    console.error("Грешка при вчитување корисници:", err);
    userListEl.innerHTML = `<p class="error">Грешка при вчитување корисници.</p>`;
  }
}

// 🧑‍⚖️ Смени улога
async function changeRole(userId, newRole) {
  if (!confirm(`Да ја сменам улогата на ${newRole}?`)) {
    // reload за да се врати претходната вредност во select
    loadUsers();
    return;
  }

  try {
    await db.collection("users").doc(userId).update({
      role: newRole
    });
    loadUsers();
  } catch (err) {
    console.error("Грешка при промена на улога:", err);
    alert("Грешка при промена на улога.");
  }
}

// 🚫 Ban / Unban
async function toggleBan(userId, currentlyBanned) {
  const toState = !currentlyBanned;
  if (!confirm(toState ? "Да го банирам овој корисник?" : "Да го тргнам банот?")) {
    return;
  }

  try {
    await db.collection("users").doc(userId).update({
      banned: toState
    });
    loadUsers();
  } catch (err) {
    console.error("Грешка при ban/unban:", err);
    alert("Грешка при промена на banned статус.");
  }
}

// ⚙️ Вчитување maintenance конфигурација
async function loadMaintenanceConfig() {
  maintStatusEl.textContent = "Вчитувам...";

  try {
    const doc = await db.collection("config").doc("maintenance").get();
    if (!doc.exists) {
      maintEnabledEl.checked = false;
      maintMessageEl.value = "";
      maintStatusEl.textContent = "Нема конфигурација – default исклучен.";
      return;
    }

    const data = doc.data();
    maintEnabledEl.checked = !!data.enabled;
    maintMessageEl.value = data.message || "";
    maintStatusEl.textContent = "Конфигурацијата е вчитана.";
  } catch (err) {
    console.error("Грешка при читање maintenance:", err);
    maintStatusEl.textContent = "Грешка при читање.";
  }
}

// 💾 Зачувај maintenance конфигурација
async function saveMaintenanceConfig() {
  const enabled = maintEnabledEl.checked;
  const message = maintMessageEl.value.trim();

  maintStatusEl.textContent = "Се зачувува...";
  try {
    await db.collection("config").doc("maintenance").set({
      enabled,
      message
    }, { merge: true });

    maintStatusEl.textContent = "Успешно зачувано.";
  } catch (err) {
    console.error("Грешка при зачувување maintenance:", err);
    maintStatusEl.textContent = "Грешка при зачувување.";
  }
}

// 👀 Preview режим – само за админ
function previewMaintenance() {
  // Ќе го прочита main.js
  localStorage.setItem("maintenancePreview", "true");
  window.open("main.html", "_blank");
}

// Мал helper за HTML
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
