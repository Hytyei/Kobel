// League table: points per player for the last week / month / all time, read from each player's synced profile.
// Only the name, points and streak leave the database. With 2-3 users this is a handful of rows.
const RANGES = { week: 7, month: 30, all: 0 };
const dayKey = (t) => new Date(t).toISOString().slice(0, 10);

export async function leaderboard(db, me, rangeRaw, now = Date.now()) {
  const range = Object.hasOwn(RANGES, rangeRaw) ? rangeRaw : 'week';
  const days = RANGES[range];
  const cutoff = days ? dayKey(now - (days - 1) * 86400000) : '';
  const { results } = await db
    .prepare('SELECT u.id AS id, u.name AS name, p.data AS data FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.visible = 1 OR u.id = ? LIMIT 50')
    .bind(me.id)
    .all();
  const today = dayKey(now), yesterday = dayKey(now - 86400000);
  const rows = results.map((r) => {
    let stats = {}, avatar = '';
    try {
      const d = JSON.parse(r.data || '{}');
      stats = d.stats || {};
      const a = d.settings && d.settings.avatar;
      if (typeof a === 'string' && /^[a-z0-9_-]{1,20}$/.test(a)) avatar = a;
    } catch { /* broken profile counts as empty */ }
    let points = 0;
    if (days) {
      for (const [k, v] of Object.entries(stats.days || {})) if (k >= cutoff && v && Number.isFinite(v.xp)) points += v.xp;
    } else {
      points = Number.isFinite(stats.xp) ? stats.xp : 0;
    }
    const alive = stats.last === today || stats.last === yesterday;
    return { name: String(r.name).slice(0, 40), points: Math.round(points), streak: alive && Number.isFinite(stats.streak) ? stats.streak : 0, avatar, isMe: r.id === me.id };
  });
  rows.sort((a, b) => b.points - a.points || b.streak - a.streak || a.name.localeCompare(b.name));
  return { range, rows };
}
