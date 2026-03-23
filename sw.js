// ============================================================
// SERVICE WORKER — Iqra Qur'an Reader
//
// All paths are relative to the SW file's location.
// This makes the app work whether hosted at root (domain.com/)
// or in a subfolder (domain.com/iqra/) — no 404s.
//
// Caching strategies:
//   App Shell   → Cache First (instant load, offline safe)
//   Quran API   → Network First → Cache (fresh when online,
//                 works offline once a surah has been loaded)
//   Audio MP3s  → Cache First (replay without re-downloading)
// ============================================================

const APP_VERSION = 'iqra-v6.3';
const SHELL_CACHE = APP_VERSION + '-shell';
const API_CACHE   = APP_VERSION + '-api';
const AUDIO_CACHE = APP_VERSION + '-audio';

// Relative paths — work at any hosting subfolder depth
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './css/design-system.css',
  './css/components.css',
  './app.js',
  './js/data/surahs.js',
  './js/data/juz.js',
  './js/data/sajdah.js',
  './js/data/reciters.js',
  './js/services/store.js',
  './js/services/quran-api.js',
  './js/services/offline.js',
  './js/services/notifications.js',
  './js/core/theme.js',
  './js/core/i18n.js',
  './js/core/settings.js',
  './js/pages/overview.js',
  './js/pages/reader.js',
  './js/pages/bookmarks.js',
  './js/pages/profile.js',
  './js/pages/tour.js',
  './fonts/KFGQPCUthmanicScriptHAFS.woff2',
  './fonts/IndoPakNastaleeq.woff2',
  './icons/logo-iqra.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png',
  './icons/favicon-32.png',
];

// ── Install ────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

// ── Activate — delete old caches ──────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k.startsWith('iqra-') && ![SHELL_CACHE, API_CACHE, AUDIO_CACHE].includes(k))
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch — route by origin/hostname ──────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Audio files — cache first so replays are instant and offline
  if (url.hostname === 'everyayah.com') {
    event.respondWith(cacheFirst(request, AUDIO_CACHE));
    return;
  }

  // Quran API — network first so text is always fresh when online
  if (url.hostname === 'api.quran.com' || url.hostname === 'api.alquran.cloud') {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Google Fonts — cache first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }



  // App shell (same origin) — cache first
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // Everything else — straight to network
  event.respondWith(fetch(request));
});

// ── Cache First ────────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return offlineFallback(request);
  }
}

// ── Network First ──────────────────────────────────────────
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || offlineFallback(request);
  }
}

// ── Offline fallback ───────────────────────────────────────
function offlineFallback(request) {
  const url = new URL(request.url);
  if (url.hostname.includes('quran') || url.hostname.includes('alquran')) {
    return new Response(
      JSON.stringify({ error: 'offline' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
  if (request.mode === 'navigate') {
    return caches.match('./index.html');
  }
  return new Response('Offline', { status: 503 });
}

// ============================================================
// NOTIFICATIONS — Service Worker side
//
// Receives SCHEDULE_NOTIFICATION messages from the app.
// Uses setTimeout to fire at the exact scheduled time.
// Timers are stored in memory — survive as long as the SW lives.
// On Android PWA the SW is kept alive by the OS reliably.
// ============================================================

// In-memory timer store: notifType → timeoutId
const _notifTimers = {};

self.addEventListener('message', event => {
  const msg = event.data;
  if (!msg) return;

  if (msg.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (msg.type === 'SCHEDULE_NOTIFICATION') {
    _scheduleNotification(msg);
    return;
  }

  if (msg.type === 'CANCEL_NOTIFICATION') {
    _cancelNotification(msg.notifType);
    return;
  }
});

function _scheduleNotification(msg) {
  const { notifType, delay, data, icon, badge } = msg;

  // Cancel any existing timer for this type
  _cancelNotification(notifType);

  if (delay < 0) return; // already passed — skip

  // Store the full message in case SW restarts before firing
  // (SW restarts wipe setTimeout — we use this to reschedule)
  _notifTimers[notifType + '_msg'] = msg;
  _notifTimers[notifType + '_fireAt'] = Date.now() + delay;

  // Cap at 24h + 1min to avoid timer precision issues on long delays
  const safeDelay = Math.min(delay, 24 * 60 * 60 * 1000 + 60000);

  _notifTimers[notifType] = setTimeout(() => _fireNotification(msg), safeDelay);
}

async function _fireNotification(msg) {
  const { notifType, data, icon, badge } = msg;
  try {
    let title, body;

    if (msg.fetchAyah) {
      const result = await _fetchAyahForNotif(
        msg.surahNum, msg.ayahNum, msg.lang,
        msg.surahName, msg.surahNameUr, msg.surahNameHi
      );
      title = result.title;
      body  = result.body;
    } else {
      title = msg.title;
      body  = msg.body;
    }

    await self.registration.showNotification(title, {
      body,
      icon:     icon  || './icons/icon-192.png',
      badge:    badge || './icons/favicon-32.png',
      tag:      'iqra-' + notifType,
      renotify: false,
      vibrate:  [200, 100, 200],
      data:     data || {},
      actions: [
        { action: 'open',    title: 'Open Iqra' },
        { action: 'dismiss', title: 'Dismiss'   },
      ],
    });
  } catch(e) {
    console.warn('Iqra: notification failed', e);
  }
}

// ── Fetch ayah text for the Ayah of the Day notification ──
// Tries Quran.com for Arabic, AlQuran.cloud for translation.
// Falls back to surah name + ayah number if offline.
async function _fetchAyahForNotif(surahNum, ayahNum, lang, nameEn, nameUr, nameHi) {
  // Title — always surah name + ayah number (clean, clear)
  const surahName = lang === 'ur' ? nameUr : lang === 'hi' ? nameHi : nameEn;
  const ayahLabel = lang === 'ur' ? 'آیت' : lang === 'hi' ? 'आयत' : 'Ayah';
  const title = (lang === 'ur' ? 'آج کی آیت' :
                 lang === 'hi' ? 'आज की आयत' : 'Ayah of the Day');

  // Fallback body — used if fetch fails
  const fallbackBody = surahName + ' · ' + ayahLabel + ' ' + ayahNum;

  try {
    // Fetch Arabic text from Quran.com
    const arUrl = 'https://api.quran.com/api/v4/verses/by_key/' +
      surahNum + ':' + ayahNum +
      '?language=en&words=false&fields=text_uthmani';

    // Fetch translation from AlQuran.cloud
    const edition = lang === 'ur' ? 'ur.jalandhry' :
                    lang === 'hi' ? 'hi.hindi'      : 'en.sahih';
    const trUrl = 'https://api.alquran.cloud/v1/ayah/' +
      surahNum + ':' + ayahNum + '/' + edition;

    const [arRes, trRes] = await Promise.all([
      fetch(arUrl),
      fetch(trUrl),
    ]);

    if (!arRes.ok || !trRes.ok) throw new Error('fetch failed');

    const [arData, trData] = await Promise.all([
      arRes.json(),
      trRes.json(),
    ]);

    // Sanitise Arabic — strip Uthmanic combining marks that cause issues
    const arabic = (arData.verse?.text_uthmani || '')
      .replace(/[ۭ۟۠ۢ]/g, '')
      .trim();

    const translation = (trData.data?.text || '').trim();

    // Truncate Arabic to ~40 chars so it fits in notification
    const arabicShort = arabic.length > 42
      ? arabic.substring(0, 40) + '…'
      : arabic;

    // Truncate translation to ~80 chars
    const transShort = translation.length > 82
      ? translation.substring(0, 80) + '…'
      : translation;

    // Body: Arabic on first line, translation on second
    const body = arabicShort + '\n' + transShort;

    return { title, body };

  } catch(e) {
    // Offline or API error — fall back to surah name + ayah number
    console.warn('Iqra: ayah fetch for notification failed, using fallback', e.message);
    return { title, body: fallbackBody };
  }
}

function _cancelNotification(notifType) {
  if (_notifTimers[notifType]) {
    clearTimeout(_notifTimers[notifType]);
    delete _notifTimers[notifType];
  }
}

// ── Notification click → open app at correct ayah ─────────
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const data    = event.notification.data || {};
  const surah   = data.surah || 1;
  const ayah    = data.ayah  || 1;
  const notifType = event.notification.tag?.replace('iqra-', '') || '';

  const url = self.registration.scope +
    '?notif=' + notifType +
    '&surah=' + surah +
    '&ayah='  + ayah;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        // If app already open — focus it and navigate
        for (const client of windowClients) {
          if ('focus' in client) {
            client.focus();
            client.navigate(url);
            return;
          }
        }
        // App not open — open a new window
        return clients.openWindow(url);
      })
  );
});
