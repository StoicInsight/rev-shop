/* Rêveur — product page: variant selection, gallery sync, add to cart */
(function () {
  'use strict';

  var strings = (window.Reveur && window.Reveur.strings) || {};
  var formatMoney = (window.Reveur && window.Reveur.formatMoney) || function (c) { return c; };

  var form = document.querySelector('[data-product-form]');
  if (!form) return;

  var variantsEl = form.querySelector('[data-product-variants]');
  var variants = [];
  try { variants = JSON.parse(variantsEl.textContent); } catch (e) { variants = []; }

  var idInput = form.querySelector('[data-selected-variant-id]');
  var groups = Array.prototype.slice.call(form.querySelectorAll('[data-option-group]'));
  var addBtn = form.querySelector('[data-add-to-cart]');
  var addBtnText = form.querySelector('[data-add-to-cart-text]');
  var priceWrapper = form.querySelector('[data-price-wrapper]');
  var stockLabel = form.querySelector('[data-stock-label]');
  var qtyInput = form.querySelector('[data-quantity-input]');

  var selections = {};
  var userSelectedSize = false;
  var sizePosition = null;

  groups.forEach(function (group) {
    var pos = group.getAttribute('data-option-position');
    var isSize = group.getAttribute('data-option-name').toLowerCase() === 'size';
    if (isSize) sizePosition = pos;
    var selectedBtn = group.querySelector('.is-selected');
    selections[pos] = selectedBtn ? selectedBtn.getAttribute('data-value') : null;
  });

  function matchVariant(sel, requireComplete) {
    return variants.find(function (v) {
      return Object.keys(sel).every(function (pos) {
        if (sel[pos] == null) return !requireComplete;
        return v['option' + pos] === sel[pos];
      });
    });
  }

  function variantForFullSelection() {
    var complete = Object.keys(selections).every(function (pos) { return selections[pos] != null; });
    if (!complete) return null;
    return matchVariant(selections, true);
  }

  function bestMatchVariant() {
    return matchVariant(selections, false) || variants[0];
  }

  function updateAvailability() {
    groups.forEach(function (group) {
      var pos = group.getAttribute('data-option-position');
      group.querySelectorAll('[data-option-value]').forEach(function (btn) {
        var testSel = {};
        Object.keys(selections).forEach(function (p) { testSel[p] = selections[p]; });
        testSel[pos] = btn.getAttribute('data-value');
        var match = matchVariant(testSel, false);
        var available = !!(match && match.available);
        btn.classList.toggle('is-unavailable', !available);
      });
    });
  }

  function updatePrice(variant) {
    if (!priceWrapper || !variant) return;
    var onSale = variant.compare_at_price && variant.compare_at_price > variant.price;
    var html = '<span class="price font-accent' + (onSale ? ' price--sale' : '') + '">' +
      '<span class="price__current">' + formatMoney(variant.price) + '</span>';
    if (onSale) {
      html += '<span class="price__compare">' + formatMoney(variant.compare_at_price) + '</span>';
    }
    html += '</span>';
    priceWrapper.innerHTML = html;
  }

  function updateStockLabel(variant, sizeChosen) {
    if (!stockLabel) return;
    if (!variant || !variant.available) {
      stockLabel.textContent = strings.soldOut || '';
      return;
    }
    if (!sizeChosen) {
      stockLabel.textContent = strings.selectASize || '';
      return;
    }
    if (variant.inventory_management && variant.inventory_quantity != null && variant.inventory_quantity <= 10) {
      var sizeVal = sizePosition ? selections[sizePosition] : '';
      stockLabel.textContent = (strings.stockLeft || '')
        .replace('__COUNT__', Math.max(variant.inventory_quantity, 0))
        .replace('__SIZE__', sizeVal || '');
    } else {
      stockLabel.textContent = '';
    }
  }

  function updateAddButton(variant, sizeChosen) {
    if (!addBtn || !addBtnText) return;
    var qty = qtyInput ? (parseInt(qtyInput.value, 10) || 1) : 1;
    var available = !!(variant && variant.available);
    addBtn.disabled = !available;
    addBtn.classList.toggle('is-disabled', !available);
    if (!available) {
      addBtnText.textContent = strings.soldOut || '';
    } else {
      addBtnText.textContent = (strings.addToCartWithPrice || '').replace('__PRICE__', formatMoney(variant.price * qty));
    }
  }

  function updateURL(variant) {
    if (!variant || !window.history || !history.replaceState) return;
    var url = new URL(window.location.href);
    url.searchParams.set('variant', variant.id);
    history.replaceState({}, '', url);
  }

  function refresh() {
    var sizeChosen = sizePosition == null || selections[sizePosition] != null;
    var variant = variantForFullSelection() || bestMatchVariant();

    if (idInput && variant) {
      idInput.value = variant.id;
      idInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    updatePrice(variant);
    updateStockLabel(variant, sizeChosen);
    updateAddButton(variant, sizeChosen);
    updateAvailability();
    updateURL(variantForFullSelection());

    if (variant && variant.featured_image && window.Reveur.activateGalleryMedia) {
      window.Reveur.activateGalleryMedia(String(variant.featured_image.id));
    }
  }

  form.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-option-value]');
    if (btn) {
      var group = btn.closest('[data-option-group]');
      var pos = group.getAttribute('data-option-position');
      selections[pos] = btn.getAttribute('data-value');

      group.querySelectorAll('[data-option-value]').forEach(function (b) {
        var isSelected = b === btn;
        b.classList.toggle('is-selected', isSelected);
        b.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      });

      if (pos === sizePosition) {
        userSelectedSize = true;
        var errorEl = group.querySelector('[data-size-error]');
        if (errorEl) errorEl.hidden = true;
        var suffixWrap = group.querySelector('[data-selected-value-suffix]');
        var suffix = group.querySelector('[data-selected-value-text]');
        if (suffix) suffix.textContent = selections[pos];
        if (suffixWrap) suffixWrap.hidden = false;
      }

      refresh();
      return;
    }

    var guideToggle = e.target.closest('[data-size-guide-toggle]');
    if (guideToggle) {
      var details = document.getElementById('SizeGuide');
      if (details) {
        var open = !details.open;
        details.open = open;
        guideToggle.setAttribute('aria-expanded', String(open));
      }
    }
  });

  if (qtyInput) {
    qtyInput.addEventListener('change', refresh);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    if (sizePosition != null && !userSelectedSize) {
      var group = form.querySelector('[data-option-group][data-option-position="' + sizePosition + '"]');
      var errorEl = group && group.querySelector('[data-size-error]');
      if (errorEl) errorEl.hidden = false;
      window.Reveur.showToast && window.Reveur.showToast(strings.selectSizeFirst);
      return;
    }

    var variant = variantForFullSelection();
    if (!variant || !variant.available) {
      window.Reveur.showToast && window.Reveur.showToast(strings.productSoldOut);
      return;
    }

    if (!window.Reveur.cart) return;
    addBtn.disabled = true;
    addBtn.classList.add('is-loading');
    var qty = qtyInput ? (parseInt(qtyInput.value, 10) || 1) : 1;

    window.Reveur.cart.addItem({ id: variant.id, quantity: qty })
      .then(function (item) {
        var title = item.product_title || item.title || '';
        window.Reveur.showToast && window.Reveur.showToast((strings.addedToCart || '').replace('__TITLE__', title));
      })
      .catch(function (err) {
        window.Reveur.showToast && window.Reveur.showToast((err && err.data && err.data.description) || strings.cartError);
      })
      .finally(function () {
        addBtn.disabled = false;
        addBtn.classList.remove('is-loading');
        refresh();
      });
  });

  /* Gallery -------------------------------------------------------------- */

  var gallery = document.querySelector('[data-product-gallery]');
  if (gallery) {
    gallery.addEventListener('click', function (e) {
      var thumb = e.target.closest('[data-gallery-thumb]');
      if (thumb) activateMedia(thumb.getAttribute('data-media-id'));
    });

    function activateMedia(mediaId) {
      gallery.querySelectorAll('[data-gallery-image]').forEach(function (img) {
        img.classList.toggle('is-hidden', img.getAttribute('data-media-id') !== mediaId);
      });
      gallery.querySelectorAll('[data-gallery-thumb]').forEach(function (btn) {
        btn.classList.toggle('is-active', btn.getAttribute('data-media-id') === mediaId);
      });
    }

    window.Reveur.activateGalleryMedia = activateMedia;
  }

  refresh();

  /* Product recommendations (native Shopify recommendations endpoint) --- */

  var recTarget = document.querySelector('[data-product-recommendations-target]');
  if (recTarget) {
    var url = recTarget.getAttribute('data-section-url');
    fetch(url)
      .then(function (res) { return res.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var fresh = doc.getElementById('ProductRecommendations');
        if (fresh && fresh.innerHTML.trim() !== '') {
          recTarget.innerHTML = fresh.innerHTML;
        }
      })
      .catch(function () {});
  }
})();
