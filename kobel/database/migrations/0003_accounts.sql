-- 0003: anonymous self-service accounts (POST /v1/register).
--
-- 1) users.visible: whether the player appears in the league table for other players.
--    Existing users keep today's behaviour (visible = 1). Accounts created through /v1/register start hidden (0).
-- 2) signups: tiny counters used to limit account creation (per caller per day, and overall per day).
--    The caller is stored only as a salted, per-day hash, never as an IP address, and old rows are deleted automatically.
-- Nothing here deletes or changes existing users, cards or progress.
ALTER TABLE users ADD COLUMN visible INTEGER NOT NULL DEFAULT 1 CHECK (visible IN (0, 1));

CREATE TABLE signups (
  bucket TEXT    NOT NULL,   -- hash of the caller for one day, or '*' for the daily total
  day    TEXT    NOT NULL,   -- YYYY-MM-DD (UTC)
  n      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, day)
);
