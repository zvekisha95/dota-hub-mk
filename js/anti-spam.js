// ==========================================================
// ZVEKISHA DOTA HUB – ANTI SPAM ENGINE v1.0 FINAL
// Full system for flood protection (frontend + backend safe)
// ==========================================================

// GLOBAL RATE LIMIT CONFIG
const SPAM_CONFIG = {
  commentCooldown: 4000,    // 4 seconds
  threadCooldown: 20000,    // 20 seconds
  maxRapidClicks: 5,        // burst protection
  rapidWindow: 1500,        // time window for burst
};

// LOCAL STORAGE KEYS
const LS_KEYS = {
  lastComment: "zvek_last_comment",
  lastThread: "zvek_last_thread",
  clickHistory: "zvek_click_spam",
};

// ==========================================================
// 1. COMMENT ANTI SPAM
// ==========================================================
function canPostComment() {
  const last = parseInt(localStorage.getItem(LS_KEYS.lastComment) || "0", 10);
  const now = Date.now();

  if (now - last < SPAM_CONFIG.commentCooldown) {
    const wait = Math.ceil((SPAM_CONFIG.commentCooldown - (now - last)) / 1000);
    alert(`🚫 Почекај уште ${wait} секунди пред да коментираш повторно.`);
    return false;
  }

  localStorage.setItem(LS_KEYS.lastComment, now.toString());
  return true;
}

// ==========================================================
// 2. THREAD ANTI SPAM
// ==========================================================
function canCreateThread() {
  const last = parseInt(localStorage.getItem(LS_KEYS.lastThread) || "0", 10);
  const now = Date.now();

  if (now - last < SPAM_CONFIG.threadCooldown) {
    const wait = Math.ceil((SPAM_CONFIG.threadCooldown - (now - last)) / 1000);
    alert(`🚫 Почекај уште ${wait} секунди пред да отвориш нова тема.`);
    return false;
  }

  localStorage.setItem(LS_KEYS.lastThread, now.toString());
  return true;
}

// ==========================================================
// 3. RAPID CLICK PROTECTION (ANTI BOT)
// ==========================================================
function isRapidClick() {
  let history = JSON.parse(localStorage.getItem(LS_KEYS.clickHistory) || "[]");
  const now = Date.now();

  history = history.filter(ts => now - ts < SPAM_CONFIG.rapidWindow);
  history.push(now);

  localStorage.setItem(LS_KEYS.clickHistory, JSON.stringify(history));

  return history.length > SPAM_CONFIG.maxRapidClicks;
}

document.addEventListener("click", () => {
  if (isRapidClick()) {
    alert("⚠️ Полека. Личи како ботско однесување.");
  }
});

// ==========================================================
// 4. HOOKS за интеграција со твоите JS фајлови
// ==========================================================
window.SpamGuard = {
  checkComment: canPostComment,
  checkThread: canCreateThread
};

console.log("🔥 Anti-Spam Engine Loaded – Zvekisha Hub");
