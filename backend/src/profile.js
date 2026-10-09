// Username changes and the notification inbox.
import { HttpError } from './http.js';

const NAME_RE = /^[\p{L}\p{N}][\p{L}\p{N} _.-]{0,22}[\p{L}\p{N}]$/u;

/** PATCH /v1/me {"name": "..."}: only the display name changes. Cards and progress belong to users.id, so nothing else is touched. */
export async function renameUser(db, user, body) {
  const name = body && typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
  if (!NAME_RE.test(name)) {
    throw new HttpError(400, 'invalid_request', 'Username: 2-24 characters, letters, numbers, space, dot, dash or underscore.', 'name');
  }
  const clash = await db.prepare('SELECT id FROM users WHERE name = ? COLLATE NOCASE AND id <> ?').bind(name, user.id).first();
  if (clash) throw new HttpError(409, 'name_taken', 'That username is already taken.', 'name');
  await db.prepare('UPDATE users SET name = ? WHERE id = ?').bind(name, user.id).run();
  return { user: { name } };
}

/** GET /v1/notices: newest 30, read-only for everyone who has an access code. */
export async function listNotices(db) {
  const { results } = await db.prepare('SELECT id, kind, title, body, created_at FROM notices ORDER BY created_at DESC, id DESC LIMIT 30').all();
  return { notices: results.map((r) => ({ id: r.id, kind: r.kind, title: r.title, body: r.body, t: r.created_at })) };
}
