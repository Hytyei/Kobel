// Kobel API: a Cloudflare Worker (free plan) in front of a D1 database.
// Routes are documented in docs/API.md.
import { HttpError, json, errorResponse, corsHeaders } from './http.js';
import { handleSync, exportAll, deleteAll } from './sync.js';
import { leaderboard } from './leaderboard.js';
import { listNotices, renameUser } from './profile.js';
import { register, sha256Hex } from './register.js';
import { userBySession, signup, login, logout, setUsername, setPassword, myAccount, usernameAvailable, googleStart, googleCallback, authExchange, unlinkGoogle } from './auth.js';
import { createCode, addFriend, listFriends, friendProfile, removeFriend } from './friends.js';
import { listAlerts } from './alerts.js';
import { createGroup, listGroups, getGroup, renameGroup, deleteGroup, addMember, removeMember, createRound, getRound, startRound, answerRound, pingGroup } from './groups.js';
import { createDuel, listDuels, getDuel, acceptDuel, declineDuel, startDuel, answerDuel, duelRecord } from './duels.js';

const MAX_BODY_BYTES = 262144; // 256 KB is far more than a 40-item sync needs

/** The access code is sent as "Authorization: Bearer <code>". Only its hash is stored in the database. */
async function authenticate(request, env) {
  const m = (request.headers.get('Authorization') || '').match(/^Bearer\s+([A-Za-z0-9_-]{20,128})$/);
  if (!m) throw new HttpError(401, 'unauthorized', 'Missing or invalid access code.');
  const hash = await sha256Hex(m[1]);
  // a device session (username, password or Google) first, then an old Kobel ID
  const session = await userBySession(env.DB, hash);
  if (session) return session;
  const user = await env.DB.prepare('SELECT id, name, visible, username, badge, pw_hash, google_sub, email, username_changed_at FROM users WHERE token_hash = ?').bind(hash).first();
  if (!user) throw new HttpError(401, 'unauthorized', 'Missing or invalid access code.');
  return user;
}
/** Like authenticate(), but returns null when no code was sent (used where a login is optional). */
async function maybeAuthenticate(request, env) {
  return request.headers.get('Authorization') ? authenticate(request, env) : null;
}

async function readJson(request) {
  const declared = Number(request.headers.get('Content-Length') || 0);
  if (declared > MAX_BODY_BYTES) throw new HttpError(413, 'too_large', 'Request body is too large.');
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new HttpError(413, 'too_large', 'Request body is too large.');
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'invalid_json', 'Request body must be valid JSON.');
  }
}

const PATHS = ['/v1/health', '/v1/register', '/v1/me', '/v1/notices', '/v1/sync', '/v1/export', '/v1/data', '/v1/leaderboard', '/v1/friends', '/v1/friends/code', '/v1/duels', '/v1/groups', '/v1/alerts', '/v1/auth/signup', '/v1/auth/login', '/v1/auth/logout', '/v1/auth/username', '/v1/auth/google/start', '/v1/auth/google/callback', '/v1/auth/exchange', '/v1/me/username', '/v1/me/password', '/v1/me/google'];

async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const method = request.method;

  if (path === '/v1/health' && method === 'GET') return json({ ok: true, time: Date.now() });
  if (path === '/v1/register' && method === 'POST') {
    // Public, but limited per caller and per day (see register.js). The body is optional: {"name": "..."}.
    const raw = await request.text();
    if (raw.length > 1024) throw new HttpError(413, 'too_large', 'Request body is too large.');
    let body = null;
    if (raw.trim()) {
      try { body = JSON.parse(raw); } catch { throw new HttpError(400, 'invalid_json', 'Request body must be valid JSON.'); }
    }
    return json(await register(env.DB, env, request, body), 201);
  }
  if (path === '/v1/me' && method === 'GET') {
    const user = await authenticate(request, env);
    return json(await myAccount(env.DB, user));
  }
  if (path === '/v1/me' && method === 'PATCH') {
    const user = await authenticate(request, env);
    return json(await renameUser(env.DB, user, await readJson(request), env));
  }
  // ── accounts: username + password, Google, device sessions ──
  if (path === '/v1/auth/signup' && method === 'POST') return json(await signup(env.DB, env, request, await readJson(request)), 201);
  if (path === '/v1/auth/login' && method === 'POST') return json(await login(env.DB, env, request, await readJson(request)));
  if (path === '/v1/auth/logout' && method === 'POST') return json(await logout(env.DB, await authenticate(request, env)));
  if (path === '/v1/auth/username' && method === 'GET') return json(await usernameAvailable(env.DB, env, request, url));
  if (path === '/v1/auth/google/start' && method === 'POST') return json(await googleStart(env.DB, env, request, await readJson(request), await maybeAuthenticate(request, env)));
  if (path === '/v1/auth/google/callback' && method === 'GET') return googleCallback(env.DB, env, request);
  if (path === '/v1/auth/exchange' && method === 'POST') return json(await authExchange(env.DB, env, await readJson(request)));
  if (path === '/v1/me/username' && method === 'POST') return json(await setUsername(env.DB, env, await authenticate(request, env), await readJson(request)));
  if (path === '/v1/me/password' && method === 'POST') return json(await setPassword(env.DB, env, await authenticate(request, env), await readJson(request)));
  if (path === '/v1/me/google' && method === 'DELETE') return json(await unlinkGoogle(env.DB, await authenticate(request, env)));
  if (path === '/v1/notices' && method === 'GET') {
    await authenticate(request, env);
    return json(await listNotices(env.DB));
  }
  if (path === '/v1/sync' && method === 'POST') {
    const user = await authenticate(request, env);
    return json(await handleSync(env.DB, user, await readJson(request)));
  }
  if (path === '/v1/leaderboard' && method === 'GET') {
    const user = await authenticate(request, env);
    return json(await leaderboard(env.DB, user, url.searchParams.get('range')));
  }
  if (path === '/v1/export' && method === 'GET') {
    const user = await authenticate(request, env);
    return json(await exportAll(env.DB, user));
  }
  if (path === '/v1/data' && method === 'DELETE') {
    const user = await authenticate(request, env);
    await deleteAll(env.DB, user);
    return json({ ok: true });
  }
  // ── friends and duels (all need an access code) ──
  if (path === '/v1/friends/code' && method === 'POST') {
    const user = await authenticate(request, env);
    return json(await createCode(env.DB, user));
  }
  if (path === '/v1/friends' && method === 'GET') {
    const user = await authenticate(request, env);
    return json(await listFriends(env.DB, user));
  }
  if (path === '/v1/friends' && method === 'POST') {
    const user = await authenticate(request, env);
    return json(await addFriend(env.DB, user, await readJson(request)), 201);
  }
  const fm = path.match(/^\/v1\/friends\/(\d{1,12})$/);
  if (fm && (method === 'GET' || method === 'DELETE')) {
    const user = await authenticate(request, env);
    const id = Number(fm[1]);
    if (method === 'DELETE') return json(await removeFriend(env.DB, user, id));
    const out = await friendProfile(env.DB, user, id);
    out.profile.duels = await duelRecord(env.DB, id);
    out.profile.versus = await duelRecord(env.DB, user.id, id);
    return json(out);
  }
  if (path === '/v1/duels' && method === 'GET') {
    const user = await authenticate(request, env);
    return json(await listDuels(env.DB, user));
  }
  if (path === '/v1/duels' && method === 'POST') {
    const user = await authenticate(request, env);
    return json(await createDuel(env.DB, user, await readJson(request)), 201);
  }
  const dm = path.match(/^\/v1\/duels\/(\d{1,12})(?:\/(accept|decline|start|answer))?$/);
  if (dm) {
    const id = Number(dm[1]), action = dm[2];
    if (!action && method === 'GET') return json(await getDuel(env.DB, await authenticate(request, env), id));
    if (action && method === 'POST') {
      const user = await authenticate(request, env);
      if (action === 'accept') return json(await acceptDuel(env.DB, user, id));
      if (action === 'decline') return json(await declineDuel(env.DB, user, id));
      if (action === 'start') return json(await startDuel(env.DB, user, id));
      return json(await answerDuel(env.DB, user, id, await readJson(request)));
    }
    throw new HttpError(405, 'method_not_allowed', 'Method not allowed.');
  }
  // ── alerts and study groups ──
  if (path === '/v1/alerts' && method === 'GET') {
    const user = await authenticate(request, env);
    return json(await listAlerts(env.DB, user, url.searchParams.get('since')));
  }
  if (path === '/v1/groups' && method === 'GET') return json(await listGroups(env.DB, await authenticate(request, env)));
  if (path === '/v1/groups' && method === 'POST') {
    const user = await authenticate(request, env);
    return json(await createGroup(env.DB, user, await readJson(request)), 201);
  }
  const gm = path.match(/^\/v1\/groups\/(\d{1,12})(?:\/(members|games|ping)(?:\/(\d{1,12})(?:\/(start|answer))?)?)?$/);
  if (gm) {
    const gid = Number(gm[1]), sub = gm[2], x = gm[3] === undefined ? null : Number(gm[3]), act = gm[4];
    const user = await authenticate(request, env);
    if (!sub) {
      if (method === 'GET') return json(await getGroup(env.DB, user, gid));
      if (method === 'PATCH') return json(await renameGroup(env.DB, user, gid, await readJson(request)));
      if (method === 'DELETE') return json(await deleteGroup(env.DB, user, gid));
    } else if (sub === 'ping') {
      if (x === null && !act && method === 'POST') return json(await pingGroup(env.DB, user, gid, await readJson(request)), 201);
    } else if (sub === 'members') {
      if (x === null && !act && method === 'POST') return json(await addMember(env.DB, user, gid, await readJson(request)), 201);
      if (x !== null && !act && method === 'DELETE') return json(await removeMember(env.DB, user, gid, x));
    } else if (sub === 'games') {
      if (x === null && method === 'POST') return json(await createRound(env.DB, user, gid, await readJson(request)), 201);
      if (x !== null && !act && method === 'GET') return json(await getRound(env.DB, user, gid, x));
      if (x !== null && act === 'start' && method === 'POST') return json(await startRound(env.DB, user, gid, x));
      if (x !== null && act === 'answer' && method === 'POST') return json(await answerRound(env.DB, user, gid, x, await readJson(request)));
    }
    throw new HttpError(405, 'method_not_allowed', 'Method not allowed.');
  }
  if (PATHS.includes(path)) throw new HttpError(405, 'method_not_allowed', 'Method not allowed.');
  throw new HttpError(404, 'not_found', 'Unknown endpoint.');
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    try {
      const res = await route(request, env);
      for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
      return res;
    } catch (err) {
      if (!(err instanceof HttpError)) {
        console.error('Unhandled error', err && err.message);
        if (/exceeded D1's free tier/i.test(String(err && err.message))) {
          return errorResponse(new HttpError(503, 'free_tier_limit', "Today's free database limit was reached. Try again after midnight UTC."), cors);
        }
      }
      return errorResponse(err, cors);
    }
  },
};
