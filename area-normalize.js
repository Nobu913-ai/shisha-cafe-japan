/**
 * 住所と地域 ID から、店舗カード・エリア絞り込み用の正規化キーと表示ラベルを返す。
 * Google マップ由来で area に丁目付き住所が入っているケースを吸収する。
 */
(function (global) {
  'use strict';

  var TOKYO_23KU = {};
  '千代田区,中央区,港区,新宿区,文京区,台東区,墨田区,江東区,品川区,目黒区,大田区,世田谷区,渋谷区,中野区,杉並区,豊島区,北区,荒川区,板橋区,練馬区,足立区,葛飾区,江戸川区'.split(',').forEach(function (k) {
    TOKYO_23KU[k] = true;
  });

  /* 47都道府県（jp_address_norm と同順・逆順補正用） */
  var JP_PREF_ALT =
    '北海道|青森県|岩手県|宮城県|秋田県|山形県|福島県|茨城県|栃木県|群馬県|埼玉県|千葉県|東京都|神奈川県|新潟県|富山県|石川県|福井県|山梨県|長野県|岐阜県|静岡県|愛知県|三重県|滋賀県|京都府|大阪府|兵庫県|奈良県|和歌山県|鳥取県|島根県|岡山県|広島県|山口県|徳島県|香川県|愛媛県|高知県|福岡県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県';

  function halfZip(a, b) {
    var d = '０１２３４５６７８９';
    var h = '0123456789';
    function t(x) {
      var o = '';
      for (var i = 0; i < x.length; i++) {
        var c = x.charAt(i);
        var j = d.indexOf(c);
        o += j >= 0 ? h.charAt(j) : c;
      }
      return o;
    }
    return t(a) + '-' + t(b);
  }

  /** ビル・丁目が先で「区→市→県」が後ろの表記を「〒 都道府県市区… 番地」に直す（compact 前の生住所向け） */
  function canonicalizeJapanAddress(raw) {
    if (!raw) return raw;
    var orig = String(raw).trim();
    var norm = orig.replace(/[\s　]+/g, ' ');
    if (new RegExp('^\\s*(?:(?:〒?\\s*)?[0-9０-９]{3}[-－‐]?[0-9０-９]{4}\\s+)?(' + JP_PREF_ALT + ')').test(norm)) {
      return orig;
    }
    var zipReG = /〒?\s*([0-9０-９]{3})[-－‐]?\s*([0-9０-９]{4})/g;
    var zips = [];
    var zm;
    while ((zm = zipReG.exec(orig)) !== null) {
      zips.push(halfZip(zm[1], zm[2]));
    }
    var chosenZip = zips.length ? zips[zips.length - 1] : null;
    var body = orig.replace(/〒?\s*([0-9０-９]{3})[-－‐]?\s*([0-9０-９]{4})/g, ' ');
    body = body.replace(/[\s　]+/g, ' ').replace(/^[,，、\s]+|[,，、\s]+$/g, '');
    var tailZ = body.match(/([0-9０-９]{3})[-－‐]?\s*([0-9０-９]{4})\s*$/);
    if (tailZ) {
      chosenZip = chosenZip || halfZip(tailZ[1], tailZ[2]);
      body = body.slice(0, tailZ.index).replace(/[,，、\s]+$/g, '');
    }
    if (!body) return orig;

    function swapChome(tail) {
      var t = String(tail)
        .replace(/\s+/g, '')
        .replace(/^[,，、]+|[,，、]+$/g, '');
      var mm = t.match(/^(.+?[0-9０-９一二三四五六七八九十]+丁目[-‐－−の0-9０-９]+)([\u3040-\u30ff\u4e00-\u9fff々〆ヶヵ]+)$/);
      return mm ? mm[2] + mm[1] : tail.trim();
    }

    var prefEnd = new RegExp('(' + JP_PREF_ALT + ')$');
    if (body.slice(-3) === '東京都') {
      var r = body.slice(0, -3).replace(/[,，、\s]+$/g, '');
      var kuM = r.match(/([\u3040-\u30ff\u4e00-\u9fff\u30a0-\u30ff]{1,12}区)$/);
      if (!kuM) return orig;
      var ku = kuM[1];
      var prefix = r.slice(0, r.length - ku.length).replace(/[,，、\s]+$/g, '');
      prefix = prefix.replace(/^[0-9０-９]{3}[-－‐]?[0-9０-９]{4}\s*/, '');
      var street = prefix ? swapChome(prefix) : '';
      var parts = [];
      if (chosenZip) parts.push('〒' + chosenZip);
      parts.push('東京都' + ku);
      if (street) parts.push(street);
      var out = parts.join(' ').replace(/\s+/g, ' ').trim();
      return out === norm.trim() ? orig : out;
    }

    var pm = body.match(prefEnd);
    if (!pm) return orig;
    var pref = pm[1];
    var r1 = body.slice(0, body.length - pref.length).replace(/[,，、\s]+$/g, '');
    if (!r1) return orig;
    var ixKu = r1.lastIndexOf('区');
    if (ixKu < 0) return orig;
    var tail = r1.slice(ixKu + 1).replace(/^[,，、\s]+|[,，、\s]+$/g, '');
    if (!tail || tail.indexOf('区') >= 0 || tail.slice(-1) !== '市') return orig;
    if (!/^[\u3040-\u30ff\u4e00-\u9fff\u30a0-\u30ff]{1,14}市$/.test(tail)) return orig;
    var shi = tail;
    var rest = r1.slice(0, ixKu + 1);
    var ku = '';
    var prefix = '';
    var klen;
    for (klen = 2; klen <= 8; klen++) {
      if (rest.length < klen + 1) break;
      var cand = rest.slice(-(klen + 1));
      if (/^[\u3040-\u30ff\u4e00-\u9fff\u30a0-\u30ff]{2,8}区$/.test(cand)) {
        ku = cand;
        prefix = rest.slice(0, rest.length - klen - 1).replace(/[,，、\s]+$/g, '');
        break;
      }
    }
    if (!ku && rest.length >= 2) {
      var c2 = rest.slice(-2);
      if (/^[\u3040-\u30ff\u4e00-\u9fff\u30a0-\u30ff]区$/.test(c2)) {
        ku = c2;
        prefix = rest.slice(0, -2).replace(/[,，、\s]+$/g, '');
      }
    }
    if (!ku) return orig;
    prefix = prefix.replace(/^[0-9０-９]{3}[-－‐]?[0-9０-９]{4}\s*/, '').replace(/^[,，、\s]+/, '');
    var street2 = prefix ? swapChome(prefix) : '';
    var admin = pref + shi + ku;
    var parts2 = [];
    if (chosenZip) parts2.push('〒' + chosenZip);
    parts2.push(admin);
    if (street2) parts2.push(street2);
    var out2 = parts2.join(' ').replace(/\s+/g, ' ').trim();
    return out2 === norm.trim() ? orig : out2;
  }

  function compactAddr(s) {
    if (!s) return '';
    return String(s).replace(/\s+/g, '').replace(/^〒?[0-9０-９]{3}-?[0-9０-９]{4}/, '');
  }

  /* 大阪市24区（「◯◯区大阪市大阪府」など順序が逆の住所用。短い区名は後ろに配置） */
  var OSAKA_SHI_KU =
    '東住吉区|西淀川区|東淀川区|天王寺区|此花区|都島区|福島区|大正区|浪速区|東成区|生野区|城東区|鶴見区|阿倍野区|住吉区|西成区|住之江区|平野区|中央区|北区|南区|西区|港区|旭区|淀川区';

  function isGarbageRawArea(raw) {
    if (!raw) return true;
    var t = String(raw).replace(/\s+/g, '');
    if (t.length > 12) return true;
    if (/[0-9０-９]{3}-?[0-9０-９]{4}/.test(t)) return true;
    if (/丁目|番地|ビル|マンション|F\d|１F|1F/i.test(t)) return true;
    return false;
  }

  /**
   * @param {object} shop
   * @param {string} regionId tokyo|osaka|nagoya|fukuoka|other
   * @returns {{ key: string, display: string }}
   */
  function normalizeShopArea(shop, regionId) {
    var rawAddr = shop.address || shop.住所 || '';
    var addr = compactAddr(canonicalizeJapanAddress(rawAddr));
    var raw = String(shop.area || '').trim();
    var rawC = raw.replace(/\s+/g, '');

    function ret(key, display) {
      var k = key || display || '';
      var d = display || key || '—';
      return { key: k, display: d };
    }

    var m;
    if (regionId === 'tokyo') {
      m = addr.match(/東京都(.+?区)/);
      if (m && m[1] && TOKYO_23KU[m[1]]) {
        return ret('東京都' + m[1], m[1]);
      }
      m = addr.match(/東京都([^区]+?市)/);
      if (m && m[1]) {
        return ret('東京都' + m[1], m[1]);
      }
      if (TOKYO_23KU[rawC]) {
        return ret('東京都' + rawC, rawC);
      }
      if (rawC && /^[^0-9０-９〒丁目]{1,8}区$/.test(rawC)) {
        return ret('東京都' + rawC, rawC);
      }
      if (rawC && /^[^0-9０-９〒丁目]{1,12}市$/.test(rawC) && !isGarbageRawArea(rawC)) {
        return ret('東京都' + rawC, rawC);
      }
      return ret(rawC || '東京都', rawC || '—');
    }

    if (regionId === 'osaka') {
      /* 兵庫・京都などは shops.json 上「その他」リージョンへ分類（大阪タブに混ぜない） */

      /* 「中央区大阪市大阪府」型（英語・丁目が先に付く表記ゆれ） */
      m = addr.match(new RegExp('(' + OSAKA_SHI_KU + ')大阪市大阪府'));
      if (m && m[1]) {
        return ret('大阪府大阪市' + m[1], '大阪市' + m[1]);
      }

      m = addr.match(/大阪府(大阪市.+?区)/);
      if (m && m[1]) {
        return ret('大阪府' + m[1], m[1]);
      }
      m = addr.match(/大阪府(堺市.+?区)/);
      if (m && m[1]) {
        return ret('大阪府' + m[1], m[1]);
      }
      m = addr.match(/大阪府(東大阪市.+?区)/);
      if (m && m[1]) {
        return ret('大阪府' + m[1], m[1]);
      }
      /* 大阪府が文中にある場合はそこから再パース */
      var idx = addr.indexOf('大阪府');
      if (idx >= 0) {
        var tail = addr.slice(idx);
        m = tail.match(/大阪府(大阪市.+?区)/) || tail.match(/大阪府(堺市.+?区)/) || tail.match(/大阪府(東大阪市.+?区)/) || tail.match(/大阪府(.+?市)/);
        if (m && m[1]) {
          return ret('大阪府' + m[1], m[1]);
        }
      }
      /* 府表記なしで「大阪市◯◯区」から始まる略記 */
      m = addr.match(/^(大阪市.+?区)/);
      if (m && m[1]) {
        return ret('大阪府' + m[1], m[1]);
      }
      m = addr.match(/大阪府(.+?市)/);
      if (m && m[1]) {
        return ret('大阪府' + m[1], m[1]);
      }
      if (rawC === '大阪' || rawC === '大阪市') {
        return ret('大阪府', '大阪府内');
      }
      if (rawC && !isGarbageRawArea(rawC) && rawC.length <= 14) {
        return ret('大阪府' + rawC, rawC);
      }
      return ret('大阪府', '大阪府内');
    }

    if (regionId === 'nagoya') {
      m = addr.match(/愛知県(名古屋市.+?区)/);
      if (m && m[1]) {
        return ret('愛知県' + m[1], m[1]);
      }
      m = addr.match(/愛知県(.+?市)/);
      if (m && m[1]) {
        return ret('愛知県' + m[1], m[1]);
      }
      if (rawC && !isGarbageRawArea(rawC) && rawC.length <= 14) {
        return ret('愛知県' + rawC, rawC);
      }
      return ret('愛知県', '愛知県内');
    }

    if (regionId === 'fukuoka') {
      m = addr.match(/福岡県(福岡市.+?区)/);
      if (m && m[1]) {
        return ret('福岡県' + m[1], m[1]);
      }
      m = addr.match(/福岡県(北九州市.+?区)/);
      if (m && m[1]) {
        return ret('福岡県' + m[1], m[1]);
      }
      m = addr.match(/福岡県(.+?市)/);
      if (m && m[1]) {
        return ret('福岡県' + m[1], m[1]);
      }
      if (rawC === '福岡' || rawC === '福岡市') {
        return ret('福岡県', '福岡県内');
      }
      if (rawC && !isGarbageRawArea(rawC) && rawC.length <= 14) {
        return ret('福岡県' + rawC, rawC);
      }
      return ret('福岡県', '福岡県内');
    }

    /* other: 県 / 道 / 府 + 市（+区あれば） */
    m = addr.match(/^(北海道|東京都|大阪府|京都府|.+?県)/);
    if (m) {
      var pref = m[1];
      var rest = addr.slice(pref.length);
      /* 区の直前が漢字・かなのみ（1〜6文字）の場合だけ区まで取得（「E区画」等の誤マッチを防ぐ） */
      var m2 = rest.match(/^(.+?市[\u3040-\u30ff\u4e00-\u9fff]{1,6}区)/) || rest.match(/^(.+?市)/) || rest.match(/^(.+?[町村])/);
      if (m2 && m2[1]) {
        return ret(pref + m2[1], m2[1]);
      }
    }
    if (rawC && !isGarbageRawArea(rawC)) {
      return ret(rawC, rawC);
    }
    return ret('その他', 'その他');
  }

  global.normalizeShopArea = normalizeShopArea;
  global.AREA_TOKYO_23KU = TOKYO_23KU;
})(typeof window !== 'undefined' ? window : globalThis);
