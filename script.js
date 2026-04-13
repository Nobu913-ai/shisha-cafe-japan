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
      var mapQuery = address || name;
      var mapDirectUrl = url;
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
        mapLink.href = mapDirectUrl || ('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(mapQuery));
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

  function buildRankingCard(shop, rank, regionId) {
    var na = typeof normalizeShopArea === 'function'
      ? normalizeShopArea(shop, regionId || '')
      : { key: shop.area || '', display: shop.area || '' };
    var shopData = {
      name: shop.name || '',
      area: na.display,
      description: shop.description || '',
      hoursNote: shop.hoursNote || '',
      tags: shop.tags || [],
      access: shop.access || '',
      address: shop.address || '',
      priceNote: shop.priceNote || '',
      reservation: shop.reservation || '',
      features: shop.features || [],
      payment: shop.payment || '',
      closedDay: shop.closedDay || '',
      url: shop.url || '',
      phone: shop.phone || '',
      officialUrl: shop.officialUrl || '',
      rating: shop.rating,
      ratingCount: shop.ratingCount
    };

    var card = document.createElement('article');
    card.className = 'rank-card';
    card.setAttribute('data-shop', JSON.stringify(shopData));
    card.style.cursor = 'pointer';

    // 順位バッジ
    var badge = document.createElement('span');
    badge.className = 'rank-badge' + (rank <= 3 ? ' rank-badge--top' + rank : '');
    badge.textContent = rank;
    card.appendChild(badge);

    // 本文エリア
    var body = document.createElement('div');
    body.className = 'rank-body';

    // 1行目: 店名
    var nameEl = document.createElement('h4');
    nameEl.className = 'rank-name';
    nameEl.textContent = shop.name || '';
    body.appendChild(nameEl);

    // 2行目: エリア + 評価
    var meta = document.createElement('p');
    meta.className = 'rank-meta';
    var r = Number(shop.rating) || 0;
    var rc = Number(shop.ratingCount) || 0;
    var metaText = na.display;
    if (r) metaText += '　★' + r.toFixed(1) + '（' + rc.toLocaleString() + '件）';
    meta.textContent = metaText;
    body.appendChild(meta);

    // 3行目: 紹介文（省略）
    if (shop.description) {
      var desc = document.createElement('p');
      desc.className = 'rank-desc';
      var text = shop.description;
      desc.textContent = text.length > 80 ? text.slice(0, 80) + '…' : text;
      body.appendChild(desc);
    }

    card.appendChild(body);
    return card;
  }

  // ── ランキング描画（タブ切り替え） ──
  var rankContainer = document.getElementById('ranking-container');
  var rankLoading = document.getElementById('ranking-loading');

  if (rankContainer && rankLoading) {
    fetch(new URL('top-shops.json', window.location.href).href)
      .then(function (res) { return res.ok ? res.json() : Promise.reject(new Error('読み込み失敗')); })
      .then(function (data) {
        rankLoading.classList.add('is-hidden');
        var regions = data.regions || [];

        // エリアカードに店舗件数を注入
        var countMap = {};
        var knownSum = 0;
        regions.forEach(function (r) {
          countMap[r.id] = r.shopCount || 0;
          knownSum += r.shopCount || 0;
        });
        if (data.totalShopCount) {
          countMap.other = data.totalShopCount - knownSum;
        }
        document.querySelectorAll('.area-card[data-area]').forEach(function (card) {
          var areaId = card.getAttribute('data-area');
          var count = countMap[areaId];
          if (count > 0) {
            var el = card.querySelector('.area-shop-count');
            if (el) el.textContent = count.toLocaleString() + '件';
          }
        });

        if (!regions.length) return;

        // タブバー
        var tabBar = document.createElement('div');
        tabBar.className = 'rank-tabs';
        tabBar.setAttribute('role', 'tablist');

        // パネル群
        var panels = [];

        regions.forEach(function (region, idx) {
          // タブボタン
          var tab = document.createElement('button');
          tab.className = 'rank-tab' + (idx === 0 ? ' is-active' : '');
          tab.setAttribute('role', 'tab');
          tab.setAttribute('aria-selected', idx === 0 ? 'true' : 'false');
          tab.setAttribute('aria-controls', 'rank-panel-' + region.id);
          tab.setAttribute('data-region', region.id);
          tab.textContent = region.name;
          if (region.shopCount) {
            var countSpan = document.createElement('span');
            countSpan.className = 'rank-tab-count';
            countSpan.textContent = region.shopCount.toLocaleString();
            tab.appendChild(countSpan);
          }
          tabBar.appendChild(tab);

          // パネル
          var panel = document.createElement('div');
          panel.className = 'rank-panel' + (idx === 0 ? ' is-active' : '');
          panel.id = 'rank-panel-' + region.id;
          panel.setAttribute('role', 'tabpanel');
          if (idx !== 0) panel.hidden = true;

          var list = document.createElement('div');
          list.className = 'rank-list';
          (region.shops || []).forEach(function (shop, i) {
            list.appendChild(buildRankingCard(shop, i + 1, region.id));
          });
          panel.appendChild(list);

          var more = document.createElement('p');
          more.className = 'rank-block-more';
          var moreLink = document.createElement('a');
          moreLink.href = '/search?area=' + region.id;
          moreLink.className = 'rank-block-more-link';
          moreLink.textContent = region.name + 'の全店舗を見る →';
          more.appendChild(moreLink);
          panel.appendChild(more);

          panels.push(panel);
        });

        rankContainer.appendChild(tabBar);
        panels.forEach(function (p) { rankContainer.appendChild(p); });

        // タブ切り替え
        tabBar.addEventListener('click', function (e) {
          var btn = e.target.closest('.rank-tab');
          if (!btn) return;
          var rid = btn.getAttribute('data-region');
          tabBar.querySelectorAll('.rank-tab').forEach(function (t) {
            var active = t.getAttribute('data-region') === rid;
            t.classList.toggle('is-active', active);
            t.setAttribute('aria-selected', active ? 'true' : 'false');
          });
          panels.forEach(function (p) {
            var active = p.id === 'rank-panel-' + rid;
            p.classList.toggle('is-active', active);
            p.hidden = !active;
          });
        });

        // カードクリック → モーダル
        rankContainer.addEventListener('click', function (e) {
          var card = e.target.closest('.rank-card');
          if (!card) return;
          var raw = card.getAttribute('data-shop');
          if (!raw) return;
          try { openShopModal(JSON.parse(raw)); } catch (err) {}
        });
      })
      .catch(function () {
        if (rankLoading) {
          rankLoading.textContent = 'ランキングの読み込みに失敗しました。';
          rankLoading.classList.remove('is-hidden');
        }
      });
  }
})();
