// Duels: two friends answer the same 9 questions, turn-based.
//
// There is no live mode any more. The challenger plays right away, the friend has 24 hours to accept and play.
// Score = goals: every right answer is one goal, so a game ends like a football score (0 to 9 goals each).
// The player with more goals wins, equal goals is a draw. The time you needed does not count.
//
// Fairness: the server keeps the right answers. Players get the questions only, send one answer at a time and
// receive "correct or not" back. The server measures the time per question with its own clock, so a phone cannot
// claim a faster time or answer after the question's time limit.
import { HttpError } from './http.js';
import { take } from './register.js';
import { areFriends } from './friends.js';

export const GAMES = ['sprint', 'dash', 'plural', 'gap', 'scramble'];
export const TURN_MS = 24 * 3600000;
export const DECK_SIZE = 9;
const FEEDBACK_MS = 900;   // the app shows the result for ~0.9 s before the next question; this is not counted against the player
const GRACE_MS = 3000;
const MAX_OPEN_AS_CHALLENGER = 8;
const CREATE_PER_DAY = 40;
const dayKey = (t) => new Date(t).toISOString().slice(0, 10);

const isStr = (v, min, max) => typeof v === 'string' && v.trim().length >= min && v.length <= max;
const bad = (msg, field) => new HttpError(400, 'invalid_request', msg, field);
export const norm = (s) => String(s).normalize('NFC').toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.!?]+$/, '');

/** Checks a deck sent by a challenger. Items: {t:'mc', q, o:[2-4 options], a:index} or {t:'type', q, a:'text', ok?:[...], chars?:[...]} (+ optional hint, tm seconds). */
export function validateDeck(deck) {
  if (!Array.isArray(deck) || deck.length !== DECK_SIZE) throw bad(`deck must have exactly ${DECK_SIZE} questions.`, 'deck');
  const out = deck.map((it, i) => {
    const f = `deck[${i}]`;
    if (!it || typeof it !== 'object' || Array.isArray(it)) throw bad(`${f} must be an object.`, 'deck');
    if (!isStr(it.q, 1, 160)) throw bad(`${f}.q must be text up to 160 characters.`, 'deck');
    const tm = it.tm === undefined ? 15 : it.tm;
    if (!Number.isInteger(tm) || tm < 5 || tm > 40) throw bad(`${f}.tm must be 5 to 40 seconds.`, 'deck');
    const hint = it.hint === undefined ? '' : it.hint;
    if (typeof hint !== 'string' || hint.length > 160) throw bad(`${f}.hint is too long.`, 'deck');
    if (it.t === 'mc') {
      if (!Array.isArray(it.o) || it.o.length < 2 || it.o.length > 4 || !it.o.every((o) => isStr(o, 1, 80))) throw bad(`${f}.o must be 2 to 4 short options.`, 'deck');
      if (new Set(it.o.map(norm)).size !== it.o.length) throw bad(`${f}.o options must all be different.`, 'deck');
      if (!Number.isInteger(it.a) || it.a < 0 || it.a >= it.o.length) throw bad(`${f}.a must be the number of the right option.`, 'deck');
      return { t: 'mc', q: it.q.trim(), o: it.o.map((o) => o.trim()), a: it.a, tm, hint };
    }
    if (it.t === 'type') {
      if (!isStr(it.a, 1, 60)) throw bad(`${f}.a must be short text.`, 'deck');
      const ok = it.ok === undefined ? [] : it.ok;
      if (!Array.isArray(ok) || ok.length > 3 || !ok.every((o) => isStr(o, 1, 60))) throw bad(`${f}.ok must list up to 3 short alternatives.`, 'deck');
      const chars = it.chars === undefined ? [] : it.chars;
      if (!Array.isArray(chars) || chars.length > 30 || !chars.every((c) => isStr(c, 1, 2))) throw bad(`${f}.chars must be single letters.`, 'deck');
      return { t: 'type', q: it.q.trim(), a: it.a.trim(), ok: ok.map((o) => o.trim()), chars, tm, hint };
    }
    throw bad(`${f}.t must be 'mc' or 'type'.`, 'deck');
  });
  if (JSON.stringify(out).length > 7000) throw bad('deck is too large.', 'deck');
  return out;
}

/** The deck as players see it: no right answers. */
export const publicDeck = (deck) => deck.map((it) => (it.t === 'mc' ? { t: 'mc', q: it.q, o: it.o, tm: it.tm, hint: it.hint } : { t: 'type', q: it.q, chars: it.chars, tm: it.tm, hint: it.hint }));

export function score(item, value, elapsedMs) {
  const limit = item.tm * 1000;
  const ms = Math.max(0, elapsedMs - FEEDBACK_MS);
  const late = ms > limit + GRACE_MS;
  let correct = false;
  if (!late) {
    if (item.t === 'mc') correct = Number.isInteger(value) && value === item.a;
    else correct = typeof value === 'string' && [item.a, ...item.ok].some((x) => norm(x) === norm(value));
  }
  return { correct, points: correct ? 1 : 0, ms: Math.min(ms, limit) };   // one goal per right answer
}

const parse = (s, d) => { try { const v = JSON.parse(s); return v ?? d; } catch { return d; } };
const answerText = (it) => (it.t === 'mc' ? it.o[it.a] : it.a);

export const winnerOf = (d) => {
  if (d.status === 'done') return d.a_score > d.b_score ? 'a' : d.b_score > d.a_score ? 'b' : 'draw';
  if (d.status === 'expired') return d.a_done && !d.b_done ? 'a' : d.b_done && !d.a_done ? 'b' : null;
  return null;
};

/** Applies timeouts when a duel is read: nothing needs a background job. */
async function settle(db, d, now) {
  if ((d.status === 'invited' || d.status === 'active') && now > d.expires_at) {
    await db.prepare("UPDATE duels SET status = 'expired', updated_at = ? WHERE id = ? AND status IN ('invited', 'active')").bind(now, d.id).run();
    d.status = 'expired';
    d.updated_at = now;
  }
  return d;
}

async function load(db, id, user) {
  if (!Number.isInteger(id) || id < 1) throw new HttpError(404, 'not_found', 'Duel not found.');
  const d = await db.prepare('SELECT * FROM duels WHERE id = ?').bind(id).first();
  if (!d || (d.a_user !== user.id && d.b_user !== user.id)) throw new HttpError(404, 'not_found', 'Duel not found.');
  return d;
}

async function names(db, ids) {
  const out = {};
  for (const id of ids) {
    const r = await db.prepare('SELECT u.id AS id, u.name AS name, p.data AS data FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = ?').bind(id).first();
    if (r) {
      let avatar = '';
      try { const a = JSON.parse(r.data || '{}').settings; if (a && typeof a.avatar === 'string' && /^[a-z0-9_-]{1,20}$/.test(a.avatar)) avatar = a.avatar; } catch { /* ignore */ }
      out[id] = { id: r.id, name: String(r.name).slice(0, 40), avatar };
    }
  }
  return out;
}

function view(d, me, opp, now, withDeck) {
  const role = d.a_user === me.id ? 'a' : 'b', other = role === 'a' ? 'b' : 'a';
  const deck = parse(d.deck, []);
  const mine = parse(d[role + '_answers'], []), theirs = parse(d[other + '_answers'], []);
  const final = d.status === 'done' || d.status === 'expired';
  const w = winnerOf(d);
  // The opponent's score stays hidden until they have played and you have played too (or the game is over).
  const reveal = (d[role + '_done'] || final) && (d[other + '_done'] || final);
  const out = {
    id: d.id, game: d.game, mode: d.mode, status: d.status, role, n: deck.length,
    opponent: opp || { id: role === 'a' ? d.b_user : d.a_user, name: '?', avatar: '' },
    my: { score: d[role + '_score'], count: mine.length, done: Boolean(d[role + '_done']) },
    their: { count: theirs.length, done: Boolean(d[other + '_done']), score: reveal ? d[other + '_score'] : null },
    startAt: d.start_at, expiresAt: d.expires_at, createdAt: d.created_at, now,
    result: final ? { winner: w === null ? null : w === 'draw' ? 'draw' : w === role ? 'me' : 'them' } : null,
  };
  if (withDeck) out.deck = publicDeck(deck);
  return out;
}

/** POST /v1/duels {friend, game, mode, deck} */
export async function createDuel(db, user, body, now = Date.now()) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw bad('Body must be a JSON object.');
  const friend = body.friend;
  if (!Number.isInteger(friend)) throw bad('friend must be a friend id.', 'friend');
  if (!GAMES.includes(body.game)) throw bad(`game must be one of ${GAMES.join(', ')}.`, 'game');
  if (body.mode !== undefined && body.mode !== 'turn') throw bad("mode must be 'turn': live games were removed.", 'mode');
  const deck = validateDeck(body.deck);
  if (!(await areFriends(db, user.id, friend))) throw new HttpError(404, 'not_found', 'Friend not found.');
  if (!(await take(db, 'dl:' + user.id, dayKey(now), CREATE_PER_DAY))) throw new HttpError(429, 'too_many_duels', 'Too many challenges today.');
  const open = await db.prepare("SELECT COUNT(*) AS n FROM duels WHERE a_user = ? AND status IN ('invited', 'active') AND expires_at > ?").bind(user.id, now).first();
  if (open && open.n >= MAX_OPEN_AS_CHALLENGER) throw new HttpError(409, 'too_many_open', 'You have too many open challenges. Finish or wait for some first.');
  const expires = now + TURN_MS;
  const r = await db
    .prepare('INSERT INTO duels (game, mode, a_user, b_user, deck, created_at, expires_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id')
    .bind(body.game, 'turn', user.id, friend, JSON.stringify(deck), now, expires, now)
    .first();
  const d = await db.prepare('SELECT * FROM duels WHERE id = ?').bind(r.id).first();
  return { duel: view(d, user, (await names(db, [friend]))[friend], now, false) };
}

/** GET /v1/duels: your recent duels (open ones first). */
export async function listDuels(db, user, now = Date.now()) {
  const { results } = await db
    .prepare('SELECT * FROM duels WHERE (a_user = ?1 OR b_user = ?1) AND updated_at > ?2 ORDER BY updated_at DESC LIMIT 30')
    .bind(user.id, now - 14 * 86400000)
    .all();
  const ids = [...new Set(results.map((d) => (d.a_user === user.id ? d.b_user : d.a_user)))];
  const nm = await names(db, ids);
  const rows = [];
  for (const d of results) {
    await settle(db, d, now);
    rows.push(view(d, user, nm[d.a_user === user.id ? d.b_user : d.a_user], now, false));
  }
  const rank = (x) => (x.status === 'invited' || x.status === 'active' ? 0 : 1);
  rows.sort((p, q) => rank(p) - rank(q));
  return { duels: rows, now };
}

/** GET /v1/duels/{id}: one duel. The questions are included once you may play (never the right answers). */
export async function getDuel(db, user, id, now = Date.now()) {
  const d = await settle(db, await load(db, id, user), now);
  const role = d.a_user === user.id ? 'a' : 'b';
  const canPlay = d.status === 'active' || (d.status === 'invited' && role === 'a');
  const nm = await names(db, [role === 'a' ? d.b_user : d.a_user]);
  return { duel: view(d, user, nm[role === 'a' ? d.b_user : d.a_user], now, canPlay) };
}

/** POST /v1/duels/{id}/accept (the challenged friend) */
export async function acceptDuel(db, user, id, now = Date.now()) {
  const d = await settle(db, await load(db, id, user), now);
  if (d.b_user !== user.id) throw new HttpError(403, 'forbidden', 'Only the challenged friend can accept.');
  if (d.status !== 'invited') throw new HttpError(409, 'not_open', 'This challenge is not open any more.');
  await db.prepare("UPDATE duels SET status = 'active', expires_at = ?, updated_at = ? WHERE id = ?").bind(now + TURN_MS, now, d.id).run();
  return getDuel(db, user, id, now);
}

/** POST /v1/duels/{id}/decline (the challenged friend, or the challenger withdrawing) */
export async function declineDuel(db, user, id, now = Date.now()) {
  const d = await settle(db, await load(db, id, user), now);
  if (d.status !== 'invited') throw new HttpError(409, 'not_open', 'This challenge is not open any more.');
  await db.prepare("UPDATE duels SET status = 'declined', updated_at = ? WHERE id = ?").bind(now, d.id).run();
  return { ok: true };
}

/** POST /v1/duels/{id}/start: turn-based games only. Starts YOUR clock for question 1 and returns the questions. */
export async function startDuel(db, user, id, now = Date.now()) {
  const d = await settle(db, await load(db, id, user), now);
  const role = d.a_user === user.id ? 'a' : 'b';
  const canPlay = d.status === 'active' || (d.status === 'invited' && role === 'a');
  if (!canPlay) throw new HttpError(409, 'not_open', 'Accept the challenge first.');
  if (d[role + '_done']) throw new HttpError(409, 'already_done', 'You already played this one.');
  if (!d[role + '_t']) await db.prepare(`UPDATE duels SET ${role}_t = ?, updated_at = ? WHERE id = ?`).bind(now, now, d.id).run();
  return getDuel(db, user, id, now);
}

/** POST /v1/duels/{id}/answer {i, v}: answers question i with v (option number, or text). v = null means "time ran out". */
export async function answerDuel(db, user, id, body, now = Date.now()) {
  if (!body || typeof body !== 'object' || !Number.isInteger(body.i)) throw bad('i must be the question number.', 'i');
  const v = body.v;
  if (!(v === null || (Number.isInteger(v) && v >= -1 && v <= 3) || (typeof v === 'string' && v.length <= 60))) throw bad('v must be an option number or short text.', 'v');
  const d = await settle(db, await load(db, id, user), now);
  const role = d.a_user === user.id ? 'a' : 'b', other = role === 'a' ? 'b' : 'a';
  const playable = d.status === 'active' || (d.status === 'invited' && role === 'a');
  if (!playable) throw new HttpError(409, 'not_open', 'This game is not open for answers.');
  if (d[role + '_done']) throw new HttpError(409, 'already_done', 'You already finished this one.');
  if (!d[role + '_t']) throw new HttpError(409, 'not_started', 'Start the game first.');
  const deck = parse(d.deck, []), mine = parse(d[role + '_answers'], []);
  if (body.i !== mine.length || body.i >= deck.length) throw new HttpError(409, 'out_of_order', 'Answer the questions in order.');
  const item = deck[body.i];
  const s = score(item, v, now - d[role + '_t']);
  mine.push([v, s.ms, s.points]);
  const total = d[role + '_score'] + s.points;
  const finished = mine.length === deck.length;
  const bothDone = finished && d[other + '_done'];
  await db
    .prepare(`UPDATE duels SET ${role}_answers = ?, ${role}_score = ?, ${role}_done = ?, ${role}_t = ?, status = CASE WHEN ? THEN 'done' ELSE status END, finished_by = CASE WHEN ? THEN ? ELSE finished_by END, updated_at = ? WHERE id = ?`)
    .bind(JSON.stringify(mine), total, finished ? 1 : 0, now, bothDone ? 1 : 0, bothDone ? 1 : 0, user.id, now, d.id)
    .run();
  const fresh = await db.prepare('SELECT * FROM duels WHERE id = ?').bind(d.id).first();
  const nm = await names(db, [role === 'a' ? d.b_user : d.a_user]);
  return { correct: s.correct, points: s.points, goals: total, answer: answerText(item), duel: view(fresh, user, nm[role === 'a' ? d.b_user : d.a_user], now, false) };
}

/** Win/draw/loss counts of finished duels for one user (used on the public profile). `against` limits it to one opponent. */
export async function duelRecord(db, userId, against = null) {
  const { results } = await db
    .prepare("SELECT * FROM duels WHERE status IN ('done', 'expired') AND (a_user = ?1 OR b_user = ?1) ORDER BY updated_at DESC LIMIT 300")
    .bind(userId)
    .all();
  const rec = { w: 0, l: 0, d: 0 };
  for (const d of results) {
    if (against !== null && d.a_user !== against && d.b_user !== against) continue;
    const w = winnerOf(d);
    if (w === null) continue;
    const role = d.a_user === userId ? 'a' : 'b';
    if (w === 'draw') rec.d++;
    else if (w === role) rec.w++;
    else rec.l++;
  }
  return rec;
}
