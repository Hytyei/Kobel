// Posts a notice that appears in every user's notification inbox.
// Usage: node scripts/post-notice.mjs "Title" "Message text" --remote [--kind update|news|tip]
//        (use --local to test against your local database)
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const flagVal = (n) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };
const target = args.includes('--remote') ? '--remote' : args.includes('--local') ? '--local' : null;
const pos = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1] === '--kind'));
const [title, body = ''] = pos;
const kind = flagVal('kind') || 'news';
if (!title || !target || !['news', 'update', 'tip'].includes(kind) || title.length > 80 || body.length > 1000) {
  console.error('Usage: node scripts/post-notice.mjs "Title (max 80)" "Message (max 1000)" --remote|--local [--kind news|update|tip]');
  process.exit(1);
}
const q = (t) => "'" + t.replaceAll("'", "''") + "'"; // SQL string literal: quotes doubled, so text can never become SQL
const sql = `INSERT INTO notices (kind, title, body, created_at) VALUES (${q(kind)}, ${q(title)}, ${q(body)}, ${Date.now()});`;
const r = spawnSync('npx', ['wrangler', 'd1', 'execute', 'kobel-db', target, '--command', sql], { stdio: 'inherit', shell: process.platform === 'win32' });
if (r.status !== 0) { console.error('Could not post the notice. Did you apply the migrations? (docs/GO_LIVE.md)'); process.exit(r.status || 1); }
console.log(`\nNotice posted (${kind}). It shows up in the app inbox the next time it syncs.`);
