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

  // よくある質問（機能別LP）: 1つ開いたら他を閉じる。guide.html の FAQ と同じ挙動。
  // .guide-faq-item を持たないエリアLPでは何もしない。
  var faqItems = document.querySelectorAll('.guide-faq-item');
  if (faqItems.length) {
    faqItems.forEach(function (details) {
      details.addEventListener('toggle', function () {
        var summary = details.querySelector('.guide-faq-q');
        if (!details.open) {
          if (summary) summary.blur();
          return;
        }
        faqItems.forEach(function (other) {
          if (other !== details && other.open) {
            other.open = false;
            var s = other.querySelector('.guide-faq-q');
            if (s) s.blur();
          }
        });
      });
    });
  }
})();
