const ALLOWED_ORIGINS = ['https://shisha-cafe.jp', 'https://www.shisha-cafe.jp'];
const ALLOWED_WIDTHS = [320, 640, 800];
const MAX_PLACE_ID_LENGTH = 200;
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
// 写真レスポンスのキャッシュ期間。Google Places API（Place Details + Place Photo）の
// 呼び出し回数=課金を削減するのが目的。同一店の再表示でAPIを叩かない。
const PHOTO_CACHE_TTL_SEC = 7 * 24 * 60 * 60; // 7日

const rateLimitMap = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.start > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { start: now, count: 1 });
    return false;
  }
  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) return true;
  return false;
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    const corsHeaders = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const referer = request.headers.get('Referer') || '';
    const allowed =
      ALLOWED_ORIGINS.includes(origin) ||
      ALLOWED_ORIGINS.some(function (o) { return referer.startsWith(o + '/'); });

    if (!allowed) {
      return jsonResponse({ error: 'Forbidden' }, 403, corsHeaders);
    }

    const clientIp = request.headers.get('CF-Connecting-IP') || '';
    if (clientIp && isRateLimited(clientIp)) {
      return jsonResponse({ error: 'Too many requests' }, 429, corsHeaders);
    }

    if (request.method !== 'GET') {
      return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
    }

    const url = new URL(request.url);
    const placeId = (url.searchParams.get('placeId') || '').trim();
    const widthParam = parseInt(url.searchParams.get('width') || '640', 10);

    if (!placeId || placeId.length > MAX_PLACE_ID_LENGTH) {
      return jsonResponse({ error: 'Invalid placeId' }, 400, corsHeaders);
    }

    const width = ALLOWED_WIDTHS.includes(widthParam)
      ? widthParam
      : ALLOWED_WIDTHS.reduce((prev, curr) =>
          Math.abs(curr - widthParam) < Math.abs(prev - widthParam) ? curr : prev
        );

    const apiKey = env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return jsonResponse({ error: 'Server configuration error' }, 500, corsHeaders);
    }

    // キャッシュ確認（オリジン非依存キー。ヒット時は Google API を叩かない）
    // ペイロードのみキャッシュし、CORS ヘッダは配信時にリクエスト毎で付与する。
    const cache = caches.default;
    const cacheKey = new Request(
      'https://place-photo-cache.internal/photo?placeId=' +
        encodeURIComponent(placeId) +
        '&width=' +
        width,
      { method: 'GET' }
    );
    const cachedRes = await cache.match(cacheKey);
    if (cachedRes) {
      const cachedBody = await cachedRes.text();
      return new Response(cachedBody, {
        status: 200,
        headers: Object.assign({}, corsHeaders, {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
        }),
      });
    }

    try {
      const detailsUrl =
        'https://places.googleapis.com/v1/places/' +
        encodeURIComponent(placeId) +
        '?fields=photos&key=' +
        apiKey;

      const detailsRes = await fetch(detailsUrl);
      if (!detailsRes.ok) {
        return jsonResponse(null, 200, corsHeaders);
      }

      const details = await detailsRes.json();
      const photos = details.photos;
      if (!photos || photos.length === 0) {
        return jsonResponse(null, 200, corsHeaders);
      }

      const photo = photos[0];
      const photoName = photo.name;

      const photoUrl =
        'https://places.googleapis.com/v1/' +
        photoName +
        '/media?maxWidthPx=' +
        width +
        '&skipHttpRedirect=true&key=' +
        apiKey;

      const photoRes = await fetch(photoUrl);
      if (!photoRes.ok) {
        return jsonResponse(null, 200, corsHeaders);
      }

      const photoData = await photoRes.json();

      const attributions = (photo.authorAttributions || []).map(function (a) {
        return {
          displayName: a.displayName || '',
          uri: a.uri || '',
        };
      });

      const payload = {
        photoUrl: photoData.photoUri || null,
        attributions: attributions,
        source: 'Google Maps',
      };
      const payloadJson = JSON.stringify(payload);

      // 写真が取れた場合のみキャッシュ（null/失敗はキャッシュせず次回リトライさせる）。
      if (payload.photoUrl) {
        const toCache = new Response(payloadJson, {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=' + PHOTO_CACHE_TTL_SEC,
          },
        });
        ctx.waitUntil(cache.put(cacheKey, toCache));
      }

      return new Response(payloadJson, {
        status: 200,
        headers: Object.assign({}, corsHeaders, {
          'Content-Type': 'application/json',
          'X-Cache': 'MISS',
        }),
      });
    } catch (e) {
      return jsonResponse(null, 200, corsHeaders);
    }
  },
};

function jsonResponse(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: Object.assign({}, headers, { 'Content-Type': 'application/json' }),
  });
}
