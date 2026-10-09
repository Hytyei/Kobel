# Security notes

| Topic | What is done |
| --- | --- |
| Transport | Release builds allow **HTTPS only** (`network_security_config.xml`). Cloudflare serves the Worker over HTTPS. Plain HTTP exists only in debug builds, for testing on your own computer. |
| Secrets in the APK | None. The APK contains no database credentials, keys or tokens. The D1 database is reachable only from inside the Worker (a binding), never from the internet or the app. |
| Secrets on GitHub | `.gitignore` excludes `.dev.vars`, `.env`, `keystore.properties`, `*.jks`. The only identifier in the repo is the D1 `database_id`, which is an address, not a credential. |
| Authentication | Every data endpoint needs `Authorization: Bearer <access code>`. Codes are random (about 190 bits) and only their SHA-256 hash is stored. Brute-forcing one is not realistic. |
| Authorization | Every SQL statement is scoped by `user_id` taken from the code, never from the request body. A test proves one user cannot read, overwrite or delete another user's data. |
| Input validation | All fields are type-checked, range-checked and length-limited on the server; unknown profile keys are rejected; body size ≤ 256 KB; ≤ 40 items per request. |
| SQL injection | Every query uses bound parameters. A test stores `'); DROP TABLE cards; --` as plain text. |
| CORS | Only the app's origin (`ALLOWED_ORIGINS`) gets CORS headers. |
| WebView | Loads only the bundled page; navigation to other sites is blocked; file and content access are off; the JavaScript bridge is therefore only reachable by our own code. Debug-only: WebView debugging and HTTP. |
| Backups | `allowBackup="false"` so Android does not copy the app's storage (which holds your access code) to cloud backups. Use the in-app backup file instead. |
| Access code on the phone | Stored in the app's private storage (not readable by other apps without root). The in-app backup file does **not** include it. |

**Known limits (reasonable for a 2–3 person project):** there is no rate limiting beyond Cloudflare's own; a lost phone with an unlocked app can sync as you
(remove the user with `DELETE FROM users WHERE name='…'` and create a new one); the "newest edit wins" rule trusts each device's clock.
