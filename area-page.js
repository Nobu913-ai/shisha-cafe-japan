(function () {
  'use strict';

  var list = document.getElementById('area-shop-list');
  if (!list) return;

  list.addEventListener('click', function (e) {
    var card = e.target.closest('.spot-card');
    if (!card) return;
    var raw = card.getAttribute('data-shop');
    if (!raw) return;
    try {
      if (typeof openShopModal === 'function') {
        openShopModal(JSON.parse(raw));
      }
    } catch (err) {}
  });
})();
