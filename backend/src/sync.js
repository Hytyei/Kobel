// Sync logic: "last write wins" per card/rule, plus one profile document per user.
import { validateSyncBody } from './validate.js';

const CARD_COLS = [
  'type', 'lesson', 'lesson_date', 'de', 'art', 'pl', 'forms', 'en', 'ex', 'ex_en', 'note', 'sentence', 'topic', 'hint',
  'created_at', 'due', 'iv', 'ease', 'reps', 'lapses', 'seen', 'ok', 'bad', 'susp', 'bury', 'updated_at',
];

const UPSERT_CARD = `
INSERT INTO cards (user_id, id, ${CARD_COLS.join(', ')}, synced_at, deleted)
VALUES (?, ?, ${CARD_COLS.map(() => '?').join(', ')}, ?, 0)
ON CONFLICT (user_id, id) DO UPDATE SET
  ${CARD_COLS.map((c) => `${c} = excluded.${c}`).join(', ')}, synced_at = excluded.synced_at, deleted = 0
WHERE excluded.updated_at >= cards.updated_at`;

const DELETE_CARD = `
INSERT INTO cards (user_id, id, type, lesson, updated_at, synced_at, deleted)
VALUES (?, ?, 'w', '', ?, ?, 1)
ON CONFLICT (user_id, id) DO UPDATE SET deleted = 1, updated_at = excluded.updated_at, synced_at = excluded.synced_at
WHERE excluded.updated_at >= cards.updated_at`;

const UPSERT_RULE = `
INSERT INTO rules (user_id, id, topic, lesson, text, updated_at, synced_at, deleted)
VALUES (?, ?, ?, ?, ?, ?, ?, 0)
ON CONFLICT (user_id, id) DO UPDATE SET
  topic = excluded.topic, lesson = excluded.lesson, text = excluded.text,
  updated_at = excluded.updated_at, synced_at = excluded.synced_at, deleted = 0
WHERE excluded.updated_at >= rules.updated_at`;

const DELETE_RULE = `
INSERT INTO rules (user_id, id, updated_at, synced_at, deleted)
VALUES (?, ?, ?, ?, 1)
ON CONFLICT (user_id, id) DO UPDATE SET deleted = 1, updated_at = excluded.updated_at, synced_at = excluded.synced_at
WHERE excluded.updated_at >= rules.updated_at`;

const UPSERT_PROFILE = `
INSERT INTO profiles (user_id, data, updated_at, synced_at) VALUES (?, ?, ?, ?)
ON CONFLICT (user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at, synced_at = excluded.synced_at
WHERE excluded.updated_at >= profiles.updated_at`;

const PULL_LIMIT = 1000;

export const cardToWire = (r) => ({
  id: r.id, type: r.type, lesson: r.lesson, date: r.lesson_date, u: r.updated_at, created: r.created_at,
  de: r.de, art: r.art, pl: r.pl, forms: r.forms, en: r.en, ex: r.ex, exEn: r.ex_en, note: r.note,
  sentence: r.sentence, topic: r.topic, hint: r.hint,
  due: r.due, iv: r.iv, ease: r.ease, reps: r.reps, lapses: r.lapses, seen: r.seen, ok: r.ok, bad: r.bad,
  susp: r.susp, bury: r.bury,
});
export const ruleToWire = (r) => ({ id: r.id, topic: r.topic, lesson: r.lesson, text: r.text, u: r.updated_at });

export async function handleSync(db, user, rawBody, now = Date.now()) {
  const body = validateSyncBody(rawBody);
  const uid = user.id;
  const since = body.since;
  const hasWrites = body.cards.length > 0 || body.rules.length > 0 || body.deleted.length > 0 || Boolean(body.profile);
  // One timestamp for every write in this request. Reads use `synced_at > since`, so a write must be stamped strictly
  // after the client's cursor (since + 1), otherwise a write in the same millisecond as the last serverTime is never pulled.
  // A pull without writes hands out a cursor too, and a later write (maybe from another device that sends no `since`) can land in
  // the same millisecond, so that cursor stays one millisecond behind `now` (and never behind `since`).
  const syncAt = hasWrites ? Math.max(now, since + 1) : Math.max(now - 1, since);

  // 1) write what the client sent
  const writes = [];
  for (const c of body.cards) writes.push(db.prepare(UPSERT_CARD).bind(uid, c.id, ...CARD_COLS.map((k) => c[k]), syncAt));
  for (const r of body.rules) writes.push(db.prepare(UPSERT_RULE).bind(uid, r.id, r.topic, r.lesson, r.text, r.updated_at, syncAt));
  for (const d of body.deleted) {
    writes.push((d.k === 'c' ? db.prepare(DELETE_CARD) : db.prepare(DELETE_RULE)).bind(uid, d.id, d.updated_at, syncAt));
  }
  if (body.profile) writes.push(db.prepare(UPSERT_PROFILE).bind(uid, body.profile.data, body.profile.updated_at, syncAt));
  if (writes.length) await db.batch(writes);

  // 2) read what changed on the server since the client's cursor (uses the (user_id, synced_at) indexes)
  const [cards, delCards, rules, delRules, profile] = await db.batch([
    db.prepare('SELECT * FROM cards WHERE user_id = ? AND synced_at > ? AND deleted = 0 ORDER BY synced_at LIMIT ?').bind(uid, since, PULL_LIMIT),
    db.prepare('SELECT id FROM cards WHERE user_id = ? AND synced_at > ? AND deleted = 1 LIMIT ?').bind(uid, since, PULL_LIMIT),
    db.prepare('SELECT * FROM rules WHERE user_id = ? AND synced_at > ? AND deleted = 0 ORDER BY synced_at LIMIT ?').bind(uid, since, PULL_LIMIT),
    db.prepare('SELECT id FROM rules WHERE user_id = ? AND synced_at > ? AND deleted = 1 LIMIT ?').bind(uid, since, PULL_LIMIT),
    db.prepare('SELECT data, updated_at FROM profiles WHERE user_id = ? AND synced_at > ?').bind(uid, since),
  ]);

  const p = profile.results[0];
  return {
    serverTime: syncAt,
    cards: cards.results.map(cardToWire),
    rules: rules.results.map(ruleToWire),
    deleted: [
      ...delCards.results.map((r) => ({ id: r.id, k: 'c' })),
      ...delRules.results.map((r) => ({ id: r.id, k: 'r' })),
    ],
    profile: p ? { u: p.updated_at, data: JSON.parse(p.data) } : null,
  };
}

export async function exportAll(db, user, now = Date.now()) {
  const uid = user.id;
  const [cards, rules, profile] = await db.batch([
    db.prepare('SELECT * FROM cards WHERE user_id = ? AND deleted = 0 ORDER BY lesson_date, lesson, rowid').bind(uid),
    db.prepare('SELECT * FROM rules WHERE user_id = ? AND deleted = 0 ORDER BY rowid').bind(uid),
    db.prepare('SELECT data, updated_at FROM profiles WHERE user_id = ?').bind(uid),
  ]);
  const p = profile.results[0];
  return {
    exportedAt: now,
    user: { name: user.name },
    cards: cards.results.map(cardToWire),
    rules: rules.results.map(ruleToWire),
    profile: p ? { u: p.updated_at, data: JSON.parse(p.data) } : null,
  };
}

export async function deleteAll(db, user) {
  await db.batch([
    db.prepare('DELETE FROM cards WHERE user_id = ?').bind(user.id),
    db.prepare('DELETE FROM rules WHERE user_id = ?').bind(user.id),
    db.prepare('DELETE FROM profiles WHERE user_id = ?').bind(user.id),
  ]);
}
