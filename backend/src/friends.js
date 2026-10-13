// Friends: invite codes, the friend list, and a friend's public profile.
//
// How it works: you create a short invite code ("ABCD-2345"), tell a friend, they type it in. The code is single use and
// valid for 7 days. Being friends is mutual and instant (the code itself is the consent). Only friends can see each
// other's public profile, and the profile is a fixed whitelist of numbers read from the synced profile document
// (never the sync address, access code, cards or settings).
import { HttpError } from './http.js';
import { take } from './register.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_TTL_MS = 7 * 86400000;
export const MAX_FRIENDS = 30;
const TRIES_PER_DAY = 20;
const GAME_IDS = ['sprint', 'dash', 'plural', 'gap', 'scramble', 'match', 'echo'];
const dayKey = (t) => new Date(t).toISOString().slice(0, 10);

/** 8 random characters, shown as ABCD-2345 (40 bits; 256 % 32 = 0 so no modulo bias). */
export function newFriendCode() {
  const b = crypto.getRandomValues(new Uint8Array(8));
  const c = [...b].map((x) => ALPHABET[x & 31]).join('');
  return c.slice(0, 4) + '-' + c.slice(4);
}
const normCode = (v) => {
  if (typeof v !== 'string') return null;
  const c = v.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return c.length === 8 && [...c].every((ch) => ALPHABET.includes(ch)) ? c.slice(0, 4) + '-' + c.slice(4) : null;
};

const num = (v, max = 1e9) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.round(v))) : 0);

/** Reads the whitelisted, public part of a synced profile document. Anything else in it is ignored. */
export function publicView(raw, now = Date.now()) {
  let d = {};
  try { d = JSON.parse(raw || '{}') || {}; } catch { /* a broken document counts as empty */ }
  const st = d.stats && typeof d.stats === 'object' ? d.stats : {};
  const pub = st.pub && typeof st.pub === 'object' ? st.pub : {};
  const avatar = d.settings && typeof d.settings.avatar === 'string' && /^[a-z0-9_-]{1,20}$/.test(d.settings.avatar) ? d.settings.avatar : '';
  const today = dayKey(now), yesterday = dayKey(now - 86400000), cutoff = dayKey(now - 6 * 86400000);
  let week = 0;
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const v = st.days && st.days[dayKey(now - i * 86400000)];
    last7.push(v && Number.isFinite(v.xp) ? num(v.xp, 100000) : 0);
  }
  for (const [k, v] of Object.entries(st.days || {})) if (k >= cutoff && v && Number.isFinite(v.xp)) week += v.xp;
  const alive = st.last === today || st.last === yesterday;
  const games = {};
  for (const id of GAME_IDS) {
    const g = d.games && d.games[id];
    if (g && typeof g === 'object') games[id] = { best: num(g.best, 1e6), stars: num(g.stars, 3), plays: num(g.plays, 1e6) };
  }
  const rec = {};
  const recSrc = pub.rec && typeof pub.rec === 'object' ? pub.rec : {};
  for (const k of ['bestDayXp', 'bestWeekXp', 'busiestDay', 'activeDays', 'known', 'mastered', 'stars', 'talks', 'perfect', 'sessions', 'answers', 'maxCombo', 'bestStreak', 'trophies', 'seasons', 'badges']) rec[k] = num(recSrc[k], 1e8);
  const stage = typeof pub.stage === 'string' && /^[\p{L}\p{N} .'\-]{1,40}$/u.test(pub.stage) ? pub.stage : '';
  const favGame = typeof recSrc.favGame === 'string' && GAME_IDS.includes(recSrc.favGame) ? recSrc.favGame : '';
  return {
    avatar,
    xp: num(st.xp, 1e9),
    streak: alive ? num(st.streak, 5000) : 0,
    best: num(st.best, 5000),
    week: Math.round(week),
    last7,
    tier: num(st.L && st.L.i, 5),
    lp: num(pub.lp, 1e6),
    stage,
    games,
    rec: { ...rec, favGame },
  };
}

/** POST /v1/friends/code: creates (or replaces) your invite code. */
export async function createCode(db, user, now = Date.now()) {
  for (let i = 0; i < 6; i++) {
    const code = newFriendCode();
    try {
      await db
        .prepare('INSERT INTO friend_codes (user_id, code, created_at) VALUES (?, ?, ?) ON CONFLICT (user_id) DO UPDATE SET code = excluded.code, created_at = excluded.created_at')
        .bind(user.id, code, now)
        .run();
      return { code, expiresAt: now + CODE_TTL_MS };
    } catch (e) {
      if (!/UNIQUE|constraint/i.test(String(e && e.message))) throw e; // the code already existed: try another one
    }
  }
  throw new HttpError(503, 'try_again', 'Could not create a code. Please try again.');
}

async function friendCount(db, id) {
  const r = await db.prepare('SELECT COUNT(*) AS n FROM friends WHERE user_a = ? OR user_b = ?').bind(id, id).first();
  return r ? r.n : 0;
}
export async function areFriends(db, x, y) {
  if (x === y) return false;
  const [a, b] = x < y ? [x, y] : [y, x];
  return Boolean(await db.prepare('SELECT 1 AS ok FROM friends WHERE user_a = ? AND user_b = ?').bind(a, b).first());
}

/** POST /v1/friends {"code": "ABCD-2345"}: adds the owner of the code as a friend. */
export async function addFriend(db, user, body, now = Date.now()) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'invalid_request', 'Body must be a JSON object.');
  const code = normCode(body.code);
  if (!code) throw new HttpError(400, 'invalid_request', 'The invite code looks like ABCD-2345.', 'code');
  if (!(await take(db, 'fc:' + user.id, dayKey(now), TRIES_PER_DAY))) {
    throw new HttpError(429, 'too_many_attempts', 'Too many attempts today. Try again tomorrow.');
  }
  const row = await db.prepare('SELECT user_id, created_at FROM friend_codes WHERE code = ?').bind(code).first();
  if (!row || now - row.created_at > CODE_TTL_MS) throw new HttpError(404, 'code_not_found', 'That invite code is not valid (any more).', 'code');
  if (row.user_id === user.id) throw new HttpError(400, 'own_code', 'That is your own code. Send it to a friend instead.', 'code');
  if (await areFriends(db, user.id, row.user_id)) throw new HttpError(409, 'already_friends', 'You are already friends.');
  if ((await friendCount(db, user.id)) >= MAX_FRIENDS || (await friendCount(db, row.user_id)) >= MAX_FRIENDS) {
    throw new HttpError(409, 'friend_limit', `The friend list is full (${MAX_FRIENDS} friends).`);
  }
  const [a, b] = user.id < row.user_id ? [user.id, row.user_id] : [row.user_id, user.id];
  await db.prepare('INSERT OR IGNORE INTO friends (user_a, user_b, created_at) VALUES (?, ?, ?)').bind(a, b, now).run();
  await db.prepare('DELETE FROM friend_codes WHERE user_id = ?').bind(row.user_id).run(); // single use
  const f = await db.prepare('SELECT u.id AS id, u.name AS name, p.data AS data FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = ?').bind(row.user_id).first();
  return { friend: { id: f.id, name: f.name, ...publicView(f.data, now) } };
}

/** GET /v1/friends: your friends with a short summary. */
export async function listFriends(db, user, now = Date.now()) {
  const { results } = await db
    .prepare(
      `SELECT u.id AS id, u.name AS name, p.data AS data, p.synced_at AS seen
       FROM friends f JOIN users u ON u.id = CASE WHEN f.user_a = ?1 THEN f.user_b ELSE f.user_a END
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE f.user_a = ?1 OR f.user_b = ?1 ORDER BY u.name COLLATE NOCASE LIMIT ${MAX_FRIENDS}`,
    )
    .bind(user.id)
    .all();
  return {
    friends: results.map((r) => {
      const v = publicView(r.data, now);
      return { id: r.id, name: String(r.name).slice(0, 40), avatar: v.avatar, xp: v.xp, streak: v.streak, week: v.week, tier: v.tier, stage: v.stage, seen: r.seen || 0 };
    }),
  };
}

/** GET /v1/friends/{id}: a friend's public profile (friends only). */
export async function friendProfile(db, user, friendId, now = Date.now()) {
  if (!(await areFriends(db, user.id, friendId))) throw new HttpError(404, 'not_found', 'Friend not found.');
  const r = await db
    .prepare('SELECT u.id AS id, u.name AS name, u.created_at AS created, p.data AS data, p.synced_at AS seen FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = ?')
    .bind(friendId)
    .first();
  if (!r) throw new HttpError(404, 'not_found', 'Friend not found.');
  return { profile: { id: r.id, name: String(r.name).slice(0, 40), since: r.created, seen: r.seen || 0, ...publicView(r.data, now) } };
}

/** DELETE /v1/friends/{id}: ends the friendship on both sides. Open duels between the two are closed. */
export async function removeFriend(db, user, friendId, now = Date.now()) {
  const [a, b] = user.id < friendId ? [user.id, friendId] : [friendId, user.id];
  await db.prepare('DELETE FROM friends WHERE user_a = ? AND user_b = ?').bind(a, b).run();
  await db
    .prepare("UPDATE duels SET status = 'expired', updated_at = ? WHERE status IN ('invited', 'active') AND ((a_user = ? AND b_user = ?) OR (a_user = ? AND b_user = ?))")
    .bind(now, user.id, friendId, friendId, user.id)
    .run();
  return { ok: true };
}
