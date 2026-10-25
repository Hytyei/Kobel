// Streaks shared by friends (two people) and study groups (2 to 8 people).
//
// Each phone publishes the days it practised as plain day numbers (days since 1970-01-01 in the phone's own time zone)
// in the synced profile: stats.pub.days, newest 90. The server never sees dates, only these numbers.
// A shared streak counts the days in a row on which EVERYBODY practised. It is alive while the last common day is today
// or yesterday, so a streak is only lost when a whole day passes without everyone practising.
const DAY = 86400000;
export const MIN_DAY = 15000;   // 2011
export const MAX_DAY = 40000;   // 2079
export const MAX_DAYS = 90;

/** The practice days from a raw synced profile document: integers in range, unique, sorted, at most 90. */
export function activeDays(raw) {
  let d = {};
  try { d = typeof raw === 'string' ? JSON.parse(raw || '{}') : raw || {}; } catch { return []; }
  const pub = d && d.stats && d.stats.pub;
  const list = pub && Array.isArray(pub.days) ? pub.days : [];
  const out = new Set();
  for (const v of list) if (Number.isInteger(v) && v >= MIN_DAY && v <= MAX_DAY) out.add(v);
  return [...out].sort((a, b) => a - b).slice(-MAX_DAYS);
}

/** daysLists: an array of day lists (one per person). Returns {n, best, latest, today}. */
export function sharedStreak(daysLists, nowMs = Date.now()) {
  const none = { n: 0, best: 0, latest: 0, today: false };
  if (!Array.isArray(daysLists) || daysLists.length < 2 || daysLists.some((l) => !l || !l.length)) return none;
  let common = new Set(daysLists[0]);
  for (const l of daysLists.slice(1)) { const s = new Set(l); common = new Set([...common].filter((x) => s.has(x))); }
  if (!common.size) return none;
  const days = [...common].sort((a, b) => a - b);
  // "today" is the newest day any of them reported, or the UTC day if that is later: time zones differ by up to a day
  const ref = Math.max(Math.floor(nowMs / DAY), ...daysLists.map((l) => l[l.length - 1]));
  let best = 1, run = 1;
  for (let i = 1; i < days.length; i++) { run = days[i] === days[i - 1] + 1 ? run + 1 : 1; if (run > best) best = run; }
  const latest = days[days.length - 1];
  let n = 0;
  if (latest >= ref - 1) { n = 1; for (let i = days.length - 1; i > 0 && days[i - 1] === days[i] - 1; i--) n++; }
  return { n, best, latest, today: latest === ref && n > 0 };
}
