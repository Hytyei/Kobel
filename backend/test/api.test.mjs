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
