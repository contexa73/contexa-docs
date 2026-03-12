/**
 * Contexa Theme Toggle
 * Manages light/dark mode with localStorage persistence and system preference detection.
 */
(function () {
  var STORAGE_KEY = 'contexa-theme';
  var root = document.documentElement;

  function getPreferred() {
    var stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
    return null;
  }

  function apply(theme) {
    root.setAttribute('data-theme', theme);
    updateToggleIcon(theme);
  }

  function updateToggleIcon(theme) {
    var toggles = document.querySelectorAll('.theme-toggle');
    toggles.forEach(function (btn) {
      var sun = btn.querySelector('.theme-icon-sun');
      var moon = btn.querySelector('.theme-icon-moon');
      if (sun && moon) {
        sun.style.display = theme === 'dark' ? 'none' : 'block';
        moon.style.display = theme === 'dark' ? 'block' : 'none';
      }
    });
  }

  function getCurrent() {
    return root.getAttribute('data-theme') || 'light';
  }

  function toggle() {
    var next = getCurrent() === 'dark' ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEY, next);
    apply(next);
  }

  // Initialize on load
  var preferred = getPreferred();
  if (preferred) {
    apply(preferred);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    apply('dark');
  }

  // Listen for system preference changes
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
      if (!localStorage.getItem(STORAGE_KEY)) {
        apply(e.matches ? 'dark' : 'light');
      }
    });
  }

  // Bind toggle buttons
  document.addEventListener('DOMContentLoaded', function () {
    var stored = getPreferred();
    if (stored) {
      apply(stored);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      apply('dark');
    } else {
      updateToggleIcon('light');
    }

    document.querySelectorAll('.theme-toggle').forEach(function (btn) {
      btn.addEventListener('click', toggle);
    });
  });
})();
