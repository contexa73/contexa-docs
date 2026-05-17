/**
 * Contexa Navigation Controller
 * Handles: scroll shadow, mobile menu, dropdown interactions, active state
 */
(function () {
  'use strict';

  var initialized = false;

  function init() {
    if (initialized) return;
    initialized = true;
    initScrollShadow();
    initMobileMenu();
    initDropdowns();
    initActiveNavState();
  }

  /**
   * Adds shadow to header on scroll
   */
  function initScrollShadow() {
    var header = document.querySelector('.site-header');
    if (!header) return;

    var scrollThreshold = 10;

    function onScroll() {
      if (window.scrollY > scrollThreshold) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // Initial check
  }

  /**
   * Mobile menu toggle — Unified Sidebar Drawer
   * Applies the slide-in drawer to ALL pages.
   */
  function initMobileMenu() {
    var toggle = document.querySelector('.mobile-menu-toggle');
    var mobileNav = document.querySelector('.mobile-nav');
    var overlay = document.querySelector('.mobile-nav-overlay');
    var sidebarToggle = document.querySelector('.sidebar-toggle');
    
    if (!toggle || !mobileNav) return;

    // Hide the redundant bottom sidebar-toggle completely
    if (sidebarToggle) sidebarToggle.style.display = 'none';

    // Mark active links
    var currentPath = window.location.pathname.split('#')[0].replace(/\.html$/, '');
    mobileNav.querySelectorAll('a.sidebar-link').forEach(function (link) {
      try {
        var lp = new URL(link.href, window.location.origin).pathname.replace(/\.html$/, '');
        if (currentPath === lp) link.classList.add('active');
      } catch (e) {}
    });

    // Expand section that contains the active link
    mobileNav.querySelectorAll('.sidebar-section').forEach(function (section) {
      if (section.querySelector('.sidebar-link.active')) {
        section.classList.remove('collapsed');
        section.classList.add('has-active');
      } else {
        section.classList.add('collapsed'); // collapse others by default
      }
    });

    // Accordion Toggle Logic
    mobileNav.addEventListener('click', function(e) {
      var title = e.target.closest('.sidebar-section-title');
      if (title) {
        var section = title.closest('.sidebar-section');
        if (section) section.classList.toggle('collapsed');
        return;
      }
    });

    function openMenu() {
      mobileNav.classList.add('open');
      if (overlay) overlay.classList.add('open');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }
    
    function closeMenu() {
      mobileNav.classList.remove('open');
      if (overlay) overlay.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    toggle.addEventListener('click', function () {
      mobileNav.classList.contains('open') ? closeMenu() : openMenu();
    });
    
    if (overlay) {
      overlay.addEventListener('click', closeMenu);
    }

    // Close on link click
    mobileNav.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeMenu();
    });
    
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mobileNav.classList.contains('open')) closeMenu();
    });
  }

  /**
   * Desktop dropdown interactions
   * Uses hover with delay for better UX
   */
  function initDropdowns() {
    var navItems = document.querySelectorAll('.nav-item');
    var closeTimers = {};

    navItems.forEach(function (item, index) {
      var dropdown = item.querySelector('.nav-dropdown');
      if (!dropdown) return;

      item.addEventListener('mouseenter', function () {
        clearTimeout(closeTimers[index]);
        // Close other dropdowns
        navItems.forEach(function (other, otherIndex) {
          if (otherIndex !== index) {
            var otherDropdown = other.querySelector('.nav-dropdown');
            if (otherDropdown) {
              otherDropdown.style.opacity = '0';
              otherDropdown.style.visibility = 'hidden';
            }
          }
        });
        dropdown.style.opacity = '1';
        dropdown.style.visibility = 'visible';
      });

      item.addEventListener('mouseleave', function () {
        closeTimers[index] = setTimeout(function () {
          dropdown.style.opacity = '0';
          dropdown.style.visibility = 'hidden';
        }, 200);
      });

      // Keyboard accessibility
      var link = item.querySelector('.nav-link');
      if (link) {
        link.addEventListener('focus', function () {
          clearTimeout(closeTimers[index]);
          dropdown.style.opacity = '1';
          dropdown.style.visibility = 'visible';
        });
      }

      // Keep dropdown open when focused inside
      dropdown.addEventListener('focusin', function () {
        clearTimeout(closeTimers[index]);
      });

      dropdown.addEventListener('focusout', function (e) {
        if (!item.contains(e.relatedTarget)) {
          closeTimers[index] = setTimeout(function () {
            dropdown.style.opacity = '0';
            dropdown.style.visibility = 'hidden';
          }, 200);
        }
      });
    });

    // Close all dropdowns on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        navItems.forEach(function (item) {
          var dropdown = item.querySelector('.nav-dropdown');
          if (dropdown) {
            dropdown.style.opacity = '0';
            dropdown.style.visibility = 'hidden';
          }
        });
      }
    });
  }

  /**
   * Highlights the current page in the navigation
   */
  function initActiveNavState() {
    var currentPath = window.location.pathname;
    var navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(function (link) {
      var href = link.getAttribute('href');
      if (!href) return;

      // Normalize paths for comparison
      var linkPath = new URL(href, window.location.origin).pathname;

      if (currentPath === linkPath) {
        link.classList.add('active');
      } else if (currentPath.indexOf('/docs/') !== -1 && href.indexOf('/docs/') !== -1) {
        link.classList.add('active');
      }
    });
  }

  // Initialize when includes are loaded, or on DOM ready
  document.addEventListener('contexa:includes-loaded', init);

  // Fallback if includes aren't used
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(init, 100);
    });
  }
})();
