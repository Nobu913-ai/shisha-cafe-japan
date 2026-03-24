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

  var spotsContainer = document.getElementById('spots-container');
  var spotsLoading = document.getElementById('spots-loading');

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
      var googleQuery = name + (address ? ' ' + address : '');
      var googleSearchUrl = 'https://www.google.com/search?q=' + encodeURIComponent(googleQuery + ' 口コミ');
      var reviewLink = document.createElement('a');
      reviewLink.href = googleSearchUrl;
      reviewLink.target = '_blank';
      reviewLink.rel = 'noopener noreferrer';
      reviewLink.className = 'shop-modal-inline-link';
      reviewLink.textContent = rating != null && ratingCount != null ? '★' + rating + '（' + ratingCount + '件）・Googleで口コミを見る' : 'Googleで評価・口コミを見る';
      reviewEl.appendChild(reviewLink);
    }

    var mapEl = document.getElementById('shop-modal-map');
    if (mapEl) {
      mapEl.innerHTML = '';
      var mapQuery = address || name;
      if (mapQuery) {
        var isMobile = window.innerWidth <= 640;
        if (!isMobile) {
          var iframe = document.createElement('iframe');
          iframe.className = 'shop-modal-map-iframe';
          iframe.src = 'https://maps.google.com/maps?q=' + encodeURIComponent(mapQuery) + '&output=embed&hl=ja';
          iframe.width = '100%';
          iframe.height = '250';
          iframe.setAttribute('frameborder', '0');
          iframe.setAttribute('allowfullscreen', '');
          iframe.setAttribute('loading', 'lazy');
          iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
          mapEl.appendChild(iframe);
        }
        var mapLinkWrap = document.createElement('p');
        mapLinkWrap.className = 'shop-modal-map-link-wrap';
        var mapLink = document.createElement('a');
        mapLink.href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(mapQuery);
        mapLink.target = '_blank';
        mapLink.rel = 'noopener noreferrer';
        mapLink.className = 'shop-modal-inline-link';
        mapLink.textContent = 'Googleマップで開く ↗';
        mapLinkWrap.appendChild(mapLink);
        mapEl.appendChild(mapLinkWrap);
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

  if (spotsContainer) {
    spotsContainer.addEventListener('click', function (e) {
      var card = e.target.closest('.spot-card');
      if (!card) return;
      var raw = card.getAttribute('data-shop');
      if (!raw) return;
      try {
        var shop = JSON.parse(raw);
        openShopModal(shop);
      } catch (err) {}
    });
  }

  function buildShopCard(shop, regionIdForArea) {
    var na = typeof normalizeShopArea === 'function'
      ? normalizeShopArea(shop, regionIdForArea || '')
      : { key: shop.area || '', display: shop.area || '' };
    var shopData = {
      name: shop.name || '',
      area: na.display,
      description: shop.description || '',
      hoursNote: shop.hoursNote || '',
      tags: shop.tags || [],
      access: shop.access || '',
      address: shop.address || shop.住所 || '',
      priceNote: shop.priceNote || '',
      reservation: shop.reservation || '',
      features: shop.features || [],
      payment: shop.payment || '',
      closedDay: shop.closedDay || shop.定休日 || '',
      url: shop.url || '',
      phone: shop.phone || '',
      officialUrl: shop.officialUrl || shop.official || '',
      rating: shop.rating,
      ratingCount: shop.ratingCount
    };
    var card = document.createElement('article');
    card.className = 'spot-card';
    var header = document.createElement('div');
    header.className = 'spot-card-header';
    var areaSpan = document.createElement('span');
    areaSpan.className = 'spot-area';
    areaSpan.textContent = na.display;
    header.appendChild(areaSpan);
    (shop.tags || []).slice().sort(function (a, b) {
      var ia = TAG_ORDER.indexOf(a);
      var ib = TAG_ORDER.indexOf(b);
      if (ia === -1) ia = TAG_ORDER.length;
      if (ib === -1) ib = TAG_ORDER.length;
      return ia - ib;
    }).forEach(function (tag) {
      var tagSpan = document.createElement('span');
      tagSpan.className = 'spot-tag';
      tagSpan.textContent = tag;
      header.appendChild(tagSpan);
    });
    card.appendChild(header);
    var nameEl = document.createElement('h4');
    nameEl.className = 'spot-name';
    nameEl.textContent = shop.name || '';
    card.appendChild(nameEl);
    var desc = document.createElement('p');
    desc.className = 'spot-desc';
    desc.textContent = shop.description || '';
    card.appendChild(desc);
    var time = document.createElement('p');
    time.className = 'spot-time';
    time.textContent = shop.hoursNote ? '営業：\n' + formatHoursMultiline(shop.hoursNote) : '';
    card.appendChild(time);
    card.setAttribute('data-shop', JSON.stringify(shopData));
    card.style.cursor = 'pointer';
    return card;
  }

  if (spotsContainer && spotsLoading) {
    var url = new URL('shops.json', window.location.href).href;
    fetch(url)
      .then(function (res) { return res.ok ? res.json() : Promise.reject(new Error('読み込み失敗')); })
      .then(function (data) {
        spotsLoading.classList.add('is-hidden');
        var regions = data.regions || [];
        var hasAny = false;
        regions.forEach(function (region) {
          var recommendedShops = (region.shops || []).filter(function (shop) { return shop.recommended === true; });
          if (recommendedShops.length === 0) return;
          hasAny = true;
          var block = document.createElement('div');
          block.id = region.id;
          block.className = 'spot-block';
          block.setAttribute('data-region', region.id);
          var title = document.createElement('h3');
          title.className = 'spot-block-title';
          title.textContent = region.name + 'のおすすめ';
          block.appendChild(title);
          var grid = document.createElement('div');
          grid.className = 'spot-grid';
          recommendedShops.slice().sort(function (a, b) {
            return shopScore(b) - shopScore(a);
          }).forEach(function (shop) {
            grid.appendChild(buildShopCard(shop, region.id));
          });
          block.appendChild(grid);
          spotsContainer.appendChild(block);
        });
        if (!hasAny) {
          var placeholder = document.createElement('div');
          placeholder.className = 'spots-coming-soon';
          placeholder.innerHTML =
            '<img src="images/coming-soon-sm.png" alt="" class="spots-coming-soon-img" loading="lazy">' +
            '<p class="spots-coming-soon-title">調査中</p>' +
            '<p class="spots-coming-soon-desc">現在、各エリアのおすすめ店舗を調査しています。<br>掲載まで今しばらくお待ちください。</p>' +
            '<a href="search.html" class="spots-coming-soon-link">店舗検索から探す →</a>';
          spotsContainer.appendChild(placeholder);
        }
      })
      .catch(function () {
        if (spotsLoading) {
          spotsLoading.textContent = '店舗情報の読み込みに失敗しました。しばらくしてから再読み込みしてください。';
          spotsLoading.classList.remove('is-hidden');
        }
      });
  }
})();
