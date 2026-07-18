const ALL_KEYS = [
  'calmMode', 'hideHomeFeed', 'hideShorts', 'hideSidebar', 'hideComments',
  'hideEndScreen', 'hideAutoplay', 'hideInfoCards', 'hideTrending',
  'hideNotificationBadge', 'hideLiveChat', 'hideMerch', 'grayscale',
  'sessionTimerVisible', 'dailyLimitEnabled', 'dailyLimitMinutes',
  'intentionalityPrompt', 'allowlistedChannels',
];

// --- Load saved settings into UI ---

chrome.storage.local.get(ALL_KEYS, (data) => {
  for (const key of ALL_KEYS) {
    const el = document.querySelector(`[data-key="${key}"]`);
    if (!el) continue;
    if (el.type === 'checkbox') el.checked = !!data[key];
  }
  document.getElementById('daily-limit-input').value = data.dailyLimitMinutes ?? 60;
  syncLimitRow(!!data.dailyLimitEnabled);

  allowlistedChannels = data.allowlistedChannels || [];
  renderAllowlist();
});

// --- Week stats & chart ---

chrome.runtime.sendMessage({ type: 'GET_WEEK_STATS' }, (res) => {
  if (chrome.runtime.lastError || !res) return;

  document.getElementById('stat-today').textContent = formatSeconds(res.days[6].seconds);
  document.getElementById('stat-week').textContent = formatSeconds(res.weekTotal);

  renderWeekChart(res.days);
});

function renderWeekChart(days) {
  const chart = document.getElementById('week-chart');
  const today = new Date().toISOString().slice(0, 10);
  const max = Math.max(...days.map((d) => d.seconds), 1);

  chart.innerHTML = days.map((d) => {
    const pct = d.seconds / max;
    const label = new Date(d.date + 'T12:00:00')
      .toLocaleDateString('en', { weekday: 'short' });
    const isToday = d.date === today;
    return `
      <div class="week-col">
        <div class="week-bar${isToday ? ' today' : ''}"
             style="--pct: ${pct}"
             title="${label}: ${formatSeconds(d.seconds)}"></div>
        <div class="week-label">${label}</div>
      </div>
    `;
  }).join('');
}

// --- Checkbox changes ---

document.querySelectorAll('[data-key]').forEach((el) => {
  el.addEventListener('change', () => {
    const key = el.dataset.key;
    const val = el.type === 'checkbox' ? el.checked : el.value;
    chrome.storage.local.set({ [key]: val });
    if (key === 'dailyLimitEnabled') syncLimitRow(el.checked);
  });
});

// --- Daily limit minutes ---

const limitInput = document.getElementById('daily-limit-input');
limitInput.addEventListener('change', () => {
  const val = Math.max(5, Math.min(480, parseInt(limitInput.value, 10) || 60));
  limitInput.value = val;
  chrome.storage.local.set({ dailyLimitMinutes: val });
});

// --- Allowlist ---

let allowlistedChannels = [];

document.getElementById('allowlist-add').addEventListener('click', addChannel);
document.getElementById('allowlist-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addChannel();
});

function addChannel() {
  const input = document.getElementById('allowlist-input');
  const val = input.value.trim().replace(/^@/, '').toLowerCase();
  input.value = '';
  if (!val || allowlistedChannels.includes(val)) return;
  allowlistedChannels = [...allowlistedChannels, val];
  chrome.storage.local.set({ allowlistedChannels });
  renderAllowlist();
}

function removeChannel(handle) {
  allowlistedChannels = allowlistedChannels.filter((c) => c !== handle);
  chrome.storage.local.set({ allowlistedChannels });
  renderAllowlist();
}

function renderAllowlist() {
  const container = document.getElementById('allowlist-tags');
  if (allowlistedChannels.length === 0) {
    container.innerHTML = '<span class="allowlist-empty">No channels added yet</span>';
    return;
  }
  container.innerHTML = allowlistedChannels.map((ch) => `
    <span class="allowlist-tag">
      @${ch}
      <button class="allowlist-remove" data-remove="${ch}" title="Remove">&times;</button>
    </span>
  `).join('');
  container.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', () => removeChannel(btn.dataset.remove));
  });
}

// --- Reset to defaults ---

document.getElementById('reset-defaults').addEventListener('click', () => {
  if (!confirm('Reset all YouTube Calm settings to defaults?')) return;
  chrome.runtime.sendMessage({ type: 'RESET_DEFAULTS' }, () => {
    chrome.storage.local.get(ALL_KEYS, (data) => {
      for (const key of ALL_KEYS) {
        const el = document.querySelector(`[data-key="${key}"]`);
        if (el && el.type === 'checkbox') el.checked = !!data[key];
      }
      document.getElementById('daily-limit-input').value = data.dailyLimitMinutes ?? 60;
      syncLimitRow(!!data.dailyLimitEnabled);
      allowlistedChannels = data.allowlistedChannels || [];
      renderAllowlist();
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
