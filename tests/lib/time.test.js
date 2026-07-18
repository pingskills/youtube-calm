import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { todayStr, formatSeconds, pruneHistory, getWeekDays } from '../../src/lib/time.js';

describe('todayStr', () => {
  afterEach(() => vi.useRealTimers());

  it('returns a YYYY-MM-DD string', () => {
    expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('matches the current date', () => {
    const expected = new Date().toISOString().slice(0, 10);
    expect(todayStr()).toBe(expected);
  });

  it('reflects a mocked date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-03-15T10:00:00Z'));
    expect(todayStr()).toBe('2024-03-15');
  });
});

describe('formatSeconds', () => {
  it('returns 0m for 0', () => expect(formatSeconds(0)).toBe('0m'));
  it('returns 0m for undefined', () => expect(formatSeconds(undefined)).toBe('0m'));
  it('returns 0m for null', () => expect(formatSeconds(null)).toBe('0m'));
  it('formats whole minutes', () => expect(formatSeconds(60)).toBe('1m'));
  it('formats sub-minute as 0m', () => expect(formatSeconds(45)).toBe('0m'));
  it('formats multiple minutes', () => expect(formatSeconds(150)).toBe('2m'));
  it('formats exactly 1 hour', () => expect(formatSeconds(3600)).toBe('1h 0m'));
  it('formats hours and minutes', () => expect(formatSeconds(3661)).toBe('1h 1m'));
  it('formats large values', () => expect(formatSeconds(7380)).toBe('2h 3m'));
});

describe('pruneHistory', () => {
  afterEach(() => vi.useRealTimers());

  it('removes entries older than 30 days', () => {
    const old = '2000-01-01';
    const today = new Date().toISOString().slice(0, 10);
    const result = pruneHistory({ [old]: 100, [today]: 200 });
    expect(result[old]).toBeUndefined();
    expect(result[today]).toBe(200);
  });

  it('keeps entries within the window', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(pruneHistory({ [today]: 500 })[today]).toBe(500);
  });

  it('handles an empty history', () => {
    expect(pruneHistory({})).toEqual({});
  });

  it('respects a custom day window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-01T12:00:00Z'));
    const history = { '2024-05-25': 100, '2024-05-20': 200 };
    const result = pruneHistory(history, 7);
    expect(result['2024-05-25']).toBe(100); // within 7 days
    expect(result['2024-05-20']).toBeUndefined(); // older than 7 days
  });

  it('does not mutate the input', () => {
    const input = { '2000-01-01': 99 };
    pruneHistory(input);
    expect(input['2000-01-01']).toBe(99);
  });
});

describe('getWeekDays', () => {
  afterEach(() => vi.useRealTimers());

  it('returns exactly 7 dates', () => {
    expect(getWeekDays()).toHaveLength(7);
  });

  it('last entry is today', () => {
    const today = new Date().toISOString().slice(0, 10);
    const days = getWeekDays();
    expect(days[6]).toBe(today);
  });

  it('dates are in ascending order', () => {
    const days = getWeekDays();
    for (let i = 1; i < days.length; i++) {
      expect(days[i] > days[i - 1]).toBe(true);
    }
  });

  it('all dates are in YYYY-MM-DD format', () => {
    getWeekDays().forEach((d) => expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/));
  });

  it('consecutive dates are exactly one day apart', () => {
    const days = getWeekDays();
    for (let i = 1; i < days.length; i++) {
      const diff = new Date(days[i]) - new Date(days[i - 1]);
      expect(diff).toBe(24 * 60 * 60 * 1000);
    }
  });

  it('reflects a mocked date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    const days = getWeekDays();
    expect(days[6]).toBe('2024-01-15');
    expect(days[0]).toBe('2024-01-09');
  });
});
