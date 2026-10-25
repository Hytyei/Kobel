# Security notes

| Topic | What is done |
| --- | --- |
| Transport | Release builds allow **HTTPS only** (`network_security_config.xml`). Cloudflare serves the Worker over HTTPS. Plain HTTP exists only in debug builds, for testing on your own computer. |
| Secrets in the APK | None. The APK contains no database credentials, keys or tokens. The D1 database is reachable only from inside the Worker (a binding), never from the internet or the app. |
| Secrets on GitHub | `.gitignore` excludes `.dev.vars`, `.env`, `keystore.properties`, `*.jks`. The only identifier in the repo is the D1 `database_id`, which is an address, not a credential. |
| Authentication | Every data endpoint needs `Authorization: Bearer <Kobel ID>`. Codes are random (about 125 bits for new IDs; IDs made by older versions, `kb_...`, keep working) and only their SHA-256 hash is stored. Brute-forcing one is not realistic. |
| Authorization | Every SQL statement is scoped by `user_id` taken from the code, never from the request body. A test proves one user cannot read, overwrite or delete another user's data. |
| Input validation | All fields are type-checked, range-checked and length-limited on the server; unknown profile keys are rejected; body size ≤ 256 KB; ≤ 40 items per request. |
| SQL injection | Every query uses bound parameters. A test stores `'); DROP TABLE cards; --` as plain text. |
| CORS | Only the app's origin (`ALLOWED_ORIGINS`) gets CORS headers. |
| WebView | Loads only the bundled page; navigation to other sites is blocked; file and content access are off; the JavaScript bridge is therefore only reachable by our own code. Debug-only: WebView debugging and HTTP. |
| Backups | `allowBackup="false"` so Android does not copy the app's storage (which holds your Kobel ID) to cloud backups. Use the in-app backup file instead. |
| Kobel ID on the phone | Stored in the app's private storage (not readable by other apps without root). The in-app backup file does **not** include it. |

**Known limits (reasonable for a 2–3 person project):** there is no rate limiting beyond Cloudflare's own; a lost phone with an unlocked app can sync as you
(remove the user with `DELETE FROM users WHERE name='…'` and create a new one); the "newest edit wins" rule trusts each device's clock.

## Anonymous sign-up (`POST /v1/register`)

New users get an account without any form: the app calls this endpoint once, the Worker creates an empty account and a random
Kobel ID (125 bits, shown once, only its hash is stored). Each account has its own `users.id` and every query on cards, rules and
progress is filtered by it, so accounts cannot read each other's data.

| Risk | Protection |
|---|---|
| Someone scripts thousands of sign-ups | Per caller per day limit (default 5) and an overall daily cap (default 200), both counted in D1 (`signups`). A third limit-free switch: `REGISTRATION_OPEN = "false"` in `wrangler.toml` |
| Privacy of callers | The caller is stored only as a salted hash that changes every day; counters are deleted after 3 days |
| Strangers reading other players | New accounts are hidden from the league table until the user opts in. Notices are public information |
| Name squatting | Names are unique, a taken name just gets a generated alternative; the daily limits cap the damage |
| Unrestricted database access | The app never talks to D1. Only the Worker does, through its `DB` binding. No Cloudflare token, account id or database credential is in the APK or the repo (the D1 database id in `wrangler.toml` is only an identifier) |
| Lost ID | There is no recovery: the ID is the key. The app shows it once after sign-up and always under Profile |

Optional later hardening if the app becomes public: a Cloudflare Turnstile check on `/v1/register`, and a script that removes accounts that never synced anything.

## Friends and duels (version 2.4.0)

| Risk | Protection |
|---|---|
| Strangers adding you | Only someone who has your single-use invite code (40 random bits, valid 7 days) can add you. Guessing is limited to 20 tries per person per day |
| A friend reading private data | `GET /v1/friends/{id}` returns a fixed whitelist (`stats.pub`, avatar, name). Cards, settings, sync address and access code are never read for this |
| Non-friends reading a profile | Every friends and duel route checks the friendship on the server |
| Cheating in duels | The server stores the right answers, sends the deck without them, scores each answer with its own clock, and requires answers in order |
| Spam | Daily and open-challenge limits (see `docs/FRIENDS_AND_DUELS.md`); invalid or oversized decks are rejected |
| Leaving friends | Removing a friend deletes the link for both sides |

## Groups, streaks and alerts (version 2.5.0)

| Risk | Protection |
|---|---|
| Joining a group uninvited | Only the owner can add, and only people who are already their friends; every group route checks membership on the server |
| Seeing a round early | Round results are hidden until you finish it or it ended; answers stay on the server |
| Group spam | Limits: 5 groups per person, 10 groups and 10 rounds per day, 3 open rounds per group, 8 members |
| Streak data | Only whole local day numbers (max 90) are published, never times; the shared streak is computed on the server |
| Alert feed | `GET /v1/alerts` only returns the caller's own events, at most 50, from the last 7 days |
| Phone notifications | Polling uses the access code already stored on the phone; no push service, no extra keys or secrets in the app |


## Accounts (version 3.4.0)
* Passwords are stretched on the phone (PBKDF2, 150 000 rounds, salt = `kobel|lowercase username`) and the Worker stores `HMAC-SHA256(PASSWORD_PEPPER, random salt + key)`. The plain password is never sent or stored. The pepper is a Worker secret (not in the app, not on GitHub).
* Sessions: random `kbs_…` tokens, only the SHA-256 hash is stored, max 10 per user, deleted on sign-out and on password change (other devices).
* Login: the same answer for a wrong username and a wrong password, constant-work comparison, limits per connection per hour and 8 wrong tries per username per hour. Sign-up: limits per connection per day and overall per day.
* Google: authorization code + PKCE done by the Worker (client secret is a Worker secret); `state` is single use and expires after 10 minutes; the ID token is read only after Google's own token endpoint returned it over HTTPS and its issuer is checked; the app receives a one-time handoff code (2 minutes, single use) that needs the app's secret verifier. Only `openid email` is requested; the e-mail is stored (masked in responses) only to recognise the account again.
* The founder badge cannot be requested: it is granted only by `FOUNDER_KEY_SHA256` / `FOUNDER_EMAIL_SHA256` (hashes in secrets). Reserved names are refused.
* The Android bridge opens only `https://accounts.google.com/…` and accepts only `kobel://auth` with a code of the expected shape.
* Old Kobel IDs keep working until their owner upgrades them; nothing is deleted.
