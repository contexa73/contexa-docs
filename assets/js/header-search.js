/**
 * Contexa Header Search Modal
 * Command palette style search (Ctrl+K) that searches through all doc pages.
 */
(function () {
  'use strict';

  // Page index built from sidebar links and navigation
  var pages = [];
  var modal, input, results;
  var activeIndex = -1;

  function buildIndex() {
    // Collect from sidebar if present
    var sidebarLinks = document.querySelectorAll('.sidebar-link, .dropdown-link, .mobile-nav-link');
    var seen = {};

    sidebarLinks.forEach(function (link) {
      var href = link.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('#') || seen[href]) return;
      seen[href] = true;

      var title = '';
      var titleEl = link.querySelector('.dropdown-link-title');
      if (titleEl) {
        title = titleEl.textContent.trim();
      } else {
        title = link.textContent.trim();
      }

      if (!title) return;

      // Build path from href
      var pathParts = href.replace(/\.html$/, '').split('/').filter(Boolean);
      var section = pathParts.length > 2 ? pathParts[pathParts.length - 2] : '';

      pages.push({
        title: title,
        href: href,
        section: section,
        searchText: (title + ' ' + section + ' ' + href).toLowerCase()
      });
    });
  }

  function init() {
    modal = document.getElementById('searchModal');
    input = document.getElementById('searchModalInput');
    results = document.getElementById('searchModalResults');

    if (!modal || !input || !results) return;

    buildIndex();

    // Header search button
    var btn = document.querySelector('.header-search-btn');
    if (btn) {
      btn.addEventListener('click', openModal);
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (modal.classList.contains('open')) {
          closeModal();
        } else {
          openModal();
        }
      }
      if (e.key === 'Escape' && modal.classList.contains('open')) {
        closeModal();
      }
    });

    // Close on overlay click
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });

    // Search input
    input.addEventListener('input', function () {
      search(input.value.trim().toLowerCase());
    });

    // Keyboard navigation
    input.addEventListener('keydown', function (e) {
      var items = results.querySelectorAll('.search-result-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, items.length - 1);
        updateActive(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        updateActive(items);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (items[activeIndex]) {
          window.location.href = items[activeIndex].href;
        }
      }
    });
  }

  function openModal() {
    modal.classList.add('open');
    input.value = '';
    results.innerHTML = '';
    activeIndex = -1;
    setTimeout(function () { input.focus(); }, 50);
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  function search(query) {
    results.innerHTML = '';
    activeIndex = -1;

    if (!query) return;

    var terms = query.split(/\s+/);
    var matches = pages.filter(function (page) {
      return terms.every(function (term) {
        return page.searchText.indexOf(term) !== -1;
      });
    });

    matches.slice(0, 10).forEach(function (page) {
      var a = document.createElement('a');
      a.className = 'search-result-item';
      a.href = page.href;

      var title = document.createElement('span');
      title.className = 'search-result-title';
      title.textContent = page.title;

      var path = document.createElement('span');
      path.className = 'search-result-path';
      path.textContent = page.section ? page.section + ' / ' + page.title : page.href;

      a.appendChild(title);
      a.appendChild(path);
      results.appendChild(a);
    });

    if (matches.length === 0) {
      results.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-tertiary);font-size:0.875rem;">No results found</div>';
    }
  }

  function updateActive(items) {
    items.forEach(function (item, i) {
      item.classList.toggle('active', i === activeIndex);
    });
    if (items[activeIndex]) {
      items[activeIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(init, 300);
    });
  } else {
    setTimeout(init, 300);
  }
})();
