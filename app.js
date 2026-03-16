// ============================================================
// APP.JS — Iqra V2
// ============================================================

function showPage(pageName) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + pageName);
  if (!target) return;
  target.classList.add('active');
  saveLastPage(pageName);

  document.querySelectorAll('.bottom-nav-btn').forEach(btn => {
    btn.classList.toggle('active-page', btn.getAttribute('data-page') === pageName);
  });

  if (pageName === 'overview')   Overview.render();
  if (pageName === 'bookmarks')  Bookmarks.render();
  if (pageName === 'reader' && Reader.state.ayahs.length === 0) Reader.init();
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

  showPage('overview');
  await Reader.init();

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
