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
