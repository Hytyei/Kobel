-- 0007: usernames, passwords, Google sign-in, per-device sessions and the founder badge.
-- Everything is additive. Old accounts keep working with their Kobel ID until they add a username or link Google.

ALTER TABLE users ADD COLUMN username            TEXT;     -- login handle (3 to 20 of a-z 0-9 _ .), also copied to users.name
ALTER TABLE users ADD COLUMN pw_salt             TEXT;     -- random salt (hex) for the password hash
ALTER TABLE users ADD COLUMN pw_hash             TEXT;     -- HMAC-SHA256(pepper, salt + key from the phone); never the password itself
ALTER TABLE users ADD COLUMN google_sub          TEXT;     -- Google's stable account id
ALTER TABLE users ADD COLUMN email               TEXT;     -- verified Google email (lowercase), only used to show "linked" and for the founder check
ALTER TABLE users ADD COLUMN badge               TEXT CHECK (badge IS NULL OR badge IN ('founder'));
ALTER TABLE users ADD COLUMN username_changed_at INTEGER;
CREATE UNIQUE INDEX idx_users_username   ON users (username COLLATE NOCASE) WHERE username IS NOT NULL;
CREATE UNIQUE INDEX idx_users_google_sub ON users (google_sub) WHERE google_sub IS NOT NULL;

-- One row per signed-in device. The token itself is never stored, only its SHA-256.
CREATE TABLE sessions (
  token_hash TEXT    PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label      TEXT    NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  last_used  INTEGER NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions (user_id);

-- Google sign-in in two steps (browser, then app): short-lived, single-use rows.
CREATE TABLE oauth_states (
  state_hash TEXT    PRIMARY KEY,
  verifier   TEXT    NOT NULL,                 -- PKCE verifier for Google
  challenge  TEXT    NOT NULL,                 -- SHA-256 (hex) of the secret that only the app knows
  intent     TEXT    NOT NULL CHECK (intent IN ('signin', 'link')),
  user_id    INTEGER,                          -- set for 'link'
  created_at INTEGER NOT NULL
);
CREATE TABLE auth_handoffs (
  code_hash  TEXT    PRIMARY KEY,
  challenge  TEXT    NOT NULL,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_new     INTEGER NOT NULL DEFAULT 0,
  linked     INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
