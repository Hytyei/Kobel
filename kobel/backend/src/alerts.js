// The alert feed: what is new for you since a given time. The phone polls this (WorkManager) and shows notifications.
// Nothing is stored for it: every alert is derived from rows that exist anyway, so it costs a few small reads.
// Types: friend (somebody added you), duel_invite (a friend challenged you), duel_result (your game finished),
//        group_added (you were added to a group), group_round (a new round to play), group_result (a round ended),
//        group_ping (a member pinged the group by hand).
// The phone creates two more on its own because it knows the local day: streak ending soon, and app updates.
import { HttpError } from './http.js';

export const MAX_ALERTS = 50;
export const WINDOW_MS = 7 * 86400000;

export async function listAlerts(db, user, sinceRaw, now = Date.now()) {
  let since = sinceRaw === undefined || sinceRaw === null || sinceRaw === '' ? now - 86400000 : Number(sinceRaw);
  if (!Number.isFinite(since)) throw new HttpError(400, 'invalid_request', 'since must be a time in milliseconds.', 'since');
  since = Math.floor(Math.max(now - WINDOW_MS, Math.min(now, since)));
  // rounds whose 24 hours are over count as finished, even if nobody opened the group yet
  await db.prepare("UPDATE group_games SET status = 'done', settled_at = ?1 WHERE status = 'open' AND expires_at < ?1 AND id IN (SELECT game_id FROM group_plays WHERE user_id = ?2)").bind(now, user.id).run();
  const alerts = [];
  const push = (type, ref, ts, data) => alerts.push({ id: `${type}:${ref}`, type, ts, ...data });

  const friends = await db
    .prepare('SELECT f.created_at AS ts, u.id AS uid, u.name AS name FROM friends f JOIN users u ON u.id = f.added_by WHERE (f.user_a = ?1 OR f.user_b = ?1) AND f.added_by IS NOT NULL AND f.added_by <> ?1 AND f.created_at > ?2 ORDER BY f.created_at DESC LIMIT 20')
    .bind(user.id, since).all();
  for (const r of friends.results) push('friend', r.uid, r.ts, { from: r.uid, name: String(r.name).slice(0, 40) });

  const invites = await db
    .prepare("SELECT d.id AS id, d.game AS game, d.created_at AS ts, u.name AS name, u.id AS uid FROM duels d JOIN users u ON u.id = d.a_user WHERE d.b_user = ? AND d.created_at > ? AND d.status IN ('invited', 'active') AND d.b_done = 0 ORDER BY d.created_at DESC LIMIT 20")
    .bind(user.id, since).all();
  for (const r of invites.results) push('duel_invite', r.id, r.ts, { duel: r.id, game: r.game, from: r.uid, name: String(r.name).slice(0, 40) });

  const results = await db
    .prepare("SELECT d.id AS id, d.game AS game, d.updated_at AS ts, d.a_user AS a, d.b_user AS b, d.a_score AS sa, d.b_score AS sb, u.name AS name FROM duels d JOIN users u ON u.id = CASE WHEN d.a_user = ?1 THEN d.b_user ELSE d.a_user END WHERE (d.a_user = ?1 OR d.b_user = ?1) AND d.status = 'done' AND d.updated_at > ?2 AND d.finished_by IS NOT NULL AND d.finished_by <> ?1 ORDER BY d.updated_at DESC LIMIT 20")
    .bind(user.id, since).all();
  for (const r of results.results) {
    const mine = r.a === user.id ? r.sa : r.sb, theirs = r.a === user.id ? r.sb : r.sa;
    push('duel_result', r.id, r.ts, { duel: r.id, game: r.game, name: String(r.name).slice(0, 40), goals: [mine, theirs], outcome: mine > theirs ? 'win' : mine < theirs ? 'loss' : 'draw' });
  }

  const added = await db
    .prepare('SELECT g.id AS id, g.name AS gname, m.joined_at AS ts, u.name AS name FROM group_members m JOIN groups g ON g.id = m.group_id LEFT JOIN users u ON u.id = m.added_by WHERE m.user_id = ?1 AND m.joined_at > ?2 AND (m.added_by IS NULL OR m.added_by <> ?1) ORDER BY m.joined_at DESC LIMIT 20')
    .bind(user.id, since).all();
  for (const r of added.results) push('group_added', r.id, r.ts, { group: r.id, groupName: r.gname, name: r.name ? String(r.name).slice(0, 40) : '' });

  const rounds = await db
    .prepare("SELECT gg.id AS id, gg.group_id AS gid, g.name AS gname, gg.game AS game, gg.created_at AS ts, u.name AS name FROM group_games gg JOIN groups g ON g.id = gg.group_id JOIN group_plays gp ON gp.game_id = gg.id AND gp.user_id = ?1 JOIN users u ON u.id = gg.creator WHERE gg.created_at > ?2 AND gg.creator <> ?1 AND gp.done = 0 AND gg.status = 'open' ORDER BY gg.created_at DESC LIMIT 20")
    .bind(user.id, since).all();
  for (const r of rounds.results) push('group_round', r.id, r.ts, { group: r.gid, round: r.id, groupName: r.gname, game: r.game, name: String(r.name).slice(0, 40) });

  const ended = await db
    .prepare("SELECT gg.id AS id, gg.group_id AS gid, g.name AS gname, gg.game AS game, gg.settled_at AS ts FROM group_games gg JOIN groups g ON g.id = gg.group_id JOIN group_plays gp ON gp.game_id = gg.id AND gp.user_id = ?1 WHERE gg.status = 'done' AND gg.settled_at > ?2 ORDER BY gg.settled_at DESC LIMIT 20")
    .bind(user.id, since).all();
  for (const r of ended.results) push('group_result', r.id, r.ts, { group: r.gid, round: r.id, groupName: r.gname, game: r.game });

  const pings = await db
    .prepare('SELECT p.id AS id, p.group_id AS gid, g.name AS gname, p.kind AS kind, p.text AS text, p.created_at AS ts, u.name AS name FROM group_pings p JOIN group_members m ON m.group_id = p.group_id AND m.user_id = ?1 JOIN groups g ON g.id = p.group_id JOIN users u ON u.id = p.sender WHERE p.sender <> ?1 AND p.created_at > ?2 AND p.created_at >= m.joined_at ORDER BY p.created_at DESC LIMIT 20')
    .bind(user.id, since).all();
  for (const r of pings.results) push('group_ping', r.id, r.ts, { group: r.gid, groupName: r.gname, name: String(r.name).slice(0, 40), kind: r.kind, text: String(r.text).slice(0, 60) });

  alerts.sort((a, b) => b.ts - a.ts || a.id.localeCompare(b.id));
  return { alerts: alerts.slice(0, MAX_ALERTS), now, since };
}
