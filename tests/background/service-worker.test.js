import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Builds a fresh in-memory chrome mock and returns helpers
function buildChromeMock() {
  const store = {};
  let messageHandler = null;
  let alarmHandler = null;
  let installedHandler = null;

  const chrome = {
    storage: {
      local: {
        get: vi.fn((keys, cb) => {
          const result = {};
          if (keys === null) {
            Object.assign(result, store);
          } else if (typeof keys === 'string') {
            result[keys] = store[keys];
          } else {
            for (const k of keys) result[k] = store[k];
          }
          cb(result);
        }),
        set: vi.fn((obj, cb) => {
          Object.assign(store, obj);
          cb?.();
        }),
      },
    },
    runtime: {
      onInstalled: { addListener: vi.fn((fn) => { installedHandler = fn; }) },
      onMessage:   { addListener: vi.fn((fn) => { messageHandler   = fn; }) },
      lastError: null,
    },
    alarms: {
      create: vi.fn(),
      onAlarm: { addListener: vi.fn((fn) => { alarmHandler = fn; }) },
    },
  };

  function sendMessage(msg) {
    return new Promise((resolve) => {
      messageHandler(msg, {}, resolve);
    });
  }

  function triggerInstalled() { installedHandler?.({ reason: 'install' }); }
  function triggerAlarm(name) { alarmHandler?.({ name }); }

  return { chrome, store, sendMessage, triggerInstalled, triggerAlarm };
}

describe('service-worker', () => {
  let store, sendMessage, triggerInstalled, triggerAlarm;

  beforeEach(async () => {
    vi.resetModules();
    const mock = buildChromeMock();
    store = mock.store;
    sendMessage = mock.sendMessage;
    triggerInstalled = mock.triggerInstalled;
    triggerAlarm = mock.triggerAlarm;
    global.chrome = mock.chrome;

    await import('../../src/background/service-worker.js');
  });

  afterEach(() => vi.useRealTimers());

  // -------------------------------------------------------------------------
  describe('onInstalled — seeds defaults', () => {
    it('sets calmMode to true on fresh install', () => {
      triggerInstalled();
      expect(store.calmMode).toBe(true);
    });

    it('sets all hide options to true', () => {
      triggerInstalled();
      const hideKeys = [
        'hideHomeFeed', 'hideShorts', 'hideSidebar', 'hideComments',
        'hideEndScreen', 'hideAutoplay', 'hideInfoCards', 'hideTrending',
        'hideNotificationBadge', 'hideLiveChat', 'hideMerch',
      ];
      hideKeys.forEach((k) => expect(store[k]).toBe(true));
    });

    it('does not overwrite existing settings', () => {
      store.calmMode = false;
      triggerInstalled();
      expect(store.calmMode).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  describe('TICK', () => {
    function setupStore(overrides = {}) {
      const today = new Date().toISOString().slice(0, 10);
      Object.assign(store, {
        watchToday: 0,
        lastResetDate: today,
        watchHistory: {},
        dailyLimitEnabled: false,
        dailyLimitMinutes: 60,
        perDayLimitsEnabled: false,
        perDayMinutes: {},
        ...overrides,
      });
    }

    it('increments watchToday by 1', async () => {
      setupStore({ watchToday: 10 });
      await sendMessage({ type: 'TICK' });
      expect(store.watchToday).toBe(11);
    });

    it('writes the new total into watchHistory for today', async () => {
      const today = new Date().toISOString().slice(0, 10);
      setupStore({ watchToday: 5 });
      await sendMessage({ type: 'TICK' });
      expect(store.watchHistory[today]).toBe(6);
    });

    it('resets watchToday to 1 when lastResetDate is stale', async () => {
      setupStore({ watchToday: 3600, lastResetDate: '2020-01-01' });
      await sendMessage({ type: 'TICK' });
      expect(store.watchToday).toBe(1);
    });

    it('updates lastResetDate when it was stale', async () => {
      setupStore({ lastResetDate: '2020-01-01' });
      await sendMessage({ type: 'TICK' });
      const today = new Date().toISOString().slice(0, 10);
      expect(store.lastResetDate).toBe(today);
    });

    it('prunes watchHistory entries older than 30 days', async () => {
      setupStore({ watchHistory: { '2000-01-01': 999 } });
      await sendMessage({ type: 'TICK' });
      expect(store.watchHistory['2000-01-01']).toBeUndefined();
    });

    it('preserves recent watchHistory entries', async () => {
      const today = new Date().toISOString().slice(0, 10);
      setupStore({ watchToday: 50, watchHistory: { [today]: 50 } });
      await sendMessage({ type: 'TICK' });
      expect(store.watchHistory[today]).toBe(51);
    });

    it('returns limitReached: false when limit is disabled', async () => {
      setupStore({ watchToday: 9999, dailyLimitEnabled: false, dailyLimitMinutes: 1 });
      const res = await sendMessage({ type: 'TICK' });
      expect(res.limitReached).toBe(false);
    });

    it('returns limitReached: false before the threshold', async () => {
      setupStore({ watchToday: 58, dailyLimitEnabled: true, dailyLimitMinutes: 1 }); // limit = 60s
      const res = await sendMessage({ type: 'TICK' });
      expect(res.limitReached).toBe(false); // 59 < 60
    });

    it('returns limitReached: true when threshold is reached', async () => {
      setupStore({ watchToday: 59, dailyLimitEnabled: true, dailyLimitMinutes: 1 }); // limit = 60s
      const res = await sendMessage({ type: 'TICK' });
      expect(res.limitReached).toBe(true); // 60 >= 60
    });

    it('uses per-day limit when perDayLimitsEnabled is true', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-08T12:00:00Z')); // Monday
      setupStore({
        watchToday: 29 * 60 - 1, // 1s below 30-min limit
        dailyLimitEnabled: true,
        dailyLimitMinutes: 60, // would NOT trigger
        perDayLimitsEnabled: true,
        perDayMinutes: { 1: 30 }, // 30-min Monday limit
      });
      // 29*60 - 1 + 1 tick = 1740s, limit = 30*60 = 1800s → not yet reached
      const res = await sendMessage({ type: 'TICK' });
      expect(res.limitReached).toBe(false);
    });

    it('returns limitReached: true when per-day limit is breached', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-08T12:00:00Z')); // Monday
      setupStore({
        watchToday: 30 * 60 - 1,
        dailyLimitEnabled: true,
        dailyLimitMinutes: 60,
        perDayLimitsEnabled: true,
        perDayMinutes: { 1: 30 },
      });
      const res = await sendMessage({ type: 'TICK' });
      expect(res.limitReached).toBe(true);
    });

    it('returns watchToday in the response', async () => {
      setupStore({ watchToday: 7 });
      const res = await sendMessage({ type: 'TICK' });
      expect(res.watchToday).toBe(8);
    });

    it('handles undefined watchHistory gracefully (treats as empty)', async () => {
      const today = new Date().toISOString().slice(0, 10);
      // Don't set watchHistory — leaves it undefined in storage
      Object.assign(store, {
        watchToday: 0,
        lastResetDate: today,
        dailyLimitEnabled: false,
      });
      await sendMessage({ type: 'TICK' });
      expect(store.watchHistory[today]).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  describe('GET_WATCH_TODAY', () => {
    it('returns current watchToday', async () => {
      store.watchToday = 42;
      const res = await sendMessage({ type: 'GET_WATCH_TODAY' });
      expect(res.watchToday).toBe(42);
    });

    it('returns 0 when watchToday is unset', async () => {
      const res = await sendMessage({ type: 'GET_WATCH_TODAY' });
      expect(res.watchToday).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  describe('GET_WEEK_STATS', () => {
    it('returns exactly 7 days', async () => {
      store.watchHistory = {};
      const res = await sendMessage({ type: 'GET_WEEK_STATS' });
      expect(res.days).toHaveLength(7);
    });

    it('fills missing days with 0 seconds', async () => {
      store.watchHistory = {};
      const res = await sendMessage({ type: 'GET_WEEK_STATS' });
      expect(res.days.every((d) => d.seconds === 0)).toBe(true);
    });

    it('handles undefined watchHistory gracefully (treats as empty)', async () => {
      // watchHistory not set in store at all
      const res = await sendMessage({ type: 'GET_WEEK_STATS' });
      expect(res.days).toHaveLength(7);
      expect(res.weekTotal).toBe(0);
    });

    it("today's entry is the last in the array", async () => {
      const today = new Date().toISOString().slice(0, 10);
      store.watchHistory = {};
      const res = await sendMessage({ type: 'GET_WEEK_STATS' });
      expect(res.days[6].date).toBe(today);
    });

    it('returns correct seconds for a known day', async () => {
      const today = new Date().toISOString().slice(0, 10);
      store.watchHistory = { [today]: 300 };
      const res = await sendMessage({ type: 'GET_WEEK_STATS' });
      expect(res.days[6].seconds).toBe(300);
    });

    it('calculates weekTotal correctly', async () => {
      const today = new Date().toISOString().slice(0, 10);
      store.watchHistory = { [today]: 300 };
      const res = await sendMessage({ type: 'GET_WEEK_STATS' });
      expect(res.weekTotal).toBe(300);
    });

    it('sums multiple days for weekTotal', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
      store.watchHistory = { '2024-01-15': 200, '2024-01-14': 100 };
      const res = await sendMessage({ type: 'GET_WEEK_STATS' });
      expect(res.weekTotal).toBe(300);
    });

    it('excludes days outside the 7-day window from weekTotal', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
      store.watchHistory = { '2024-01-15': 200, '2024-01-01': 9999 };
      const res = await sendMessage({ type: 'GET_WEEK_STATS' });
      expect(res.weekTotal).toBe(200);
    });
  });

  // -------------------------------------------------------------------------
  describe('RESET_DEFAULTS', () => {
    it('resets calmMode to true', async () => {
      store.calmMode = false;
      await sendMessage({ type: 'RESET_DEFAULTS' });
      expect(store.calmMode).toBe(true);
    });

    it('resets all hide settings to true', async () => {
      store.hideHomeFeed = false;
      store.hideShorts = false;
      await sendMessage({ type: 'RESET_DEFAULTS' });
      expect(store.hideHomeFeed).toBe(true);
      expect(store.hideShorts).toBe(true);
    });

    it('resets grayscale to false', async () => {
      store.grayscale = true;
      await sendMessage({ type: 'RESET_DEFAULTS' });
      expect(store.grayscale).toBe(false);
    });

    it('does not reset watchToday', async () => {
      store.watchToday = 999;
      await sendMessage({ type: 'RESET_DEFAULTS' });
      expect(store.watchToday).toBe(999);
    });

    it('does not reset watchHistory', async () => {
      store.watchHistory = { '2024-01-01': 100 };
      await sendMessage({ type: 'RESET_DEFAULTS' });
      expect(store.watchHistory).toEqual({ '2024-01-01': 100 });
    });

    it('does not reset lastResetDate', async () => {
      store.lastResetDate = '2024-01-01';
      await sendMessage({ type: 'RESET_DEFAULTS' });
      expect(store.lastResetDate).toBe('2024-01-01');
    });

    it('responds with { ok: true }', async () => {
      const res = await sendMessage({ type: 'RESET_DEFAULTS' });
      expect(res).toEqual({ ok: true });
    });
  });

  // -------------------------------------------------------------------------
  describe('midnight reset alarm', () => {
    it('resets watchToday when the date has changed', () => {
      store.watchToday = 500;
      store.lastResetDate = '2020-01-01';
      triggerAlarm('midnightReset');
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({ watchToday: 0 })
      );
    });

    it('does not reset when the date is still today', () => {
      const today = new Date().toISOString().slice(0, 10);
      store.watchToday = 500;
      store.lastResetDate = today;
      const callsBefore = chrome.storage.local.set.mock.calls.length;
      triggerAlarm('midnightReset');
      const newCalls = chrome.storage.local.set.mock.calls.slice(callsBefore);
      const resetCall = newCalls.find((args) => 'watchToday' in args[0] && args[0].watchToday === 0);
      expect(resetCall).toBeUndefined();
    });

    it('ignores unrelated alarm names', () => {
      const callsBefore = chrome.storage.local.set.mock.calls.length;
      triggerAlarm('someOtherAlarm');
      expect(chrome.storage.local.set.mock.calls.length).toBe(callsBefore);
    });
  });
});
