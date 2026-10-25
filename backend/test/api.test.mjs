import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import worker from '../src/index.js';
import { createTestDb } from './d1-adapter.mjs';

const ORIGIN = 'https://appassets.androidplatform.net';

function setup() {
  const db = createTestDb();
  const env = { DB: db, ALLOWED_ORIGINS: ORIGIN };
  const addUser = (name) => {
    const code = 'kb_' + randomBytes(24).toString('base64url');
    db.sqlite
      .prepare('INSERT INTO users (name, token_hash, created_at) VALUES (?, ?, ?)')
      .run(name, createHash('sha256').update(code).digest('hex'), Date.now());
    return code;
  };
  const call = async (method, path, { code, body, headers } = {}) => {
    const res = await worker.fetch(
      new Request('https://api.test' + path, {
        method,
        headers: { ...(code ? { Authorization: 'Bearer ' + code } : {}), 'Content-Type': 'application/json', ...headers },
        body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
      }),
      env,
    );
    const text = await res.text();
    return { status: res.status, headers: res.headers, json: text ? JSON.parse(text) : null };
  };
  return { db, env, addUser, call };
}

const card = (over = {}) => ({
  id: 'w1', type: 'w', lesson: 'Session 1', date: '2026-10-01', u: 1000, created: 900,
  de: 'Hund', art: 'der', pl: '-e', forms: '', en: 'dog', ex: 'Der {{Hund}} schläft.', exEn: 'The dog sleeps.',
  note: '', sentence: '', topic: '', hint: '', due: 0, iv: 0, ease: 2.5, reps: 0, lapses: 0, seen: 0, ok: 0, bad: 0, susp: 0, bury: 0,
  ...over,
});

test('health is public, everything else needs a valid access code', async () => {
  const { call, addUser } = setup();
  assert.equal((await call('GET', '/v1/health')).status, 200);
  assert.equal((await call('POST', '/v1/sync', { body: {} })).status, 401);
  assert.equal((await call('POST', '/v1/sync', { code: 'kb_' + 'x'.repeat(30), body: {} })).status, 401);
  assert.equal((await call('POST', '/v1/sync', { code: 'short', body: {} })).status, 401);
  const code = addUser('Hadi');
  const me = await call('GET', '/v1/me', { code });
  assert.equal(me.status, 200);
  assert.equal(me.json.user.name, 'Hadi');
});

test('push then pull on a second device returns the same card', async () => {
  const { call, addUser } = setup();
  const code = addUser('A');
  const push = await call('POST', '/v1/sync', { code, body: { since: 0, cards: [card()] } });
  assert.equal(push.status, 200);
  const pull = await call('POST', '/v1/sync', { code, body: { since: 0 } });
  assert.equal(pull.json.cards.length, 1);
  assert.equal(pull.json.cards[0].de, 'Hund');
  assert.equal(pull.json.cards[0].exEn, 'The dog sleeps.');
  // a cursor after the last sync returns nothing new
  const again = await call('POST', '/v1/sync', { code, body: { since: pull.json.serverTime } });
  assert.equal(again.json.cards.length, 0);
});

test('last write wins: an older edit never overwrites a newer one', async () => {
  const { call, addUser } = setup();
  const code = addUser('A');
  await call('POST', '/v1/sync', { code, body: { cards: [card({ en: 'dog (new)', u: 2000 })] } });
  await call('POST', '/v1/sync', { code, body: { cards: [card({ en: 'stale edit', u: 1500 })] } });
  const pull = await call('POST', '/v1/sync', { code, body: { since: 0 } });
  assert.equal(pull.json.cards[0].en, 'dog (new)');
});

test('deleting a card leaves a tombstone other devices receive', async () => {
  const { call, addUser } = setup();
  const code = addUser('A');
  await call('POST', '/v1/sync', { code, body: { cards: [card()] } });
  const first = await call('POST', '/v1/sync', { code, body: { since: 0 } });
  await call('POST', '/v1/sync', { code, body: { deleted: [{ id: 'w1', k: 'c', u: 5000 }] } });
  const later = await call('POST', '/v1/sync', { code, body: { since: first.json.serverTime } });
  assert.deepEqual(later.json.deleted, [{ id: 'w1', k: 'c' }]);
  const full = await call('GET', '/v1/export', { code });
  assert.equal(full.json.cards.length, 0);
});

test("users can never see or change each other's data", async () => {
  const { call, addUser } = setup();
  const a = addUser('A');
  const b = addUser('B');
  await call('POST', '/v1/sync', { code: a, body: { cards: [card()] } });
  const pullB = await call('POST', '/v1/sync', { code: b, body: { since: 0 } });
  assert.equal(pullB.json.cards.length, 0);
  // B writes a card with the same id: it is B's own row, A's stays untouched
  await call('POST', '/v1/sync', { code: b, body: { cards: [card({ en: 'B version', u: 9000 })] } });
  const pullA = await call('GET', '/v1/export', { code: a });
  assert.equal(pullA.json.cards[0].en, 'dog');
  await call('DELETE', '/v1/data', { code: b });
  assert.equal((await call('GET', '/v1/export', { code: a })).json.cards.length, 1);
});

test('rules and the profile document sync too', async () => {
  const { call, addUser } = setup();
  const code = addUser('A');
  await call('POST', '/v1/sync', {
    code,
    body: {
      rules: [{ id: 'r1', topic: 'Akkusativ', lesson: 'S2', text: 'der → den', u: 10 }],
      profile: { u: 20, data: { stats: { xp: 120, streak: 3 }, games: { sprint: { best: 200 } }, settings: { goal: 60 } } },
    },
  });
  const pull = await call('POST', '/v1/sync', { code, body: { since: 0 } });
  assert.equal(pull.json.rules[0].text, 'der → den');
  assert.equal(pull.json.profile.data.stats.xp, 120);
});

test('invalid input is rejected with a clear 400', async () => {
  const { call, addUser } = setup();
  const code = addUser('A');
  const cases = [
    [{ cards: [card({ id: 'bad id!' })] }, 'cards[0].id'],
    [{ cards: [card({ type: 'x' })] }, 'cards[0].type'],
    [{ cards: [card({ de: '' })] }, 'cards[0].de'],
    [{ cards: [card({ art: 'ein' })] }, 'cards[0].art'],
    [{ cards: [card({ en: 'x'.repeat(500) })] }, 'cards[0].en'],
    [{ cards: [card({ ease: 99 })] }, 'cards[0].ease'],
    [{ cards: [card({ u: 'now' })] }, 'cards[0].u'],
    [{ cards: [card({ type: 'g', sentence: 'no gap here' })] }, 'cards[0].sentence'],
    [{ cards: 'nope' }, 'cards'],
    [{ deleted: [{ id: 'a', k: 'z', u: 1 }] }, 'deleted[0].k'],
    [{ profile: { u: 1, data: { evil: {} } } }, 'profile.data'],
  ];
  for (const [body, field] of cases) {
    const r = await call('POST', '/v1/sync', { code, body });
    assert.equal(r.status, 400, field);
    assert.equal(r.json.error.code, 'invalid_request');
    assert.ok(r.json.error.message.includes(field), `${field} in "${r.json.error.message}"`);
  }
  assert.equal((await call('POST', '/v1/sync', { code, body: '{not json' })).status, 400);
  const many = Array.from({ length: 41 }, (_, i) => card({ id: 'w' + i }));
  assert.equal((await call('POST', '/v1/sync', { code, body: { cards: many } })).status, 413);
});

test('SQL injection attempts are stored as plain text, never executed', async () => {
  const { call, addUser, db } = setup();
  const code = addUser('A');
  const evil = "'); DROP TABLE cards; --";
  const r = await call('POST', '/v1/sync', { code, body: { cards: [card({ en: evil })] } });
  assert.equal(r.status, 200);
  const full = await call('GET', '/v1/export', { code });
  assert.equal(full.json.cards[0].en, evil);
  assert.ok(db.sqlite.prepare("SELECT name FROM sqlite_master WHERE name='cards'").get());
});

test('one sync request stays well under the 50-queries free-tier limit', async () => {
  const { call, addUser, db } = setup();
  const code = addUser('A');
  const cards = Array.from({ length: 40 }, (_, i) => card({ id: 'w' + i, de: 'Wort' + i }));
  const before = db.queries;
  const r = await call('POST', '/v1/sync', { code, body: { cards } });
  assert.equal(r.status, 200);
  // 1 auth lookup + 40 upserts + 5 reads = 46 even if every batched statement were counted individually
  assert.ok(db.queries - before <= 50, `used ${db.queries - before} queries`);
});

test('CORS: only the app origin is allowed; unknown routes and methods are handled', async () => {
  const { call } = setup();
  const ok = await call('GET', '/v1/health', { headers: { Origin: ORIGIN } });
  assert.equal(ok.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  const evil = await call('GET', '/v1/health', { headers: { Origin: 'https://evil.example' } });
  assert.equal(evil.headers.get('Access-Control-Allow-Origin'), null);
  assert.equal((await call('GET', '/v1/nope')).status, 404);
  assert.equal((await call('PUT', '/v1/sync')).status, 405);
  const pre = await call('OPTIONS', '/v1/sync', { headers: { Origin: ORIGIN } });
  assert.equal(pre.status, 204);
});

test('GET /v1/leaderboard ranks players and marks me', async () => {
  const { call, addUser, db } = setup();
  const a = addUser('Hadi'), b = addUser('Sara');
  const today = new Date().toISOString().slice(0, 10);
  const put = (uid, xp) => db.sqlite.prepare('INSERT INTO profiles (user_id, data, updated_at, synced_at) VALUES (?,?,?,?)')
    .run(uid, JSON.stringify({ stats: { xp, streak: 3, last: today, days: { [today]: { xp } } } }), 1, 1);
  put(1, 50); put(2, 120);
  assert.equal((await call('GET', '/v1/leaderboard?range=week')).status, 401);
  const r = await call('GET', '/v1/leaderboard?range=week', { code: a });
  assert.equal(r.status, 200);
  assert.deepEqual(r.json.rows.map((x) => [x.name, x.points, x.isMe]), [['Sara', 120, false], ['Hadi', 50, true]]);
  assert.equal((await call('GET', '/v1/leaderboard?range=bogus', { code: b })).json.range, 'week');
});

test('PATCH /v1/me renames without touching data; names are unique', async () => {
  const { call, addUser, db } = setup();
  const a = addUser('Hadi'), b = addUser('Sara');
  await call('POST', '/v1/sync', { code: a, body: { since: 0, cards: [card()] } });
  assert.equal((await call('PATCH', '/v1/me', { code: a, body: { name: 'Maren' } })).json.user.name, 'Maren');
  assert.equal((await call('GET', '/v1/me', { code: a })).json.user.name, 'Maren');
  const exp = await call('GET', '/v1/export', { code: a });
  assert.equal(exp.json.cards.length, 1);
  assert.equal((await call('PATCH', '/v1/me', { code: b, body: { name: 'maren' } })).status, 409);
  assert.equal((await call('PATCH', '/v1/me', { code: b, body: { name: "x'; DROP TABLE users;--" } })).status, 400);
  assert.equal((await call('PATCH', '/v1/me', { code: b, body: { name: 'A' } })).status, 400);
  assert.equal((await call('PATCH', '/v1/me', { body: { name: 'Nope' } })).status, 401);
  assert.equal(db.sqlite.prepare('SELECT count(*) AS n FROM users').get().n, 2);
});

test('GET /v1/notices needs a code and returns newest first', async () => {
  const { call, addUser, db } = setup();
  const a = addUser('Hadi');
  db.sqlite.prepare("INSERT INTO notices (kind, title, body, created_at) VALUES ('update','Kobel 2.10','New!',1),('news','Hello','',2)").run();
  assert.equal((await call('GET', '/v1/notices')).status, 401);
  const r = await call('GET', '/v1/notices', { code: a });
  assert.deepEqual(r.json.notices.map((n) => n.title), ['Hello', 'Kobel 2.10']);
});

// ───────── anonymous accounts (POST /v1/register) ─────────
const IDRE = /^KB-[A-HJ-NP-Z2-9]{5}(-[A-HJ-NP-Z2-9]{5}){4}$/;
const regCall = (env, { ip = '1.1.1.1', body, headers } = {}) =>
  worker.fetch(new Request('https://api.test/v1/register', { method: 'POST', headers: { 'CF-Connecting-IP': ip, 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) }), env);

test('register creates an account whose ID works, and only the hash is stored', async () => {
  const { db, env, call } = setup();
  const res = await regCall(env, { body: { name: 'Hadi' } });
  assert.equal(res.status, 201);
  const j = await res.json();
  assert.match(j.id, IDRE);
  assert.equal(j.user.name, 'Hadi');
  assert.equal(j.user.visible, true);
  const me = await call('GET', '/v1/me', { code: j.id });
  assert.equal(me.status, 200);
  assert.equal(me.json.user.name, 'Hadi');
  const row = db.sqlite.prepare('SELECT token_hash, visible FROM users WHERE name = ?').get('Hadi');
  assert.equal(row.token_hash, createHash('sha256').update(j.id).digest('hex'));
  assert.equal(row.visible, 1);
  assert.equal(JSON.stringify(db.sqlite.prepare('SELECT * FROM users').all()).includes(j.id), false);
});

test('accounts are isolated: one user never sees another user\'s cards, export or leaderboard row', async () => {
  const { env, call } = setup();
  const a = await (await regCall(env, { ip: '2.2.2.2', body: { name: 'Anna' } })).json();
  const b = await (await regCall(env, { ip: '3.3.3.3', body: { name: 'Berk' } })).json();
  assert.notEqual(a.id, b.id);
  await call('POST', '/v1/sync', { code: a.id, body: { since: 0, cards: [card({ id: 'secret1', de: 'Geheimnis' })] } });
  const pullB = await call('POST', '/v1/sync', { code: b.id, body: { since: 0 } });
  assert.equal(pullB.json.cards.length, 0);
  assert.equal((await call('GET', '/v1/export', { code: b.id })).json.cards.length, 0);
  assert.equal((await call('GET', '/v1/export', { code: a.id })).json.cards.length, 1);
  // everybody is in every table: B sees A and B, and A can not opt out
  const lb = await call('GET', '/v1/leaderboard?range=all', { code: b.id });
  assert.deepEqual(lb.json.rows.map((r) => r.name).sort(), ['Anna', 'Berk']);
  const hide = await call('PATCH', '/v1/me', { code: a.id, body: { visible: false } });
  assert.equal(hide.status, 200);
  assert.equal(hide.json.user.visible, true, 'the visible switch no longer exists');
  assert.deepEqual((await call('GET', '/v1/leaderboard?range=all', { code: b.id })).json.rows.map((r) => r.name).sort(), ['Anna', 'Berk']);
  assert.equal((await call('GET', '/v1/me', { code: a.id })).json.user.visible, true);
});

test('register: missing, invalid or taken names never fail; a free name is generated', async () => {
  const { env } = setup();
  const none = await (await regCall(env, { ip: '4.4.4.1' })).json();
  assert.match(none.user.name, /^Player-[A-Z2-9]{4}$/);
  const bad = await (await regCall(env, { ip: '4.4.4.2', body: { name: '<script>' } })).json();
  assert.match(bad.user.name, /^Player-/);
  const one = await (await regCall(env, { ip: '4.4.4.3', body: { name: 'Sina' } })).json();
  const two = await (await regCall(env, { ip: '4.4.4.4', body: { name: 'sina' } })).json();
  assert.equal(one.user.name, 'Sina');
  assert.notEqual(two.user.name.toLowerCase(), 'sina');
  assert.match(two.user.name, /^sina-/);
});

test('register is rate limited per caller, per day overall, and can be switched off', async () => {
  const { env } = setup();
  env.REGISTER_PER_IP_DAILY = '2';
  assert.equal((await regCall(env, { ip: '9.9.9.9' })).status, 201);
  assert.equal((await regCall(env, { ip: '9.9.9.9' })).status, 201);
  const third = await regCall(env, { ip: '9.9.9.9' });
  assert.equal(third.status, 429);
  assert.equal((await third.json()).error.code, 'rate_limited');
  assert.equal((await regCall(env, { ip: '8.8.8.8' })).status, 201); // another caller is unaffected
  env.REGISTER_GLOBAL_DAILY = '3';
  assert.equal((await regCall(env, { ip: '7.7.7.7' })).status, 429); // 3 accounts exist already today
  env.REGISTRATION_OPEN = 'false';
  assert.equal((await regCall(env, { ip: '6.6.6.6' })).status, 403);
});

test('register rejects bad bodies and does not weaken the other endpoints', async () => {
  const { env, call } = setup();
  assert.equal((await regCall(env, { ip: '5.5.5.1', body: [1] })).status, 400);
  const res = await worker.fetch(new Request('https://api.test/v1/register', { method: 'POST', headers: { 'CF-Connecting-IP': '5.5.5.2' }, body: '{nope' }), env);
  assert.equal(res.status, 400);
  const big = await worker.fetch(new Request('https://api.test/v1/register', { method: 'POST', headers: { 'CF-Connecting-IP': '5.5.5.3' }, body: JSON.stringify({ name: 'x'.repeat(2000) }) }), env);
  assert.equal(big.status, 413);
  assert.equal((await call('GET', '/v1/register')).status, 405);
  for (const p of ['/v1/sync', '/v1/export', '/v1/leaderboard', '/v1/notices']) assert.equal((await call(p === '/v1/sync' ? 'POST' : 'GET', p, { body: p === '/v1/sync' ? {} : undefined })).status, 401);
  assert.equal((await call('DELETE', '/v1/data')).status, 401);
});

test('register allows the app origin (CORS) and existing users keep working and stay visible', async () => {
  const { env, call, addUser } = setup();
  const pre = await worker.fetch(new Request('https://api.test/v1/register', { method: 'OPTIONS', headers: { Origin: ORIGIN } }), env);
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  const old = addUser('Veteran');
  assert.equal((await call('GET', '/v1/me', { code: old })).json.user.visible, true);
  await regCall(env, { ip: '1.2.3.4', body: { name: 'Neu' } });
  const lb = await call('GET', '/v1/leaderboard?range=all', { code: old });
  assert.deepEqual(lb.json.rows.map((r) => r.name).sort(), ['Neu', 'Veteran'], 'new accounts are in the table too');
});
