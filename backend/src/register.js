// Anonymous account creation: POST /v1/register (no login needed; the only public write endpoint).
//
// What a caller gets: a new, empty, private account and its Kobel ID, shown exactly once.
// Only the SHA-256 hash of the ID is stored, so nobody (including the owner) can read it back.
// Every account has its own users.id; all cards, rules and progress are filtered by it, so accounts never see each other.
//
// Abuse protection (free tier, no extra services):
//   * per-caller limit per day   (REGISTER_PER_IP_DAILY, default 5)
//   * overall limit per day      (REGISTER_GLOBAL_DAILY, default 200)
//   * kill switch                (REGISTRATION_OPEN = "false" turns registration off without a redeploy of code)
//   * the caller is kept only as a salted hash per day, rows older than 3 days are deleted
//   * new accounts are hidden from the league table until the player opts in
import { HttpError } from './http.js';
import { reservedName } from './auth.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 characters: no 0/O/1/I
const NAME_RE = /^[\p{L}\p{N}][\p{L}\p{N} _.-]{0,22}[\p{L}\p{N}]$/u;

/** KB-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX: 25 random characters = 125 bits. 256 % 32 = 0, so there is no modulo bias. */
export function newKobelId() {
  const b = crypto.getRandomValues(new Uint8Array(25));
  const c = [...b].map((x) => ALPHABET[x & 31]);
  return 'KB-' + [0, 5, 10, 15, 20].map((i) => c.slice(i, i + 5).join('')).join('-');
}

export async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const limitOf = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : d;
};

/** Adds 1 to a counter unless it already reached `max`. Returns true if the caller may continue. */
export async function take(db, bucket, day, max) {
  const row = await db
    .prepare('INSERT INTO signups (bucket, day, n) VALUES (?, ?, 1) ON CONFLICT (bucket, day) DO UPDATE SET n = n + 1 WHERE n < ? RETURNING n')
    .bind(bucket, day, max)
    .first();
  return Boolean(row);
}

export async function register(db, env, request, body, now = Date.now()) {
  if (String(env.REGISTRATION_OPEN ?? 'true').toLowerCase() === 'false') {
    throw new HttpError(403, 'registration_closed', 'New accounts are not being created right now.');
  }
  if (body !== null && (typeof body !== 'object' || Array.isArray(body))) throw new HttpError(400, 'invalid_request', 'Body must be a JSON object.');
  const day = new Date(now).toISOString().slice(0, 10);

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const caller = (await sha256Hex(`kobel-signup|${day}|${env.SIGNUP_SALT || ''}|${ip}`)).slice(0, 32);
  if (!(await take(db, caller, day, limitOf(env.REGISTER_PER_IP_DAILY, 5)))) {
    throw new HttpError(429, 'rate_limited', 'Too many new accounts from this connection today. Try again tomorrow.');
  }
  if (!(await take(db, '*', day, limitOf(env.REGISTER_GLOBAL_DAILY, 200)))) {
    throw new HttpError(429, 'rate_limited', 'Too many new accounts today. Try again tomorrow.');
  }
  await db.prepare('DELETE FROM signups WHERE day < ?').bind(new Date(now - 3 * 86400000).toISOString().slice(0, 10)).run();

  // Requested name (optional). A taken or invalid name never blocks sign-up: a free one is generated instead.
  let wanted = body && typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
  if (!NAME_RE.test(wanted) || reservedName(env, wanted)) wanted = '';
  const suffix = () => Array.from(crypto.getRandomValues(new Uint8Array(4)), (x) => ALPHABET[x & 31]).join('');

  for (let attempt = 0; attempt < 6; attempt++) {
    const name = attempt === 0 && wanted ? wanted : (wanted ? wanted.slice(0, 19) + '-' : 'Player-') + suffix();
    const id = newKobelId();
    try {
      await db
        .prepare('INSERT INTO users (name, token_hash, created_at, visible) VALUES (?, ?, ?, 1)')
        .bind(name, await sha256Hex(id), now)
        .run();
      return { id, user: { name, visible: true } };
    } catch (e) {
      if (!/UNIQUE|constraint/i.test(String(e && e.message))) throw e; // only a name clash is retried
    }
  }
  throw new HttpError(503, 'try_again', 'Could not create an account right now. Please try again.');
}
