import { todayStr, pruneHistory, getWeekDays } from '../lib/time.js';
import { getEffectiveMinutes } from '../lib/limits.js';
import { DEFAULTS } from '../lib/settings.js';

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

function checkDailyReset() {
  const today = todayStr();
  chrome.storage.local.get(['lastResetDate'], (data) => {
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
      ['watchToday', 'watchHistory', 'lastResetDate', 'dailyLimitEnabled', 'dailyLimitMinutes', 'perDayLimitsEnabled', 'perDayMinutes'],
      (data) => {
        const today = todayStr();

        // Self-heal the midnight gap in case the alarm hasn't fired yet
        const base = data.lastResetDate === today ? (data.watchToday || 0) : 0;
        const newTotal = base + 1;

        const history = pruneHistory({
          ...(data.watchHistory || {}),
          [today]: newTotal,
        });

        const updates = { watchToday: newTotal, watchHistory: history };
        if (data.lastResetDate !== today) updates.lastResetDate = today;
        chrome.storage.local.set(updates);

        sendResponse({
          limitReached: data.dailyLimitEnabled && newTotal >= getEffectiveMinutes(data) * 60,
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
      const days = getWeekDays().map((date) => ({
        date,
        seconds: history[date] || 0,
      }));
      sendResponse({
        days,
        weekTotal: days.reduce((sum, d) => sum + d.seconds, 0),
      });
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
