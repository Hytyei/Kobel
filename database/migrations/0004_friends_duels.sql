-- 0004: friends (invite codes) and duels (two-player games).
-- Purely additive: three new tables. No existing table, column or row is changed or deleted.
--
-- friend_codes: one short-lived, single-use invite code per user ("ABCD-2345"). Creating a new code replaces the old one.
-- friends:      one row per friendship, stored once with user_a < user_b. Both sides see each other.
-- duels:        one row per two-player game. Both players answer the SAME questions (the deck).
--               The server scores every answer and keeps the right answers; the deck sent to players has no answers in it.
CREATE TABLE friend_codes (
  user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  code       TEXT    NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);

CREATE TABLE friends (
  user_a     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_a, user_b),
  CHECK (user_a < user_b)
);
CREATE INDEX idx_friends_b ON friends (user_b);

CREATE TABLE duels (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  game       TEXT    NOT NULL CHECK (game IN ('sprint', 'dash', 'plural', 'gap', 'scramble')),
  mode       TEXT    NOT NULL CHECK (mode IN ('live', 'turn')),
  a_user     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- the challenger
  b_user     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- the challenged friend
  status     TEXT    NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'done', 'declined', 'expired')),
  deck       TEXT    NOT NULL,                                          -- JSON: the questions and their right answers
  a_answers  TEXT    NOT NULL DEFAULT '[]',                             -- JSON: [[value, ms, points], ...] scored by the server
  b_answers  TEXT    NOT NULL DEFAULT '[]',
  a_score    INTEGER NOT NULL DEFAULT 0,
  b_score    INTEGER NOT NULL DEFAULT 0,
  a_done     INTEGER NOT NULL DEFAULT 0 CHECK (a_done IN (0, 1)),
  b_done     INTEGER NOT NULL DEFAULT 0 CHECK (b_done IN (0, 1)),
  a_t        INTEGER NOT NULL DEFAULT 0,                                -- server time the current question was handed out
  b_t        INTEGER NOT NULL DEFAULT 0,
  start_at   INTEGER NOT NULL DEFAULT 0,                                -- live games: both players start at this server time
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK (a_user <> b_user)
);
CREATE INDEX idx_duels_a ON duels (a_user, updated_at DESC);
CREATE INDEX idx_duels_b ON duels (b_user, updated_at DESC);
