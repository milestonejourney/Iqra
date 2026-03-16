// ============================================================
// QURAN API — Iqra V2
// Arabic:       Quran.com API v4 (no Bismillah prepended)
// Translations: AlQuran.cloud (named edition identifiers)
// Audio:        everyayah.com (reciter folder from store)
// ============================================================

const _cache = {};

// ── Arabic sanitiser ──────────────────────────────────────
function _sanitiseArabic(text) {
  if (!text) return '';
  return text.replace(/[\u06DF\u06E0\u06E2\u06ED]/g, '');
}

// ── Fetch Arabic from Quran.com ───────────────────────────
async function _fetchArabic(surahNum) {
  const url = 'https://api.quran.com/api/v4/verses/by_chapter/' + surahNum +
    '?language=en&words=false&fields=text_uthmani&per_page=300&page=1';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Quran.com error: ' + res.status);
  const data = await res.json();
  const map = {};
  (data.verses || []).forEach(v => {
    map[v.verse_number] = _sanitiseArabic(v.text_uthmani || '');
  });
  return map;
}

// ── Fetch one translation from AlQuran.cloud ──────────────
async function _fetchTranslation(surahNum, edition) {
  const url = 'https://api.alquran.cloud/v1/surah/' + surahNum + '/' + edition;
  const res = await fetch(url);
  if (!res.ok) throw new Error('AlQuran.cloud error (' + edition + '): ' + res.status);
  const data = await res.json();
  const map = {};
  (data.data?.ayahs || []).forEach(a => { map[a.numberInSurah] = a.text || ''; });
  return map;
}

// ── Primary fetch ─────────────────────────────────────────
async function _fetchPrimary(surahNum) {
  const [arabicMap, enMap, urMap, hiMap] = await Promise.all([
    _fetchArabic(surahNum),
    _fetchTranslation(surahNum, 'en.sahih'),
    _fetchTranslation(surahNum, 'ur.jalandhry'),
    _fetchTranslation(surahNum, 'hi.hindi'),
  ]);
  return Object.keys(arabicMap).map(num => {
    const n = parseInt(num);
    return {
      num,            arabic:         arabicMap[n],
      translation_en: enMap[n]  || '',
      translation_ur: urMap[n]  || '',
      translation_hi: hiMap[n]  || '',
    };
  }).sort((a, b) => a.num - b.num);
}

// ── Fallback: AlQuran.cloud for Arabic ────────────────────
async function _fetchFallback(surahNum) {
  const [arMap, enMap, urMap, hiMap] = await Promise.all([
    _fetchTranslation(surahNum, 'quran-uthmani'),
    _fetchTranslation(surahNum, 'en.sahih'),
    _fetchTranslation(surahNum, 'ur.jalandhry'),
    _fetchTranslation(surahNum, 'hi.hindi'),
  ]);
  const meta = getSurahMeta(surahNum);
  return Object.keys(arMap).map(num => {
    const n = parseInt(num);
    let arabic = _sanitiseArabic(arMap[n] || '');
    if (n === 1 && meta.bismillah) {
      arabic = arabic.replace(/^بِسْمِ\s+ٱللَّهِ\s+ٱلرَّحْمَٰنِ\s+ٱلرَّحِيمِ\s*/, '').trim();
    }
    return {
      num: n, arabic,
      translation_en: enMap[n]  || '',
      translation_ur: urMap[n]  || '',
      translation_hi: hiMap[n]  || '',
    };
  }).sort((a, b) => a.num - b.num);
}

// ── Public: fetch surah ───────────────────────────────────
async function fetchSurah(surahNum) {
  if (_cache[surahNum]) return _cache[surahNum];
  let ayahs;
  try {
    ayahs = await _fetchPrimary(surahNum);
  } catch (err) {
    console.warn('Primary fetch failed, trying fallback:', err.message);
    try {
      ayahs = await _fetchFallback(surahNum);
    } catch (err2) {
      throw new Error('Could not load surah ' + surahNum + '. Please check your connection.');
    }
  }
  _cache[surahNum] = ayahs;
  markSurahCached(surahNum);
  return ayahs;
}

// ── Public: audio URL (reciter-aware) ────────────────────
function getAudioUrl(surahNum, ayahNum) {
  const reciter = getReciter(loadReciter());
  const s = String(surahNum).padStart(3, '0');
  const a = String(ayahNum).padStart(3, '0');
  return 'https://everyayah.com/data/' + reciter.folder + '/' + s + a + '.mp3';
}

// ── Public: prefetch ──────────────────────────────────────
function prefetchSurah(surahNum) {
  if (surahNum >= 1 && surahNum <= 114 && !_cache[surahNum]) {
    fetchSurah(surahNum).catch(() => {});
  }
}

// ── Offline: download all surahs ─────────────────────────
async function downloadAllSurahs(onProgress) {
  let done = 0;
  for (let i = 1; i <= 114; i++) {
    try {
      await fetchSurah(i);
    } catch(e) {
      console.warn('Could not cache surah', i);
    }
    done++;
    if (onProgress) onProgress(done, 114);
  }
}
