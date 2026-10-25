// Accounts: username + password, Google sign-in, per-device sessions, founder badge.
//
// Sessions: signing in returns a random session token (shown once, only its SHA-256 is stored). The app sends it as
// "Authorization: Bearer <token>" exactly like the old Kobel ID, so every other endpoint is unchanged. Old Kobel IDs
// (users.token_hash) keep working until the owner moves to a username or Google.
//
// Passwords: the phone stretches the password first (PBKDF2, 150k rounds, salt = "kobel|" + lowercase username) and
// sends only that 64 hex key. The Worker stores HMAC-SHA256(PASSWORD_PEPPER, salt + key). The pepper is a Worker secret,
// so a copy of the database alone cannot be used to guess passwords. (The heavy work is on the phone because the free
// Worker plan has a very small CPU budget per request.)
//
// Google: browser based OAuth with PKCE, finished by the Worker, handed to the app through kobel://auth.
import { HttpError } from './http.js';
import { sha256Hex, take } from './register.js';

const USERNAME_RE = /^[A-Za-z0-9][A-Za-z0-9_.]{2,19}$/;
const KEY_RE = /^[0-9a-f]{64}$/;
const HEX64 = /^[0-9a-f]{64}$/;
const RESERVED = new Set([
  'admin', 'administrator', 'root', 'kobel', 'support', 'staff', 'mod', 'moderator', 'system', 'official', 'team', 'help',
  'security', 'bot', 'null', 'undefined', 'claude', 'anthropic', 'founder', 'owner', 'creator', 'verified', 'kobelapp',
]);
const USERNAME_COOLDOWN_MS = 7 * 86400000;
const HANDOFF_TTL_MS = 2 * 60000;
const STATE_TTL_MS = 10 * 60000;
const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';

const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const randomToken = (prefix, n = 32) => prefix + b64url(crypto.getRandomValues(new Uint8Array(n)));
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const limitOf = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : d;
};

function same(a, b) {
  // constant-time comparison of two equal-length hex strings
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

async function hmacHex(secret, text) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text)));
}

function pepper(env) {
  if (!env.PASSWORD_PEPPER || String(env.PASSWORD_PEPPER).length < 16) {
    throw new HttpError(503, 'not_configured', 'Password sign-in is not set up on the server yet.');
  }
  return String(env.PASSWORD_PEPPER);
}

/** Who is calling, as a short-lived "caller" hash for limits (never stored as an IP). */
async function callerHash(env, request, scope, window) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  return (await sha256Hex(`kobel-auth|${scope}|${window}|${env.SIGNUP_SALT || ''}|${ip}`)).slice(0, 32);
}
const dayOf = (now) => new Date(now).toISOString().slice(0, 10);
const hourOf = (now) => new Date(now).toISOString().slice(0, 13);

async function limit(db, bucket, window, max, message) {
  if (!(await take(db, bucket, window, max))) throw new HttpError(429, 'rate_limited', message || 'Too many tries. Please wait a while and try again.');
}

export function userView(u) {
  return {
    id: u.id,
    name: u.name,
    username: u.username || null,
    badge: u.badge || null,
    visible: true,
    hasPassword: Boolean(u.pw_hash),
    google: u.google_sub ? maskEmail(u.email) : null,
    legacy: !u.username && !u.google_sub,
  };
}
function maskEmail(e) {
  if (!e) return 'linked';
  const [n, d] = String(e).split('@');
  return (n.length <= 2 ? n[0] + '*' : n.slice(0, 2) + '***') + '@' + (d || '');
}

export async function createSession(db, userId, label, now = Date.now()) {
  const token = randomToken('kbs_');
  await db
    .prepare('INSERT INTO sessions (token_hash, user_id, label, created_at, last_used) VALUES (?, ?, ?, ?, ?)')
    .bind(await sha256Hex(token), userId, String(label || '').slice(0, 40), now, now)
    .run();
  // keep at most 10 devices per account: the oldest sessions drop out
  await db
    .prepare('DELETE FROM sessions WHERE user_id = ?1 AND token_hash NOT IN (SELECT token_hash FROM sessions WHERE user_id = ?1 ORDER BY last_used DESC LIMIT 10)')
    .bind(userId)
    .run();
  return token;
}

/** Session lookup used by authenticate(): returns the user row (with the session hash) or null. */
export async function userBySession(db, tokenHash, now = Date.now()) {
  const row = await db
    .prepare('SELECT u.id AS id, u.name AS name, u.visible AS visible, u.username AS username, u.badge AS badge, u.pw_hash AS pw_hash, u.google_sub AS google_sub, u.email AS email, u.username_changed_at AS username_changed_at, s.last_used AS last_used FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?')
    .bind(tokenHash)
    .first();
  if (!row) return null;
  if (now - row.last_used > 3600000) await db.prepare('UPDATE sessions SET last_used = ? WHERE token_hash = ?').bind(now, tokenHash).run();
  return { ...row, sessionHash: tokenHash };
}

// ───────── usernames and the founder badge ─────────

async function founderProof(env, { email, founderKey }) {
  if (email && env.FOUNDER_EMAIL_SHA256 && same(await sha256Hex(String(email).toLowerCase()), String(env.FOUNDER_EMAIL_SHA256).toLowerCase())) return true;
  if (typeof founderKey === 'string' && founderKey && env.FOUNDER_KEY_SHA256 && same(await sha256Hex(founderKey), String(env.FOUNDER_KEY_SHA256).toLowerCase())) return true;
  return false;
}
const founderName = (env) => String(env.FOUNDER_USERNAME || 'Hytyei');
/** Names nobody may take as a plain display name (the founder name and the reserved list). */
export function reservedName(env, name) {
  const l = String(name || '').trim().toLowerCase();
  return l === founderName(env).toLowerCase() || RESERVED.has(l);
}

/**
 * Checks a username and returns what the account becomes: { username, badge }.
 * The founder name is reserved: only the owner can take it, proved by the linked Google email or the private founder key.
 */
export async function checkUsername(db, env, raw, { userId = 0, email = null, founderKey = null } = {}) {
  const username = typeof raw === 'string' ? raw.trim() : '';
  if (!USERNAME_RE.test(username)) {
    throw new HttpError(400, 'invalid_username', 'Use 3 to 20 letters, numbers, dots or underscores, starting with a letter or number.', 'username');
  }
  const lower = username.toLowerCase();
  let badge = null;
  if (lower === founderName(env).toLowerCase()) {
    if (!(await founderProof(env, { email, founderKey }))) throw new HttpError(403, 'reserved', 'That username is reserved.', 'username');
    badge = 'founder';
  } else if (RESERVED.has(lower)) {
    throw new HttpError(403, 'reserved', 'That username is reserved.', 'username');
  }
  const clash = await db
    .prepare('SELECT id, username FROM users WHERE (username = ?1 COLLATE NOCASE OR name = ?1 COLLATE NOCASE) AND id <> ?2')
    .bind(username, userId)
    .first();
  if (clash) {
    if (badge === 'founder' && !clash.username) {
      // the owner wins over an old display name: the other player just gets a generated name
      await db.prepare('UPDATE users SET name = ? WHERE id = ?').bind('Player-' + randomToken('', 4).replace(/[^A-Za-z0-9]/g, 'x').slice(0, 6), clash.id).run();
    } else {
      throw new HttpError(409, 'taken', 'That username is already taken.', 'username');
    }
  }
  return { username, badge };
}

export async function usernameAvailable(db, env, request, url, now = Date.now()) {
  await limit(db, 'uname:' + (await callerHash(env, request, 'uname', hourOf(now))), hourOf(now), limitOf(env.USERNAME_CHECK_HOURLY, 60));
  try {
    await checkUsername(db, env, url.searchParams.get('u') || '', { userId: -1 });
    return { available: true };
  } catch (e) {
    if (e instanceof HttpError && e.status < 500) return { available: false, reason: e.code };
    throw e;
  }
}

async function applyFounderByEmail(db, env, userId, email) {
  // the owner's Google account gets the reserved name and the badge by itself, when the account has no username yet
  if (!email || !(await founderProof(env, { email }))) return;
  const u = await db.prepare('SELECT username FROM users WHERE id = ?').bind(userId).first();
  if (!u || u.username) return;
  try {
    const r = await checkUsername(db, env, founderName(env), { userId, email });
    await db.prepare('UPDATE users SET username = ?, name = ?, badge = ?, username_changed_at = ? WHERE id = ?').bind(r.username, r.username, r.badge, Date.now(), userId).run();
  } catch {
    /* name unavailable: the owner can still claim it from the account screen */
  }
}

export async function setUsername(db, env, user, body, now = Date.now()) {
  if (!body || typeof body !== 'object') throw new HttpError(400, 'invalid_request', 'Body must be a JSON object.');
  if (user.username && now - (user.username_changed_at || 0) < USERNAME_COOLDOWN_MS && !(typeof body.founderKey === 'string' && body.founderKey)) {
    throw new HttpError(429, 'cooldown', 'You can change your username once a week.');
  }
  const r = await checkUsername(db, env, body.username, { userId: user.id, email: user.email, founderKey: body.founderKey });
  await db.prepare('UPDATE users SET username = ?, name = ?, badge = ?, username_changed_at = ? WHERE id = ?').bind(r.username, r.username, r.badge, now, user.id).run();
  const row = await db.prepare('SELECT id, name, username, badge, pw_hash, google_sub, email FROM users WHERE id = ?').bind(user.id).first();
  return { user: userView(row) };
}

// ───────── password sign-up and sign-in ─────────

async function checkKey(v, field) {
  if (typeof v !== 'string' || !KEY_RE.test(v)) throw new HttpError(400, 'invalid_password', 'Password could not be read.', field);
  return v;
}

export async function signup(db, env, request, body, now = Date.now()) {
  if (String(env.REGISTRATION_OPEN ?? 'true').toLowerCase() === 'false') throw new HttpError(403, 'registration_closed', 'New accounts are not being created right now.');
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'invalid_request', 'Body must be a JSON object.');
  const P = pepper(env);
  const key = await checkKey(body.password, 'password');
  const day = dayOf(now);
  await limit(db, 'su:' + (await callerHash(env, request, 'signup', day)), day, limitOf(env.REGISTER_PER_IP_DAILY, 10), 'Too many new accounts from this connection today. Try again tomorrow.');
  await limit(db, '*', day, limitOf(env.REGISTER_GLOBAL_DAILY, 200), 'Too many new accounts today. Try again tomorrow.');
  await db.prepare('DELETE FROM signups WHERE day < ?').bind(dayOf(now - 3 * 86400000)).run();
  const r = await checkUsername(db, env, body.username, { founderKey: body.founderKey });
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  const pw = await hmacHex(P, salt + key);
  const legacy = await sha256Hex(randomToken('', 32)); // nobody knows this value: accounts made here have no Kobel ID
  let id;
  try {
    const res = await db
      .prepare('INSERT INTO users (name, token_hash, created_at, visible, username, pw_salt, pw_hash, badge, username_changed_at) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?) RETURNING id')
      .bind(r.username, legacy, now, r.username, salt, pw, r.badge, now)
      .first();
    id = res.id;
  } catch (e) {
    if (/UNIQUE|constraint/i.test(String(e && e.message))) throw new HttpError(409, 'taken', 'That username is already taken.', 'username');
    throw e;
  }
  const token = await createSession(db, id, body.label, now);
  const row = await db.prepare('SELECT id, name, username, badge, pw_hash, google_sub, email FROM users WHERE id = ?').bind(id).first();
  return { token, user: userView(row) };
}

export async function login(db, env, request, body, now = Date.now()) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'invalid_request', 'Body must be a JSON object.');
  const P = pepper(env);
  const key = await checkKey(body.password, 'password');
  const uname = typeof body.username === 'string' ? body.username.trim() : '';
  if (!USERNAME_RE.test(uname)) throw new HttpError(401, 'invalid_credentials', 'Wrong username or password.');
  const hour = hourOf(now);
  await limit(db, 'li:' + (await callerHash(env, request, 'login', hour)), hour, limitOf(env.LOGIN_PER_IP_HOURLY, 40));
  const ub = 'lu:' + uname.toLowerCase();
  const seen = await db.prepare('SELECT n FROM signups WHERE bucket = ? AND day = ?').bind(ub, hour).first();
  if (seen && seen.n >= limitOf(env.LOGIN_FAILS_HOURLY, 8)) throw new HttpError(429, 'rate_limited', 'Too many wrong tries for this username. Try again in an hour.');
  const u = await db.prepare('SELECT id, name, username, badge, pw_salt, pw_hash, google_sub, email FROM users WHERE username = ? COLLATE NOCASE').bind(uname).first();
  const salt = u && u.pw_salt ? u.pw_salt : '00'.repeat(16);
  const calc = await hmacHex(P, salt + key); // always computed, so a missing user costs the same time
  if (!u || !u.pw_hash || !same(calc, u.pw_hash)) {
    await take(db, ub, hour, 1000);
    throw new HttpError(401, 'invalid_credentials', 'Wrong username or password.');
  }
  const token = await createSession(db, u.id, body.label, now);
  return { token, user: userView(u) };
}

export async function logout(db, user) {
  if (user.sessionHash) await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(user.sessionHash).run();
  return { ok: true };
}

export async function setPassword(db, env, user, body) {
  const P = pepper(env);
  if (!body || typeof body !== 'object') throw new HttpError(400, 'invalid_request', 'Body must be a JSON object.');
  if (!user.username) throw new HttpError(400, 'username_first', 'Choose a username first.');
  const key = await checkKey(body.password, 'password');
  const row = await db.prepare('SELECT pw_salt, pw_hash FROM users WHERE id = ?').bind(user.id).first();
  if (row && row.pw_hash) {
    const cur = await checkKey(body.current, 'current');
    if (!same(await hmacHex(P, row.pw_salt + cur), row.pw_hash)) throw new HttpError(403, 'wrong_password', 'The current password is not right.', 'current');
  }
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  await db.prepare('UPDATE users SET pw_salt = ?, pw_hash = ? WHERE id = ?').bind(salt, await hmacHex(P, salt + key), user.id).run();
  // other devices must sign in again after a password change
  await db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?').bind(user.id, user.sessionHash || '').run();
  return { ok: true };
}

export async function myAccount(db, user) {
  const row = await db.prepare('SELECT id, name, username, badge, pw_hash, google_sub, email FROM users WHERE id = ?').bind(user.id).first();
  return { user: userView(row) };
}

// ───────── Google ─────────

function googleReady(env) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) throw new HttpError(503, 'google_not_configured', 'Google sign-in is not set up on the server yet.');
}
const redirectUri = (request) => new URL(request.url).origin + '/v1/auth/google/callback';

export async function googleStart(db, env, request, body, user, now = Date.now()) {
  googleReady(env);
  if (!body || typeof body !== 'object') throw new HttpError(400, 'invalid_request', 'Body must be a JSON object.');
  const intent = body.intent === 'link' ? 'link' : 'signin';
  if (intent === 'link' && !user) throw new HttpError(401, 'unauthorized', 'Sign in before linking Google.');
  if (typeof body.challenge !== 'string' || !HEX64.test(body.challenge)) throw new HttpError(400, 'invalid_request', 'Missing challenge.', 'challenge');
  await limit(db, 'gs:' + (await callerHash(env, request, 'gstart', hourOf(now))), hourOf(now), limitOf(env.GOOGLE_START_HOURLY, 30));
  await db.prepare('DELETE FROM oauth_states WHERE created_at < ?').bind(now - STATE_TTL_MS).run();
  await db.prepare('DELETE FROM auth_handoffs WHERE created_at < ?').bind(now - HANDOFF_TTL_MS).run();
  const state = randomToken('', 24);
  const verifier = randomToken('', 32);
  const challenge = b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
  await db
    .prepare('INSERT INTO oauth_states (state_hash, verifier, challenge, intent, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(await sha256Hex(state), verifier, body.challenge, intent, user ? user.id : null, now)
    .run();
  const q = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID, redirect_uri: redirectUri(request), response_type: 'code', scope: 'openid email',
    state, code_challenge: challenge, code_challenge_method: 'S256', prompt: 'select_account',
  });
  return { url: GOOGLE_AUTH + '?' + q };
}

function page(title, text, href) {
  const safe = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const body = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>Kobel</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0a0a0a;color:#fff;font:16px system-ui,sans-serif;text-align:center;padding:24px}main{max-width:340px}h1{font-size:26px;margin:0 0 10px}p{opacity:.75;line-height:1.4}a{display:inline-block;margin-top:18px;background:#d20515;color:#fff;padding:14px 22px;text-decoration:none;font-weight:800;letter-spacing:.04em;text-transform:uppercase}</style></head>
<body><main><h1>${safe(title)}</h1><p>${safe(text)}</p><a href="${safe(href)}">Open Kobel</a></main><script>setTimeout(function(){location.href=${JSON.stringify(href)}},250)</script></body></html>`;
  return new Response(body, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' } });
}

function decodeIdToken(t) {
  try {
    const p = String(t).split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(escape(atob(p + '='.repeat((4 - (p.length % 4)) % 4)))));
  } catch {
    return null;
  }
}

export async function googleCallback(db, env, request, now = Date.now()) {
  const url = new URL(request.url);
  const fail = (m) => page('Sign-in did not finish', m, 'kobel://auth?error=failed');
  try {
    googleReady(env);
    const state = url.searchParams.get('state') || '', code = url.searchParams.get('code') || '';
    if (url.searchParams.get('error') || !state || !code) return fail('Google did not confirm the sign-in. Go back to the app and try again.');
    const sh = await sha256Hex(state);
    const st = await db.prepare('SELECT * FROM oauth_states WHERE state_hash = ?').bind(sh).first();
    await db.prepare('DELETE FROM oauth_states WHERE state_hash = ?').bind(sh).run();
    if (!st || now - st.created_at > STATE_TTL_MS) return fail('This sign-in link has expired. Go back to the app and try again.');
    const res = await fetch(GOOGLE_TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: redirectUri(request), grant_type: 'authorization_code', code_verifier: st.verifier }),
    });
    if (!res.ok) return fail('Google refused the sign-in. Go back to the app and try again.');
    const tok = await res.json();
    const c = decodeIdToken(tok.id_token);
    // the token comes straight from Google over TLS; its claims are still checked
    const okIss = c && (c.iss === 'https://accounts.google.com' || c.iss === 'accounts.google.com');
    if (!c || !okIss || c.aud !== env.GOOGLE_CLIENT_ID || !(c.exp * 1000 > now - 60000) || !c.sub || c.email_verified !== true || !c.email) {
      return fail('Your Google account could not be verified.');
    }
    const email = String(c.email).toLowerCase();
    let userId, isNew = 0, linked = 0;
    const owner = await db.prepare('SELECT id FROM users WHERE google_sub = ?').bind(String(c.sub)).first();
    if (st.intent === 'link') {
      if (owner && owner.id !== st.user_id) return fail('This Google account is already linked to another Kobel account.');
      await db.prepare('UPDATE users SET google_sub = ?, email = ? WHERE id = ?').bind(String(c.sub), email, st.user_id).run();
      userId = st.user_id; linked = 1;
    } else if (owner) {
      userId = owner.id;
      await db.prepare('UPDATE users SET email = ? WHERE id = ?').bind(email, userId).run();
    } else {
      if (String(env.REGISTRATION_OPEN ?? 'true').toLowerCase() === 'false') return fail('New accounts are not being created right now.');
      const day = dayOf(now);
      if (!(await take(db, '*', day, limitOf(env.REGISTER_GLOBAL_DAILY, 200)))) return fail('Too many new accounts today. Try again tomorrow.');
      const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      for (let i = 0; i < 6 && !userId; i++) {
        const name = 'Player-' + Array.from(crypto.getRandomValues(new Uint8Array(4)), (x) => alpha[x & 31]).join('');
        try {
          const r = await db
            .prepare('INSERT INTO users (name, token_hash, created_at, visible, google_sub, email) VALUES (?, ?, ?, 1, ?, ?) RETURNING id')
            .bind(name, await sha256Hex(randomToken('', 32)), now, String(c.sub), email)
            .first();
          userId = r.id; isNew = 1;
        } catch (e) {
          if (!/UNIQUE|constraint/i.test(String(e && e.message))) throw e;
        }
      }
      if (!userId) return fail('Could not create an account right now. Please try again.');
    }
    await applyFounderByEmail(db, env, userId, email);
    const handoff = randomToken('', 24);
    await db.prepare('INSERT INTO auth_handoffs (code_hash, challenge, user_id, is_new, linked, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(await sha256Hex(handoff), st.challenge, userId, isNew, linked, now).run();
    return page('Signed in', 'Returning to Kobel…', 'kobel://auth?code=' + encodeURIComponent(handoff));
  } catch (e) {
    if (e instanceof HttpError) return fail(e.message);
    return fail('Something went wrong. Go back to the app and try again.');
  }
}

export async function authExchange(db, env, body, now = Date.now()) {
  if (!body || typeof body !== 'object' || typeof body.code !== 'string' || typeof body.verifier !== 'string') throw new HttpError(400, 'invalid_request', 'Missing code.');
  const h = await sha256Hex(body.code);
  const row = await db.prepare('SELECT * FROM auth_handoffs WHERE code_hash = ?').bind(h).first();
  await db.prepare('DELETE FROM auth_handoffs WHERE code_hash = ?').bind(h).run(); // single use, also when the check below fails
  if (!row || now - row.created_at > HANDOFF_TTL_MS || !same(await sha256Hex(body.verifier), row.challenge)) {
    throw new HttpError(401, 'invalid_code', 'This sign-in code is not valid any more. Please try again.');
  }
  const token = await createSession(db, row.user_id, body.label, now);
  const u = await db.prepare('SELECT id, name, username, badge, pw_hash, google_sub, email FROM users WHERE id = ?').bind(row.user_id).first();
  return { token, user: userView(u), isNew: Boolean(row.is_new), linked: Boolean(row.linked) };
}

export async function unlinkGoogle(db, user) {
  const row = await db.prepare('SELECT username, pw_hash, google_sub FROM users WHERE id = ?').bind(user.id).first();
  if (!row || !row.google_sub) return { ok: true };
  if (!row.username || !row.pw_hash) throw new HttpError(409, 'only_sign_in', 'Set a username and password first, so you can still sign in.');
  await db.prepare('UPDATE users SET google_sub = NULL, email = NULL WHERE id = ?').bind(user.id).run();
  return { ok: true };
}
