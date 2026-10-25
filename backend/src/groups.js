// Study groups: up to 8 friends who play the same rounds, share a table and keep a group streak.
//
// A round is one game with 9 questions. Every member answers the same questions within 24 hours, turn-based, at their own
// time. Goals = right answers (0 to 9). When everybody has played (or the 24 hours are over) the round is settled and
// counts for the table: inside a round every pair of players is a match; more goals win (3 points), equal goals draw
// (1 point), and a member who did not play loses against everybody who did. Rounds settle lazily when somebody reads them.
// Results of other members stay hidden until you have played the round yourself or it is over.
import { HttpError } from './http.js';
import { take } from './register.js';
import { areFriends, avatarOf } from './friends.js';
import { GAMES, DECK_SIZE, validateDeck, publicDeck, score } from './duels.js';
import { activeDays, sharedStreak } from './streaks.js';

export const MAX_MEMBERS = 8;
export const MAX_GROUPS = 5;
export const MAX_OPEN_ROUNDS = 3;
export const ROUND_MS = 24 * 3600000;
const ROUNDS_PER_DAY = 10;
const GROUPS_PER_DAY = 10;
const dayKey = (t) => new Date(t).toISOString().slice(0, 10);
const bad = (msg, field) => new HttpError(400, 'invalid_request', msg, field);
const parse = (s, d) => { try { const v = JSON.parse(s); return v ?? d; } catch { return d; } };
const NAME_RE = /^[\p{L}\p{N}][\p{L}\p{N} _.'&-]{0,28}[\p{L}\p{N}]$/u;

function cleanName(v) {
  const name = typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '';
  if (!NAME_RE.test(name)) throw bad('Group name: 2-30 characters, letters, numbers, space and . _ - \' &.', 'name');
  return name;
}

async function loadGroup(db, user, id) {
  if (!Number.isInteger(id) || id < 1) throw new HttpError(404, 'not_found', 'Group not found.');
  const g = await db.prepare('SELECT g.* FROM groups g JOIN group_members m ON m.group_id = g.id AND m.user_id = ? WHERE g.id = ?').bind(user.id, id).first();
  if (!g) throw new HttpError(404, 'not_found', 'Group not found.');
  return g;
}

async function members(db, groupId) {
  const { results } = await db
    .prepare('SELECT u.id AS id, u.name AS name, u.badge AS badge, p.data AS data, m.joined_at AS joined FROM group_members m JOIN users u ON u.id = m.user_id LEFT JOIN profiles p ON p.user_id = u.id WHERE m.group_id = ? ORDER BY m.joined_at, u.id')
    .bind(groupId)
    .all();
  return results;
}

/** Settles every open round of a group whose players are all done or whose time is over. */
async function settleRounds(db, groupId, now) {
  const { results } = await db.prepare("SELECT id, expires_at FROM group_games WHERE group_id = ? AND status = 'open'").bind(groupId).all();
  for (const r of results) {
    const left = await db.prepare('SELECT COUNT(*) AS n FROM group_plays WHERE game_id = ? AND done = 0').bind(r.id).first();
    if ((left && left.n === 0) || now > r.expires_at) {
      await db.prepare("UPDATE group_games SET status = 'done', settled_at = ? WHERE id = ? AND status = 'open'").bind(now, r.id).run();
    }
  }
}

/** Table of all settled rounds. */
function buildTable(mem, rounds) {
  const rows = new Map(mem.map((m) => [m.id, { id: m.id, name: String(m.name).slice(0, 40), badge: m.badge || '', avatar: avatarOf(m.data), p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, form: [] }]));
  for (const r of rounds) { // oldest first
    const list = r.plays.filter((x) => rows.has(x.user_id));
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const x = list[i], y = list[j];
        if (!x.done && !y.done) continue; // two no-shows: no match
        const gx = x.done ? x.score : 0, gy = y.done ? y.score : 0;
        const rx = rows.get(x.user_id), ry = rows.get(y.user_id);
        rx.p++; ry.p++; rx.gf += gx; rx.ga += gy; ry.gf += gy; ry.ga += gx;
        if (gx > gy || (gx === gy && x.done && !y.done)) { rx.w++; ry.l++; rx.pts += 3; }
        else if (gy > gx || (gx === gy && y.done && !x.done)) { ry.w++; rx.l++; ry.pts += 3; }
        else { rx.d++; ry.d++; rx.pts++; ry.pts++; }
      }
    }
    const top = Math.max(0, ...list.filter((x) => x.done).map((x) => x.score));
    const tops = list.filter((x) => x.done && x.score === top).length;
    for (const x of list) {
      const row = rows.get(x.user_id);
      row.form.push(x.done && x.score === top ? (tops === 1 ? 'W' : 'D') : 'L');
      if (row.form.length > 5) row.form.shift();
    }
  }
  const out = [...rows.values()];
  for (const r of out) r.gd = r.gf - r.ga;
  out.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.name.localeCompare(b.name));
  out.forEach((r, i) => { r.rank = i + 1; });
  return out;
}

async function roundsOf(db, groupId, limit = 40) {
  const { results } = await db.prepare('SELECT * FROM group_games WHERE group_id = ? ORDER BY created_at DESC, id DESC LIMIT ?').bind(groupId, limit).all();
  for (const r of results) {
    const { results: plays } = await db.prepare('SELECT * FROM group_plays WHERE game_id = ?').bind(r.id).all();
    r.plays = plays;
  }
  return results;
}

function roundView(r, me, names) {
  const mine = r.plays.find((x) => x.user_id === me.id);
  const over = r.status === 'done';
  const reveal = over || Boolean(mine && mine.done);
  return {
    id: r.id, game: r.game, status: r.status, creator: r.creator, createdAt: r.created_at, expiresAt: r.expires_at,
    n: DECK_SIZE,
    mine: mine ? { done: Boolean(mine.done), count: parse(mine.answers, []).length, goals: reveal || mine.done ? mine.score : mine.score } : null,
    played: r.plays.filter((x) => x.done).length, total: r.plays.length,
    results: reveal
      ? r.plays.map((x) => ({ id: x.user_id, name: names.get(x.user_id) || '?', done: Boolean(x.done), goals: x.done ? x.score : null })).sort((a, b) => (b.goals ?? -1) - (a.goals ?? -1))
      : null,
  };
}

async function groupView(db, user, g, now) {
  await settleRounds(db, g.id, now);
  const mem = await members(db, g.id);
  const rounds = await roundsOf(db, g.id);
  const names = new Map(mem.map((m) => [m.id, String(m.name).slice(0, 40)]));
  const settledOldestFirst = rounds.filter((r) => r.status === 'done').reverse();
  const streak = sharedStreak(mem.map((m) => activeDays(m.data)), now);
  return {
    id: g.id, name: g.name, owner: g.owner, createdAt: g.created_at, isOwner: g.owner === user.id,
    members: mem.map((m) => ({ id: m.id, name: String(m.name).slice(0, 40), badge: m.badge || '', avatar: avatarOf(m.data), joined: m.joined })),
    streak: { n: streak.n, best: streak.best, today: streak.today },
    table: buildTable(mem, settledOldestFirst),
    rounds: rounds.slice(0, 12).map((r) => roundView(r, user, names)),
    open: rounds.filter((r) => r.status === 'open').length,
  };
}

/** POST /v1/groups {name, members:[friendId...]} */
export async function createGroup(db, user, body, now = Date.now()) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw bad('Body must be a JSON object.');
  const name = cleanName(body.name);
  const ids = body.members === undefined ? [] : body.members;
  if (!Array.isArray(ids) || !ids.every((x) => Number.isInteger(x))) throw bad('members must be a list of friend ids.', 'members');
  const uniq = [...new Set(ids)].filter((x) => x !== user.id);
  if (uniq.length + 1 > MAX_MEMBERS) throw new HttpError(409, 'group_full', `A group holds up to ${MAX_MEMBERS} people.`);
  for (const f of uniq) if (!(await areFriends(db, user.id, f))) throw new HttpError(404, 'not_found', 'Friend not found.', 'members');
  const mine = await db.prepare('SELECT COUNT(*) AS n FROM group_members WHERE user_id = ?').bind(user.id).first();
  if (mine && mine.n >= MAX_GROUPS) throw new HttpError(409, 'too_many_groups', `You can be in up to ${MAX_GROUPS} groups.`);
  if (!(await take(db, 'gc:' + user.id, dayKey(now), GROUPS_PER_DAY))) throw new HttpError(429, 'too_many_groups_today', 'Too many new groups today.');
  for (const f of uniq) {
    const c = await db.prepare('SELECT COUNT(*) AS n FROM group_members WHERE user_id = ?').bind(f).first();
    if (c && c.n >= MAX_GROUPS) throw new HttpError(409, 'friend_in_too_many', 'One of the friends is already in 5 groups.', 'members');
  }
  const r = await db.prepare('INSERT INTO groups (name, owner, created_at, updated_at) VALUES (?, ?, ?, ?) RETURNING id').bind(name, user.id, now, now).first();
  await db.prepare('INSERT INTO group_members (group_id, user_id, added_by, joined_at) VALUES (?, ?, ?, ?)').bind(r.id, user.id, user.id, now).run();
  for (const f of uniq) await db.prepare('INSERT INTO group_members (group_id, user_id, added_by, joined_at) VALUES (?, ?, ?, ?)').bind(r.id, f, user.id, now).run();
  return { group: await groupView(db, user, { id: r.id, name, owner: user.id, created_at: now }, now) };
}

/** GET /v1/groups: your groups, short. */
export async function listGroups(db, user, now = Date.now()) {
  const { results } = await db.prepare('SELECT g.* FROM groups g JOIN group_members m ON m.group_id = g.id WHERE m.user_id = ? ORDER BY g.updated_at DESC, g.id DESC LIMIT 20').bind(user.id).all();
  const groups = [];
  for (const g of results) {
    await settleRounds(db, g.id, now);
    const mem = await members(db, g.id);
    const streak = sharedStreak(mem.map((m) => activeDays(m.data)), now);
    const todo = await db
      .prepare("SELECT COUNT(*) AS n FROM group_games gg JOIN group_plays gp ON gp.game_id = gg.id AND gp.user_id = ? WHERE gg.group_id = ? AND gg.status = 'open' AND gp.done = 0")
      .bind(user.id, g.id)
      .first();
    groups.push({ id: g.id, name: g.name, owner: g.owner, count: mem.length, avatars: mem.slice(0, 4).map((m) => avatarOf(m.data)), streak: streak.n, todo: todo ? todo.n : 0 });
  }
  return { groups };
}

export async function getGroup(db, user, id, now = Date.now()) {
  return { group: await groupView(db, user, await loadGroup(db, user, id), now) };
}

/** PATCH /v1/groups/{id} {name}: owner only. */
export async function renameGroup(db, user, id, body, now = Date.now()) {
  const g = await loadGroup(db, user, id);
  if (g.owner !== user.id) throw new HttpError(403, 'forbidden', 'Only the owner can rename the group.');
  if (!body || typeof body !== 'object') throw bad('Body must be a JSON object.');
  const name = cleanName(body.name);
  await db.prepare('UPDATE groups SET name = ?, updated_at = ? WHERE id = ?').bind(name, now, g.id).run();
  return getGroup(db, user, id, now);
}

/** DELETE /v1/groups/{id}: owner only. */
export async function deleteGroup(db, user, id) {
  const g = await loadGroup(db, user, id);
  if (g.owner !== user.id) throw new HttpError(403, 'forbidden', 'Only the owner can delete the group.');
  await db.prepare('DELETE FROM groups WHERE id = ?').bind(g.id).run();
  return { ok: true };
}

/** POST /v1/groups/{id}/members {user}: any member can add one of THEIR friends. */
export async function addMember(db, user, id, body, now = Date.now()) {
  const g = await loadGroup(db, user, id);
  if (!body || typeof body !== 'object' || !Number.isInteger(body.user)) throw bad('user must be a friend id.', 'user');
  const f = body.user;
  if (!(await areFriends(db, user.id, f))) throw new HttpError(404, 'not_found', 'Friend not found.', 'user');
  const have = await db.prepare('SELECT 1 AS ok FROM group_members WHERE group_id = ? AND user_id = ?').bind(g.id, f).first();
  if (have) throw new HttpError(409, 'already_member', 'Already in the group.');
  const count = await db.prepare('SELECT COUNT(*) AS n FROM group_members WHERE group_id = ?').bind(g.id).first();
  if (count.n >= MAX_MEMBERS) throw new HttpError(409, 'group_full', `A group holds up to ${MAX_MEMBERS} people.`);
  const theirs = await db.prepare('SELECT COUNT(*) AS n FROM group_members WHERE user_id = ?').bind(f).first();
  if (theirs.n >= MAX_GROUPS) throw new HttpError(409, 'friend_in_too_many', 'That friend is already in 5 groups.');
  await db.prepare('INSERT INTO group_members (group_id, user_id, added_by, joined_at) VALUES (?, ?, ?, ?)').bind(g.id, f, user.id, now).run();
  await db.prepare('UPDATE groups SET updated_at = ? WHERE id = ?').bind(now, g.id).run();
  return getGroup(db, user, id, now);
}

/** DELETE /v1/groups/{id}/members/{userId}: leave yourself, or (owner) remove somebody. */
export async function removeMember(db, user, id, userId, now = Date.now()) {
  const g = await loadGroup(db, user, id);
  const self = userId === user.id;
  if (!self && g.owner !== user.id) throw new HttpError(403, 'forbidden', 'Only the owner can remove other members.');
  const row = await db.prepare('SELECT 1 AS ok FROM group_members WHERE group_id = ? AND user_id = ?').bind(g.id, userId).first();
  if (!row) throw new HttpError(404, 'not_found', 'That person is not in the group.');
  await db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').bind(g.id, userId).run();
  // open rounds no longer wait for somebody who left
  await db.prepare("DELETE FROM group_plays WHERE user_id = ? AND game_id IN (SELECT id FROM group_games WHERE group_id = ? AND status = 'open')").bind(userId, g.id).run();
  const left = await members(db, g.id);
  if (!left.length) { await db.prepare('DELETE FROM groups WHERE id = ?').bind(g.id).run(); return { ok: true, deleted: true }; }
  if (g.owner === userId) await db.prepare('UPDATE groups SET owner = ?, updated_at = ? WHERE id = ?').bind(left[0].id, now, g.id).run();
  else await db.prepare('UPDATE groups SET updated_at = ? WHERE id = ?').bind(now, g.id).run();
  return { ok: true, deleted: false };
}

/** POST /v1/groups/{id}/games {game, deck}: opens a round for everybody in the group. */
export async function createRound(db, user, id, body, now = Date.now()) {
  const g = await loadGroup(db, user, id);
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw bad('Body must be a JSON object.');
  if (!GAMES.includes(body.game)) throw bad(`game must be one of ${GAMES.join(', ')}.`, 'game');
  const deck = validateDeck(body.deck);
  const mem = await members(db, g.id);
  if (mem.length < 2) throw new HttpError(409, 'group_too_small', 'Add at least one friend before you start a round.');
  await settleRounds(db, g.id, now);
  const open = await db.prepare("SELECT COUNT(*) AS n FROM group_games WHERE group_id = ? AND status = 'open'").bind(g.id).first();
  if (open.n >= MAX_OPEN_ROUNDS) throw new HttpError(409, 'too_many_open', `A group can have ${MAX_OPEN_ROUNDS} open rounds at a time.`);
  if (!(await take(db, 'gr:' + user.id, dayKey(now), ROUNDS_PER_DAY))) throw new HttpError(429, 'too_many_rounds', 'Too many rounds today.');
  const r = await db
    .prepare('INSERT INTO group_games (group_id, game, creator, deck, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING id')
    .bind(g.id, body.game, user.id, JSON.stringify(deck), now, now + ROUND_MS)
    .first();
  for (const m of mem) await db.prepare('INSERT INTO group_plays (game_id, user_id) VALUES (?, ?)').bind(r.id, m.id).run();
  await db.prepare('UPDATE groups SET updated_at = ? WHERE id = ?').bind(now, g.id).run();
  return getRound(db, user, id, r.id, now);
}

async function loadRound(db, user, groupId, gameId, now) {
  const g = await loadGroup(db, user, groupId);
  if (!Number.isInteger(gameId) || gameId < 1) throw new HttpError(404, 'not_found', 'Round not found.');
  const r = await db.prepare('SELECT * FROM group_games WHERE id = ? AND group_id = ?').bind(gameId, g.id).first();
  if (!r) throw new HttpError(404, 'not_found', 'Round not found.');
  await settleRounds(db, g.id, now);
  return db.prepare('SELECT * FROM group_games WHERE id = ?').bind(r.id).first();
}

/** GET /v1/groups/{id}/games/{gid}: the round, with the questions when you can still play it. */
export async function getRound(db, user, groupId, gameId, now = Date.now()) {
  const r = await loadRound(db, user, groupId, gameId, now);
  const { results: plays } = await db.prepare('SELECT * FROM group_plays WHERE game_id = ?').bind(r.id).all();
  r.plays = plays;
  const mem = await members(db, r.group_id);
  const names = new Map(mem.map((m) => [m.id, String(m.name).slice(0, 40)]));
  const mine = plays.find((x) => x.user_id === user.id);
  const out = roundView(r, user, names);
  if (mine && !mine.done && r.status === 'open') out.deck = publicDeck(parse(r.deck, []));
  return { round: out };
}

/** POST /v1/groups/{id}/games/{gid}/start: starts your clock for question 1. */
export async function startRound(db, user, groupId, gameId, now = Date.now()) {
  const r = await loadRound(db, user, groupId, gameId, now);
  const mine = await db.prepare('SELECT * FROM group_plays WHERE game_id = ? AND user_id = ?').bind(r.id, user.id).first();
  if (!mine) throw new HttpError(409, 'not_in_round', 'You were not part of this round.');
  if (r.status !== 'open') throw new HttpError(409, 'not_open', 'This round is over.');
  if (mine.done) throw new HttpError(409, 'already_done', 'You already played this round.');
  if (!mine.t) await db.prepare('UPDATE group_plays SET t = ? WHERE game_id = ? AND user_id = ?').bind(now, r.id, user.id).run();
  return getRound(db, user, groupId, gameId, now);
}

/** POST /v1/groups/{id}/games/{gid}/answer {i, v} */
export async function answerRound(db, user, groupId, gameId, body, now = Date.now()) {
  if (!body || typeof body !== 'object' || !Number.isInteger(body.i)) throw bad('i must be the question number.', 'i');
  const v = body.v;
  if (!(v === null || (Number.isInteger(v) && v >= -1 && v <= 3) || (typeof v === 'string' && v.length <= 60))) throw bad('v must be an option number or short text.', 'v');
  const r = await loadRound(db, user, groupId, gameId, now);
  const mine = await db.prepare('SELECT * FROM group_plays WHERE game_id = ? AND user_id = ?').bind(r.id, user.id).first();
  if (!mine) throw new HttpError(409, 'not_in_round', 'You were not part of this round.');
  if (r.status !== 'open') throw new HttpError(409, 'not_open', 'This round is over.');
  if (mine.done) throw new HttpError(409, 'already_done', 'You already played this round.');
  if (!mine.t) throw new HttpError(409, 'not_started', 'Start the round first.');
  const deck = parse(r.deck, []), answers = parse(mine.answers, []);
  if (body.i !== answers.length || body.i >= deck.length) throw new HttpError(409, 'out_of_order', 'Answer the questions in order.');
  const item = deck[body.i], s = score(item, v, now - mine.t);
  answers.push([v, s.ms, s.points]);
  const finished = answers.length === deck.length, total = mine.score + s.points;
  await db
    .prepare('UPDATE group_plays SET answers = ?, score = ?, done = ?, t = ?, finished_at = ? WHERE game_id = ? AND user_id = ?')
    .bind(JSON.stringify(answers), total, finished ? 1 : 0, now, finished ? now : 0, r.id, user.id)
    .run();
  if (finished) await settleRounds(db, r.group_id, now);
  const view = (await getRound(db, user, groupId, gameId, now)).round;
  return { correct: s.correct, points: s.points, goals: total, answer: item.t === 'mc' ? item.o[item.a] : item.a, round: view };
}

/** A manual notification to the other members of a group: a preset message or a short custom one. */
export const PING_KINDS = ['practise', 'round', 'streak', 'custom'];
export const PING_COOLDOWN_MS = 10 * 60000;
const PINGS_PER_DAY = 5;
export async function pingGroup(db, user, id, body, now = Date.now()) {
  const g = await loadGroup(db, user, id);
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw bad('Body must be a JSON object.');
  if (!PING_KINDS.includes(body.kind)) throw bad(`kind must be one of ${PING_KINDS.join(', ')}.`, 'kind');
  let text = '';
  if (body.kind === 'custom') {
    text = typeof body.text === 'string' ? body.text.replace(/[\u0000-\u001f\u007f<>]/g, ' ').trim().replace(/\s+/g, ' ') : '';
    if (text.length < 1 || text.length > 60) throw bad('text: 1 to 60 characters.', 'text');
    if (/https?:|www\./i.test(text)) throw bad('text must not contain links.', 'text');
  }
  const mem = await members(db, g.id);
  if (mem.length < 2) throw new HttpError(409, 'group_too_small', 'Add at least one friend before you ping the group.');
  const last = await db.prepare('SELECT MAX(created_at) AS t FROM group_pings WHERE group_id = ? AND sender = ?').bind(g.id, user.id).first();
  if (last && last.t && now - last.t < PING_COOLDOWN_MS) {
    throw new HttpError(429, 'ping_cooldown', 'You pinged this group a moment ago. Wait a few minutes.');
  }
  if (!(await take(db, 'gp:' + user.id, dayKey(now), PINGS_PER_DAY))) throw new HttpError(429, 'too_many_pings', 'Too many pings today.');
  await db.prepare('DELETE FROM group_pings WHERE group_id = ? AND created_at < ?').bind(g.id, now - 7 * 86400000).run();
  await db.prepare('INSERT INTO group_pings (group_id, sender, kind, text, created_at) VALUES (?, ?, ?, ?, ?)').bind(g.id, user.id, body.kind, text, now).run();
  return { ok: true, sent: mem.length - 1, next_at: now + PING_COOLDOWN_MS };
}
