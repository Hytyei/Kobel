// Username changes and the notification inbox.
import { HttpError } from './http.js';

const NAME_RE = /^[\p{L}\p{N}][\p{L}\p{N} _.-]{0,22}[\p{L}\p{N}]$/u;

/** PATCH /v1/me {"name": "...", "visible": true|false}: both optional. Only users.name / users.visible change.
 *  Cards and progress belong to users.id, so a rename never touches them. */
export async function updateMe(db, user, body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'invalid_request', 'Body must be a JSON object.');
  let name = user.name, visible = Boolean(user.visible);
  if (body.name !== undefined) {
    name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
    if (!NAME_RE.test(name)) {
      throw new HttpError(400, 'invalid_request', 'Username: 2-24 characters, letters, numbers, space, dot, dash or underscore.', 'name');
    }
    const clash = await db.prepare('SELECT id FROM users WHERE name = ? COLLATE NOCASE AND id <> ?').bind(name, user.id).first();
    if (clash) throw new HttpError(409, 'name_taken', 'That username is already taken.', 'name');
  }
  if (body.visible !== undefined) {
    if (typeof body.visible !== 'boolean') throw new HttpError(400, 'invalid_request', 'visible must be true or false.', 'visible');
    visible = body.visible;
  }
  if (body.name === undefined && body.visible === undefined) throw new HttpError(400, 'invalid_request', 'Nothing to change.');
  await db.prepare('UPDATE users SET name = ?, visible = ? WHERE id = ?').bind(name, visible ? 1 : 0, user.id).run();
  return { user: { name, visible } };
}
export const renameUser = updateMe;

/** GET /v1/notices: newest 30, read-only for everyone who has an access code. */
export async function listNotices(db) {
  const { results } = await db.prepare('SELECT id, kind, title, body, created_at FROM notices ORDER BY created_at DESC, id DESC LIMIT 30').all();
  return { notices: results.map((r) => ({ id: r.id, kind: r.kind, title: r.title, body: r.body, t: r.created_at })) };
}
