const SETTINGS_KEYS = [
  'calmMode', 'hideHomeFeed', 'hideShorts', 'hideSidebar', 'hideComments',
  'hideEndScreen', 'hideAutoplay', 'hideInfoCards', 'hideTrending',
  'hideNotificationBadge', 'hideLiveChat', 'hideMerch', 'grayscale',
  'sessionTimerVisible', 'dailyLimitEnabled', 'dailyLimitMinutes',
  'intentionalityPrompt',
];

// Maps each setting key to the CSS class it gates
const CLASS_MAP = {
  hideHomeFeed: 'ytc-hide-feed',
  hideShorts: 'ytc-hide-shorts',
  hideSidebar: 'ytc-hide-sidebar',
  hideComments: 'ytc-hide-comments',
  hideEndScreen: 'ytc-hide-endscreen',
  hideAutoplay: 'ytc-hide-autoplay',
  hideInfoCards: 'ytc-hide-infocards',
  hideTrending: 'ytc-hide-trending',
  hideNotificationBadge: 'ytc-hide-notif-badge',
  hideLiveChat: 'ytc-hide-livechat',
  hideMerch: 'ytc-hide-merch',
  grayscale: 'ytc-grayscale',
};

let settings = {};
let sessionSeconds = 0;
let tickInterval = null;
let timerEl = null;
let limitHit = false;

// --- Settings application ---

function applySettings(s) {
  settings = s;
  const root = document.documentElement;

  root.classList.toggle('ytc-calm-mode', !!s.calmMode);

  for (const [key, cls] of Object.entries(CLASS_MAP)) {
    root.classList.toggle(cls, !!(s.calmMode && s[key]));
  }

  if (s.calmMode && s.sessionTimerVisible) {
    ensureTimer();
  } else {
    removeTimer();
  }
}

// --- Session timer ---

function ensureTimer() {
  if (timerEl) return;
  const attach = () => {
    timerEl = document.createElement('div');
    timerEl.id = 'ytc-session-timer';
    document.body.appendChild(timerEl);
    updateTimerDisplay();
  };

  if (document.body) {
    attach();
  } else {
    document.addEventListener('DOMContentLoaded', attach, { once: true });
  }
}

function removeTimer() {
  timerEl?.remove();
  timerEl = null;
}

function updateTimerDisplay() {
  if (!timerEl) return;
  const h = Math.floor(sessionSeconds / 3600);
  const m = Math.floor((sessionSeconds % 3600) / 60);
  const s = sessionSeconds % 60;
  timerEl.textContent = h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

// --- Watch time ticking ---

function isPlaying() {
  const v = document.querySelector('video');
  return !!(v && !v.paused && !v.ended && v.readyState > 2);
}

function startTicking() {
  if (tickInterval) return;
  tickInterval = setInterval(() => {
    if (!isPlaying()) return;
    sessionSeconds++;
    updateTimerDisplay();

    chrome.runtime.sendMessage({ type: 'TICK' }, (res) => {
      if (chrome.runtime.lastError) return;
      if (res?.limitReached && !limitHit) {
        limitHit = true;
        showLimitOverlay();
      }
    });
  }, 1000);
}

// --- Daily limit overlay ---

function showLimitOverlay() {
  const v = document.querySelector('video');
  if (v) v.pause();

  if (document.getElementById('ytc-limit-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'ytc-limit-overlay';
  overlay.innerHTML = `
    <div class="ytc-limit-box">
      <div class="ytc-limit-icon">&#9675;</div>
      <h2>Daily limit reached</h2>
      <p>You've used your YouTube time for today.<br>Take a moment away from the screen.</p>
      <button id="ytc-limit-override">Give me 5 more minutes</button>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('ytc-limit-override').addEventListener('click', () => {
    overlay.remove();
    limitHit = false;
    // Subtract 5 minutes so the limit resets with grace
    chrome.storage.local.get('watchToday', (data) => {
      const reduced = Math.max(0, (data.watchToday || 0) - 300);
      chrome.storage.local.set({ watchToday: reduced });
    });
  });
}

// --- Intentionality interstitial ---

function maybeShowInterstitial() {
  if (!settings.calmMode || !settings.intentionalityPrompt) return;
  if (!location.pathname.match(/^\/?$|^\/feed\/subscriptions/)) return;
  if (document.getElementById('ytc-interstitial')) return;

  const el = document.createElement('div');
  el.id = 'ytc-interstitial';
  el.innerHTML = `
    <div class="ytc-interstitial-box">
      <h2>What are you here for?</h2>
      <input id="ytc-intent-input" type="text" placeholder="e.g. watch that cooking video" autofocus />
      <button id="ytc-intent-go">Continue</button>
    </div>
  `;

  const attach = () => {
    document.body.appendChild(el);
    document.getElementById('ytc-intent-go').addEventListener('click', () => el.remove());
    document.getElementById('ytc-intent-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') el.remove();
    });
  };

  if (document.body) {
    attach();
  } else {
    document.addEventListener('DOMContentLoaded', attach, { once: true });
  }
}

// --- YouTube SPA navigation ---

document.addEventListener('yt-navigate-finish', () => {
  // Timer el may have been removed by YouTube's DOM swaps
  if (settings.calmMode && settings.sessionTimerVisible) {
    if (!document.getElementById('ytc-session-timer')) {
      timerEl = null;
      ensureTimer();
    }
  }
  maybeShowInterstitial();
});

// --- Boot ---

chrome.storage.local.get(SETTINGS_KEYS, (data) => {
  applySettings(data);
  startTicking();
  maybeShowInterstitial();
});

chrome.storage.onChanged.addListener((changes) => {
  const updated = { ...settings };
  for (const [key, { newValue }] of Object.entries(changes)) {
    updated[key] = newValue;
  }
  applySettings(updated);
});
