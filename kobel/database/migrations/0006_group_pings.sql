-- 0006: manual pings inside a study group ("time to practise!"). Additive only: one new table, nothing existing is touched.
-- A ping is a tiny message from one member to the others. Members read it through GET /v1/alerts (the same feed as the
-- other notifications). Rows older than 7 days are pruned whenever somebody pings the same group.
CREATE TABLE group_pings (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id   INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  sender     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT    NOT NULL CHECK (kind IN ('practise', 'round', 'streak', 'custom')),
  text       TEXT    NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_group_pings_group ON group_pings (group_id, created_at DESC);
