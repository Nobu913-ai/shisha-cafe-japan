(function () {
  'use strict';

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

  function getInitialArea() {
    var params = new URLSearchParams(window.location.search);
    var area = params.get('area') || '';
    if (['tokyo', 'osaka', 'nagoya', 'fukuoka', 'other'].indexOf(area) !== -1) return area;
    return null;
  }

  function getInitialSubarea() {
    var params = new URLSearchParams(window.location.search);
    var sub = params.get('subarea') || '';
    return sub ? decodeURIComponent(sub) : null;
  }

  var searchResultsContainer = document.getElementById('search-results-container');
  var searchLoading = document.getElementById('search-loading');
  var searchFilterClear = document.getElementById('search-filter-clear');
  var searchKeyword = document.getElementById('search-keyword');
  var searchResultCountValue = document.getElementById('search-result-count-value');
  var searchResultConditions = document.getElementById('search-result-conditions');
  var searchResultSummary = document.getElementById('search-result-summary');
  var searchResultsToolbar = document.getElementById('search-results-toolbar');
  var searchSubareaButtons = document.getElementById('search-subarea-buttons');
  var searchSubareaPanel = document.getElementById('search-subarea-group');
  var searchSubareaSummary = document.getElementById('search-subarea-summary');
  var searchJumpToFeaturesWrap = document.getElementById('search-jump-to-features-wrap');
  var searchJumpToFeatures = document.getElementById('search-jump-to-features');

  var regionAreasMap = {};
  var regionHierarchy = {};

  var filterState = {
    regionId: getInitialArea(),
    regionName: '',
    subArea: getInitialSubarea(),
    subAreaLabel: null,
    keyword: '',
    featureTags: [],
    station: null
  };

  var STATION_RE = /([^\s　]+駅)/;

  function extractStation(access) {
    if (!access) return '';
    var m = String(access).match(STATION_RE);
    return m ? m[1] : '';
  }

  var AREAS = [
    { id: 'tokyo', name: '東京' },
    { id: 'osaka', name: '大阪' },
    { id: 'nagoya', name: '名古屋' },
    { id: 'fukuoka', name: '福岡' },
    { id: 'other', name: 'その他' }
  ];

  var TAG_ORDER = ['Wi-Fi', '電源', 'クレカ可', '個室', '駐車場', 'テラス席', 'アルコール', 'フリードリンク', 'ノンニコチン', 'シェア台'];

  function shopScore(shop) {
    var r = Number(shop.rating) || 0;
    var c = Number(shop.ratingCount) || 0;
    if (!r) return -1;
    return r * Math.log(c + 1);
  }

  function sortShopsByScore(shops) {
    return shops.slice().sort(function (a, b) {
      return shopScore(b) - shopScore(a);
    });
  }

  var FEATURE_CATEGORIES = [
    { label: '設備', tags: ['Wi-Fi', '電源', 'クレカ可', '個室', '駐車場', 'テラス席'] },
    { label: 'サービス', tags: ['アルコール', 'フリードリンク', 'ノンニコチン', 'シェア台'] }
  ];

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
    var rawTags = (shop.tags || []).concat(shop.features || []);
    var allTags = rawTags.slice().sort(function (a, b) {
      var ia = TAG_ORDER.indexOf(a);
      var ib = TAG_ORDER.indexOf(b);
      if (ia === -1) ia = TAG_ORDER.length;
      if (ib === -1) ib = TAG_ORDER.length;
      return ia - ib;
    });
    var searchable = [shop.name, na.display, na.key, shop.area, shop.description].concat(allTags).join(' ').toLowerCase();

    var card = document.createElement('article');
    card.className = 'spot-card';
    card.setAttribute('data-searchable', searchable);
    card.setAttribute('data-tags', allTags.join(','));
    card.setAttribute('data-region', ''); // set by parent block
    card.setAttribute('data-area', na.key);
    card.setAttribute('data-station', extractStation(shop.access));
    card.setAttribute('data-shop', JSON.stringify(shopData));
    card.style.cursor = 'pointer';

    var header = document.createElement('div');
    header.className = 'spot-card-header';
    var areaSpan = document.createElement('span');
    areaSpan.className = 'spot-area';
    areaSpan.textContent = na.display;
    header.appendChild(areaSpan);
    var MAX_VISIBLE_TAGS = 3;
    allTags.slice(0, MAX_VISIBLE_TAGS).forEach(function (tag) {
      var tagSpan = document.createElement('span');
      tagSpan.className = 'spot-tag';
      tagSpan.textContent = tag;
      header.appendChild(tagSpan);
    });
    if (allTags.length > MAX_VISIBLE_TAGS) {
      var moreSpan = document.createElement('span');
      moreSpan.className = 'spot-tag spot-tag--more';
      moreSpan.textContent = '+' + (allTags.length - MAX_VISIBLE_TAGS);
      header.appendChild(moreSpan);
    }
    card.appendChild(header);
    var nameEl = document.createElement('h4');
    nameEl.className = 'spot-name';
    var nameText = document.createElement('span');
    nameText.className = 'spot-name-text';
    nameText.textContent = shop.name || '';
    nameEl.appendChild(nameText);
    if (shop.rating != null) {
      var ratingEl = document.createElement('span');
      ratingEl.className = 'spot-rating';
      var starEl = document.createElement('span');
      starEl.className = 'spot-rating-star';
      starEl.textContent = '★';
      var ratingNum = document.createElement('span');
      ratingNum.textContent = Number(shop.rating).toFixed(1);
      ratingEl.appendChild(starEl);
      ratingEl.appendChild(ratingNum);
      if (shop.ratingCount != null) {
        var countEl = document.createElement('span');
        countEl.className = 'spot-rating-count';
        countEl.textContent = '（' + Number(shop.ratingCount).toLocaleString() + '件）';
        ratingEl.appendChild(countEl);
      }
      nameEl.appendChild(ratingEl);
    }
    card.appendChild(nameEl);
    if (shop.description) {
      var descWrap = document.createElement('div');
      descWrap.className = 'spot-desc-wrap';
      var descLabel = document.createElement('span');
      descLabel.className = 'spot-desc-label';
      descLabel.textContent = 'AI紹介';
      descWrap.appendChild(descLabel);
      var descText = document.createElement('p');
      descText.className = 'spot-desc';
      descText.textContent = shop.description;
      descWrap.appendChild(descText);
      card.appendChild(descWrap);
    }
    var meta = document.createElement('div');
    meta.className = 'spot-meta';
    if (shop.access) {
      var accessEl = document.createElement('p');
      accessEl.className = 'spot-access';
      accessEl.textContent = shop.access;
      meta.appendChild(accessEl);
    }
    var addr = (shop.address || shop.住所 || '').replace(/^〒\s*\d{3}-?\d{4}\s*/, '');
    if (addr) {
      var addrEl = document.createElement('p');
      addrEl.className = 'spot-address';
      addrEl.textContent = addr;
      meta.appendChild(addrEl);
    }
    if (meta.childNodes.length) {
      card.appendChild(meta);
    }

    return card;
  }

  function buildFilterConditionsText() {
    var parts = [];
    if (filterState.regionId && filterState.regionName) {
      parts.push('地域：' + filterState.regionName);
    }
    if (filterState.subArea) {
      parts.push('エリア：' + (filterState.subAreaLabel || filterState.subArea));
    }
    if (filterState.station) {
      parts.push('最寄駅：' + filterState.station);
    }
    var kw = (searchKeyword && searchKeyword.value.trim()) || '';
    if (kw) {
      parts.push('キーワード：「' + kw + '」');
    }
    if (filterState.featureTags && filterState.featureTags.length) {
      parts.push('設備・サービス：' + filterState.featureTags.join('、'));
    }
    if (parts.length) {
      return '絞り込み：' + parts.join('　｜　');
    }
    return '絞り込み条件：なし（すべての地域・店舗が対象）';
  }

  function updateSearchResultToolbar(visibleCount) {
    if (searchResultCountValue) {
      searchResultCountValue.textContent = visibleCount + ' 件の店舗';
    }
    if (searchResultConditions) {
      searchResultConditions.textContent = buildFilterConditionsText();
    }
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /** 1 カラム（スマホ等）：リストのリフレッシュアニメ・スクロール戻しは行わない */
  function isNarrowSearchViewport() {
    return window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
  }

  /** マウス主体の PC ではキーボード用の visualViewport 調整をしない（誤スクロール防止） */
  function shouldAlignSearchInputForTouchKeyboard() {
    return isNarrowSearchViewport() && window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  }

  /** 入力の実際にスクロールする祖先（オーバーレイの inner または document） */
  function getSearchInputScrollParent(el) {
    var node = el.parentElement;
    while (node && node !== document.body && node !== document.documentElement) {
      var st = window.getComputedStyle(node);
      var oy = st.overflowY;
      var canY = (oy === 'auto' || oy === 'scroll' || oy === 'overlay') && node.scrollHeight > node.clientHeight + 1;
      if (canY) return node;
      node = node.parentElement;
    }
    return document.scrollingElement || document.documentElement;
  }

  /** iOS Chrome / Android Chrome は Safari より visualViewport 高さが小さく出ることがあり、上方向へ過剰スクロールしやすい */
  function isMobileChromeVisualViewportQuirk() {
    var ua = navigator.userAgent || '';
    if (/CriOS\//.test(ua)) return true;
    if (/Android/.test(ua) && /Chrome\//.test(ua) && !/Edg\//.test(ua)) return true;
    return false;
  }

  function applySearchInputScrollDelta(el, delta) {
    var sp = getSearchInputScrollParent(el);
    if (sp === document.documentElement || sp === document.body) {
      window.scrollBy({ left: 0, top: delta, behavior: 'auto' });
    } else {
      sp.scrollTop += delta;
    }
  }

  /**
   * キーボード表示後の visualViewport 内に入力欄全体が収まるようスクロールする。
   * 以前の「スクロール位置を戻す」処理はキーボード分の余白を打ち消すため行わない。
   */
  function alignSearchInputToKeyboard(el) {
    if (!el || !shouldAlignSearchInputForTouchKeyboard()) return;
    var vv = window.visualViewport;
    if (!vv) {
      try {
        el.scrollIntoView({ block: 'center', behavior: 'auto', inline: 'nearest' });
      } catch (e) {}
      return;
    }
    var chromeQuirk = isMobileChromeVisualViewportQuirk();
    /* Chrome: vv 下端を実際より少し下に見なして、上スクロール量を抑える */
    var slack = chromeQuirk ? Math.min(80, Math.round((window.innerHeight || 640) * 0.085)) : 0;
    var pad = chromeQuirk ? 16 : 14;
    var iter;
    for (iter = 0; iter < 6; iter++) {
      var rect = el.getBoundingClientRect();
      var viewTop = vv.offsetTop;
      var viewBottom = vv.offsetTop + vv.height + slack;
      var delta = 0;
      /* 上はみ出しを先に直す（過剰スクロール直後の状態に効く） */
      if (rect.top < viewTop + pad) {
        delta = rect.top - (viewTop + pad);
      } else if (rect.bottom > viewBottom - pad) {
        delta = rect.bottom - (viewBottom - pad);
      }
      if (Math.abs(delta) < 2) break;
      applySearchInputScrollDelta(el, delta);
    }
  }

  function bindSearchInputKeyboardAlign() {
    var stationIn = document.getElementById('search-station-input');
    var inputs = [searchKeyword, stationIn].filter(Boolean);
    if (!inputs.length) return;

    inputs.forEach(function (el) {
      var vvResizeTimer = null;
      var vvHandlers = null;

      el.addEventListener('focusin', function () {
        if (!shouldAlignSearchInputForTouchKeyboard()) return;

        function scheduleAlign() {
          alignSearchInputToKeyboard(el);
        }

        scheduleAlign();
        requestAnimationFrame(scheduleAlign);
        [40, 120, 280, 450].forEach(function (ms) {
          window.setTimeout(scheduleAlign, ms);
        });

        if (window.visualViewport) {
          vvHandlers = function () {
            if (vvResizeTimer) clearTimeout(vvResizeTimer);
            vvResizeTimer = window.setTimeout(scheduleAlign, 20);
          };
          window.visualViewport.addEventListener('resize', vvHandlers);
          window.visualViewport.addEventListener('scroll', vvHandlers);
        }

        el.addEventListener('focusout', function onBlur() {
          if (vvResizeTimer) clearTimeout(vvResizeTimer);
          if (window.visualViewport && vvHandlers) {
            window.visualViewport.removeEventListener('resize', vvHandlers);
            window.visualViewport.removeEventListener('scroll', vvHandlers);
          }
          el.removeEventListener('focusout', onBlur);
        }, { once: true });
      });
    });
  }

  /** 右カラムの表示を先頭へ（sticky バーではなくアンカーでウィンドウスクロール） */
  function scrollSearchResultsColumnToTop() {
    if (isNarrowSearchViewport()) return;
    if (searchResultsContainer && searchResultsContainer.scrollTop) {
      searchResultsContainer.scrollTop = 0;
    }
    var anchor = document.getElementById('search-results-top-anchor');
    var behavior = prefersReducedMotion() ? 'auto' : 'smooth';
    if (anchor) {
      anchor.scrollIntoView({ behavior: behavior, block: 'start' });
      return;
    }
    var toolbar = searchResultsToolbar || document.getElementById('search-results-toolbar');
    if (toolbar) {
      toolbar.scrollIntoView({ behavior: behavior, block: 'start' });
    }
  }

  /** 店舗リストだけ再表示アニメ（件数・条件バーは常に表示）。一覧の表示位置は先頭へ */
  function scrollSearchResultsToolbarIntoView() {
    if (isNarrowSearchViewport()) return;
    var listEl = searchResultsContainer;
    var animEls = listEl ? [listEl] : [];

    function clearPulse() {
      animEls.forEach(function (node) {
        node.classList.remove('search-refresh--pulse');
      });
    }

    if (prefersReducedMotion() || animEls.length === 0) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          scrollSearchResultsColumnToTop();
        });
      });
      return;
    }

    clearPulse();
    void listEl.offsetWidth;

    listEl.classList.add('search-refresh--pulse');

    window.setTimeout(function () {
      scrollSearchResultsColumnToTop();
    }, 200);

    window.setTimeout(function () {
      clearPulse();
    }, 720);
  }

  function applyFilters(options) {
    options = options || {};
    if (!searchResultsContainer) return;
    var regionId = filterState.regionId;
    var subArea = filterState.subArea || null;
    var keyword = (filterState.keyword || '').trim().toLowerCase();
    var featureTags = filterState.featureTags || [];
    var visibleCount = 0;

    searchResultsContainer.querySelectorAll('.spot-block').forEach(function (block) {
      var blockRegion = block.getAttribute('data-region');
      var blockVisible = !regionId || blockRegion === regionId;
      if (!blockVisible) {
        block.classList.add('spot-block--hidden');
        return;
      }
      block.classList.remove('spot-block--hidden');
      block.querySelectorAll('.spot-card').forEach(function (card) {
        var cardArea = card.getAttribute('data-area') || '';
        var searchable = (card.getAttribute('data-searchable') || '');
        var cardTags = (card.getAttribute('data-tags') || '').split(',').map(function (t) { return t.trim(); });
        var matchSubArea = !subArea || cardArea === subArea;
        if (!matchSubArea && subArea && filterState.regionId === 'tokyo' && TOKYO_23KU[subArea]) {
          matchSubArea = cardArea === '東京都' + subArea;
        }
        if (!matchSubArea && subArea && filterState.regionId === 'other') {
          matchSubArea = cardArea.indexOf(subArea) === 0;
        }
        var matchKeyword = !keyword || searchable.indexOf(keyword) !== -1;
        var matchFeatures = featureTags.length === 0 || featureTags.every(function (t) { return cardTags.indexOf(t) !== -1; });
        var matchStation = !filterState.station || card.getAttribute('data-station') === filterState.station;
        var show = matchSubArea && matchKeyword && matchFeatures && matchStation;
        card.classList.toggle('spot-card--hidden', !show);
        if (show) visibleCount++;
      });
    });

    updateSearchResultToolbar(visibleCount);
    updateJumpToFeaturesLink();

    var doScroll = options.scrollToResults !== false;
    if (doScroll) {
      scrollSearchResultsToolbarIntoView();
    }
  }

  function updateJumpToFeaturesLink() {
    if (!searchJumpToFeaturesWrap) return;
    if (filterState.subArea) {
      searchJumpToFeaturesWrap.removeAttribute('hidden');
    } else {
      searchJumpToFeaturesWrap.setAttribute('hidden', '');
    }
  }

  function openSearchSidebarIfCollapsed() {
    var inner = document.getElementById('search-sidebar-inner');
    var toggle = document.getElementById('search-sidebar-toggle');
    if (inner && !inner.classList.contains('is-open')) {
      inner.classList.add('is-open');
      if (toggle) {
        toggle.classList.add('is-open');
        toggle.textContent = '検索条件を閉じる ▲';
      }
    }
  }

  /**
   * 左の検索パネル内だけスクロール（ウィンドウは動かさない）。#search-sidebar または折りたたみ時の .search-sidebar-inner。
   */
  function scrollFilterPanelToElement(target) {
    if (!target) return;
    var inner = document.getElementById('search-sidebar-inner');
    var sidebar = document.getElementById('search-sidebar');
    var container = null;
    var behavior = prefersReducedMotion() ? 'auto' : 'smooth';

    /* 絞り込み枠全体がスクロールする場合は sidebar を優先 */
    if (sidebar && sidebar.scrollHeight > sidebar.clientHeight + 2) {
      container = sidebar;
    }
    if (!container && inner && inner.classList.contains('is-open') && inner.scrollHeight > inner.clientHeight + 2) {
      container = inner;
    }

    if (container) {
      var pad = 10;
      var cRect = container.getBoundingClientRect();
      var tRect = target.getBoundingClientRect();
      var delta = tRect.top - cRect.top - pad;
      var nextTop = container.scrollTop + delta;
      container.scrollTo({ top: Math.max(0, nextTop), behavior: behavior });
      return;
    }

    /* スマホ等：内側スクロール無し（overflow: visible）のときはページスクロールで表示 */
    target.scrollIntoView({ behavior: behavior, block: 'start' });
  }

  function clearFilters() {
    filterState.regionId = null;
    filterState.regionName = '';
    filterState.subArea = null;
    filterState.subAreaLabel = null;
    filterState.keyword = '';
    filterState.featureTags = [];
    filterState.station = null;
    if (searchKeyword) searchKeyword.value = '';
    var stationInput = document.getElementById('search-station-input');
    if (stationInput) stationInput.value = '';
    searchResultsContainer.querySelectorAll('.spot-block').forEach(function (block) {
      block.classList.remove('spot-block--hidden');
    });
    searchResultsContainer.querySelectorAll('.spot-card').forEach(function (card) {
      card.classList.remove('spot-card--hidden');
    });
    document.querySelectorAll('.search-area-btn').forEach(function (btn) {
      btn.classList.remove('is-active');
    });
    renderSubareaButtons(null);
    renderStationButtons('');
    document.querySelectorAll('.search-feature-tag').forEach(function (btn) {
      btn.classList.remove('is-active');
    });
    applyFilters({ scrollToResults: true });
  }

  /** 住所から都道府県（〒付き・文中の県名にも対応） */
  function extractPrefecture(address) {
    if (!address) return null;
    var s = String(address).replace(/\s+/g, '').replace(/^〒?[0-9０-９]{3}-?[0-9０-９]{4}/, '');
    var prefRe = /(北海道|東京都|京都府|大阪府|(?:青森|岩手|宮城|秋田|山形|福島|茨城|栃木|群馬|埼玉|千葉|神奈川|新潟|富山|石川|福井|山梨|長野|岐阜|静岡|愛知|三重|滋賀|兵庫|奈良|和歌山|鳥取|島根|岡山|広島|山口|徳島|香川|愛媛|高知|福岡|佐賀|長崎|熊本|大分|宮崎|鹿児島|沖縄)県)/;
    var m = s.match(new RegExp('^' + prefRe.source));
    if (m) return m[1];
    m = s.match(prefRe);
    return m ? m[1] : null;
  }

  var TOKYO_23KU = (typeof window !== 'undefined' && window.AREA_TOKYO_23KU) ? window.AREA_TOKYO_23KU : {};
  if (!TOKYO_23KU || !TOKYO_23KU['世田谷区']) {
    TOKYO_23KU = {};
    '千代田区,中央区,港区,新宿区,文京区,台東区,墨田区,江東区,品川区,目黒区,大田区,世田谷区,渋谷区,中野区,杉並区,豊島区,北区,荒川区,板橋区,練馬区,足立区,葛飾区,江戸川区'.split(',').forEach(function (k) { TOKYO_23KU[k] = true; });
  }

/** その他タブ: 都道府県の並び（北海道→沖縄）。データがある県・府はこの順で表示 */
  var OTHER_PREF_ORDER = [
    '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
    '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
    '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県', '三重県',
    '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
    '鳥取県', '島根県', '岡山県', '広島県', '山口県',
    '徳島県', '香川県', '愛媛県', '高知県',
    '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
  ];
  function countTreeShops(node) {
    var c = 0;
    if (node.items) node.items.forEach(function (it) { c += it.count || 0; });
    if (node.children) node.children.forEach(function (ch) { c += countTreeShops(ch); });
    return c;
  }

  function sortByCount(arr) {
    return arr.sort(function (a, b) { return (b.count || 0) - (a.count || 0); });
  }

  function sortNodesByShops(nodes) {
    return nodes.sort(function (a, b) { return countTreeShops(b) - countTreeShops(a); });
  }

  /** エリアキーから都道府県プレフィックスを除去して表示名を短縮 */
  function stripPrefFromArea(area) {
    var m = area.match(/^(?:北海道|東京都|京都府|大阪府|.+?県)(.+)/);
    return (m && m[1]) ? m[1] : area;
  }

  /**
   * その他タブ用: エリアキーを市区郡町村単位にまとめる（区の細分はまとめて1ボタン）。
   * full は絞り込み用プレフィックス（例: 神奈川県横浜市）、display はボタン表記（例: 横浜市）。
   */
  function otherRegionCityBucket(pref, areaKey) {
    if (!areaKey || !pref || areaKey.indexOf(pref) !== 0) {
      return { filterPrefix: areaKey, display: stripPrefFromArea(areaKey) };
    }
    var rest = areaKey.slice(pref.length);
    var m;
    if (/^.+市市/.test(rest)) {
      m = rest.match(/^(.+市市)/);
    } else {
      m = rest.match(/^(.+?市)/) || rest.match(/^(.+?郡)/) || rest.match(/^(.+?[町村])/);
    }
    if (!m) {
      return { filterPrefix: areaKey, display: stripPrefFromArea(areaKey) };
    }
    return { filterPrefix: pref + m[1], display: m[1] };
  }

  function buildOtherPrefectureFlatCityTree(pref, list, counts) {
    var bucket = {};
    list.forEach(function (areaKey) {
      var b = otherRegionCityBucket(pref, areaKey);
      var fp = b.filterPrefix;
      if (!bucket[fp]) {
        bucket[fp] = { display: b.display, count: 0 };
      }
      bucket[fp].count += counts[areaKey] || 0;
    });
    var items = Object.keys(bucket).map(function (fp) {
      return { full: fp, display: bucket[fp].display, count: bucket[fp].count };
    });
    sortByCount(items);
    return { children: [], items: items };
  }

  function buildUnknownAreaFlatItems(list, counts) {
    var items = list.map(function (a) {
      return { full: a, display: stripPrefFromArea(a), count: counts[a] || 0 };
    });
    sortByCount(items);
    return { children: [], items: items };
  }

  function buildCityTree(areas, counts) {
    var cityMap = {};
    var flat = [];
    areas.forEach(function (area) {
      var cnt = counts[area] || 0;
      var m = area.match(/^(.+[市])(.+[区])$/);
      if (m) {
        if (!cityMap[m[1]]) cityMap[m[1]] = [];
        cityMap[m[1]].push({ full: area, display: m[2], count: cnt });
      } else {
        flat.push({ full: area, display: stripPrefFromArea(area), count: cnt });
      }
    });
    var node = { children: [], items: [] };
    Object.keys(cityMap).forEach(function (city) {
      var list = sortByCount(cityMap[city]);
      var sub = { items: list };
      var sc = countTreeShops(sub);
      /* 区が1つだけの市も「市名（件数）」見出しの下に置き、浜松・静岡・横浜などの階層を揃える */
      node.children.push({
        label: stripPrefFromArea(city) + '（' + sc + '）',
        items: list,
        _shopCount: sc
      });
    });
    sortByCount(flat);
    flat.forEach(function (item) {
      node.items.push(item);
    });
    sortByCount(node.items);
    node.children.sort(function (a, b) { return (b._shopCount || 0) - (a._shopCount || 0); });
    return node;
  }

  function buildOsakaNagoyaFukuokaHierarchy(kind, areas, counts) {
    var bucketFn;
    var stripPref;
    if (kind === 'osaka') {
      bucketFn = function (key) {
        if (/大阪府大阪市/.test(key)) return '大阪市';
        if (/大阪府堺市/.test(key)) return '堺市';
        if (/大阪府東大阪市/.test(key)) return '東大阪市';
        if (key === '大阪府') return '大阪府（住所から市区が特定できない店）';
        var m = key.match(/^大阪府(.+?市)/);
        return m ? m[1] : '大阪府（周辺エリア）';
      };
      stripPref = function (key) {
        if (key.indexOf('大阪府') === 0) return key.slice(3);
        return key;
      };
    } else if (kind === 'nagoya') {
      bucketFn = function (key) {
        if (/愛知県名古屋市/.test(key)) return '名古屋市';
        var m = key.match(/^愛知県(.+?市)/);
        return m ? m[1] : '愛知県（周辺エリア）';
      };
      stripPref = function (key) { return key.indexOf('愛知県') === 0 ? key.slice(3) : key; };
    } else {
      bucketFn = function (key) {
        if (/福岡県福岡市/.test(key)) return '福岡市';
        if (/福岡県北九州市/.test(key)) return '北九州市';
        var m = key.match(/^福岡県(.+?市)/);
        return m ? m[1] : '福岡県（周辺エリア）';
      };
      stripPref = function (key) { return key.indexOf('福岡県') === 0 ? key.slice(3) : key; };
    }
    var buckets = {};
    areas.forEach(function (key) {
      var b = bucketFn(key);
      if (!buckets[b]) buckets[b] = [];
      var disp = stripPref(key) || key;
      // バケット名（市名など）が先頭に重複する場合は除去して区名だけにする
      if (b && disp.indexOf(b) === 0) disp = disp.slice(b.length) || disp;
      buckets[b].push({ full: key, display: disp, count: counts[key] || 0 });
    });
    var children = Object.keys(buckets).map(function (b) {
      var items = sortByCount(buckets[b]);
      var sub = { items: items };
      return {
        label: b + '（' + countTreeShops(sub) + '）',
        items: items,
        _shopCount: countTreeShops(sub)
      };
    });
    children.sort(function (a, b) { return (b._shopCount || 0) - (a._shopCount || 0); });
    return { children: children, items: [] };
  }

  function buildHierarchy(regionId, areas, areaAddresses, areaCounts) {
    var counts = areaCounts || {};
    if (regionId === 'osaka') {
      return buildOsakaNagoyaFukuokaHierarchy('osaka', areas, counts);
    }
    if (regionId === 'nagoya') {
      return buildOsakaNagoyaFukuokaHierarchy('nagoya', areas, counts);
    }
    if (regionId === 'fukuoka') {
      return buildOsakaNagoyaFukuokaHierarchy('fukuoka', areas, counts);
    }
    if (regionId === 'tokyo') {
      var ku = [], shi = [];
      areas.forEach(function (a) {
        var ward = a.indexOf('東京都') === 0 ? a.slice(3) : a;
        var item = { full: a, display: ward, count: counts[a] || 0 };
        if (TOKYO_23KU[ward]) ku.push(item);
        else shi.push(item);
      });
      sortByCount(ku);
      sortByCount(shi);
      var node = { children: [], items: [] };
      if (ku.length) {
        node.children.push({
          label: '23区（' + ku.length + '）',
          items: ku
        });
      }
      if (shi.length) {
        node.children.push({
          label: '23区以外（' + shi.length + '）',
          items: shi
        });
      }
      return node;
    }
    if (regionId === 'other') {
      var prefAreas = {};
      areas.forEach(function (a) {
        var pref = extractPrefecture(areaAddresses[a]);
        if (!pref) {
          if (!prefAreas.__unknown__) prefAreas.__unknown__ = [];
          prefAreas.__unknown__.push(a);
        } else {
          if (!prefAreas[pref]) prefAreas[pref] = [];
          prefAreas[pref].push(a);
        }
      });
      var root = { children: [], items: [] };
      OTHER_PREF_ORDER.forEach(function (pref) {
        var list = prefAreas[pref];
        if (!list || !list.length) return;
        var ct = buildOtherPrefectureFlatCityTree(pref, list, counts);
        var sc = countTreeShops(ct);
        if (sc === 0) return;
        root.children.push({
          label: pref + '（' + sc + '）',
          children: ct.children,
          items: ct.items,
          _shopCount: sc
        });
      });
      if (prefAreas.__unknown__ && prefAreas.__unknown__.length) {
        var ctU = buildUnknownAreaFlatItems(prefAreas.__unknown__, counts);
        if (countTreeShops(ctU) > 0) {
          root.children.push({
            label: '住所不明（' + countTreeShops(ctU) + '）',
            children: ctU.children,
            items: ctU.items
          });
        }
      }
      return root;
    }
    return buildCityTree(areas, counts);
  }

  function createSubareaBtn(fullArea, displayText, shopCount) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'search-area-btn search-subarea-btn';
    btn.textContent = displayText + '（' + shopCount + '）';
    btn.setAttribute('data-subarea', fullArea);
    btn.addEventListener('click', function () {
      if (filterState.subArea === fullArea) {
        filterState.subArea = null;
        filterState.subAreaLabel = null;
      } else {
        filterState.subArea = fullArea;
        filterState.subAreaLabel = displayText;
      }
      filterState.station = null;
      var si = document.getElementById('search-station-input');
      if (si) si.value = '';
      document.querySelectorAll('.search-subarea-btn').forEach(function (b) {
        b.classList.toggle('is-active', b.getAttribute('data-subarea') === filterState.subArea);
      });
      renderStationButtons('');
      applyFilters();
    });
    if (filterState.subArea === fullArea) btn.classList.add('is-active');
    return btn;
  }

  function renderTree(container, node, depth) {
    if (node.children && node.children.length > 0) {
      node.children.forEach(function (child) {
        var hasNested = child.children && child.children.length > 0;
        if (!hasNested && child.items && child.items.length > 0) {
          var groupTitle = document.createElement('p');
          groupTitle.className = 'search-subarea-group-title';
          groupTitle.textContent = child.label;
          container.appendChild(groupTitle);
          var flatWrap = document.createElement('div');
          flatWrap.className = 'search-hier-buttons search-hier-buttons--flat';
          child.items.forEach(function (item) {
            flatWrap.appendChild(createSubareaBtn(item.full, item.display, item.count || 0));
          });
          container.appendChild(flatWrap);
          return;
        }
        var det = document.createElement('details');
        det.className = 'search-hier-group search-hier-d' + Math.min(depth, 3);
        var sum = document.createElement('summary');
        sum.className = 'search-hier-summary';
        sum.textContent = child.label;
        det.appendChild(sum);
        var inner = document.createElement('div');
        inner.className = 'search-hier-inner';
        renderTree(inner, child, depth + 1);
        det.appendChild(inner);
        container.appendChild(det);
      });
    }
    if (node.items && node.items.length > 0) {
      var wrap = document.createElement('div');
      wrap.className = 'search-hier-buttons';
      node.items.forEach(function (item) {
        wrap.appendChild(createSubareaBtn(item.full, item.display, item.count || 0));
      });
      container.appendChild(wrap);
    }
  }

  function renderSubareaButtons(regionId) {
    if (!searchSubareaButtons) return;
    searchSubareaButtons.innerHTML = '';
    if (!regionId || !regionHierarchy[regionId]) {
      if (searchSubareaPanel) {
        searchSubareaPanel.setAttribute('hidden', '');
      }
      return;
    }
    if (searchSubareaPanel) {
      searchSubareaPanel.removeAttribute('hidden');
    }
    if (searchSubareaSummary) {
      var regionName = '';
      AREAS.forEach(function (a) { if (a.id === regionId) regionName = a.name; });
      searchSubareaSummary.textContent = regionName + 'のエリア';
    }
    renderTree(searchSubareaButtons, regionHierarchy[regionId], 0);
  }

  /* ── 最寄駅フィルター ── */
  function buildStationCounts(regionId) {
    var counts = {};
    if (!searchResultsContainer) return counts;
    var subArea = filterState.subArea || null;
    searchResultsContainer.querySelectorAll('.spot-block').forEach(function (block) {
      if (regionId && block.getAttribute('data-region') !== regionId) return;
      block.querySelectorAll('.spot-card').forEach(function (card) {
        if (subArea) {
          var cardArea = card.getAttribute('data-area') || '';
          var match = cardArea === subArea;
          if (!match && filterState.regionId === 'tokyo' && TOKYO_23KU[subArea]) {
            match = cardArea === '東京都' + subArea;
          }
          if (!match && filterState.regionId === 'other') {
            match = cardArea.indexOf(subArea) === 0;
          }
          if (!match) return;
        }
        var st = card.getAttribute('data-station') || '';
        if (!st) return;
        counts[st] = (counts[st] || 0) + 1;
      });
    });
    return counts;
  }

  function renderStationButtons(query) {
    var container = document.getElementById('search-station-buttons');
    if (!container) return;
    container.innerHTML = '';
    var counts = buildStationCounts(filterState.regionId);
    var q = (query || '').replace(/\s+/g, '');
    var entries = Object.keys(counts)
      .filter(function (st) { return !q || st.indexOf(q) !== -1; })
      .sort(function (a, b) { return counts[b] - counts[a]; });
    entries.forEach(function (st) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'search-station-btn';
      btn.textContent = st.replace(/駅$/, '') + '（' + counts[st] + '）';
      btn.setAttribute('data-station', st);
      if (filterState.station === st) btn.classList.add('is-active');
      btn.addEventListener('click', function () {
        filterState.station = filterState.station === st ? null : st;
        container.querySelectorAll('.search-station-btn').forEach(function (b) {
          b.classList.toggle('is-active', b.getAttribute('data-station') === filterState.station);
        });
        applyFilters();
      });
      container.appendChild(btn);
    });
  }

  var searchStationInput = document.getElementById('search-station-input');
  if (searchStationInput) {
    searchStationInput.addEventListener('input', function () {
      renderStationButtons(this.value);
    });
  }

  var searchAreaButtons = document.getElementById('search-area-buttons');
  if (searchAreaButtons) {
    AREAS.forEach(function (area) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'search-area-btn';
      btn.textContent = area.name;
      btn.setAttribute('data-filter', area.id);
      btn.setAttribute('data-region-name', area.name);
      btn.addEventListener('click', function () {
        filterState.regionId = filterState.regionId === area.id ? null : area.id;
        filterState.regionName = filterState.regionId ? area.name : '';
        filterState.subArea = null;
        filterState.subAreaLabel = null;
        filterState.station = null;
        var si = document.getElementById('search-station-input');
        if (si) si.value = '';
        document.querySelectorAll('.search-area-btn:not(.search-subarea-btn)').forEach(function (b) {
          b.classList.toggle('is-active', b.getAttribute('data-filter') === filterState.regionId);
        });
        renderSubareaButtons(filterState.regionId);
        renderStationButtons('');
        applyFilters();
      });
      searchAreaButtons.appendChild(btn);
    });
  }

  if (searchKeyword) {
    searchKeyword.addEventListener('input', function () {
      filterState.keyword = this.value;
      applyFilters({ scrollToResults: false });
    });
  }

  bindSearchInputKeyboardAlign();

  if (searchJumpToFeatures) {
    searchJumpToFeatures.addEventListener('click', function (e) {
      e.preventDefault();
      openSearchSidebarIfCollapsed();
      var target = document.getElementById('search-features-section');
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          if (!target) return;
          scrollFilterPanelToElement(target);
          try {
            target.focus({ preventScroll: true });
          } catch (err) {
            target.focus();
          }
        });
      });
    });
  }

  var searchFeatureTagsEl = document.getElementById('search-feature-tags');
  if (searchFeatureTagsEl) {
    FEATURE_CATEGORIES.forEach(function (category) {
      var categoryBlock = document.createElement('div');
      categoryBlock.className = 'search-feature-category';
      var categoryTitle = document.createElement('span');
      categoryTitle.className = 'search-feature-category-title';
      categoryTitle.textContent = category.label;
      categoryBlock.appendChild(categoryTitle);
      var tagsWrap = document.createElement('div');
      tagsWrap.className = 'search-feature-tags';
      category.tags.forEach(function (tag) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'search-feature-tag';
        btn.textContent = tag;
        btn.setAttribute('data-tag', tag);
        btn.addEventListener('click', function () {
          var idx = filterState.featureTags.indexOf(tag);
          if (idx === -1) filterState.featureTags.push(tag);
          else filterState.featureTags.splice(idx, 1);
          this.classList.toggle('is-active', filterState.featureTags.indexOf(tag) !== -1);
          applyFilters();
        });
        tagsWrap.appendChild(btn);
      });
      categoryBlock.appendChild(tagsWrap);
      searchFeatureTagsEl.appendChild(categoryBlock);
    });
  }

  if (searchFilterClear) searchFilterClear.addEventListener('click', clearFilters);

  var shopModal = document.getElementById('shop-modal');
  var shopModalClose = document.querySelector('.shop-modal-close');
  var shopModalBackdrop = document.querySelector('.shop-modal-backdrop');

  function openShopModal(shop) {
    if (!shopModal || !shop) return;
    var area = shop.area || '';
    var name = shop.name || '';
    var description = shop.description || '—';
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
    document.getElementById('shop-modal-hours').textContent =
      formatHoursMultiline(shop.hoursNote || '') || '店舗に要確認';
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

  if (searchResultsContainer) {
    searchResultsContainer.addEventListener('click', function (e) {
      var card = e.target.closest('.spot-card');
      if (!card) return;
      var raw = card.getAttribute('data-shop');
      if (!raw) return;
      try {
        openShopModal(JSON.parse(raw));
      } catch (err) {}
    });
  }

  var url = new URL('shops.json', window.location.href).href;
  fetch(url)
    .then(function (res) { return res.ok ? res.json() : Promise.reject(new Error('読み込み失敗')); })
    .then(function (data) {
      if (searchLoading) searchLoading.classList.add('is-hidden');

      var regions = data.regions || [];
      regionAreasMap = {};
      regionHierarchy = {};
      regions.forEach(function (region) {
        var set = {};
        var areaAddresses = {};
        var areaCounts = {};
        (region.shops || []).forEach(function (shop) {
          var na = typeof normalizeShopArea === 'function'
            ? normalizeShopArea(shop, region.id)
            : { key: shop.area || '', display: shop.area || '' };
          var key = na.key;
          if (!key) return;
          set[key] = true;
          areaCounts[key] = (areaCounts[key] || 0) + 1;
          if (!areaAddresses[key] && shop.address) {
            areaAddresses[key] = shop.address;
          }
        });
        regionAreasMap[region.id] = Object.keys(set).sort();
        regionHierarchy[region.id] = buildHierarchy(region.id, Object.keys(set), areaAddresses, areaCounts);
      });

      var initialArea = getInitialArea();
      if (initialArea) {
        filterState.regionId = initialArea;
        var names = { tokyo: '東京', osaka: '大阪', nagoya: '名古屋', fukuoka: '福岡', other: 'その他' };
        filterState.regionName = names[initialArea] || '';
      }

      var totalCards = 0;
      regions.forEach(function (region) {
        var block = document.createElement('div');
        block.className = 'spot-block';
        block.setAttribute('data-region', region.id);
        var title = document.createElement('h3');
        title.className = 'spot-block-title';
        title.textContent = region.name;
        block.appendChild(title);
        var grid = document.createElement('div');
        grid.className = 'spot-grid';
        sortShopsByScore(region.shops || []).forEach(function (shop) {
          grid.appendChild(buildShopCard(shop, region.id));
          totalCards++;
        });
        block.appendChild(grid);
        searchResultsContainer.appendChild(block);
      });

      document.querySelectorAll('#search-area-buttons > .search-area-btn').forEach(function (btn) {
        btn.classList.toggle('is-active', btn.getAttribute('data-filter') === filterState.regionId);
      });

      if (filterState.subArea && !filterState.subAreaLabel && filterState.regionId) {
        var sk = filterState.subArea;
        var rid = filterState.regionId;
        if (rid === 'tokyo' && sk.indexOf('東京都') === 0) filterState.subAreaLabel = sk.slice(3);
        else if (rid === 'osaka' && sk.indexOf('大阪府') === 0) filterState.subAreaLabel = sk.slice(3);
        else if (rid === 'nagoya' && sk.indexOf('愛知県') === 0) filterState.subAreaLabel = sk.slice(3);
        else if (rid === 'fukuoka' && sk.indexOf('福岡県') === 0) filterState.subAreaLabel = sk.slice(3);
        else if (rid === 'other') filterState.subAreaLabel = stripPrefFromArea(sk) || sk;
        else filterState.subAreaLabel = sk;
      }

      renderSubareaButtons(filterState.regionId);
      document.querySelectorAll('.search-subarea-btn').forEach(function (b) {
        b.classList.toggle('is-active', b.getAttribute('data-subarea') === filterState.subArea);
      });
      renderStationButtons('');
      applyFilters({ scrollToResults: false });
    })
    .catch(function () {
      if (searchLoading) {
        searchLoading.textContent = '店舗情報の読み込みに失敗しました。しばらくしてから再読み込みしてください。';
        searchLoading.classList.remove('is-hidden');
      }
      if (searchResultConditions) {
        searchResultConditions.textContent = '店舗データを読み込めませんでした。';
      }
      if (searchResultCountValue) {
        searchResultCountValue.textContent = '—';
      }
    });
})();
