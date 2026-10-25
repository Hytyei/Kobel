// Creates a user and prints their access code ONCE.
// Usage:  node scripts/create-user.mjs "Hadi" --local     (local test database)
//         node scripts/create-user.mjs "Hadi" --remote    (your real Cloudflare database)
// The code is random (about 190 bits). Only its SHA-256 hash is stored in the database.
import { randomBytes, createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const name = args.find((a) => !a.startsWith('--'));
const target = args.includes('--remote') ? '--remote' : args.includes('--local') ? '--local' : null;
if (!name || !target || name.length > 40 || /['"\\;]/.test(name)) {
  console.error('Usage: node scripts/create-user.mjs "Name" --local|--remote   (name: 1-40 characters, no quotes or semicolons)');
  process.exit(1);
}
// Kobel ID: KB-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX (25 characters from a 32-letter alphabet without 0/O/1/I = 125 bits, easy to read and type)
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const pick = () => ALPHABET[randomBytes(1)[0] & 31];
const code = 'KB-' + Array.from({ length: 5 }, () => Array.from({ length: 5 }, pick).join('')).join('-');
const hash = createHash('sha256').update(code).digest('hex');
const sql = `INSERT INTO users (name, token_hash, created_at) VALUES ('${name}', '${hash}', ${Date.now()});`;
const r = spawnSync('npx', ['wrangler', 'd1', 'execute', 'kobel-db', target, '--command', sql], { stdio: 'inherit', shell: process.platform === 'win32' });
if (r.status !== 0) {
  console.error('\nCould not create the user. Did you apply the migrations first? (see docs/DEPLOYMENT.md)');
  process.exit(r.status || 1);
}
console.log(`\nUser "${name}" created.\n\nKOBEL ID (shown only once, copy it now):\n\n  ${code}\n\nEnter it in the app: first screen > "I already have an ID" (or Settings > Cloud sync). The same ID loads your data on any other phone.`);
