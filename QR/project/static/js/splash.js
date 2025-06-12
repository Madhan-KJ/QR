window.addEventListener('load', function () {
  const splashScreen = document.getElementById('splash-screen');
  const appContent = document.getElementById('app-content');

  // 1. Apply theme class
  const theme = localStorage.getItem('theme') || 'light'; // default to light
  splashScreen.classList.add(theme === 'dark' ? 'splash-dark' : 'splash-light');

  // 2. Splash logic
  const minDisplayTime = 2000; // minimum time in ms
  const maxDisplayTime = 5000;
  const loadStartTime = Date.now();

  function hideSplash() {
    const elapsed = Date.now() - loadStartTime;
    if (elapsed < minDisplayTime) {
      setTimeout(hideSplash, minDisplayTime - elapsed);
      return;
    }

    splashScreen.style.opacity = '0';
    setTimeout(() => {
      splashScreen.style.display = 'none';
      // 👇 redirect or show app content
      window.location.href = "/main"; // redirect if needed
      appContent.style.display = 'block';
      initializeApp();
    }, 500); // match CSS transition
  }

  if (document.readyState === 'complete') {
    hideSplash();
  } else {
    window.addEventListener('load', hideSplash);
  }

  // fallback
  setTimeout(hideSplash, maxDisplayTime);
});

function initializeApp() {
  // Apply dark mode on page load (for pages without toggle button)
  // For non-toggle pages
document.addEventListener('DOMContentLoaded', function() {
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
    }
});
  console.log('App initialized!');
}

