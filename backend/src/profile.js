// Username changes and the notification inbox.
import { HttpError } from './http.js';
import { reservedName } from './auth.js';

const NAME_RE = /^[\p{L}\p{N}][\p{L}\p{N} _.-]{0,22}[\p{L}\p{N}]$/u;

/** PATCH /v1/me {"name": "..."}: changes the username. Cards and progress belong to users.id, so a rename never touches them.
 *  "visible" is accepted and ignored: everybody is in every table and ranking. */
export async function updateMe(db, user, body, env = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'invalid_request', 'Body must be a JSON object.');
  let name = user.name;
  if (body.name !== undefined) {
    name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
    if (!NAME_RE.test(name)) {
      throw new HttpError(400, 'invalid_request', 'Username: 2-24 characters, letters, numbers, space, dot, dash or underscore.', 'name');
    }
    if (reservedName(env, name) && !(user.badge === 'founder' && name.toLowerCase() === user.name.toLowerCase())) throw new HttpError(403, 'reserved', 'That name is reserved.', 'name');
    if (user.username) throw new HttpError(409, 'use_username', 'Your name is your username. Change it from the account screen.', 'name');
    const clash = await db.prepare('SELECT id FROM users WHERE name = ? COLLATE NOCASE AND id <> ?').bind(name, user.id).first();
    if (clash) throw new HttpError(409, 'name_taken', 'That username is already taken.', 'name');
    await db.prepare('UPDATE users SET name = ? WHERE id = ?').bind(name, user.id).run();
  }
  return { user: { name, visible: true } };
}
export const renameUser = updateMe;

/** GET /v1/notices: newest 30, read-only for everyone who has an access code. */
export async function listNotices(db) {
  const { results } = await db.prepare('SELECT id, kind, title, body, created_at FROM notices ORDER BY created_at DESC, id DESC LIMIT 30').all();
  return { notices: results.map((r) => ({ id: r.id, kind: r.kind, title: r.title, body: r.body, t: r.created_at })) };
}
