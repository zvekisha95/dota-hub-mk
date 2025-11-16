///////////////////////////////////////////////////////
// UI ELEMENTS
///////////////////////////////////////////////////////
const CLUB_CODE = "ZVEKISH322";

const clubGate        = document.getElementById("clubGate");
const loginBox        = document.getElementById("loginBox");
const registerBox     = document.getElementById("registerBox");
const loginStatus     = document.getElementById("loginStatus");
const regStatus       = document.getElementById("regStatus");
const steamPreviewBox = document.getElementById("steamPreview");

let currentSteamAvatar = "";

///////////////////////////////////////////////////////
// HELPERS
///////////////////////////////////////////////////////
function setStatus(el, msg, isError = false) {
  el.textContent = msg || "";
  el.className = "status" + (msg ? (isError ? " error" : " success") : "");
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

///////////////////////////////////////////////////////
// CLEAN STEAM TOKEN FROM URL
///////////////////////////////////////////////////////
(function cleanSteamToken() {
  const url = new URL(window.location.href);
  if (url.searchParams.get("steamToken")) {
    url.searchParams.delete("steamToken");
    window.history.replaceState({}, document.title, url.toString());
  }
})();

///////////////////////////////////////////////////////
// AUTH FIX – CHECK IF USER IS LOGGED IN
///////////////////////////////////////////////////////
auth.onAuthStateChanged(user => {
  if (!user) return; // DO NOT redirect to club gate

  const isSteam = user.uid.startsWith("steam:");

  // email users must verify
  if (!isSteam && user.email && !user.emailVerified) return;

  // 🔥 user is fully logged in
  window.location.href = "main.html";
});

///////////////////////////////////////////////////////
// CLUB GATE
///////////////////////////////////////////////////////
function checkCode() {
  const code = document.getElementById("clubCode").value.trim();
  if (code === CLUB_CODE) {
    localStorage.setItem("clubAccess", "yes");
    clubGate.style.display = "none";
    loginBox.style.display = "block";
  } else {
    alert("Неточен код за клубот!");
  }
}

// If user previously passed club gate – skip it
if (localStorage.getItem("clubAccess") === "yes") {
  clubGate.style.display = "none";
  loginBox.style.display = "block";
}

///////////////////////////////////////////////////////
// SWITCH LOGIN/REGISTER
///////////////////////////////////////////////////////
function showRegister() {
  setStatus(loginStatus, "");
  setStatus(regStatus, "");
  loginBox.style.display = "none";
  registerBox.style.display = "block";
}

function showLogin() {
  setStatus(loginStatus, "");
  setStatus(regStatus, "");
  registerBox.style.display = "none";
  loginBox.style.display = "block";
}

///////////////////////////////////////////////////////
// STEAM ID PREVIEW
///////////////////////////////////////////////////////
async function previewSteamId() {
  const id = document.getElementById("regSteamId").value.trim();

  if (!id) return alert("Внеси Steam32 ID.");

  steamPreviewBox.style.display = "block";
  steamPreviewBox.innerHTML = "Проверувам...";

  try {
    const res  = await fetch(`https://api.opendota.com/api/players/${id}`);
    const data = await res.json();

    if (!data || !data.profile) {
      steamPreviewBox.style.display = "none";
      steamPreviewBox.innerHTML = "";
      return alert("Не е пронајден играч со ова Steam32 ID.");
    }

    const nameFromSteam   = data.profile.personaname || "";
    const avatarFromSteam = data.profile.avatarfull || "";

    currentSteamAvatar = avatarFromSteam;

    const usernameInput = document.getElementById("regUsername");

    if (!usernameInput.value.trim() && nameFromSteam)
      usernameInput.value = nameFromSteam;

    steamPreviewBox.innerHTML = `
      <strong>Пронајден Dota профил:</strong><br>
      Име: ${escapeHtml(nameFromSteam)}<br>
      Dota ID: ${data.profile.account_id}
      ${avatarFromSteam ? `<img src="${avatarFromSteam}" />` : ""}
    `;

  } catch (err) {
    console.error(err);
    alert("Грешка при поврзување со OpenDota.");
  }
}

///////////////////////////////////////////////////////
// REGISTER USER
///////////////////////////////////////////////////////
async function register() {
  const username = regUsername.value.trim();
  const email    = regEmail.value.trim();
  const pass     = regPass.value.trim();
  const pass2    = regConfirmPass.value.trim();
  const steamId  = regSteamId.value.trim();

  setStatus(regStatus, "");

  if (!username || !email || !pass || !pass2 || !steamId)
    return setStatus(regStatus, "Пополнете ги сите полиња.", true);

  if (pass !== pass2)
    return setStatus(regStatus, "Лозинките не се совпаѓаат.", true);

  try {
    setStatus(regStatus, "Се креира профил...");

    const userCred = await auth.createUserWithEmailAndPassword(email, pass);
    const user = userCred.user;

    await user.updateProfile({ displayName: username });

    await db.collection("users").doc(user.uid).set({
      username,
      email,
      steamId,
      role: "member",
      banned: false,
      avatarUrl: currentSteamAvatar || "",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
      online: true
    });

    await user.sendEmailVerification();
    alert("Провери го email-от за верификација.");
    showLogin();

  } catch (err) {
    console.error(err);
    setStatus(regStatus, "Грешка: " + err.message, true);
  }
}

///////////////////////////////////////////////////////
// LOGIN USER
///////////////////////////////////////////////////////
async function login() {
  const email = loginEmail.value.trim();
  const pass  = loginPass.value.trim();

  setStatus(loginStatus, "");

  if (!email || !pass)
    return setStatus(loginStatus, "Внеси email и лозинка.", true);

  try {
    setStatus(loginStatus, "Се логираме...");

    const res = await auth.signInWithEmailAndPassword(email, pass);

    if (!res.user.emailVerified) {
      await auth.signOut();
      return setStatus(loginStatus, "Прво потврди го email-от.", true);
    }

    window.location.href = "main.html";

  } catch (err) {
    console.error(err);
    setStatus(loginStatus, "Грешка: " + err.message, true);
  }
}

///////////////////////////////////////////////////////
// RESET PASSWORD
///////////////////////////////////////////////////////
function openResetModal() {
  document.getElementById("resetModal").style.display = "flex";
}

function closeResetModal() {
  document.getElementById("resetModal").style.display = "none";
  document.getElementById("resetStatus").textContent = "";
  document.getElementById("resetEmail").value = "";
}

async function sendResetEmail() {
  const email       = resetEmail.value.trim();
  const resetStatus = document.getElementById("resetStatus");

  if (!email)
    return setStatus(resetStatus, "Внеси email.", true);

  try {
    await auth.sendPasswordResetEmail(email);
    setStatus(resetStatus, "Испратен е линк за ресетирање!");
  } catch (err) {
    console.error(err);
    setStatus(resetStatus, "Грешка: " + err.message, true);
  }
}
