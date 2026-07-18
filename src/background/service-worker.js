const DEFAULTS = {
  // Master toggle
  calmMode: true,

  // UI hiding
  hideHomeFeed: true,
  hideShorts: true,
  hideSidebar: true,
  hideComments: true,
  hideEndScreen: true,
  hideAutoplay: true,
  hideInfoCards: true,
  hideTrending: true,
  hideNotificationBadge: true,
  hideLiveChat: true,
  hideMerch: true,

  // Visual
  grayscale: false,

  // Time management
  dailyLimitEnabled: false,
  dailyLimitMinutes: 60,
  sessionTimerVisible: true,

  // Intentionality
  intentionalityPrompt: false,

  // Allowlist
  allowlistedChannels: [],

  // Stats (managed internally — excluded from defaults reset)
  watchToday: 0,
  lastResetDate: '',
  watchHistory: {},
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(null, (existing) => {
    const toSet = {};
    for (const [key, val] of Object.entries(DEFAULTS)) {
      if (!(key in existing)) toSet[key] = val;
    }
    chrome.storage.local.set(toSet);
  });
});

// --- Daily reset ---

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function checkDailyReset() {
  const today = todayStr();
  chrome.storage.local.get(['lastResetDate', 'watchToday'], (data) => {
    if (data.lastResetDate !== today) {
      chrome.storage.local.set({ watchToday: 0, lastResetDate: today });
    }
  });
}

chrome.alarms.create('midnightReset', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'midnightReset') checkDailyReset();
});

// --- Message handlers ---

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {

  if (msg.type === 'TICK') {
    chrome.storage.local.get(
      ['watchToday', 'watchHistory', 'dailyLimitEnabled', 'dailyLimitMinutes'],
      (data) => {
        const today = todayStr();
        const newTotal = (data.watchToday || 0) + 1;

        // Roll today's seconds into the persistent history
        const history = { ...(data.watchHistory || {}), [today]: newTotal };

        // Prune entries older than 30 days
        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .toISOString().slice(0, 10);
        for (const d of Object.keys(history)) {
          if (d < cutoff) delete history[d];
        }

        chrome.storage.local.set({ watchToday: newTotal, watchHistory: history });

        const limitSeconds = (data.dailyLimitMinutes || 60) * 60;
        sendResponse({
          limitReached: data.dailyLimitEnabled && newTotal >= limitSeconds,
          watchToday: newTotal,
        });
      }
    );
    return true;
  }

  if (msg.type === 'GET_WATCH_TODAY') {
    chrome.storage.local.get('watchToday', (data) => {
      sendResponse({ watchToday: data.watchToday || 0 });
    });
    return true;
  }

  if (msg.type === 'GET_WEEK_STATS') {
    chrome.storage.local.get('watchHistory', (data) => {
      const history = data.watchHistory || {};
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
          .toISOString().slice(0, 10);
        days.push({ date: d, seconds: history[d] || 0 });
      }
      const weekTotal = days.reduce((sum, d) => sum + d.seconds, 0);
      sendResponse({ days, weekTotal });
    });
    return true;
  }

  if (msg.type === 'RESET_DEFAULTS') {
    const resetable = { ...DEFAULTS };
    delete resetable.watchToday;
    delete resetable.lastResetDate;
    delete resetable.watchHistory;
    chrome.storage.local.set(resetable, () => sendResponse({ ok: true }));
    return true;
  }
});
