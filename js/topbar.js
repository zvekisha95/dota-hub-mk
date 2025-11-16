// Вчитување на topbar.html во секоја страница
fetch("/topbar.html")
  .then(res => res.text())
  .then(html => {
    document.getElementById("topbar").innerHTML = html;

    // Поправка за профил линкот
    auth.onAuthStateChanged(user => {
      if (user) {
        const link = document.getElementById("profileLink");
        if (link) link.href = `profile.html?id=${user.uid}`;
      }
    });
  });
