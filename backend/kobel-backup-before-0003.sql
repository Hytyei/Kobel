PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE IF NOT EXISTS "d1_migrations"(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(1,'0001_init.sql','2026-10-11 00:38:51');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(2,'0002_notices.sql','2026-10-11 00:38:51');
CREATE TABLE users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL CHECK (length(name) BETWEEN 1 AND 40),
  token_hash TEXT    NOT NULL UNIQUE,            
  created_at INTEGER NOT NULL
);
CREATE TABLE cards (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id          TEXT    NOT NULL,                  
  type        TEXT    NOT NULL CHECK (type IN ('w','g')),   
  lesson      TEXT    NOT NULL DEFAULT '',
  lesson_date TEXT    NOT NULL DEFAULT '',       
  de          TEXT    NOT NULL DEFAULT '',
  art         TEXT    NOT NULL DEFAULT '' CHECK (art IN ('','der','die','das')),
  pl          TEXT    NOT NULL DEFAULT '',
  forms       TEXT    NOT NULL DEFAULT '',
  en          TEXT    NOT NULL DEFAULT '',
  ex          TEXT    NOT NULL DEFAULT '',
  ex_en       TEXT    NOT NULL DEFAULT '',
  note        TEXT    NOT NULL DEFAULT '',
  sentence    TEXT    NOT NULL DEFAULT '',
  topic       TEXT    NOT NULL DEFAULT '',
  hint        TEXT    NOT NULL DEFAULT '',
  created_at  INTEGER NOT NULL DEFAULT 0,
  due         INTEGER NOT NULL DEFAULT 0,        
  iv          INTEGER NOT NULL DEFAULT 0,
  ease        REAL    NOT NULL DEFAULT 2.5,
  reps        INTEGER NOT NULL DEFAULT 0,
  lapses      INTEGER NOT NULL DEFAULT 0,
  seen        INTEGER NOT NULL DEFAULT 0,
  ok          INTEGER NOT NULL DEFAULT 0,
  bad         INTEGER NOT NULL DEFAULT 0,
  susp        INTEGER NOT NULL DEFAULT 0 CHECK (susp IN (0,1)),
  bury        INTEGER NOT NULL DEFAULT 0,
  updated_at  INTEGER NOT NULL,
  synced_at   INTEGER NOT NULL,
  deleted     INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0,1)),
  PRIMARY KEY (user_id, id)
);
CREATE TABLE rules (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id         TEXT    NOT NULL,
  topic      TEXT    NOT NULL DEFAULT '',
  lesson     TEXT    NOT NULL DEFAULT '',
  text       TEXT    NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL,
  synced_at  INTEGER NOT NULL,
  deleted    INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0,1)),
  PRIMARY KEY (user_id, id)
);
CREATE TABLE profiles (
  user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data       TEXT    NOT NULL,                   
  updated_at INTEGER NOT NULL,
  synced_at  INTEGER NOT NULL
);
CREATE TABLE notices (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  kind       TEXT    NOT NULL DEFAULT 'news' CHECK (kind IN ('news', 'update', 'tip')),
  title      TEXT    NOT NULL CHECK (length(title) BETWEEN 1 AND 80),
  body       TEXT    NOT NULL DEFAULT '' CHECK (length(body) <= 1000),
  created_at INTEGER NOT NULL
);
DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('d1_migrations',2);
CREATE INDEX idx_cards_sync ON cards (user_id, synced_at);
CREATE INDEX idx_rules_sync ON rules (user_id, synced_at);
CREATE INDEX idx_notices_created ON notices (created_at DESC);
CREATE UNIQUE INDEX idx_users_name_nocase ON users (name COLLATE NOCASE);
