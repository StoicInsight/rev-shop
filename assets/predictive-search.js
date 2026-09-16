/* Rêveur — predictive search via Shopify's native /search/suggest.json */
(function () {
  'use strict';

  var routes = (window.Reveur && window.Reveur.routes) || {};
  var strings = (window.Reveur && window.Reveur.strings) || {};
  var input = document.querySelector('[data-search-input]');
  var resultsEl = document.querySelector('[data-search-results]');
  if (!input || !resultsEl || !routes.predictive_search_url) return;

  var controller = null;
  var debounceTimer = null;

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function render(products, term) {
    if (!products.length) {
      resultsEl.innerHTML = '<div class="predictive-search__empty">' +
        (strings.searchNoResults || '').replace('__TERMS__', escapeHtml(term)) +
        '</div>';
      return;
    }

    var html = products.map(function (p) {
      return '<a class="predictive-search__result" href="' + p.url + '">' +
        '<span class="predictive-search__result-media">' +
        (p.image ? '<img src="' + p.image + '" alt="" loading="lazy" width="52" height="62">' : '') +
        '</span>' +
        '<span>' +
        '<span class="predictive-search__result-title">' + escapeHtml(p.title) + '</span>' +
        '<span class="predictive-search__result-price">' + p.price + '</span>' +
        '</span>' +
        '</a>';
    }).join('');

    html += '<a class="predictive-search__view-all" href="' + routes.search_url + '?q=' + encodeURIComponent(term) + '&type=product">' +
      (strings.searchViewAll || 'View all results') + '</a>';

    resultsEl.innerHTML = html;
  }

  function search(term) {
    if (!term) {
      resultsEl.innerHTML = '';
      return;
    }
    if (controller) controller.abort();
    controller = new AbortController();

    var url = routes.predictive_search_url +
      '?q=' + encodeURIComponent(term) +
      '&resources[type]=product' +
      '&resources[limit]=6' +
      '&resources[options][unavailable_products]=last';

    fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var products = ((data.resources && data.resources.results && data.resources.results.products) || []).map(function (p) {
          return {
            title: p.title,
            url: p.url,
            price: p.price,
            image: p.featured_image ? p.featured_image.url : null
          };
        });
        render(products, term);
      })
      .catch(function (err) {
        if (err.name !== 'AbortError') resultsEl.innerHTML = '';
      });
  }

  input.addEventListener('input', function () {
    var term = input.value.trim();
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(function () { search(term); }, 220);
  });
})();
