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
// CLEAN STEAM TOKEN FROM URL (ONLY IN INDEX)
///////////////////////////////////////////////////////
let hasSteamToken = false;
(function cleanSteamToken() {
  const url = new URL(window.location.href);
  if (url.searchParams.get("steamToken")) {
    hasSteamToken = true; // important!
    url.searchParams.delete("steamToken");
    window.history.replaceState({}, document.title, url.toString());
  }
})();

///////////////////////////////////////////////////////
// AUTH FIX — RUN ONLY IF NO STEAM TOKEN
///////////////////////////////////////////////////////
if (!hasSteamToken) {
  auth.onAuthStateChanged(async user => {
    if (!user) return;

    // allow steam users without email
    const isSteam = user.uid.startsWith("steam:");

    if (!isSteam && user.email && !user.emailVerified) return;

    // if already logged → go to main
    window.location.href = "main.html";
  });
}

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

// skip code if already passed
if (localStorage.getItem("clubAccess") === "yes") {
  clubGate.style.display = "none";
  loginBox.style.display = "block";
}

///////////////////////////////////////////////////////
// SWITCH LOGIN / REGISTER
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

    if (!data || !data.profile)
      return alert("Не постои Dota профил со ова ID.");

    const name  = data.profile.personaname || "";
    const avatar = data.profile.avatarfull || "";

    currentSteamAvatar = avatar;

    if (!regUsername.value.trim() && name)
      regUsername.value = name;

    steamPreviewBox.innerHTML = `
      <strong>Детали:</strong><br>
      Име: ${escapeHtml(name)}<br>
      Dota ID: ${data.profile.account_id}
      ${avatar ? `<img src="${avatar}" />` : ""}
    `;

  } catch {
    alert("OpenDota не работи моментално.");
  }
}

///////////////////////////////////////////////////////
// REGISTER
///////////////////////////////////////////////////////
async function register() {
  const username = regUsername.value.trim();
  const email    = regEmail.value.trim();
  const pass     = regPass.value.trim();
  const pass2    = regConfirmPass.value.trim();
  const steamId  = regSteamId.value.trim();

  if (!username || !email || !pass || !pass2 || !steamId)
    return setStatus(regStatus, "Сите полиња се задолжителни.", true);

  if (pass !== pass2)
    return setStatus(regStatus, "Лозинките не се совпаѓаат.", true);

  try {
    const userCred = await auth.createUserWithEmailAndPassword(email, pass);
    const user = userCred.user;

    await user.updateProfile({ displayName: username });

    await db.collection("users").doc(user.uid).set({
      username,
      email,
      steamId,
      role: "member",
      banned: false,
      avatarUrl: currentSteamAvatar,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
      online: true
    });

    await user.sendEmailVerification();
    alert("Провери email за верификација.");
    showLogin();

  } catch (err) {
    setStatus(regStatus, "Грешка: " + err.message, true);
  }
}

///////////////////////////////////////////////////////
// LOGIN
///////////////////////////////////////////////////////
async function login() {
  const email = loginEmail.value.trim();
  const pass  = loginPass.value.trim();

  if (!email || !pass)
    return setStatus(loginStatus, "Внеси email и лозинка.", true);

  try {
    const res = await auth.signInWithEmailAndPassword(email, pass);

    if (!res.user.emailVerified) {
      auth.signOut();
      return setStatus(loginStatus, "Прво потврди го email-от.", true);
    }

    window.location.href = "main.html";

  } catch (err) {
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
  resetStatus.textContent = "";
  resetEmail.value = "";
}

async function sendResetEmail() {
  if (!resetEmail.value.trim())
    return setStatus(resetStatus, "Внеси email.", true);

  try {
    await auth.sendPasswordResetEmail(resetEmail.value.trim());
    setStatus(resetStatus, "Испратена е порака!", false);

  } catch (err) {
    setStatus(resetStatus, "Грешка: " + err.message, true);
  }
}
