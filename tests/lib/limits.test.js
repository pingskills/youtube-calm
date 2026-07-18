import { describe, it, expect, vi, afterEach } from 'vitest';
import { getEffectiveMinutes, clampMinutes, DEFAULT_PER_DAY } from '../../src/lib/limits.js';

describe('DEFAULT_PER_DAY', () => {
  it('covers all 7 days of the week', () => {
    expect(Object.keys(DEFAULT_PER_DAY)).toHaveLength(7);
  });

  it('assigns 30 minutes to weekdays', () => {
    [1, 2, 3, 4, 5].forEach((day) =>
      expect(DEFAULT_PER_DAY[day]).toBe(30)
    );
  });

  it('assigns 90 minutes to weekends', () => {
    [0, 6].forEach((day) =>
      expect(DEFAULT_PER_DAY[day]).toBe(90)
    );
  });
});

describe('clampMinutes', () => {
  it('returns value unchanged when in range', () => {
    expect(clampMinutes(60)).toBe(60);
    expect(clampMinutes(5)).toBe(5);
    expect(clampMinutes(480)).toBe(480);
    expect(clampMinutes(30)).toBe(30);
  });

  it('clamps to 5 for values below minimum', () => {
    expect(clampMinutes(0)).toBe(5);
    expect(clampMinutes(-10)).toBe(5);
    expect(clampMinutes(4)).toBe(5);
    expect(clampMinutes(1)).toBe(5);
  });

  it('clamps to 480 for values above maximum', () => {
    expect(clampMinutes(481)).toBe(480);
    expect(clampMinutes(9999)).toBe(480);
    expect(clampMinutes(1000)).toBe(480);
  });

  it('returns 60 for NaN', () => {
    expect(clampMinutes(NaN)).toBe(60);
  });
});

describe('getEffectiveMinutes', () => {
  afterEach(() => vi.useRealTimers());

  it('returns dailyLimitMinutes when per-day is disabled', () => {
    expect(getEffectiveMinutes({
      dailyLimitMinutes: 45,
      perDayLimitsEnabled: false,
    })).toBe(45);
  });

  it('defaults to 60 when dailyLimitMinutes is not set', () => {
    expect(getEffectiveMinutes({ perDayLimitsEnabled: false })).toBe(60);
  });

  it('uses the per-day value for Monday', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-08T12:00:00Z')); // Monday (getDay() = 1)
    expect(getEffectiveMinutes({
      dailyLimitMinutes: 60,
      perDayLimitsEnabled: true,
      perDayMinutes: { 1: 30 },
    })).toBe(30);
  });

  it('uses the per-day value for Sunday', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-07T12:00:00Z')); // Sunday (getDay() = 0)
    expect(getEffectiveMinutes({
      dailyLimitMinutes: 60,
      perDayLimitsEnabled: true,
      perDayMinutes: DEFAULT_PER_DAY,
    })).toBe(90);
  });

  it('uses the per-day value for Saturday', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-06T12:00:00Z')); // Saturday (getDay() = 6)
    expect(getEffectiveMinutes({
      dailyLimitMinutes: 60,
      perDayLimitsEnabled: true,
      perDayMinutes: DEFAULT_PER_DAY,
    })).toBe(90);
  });

  it('falls back to dailyLimitMinutes when per-day entry is missing', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-08T12:00:00Z')); // Monday
    expect(getEffectiveMinutes({
      dailyLimitMinutes: 60,
      perDayLimitsEnabled: true,
      perDayMinutes: {}, // no Monday entry
    })).toBe(60);
  });

  it('ignores per-day values when perDayLimitsEnabled is false', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-08T12:00:00Z')); // Monday
    expect(getEffectiveMinutes({
      dailyLimitMinutes: 60,
      perDayLimitsEnabled: false,
      perDayMinutes: { 1: 15 }, // would be 15 if enabled
    })).toBe(60);
  });
});
