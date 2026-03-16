// ============================================================
// THEME — Iqra V2
// Dark/light + text sizes + reading mode + reciter
// ============================================================

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  saveTheme(theme);
  document.querySelectorAll('[data-theme-btn]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-theme-btn') === theme);
  });
}

function setArabicSize(size) {
  document.documentElement.setAttribute('data-arabic-size', size);
  saveArabicSize(size);
  document.querySelectorAll('[data-arabic-size-btn]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-arabic-size-btn') === size);
  });
}

function setTransSize(size) {
  document.documentElement.setAttribute('data-trans-size', size);
  saveTransSize(size);
  document.querySelectorAll('[data-trans-size-btn]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-trans-size-btn') === size);
  });
}

function setReadingMode(on) {
  document.documentElement.classList.toggle('reading-mode', on);
  saveReadingMode(on);
  const btn = document.getElementById('reading-mode-btn');
  if (btn) {
    btn.classList.toggle('active', on);
    const lbl = btn?.querySelector('.rm-label'); if (lbl) lbl.textContent = on ? (typeof t === 'function' ? t('reading_mode_on') : 'On') : (typeof t === 'function' ? t('reading_mode_off') : 'Off');
  }
}

function toggleReadingMode() {
  setReadingMode(!loadReadingMode());
}

function setReciter(id) {
  saveReciter(id);
  // Stop any playing audio — reciter changed
  if (typeof Reader !== 'undefined') Reader._stopAudio();
  document.querySelectorAll('[data-reciter-btn]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-reciter-btn') === id);
  });
}

function initTheme() {
  setTheme(loadTheme());
  setArabicSize(loadArabicSize());
  setTransSize(loadTransSize());
  setReadingMode(loadReadingMode());
  // Mark active reciter button
  const rid = loadReciter();
  document.querySelectorAll('[data-reciter-btn]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-reciter-btn') === rid);
  });
}
