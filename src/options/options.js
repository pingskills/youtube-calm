const ALL_KEYS = [
  'calmMode', 'hideHomeFeed', 'hideShorts', 'hideSidebar', 'hideComments',
  'hideEndScreen', 'hideAutoplay', 'hideInfoCards', 'hideTrending',
  'hideNotificationBadge', 'hideLiveChat', 'hideMerch', 'grayscale',
  'sessionTimerVisible', 'dailyLimitEnabled', 'dailyLimitMinutes',
  'intentionalityPrompt',
];

// --- Load saved settings into UI ---

chrome.storage.local.get(ALL_KEYS, (data) => {
  for (const key of ALL_KEYS) {
    const el = document.querySelector(`[data-key="${key}"]`);
    if (!el) continue;
    if (el.type === 'checkbox') {
      el.checked = !!data[key];
    }
  }

  const limitInput = document.getElementById('daily-limit-input');
  limitInput.value = data.dailyLimitMinutes ?? 60;
  syncLimitRow(!!data.dailyLimitEnabled);
});

// --- Load watch time stats ---

chrome.runtime.sendMessage({ type: 'GET_WATCH_TODAY' }, (res) => {
  if (chrome.runtime.lastError || !res) return;
  document.getElementById('stat-today').textContent = formatSeconds(res.watchToday);
  // Weekly stat not tracked yet — placeholder
  document.getElementById('stat-week').textContent = '—';
});

// --- Wire up checkbox changes ---

document.querySelectorAll('[data-key]').forEach((el) => {
  el.addEventListener('change', () => {
    const key = el.dataset.key;
    const val = el.type === 'checkbox' ? el.checked : el.value;
    chrome.storage.local.set({ [key]: val });

    if (key === 'dailyLimitEnabled') {
      syncLimitRow(el.checked);
    }
  });
});

// --- Daily limit minutes input ---

const limitInput = document.getElementById('daily-limit-input');
limitInput.addEventListener('change', () => {
  const val = Math.max(5, Math.min(480, parseInt(limitInput.value, 10) || 60));
  limitInput.value = val;
  chrome.storage.local.set({ dailyLimitMinutes: val });
});

// --- Reset to defaults ---

document.getElementById('reset-defaults').addEventListener('click', () => {
  if (!confirm('Reset all YouTube Calm settings to defaults?')) return;
  chrome.runtime.sendMessage({ type: 'RESET_DEFAULTS' }, () => {
    chrome.storage.local.get(ALL_KEYS, (data) => {
      for (const key of ALL_KEYS) {
        const el = document.querySelector(`[data-key="${key}"]`);
        if (el && el.type === 'checkbox') el.checked = !!data[key];
      }
      const inp = document.getElementById('daily-limit-input');
      inp.value = data.dailyLimitMinutes ?? 60;
      syncLimitRow(!!data.dailyLimitEnabled);
    });
  });
});

// --- Helpers ---

function syncLimitRow(enabled) {
  document.getElementById('limit-minutes-row').classList.toggle('hidden', !enabled);
}

function formatSeconds(total) {
  if (!total) return '0m';
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
