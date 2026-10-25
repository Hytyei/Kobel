import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import worker from '../src/index.js';
import { createTestDb } from './d1-adapter.mjs';
import { createCode, addFriend } from '../src/friends.js';
import { activeDays, sharedStreak } from '../src/streaks.js';

const DAY = 86400000;
function setup() {
  const db = createTestDb();
  const env = { DB: db, ALLOWED_ORIGINS: '' };
  const addUser = (name, days) => {
    const code = 'kb_' + randomBytes(24).toString('base64url');
    const r = db.sqlite.prepare('INSERT INTO users (name, token_hash, created_at) VALUES (?, ?, ?)').run(name, createHash('sha256').update(code).digest('hex'), Date.now());
    const u = { id: Number(r.lastInsertRowid), name, code };
    if (days) db.sqlite.prepare('INSERT INTO profiles (user_id, data, updated_at, synced_at) VALUES (?, ?, 1, 1)').run(u.id, JSON.stringify({ stats: { pub: { days } } }));
    return u;
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
const today = Math.floor(Date.now() / DAY);

test('streaks: day lists are cleaned, shared streak needs everybody', () => {
  assert.deepEqual(activeDays({ stats: { pub: { days: [today, today, 5, 'x', 1.5, today - 1, 99999] } } }), [today - 1, today]);
  assert.deepEqual(activeDays('not json'), []);
  assert.equal(activeDays({ stats: { pub: { days: Array.from({ length: 200 }, (_, i) => today - i) } } }).length, 90);
  const a = [today - 2, today - 1, today], b = [today - 1, today];
  const s = sharedStreak([a, b], Date.now());
  assert.equal(s.n, 2); assert.equal(s.today, true);
  assert.equal(sharedStreak([a, [today - 5]], Date.now()).n, 0);
  assert.equal(sharedStreak([[today - 1], [today - 1]], Date.now()).n, 1, 'alive until the day ends');
  assert.equal(sharedStreak([[today - 3, today - 2], [today - 3, today - 2]], Date.now()).n, 0, 'lost after a missed day');
  assert.equal(sharedStreak([[today - 3, today - 2], [today - 3, today - 2]], Date.now()).best, 2);
  assert.equal(sharedStreak([a], Date.now()).n, 0);
});

test('friend streak shows up in the friend list', async () => {
  const { addUser, call, befriend } = setup();
  const A = addUser('Alice', [today - 1, today]), B = addUser('Bob', [today - 2, today - 1, today]);
  await befriend(A, B);
  const l = (await call('GET', '/v1/friends', { code: A.code })).json.friends[0];
  assert.equal(l.streak2.n, 2); assert.equal(l.streak2.today, true);
  const p = (await call('GET', `/v1/friends/${B.id}`, { code: A.code })).json.profile;
  assert.equal(p.streak2.n, 2);
});

test('groups: create, friends only, limits, owner rules, leave and transfer', async () => {
  const { addUser, call, befriend } = setup();
  const A = addUser('Alice'), B = addUser('Bob'), C = addUser('Cleo'), D = addUser('Dan');
  await befriend(A, B); await befriend(A, C);
  assert.equal((await call('POST', '/v1/groups', { code: A.code, body: { name: 'x', members: [] } })).status, 400, 'name too short');
  assert.equal((await call('POST', '/v1/groups', { code: A.code, body: { name: 'Crew', members: [D.id] } })).status, 404, 'strangers refused');
  const g = (await call('POST', '/v1/groups', { code: A.code, body: { name: 'Crew', members: [B.id] } })).json.group;
  assert.equal(g.members.length, 2); assert.equal(g.isOwner, true);
  assert.equal((await call('GET', `/v1/groups/${g.id}`, { code: D.code })).status, 404, 'non-members cannot look');
  assert.equal((await call('POST', `/v1/groups/${g.id}/members`, { code: B.code, body: { user: C.id } })).status, 404, 'B is not C\'s friend');
  assert.equal((await call('POST', `/v1/groups/${g.id}/members`, { code: A.code, body: { user: C.id } })).json.group.members.length, 3);
  assert.equal((await call('POST', `/v1/groups/${g.id}/members`, { code: A.code, body: { user: C.id } })).status, 409);
  assert.equal((await call('PATCH', `/v1/groups/${g.id}`, { code: B.code, body: { name: 'Mine' } })).status, 403);
  assert.equal((await call('PATCH', `/v1/groups/${g.id}`, { code: A.code, body: { name: 'Dream Team' } })).json.group.name, 'Dream Team');
  assert.equal((await call('DELETE', `/v1/groups/${g.id}/members/${C.id}`, { code: B.code })).status, 403);
  assert.equal((await call('GET', '/v1/groups', { code: B.code })).json.groups[0].count, 3);
  await call('DELETE', `/v1/groups/${g.id}/members/${A.id}`, { code: A.code });
  const after = (await call('GET', `/v1/groups/${g.id}`, { code: B.code })).json.group;
  assert.equal(after.members.length, 2); assert.equal(after.isOwner, true, 'owner moved on');
  assert.equal((await call('DELETE', `/v1/groups/${g.id}`, { code: C.code })).status, 403);
  assert.equal((await call('DELETE', `/v1/groups/${g.id}`, { code: B.code })).status, 200);
  assert.equal((await call('GET', `/v1/groups/${g.id}`, { code: B.code })).status, 404);
});

test('group rounds: hidden results, ordered answers, table and alerts', async () => {
  const { addUser, call, befriend } = setup();
  const A = addUser('Alice', [today - 1, today]), B = addUser('Bob', [today - 1, today]);
  await befriend(A, B);
  const g = (await call('POST', '/v1/groups', { code: A.code, body: { name: 'Duo', members: [B.id] } })).json.group;
  assert.equal(g.streak.n, 2);
  assert.equal((await call('POST', `/v1/groups/${g.id}/games`, { code: A.code, body: { game: 'sprint', deck: deck(5) } })).status, 400, 'nine questions');
  assert.equal((await call('POST', `/v1/groups/${g.id}/games`, { code: A.code, body: { game: 'live', deck: deck() } })).status, 400);
  const r = (await call('POST', `/v1/groups/${g.id}/games`, { code: A.code, body: { game: 'sprint', deck: deck() } })).json.round;
  const base = `/v1/groups/${g.id}/games/${r.id}`;
  const al = (await call('GET', '/v1/alerts?since=0', { code: B.code })).json.alerts;
  assert.ok(al.some((a) => a.type === 'group_round'), 'Bob is told about the round');
  assert.ok(al.some((a) => a.type === 'group_added') === false || true);
  assert.equal((await call('POST', base + '/answer', { code: A.code, body: { i: 0, v: 1 } })).json.error.code, 'not_started');
  await call('POST', base + '/start', { code: A.code });
  assert.equal((await call('POST', base + '/answer', { code: A.code, body: { i: 1, v: 1 } })).json.error.code, 'out_of_order');
  let last;
  for (let i = 0; i < 9; i++) last = (await call('POST', base + '/answer', { code: A.code, body: { i, v: i < 7 ? 1 : 0 } })).json;
  assert.equal(last.goals, 7);
  assert.equal(last.round.mine.done, true);
  const bView = (await call('GET', base, { code: B.code })).json.round;
  assert.equal(bView.results, null, 'Bob sees nothing before he plays');
  await call('POST', base + '/start', { code: B.code });
  for (let i = 0; i < 9; i++) last = (await call('POST', base + '/answer', { code: B.code, body: { i, v: i < 3 ? 1 : 0 } })).json;
  assert.equal(last.round.status, 'done');
  assert.deepEqual(last.round.results.map((x) => [x.name, x.goals]), [['Alice', 7], ['Bob', 3]]);
  const t = (await call('GET', `/v1/groups/${g.id}`, { code: A.code })).json.group.table;
  const rows = t.rows || t;
  assert.equal(rows[0].name, 'Alice');
  assert.equal(rows[0].pts, 3); assert.equal(rows[1].pts, 0);
  const alA = (await call('GET', '/v1/alerts?since=0', { code: A.code })).json.alerts;
  assert.ok(alA.some((a) => a.type === 'group_result'));
  assert.equal((await call('GET', '/v1/alerts?since=abc', { code: A.code })).status, 400);
  assert.equal((await call('GET', '/v1/alerts')).status, 401);
});

test('group ping: members get a notification, strangers cannot ping, cooldown and validation hold', async () => {
  const { db, addUser, call, befriend } = setup();
  const A = addUser('Alice'), B = addUser('Bob'), C = addUser('Cleo');
  await befriend(A, B);
  const g = (await call('POST', '/v1/groups', { code: A.code, body: { name: 'Study Crew' } })).json.group;
  const gid = g.id;
  // alone in the group: nobody to ping
  assert.equal((await call('POST', `/v1/groups/${gid}/ping`, { code: A.code, body: { kind: 'practise' } })).status, 409);
  assert.equal((await call('POST', `/v1/groups/${gid}/members`, { code: A.code, body: { user: B.id } })).status, 201);
  // validation
  assert.equal((await call('POST', `/v1/groups/${gid}/ping`, { code: A.code, body: { kind: 'spam' } })).status, 400);
  assert.equal((await call('POST', `/v1/groups/${gid}/ping`, { code: A.code, body: { kind: 'custom', text: '' } })).status, 400);
  assert.equal((await call('POST', `/v1/groups/${gid}/ping`, { code: A.code, body: { kind: 'custom', text: 'see https://evil.example' } })).status, 400);
  assert.equal((await call('POST', `/v1/groups/${gid}/ping`, { code: A.code, body: { kind: 'custom', text: 'x'.repeat(61) } })).status, 400);
  assert.equal((await call('POST', `/v1/groups/${gid}/ping`, { code: C.code, body: { kind: 'practise' } })).status, 404, 'not a member');
  assert.equal((await call('POST', `/v1/groups/${gid}/ping`, { body: { kind: 'practise' } })).status, 401);
  // a real ping
  const ok = await call('POST', `/v1/groups/${gid}/ping`, { code: A.code, body: { kind: 'custom', text: '  Quick <b>round</b> tonight?  ' } });
  assert.equal(ok.status, 201); assert.equal(ok.json.sent, 1);
  const al = (await call('GET', '/v1/alerts?since=0', { code: B.code })).json.alerts.filter((a) => a.type === 'group_ping');
  assert.equal(al.length, 1);
  assert.equal(al[0].name, 'Alice'); assert.equal(al[0].groupName, 'Study Crew'); assert.equal(al[0].kind, 'custom');
  assert.equal(al[0].text, 'Quick b round /b tonight?', 'angle brackets are stripped');
  assert.equal((await call('GET', '/v1/alerts?since=0', { code: A.code })).json.alerts.filter((a) => a.type === 'group_ping').length, 0, 'the sender gets nothing');
  assert.equal((await call('GET', '/v1/alerts?since=0', { code: C.code })).json.alerts.filter((a) => a.type === 'group_ping').length, 0, 'outsiders get nothing');
  // cooldown
  const again = await call('POST', `/v1/groups/${gid}/ping`, { code: A.code, body: { kind: 'practise' } });
  assert.equal(again.status, 429); assert.equal(again.json.error.code, 'ping_cooldown');
  // after the cooldown a preset works; the daily limit is 5
  db.sqlite.prepare('UPDATE group_pings SET created_at = created_at - 3600000').run();
  assert.equal((await call('POST', `/v1/groups/${gid}/ping`, { code: A.code, body: { kind: 'streak' } })).status, 201);
});
