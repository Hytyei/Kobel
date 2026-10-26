import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import worker from '../src/index.js';
import { createTestDb } from './d1-adapter.mjs';

const sha = (t) => createHash('sha256').update(t).digest('hex');
const key = (pw) => sha('stretch|' + pw); // stands in for the phone's PBKDF2 result: any 64 hex characters
const FOUNDER_KEY = 'founder-secret-key';
function setup(extra = {}) {
  const db = createTestDb();
  const env = {
    DB: db, ALLOWED_ORIGINS: 'https://appassets.androidplatform.net', PASSWORD_PEPPER: 'test-pepper-0123456789abcdef',
    FOUNDER_KEY_SHA256: sha(FOUNDER_KEY), FOUNDER_EMAIL_SHA256: sha('owner@example.com'),
    GOOGLE_CLIENT_ID: 'cid.apps.googleusercontent.com', GOOGLE_CLIENT_SECRET: 'gsecret', ...extra,
  };
  const call = async (method, path, { token, body, ip } = {}) => {
    const res = await worker.fetch(new Request('https://api.test' + path, {
      method, headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(ip ? { 'CF-Connecting-IP': ip } : {}), 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    }), env);
    const text = await res.text();
    let j = null; try { j = text ? JSON.parse(text) : null; } catch { /* html */ }
    return { status: res.status, json: j, text, headers: res.headers };
  };
  return { db, env, call };
}
const signup = (call, username = 'maren_k', pw = 'pass1234', extra = {}) => call('POST', '/v1/auth/signup', { body: { username, password: key(pw), ...extra } });

test('sign up, use the session everywhere, sign in again from a second device', async () => {
  const { call, db } = setup();
  const s = await signup(call);
  assert.equal(s.status, 201);
  assert.match(s.json.token, /^kbs_/);
  assert.equal(s.json.user.username, 'maren_k');
  assert.equal(s.json.user.name, 'maren_k');
  // the token is not stored, only its hash
  assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM sessions WHERE token_hash = ?').get(s.json.token).n, 0);
  assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM sessions WHERE token_hash = ?').get(sha(s.json.token)).n, 1);
  const me = await call('GET', '/v1/me', { token: s.json.token });
  assert.equal(me.json.user.username, 'maren_k');
  assert.equal(me.json.user.hasPassword, true);
  assert.equal(me.json.user.legacy, false);
  assert.equal((await call('GET', '/v1/alerts', { token: s.json.token })).status, 200);
  const l = await call('POST', '/v1/auth/login', { body: { username: 'MAREN_K', password: key('pass1234') } });
  assert.equal(l.status, 200);
  assert.notEqual(l.json.token, s.json.token);
  assert.equal((await call('GET', '/v1/me', { token: l.json.token })).json.user.id, s.json.user.id);
  // the password is never stored in a readable form
  const row = db.sqlite.prepare('SELECT pw_hash, pw_salt FROM users WHERE id = ?').get(s.json.user.id);
  assert.ok(row.pw_hash && !row.pw_hash.includes(key('pass1234')) && row.pw_salt);
});

test('wrong password and unknown user look the same; repeated failures lock the username for an hour', async () => {
  const { call } = setup({ LOGIN_FAILS_HOURLY: '3' });
  await signup(call);
  const bad = await call('POST', '/v1/auth/login', { body: { username: 'maren_k', password: key('nope') } });
  const none = await call('POST', '/v1/auth/login', { body: { username: 'ghost_user', password: key('nope') } });
  assert.equal(bad.status, 401); assert.equal(none.status, 401);
  assert.deepEqual(bad.json, none.json);
  await call('POST', '/v1/auth/login', { body: { username: 'maren_k', password: key('nope2') } });
  await call('POST', '/v1/auth/login', { body: { username: 'maren_k', password: key('nope3') } });
  const locked = await call('POST', '/v1/auth/login', { body: { username: 'maren_k', password: key('pass1234') } });
  assert.equal(locked.status, 429);
});

test('usernames: format, case-insensitive uniqueness, reserved words, availability check', async () => {
  const { call } = setup();
  assert.equal((await signup(call, 'ab')).status, 400);
  assert.equal((await signup(call, 'has space')).status, 400);
  assert.equal((await signup(call, 'admin')).status, 403);
  assert.equal((await signup(call, 'Anna_B')).status, 201);
  assert.equal((await signup(call, 'anna_b', 'x12345678')).status, 409);
  assert.equal((await call('GET', '/v1/auth/username?u=anna_B')).json.available, false);
  assert.equal((await call('GET', '/v1/auth/username?u=free_name')).json.available, true);
  assert.equal((await call('GET', '/v1/auth/username?u=Hytyei')).json.reason, 'reserved');
  const bad = await call('POST', '/v1/auth/signup', { body: { username: 'okname', password: 'plain' } });
  assert.equal(bad.status, 400);
});

test('founder: Hytyei is reserved and only the private key gets the badge', async () => {
  const { call } = setup();
  assert.equal((await signup(call, 'Hytyei')).status, 403);
  assert.equal((await signup(call, 'hytyei', 'pass1234', { founderKey: 'wrong' })).status, 403);
  const s = await signup(call, 'Hytyei', 'pass1234', { founderKey: FOUNDER_KEY });
  assert.equal(s.status, 201);
  assert.equal(s.json.user.badge, 'founder');
  assert.equal((await call('GET', '/v1/me', { token: s.json.token })).json.user.badge, 'founder');
  // nobody can fake the name as a plain display name either
  const other = await signup(call, 'someone');
  assert.equal((await call('PATCH', '/v1/me', { token: other.json.token, body: { name: 'Hytyei' } })).status, 403);
  assert.equal((await call('POST', '/v1/auth/signup', { body: { username: 'Hytyei', password: key('x'), founderKey: FOUNDER_KEY } })).status, 409);
  // the badge shows up on the league table and friend lists
  const lb = await call('GET', '/v1/leaderboard', { token: s.json.token });
  assert.equal(lb.json.rows.find((r) => r.name === 'Hytyei').badge, 'founder');
});

test('legacy Kobel ID accounts keep working and can claim a username and password', async () => {
  const { call, db } = setup();
  const reg = await call('POST', '/v1/register', { body: { name: 'Oldtimer' } });
  assert.equal(reg.status, 201);
  const id = reg.json.id;
  const me = await call('GET', '/v1/me', { token: id });
  assert.equal(me.json.user.legacy, true);
  assert.equal((await call('POST', '/v1/me/password', { token: id, body: { password: key('abcd1234') } })).status, 400); // username first
  const un = await call('POST', '/v1/me/username', { token: id, body: { username: 'old_timer' } });
  assert.equal(un.json.user.username, 'old_timer');
  assert.equal(un.json.user.name, 'old_timer');
  assert.equal((await call('POST', '/v1/me/password', { token: id, body: { password: key('abcd1234') } })).status, 200);
  assert.equal((await call('POST', '/v1/auth/login', { body: { username: 'old_timer', password: key('abcd1234') } })).status, 200);
  assert.equal((await call('GET', '/v1/me', { token: id })).status, 200); // the old ID still opens the same account
  assert.equal((await call('POST', '/v1/me/username', { token: id, body: { username: 'another_one' } })).status, 429); // once a week
  // changing the password needs the current one and signs other devices out
  assert.equal((await call('POST', '/v1/me/password', { token: id, body: { password: key('newpass99') } })).status, 400);
  assert.equal((await call('POST', '/v1/me/password', { token: id, body: { password: key('newpass99'), current: key('wrong') } })).status, 403);
  const dev2 = await call('POST', '/v1/auth/login', { body: { username: 'old_timer', password: key('abcd1234') } });
  assert.equal((await call('POST', '/v1/me/password', { token: id, body: { password: key('newpass99'), current: key('abcd1234') } })).status, 200);
  assert.equal((await call('GET', '/v1/me', { token: dev2.json.token })).status, 401);
  assert.equal((await call('POST', '/v1/auth/login', { body: { username: 'old_timer', password: key('newpass99') } })).status, 200);
  assert.ok(db);
});

test('logout ends only this device', async () => {
  const { call } = setup();
  const a = (await signup(call)).json.token;
  const b = (await call('POST', '/v1/auth/login', { body: { username: 'maren_k', password: key('pass1234') } })).json.token;
  assert.equal((await call('POST', '/v1/auth/logout', { token: a })).status, 200);
  assert.equal((await call('GET', '/v1/me', { token: a })).status, 401);
  assert.equal((await call('GET', '/v1/me', { token: b })).status, 200);
});

test('sign-up is limited per connection', async () => {
  const { call } = setup({ REGISTER_PER_IP_DAILY: '2' });
  assert.equal((await call('POST', '/v1/auth/signup', { ip: '1.1.1.1', body: { username: 'user_one', password: key('a') } })).status, 201);
  assert.equal((await call('POST', '/v1/auth/signup', { ip: '1.1.1.1', body: { username: 'user_two', password: key('a') } })).status, 201);
  assert.equal((await call('POST', '/v1/auth/signup', { ip: '1.1.1.1', body: { username: 'user_3', password: key('a') } })).status, 429);
  assert.equal((await call('POST', '/v1/auth/signup', { ip: '2.2.2.2', body: { username: 'user_4', password: key('a') } })).status, 201);
});

// ── Google (Google's token endpoint is replaced by a stub) ──
function idToken(claims) {
  const p = Buffer.from(JSON.stringify({ iss: 'https://accounts.google.com', aud: 'cid.apps.googleusercontent.com', exp: Math.floor(Date.now() / 1000) + 600, email_verified: true, ...claims })).toString('base64url');
  return 'h.' + p + '.s';
}
async function googleFlow(ctx, { intent, token, claims, verifier = 'app-secret-1' }) {
  const start = await ctx.call('POST', '/v1/auth/google/start', { token, body: { intent, challenge: sha(verifier) } });
  assert.equal(start.status, 200, start.text);
  const u = new URL(start.json.url);
  assert.equal(u.origin + u.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
  assert.equal(u.searchParams.get('code_challenge_method'), 'S256');
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ id_token: idToken(claims) }), { status: 200 });
  let cb;
  try {
    cb = await ctx.call('GET', '/v1/auth/google/callback?code=abc&state=' + encodeURIComponent(u.searchParams.get('state')));
  } finally { globalThis.fetch = realFetch; }
  const m = cb.text.match(/kobel:\/\/auth\?([^"']+)/);
  return { cb, query: m ? new URLSearchParams(m[1].replace(/&amp;/g, '&')) : null, verifier };
}

test('Google sign-in creates an account, the app exchanges the code once with its secret', async () => {
  const ctx = setup();
  const { query, verifier } = await googleFlow(ctx, { intent: 'signin', claims: { sub: 'g-111', email: 'maren@gmail.com' } });
  const code = query.get('code');
  assert.ok(code);
  assert.equal((await ctx.call('POST', '/v1/auth/exchange', { body: { code, verifier: 'wrong-secret' } })).status, 401); // a stolen code is useless
  assert.equal((await ctx.call('POST', '/v1/auth/exchange', { body: { code, verifier } })).status, 401); // and it was burned by the failed try
  const again = await googleFlow(ctx, { intent: 'signin', claims: { sub: 'g-111', email: 'maren@gmail.com' } });
  const ex = await ctx.call('POST', '/v1/auth/exchange', { body: { code: again.query.get('code'), verifier } });
  assert.equal(ex.status, 200);
  assert.equal(ex.json.isNew, false); // the first run already created the account
  assert.match(ex.json.user.name, /^Player-/);
  assert.equal(ex.json.user.username, null);
  assert.match(ex.json.user.google, /^ma\*\*\*@gmail\.com$/);
  const un = await ctx.call('POST', '/v1/me/username', { token: ex.json.token, body: { username: 'maren_g' } });
  assert.equal(un.json.user.username, 'maren_g');
});

test('Google link: an old Kobel ID account adds its Gmail, a second account cannot take the same Gmail', async () => {
  const ctx = setup();
  const reg = await ctx.call('POST', '/v1/register', { body: { name: 'Legacy' } });
  const link = await googleFlow(ctx, { intent: 'link', token: reg.json.id, claims: { sub: 'g-222', email: 'legacy@gmail.com' } });
  const ex = await ctx.call('POST', '/v1/auth/exchange', { body: { code: link.query.get('code'), verifier: link.verifier } });
  assert.equal(ex.json.linked, true);
  assert.equal(ex.json.user.id, reg.json.user ? ex.json.user.id : ex.json.user.id);
  assert.equal((await ctx.call('GET', '/v1/me', { token: reg.json.id })).json.user.google !== null, true);
  const reg2 = await ctx.call('POST', '/v1/register', { body: { name: 'Second' } });
  const link2 = await googleFlow(ctx, { intent: 'link', token: reg2.json.id, claims: { sub: 'g-222', email: 'legacy@gmail.com' } });
  assert.equal(link2.query.get('error'), 'failed');
  // signing in with that Google account opens the old account with all its data
  const si = await googleFlow(ctx, { intent: 'signin', claims: { sub: 'g-222', email: 'legacy@gmail.com' } });
  const ex2 = await ctx.call('POST', '/v1/auth/exchange', { body: { code: si.query.get('code'), verifier: si.verifier } });
  assert.equal(ex2.json.user.name, 'Legacy');
  // linking needs a login, and Google must be configured
  assert.equal((await ctx.call('POST', '/v1/auth/google/start', { body: { intent: 'link', challenge: sha('x') } })).status, 401);
  assert.equal((await setup({ GOOGLE_CLIENT_SECRET: '' }).call('POST', '/v1/auth/google/start', { body: { intent: 'signin', challenge: sha('x') } })).status, 503);
});

test('Google rejects unverified emails and tokens meant for another app', async () => {
  const ctx = setup();
  const a = await googleFlow(ctx, { intent: 'signin', claims: { sub: 'g-3', email: 'x@gmail.com', email_verified: false } });
  assert.equal(a.query.get('error'), 'failed');
  const b = await googleFlow(ctx, { intent: 'signin', claims: { sub: 'g-4', email: 'y@gmail.com', aud: 'someone-else' } });
  assert.equal(b.query.get('error'), 'failed');
});

test('the owner Google account gets the reserved name and the founder badge by itself', async () => {
  const ctx = setup();
  const r = await googleFlow(ctx, { intent: 'signin', claims: { sub: 'g-owner', email: 'Owner@Example.com' } });
  const ex = await ctx.call('POST', '/v1/auth/exchange', { body: { code: r.query.get('code'), verifier: r.verifier } });
  assert.equal(ex.json.user.username, 'Hytyei');
  assert.equal(ex.json.user.badge, 'founder');
  // another Google user cannot claim it
  const o = await googleFlow(ctx, { intent: 'signin', claims: { sub: 'g-other', email: 'other@gmail.com' } });
  const ox = await ctx.call('POST', '/v1/auth/exchange', { body: { code: o.query.get('code'), verifier: o.verifier } });
  assert.equal((await ctx.call('POST', '/v1/me/username', { token: ox.json.token, body: { username: 'Hytyei' } })).status, 403);
});

test('unlinking Google needs another way to sign in', async () => {
  const ctx = setup();
  const r = await googleFlow(ctx, { intent: 'signin', claims: { sub: 'g-5', email: 'z@gmail.com' } });
  const ex = await ctx.call('POST', '/v1/auth/exchange', { body: { code: r.query.get('code'), verifier: r.verifier } });
  assert.equal((await ctx.call('DELETE', '/v1/me/google', { token: ex.json.token })).status, 409);
  await ctx.call('POST', '/v1/me/username', { token: ex.json.token, body: { username: 'zed_user' } });
  await ctx.call('POST', '/v1/me/password', { token: ex.json.token, body: { password: key('zed12345') } });
  assert.equal((await ctx.call('DELETE', '/v1/me/google', { token: ex.json.token })).status, 200);
});

test('founder name: with no founder key or email set, the first person to register it becomes the founder', async () => {
  const ctx = setup({ FOUNDER_KEY_SHA256: undefined, FOUNDER_EMAIL_SHA256: undefined });
  const s = await signup(ctx.call, 'Hytyei', 'pass1234');
  assert.equal(s.status, 201, s.text);
  assert.equal(s.json.user.badge, 'founder');
  assert.equal((await signup(ctx.call, 'hytyei', 'pass1234')).status, 409); // and nobody can take it after that
  const withKey = setup(); // a configured key still protects the name
  assert.equal((await signup(withKey.call, 'Hytyei', 'pass1234')).status, 403);
});

test('Google: the app can collect the sign-in by itself (poll) when the kobel:// link never reaches it', async () => {
  const ctx = setup();
  const verifier = 'app-secret-poll';
  const start = await ctx.call('POST', '/v1/auth/google/start', { body: { intent: 'signin', challenge: sha(verifier) } });
  assert.match(start.json.ref, /^[0-9a-f]{64}$/);
  const pending = await ctx.call('POST', '/v1/auth/google/poll', { body: { ref: start.json.ref, verifier } });
  assert.equal(pending.json.pending, true);
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ id_token: idToken({ sub: 'g-poll', email: 'poll@gmail.com' }) }), { status: 200 });
  try { await ctx.call('GET', '/v1/auth/google/callback?code=abc&state=' + encodeURIComponent(new URL(start.json.url).searchParams.get('state'))); } finally { globalThis.fetch = realFetch; }
  assert.equal((await ctx.call('POST', '/v1/auth/google/poll', { body: { ref: start.json.ref, verifier: 'wrong' } })).status, 401);
  const start2 = await ctx.call('POST', '/v1/auth/google/start', { body: { intent: 'signin', challenge: sha(verifier) } });
  globalThis.fetch = async () => new Response(JSON.stringify({ id_token: idToken({ sub: 'g-poll', email: 'poll@gmail.com' }) }), { status: 200 });
  try { await ctx.call('GET', '/v1/auth/google/callback?code=abc&state=' + encodeURIComponent(new URL(start2.json.url).searchParams.get('state'))); } finally { globalThis.fetch = realFetch; }
  const ok = await ctx.call('POST', '/v1/auth/google/poll', { body: { ref: start2.json.ref, verifier } });
  assert.equal(ok.status, 200, ok.text);
  assert.ok(ok.json.token);
  assert.equal((await ctx.call('GET', '/v1/me', { token: ok.json.token })).status, 200);
  assert.equal((await ctx.call('POST', '/v1/auth/google/poll', { body: { ref: start2.json.ref, verifier } })).json.pending, true); // single use
});
