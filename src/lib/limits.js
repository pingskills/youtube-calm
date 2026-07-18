// Mon–Fri: 30 min, Sat–Sun: 90 min (getDay(): 0=Sun … 6=Sat)
export const DEFAULT_PER_DAY = { 0: 90, 1: 30, 2: 30, 3: 30, 4: 30, 5: 30, 6: 90 };

export function getEffectiveMinutes(data) {
  if (data.perDayLimitsEnabled && data.perDayMinutes) {
    const perDay = data.perDayMinutes[new Date().getDay()];
    if (perDay != null) return perDay;
  }
  return data.dailyLimitMinutes || 60;
}

export function clampMinutes(n) {
  return Math.max(5, Math.min(480, isNaN(n) ? 60 : n));
}
