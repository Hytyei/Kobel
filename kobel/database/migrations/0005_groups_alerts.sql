-- 0005: study groups (shared game rounds, a group table and a group streak) and the data the alert feed needs.
-- Purely additive: two nullable columns on existing tables and four new tables. Nothing is changed or deleted.
--
-- friends.added_by     who typed the invite code (so only the OTHER person gets a "new friend" alert).
-- duels.finished_by    who finished the game last (so only the OTHER player gets a "result is in" alert).
-- groups               a study group: a name and an owner. Members must be friends of whoever adds them.
-- group_members        one row per member. added_by lets the alert feed skip the person who added you.
-- group_games          one round: everybody in the group answers the same 9 questions within 24 hours.
-- group_plays          one row per member and round: the answers (scored by the server), goals and progress.
ALTER TABLE friends ADD COLUMN added_by INTEGER;
ALTER TABLE duels ADD COLUMN finished_by INTEGER;

CREATE TABLE groups (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  owner      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE group_members (
  group_id  INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_by  INTEGER,
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (group_id, user_id)
);
CREATE INDEX idx_group_members_user ON group_members (user_id, joined_at DESC);

CREATE TABLE group_games (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id   INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  game       TEXT    NOT NULL CHECK (game IN ('sprint', 'dash', 'plural', 'gap', 'scramble')),
  creator    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deck       TEXT    NOT NULL,                                  -- JSON: questions and right answers (never sent to players)
  status     TEXT    NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  settled_at INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_group_games_group ON group_games (group_id, created_at DESC);

CREATE TABLE group_plays (
  game_id     INTEGER NOT NULL REFERENCES group_games(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answers     TEXT    NOT NULL DEFAULT '[]',
  score       INTEGER NOT NULL DEFAULT 0,                       -- goals: right answers, 0 to 9
  done        INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1)),
  t           INTEGER NOT NULL DEFAULT 0,                       -- server time the current question was handed out
  finished_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (game_id, user_id)
);
CREATE INDEX idx_group_plays_user ON group_plays (user_id, finished_at DESC);
