const ALL_KEYS = [
  'calmMode', 'hideHomeFeed', 'hideShorts', 'hideSidebar', 'hideComments',
  'hideEndScreen', 'hideAutoplay', 'hideInfoCards', 'hideTrending',
  'hideNotificationBadge', 'hideLiveChat', 'hideMerch', 'grayscale',
  'sessionTimerVisible', 'dailyLimitEnabled', 'dailyLimitMinutes',
  'intentionalityPrompt', 'allowlistedChannels',
  'perDayLimitsEnabled', 'perDayMinutes',
];

// Mon–Sun order for the grid (getDay(): 0=Sun … 6=Sat)
const DAYS = [
  { day: 1, label: 'Mon' }, { day: 2, label: 'Tue' }, { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' }, { day: 5, label: 'Fri' }, { day: 6, label: 'Sat' },
  { day: 0, label: 'Sun' },
];
const DEFAULT_PER_DAY = { 0: 90, 1: 30, 2: 30, 3: 30, 4: 30, 5: 30, 6: 90 };

// --- Build per-day grid ---

const perDayGrid = document.getElementById('per-day-grid');
const todayDow = new Date().getDay();

perDayGrid.innerHTML = DAYS.map(({ day, label }) => `
  <div class="day-col${day === todayDow ? ' is-today' : ''}">
    <div class="day-label">${label}</div>
    <input class="day-input" type="number" data-day="${day}" min="5" max="480" step="5" />
    <div class="day-unit">min</div>
  </div>
`).join('');

// --- Load all settings ---

chrome.storage.local.get(ALL_KEYS, (data) => {
  for (const key of ALL_KEYS) {
    const el = document.querySelector(`[data-key="${key}"]`);
    if (!el || el.type !== 'checkbox') continue;
    el.checked = !!data[key];
  }

  document.getElementById('daily-limit-input').value = data.dailyLimitMinutes ?? 60;

  const perDay = data.perDayMinutes || DEFAULT_PER_DAY;
  document.querySelectorAll('.day-input').forEach((inp) => {
    inp.value = perDay[parseInt(inp.dataset.day)] ?? 60;
  });

  allowlistedChannels = data.allowlistedChannels || [];
  renderAllowlist();

  syncTimeSection();
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
  if (el.type !== 'checkbox') return;
  el.addEventListener('change', () => {
    const key = el.dataset.key;
    chrome.storage.local.set({ [key]: el.checked });
    if (key === 'dailyLimitEnabled' || key === 'perDayLimitsEnabled') {
      syncTimeSection();
    }
  });
});

// --- Daily limit minutes ---

document.getElementById('daily-limit-input').addEventListener('change', (e) => {
  const val = clampMinutes(parseInt(e.target.value, 10));
  e.target.value = val;
  chrome.storage.local.set({ dailyLimitMinutes: val });
});

// --- Per-day inputs ---

perDayGrid.addEventListener('change', (e) => {
  if (!e.target.classList.contains('day-input')) return;
  const day = parseInt(e.target.dataset.day);
  const val = clampMinutes(parseInt(e.target.value, 10));
  e.target.value = val;
  chrome.storage.local.get('perDayMinutes', (data) => {
    const updated = { ...(data.perDayMinutes || DEFAULT_PER_DAY), [day]: val };
    chrome.storage.local.set({ perDayMinutes: updated });
  });
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

      const perDay = data.perDayMinutes || DEFAULT_PER_DAY;
      document.querySelectorAll('.day-input').forEach((inp) => {
        inp.value = perDay[parseInt(inp.dataset.day)] ?? 60;
      });

      allowlistedChannels = data.allowlistedChannels || [];
      renderAllowlist();
      syncTimeSection();
    });
  });
});

// --- Helpers ---

function syncTimeSection() {
  const dailyEnabled = document.querySelector('[data-key="dailyLimitEnabled"]').checked;
  const perDayEnabled = document.querySelector('[data-key="perDayLimitsEnabled"]').checked;

  // Single limit input: show when daily on and per-day off
  document.getElementById('limit-minutes-row')
    .classList.toggle('hidden', !dailyEnabled || perDayEnabled);

  // Per-day toggle row: show when daily is on
  document.getElementById('per-day-toggle-row')
    .classList.toggle('hidden', !dailyEnabled);

  // Per-day grid: show when both are on
  document.getElementById('per-day-grid')
    .classList.toggle('hidden', !dailyEnabled || !perDayEnabled);
}

function clampMinutes(n) {
  return Math.max(5, Math.min(480, isNaN(n) ? 60 : n));
}

function formatSeconds(total) {
  if (!total) return '0m';
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
