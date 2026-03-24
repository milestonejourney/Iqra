// ============================================================
// PROFILE — Iqra
// User name, reading goal, streak, monthly badge.
// Lives inside the Settings panel — no extra nav tab.
// ============================================================

const Profile = {

  // ── Init — called on every app open ───────────────────────
  init() {
    this.updateStreak();
    this.checkAchievements();
    this.updateSettingsUI();

    // Show setup prompt on first open if no name set
    if (!loadUserName()) {
      setTimeout(() => this.showSetup(), 1200);
    }
  },

  // ── Streak ────────────────────────────────────────────────
  updateStreak() {
    const streak   = loadStreak();
    const today    = new Date().toDateString();
    const lastDate = streak.lastDate;

    if (lastDate === today) return; // already counted today

    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const newCount  = lastDate === yesterday ? streak.count + 1 : 1;

    saveStreak({ count: newCount, lastDate: today });
  },

  getStreak() {
    return loadStreak().count || 0;
  },

  // ── Goal progress ─────────────────────────────────────────
  getGoalProgress() {
    const goal = loadUserGoal();
    if (!goal) return null;

    const now        = new Date();
    let completed    = 0;

    if (goal.type === 'surahs') {
      // Count surahs completed this period
      const achievements = loadAchievements();
      const periodStart  = this._periodStart(goal.period);
      // Count from completedSurahs that were last read in this period
      completed = SURAHS.filter(s => {
        if (!isSurahComplete(s.num)) return false;
        const ayah = loadLastAyah(s.num);
        return ayah >= s.ayahs;
      }).length;
      // Cap at goal for display
      completed = Math.min(completed, goal.count * 2); // show over-achievement too
    }

    const target  = goal.count;
    const pct     = Math.min(100, Math.round((completed / target) * 100));
    const reached = completed >= target;

    return { completed, target, pct, reached, goal };
  },

  _periodStart(period) {
    const now = new Date();
    if (period === 'day')   return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (period === 'week')  {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay());
      return d;
    }
    if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
    return new Date(0);
  },

  // ── Achievements ──────────────────────────────────────────
  checkAchievements() {
    const newlyEarned = [];

    // 🔥 First week streak
    if (this.getStreak() >= 7 && awardAchievement('streak_7')) {
      newlyEarned.push({ id: 'streak_7', icon: '🔥', label: t('ach_streak_7') });
    }

    // 📖 Al-Kahf completed
    if (isSurahComplete(18) && awardAchievement('kahf_complete')) {
      newlyEarned.push({ id: 'kahf_complete', icon: '🕌', label: t('ach_kahf') });
    }

    // 🌙 Al-Mulk completed
    if (isSurahComplete(67) && awardAchievement('mulk_complete')) {
      newlyEarned.push({ id: 'mulk_complete', icon: '🌙', label: t('ach_mulk') });
    }

    // ✨ First 10 surahs
    if (getCompletedSurahCount() >= 10 && awardAchievement('surahs_10')) {
      newlyEarned.push({ id: 'surahs_10', icon: '✨', label: t('ach_surahs_10') });
    }

    // 🏅 Goal met
    const progress = this.getGoalProgress();
    if (progress?.reached && awardAchievement('goal_met_' + new Date().getMonth())) {
      newlyEarned.push({ id: 'goal_met', icon: '🏅', label: t('ach_goal_met') });
    }

    // Show toast for newly earned
    if (newlyEarned.length > 0) {
      setTimeout(() => {
        newlyEarned.forEach((a, i) => {
          setTimeout(() => showToast(a.icon + ' ' + a.label), i * 1200);
        });
      }, 1500);
    }
  },

  // ── Settings UI ───────────────────────────────────────────
  updateSettingsUI() {
    const name    = loadUserName();
    const streak  = this.getStreak();
    const goal    = loadUserGoal();
    const progress= this.getGoalProgress();
    const done    = getCompletedSurahCount();

    // Greeting
    const greetEl = document.getElementById('profile-greeting');
    if (greetEl) {
      greetEl.textContent = name
        ? t('greeting') + ', ' + name
        : t('greeting_generic');
    }

    // Streak
    const streakEl = document.getElementById('profile-streak');
    if (streakEl) streakEl.textContent = streak;

    // Progress bar
    const barEl    = document.getElementById('profile-goal-bar');
    const labelEl  = document.getElementById('profile-goal-label');
    const badgeEl  = document.getElementById('profile-goal-badge');

    if (progress && barEl) {
      barEl.style.width = progress.pct + '%';
      if (labelEl) {
        const periodLabel = t('period_' + progress.goal.period);
        labelEl.textContent = progress.completed + ' / ' + progress.target
          + ' ' + t('surahs_goal') + ' · ' + periodLabel;
      }
      if (badgeEl) {
        badgeEl.style.display = progress.reached ? 'inline-block' : 'none';
      }
    } else if (barEl) {
      barEl.style.width = '0%';
      if (labelEl) labelEl.textContent = t('no_goal_set');
      if (badgeEl) badgeEl.style.display = 'none';
    }

    // Surahs completed count
    const doneEl = document.getElementById('profile-surahs-done');
    if (doneEl) doneEl.textContent = done + ' / 114';

    // Achievements
    const achEl = document.getElementById('profile-achievements');
    if (achEl) {
      const all = this._allAchievementDefs();
      const earned = loadAchievements();
      achEl.innerHTML = all.map(a => {
        const isEarned = earned.some(e => e.id === a.id);
        return `<div class="ach-badge ${isEarned ? 'earned' : 'locked'}" title="${a.label}">
          <span class="ach-icon">${a.icon}</span>
          <span class="ach-label">${a.label}</span>
        </div>`;
      }).join('');
    }

    // Name input
    // Update name input (both settings and setup modal)
    ['profile-name-input', 'setup-name-input'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el !== document.activeElement) el.value = name || '';
    });

    // Goal inputs
    const goalCount = document.getElementById('profile-goal-count');
    const goalPeriod = document.getElementById('profile-goal-period');
    if (goalCount && goal)  goalCount.value  = goal.count;
    if (goalPeriod && goal) goalPeriod.value = goal.period;
  },

  _allAchievementDefs() {
    return [
      { id: 'streak_7',    icon: '🔥', label: t('ach_streak_7')  },
      { id: 'kahf_complete', icon: '🕌', label: t('ach_kahf')    },
      { id: 'mulk_complete', icon: '🌙', label: t('ach_mulk')    },
      { id: 'surahs_10',   icon: '✨', label: t('ach_surahs_10') },
      { id: 'goal_met',    icon: '🏅', label: t('ach_goal_met')  },
    ];
  },

  // ── Save profile from settings ────────────────────────────
  saveName() {
    const input = document.getElementById('profile-name-input');
    if (!input) return;
    const name = input.value.trim();
    if (name) {
      saveUserName(name);
      this.updateSettingsUI();
      showToast(t('profile_saved'));
    }
  },

  saveGoal() {
    const countEl  = document.getElementById('profile-goal-count');
    const periodEl = document.getElementById('profile-goal-period') || document.getElementById('profile-goal-period');
    if (!countEl || !periodEl) return;
    const count = parseInt(countEl.value);
    if (!count || count < 1) return;
    saveUserGoal({ type: 'surahs', count, period: periodEl.value });
    this.updateSettingsUI();
    showToast(t('goal_saved'));
  },

  // ── First-time setup prompt ───────────────────────────────
  showSetup() {
    const modal = document.getElementById('profile-setup-modal');
    if (modal) modal.classList.add('open');
  },

  closeSetup() {
    document.getElementById('profile-setup-modal')?.classList.remove('open');
  },

  saveSetup() {
    const nameEl   = document.getElementById('setup-name-input');
    const countEl  = document.getElementById('setup-goal-count');
    const periodEl = document.getElementById('setup-goal-period');
    const name  = nameEl?.value.trim() || '';
    const count = parseInt(countEl?.value) || 5;
    const period = periodEl?.value || 'week';
    if (name) saveUserName(name);
    saveUserGoal({ type: 'surahs', count, period });
    this.closeSetup();
    this.updateSettingsUI();
    showToast((name ? t('greeting') + ', ' + name + '! ' : '') + t('goal_saved'));
  },
};
