/**
 * Contexa Header Search Modal
 * Full-text search across all documentation pages.
 * Loads search-index-{lang}.json generated at build time.
 */
(function () {
  'use strict';

  var navPages = [];
  var fullIndex = [];
  var fullIndexLoaded = false;
  var modal, input, results;
  var activeIndex = -1;

  // Detect current language from URL or html lang
  function detectLang() {
    var path = window.location.pathname;
    if (path.indexOf('/ko/') !== -1) return 'ko';
    var htmlLang = document.documentElement.lang;
    return htmlLang === 'ko' ? 'ko' : 'en';
  }

  // Build nav index from sidebar links (fast, immediate)
  function buildNavIndex() {
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

      var pathParts = href.replace(/\.html$/, '').split('/').filter(Boolean);
      var section = pathParts.length > 2 ? pathParts[pathParts.length - 2] : '';

      navPages.push({
        title: title,
        href: href,
        section: section,
        searchText: (title + ' ' + section + ' ' + href).toLowerCase()
      });
    });
  }

  // Load full-text index (async, on first search)
  function loadFullIndex(callback) {
    if (fullIndexLoaded) { callback(); return; }

    var lang = detectLang();
    var indexUrl = '/assets/search-index-' + lang + '.json';

    var xhr = new XMLHttpRequest();
    xhr.open('GET', indexUrl, true);
    xhr.onload = function () {
      if (xhr.status === 200) {
        try {
          var data = JSON.parse(xhr.responseText);
          fullIndex = data.map(function (item) {
            return {
              title: item.t,
              path: item.p,
              headings: item.h || '',
              content: item.c || '',
              searchText: (item.t + ' ' + (item.h || '') + ' ' + (item.c || '')).toLowerCase()
            };
          });
          fullIndexLoaded = true;
        } catch (e) {
          console.error('Search index parse error:', e);
        }
      }
      callback();
    };
    xhr.onerror = function () { callback(); };
    xhr.send();
  }

  function init() {
    modal = document.getElementById('searchModal');
    input = document.getElementById('searchModalInput');
    results = document.getElementById('searchModalResults');

    if (!modal || !input || !results) return;

    buildNavIndex();

    var btn = document.querySelector('.header-search-btn');
    if (btn) {
      btn.addEventListener('click', openModal);
    }

    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (modal.classList.contains('open')) closeModal();
        else openModal();
      }
      if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
    });

    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });

    input.addEventListener('input', function () {
      var query = input.value.trim().toLowerCase();
      if (!query) { results.innerHTML = ''; activeIndex = -1; return; }

      // Search nav pages immediately
      var navResults = searchNav(query);
      renderResults(navResults, [], query);

      // Load full index and search
      loadFullIndex(function () {
        var contentResults = searchContent(query);
        renderResults(navResults, contentResults, query);
      });
    });

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
        if (items[activeIndex]) window.location.href = items[activeIndex].href;
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

  function searchNav(query) {
    var terms = query.split(/\s+/);
    return navPages.filter(function (page) {
      return terms.every(function (term) {
        return page.searchText.indexOf(term) !== -1;
      });
    }).slice(0, 5);
  }

  function searchContent(query) {
    var terms = query.split(/\s+/);
    var matches = fullIndex.filter(function (page) {
      return terms.every(function (term) {
        return page.searchText.indexOf(term) !== -1;
      });
    });

    // Score: title match > heading match > content match
    matches.forEach(function (m) {
      m.score = 0;
      var titleLower = m.title.toLowerCase();
      var headingsLower = m.headings.toLowerCase();
      terms.forEach(function (term) {
        if (titleLower.indexOf(term) !== -1) m.score += 10;
        if (headingsLower.indexOf(term) !== -1) m.score += 5;
      });
    });

    matches.sort(function (a, b) { return b.score - a.score; });
    return matches.slice(0, 10);
  }

  function getSnippet(content, query) {
    var terms = query.split(/\s+/);
    var lower = content.toLowerCase();
    var bestPos = -1;

    for (var i = 0; i < terms.length; i++) {
      var pos = lower.indexOf(terms[i]);
      if (pos !== -1) { bestPos = pos; break; }
    }

    if (bestPos === -1) return content.substring(0, 120) + '...';

    var start = Math.max(0, bestPos - 40);
    var end = Math.min(content.length, bestPos + 80);
    var snippet = (start > 0 ? '...' : '') + content.substring(start, end) + (end < content.length ? '...' : '');

    // Highlight terms
    terms.forEach(function (term) {
      var regex = new RegExp('(' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      snippet = snippet.replace(regex, '<mark>$1</mark>');
    });

    return snippet;
  }

  function renderResults(navResults, contentResults, query) {
    results.innerHTML = '';
    activeIndex = -1;

    var hasNav = navResults.length > 0;
    var hasContent = contentResults.length > 0;

    if (!hasNav && !hasContent) {
      var lang = detectLang();
      var noResult = lang === 'ko' ? '검색 결과가 없습니다' : 'No results found';
      results.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-tertiary);font-size:0.875rem;">' + noResult + '</div>';
      return;
    }

    // Nav results
    if (hasNav) {
      var navGroup = document.createElement('div');
      navGroup.className = 'search-results-group';
      var navLabel = document.createElement('div');
      navLabel.className = 'search-group-label';
      navLabel.textContent = detectLang() === 'ko' ? '페이지' : 'Pages';
      navGroup.appendChild(navLabel);

      navResults.forEach(function (page) {
        var a = document.createElement('a');
        a.className = 'search-result-item';
        a.href = page.href;

        var title = document.createElement('span');
        title.className = 'search-result-title';
        title.textContent = page.title;

        var pathEl = document.createElement('span');
        pathEl.className = 'search-result-path';
        pathEl.textContent = page.section ? page.section + ' / ' + page.title : page.href;

        a.appendChild(title);
        a.appendChild(pathEl);
        navGroup.appendChild(a);
      });
      results.appendChild(navGroup);
    }

    // Content results
    if (hasContent) {
      var contentGroup = document.createElement('div');
      contentGroup.className = 'search-results-group';
      var contentLabel = document.createElement('div');
      contentLabel.className = 'search-group-label';
      contentLabel.textContent = detectLang() === 'ko' ? '문서 내용' : 'Documentation';
      contentGroup.appendChild(contentLabel);

      contentResults.forEach(function (page) {
        var a = document.createElement('a');
        a.className = 'search-result-item';
        a.href = page.path;

        var title = document.createElement('span');
        title.className = 'search-result-title';
        title.textContent = page.title;

        var snippet = document.createElement('span');
        snippet.className = 'search-result-snippet';
        snippet.innerHTML = getSnippet(page.content, query);

        a.appendChild(title);
        a.appendChild(snippet);
        contentGroup.appendChild(a);
      });
      results.appendChild(contentGroup);
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
    document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 300); });
  } else {
    setTimeout(init, 300);
  }
})();
