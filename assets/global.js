/* Rêveur — global UI: mobile nav, search overlay, toasts, accordions */
(function () {
  'use strict';

  function trapFocus(container, event) {
    if (!container) return;
    var focusable = container.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  window.Reveur = window.Reveur || {};
  window.Reveur.trapFocus = trapFocus;

  function showToast(message) {
    if (!message) return;
    var root = document.getElementById('toast-root');
    if (!root) return;
    var el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.textContent = message;
    root.appendChild(el);
    window.setTimeout(function () {
      el.remove();
    }, 2600);
  }
  window.Reveur.showToast = showToast;

  /* Money formatting, mirrors Shopify's money_format tokens ------------ */

  function formatWithDelimiters(number, precision, thousands, decimal) {
    precision = typeof precision === 'undefined' ? 2 : precision;
    thousands = typeof thousands === 'undefined' ? ',' : thousands;
    decimal = typeof decimal === 'undefined' ? '.' : decimal;
    if (isNaN(number) || number == null) return 0;
    number = (number / 100.0).toFixed(precision);
    var parts = number.split('.');
    var dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
    var cents = parts[1] ? decimal + parts[1] : '';
    return dollars + cents;
  }

  function formatMoney(cents, format) {
    var formatString = format || (window.Reveur.settings && window.Reveur.settings.moneyFormat) || '${{amount}}';
    var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
    var match = formatString.match(placeholderRegex);
    if (!match) return formatString;
    var value;
    switch (match[1]) {
      case 'amount_no_decimals':
        value = formatWithDelimiters(cents, 0);
        break;
      case 'amount_with_comma_separator':
        value = formatWithDelimiters(cents, 2, '.', ',');
        break;
      case 'amount_no_decimals_with_comma_separator':
        value = formatWithDelimiters(cents, 0, '.', ',');
        break;
      default:
        value = formatWithDelimiters(cents, 2);
    }
    return formatString.replace(placeholderRegex, value);
  }
  window.Reveur.formatMoney = formatMoney;

  /* Mobile nav ------------------------------------------------------ */

  var menuToggle = document.querySelector('[data-menu-toggle]');
  var mobileNav = document.getElementById('MobileNav');
  var menuLastFocused = null;

  function openMobileNav() {
    if (!mobileNav) return;
    menuLastFocused = document.activeElement;
    mobileNav.hidden = false;
    document.body.style.overflow = 'hidden';
    if (menuToggle) menuToggle.setAttribute('aria-expanded', 'true');
    var target = mobileNav.querySelector('.mobile-nav__panel a, .mobile-nav__panel button');
    if (target) target.focus();
  }

  function closeMobileNav() {
    if (!mobileNav || mobileNav.hidden) return;
    mobileNav.hidden = true;
    document.body.style.overflow = '';
    if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
    if (menuLastFocused) menuLastFocused.focus();
  }

  if (menuToggle) {
    menuToggle.addEventListener('click', function () {
      if (mobileNav && mobileNav.hidden) openMobileNav();
      else closeMobileNav();
    });
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-menu-close]')) closeMobileNav();
  });

  /* Predictive search overlay ---------------------------------------- */

  var searchEl = document.getElementById('PredictiveSearch');
  var searchLastFocused = null;

  function openSearch() {
    if (!searchEl) return;
    searchLastFocused = document.activeElement;
    searchEl.hidden = false;
    document.body.style.overflow = 'hidden';
    var input = searchEl.querySelector('[data-search-input]');
    if (input) input.focus();
  }

  function closeSearch() {
    if (!searchEl || searchEl.hidden) return;
    searchEl.hidden = true;
    document.body.style.overflow = '';
    if (searchLastFocused) searchLastFocused.focus();
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-search-open]')) {
      e.preventDefault();
      openSearch();
    }
    if (e.target.closest('[data-search-close]')) {
      closeSearch();
    }
  });

  /* Shared escape / tab handling --------------------------------------- */

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (searchEl && !searchEl.hidden) { closeSearch(); return; }
      if (mobileNav && !mobileNav.hidden) { closeMobileNav(); return; }
      var cartDrawer = document.getElementById('CartDrawer');
      if (cartDrawer && !cartDrawer.hidden && window.Reveur.cart) {
        window.Reveur.cart.close();
      }
      return;
    }
    if (e.key === 'Tab') {
      if (searchEl && !searchEl.hidden) trapFocus(searchEl.querySelector('.predictive-search__panel'), e);
      else if (mobileNav && !mobileNav.hidden) trapFocus(mobileNav.querySelector('.mobile-nav__panel'), e);
    }
  });

  /* Account: address book + login/recover toggles ------------------------ */

  document.addEventListener('click', function (e) {
    var newToggle = e.target.closest('[data-address-new-toggle]');
    if (newToggle) {
      var panel = document.querySelector('[data-address-new-form]');
      if (panel) panel.hidden = !panel.hidden;
    }

    var recoverToggle = e.target.closest('[data-recover-toggle]');
    if (recoverToggle) {
      var loginPanel = document.querySelector('[data-login-form-panel]');
      var recoverPanel = document.querySelector('[data-recover-panel]');
      if (loginPanel && recoverPanel) {
        var showingRecover = !recoverPanel.hidden;
        loginPanel.hidden = showingRecover;
        recoverPanel.hidden = !showingRecover;
      }
    }
  });

  document.addEventListener('submit', function (e) {
    var confirmBtn = e.submitter && e.submitter.closest && e.submitter.closest('[data-confirm]');
    if (confirmBtn && !window.confirm(confirmBtn.getAttribute('data-confirm'))) {
      e.preventDefault();
    }
  });

  /* Newsletter client-side validation ----------------------------------- */

  document.querySelectorAll('[data-newsletter-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      var email = form.querySelector('input[type="email"]');
      if (email && (!email.value || email.value.indexOf('@') === -1)) {
        e.preventDefault();
        showToast(form.getAttribute('data-error-message'));
        email.focus();
      }
    });
  });
})();
