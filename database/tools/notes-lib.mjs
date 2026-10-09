// Kobel notes library: parses the class-notes text format and turns it into SQL for the append-only content tables.
// Pure JavaScript, no dependencies. Used by notes-to-sql.mjs and by the tests.

/** Fast 53-bit string hash. MUST stay identical to the app's h53: card keys depend on it (progress is stored by key). */
export function h53(s) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** Card key: 'w' + hash of "art de" (lower-case) for words, 'g' + hash of the gap sentence for grammar cards. */
export function cardKey(o) {
  return o.type === 'g'
    ? 'g' + h53(String(o.sentence || '').trim().toLowerCase())
    : 'w' + h53(((o.art ? o.art + ' ' : '') + String(o.de || '').trim()).toLowerCase());
}

/** Rule key: 'r' + hash of "topic|text" (lower-case). */
export function ruleKey(topic, text) {
  return 'r' + h53((topic + '|' + text).toLowerCase());
}

function splitArt(de) {
  const m = String(de).trim().match(/^(der|die|das)\s+(.+)$/i);
  return m ? { art: m[1].toLowerCase(), de: m[2].trim() } : { art: '', de: String(de).trim() };
}

/**
 * Parses notes text. One file = one lesson.
 * Returns { lesson: {heading, number, title} | null, cards: [...], rules: [...] }.
 * Cards come in file order; a card repeated in the same file is merged (later non-empty fields win).
 */
export function parseNotes(txt) {
  const out = { lesson: null, cards: [], rules: [] };
  let topic = null;
  const seenCards = new Map();
  const seenRules = new Set();
  for (const raw of String(txt).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('//')) continue;
    let m;
    if ((m = line.match(/^@lesson\s+(.+)$/i)) || (m = line.match(/^#+\s*(.+)$/))) {
      if (out.lesson) throw new Error(`Only one @lesson per file (found a second: "${m[1].trim()}"). Put each lesson in its own file.`);
      const heading = m[1].trim();
      const num = heading.match(/Session\s+(\d+)/i);
      const dot = heading.indexOf('·');
      out.lesson = { heading, number: num ? Number(num[1]) : null, title: (dot >= 0 ? heading.slice(dot + 1) : heading).trim() };
      topic = null;
      continue;
    }
    if (/^@date\b/i.test(line)) continue; // dates are not used any more; tolerated and ignored
    if ((m = line.match(/^@grammar\s*(.*)$/i))) { topic = (m[1] || 'Grammar').trim(); continue; }
    if (/^@(words|vocab)/i.test(line)) { topic = null; continue; }
    if (line[0] === '!') {
      const rm = line.match(/^!+\s*(?:\{(r[a-z0-9]{3,20})\}\s*)?(.*)$/);
      const text = rm[2].trim();
      if (!text) continue;
      const t = topic || 'General';
      const key = rm[1] || ruleKey(t, text);
      if (!seenRules.has(key)) { seenRules.add(key); out.rules.push({ key, topic: t, text }); }
      continue;
    }
    if (topic !== null) {
      const p = line.split('|').map((s) => s.trim());
      if (!/\{\{.+?\}\}/.test(p[0])) continue;
      addCard({ type: 'g', sentence: p[0], en: p[1] || '', hint: p[2] || '', topic });
      continue;
    }
    let de, en, ex = '', exEn = '', note = '';
    if (line.includes('\t')) {
      const f = line.split('\t').map((s) => s.trim());
      de = f[0]; en = f[1]; ex = f[2] || ''; exEn = f[3] || '';
    } else {
      const p = line.split('|').map((s) => s.trim());
      const mm = p[0].match(/^(.+?)\s*(?:=|→|->)\s*(.+)$/);
      if (!mm) continue;
      de = mm[1]; en = mm[2]; ex = p[1] || ''; exEn = p[2] || ''; note = p[3] || '';
    }
    if (!de || !en) continue;
    let pl = '', forms = '';
    const pm = de.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
    if (pm && pm[1]) {
      de = pm[1].trim();
      const inner = pm[2].trim();
      const pp = inner.match(/^pl\.?\s*:?\s*(.*)$/i);
      if (pp) pl = pp[1].trim(); else forms = inner;
    }
    const a = splitArt(de);
    addCard({ type: 'w', de: a.de, art: a.art, pl, forms, en, ex, exEn, note, topic: '', sentence: '', hint: '' });
  }
  return out;

  function addCard(c) {
    c.key = cardKey(c);
    const prev = seenCards.get(c.key);
    if (prev) {
      for (const [k, v] of Object.entries(c)) if (v) prev[k] = v;
    } else {
      seenCards.set(c.key, c);
      out.cards.push(c);
    }
  }
}

const q = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(Math.trunc(v)) : "'" + String(v).replace(/'/g, "''") + "'");

const CARD_FIELDS = ['type', 'de', 'art', 'pl', 'forms', 'en', 'ex', 'ex_en', 'note', 'sentence', 'topic', 'hint'];
const cardVals = (c) => [c.type, c.de || '', c.art || '', c.pl || '', c.forms || '', c.en || '', c.ex || '', c.exEn || '', c.note || '', c.sentence || '', c.topic || '', c.hint || ''];

/**
 * Builds the SQL text for one lesson.
 *  opts: { course, number, title, releasedAt (ms), revise (bool) }
 * Normal mode: INSERT OR IGNORE of lesson + cards + rules (safe to run twice, never changes existing rows).
 * Revise mode: for every card/rule whose text differs from its latest revision, INSERT a new row with rev+1.
 *   Unchanged items are skipped, items that do not exist yet are added as rev 1.
 */
export function buildSql(parsed, opts) {
  const { course, number, revise = false } = opts;
  if (!course || !/^[a-z0-9-]+$/.test(course)) throw new Error('course must be lower-case letters, digits and dashes (e.g. momente-a1)');
  if (!Number.isInteger(number) || number < 1) throw new Error('number must be a whole number >= 1');
  const title = (opts.title || (parsed.lesson && parsed.lesson.title) || '').trim();
  if (!title) throw new Error('A lesson title is needed: add "@lesson Session N · Title" or pass --title');
  const releasedAt = opts.releasedAt ?? Date.now();
  const lessonId = `${course}-${number}`;
  const L = [];
  L.push(`-- Lesson ${number} of ${course}: ${title.replace(/[\r\n]/g, ' ')}`);
  L.push(`-- ${revise ? 'REVISION' : 'RELEASE'} generated by database/tools/notes-to-sql.mjs. ${revise ? 'Adds new revisions only; nothing is overwritten.' : 'Append-only: safe to run twice.'}`);
  L.push('');
  if (!revise) {
    L.push(`INSERT OR IGNORE INTO lessons (id, course_id, number, title, released_at) VALUES (${q(lessonId)}, ${q(course)}, ${number}, ${q(title)}, ${releasedAt});`);
    L.push('');
  }
  const cols = `card_key, lesson_id, rev, ${CARD_FIELDS.join(', ')}, sort, released_at`;
  parsed.cards.forEach((c, i) => {
    const k = cardKey(c);
    const vals = cardVals(c);
    if (!revise) {
      L.push(`INSERT OR IGNORE INTO content_cards (${cols}) VALUES (${q(k)}, ${q(lessonId)}, 1, ${vals.map(q).join(', ')}, ${i + 1}, ${releasedAt});`);
    } else {
      const latest = `(SELECT MAX(rev) FROM content_cards WHERE card_key = ${q(k)})`;
      const same = CARD_FIELDS.map((f, j) => `${f} IS ${q(vals[j])}`).join(' AND ');
      L.push(
        `INSERT INTO content_cards (${cols}) SELECT ${q(k)}, COALESCE((SELECT lesson_id FROM content_cards WHERE card_key = ${q(k)} AND rev = ${latest}), ${q(lessonId)}), COALESCE(${latest}, 0) + 1, ${vals.map(q).join(', ')}, ${i + 1}, ${releasedAt} ` +
          `WHERE EXISTS (SELECT 1 FROM lessons WHERE id = ${q(lessonId)}) AND NOT EXISTS (SELECT 1 FROM content_cards WHERE card_key = ${q(k)} AND rev = ${latest} AND ${same});`,
      );
    }
  });
  L.push('');
  const rcols = 'rule_key, lesson_id, rev, topic, text';
  for (const r of parsed.rules) {
    if (!revise) {
      L.push(`INSERT OR IGNORE INTO content_rules (${rcols}) VALUES (${q(r.key)}, ${q(lessonId)}, 1, ${q(r.topic)}, ${q(r.text)});`);
    } else {
      const latest = `(SELECT MAX(rev) FROM content_rules WHERE rule_key = ${q(r.key)})`;
      L.push(
        `INSERT INTO content_rules (${rcols}) SELECT ${q(r.key)}, COALESCE((SELECT lesson_id FROM content_rules WHERE rule_key = ${q(r.key)} AND rev = ${latest}), ${q(lessonId)}), COALESCE(${latest}, 0) + 1, ${q(r.topic)}, ${q(r.text)} ` +
          `WHERE EXISTS (SELECT 1 FROM lessons WHERE id = ${q(lessonId)}) AND NOT EXISTS (SELECT 1 FROM content_rules WHERE rule_key = ${q(r.key)} AND rev = ${latest} AND topic IS ${q(r.topic)} AND text IS ${q(r.text)});`,
      );
    }
  }
  L.push('');
  return L.join('\n');
}
