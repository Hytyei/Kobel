import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import worker from '../src/index.js';
import { createTestDb } from './d1-adapter.mjs';
import { createCode, addFriend, listFriends, friendProfile, publicView } from '../src/friends.js';
import { createDuel, getDuel, acceptDuel, startDuel, answerDuel, listDuels, declineDuel, score, validateDeck, duelRecord } from '../src/duels.js';

function setup() {
  const db = createTestDb();
  const env = { DB: db, ALLOWED_ORIGINS: '' };
  const addUser = (name) => {
    const code = 'kb_' + randomBytes(24).toString('base64url');
    const r = db.sqlite.prepare('INSERT INTO users (name, token_hash, created_at) VALUES (?, ?, ?)').run(name, createHash('sha256').update(code).digest('hex'), Date.now());
    return { id: Number(r.lastInsertRowid), name, code };
  };
  const call = async (method, path, { code, body } = {}) => {
    const res = await worker.fetch(new Request('https://api.test' + path, { method, headers: { ...(code ? { Authorization: 'Bearer ' + code } : {}), 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }), env);
    const t = await res.text();
    return { status: res.status, json: t ? JSON.parse(t) : null };
  };
  const befriend = async (a, b) => { const { code } = await createCode(db, a); await addFriend(db, b, { code }); };
  return { db, addUser, call, befriend };
}
const deck = (n = 9) => Array.from({ length: n }, (_, i) => ({ t: 'mc', q: 'Q' + i, o: ['a' + i, 'b' + i, 'c' + i, 'd' + i], a: 1, tm: 10 }));

test('invite code: add a friend, single use, own code and bad codes are refused', async () => {
  const { db, addUser, call } = setup();
  const A = addUser('Alice'), B = addUser('Bob'), C = addUser('Cleo');
  const code = (await call('POST', '/v1/friends/code', { code: A.code })).json.code;
  assert.match(code, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.equal((await call('POST', '/v1/friends', { code: A.code, body: { code } })).json.error.code, 'own_code');
  assert.equal((await call('POST', '/v1/friends', { code: B.code, body: { code: 'nonsense' } })).status, 400);
  assert.equal((await call('POST', '/v1/friends', { code: B.code, body: { code: 'AAAA-AAAA' } })).status, 404);
  const ok = await call('POST', '/v1/friends', { code: B.code, body: { code: code.toLowerCase().replace('-', ' ') } });
  assert.equal(ok.status, 201);
  assert.equal(ok.json.friend.name, 'Alice');
  assert.equal((await call('POST', '/v1/friends', { code: C.code, body: { code } })).status, 404, 'single use');
  const la = await call('GET', '/v1/friends', { code: A.code }), lb = await call('GET', '/v1/friends', { code: B.code });
  assert.deepEqual(la.json.friends.map((f) => f.name), ['Bob']);
  assert.deepEqual(lb.json.friends.map((f) => f.name), ['Alice']);
  assert.equal((await call('GET', '/v1/friends', { code: C.code })).json.friends.length, 0);
  assert.equal((await call('GET', '/v1/friends')).status, 401);
});

test('public profile: friends only, whitelisted numbers only, removal works on both sides', async () => {
  const { db, addUser, call, befriend } = setup();
  const A = addUser('Alice'), B = addUser('Bob'), C = addUser('Cleo');
  const today = new Date().toISOString().slice(0, 10);
  const doc = { stats: { xp: 1234, streak: 5, best: 9, last: today, days: { [today]: { xp: 80, n: 10 } }, L: { i: 2 }, pub: { lp: 321, stage: 'Sonntagsliga', rec: { bestDayXp: 200, favGame: 'sprint', evil: 9 } } },
    games: { sprint: { best: 400, stars: 3, plays: 7 }, hack: { best: 1 } }, settings: { avatar: 'fox', sync: { url: 'https://secret', code: 'SECRET' } }, cards: ['private'] };
  db.sqlite.prepare('INSERT INTO profiles (user_id, data, updated_at, synced_at) VALUES (?, ?, 1, 1)').run(A.id, JSON.stringify(doc));
  await befriend(A, B);
  assert.equal((await call('GET', `/v1/friends/${A.id}`, { code: C.code })).status, 404, 'strangers cannot look');
  const p = (await call('GET', `/v1/friends/${A.id}`, { code: B.code })).json.profile;
  assert.equal(p.name, 'Alice'); assert.equal(p.xp, 1234); assert.equal(p.streak, 5); assert.equal(p.week, 80); assert.equal(p.tier, 2);
  assert.equal(p.stage, 'Sonntagsliga'); assert.equal(p.games.sprint.stars, 3); assert.equal(p.games.hack, undefined); assert.equal(p.rec.favGame, 'sprint'); assert.equal(p.rec.evil, undefined);
  assert.deepEqual(p.duels, { w: 0, l: 0, d: 0 });
  const txt = JSON.stringify(p);
  assert.ok(!/SECRET|secret|private/.test(txt), 'nothing private leaves the server');
  assert.deepEqual(publicView('{broken').games, {});
  assert.equal((await call('DELETE', `/v1/friends/${A.id}`, { code: B.code })).status, 200);
  assert.equal((await call('GET', `/v1/friends/${B.id}`, { code: A.code })).status, 404);
});

test('friend codes are rate limited and expire', async () => {
  const { db, addUser } = setup();
  const A = addUser('Alice'), B = addUser('Bob');
  const { code } = await createCode(db, A, 1000);
  await assert.rejects(addFriend(db, B, { code }, 1000 + 8 * 86400000), /not valid/);
  for (let i = 0; i < 20; i++) await addFriend(db, B, { code: 'AAAA-AAAA' }, 5000).catch(() => {});
  await assert.rejects(addFriend(db, B, { code: 'AAAA-AAAA' }, 5000), /Too many attempts/);
});

test('deck validation rejects malformed decks', () => {
  assert.throws(() => validateDeck(deck(5)), /exactly 9/);
  assert.throws(() => validateDeck(deck(10)), /exactly 9/);
  assert.throws(() => validateDeck([...deck(8), { t: 'mc', q: 'x', o: ['a', 'a', 'b', 'c'], a: 0 }]), /different/);
  assert.throws(() => validateDeck([...deck(8), { t: 'zzz', q: 'x' }]), /mc/);
  assert.throws(() => validateDeck([...deck(8), { t: 'mc', q: 'x', o: ['a', 'b', 'c', 'd'], a: 9 }]), /right option/);
  assert.equal(validateDeck(deck(9)).length, 9);
});

test('scoring: one goal per right answer; wrong and late answers score nothing; typed answers forgive case and spaces', () => {
  const mc = { t: 'mc', q: '', o: ['a', 'b', 'c', 'd'], a: 2, tm: 10, ok: [] };
  assert.equal(score(mc, 2, 900).points, 1);                       // a goal, however fast
  assert.equal(score(mc, 2, 900 + 9000).points, 1, 'speed does not matter any more');
  assert.equal(score(mc, 1, 1000).points, 0);
  assert.equal(score(mc, 2, 900 + 10000 + 3500).points, 0);        // far too late
  const ty = { t: 'type', q: '', a: 'Straße', ok: ['Strasse'], tm: 10 };
  assert.equal(score(ty, '  strasse. ', 900).correct, true);
  assert.equal(score(ty, 'Strase', 900).correct, false);
});

test('duel: challenger plays first, friend accepts and plays, goals decide the winner', async () => {
  const { db, addUser, befriend } = setup();
  const A = addUser('Alice'), B = addUser('Bob'), C = addUser('Cleo');
  await befriend(A, B);
  await assert.rejects(createDuel(db, A, { friend: C.id, game: 'sprint', deck: deck() }, 1000), /not found/);
  await assert.rejects(createDuel(db, A, { friend: B.id, game: 'sprint', mode: 'live', deck: deck() }, 1000), /turn/);
  const { duel } = await createDuel(db, A, { friend: B.id, game: 'sprint', deck: deck() }, 1000);
  assert.equal(duel.status, 'invited'); assert.equal(duel.deck, undefined); assert.equal(duel.mode, 'turn'); assert.equal(duel.n, 9);
  let g = await startDuel(db, A, duel.id, 2000);
  assert.equal(g.duel.deck.length, 9);
  assert.ok(!JSON.stringify(g.duel.deck).includes('"a"'), 'right answers are never sent');
  await assert.rejects(answerDuel(db, B, duel.id, { i: 0, v: 1 }, 2500), /not open|Accept/);
  let t = 2000, last;
  for (let i = 0; i < 9; i++) { t += 1500; last = await answerDuel(db, A, duel.id, { i, v: 1 }, t); assert.equal(last.correct, true); assert.equal(last.answer, 'b' + i); assert.equal(last.goals, i + 1); }
  assert.equal(last.duel.my.score, 9, 'nine right answers are nine goals');
  await assert.rejects(answerDuel(db, A, duel.id, { i: 9, v: 1 }, t + 1000), /already|finished/);
  assert.equal((await getDuel(db, B, duel.id, t + 5000)).duel.their.score, null, 'hidden until B has played');
  await acceptDuel(db, B, duel.id, t + 10000);
  await startDuel(db, B, duel.id, t + 11000);
  let u = t + 11000;
  await assert.rejects(answerDuel(db, B, duel.id, { i: 1, v: 1 }, u + 1000), /order/);
  for (let i = 0; i < 9; i++) { u += 8000; await answerDuel(db, B, duel.id, { i, v: i < 2 ? 0 : 1 }, u); }
  const end = (await getDuel(db, B, duel.id, u + 1)).duel;
  assert.equal(end.status, 'done'); assert.equal(end.result.winner, 'them');
  assert.equal(end.my.score, 7); assert.equal(end.their.score, 9);
  assert.equal((await getDuel(db, A, duel.id, u + 1)).duel.result.winner, 'me');
  assert.deepEqual(await duelRecord(db, A.id), { w: 1, l: 0, d: 0 });
  assert.deepEqual(await duelRecord(db, B.id, A.id), { w: 0, l: 1, d: 0 });
});

test('duel: equal goals are a draw, however long the answers took', async () => {
  const { db, addUser, befriend } = setup();
  const A = addUser('Alice'), B = addUser('Bob');
  await befriend(A, B);
  const { duel } = await createDuel(db, A, { friend: B.id, game: 'dash', deck: deck() }, 1000);
  await startDuel(db, A, duel.id, 1100);
  for (let i = 0; i < 9; i++) await answerDuel(db, A, duel.id, { i, v: i < 5 ? 1 : 0 }, 1200 + i * 700);
  await acceptDuel(db, B, duel.id, 9000); await startDuel(db, B, duel.id, 9100);
  for (let i = 0; i < 9; i++) await answerDuel(db, B, duel.id, { i, v: i < 5 ? 1 : 0 }, 9200 + i * 9000);
  const d = (await getDuel(db, A, duel.id, 200000)).duel;
  assert.equal(d.status, 'done'); assert.equal(d.result.winner, 'draw'); assert.equal(d.my.score, 5); assert.equal(d.their.score, 5);
  assert.deepEqual(await duelRecord(db, A.id), { w: 0, l: 0, d: 1 });
});

test('time limits: an unplayed duel expires and the player who finished wins', async () => {
  const { db, addUser, befriend } = setup();
  const A = addUser('Alice'), B = addUser('Bob');
  await befriend(A, B);
  const turn = (await createDuel(db, A, { friend: B.id, game: 'gap', deck: deck() }, 2000)).duel;
  await startDuel(db, A, turn.id, 2500);
  for (let i = 0; i < 9; i++) await answerDuel(db, A, turn.id, { i, v: 1 }, 3000 + i * 1000);
  const late = (await getDuel(db, B, turn.id, 2000 + 25 * 3600000)).duel;
  assert.equal(late.status, 'expired'); assert.equal(late.result.winner, 'them');
  await assert.rejects(startDuel(db, B, turn.id, 2000 + 25 * 3600000), /not open|Accept/);
});

test('declining, outsiders, bad input and removing a friend closes open duels', async () => {
  const { db, addUser, call, befriend } = setup();
  const A = addUser('Alice'), B = addUser('Bob'), C = addUser('Cleo');
  await befriend(A, B);
  const d1 = (await call('POST', '/v1/duels', { code: A.code, body: { friend: B.id, game: 'scramble', deck: [...Array(9)].map((_, i) => ({ t: 'type', q: 'Q' + i, a: 'wort', chars: ['w', 'o', 'r', 't'] })) } })).json.duel;
  assert.equal((await call('GET', `/v1/duels/${d1.id}`, { code: C.code })).status, 404, 'outsiders see nothing');
  assert.equal((await call('POST', `/v1/duels/${d1.id}/answer`, { code: C.code, body: { i: 0, v: 'x' } })).status, 404);
  assert.equal((await call('POST', '/v1/duels', { code: A.code, body: { friend: B.id, game: 'chess', deck: deck() } })).status, 400);
  assert.equal((await call('POST', '/v1/duels', { code: A.code, body: { friend: B.id, game: 'sprint', deck: 'x' } })).status, 400);
  assert.equal((await call('POST', `/v1/duels/${d1.id}/accept`, { code: A.code })).status, 403, 'only the friend can accept');
  await call('DELETE', `/v1/friends/${B.id}`, { code: A.code });
  assert.equal((await call('GET', `/v1/duels/${d1.id}`, { code: B.code })).json.duel.status, 'expired');
  const d2 = (await call('POST', '/v1/duels', { code: A.code, body: { friend: B.id, game: 'sprint', deck: deck() } })).status;
  assert.equal(d2, 404, 'not friends any more');
});
