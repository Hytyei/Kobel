-- Notices shown in the app's notification inbox (new releases, update details, news).
-- Posted by the owner with backend/scripts/post-notice.mjs. Users only read them.
CREATE TABLE notices (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  kind       TEXT    NOT NULL DEFAULT 'news' CHECK (kind IN ('news', 'update', 'tip')),
  title      TEXT    NOT NULL CHECK (length(title) BETWEEN 1 AND 80),
  body       TEXT    NOT NULL DEFAULT '' CHECK (length(body) <= 1000),
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_notices_created ON notices (created_at DESC);

-- Usernames are shown in the league table, so keep them unique (ignoring upper/lower case).
-- Changing a name only edits this column: every card and progress row is linked by users.id, not by name.
CREATE UNIQUE INDEX idx_users_name_nocase ON users (name COLLATE NOCASE);
