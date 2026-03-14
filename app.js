// ============================================================
// APP.JS — Iqra Qur'an Reader
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

  if (pageName === 'overview') Overview.render();
  if (pageName === 'reader' && Reader.state.ayahs.length === 0) Reader.init();
}

document.addEventListener('DOMContentLoaded', async () => {

  initTheme();
  initI18n();

  // Start on overview
  showPage('overview');

  // Init reader in background
  await Reader.init();

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === ' ' || e.key === 'k') { e.preventDefault(); Reader.toggleSurahPlay(); }
    if (e.key === 'ArrowRight') nextSurah();
    if (e.key === 'ArrowLeft')  prevSurah();
    if (e.key === 'Escape') { closeSurahSelector(); closeSettings(); }
  });

  // Modal backdrop click to close
  document.getElementById('surah-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('surah-modal')) closeSurahSelector();
  });

  // Surah search
  document.getElementById('surah-search').addEventListener('input', e => {
    renderSurahList(e.target.value);
  });

  // Ayah goto — enter key
  const ayahInput = document.getElementById('ayah-goto-input');
  if (ayahInput) {
    ayahInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') gotoAyah();
    });
  }
});
