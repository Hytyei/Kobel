#!/usr/bin/env node
// Turns a class-notes file into a database migration.
//   node database/tools/notes-to-sql.mjs database/content/004-family.notes --course momente-a1 --number 4 --out database/migrations/0006_lesson_4.sql
// Options: --title "Family" (default: taken from the @lesson line)   --released-at 2026-10-08 (default: now)
//          --revise   (correction run: adds new revisions for changed cards, never overwrites)   --out file (default: print)
import { readFileSync, writeFileSync } from 'node:fs';
import { parseNotes, buildSql } from './notes-lib.mjs';

const args = process.argv.slice(2);
const flag = (n) => args.includes('--' + n);
const opt = (n) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };
const file = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--') && !['--revise'].includes(args[i - 1])));

function fail(msg) { console.error('Error: ' + msg); process.exit(1); }
if (!file || !opt('course')) fail('Usage: node notes-to-sql.mjs file.notes --course momente-a1 --number N [--out migrations/000X.sql] [--title "..."] [--released-at YYYY-MM-DD] [--revise]');

try {
  const parsed = parseNotes(readFileSync(file, 'utf8'));
  const number = Number(opt('number') ?? (parsed.lesson && parsed.lesson.number));
  const ra = opt('released-at');
  const releasedAt = ra ? Date.parse(ra + (ra.length === 10 ? 'T00:00:00Z' : '')) : Date.now();
  if (Number.isNaN(releasedAt)) fail('--released-at must look like 2026-10-08');
  const sql = buildSql(parsed, { course: opt('course'), number, title: opt('title'), releasedAt, revise: flag('revise') });
  const out = opt('out');
  if (out) {
    writeFileSync(out, sql);
    console.error(`${out}: ${parsed.cards.length} cards (${parsed.cards.filter((c) => c.type === 'g').length} grammar), ${parsed.rules.length} rules`);
  } else process.stdout.write(sql);
} catch (e) {
  fail(e.message);
}
