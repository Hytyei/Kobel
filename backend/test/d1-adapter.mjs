// A tiny stand-in for Cloudflare's D1 binding, built on Node's built-in SQLite.
// It lets the Worker code be tested on any computer without Cloudflare or npm packages.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const schemaPath = fileURLToPath(new URL('../../database/migrations/0001_init.sql', import.meta.url));

export function createTestDb() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  sqlite.exec(readFileSync(schemaPath, 'utf8'));
  let queries = 0;

  const stmt = (sql) => ({
    sql,
    params: [],
    bind(...p) {
      this.params = p;
      return this;
    },
    run() {
      queries++;
      sqlite.prepare(sql).run(...this.params);
      return { success: true };
    },
    first() {
      queries++;
      return Promise.resolve(sqlite.prepare(sql).get(...this.params) ?? null);
    },
    all() {
      queries++;
      return Promise.resolve({ results: sqlite.prepare(sql).all(...this.params).map((r) => ({ ...r })) });
    },
  });

  return {
    sqlite,
    get queries() { return queries; },
    prepare: stmt,
    async batch(statements) {
      sqlite.exec('BEGIN');
      try {
        const out = [];
        for (const s of statements) {
          queries++;
          const q = sqlite.prepare(s.sql);
          if (/^\s*(SELECT|WITH)/i.test(s.sql)) out.push({ results: q.all(...s.params).map((r) => ({ ...r })) });
          else { q.run(...s.params); out.push({ results: [] }); }
        }
        sqlite.exec('COMMIT');
        return out;
      } catch (e) {
        sqlite.exec('ROLLBACK');
        throw e;
      }
    },
  };
}
