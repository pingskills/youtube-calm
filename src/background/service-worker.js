const DEFAULTS = {
  // Master toggle
  calmMode: true,

  // UI hiding
  hideHomeFeed: true,
  hideShorts: true,
  hideSidebar: true,
  hideComments: false,
  hideEndScreen: true,
  hideAutoplay: true,
  hideInfoCards: false,
  hideTrending: true,
  hideNotificationBadge: true,
  hideLiveChat: false,
  hideMerch: true,

  // Visual
  grayscale: false,

  // Time management
  dailyLimitEnabled: false,
  dailyLimitMinutes: 60,
  sessionTimerVisible: true,

  // Intentionality
  intentionalityPrompt: false,

  // Stats (managed internally — do not expose in defaults reset)
  watchToday: 0,
  lastResetDate: '',
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

function checkDailyReset() {
  const today = new Date().toISOString().slice(0, 10);
  chrome.storage.local.get(['lastResetDate', 'watchToday'], (data) => {
    if (data.lastResetDate !== today) {
      chrome.storage.local.set({ watchToday: 0, lastResetDate: today });
    }
  });
}

// Check for midnight reset every minute
chrome.alarms.create('midnightReset', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'midnightReset') checkDailyReset();
});

// Receive watch-time ticks from the content script
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'TICK') {
    chrome.storage.local.get(
      ['watchToday', 'dailyLimitEnabled', 'dailyLimitMinutes'],
      (data) => {
        const newTotal = (data.watchToday || 0) + 1;
        chrome.storage.local.set({ watchToday: newTotal });

        const limitSeconds = (data.dailyLimitMinutes || 60) * 60;
        sendResponse({
          limitReached: data.dailyLimitEnabled && newTotal >= limitSeconds,
          watchToday: newTotal,
        });
      }
    );
    return true; // keep message channel open for async response
  }

  if (msg.type === 'GET_WATCH_TODAY') {
    chrome.storage.local.get('watchToday', (data) => {
      sendResponse({ watchToday: data.watchToday || 0 });
    });
    return true;
  }

  if (msg.type === 'RESET_DEFAULTS') {
    const resetable = { ...DEFAULTS };
    delete resetable.watchToday;
    delete resetable.lastResetDate;
    chrome.storage.local.set(resetable, () => sendResponse({ ok: true }));
    return true;
  }
});
