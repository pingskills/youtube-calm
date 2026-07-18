const TOGGLES = [
  { key: 'hideHomeFeed',          label: 'Home feed' },
  { key: 'hideShorts',            label: 'Shorts' },
  { key: 'hideSidebar',           label: 'Sidebar' },
  { key: 'hideEndScreen',         label: 'End screen' },
  { key: 'hideAutoplay',          label: 'Autoplay' },
  { key: 'hideTrending',          label: 'Trending' },
  { key: 'hideComments',          label: 'Comments' },
  { key: 'hideNotificationBadge', label: 'Notif badge' },
  { key: 'hideMerch',             label: 'Merch shelf' },
  { key: 'grayscale',             label: 'Grayscale' },
  { key: 'sessionTimerVisible',   label: 'Session timer' },
  { key: 'intentionalityPrompt',  label: 'Intent prompt' },
];

const KEYS = ['calmMode', ...TOGGLES.map((t) => t.key)];

// --- Build toggle grid ---

const grid = document.getElementById('toggle-grid');
TOGGLES.forEach(({ key, label }) => {
  const item = document.createElement('label');
  item.className = 'grid-item toggle';
  item.innerHTML = `
    <span class="grid-label">${label}</span>
    <span class="toggle">
      <input type="checkbox" data-key="${key}" />
      <span class="track"></span>
    </span>
  `;
  grid.appendChild(item);
});

// --- Load state ---

chrome.storage.local.get(KEYS, (data) => {
  for (const key of KEYS) {
    const el = document.querySelector(`[data-key="${key}"]`);
    if (el) el.checked = !!data[key];
  }
  document.getElementById('calmMode').checked = !!data.calmMode;
  syncCalmModeUI(!!data.calmMode);
});

// Fetch watch time from background
chrome.runtime.sendMessage({ type: 'GET_WATCH_TODAY' }, (res) => {
  if (chrome.runtime.lastError || !res) return;
  document.getElementById('watch-time').textContent = formatSeconds(res.watchToday);
});

// --- Channel allowlist row ---

function parseChannel(url) {
  try {
    const path = new URL(url).pathname;
    const m = path.match(/^\/@([^/?]+)/)
      || path.match(/^\/channel\/([^/?]+)/)
      || path.match(/^\/c\/([^/?]+)/)
      || path.match(/^\/user\/([^/?]+)/);
    return m ? m[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  const handle = tab?.url ? parseChannel(tab.url) : null;
  if (!handle) return;

  chrome.storage.local.get('allowlistedChannels', (data) => {
    const list = data.allowlistedChannels || [];
    const isAllowlisted = list.includes(handle);

    document.getElementById('channel-handle').textContent = `@${handle}`;
    document.getElementById('channel-status').textContent = isAllowlisted
      ? 'On your allowlist'
      : 'Not on allowlist';

    const btn = document.getElementById('channel-allowlist-btn');
    btn.textContent = isAllowlisted ? 'Remove' : 'Add to allowlist';
    if (isAllowlisted) btn.classList.add('removing');

    document.getElementById('channel-row').classList.remove('hidden');

    btn.addEventListener('click', () => {
      const updated = isAllowlisted
        ? list.filter((c) => c !== handle)
        : [...list, handle];
      chrome.storage.local.set({ allowlistedChannels: updated });
      window.close();
    });
  });
});

// --- Event listeners ---

document.getElementById('calmMode').addEventListener('change', (e) => {
  const val = e.target.checked;
  chrome.storage.local.set({ calmMode: val });
  syncCalmModeUI(val);
});

grid.addEventListener('change', (e) => {
  const key = e.target.dataset.key;
  if (!key) return;
  chrome.storage.local.set({ [key]: e.target.checked });
});

document.getElementById('open-options').addEventListener('click', openOptions);
document.getElementById('open-options-footer').addEventListener('click', openOptions);

function openOptions(e) {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
}

// --- Helpers ---

function syncCalmModeUI(on) {
  document.body.classList.toggle('calm-off', !on);
}

function formatSeconds(total) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (total === 0) return 'No watch time today';
  if (h > 0) return `Today: ${h}h ${m}m`;
  if (m > 0) return `Today: ${m}m ${s}s`;
  return `Today: ${s}s`;
}
