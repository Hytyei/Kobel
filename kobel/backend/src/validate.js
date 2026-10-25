// Server-side validation. The Android app is never trusted: every field is checked here.
import { HttpError } from './http.js';

const MAX_MS = 4102444800000; // year 2100
export const MAX_ITEMS_PER_REQUEST = 40; // keeps one request well under D1's 50-queries-per-invocation free limit

const bad = (field, msg) => new HttpError(400, 'invalid_request', `${field}: ${msg}`, field);

function str(v, field, max, { required = false } = {}) {
  if (v === undefined || v === null) v = '';
  if (typeof v !== 'string') throw bad(field, 'must be text');
  v = v.trim();
  if (required && !v) throw bad(field, 'is required');
  if (v.length > max) throw bad(field, `is too long (max ${max} characters)`);
  return v;
}
function int(v, field, min, max) {
  if (v === undefined || v === null) v = min;
  if (typeof v !== 'number' || !Number.isFinite(v) || Math.floor(v) !== v) throw bad(field, 'must be a whole number');
  if (v < min || v > max) throw bad(field, `must be between ${min} and ${max}`);
  return v;
}
function num(v, field, min, max) {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw bad(field, 'must be a number');
  if (v < min || v > max) throw bad(field, `must be between ${min} and ${max}`);
  return v;
}
function id(v, field) {
  if (typeof v !== 'string' || !/^[A-Za-z0-9_-]{1,40}$/.test(v)) throw bad(field, 'must be 1-40 letters, digits, - or _');
  return v;
}
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export function validateCard(c, i) {
  const f = (n) => `cards[${i}].${n}`;
  if (!isObject(c)) throw bad(`cards[${i}]`, 'must be an object');
  const type = c.type;
  if (type !== 'w' && type !== 'g') throw bad(f('type'), "must be 'w' or 'g'");
  const out = {
    id: id(c.id, f('id')),
    type,
    lesson: str(c.lesson, f('lesson'), 80, { required: true }),
    lesson_date: str(c.date, f('date'), 10),
    de: str(c.de, f('de'), 120),
    art: str(c.art, f('art'), 3),
    pl: str(c.pl, f('pl'), 60),
    forms: str(c.forms, f('forms'), 120),
    en: str(c.en, f('en'), 200),
    ex: str(c.ex, f('ex'), 300),
    ex_en: str(c.exEn, f('exEn'), 300),
    note: str(c.note, f('note'), 300),
    sentence: str(c.sentence, f('sentence'), 300),
    topic: str(c.topic, f('topic'), 80),
    hint: str(c.hint, f('hint'), 200),
    created_at: int(c.created ?? 0, f('created'), 0, MAX_MS),
    due: int(c.due ?? 0, f('due'), 0, MAX_MS),
    iv: int(c.iv ?? 0, f('iv'), 0, 36500),
    ease: num(c.ease ?? 2.5, f('ease'), 1, 4),
    reps: int(c.reps ?? 0, f('reps'), 0, 100000),
    lapses: int(c.lapses ?? 0, f('lapses'), 0, 100000),
    seen: int(c.seen ?? 0, f('seen'), 0, 1000000),
    ok: int(c.ok ?? 0, f('ok'), 0, 10000000),
    bad: int(c.bad ?? 0, f('bad'), 0, 10000000),
    susp: int(c.susp ?? 0, f('susp'), 0, 1),
    bury: int(c.bury ?? 0, f('bury'), 0, MAX_MS),
    updated_at: int(c.u, f('u'), 1, MAX_MS),
  };
  if (out.lesson_date && !/^\d{4}-\d{2}-\d{2}$/.test(out.lesson_date)) throw bad(f('date'), 'must look like 2026-09-30');
  if (!['', 'der', 'die', 'das'].includes(out.art)) throw bad(f('art'), "must be '', 'der', 'die' or 'das'");
  if (type === 'w') {
    if (!out.de) throw bad(f('de'), 'is required');
    if (!out.en) throw bad(f('en'), 'is required');
  } else if (!/\{\{.+?\}\}/.test(out.sentence)) {
    throw bad(f('sentence'), 'must contain a gap like {{word}}');
  }
  return out;
}

export function validateRule(r, i) {
  const f = (n) => `rules[${i}].${n}`;
  if (!isObject(r)) throw bad(`rules[${i}]`, 'must be an object');
  return {
    id: id(r.id, f('id')),
    topic: str(r.topic, f('topic'), 80, { required: true }),
    lesson: str(r.lesson, f('lesson'), 80),
    text: str(r.text, f('text'), 500, { required: true }),
    updated_at: int(r.u, f('u'), 1, MAX_MS),
  };
}

export function validateDeleted(d, i) {
  const f = (n) => `deleted[${i}].${n}`;
  if (!isObject(d)) throw bad(`deleted[${i}]`, 'must be an object');
  if (d.k !== 'c' && d.k !== 'r') throw bad(f('k'), "must be 'c' or 'r'");
  return { id: id(d.id, f('id')), k: d.k, updated_at: int(d.u, f('u'), 1, MAX_MS) };
}

export function validateProfile(p) {
  if (!isObject(p)) throw bad('profile', 'must be an object');
  const u = int(p.u, 'profile.u', 1, MAX_MS);
  const data = p.data;
  if (!isObject(data)) throw bad('profile.data', 'must be an object');
  for (const k of Object.keys(data)) {
    if (!['stats', 'games', 'settings'].includes(k)) throw bad('profile.data', `unknown key "${k}"`);
    if (!isObject(data[k])) throw bad(`profile.data.${k}`, 'must be an object');
  }
  const text = JSON.stringify(data);
  if (text.length > 200000) throw bad('profile.data', 'is too large');
  return { updated_at: u, data: text };
}

export function validateSyncBody(body) {
  if (!isObject(body)) throw bad('body', 'must be a JSON object');
  const since = int(body.since ?? 0, 'since', 0, MAX_MS);
  const arr = (v, name) => {
    if (v === undefined || v === null) return [];
    if (!Array.isArray(v)) throw bad(name, 'must be a list');
    return v;
  };
  const cards = arr(body.cards, 'cards');
  const rules = arr(body.rules, 'rules');
  const deleted = arr(body.deleted, 'deleted');
  if (cards.length + rules.length + deleted.length > MAX_ITEMS_PER_REQUEST) {
    throw new HttpError(413, 'too_many_items', `Send at most ${MAX_ITEMS_PER_REQUEST} changes per request.`);
  }
  return {
    since,
    cards: cards.map(validateCard),
    rules: rules.map(validateRule),
    deleted: deleted.map(validateDeleted),
    profile: body.profile ? validateProfile(body.profile) : null,
  };
}
