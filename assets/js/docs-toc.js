/**
 * Contexa Documentation Table of Contents
 * Renders TOC in right sidebar (#docs-toc-sidebar) with sticky positioning and scroll-spy.
 * Supports SPA re-initialization when sidebar navigation loads new content.
 */
(function () {
  'use strict';

  var scrollHandler = null;

  function init() {
    var content = document.querySelector('.docs-content-inner');
    var tocSidebar = document.getElementById('docs-toc-sidebar');
    if (!content) return;

    // Clean up previous TOC
    if (tocSidebar) tocSidebar.innerHTML = '';
    // Also remove any old inline TOC
    var oldToc = content.querySelector('.docs-toc');
    if (oldToc) oldToc.remove();
    // Remove previous scroll handler
    if (scrollHandler) {
      window.removeEventListener('scroll', scrollHandler);
      scrollHandler = null;
    }

    var headings = content.querySelectorAll('h2[id], h3[id]');
    if (headings.length < 2) return;

    // Build TOC
    var toc = document.createElement('nav');
    toc.className = 'docs-toc';
    toc.setAttribute('aria-label', 'On this page');

    var title = document.createElement('div');
    title.className = 'docs-toc-title';

    // Detect language
    var lang = document.documentElement.lang;
    title.textContent = lang === 'ko' ? '이 페이지' : 'On This Page';

    var list = document.createElement('ul');
    list.className = 'docs-toc-list';

    headings.forEach(function (heading) {
      var li = document.createElement('li');
      li.className = heading.tagName === 'H3' ? 'docs-toc-item docs-toc-sub' : 'docs-toc-item';

      var link = document.createElement('a');
      link.href = '#' + heading.id;
      link.className = 'docs-toc-link';
      link.textContent = heading.textContent.replace(/\s*#\s*$/, '');

      link.addEventListener('click', function (e) {
        e.preventDefault();
        heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.replaceState(null, '', '#' + heading.id);
      });

      li.appendChild(link);
      list.appendChild(li);
    });

    toc.appendChild(title);
    toc.appendChild(list);

    // Insert into right sidebar if available, else inline
    if (tocSidebar) {
      tocSidebar.appendChild(toc);
    } else {
      var pageHeader = content.querySelector('.docs-page-header');
      if (pageHeader && pageHeader.nextSibling) {
        pageHeader.parentNode.insertBefore(toc, pageHeader.nextSibling);
      } else {
        content.insertBefore(toc, content.firstChild);
      }
    }

    // Scroll spy
    initScrollSpy(headings, list);
  }

  function initScrollSpy(headings, list) {
    var links = list.querySelectorAll('.docs-toc-link');
    var ticking = false;

    function update() {
      var scrollTop = window.scrollY;
      var offset = 120;
      var currentIndex = -1;

      for (var i = 0; i < headings.length; i++) {
        if (headings[i].offsetTop - offset <= scrollTop) {
          currentIndex = i;
        }
      }

      links.forEach(function (link, i) {
        link.classList.toggle('active', i === currentIndex);
      });
    }

    scrollHandler = function () {
      if (!ticking) {
        requestAnimationFrame(function () {
          update();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', scrollHandler, { passive: true });
    update();
  }

  // Expose for SPA re-initialization
  window.contexaInitTOC = init;

  // Initialize on page load
  document.addEventListener('contexa:includes-loaded', init);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(init, 250);
    });
  } else {
    setTimeout(init, 250);
  }
})();
