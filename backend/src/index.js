// Kobel API: a Cloudflare Worker (free plan) in front of a D1 database.
// Routes are documented in docs/API.md.
import { HttpError, json, errorResponse, corsHeaders } from './http.js';
import { handleSync, exportAll, deleteAll } from './sync.js';
import { leaderboard } from './leaderboard.js';
import { listNotices, renameUser } from './profile.js';

const MAX_BODY_BYTES = 262144; // 256 KB is far more than a 40-item sync needs

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** The access code is sent as "Authorization: Bearer <code>". Only its hash is stored in the database. */
async function authenticate(request, env) {
  const m = (request.headers.get('Authorization') || '').match(/^Bearer\s+([A-Za-z0-9_-]{20,128})$/);
  if (!m) throw new HttpError(401, 'unauthorized', 'Missing or invalid access code.');
  const user = await env.DB.prepare('SELECT id, name FROM users WHERE token_hash = ?').bind(await sha256Hex(m[1])).first();
  if (!user) throw new HttpError(401, 'unauthorized', 'Missing or invalid access code.');
  return user;
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

const PATHS = ['/v1/health', '/v1/me', '/v1/notices', '/v1/sync', '/v1/export', '/v1/data', '/v1/leaderboard'];

async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const method = request.method;

  if (path === '/v1/health' && method === 'GET') return json({ ok: true, time: Date.now() });
  if (path === '/v1/me' && method === 'GET') {
    const user = await authenticate(request, env);
    return json({ user: { name: user.name } });
  }
  if (path === '/v1/me' && method === 'PATCH') {
    const user = await authenticate(request, env);
    return json(await renameUser(env.DB, user, await readJson(request)));
  }
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
