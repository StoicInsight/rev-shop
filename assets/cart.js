/* Rêveur — AJAX cart: add/change line items, refresh drawer + cart page via Section Rendering API */
(function () {
  'use strict';

  var routes = (window.Reveur && window.Reveur.routes) || {};
  var settings = (window.Reveur && window.Reveur.settings) || {};
  var strings = (window.Reveur && window.Reveur.strings) || {};

  function sectionUrl(sectionId) {
    var base = routes.cart_url || '/cart';
    return base + '?section_id=' + sectionId + '&t=' + Date.now();
  }

  function parseSection(html, rootId) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.getElementById(rootId);
  }

  function swapSection(sectionId, rootId) {
    var current = document.getElementById(rootId);
    if (!current) return Promise.resolve();
    return fetch(sectionUrl(sectionId))
      .then(function (res) { return res.text(); })
      .then(function (html) {
        var fresh = parseSection(html, rootId);
        var target = document.getElementById(rootId);
        if (fresh && target) {
          var wasHidden = target.hidden;
          target.replaceWith(fresh);
          fresh.hidden = wasHidden;
        }
      });
  }

  function updateCartCount(count) {
    document.querySelectorAll('[data-cart-count]').forEach(function (el) {
      el.textContent = count;
    });
  }

  function refreshCartCount() {
    return fetch((routes.cart_url || '/cart') + '.js')
      .then(function (res) { return res.json(); })
      .then(function (cart) {
        updateCartCount(cart.item_count);
        return cart;
      });
  }

  function refreshAll() {
    return Promise.all([
      swapSection('cart-drawer', 'CartDrawer'),
      swapSection('main-cart', 'MainCart')
    ]).then(refreshCartCount);
  }

  function openDrawer() {
    var drawer = document.getElementById('CartDrawer');
    if (!drawer) return;
    drawer.hidden = false;
    document.body.style.overflow = 'hidden';
    var closeBtn = drawer.querySelector('[data-cart-drawer-close]');
    if (closeBtn) closeBtn.focus();
  }

  function closeDrawer() {
    var drawer = document.getElementById('CartDrawer');
    if (!drawer || drawer.hidden) return;
    drawer.hidden = true;
    document.body.style.overflow = '';
  }

  function setLineLoading(key, loading) {
    document.querySelectorAll('[data-cart-line][data-line-key="' + CSS.escape(key) + '"]').forEach(function (el) {
      el.classList.toggle('is-loading', loading);
    });
  }

  function handleError(err) {
    window.Reveur.showToast && window.Reveur.showToast((err && err.data && err.data.description) || strings.cartError);
  }

  var api = {
    addItem: function (body) {
      return fetch((routes.cart_add_url || '/cart/add') + '.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body)
      })
        .then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok) {
              var err = new Error((data && data.description) || 'Cart error');
              err.data = data;
              throw err;
            }
            return data;
          });
        })
        .then(function (item) {
          return refreshAll().then(function () { return item; });
        });
    },
    changeItem: function (key, quantity) {
      setLineLoading(key, true);
      return fetch((routes.cart_change_url || '/cart/change') + '.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ id: key, quantity: quantity })
      })
        .then(function (res) { return res.json(); })
        .then(function (cart) {
          return refreshAll().then(function () { return cart; });
        });
    },
    open: openDrawer,
    close: closeDrawer,
    refresh: refreshAll
  };

  window.Reveur = window.Reveur || {};
  window.Reveur.cart = api;

  /* Event delegation --------------------------------------------------- */

  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-cart-drawer-open]');
    if (opener) {
      if (settings.cartType === 'page') return;
      e.preventDefault();
      openDrawer();
      return;
    }

    if (e.target.closest('[data-cart-drawer-close]')) {
      closeDrawer();
      return;
    }

    var removeBtn = e.target.closest('[data-cart-line-remove]');
    if (removeBtn) {
      e.preventDefault();
      api.changeItem(removeBtn.getAttribute('data-line-key'), 0).catch(handleError);
      return;
    }

    var incBtn = e.target.closest('[data-quantity-increase]');
    var decBtn = e.target.closest('[data-quantity-decrease]');
    if (incBtn || decBtn) {
      var selector = (incBtn || decBtn).closest('[data-quantity-selector]');
      if (!selector) return;
      var input = selector.querySelector('[data-quantity-input]');
      if (!input) return;
      var min = parseInt(input.getAttribute('min'), 10) || 0;
      var max = input.getAttribute('max') ? parseInt(input.getAttribute('max'), 10) : null;
      var value = parseInt(input.value, 10) || 0;
      value = incBtn ? value + 1 : value - 1;
      value = Math.max(min, value);
      if (max !== null) value = Math.min(max, value);
      input.value = value;

      var lineKey = selector.getAttribute('data-line-key');
      if (lineKey) {
        api.changeItem(lineKey, value).catch(handleError);
      } else {
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  });

  document.addEventListener('change', function (e) {
    var input = e.target.closest('[data-quantity-input]');
    if (!input) return;
    var selector = input.closest('[data-quantity-selector]');
    var lineKey = selector && selector.getAttribute('data-line-key');
    if (!lineKey) return;
    var value = Math.max(0, parseInt(input.value, 10) || 0);
    api.changeItem(lineKey, value).catch(handleError);
  });

  window.addEventListener('pageshow', function (e) {
    if (e.persisted) refreshCartCount();
  });
})();
