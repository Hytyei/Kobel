import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleSync } from '../src/sync.js';
import { createTestDb } from './d1-adapter.mjs';

const card = (over = {}) => ({
  id: 'w1', type: 'w', lesson: 'Session 1', date: '2026-10-01', u: 1000, created: 900,
  de: 'Hund', art: 'der', pl: '-e', forms: '', en: 'dog', ex: '', exEn: '', note: '', sentence: '', topic: '', hint: '',
  due: 0, iv: 0, ease: 2.5, reps: 0, lapses: 0, seen: 0, ok: 0, bad: 0, susp: 0, bury: 0, ...over,
});
function setup() {
  const db = createTestDb();
  db.sqlite.prepare('INSERT INTO users (name, token_hash, created_at) VALUES (?, ?, ?)').run('A', 'h', 1);
  const user = { id: 1, name: 'A' };
  const maxSynced = () => db.sqlite.prepare('SELECT MAX(synced_at) AS m FROM cards').get().m;
  return { db, user, maxSynced };
}

test('same millisecond: a tombstone written right after a pull is still delivered', async () => {
  const { db, user } = setup();
  const T = 1_800_000_000_000;
  await handleSync(db, user, { cards: [card()] }, T - 5);
  const first = await handleSync(db, user, { since: 0 }, T); // pull only
  assert.equal(first.cards.length, 1);
  // another device deletes the card in the very same millisecond, without sending a cursor
  await handleSync(db, user, { deleted: [{ id: 'w1', k: 'c', u: 5000 }] }, T);
  const later = await handleSync(db, user, { since: first.serverTime }, T + 1);
  assert.deepEqual(later.deleted, [{ id: 'w1', k: 'c' }]);
});

test('writes are stamped strictly after the cursor and share one timestamp', async () => {
  const { db, user } = setup();
  const T = 1_800_000_000_000;
  const r = await handleSync(db, user, { since: T - 1, cards: [card(), card({ id: 'w2' })], rules: [{ id: 'r1', topic: 't', lesson: 'l', text: 'x', u: 10 }] }, T);
  assert.equal(r.serverTime, T);
  const rows = db.sqlite.prepare('SELECT DISTINCT synced_at FROM cards UNION SELECT DISTINCT synced_at FROM rules').all();
  assert.deepEqual(rows.map((x) => x.synced_at), [T]);
  const next = await handleSync(db, user, { since: r.serverTime }, T + 10);
  assert.equal(next.cards.length, 0);
});

test('a future since cannot create future timestamps or a future cursor, and does not hide changes', async () => {
  const { db, user, maxSynced } = setup();
  const T = 1_800_000_000_000, FUTURE = 4_000_000_000_000;
  const w = await handleSync(db, user, { since: FUTURE, cards: [card()] }, T);
  assert.ok(w.serverTime <= T, `serverTime ${w.serverTime}`);
  assert.ok(maxSynced() <= T, 'no future synced_at');
  assert.equal(w.cards.length, 1, 'the pull still returns changes (cursor was clamped)');
  const pull = await handleSync(db, user, { since: FUTURE }, T);
  assert.ok(pull.serverTime <= T);
  // the client stores the returned cursor; the next normal sync sees a later change
  await handleSync(db, user, { cards: [card({ id: 'w2', u: 2000 })] }, T + 5);
  const after = await handleSync(db, user, { since: w.serverTime }, T + 6);
  assert.ok(after.cards.some((c) => c.id === 'w2'));
});

test('no writes: serverTime never moves backwards for a normal cursor', async () => {
  const { db, user } = setup();
  const T = 1_800_000_000_000;
  const r = await handleSync(db, user, { since: T - 100 }, T);
  assert.ok(r.serverTime >= T - 100 && r.serverTime <= T);
});
