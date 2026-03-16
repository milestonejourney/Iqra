// ============================================================
// STORE — Iqra Qur'an Reader V2
// All localStorage persistence. No Firebase.
// ============================================================

const STORE_PREFIX = 'iqra_v1_';

function _get(key)        { try { return localStorage.getItem(STORE_PREFIX + key); } catch(e) { return null; } }
function _set(key, value) { try { localStorage.setItem(STORE_PREFIX + key, value); } catch(e) {} }
function _del(key)        { try { localStorage.removeItem(STORE_PREFIX + key); } catch(e) {} }

// ── Theme ─────────────────────────────────────────────────
function loadTheme()           { return _get('theme')        || 'dark'; }
function saveTheme(t)          { _set('theme', t); }

// ── Text sizes ────────────────────────────────────────────
function loadArabicSize()      { return _get('arabic_size')  || 'md'; }
function saveArabicSize(s)     { _set('arabic_size', s); }
function loadTransSize()       { return _get('trans_size')   || 'md'; }
function saveTransSize(s)      { _set('trans_size', s); }

// ── Language ──────────────────────────────────────────────
function loadLang()            { return _get('lang')         || 'en'; }
function saveLang(l)           { _set('lang', l); }

// ── Last position ─────────────────────────────────────────
function loadLastSurah()       { return parseInt(_get('last_surah')) || 1; }
function saveLastSurah(n)      { _set('last_surah', n); }
function loadLastAyah(surahNum){ return parseInt(_get('last_ayah_' + (surahNum || 1))) || 1; }
function saveLastAyah(surahNum, ayahNum) { _set('last_ayah_' + surahNum, ayahNum); }
function loadLastPage()        { return _get('last_page') || 'overview'; }
function saveLastPage(p)       { _set('last_page', p); }

// ── Reciter ───────────────────────────────────────────────
function loadReciter()         { return _get('reciter') || 'afasy'; }
function saveReciter(id)       { _set('reciter', id); }

// ── Reading mode ──────────────────────────────────────────
function loadReadingMode()     { return _get('reading_mode') === '1'; }
function saveReadingMode(on)   { _set('reading_mode', on ? '1' : '0'); }

// ── Overview view mode: 'surah' | 'juz' ──────────────────
function loadViewMode()        { return _get('view_mode') || 'surah'; }
function saveViewMode(m)       { _set('view_mode', m); }

// ── Favourite surahs ──────────────────────────────────────
function loadFavourites() {
  try { return JSON.parse(_get('favourites') || '[]'); } catch(e) { return []; }
}
function saveFavourites(arr)   { _set('favourites', JSON.stringify(arr)); }

function isFavourite(surahNum) { return loadFavourites().includes(surahNum); }

function toggleFavourite(surahNum) {
  const favs = loadFavourites();
  const idx  = favs.indexOf(surahNum);
  if (idx === -1) favs.push(surahNum);
  else            favs.splice(idx, 1);
  saveFavourites(favs);
  return idx === -1; // true = now favourite
}

// ── Bookmarks ─────────────────────────────────────────────
// Each bookmark: { id, surahNum, ayahNum, arabic, note, savedAt }
function loadBookmarks() {
  try { return JSON.parse(_get('bookmarks') || '[]'); } catch(e) { return []; }
}
function saveBookmarks(arr)    { _set('bookmarks', JSON.stringify(arr)); }

function addBookmark(surahNum, ayahNum, arabic, note) {
  const bm = loadBookmarks();
  // Prevent duplicate on same ayah
  const exists = bm.find(b => b.surahNum === surahNum && b.ayahNum === ayahNum);
  if (exists) {
    exists.note    = note || exists.note;
    exists.savedAt = Date.now();
    saveBookmarks(bm);
    return exists;
  }
  const entry = { id: Date.now(), surahNum, ayahNum, arabic, note: note || '', savedAt: Date.now() };
  bm.unshift(entry);
  saveBookmarks(bm);
  return entry;
}

function removeBookmark(id) {
  saveBookmarks(loadBookmarks().filter(b => b.id !== id));
}

function isBookmarked(surahNum, ayahNum) {
  return loadBookmarks().some(b => b.surahNum === surahNum && b.ayahNum === ayahNum);
}

// ── Offline cached surahs ─────────────────────────────────
function loadCachedSurahs() {
  try { return JSON.parse(_get('cached_surahs') || '[]'); } catch(e) { return []; }
}
function markSurahCached(num) {
  const cached = loadCachedSurahs();
  if (!cached.includes(num)) { cached.push(num); _set('cached_surahs', JSON.stringify(cached)); }
}
function isSurahCached(num)  { return loadCachedSurahs().includes(num); }

// ── Tour seen ─────────────────────────────────────────────
// (used by tour.js directly via _get/_set)

// ── Notifications ─────────────────────────────────────────
// notifType: 'aotd' | 'kahf' | 'mulk'

function loadNotifEnabled(type)     { return _get('notif_on_' + type) !== '0'; } // default ON once permission granted
function saveNotifEnabled(type, on) { _set('notif_on_' + type, on ? '1' : '0'); }

function loadNotifTime(type)        { return _get('notif_time_' + type) || null; }
function saveNotifTime(type, time)  { _set('notif_time_' + type, time); }
