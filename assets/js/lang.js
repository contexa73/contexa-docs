/**
 * Language switcher handler.
 * Saves selected language to localStorage for root redirect.
 */
(function () {
  'use strict';

  document.addEventListener('click', function (e) {
    var option = e.target.closest('.lang-option');
    if (!option) return;

    var lang = option.getAttribute('data-lang');
    if (lang) {
      localStorage.setItem('contexa-lang', lang);
    }
  });
})();
