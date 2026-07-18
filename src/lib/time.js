export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function formatSeconds(total) {
  if (!total) return '0m';
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function pruneHistory(history, days = 30) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);
  return Object.fromEntries(
    Object.entries(history).filter(([d]) => d >= cutoff)
  );
}

// Returns the last 7 dates as YYYY-MM-DD strings, oldest first, today last.
export function getWeekDays() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    days.push(
      new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    );
  }
  return days;
}
