(function () {
  'use strict';

  var TAG_ORDER = ['Wi-Fi', '電源', 'クレカ可', '個室', '駐車場', 'テラス席', 'アルコール', 'フリードリンク', 'ノンニコチン', 'シェア台'];

  function shopScore(shop) {
    var r = Number(shop.rating) || 0;
    var c = Number(shop.ratingCount) || 0;
    if (!r) return -1;
    return r * Math.log(c + 1);
  }

  /** 営業時間を曜日ごとに改行して表示（「、」「 / 」区切りや既存の改行に対応） */
  function formatHoursMultiline(text) {
    if (!text || typeof text !== 'string') return '';
    var t = text.trim();
    if (!t) return '';
    if (/\n/.test(t)) return t;
    if (t.indexOf('、') !== -1) {
      return t.split('、').map(function (s) { return s.trim(); }).filter(Boolean).join('\n');
    }
    if (t.indexOf(' / ') !== -1) {
      return t.split(' / ').map(function (s) { return s.trim(); }).filter(Boolean).join('\n');
    }
    return t;
  }

  var menuBtn = document.querySelector('.menu-btn');
  var nav = document.querySelector('.nav');

  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      var expanded = menuBtn.getAttribute('aria-expanded') !== 'true';
      menuBtn.setAttribute('aria-expanded', expanded);
      nav.classList.toggle('is-open', expanded);
    });
  }

  function scrollToHash(hash, smooth) {
    var el = document.getElementById(hash);
    if (!el) return;
    var headerH = document.querySelector('.header') ? document.querySelector('.header').offsetHeight : 0;
    var top = el.getBoundingClientRect().top + window.pageYOffset - headerH - 16;
    window.scrollTo({ top: top, behavior: smooth ? 'smooth' : 'auto' });
  }

  document.querySelectorAll('.nav a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var hash = link.getAttribute('href').slice(1);
      if (hash && document.getElementById(hash)) {
        e.preventDefault();
        scrollToHash(hash, true);
      }
    });
  });

  if (window.location.hash) {
    var hash = window.location.hash.slice(1);
    setTimeout(function () { scrollToHash(hash, false); }, 100);
  }

  var aboutDetailModal = document.getElementById('about-detail-modal');
  var aboutDetailBody = document.getElementById('about-detail-body');
  var aboutDetailBackdrop = document.querySelector('.about-detail-backdrop');
  var aboutDetailClose = document.querySelector('.about-detail-close');

  function openAboutDetail(key) {
    if (!aboutDetailModal || !aboutDetailBody) return;
    var tpl = document.getElementById('about-detail-' + key);
    if (!tpl || !tpl.content) return;
    aboutDetailBody.innerHTML = '';
    var clone = document.importNode(tpl.content, true);
    aboutDetailBody.appendChild(clone);
    aboutDetailModal.classList.add('is-open');
    aboutDetailModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeAboutDetail() {
    if (!aboutDetailModal) return;
    aboutDetailModal.classList.remove('is-open');
    aboutDetailModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.about-card--clickable').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var key = this.getAttribute('data-about-detail');
      if (key) openAboutDetail(key);
    });
  });
  if (aboutDetailClose) aboutDetailClose.addEventListener('click', closeAboutDetail);
  if (aboutDetailBackdrop) aboutDetailBackdrop.addEventListener('click', closeAboutDetail);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && aboutDetailModal && aboutDetailModal.classList.contains('is-open')) closeAboutDetail();
  });

  var shopModal = document.getElementById('shop-modal');
  var shopModalBackdrop = shopModal ? shopModal.querySelector('.shop-modal-backdrop') : null;
  var shopModalClose = shopModal ? shopModal.querySelector('.shop-modal-close') : null;

  function openShopModal(shop) {
    if (!shopModal || !shop) return;
    var area = shop.area || '';
    var name = shop.name || '';
    var description = shop.description || '—';
    var hours = formatHoursMultiline(shop.hoursNote || '') || '店舗に要確認';
    var accessRaw = shop.access && String(shop.access).trim();
    var access = accessRaw || '—';
    var priceNote = (shop.priceNote && String(shop.priceNote).trim()) || '—';
    var reservation = (shop.reservation && String(shop.reservation).trim()) || '—';
    var payment = (shop.payment && String(shop.payment).trim()) || '—';
    var tags = shop.tags || [];
    var features = shop.features || [];
    var allFeatures = tags.concat(features).filter(Boolean).sort(function (a, b) {
      var ia = TAG_ORDER.indexOf(a);
      var ib = TAG_ORDER.indexOf(b);
      if (ia === -1) ia = TAG_ORDER.length;
      if (ib === -1) ib = TAG_ORDER.length;
      return ia - ib;
    });
    var url = shop.url || '';
    var phone = shop.phone || '';
    var address = shop.address || shop.住所 || '';
    var closedDay = shop.closedDay || shop.定休日 || '';
    var officialUrl = shop.officialUrl || shop.official || '';
    var rating = shop.rating != null ? Number(shop.rating) : null;
    var ratingCount = shop.ratingCount != null ? Number(shop.ratingCount) : null;

    document.getElementById('shop-modal-area').textContent = area;
    document.getElementById('shop-modal-name').textContent = name;
    document.getElementById('shop-modal-access').textContent = access || '—';
    var addressEl = document.getElementById('shop-modal-address');
    if (addressEl) addressEl.textContent = address || '—';
    var phoneDd = document.getElementById('shop-modal-phone');
    if (phoneDd) {
      phoneDd.innerHTML = '';
      if (phone) {
        var phoneLink = document.createElement('a');
        phoneLink.href = 'tel:' + phone.replace(/\D/g, '');
        phoneLink.className = 'shop-modal-phone-link';
        phoneLink.textContent = phone;
        phoneDd.appendChild(phoneLink);
      } else {
        phoneDd.textContent = '—';
      }
    }
    var closedEl = document.getElementById('shop-modal-closed');
    if (closedEl) closedEl.textContent = closedDay || '—';
    document.getElementById('shop-modal-hours').textContent = hours;
    document.getElementById('shop-modal-price').textContent = priceNote;
    document.getElementById('shop-modal-reservation').textContent = reservation;
    document.getElementById('shop-modal-payment').textContent = payment;
    document.getElementById('shop-modal-desc').textContent = description;

    var featuresEl = document.getElementById('shop-modal-features');
    if (allFeatures.length) {
      featuresEl.textContent = allFeatures.join('、');
    } else {
      featuresEl.textContent = '—';
    }

    var reviewEl = document.getElementById('shop-modal-review');
    if (reviewEl) {
      reviewEl.innerHTML = '';
      var reviewUrl = url;
      if (!reviewUrl) {
        var googleQuery = name + (address ? ' ' + address : '');
        reviewUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(googleQuery);
      }
      var reviewLink = document.createElement('a');
      reviewLink.href = reviewUrl;
      reviewLink.target = '_blank';
      reviewLink.rel = 'noopener noreferrer';
      reviewLink.className = 'shop-modal-inline-link';
      reviewLink.textContent = rating != null && ratingCount != null ? '★' + rating + '（' + ratingCount + '件）・Googleマップで口コミを見る' : 'Googleマップで評価・口コミを見る';
      reviewEl.appendChild(reviewLink);
    }

    var mapEl = document.getElementById('shop-modal-map');
    if (mapEl) {
      mapEl.innerHTML = '';
      var lat = shop._lat;
      var lng = shop._lng;
      var isMobile = window.innerWidth <= 640;
      if (!isMobile && lat != null && lng != null) {
        var iframe = document.createElement('iframe');
        iframe.className = 'shop-modal-map-iframe';
        iframe.src = 'https://maps.google.com/maps?q=' + lat + ',' + lng + '&z=16&output=embed&hl=ja';
        iframe.width = '100%';
        iframe.height = '250';
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute('loading', 'lazy');
        iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
        mapEl.appendChild(iframe);
      }
    }

    var officialEl = document.getElementById('shop-modal-official');
    if (officialEl) {
      officialEl.innerHTML = '';
      if (officialUrl) {
        var officialLink = document.createElement('a');
        officialLink.href = officialUrl;
        officialLink.target = '_blank';
        officialLink.rel = 'noopener noreferrer';
        officialLink.className = 'shop-modal-inline-link';
        officialLink.textContent = '公式サイトを開く ↗';
        officialEl.appendChild(officialLink);
      } else {
        officialEl.textContent = '—';
      }
    }

    var linksEl = document.getElementById('shop-modal-links');
    linksEl.innerHTML = '';

    shopModal.classList.add('is-open');
    shopModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeShopModal() {
    if (!shopModal) return;
    shopModal.classList.remove('is-open');
    shopModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (shopModalClose) shopModalClose.addEventListener('click', closeShopModal);
  if (shopModalBackdrop) shopModalBackdrop.addEventListener('click', closeShopModal);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && shopModal && shopModal.classList.contains('is-open')) closeShopModal();
  });

  // ── ランキング: タブ切り替え＆カードクリック（HTML は事前レンダリング済み） ──
  var rankContainer = document.getElementById('ranking-container');
  if (rankContainer) {
    var tabBar = rankContainer.querySelector('.rank-tabs');
    if (tabBar) {
      tabBar.addEventListener('click', function (e) {
        var btn = e.target.closest('.rank-tab');
        if (!btn) return;
        var rid = btn.getAttribute('data-region');
        tabBar.querySelectorAll('.rank-tab').forEach(function (t) {
          var active = t.getAttribute('data-region') === rid;
          t.classList.toggle('is-active', active);
          t.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        rankContainer.querySelectorAll('.rank-panel').forEach(function (p) {
          var active = p.id === 'rank-panel-' + rid;
          p.classList.toggle('is-active', active);
          p.hidden = !active;
        });
      });
    }

    rankContainer.addEventListener('click', function (e) {
      var card = e.target.closest('.rank-card');
      if (!card) return;
      var raw = card.getAttribute('data-shop');
      if (!raw) return;
      try { openShopModal(JSON.parse(raw)); } catch (err) {}
    });
  }
})();
