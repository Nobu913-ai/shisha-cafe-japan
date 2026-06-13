(function () {
  'use strict';

  // 折りたたみ(<details>)内のカードも拾えるよう、document に委譲する
  document.addEventListener('click', function (e) {
    var card = e.target.closest('.area-shop-card');
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
