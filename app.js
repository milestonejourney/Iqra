// ============================================================
// APP.JS — Iqra V2
// ============================================================

// ── Unified position save (completion-aware) ──────────────
function _savePosition() {
  if (typeof Reader === 'undefined') return;
  const { surahNum, currentAyah } = Reader.state;
  if (!surahNum || !currentAyah) return;
  saveLastSurah(surahNum);
  // If at or past last ayah → save exact total so isSurahComplete() = true
  const meta = typeof getSurahMeta === 'function' ? getSurahMeta(surahNum) : null;
  const toSave = (meta && currentAyah >= meta.ayahs) ? meta.ayahs : currentAyah;
  saveLastAyah(surahNum, toSave);
}

function showPage(pageName) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + pageName);
  if (!target) return;
  target.classList.add('active');
  saveLastPage(pageName);

  document.querySelectorAll('.bottom-nav-btn').forEach(btn => {
    btn.classList.toggle('active-page', btn.getAttribute('data-page') === pageName);
  });

  // Save reader position whenever navigating away
  if (pageName !== 'reader' && typeof Reader !== 'undefined') {
    _savePosition();
  }

  if (pageName === 'overview')   Overview.render();
  if (pageName === 'bookmarks')  Bookmarks.render();
  if (pageName === 'reader') {
    if (Reader.state.ayahs.length === 0) {
      Reader.init(); // first load
    } else {
      // Already loaded — just scroll to saved position
      requestAnimationFrame(() => {
        Reader._scrollToAyah(Reader.state.currentAyah, 'instant');
      });
    }
  }
}

// Toast notification
function showToast(msg) {
  let toast = document.getElementById('app-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 2800);
}

document.addEventListener('DOMContentLoaded', async () => {

  initI18n();
  initTheme();
  Offline.updateStorageDisplay();

  // Init reader silently in background — no scroll yet (page is hidden)
  await Reader.init();

  // NOW show overview — Reader.state.surahNum is correct, tile will highlight
  showPage('overview');

  // Init profile — streak, achievements, setup prompt
  Profile.init();

  // Init notifications — checks permission, reschedules active ones
  await Notifications.init();

  // Handle tap on a notification (URL params)
  Notifications.handleNotifClick();

  if (Tour.shouldAutoShow()) {
    setTimeout(() => Tour.open(), 800);
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === ' ' || e.key === 'k') { e.preventDefault(); Reader.toggleSurahPlay(); }
    if (e.key === 'ArrowRight') nextSurah();
    if (e.key === 'ArrowLeft')  prevSurah();
    if (e.key === 'r') toggleReadingMode();
    if (e.key === 'Escape') {
      closeSurahSelector();
      closeSettings();
      Tour.close();
      Bookmarks.closeSheet();
    }
  });

  document.getElementById('surah-modal')?.addEventListener('click', e => {
    if (e.target === document.getElementById('surah-modal')) closeSurahSelector();
  });

  document.getElementById('bookmark-sheet-backdrop')?.addEventListener('click', () => {
    Bookmarks.closeSheet();
  });

  document.getElementById('surah-search')?.addEventListener('input', e => {
    renderSurahList(e.target.value);
  });

  document.getElementById('ayah-goto-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') gotoAyah();
  });

  // ── Ayah position tracker ────────────────────────────────
  // touchend is most reliable on mobile PWA for detecting
  // which ayah the user is currently reading
  document.addEventListener('touchend', () => {
    if (!document.getElementById('page-reader')?.classList.contains('active')) return;
    const mid = window.innerHeight / 2;
    const blocks = document.querySelectorAll('.ayah-block');
    let best = null, bestDist = Infinity;
    blocks.forEach(b => {
      const rect = b.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        const dist = Math.abs(rect.top + rect.height / 2 - mid);
        if (dist < bestDist) { bestDist = dist; best = b; }
      }
    });
    if (best) {
      Reader.state.currentAyah = parseInt(best.dataset.num);
      _checkSurahComplete();
    }
  }, { passive: true });

  // Also track on scroll for desktop
  let _scrollTimer = null;
  window.addEventListener('scroll', () => {
    if (!document.getElementById('page-reader')?.classList.contains('active')) return;
    clearTimeout(_scrollTimer);
    _scrollTimer = setTimeout(() => {
      const mid = window.innerHeight / 2;
      const blocks = document.querySelectorAll('.ayah-block');
      let best = null, bestDist = Infinity;
      blocks.forEach(b => {
        const rect = b.getBoundingClientRect();
        const dist = Math.abs(rect.top + rect.height / 2 - mid);
        if (dist < bestDist) { bestDist = dist; best = b; }
      });
      if (best) {
        Reader.state.currentAyah = parseInt(best.dataset.num);
        _checkSurahComplete();
      }
    }, 150);
  }, { passive: true });

  // Mark surah complete when last ayah is visible anywhere in viewport
  function _checkSurahComplete() {
    const { surahNum, ayahs } = Reader.state;
    if (!surahNum || !ayahs.length) return;
    const meta = getSurahMeta(surahNum);
    if (!meta) return;

    // Check if the last ayah block is visible anywhere in the viewport
    const lastAyahEl = document.getElementById('ayah-' + meta.ayahs);
    if (!lastAyahEl) return;

    const rect = lastAyahEl.getBoundingClientRect();
    const isVisible = rect.top < window.innerHeight && rect.bottom > 0;

    if (isVisible) {
      // Last ayah is on screen — mark surah complete
      saveLastAyah(surahNum, meta.ayahs);
    }
  }

  // Save position when app backgrounds or closes
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') _savePosition();
  });
  window.addEventListener('pagehide', _savePosition);

  // Tour swipe
  let _tourTouchX = null;
  document.getElementById('tour-card')?.addEventListener('touchstart', e => {
    _tourTouchX = e.touches[0].clientX;
  }, { passive: true });
  document.getElementById('tour-card')?.addEventListener('touchend', e => {
    if (_tourTouchX === null) return;
    const diff = _tourTouchX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { diff > 0 ? Tour.next() : Tour.prev(); }
    _tourTouchX = null;
  }, { passive: true });
});
