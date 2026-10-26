# Accounts: usernames, passwords and Google (version 3.4.0)

Kobel used to have one thing: a **Kobel ID** (a long secret string). Version 3.4.0 adds real accounts and keeps the ID working.

| Way to sign in | What the user does | Free? |
|---|---|---|
| **Username + password** | Signs up once; the phone keeps a session, so no password is asked again | yes |
| **Continue with Google** | Taps the button, picks a Google account in the browser, returns to the app | yes |
| **Old Kobel ID** | Nothing changes. Everything still works. In Settings › Account they can "Make it a real account" (username + password) or link Google | yes |

No e-mail is sent by Kobel and no domain is needed. Google sign-in is free and works for sideloaded APKs (not only Google Play).

## How it works (short)

* **Passwords never leave the phone in plain form.** The app turns the password into a 64-character key (PBKDF2, 150 000 rounds, salted with the username). The Worker then stores only `HMAC-SHA256(secret pepper, salt + key)`. Even someone who reads the whole database cannot sign in or learn passwords without the pepper.
* **Sessions.** Sign-up/login return a session token `kbs_…`. The phone stores it like the old ID (`Authorization: Bearer …`), the database stores only its SHA-256 hash. At most 10 sessions per user; "Sign out" deletes the session on the server.
* **Old IDs keep working.** The server accepts a session token or a legacy Kobel ID on every endpoint.
* **Google.** The Worker does the OAuth dance (code + PKCE) with its own client secret (never in the app). It finishes on a small page that opens `kobel://auth?code=…`. That one-time code (valid 2 minutes) is useless without the secret verifier that only the app holds. The app exchanges it for a session.
* **Linking.** Signed in with an old ID or a username? Settings › Account › "Link Google" adds the Google account to the *same* user: all progress stays. Signing in with Google later gives the same account. A Google account can belong to one Kobel account only.
* **Usernames.** 3–20 characters, letters, numbers, `.` and `_`, unique ignoring upper/lower case, changeable once a week. Reserved names (admin, support, kobel, bundesliga …) are blocked.
* **Founder badge.** Username `Hytyei` is reserved. **If you have not set `FOUNDER_KEY_SHA256` or `FOUNDER_EMAIL_SHA256`, the first person to register `Hytyei` becomes the founder** (so register it yourself right after deploying; afterwards nobody else can take it). Once either secret is set, it can only be claimed with the founder key you set (or by signing in with your Google account whose e-mail hash you set). The badge shows as a small shield next to the name in tables, friends, groups and profiles. Nobody else can get it, and it cannot be requested through any endpoint.

## Settings you add on Cloudflare (once)

See `docs/GO_LIVE.md` → "Version 3.4.0". In short: one migration (`0007_auth.sql`), these **secrets** (never in the app or on GitHub):

| Secret / variable | What it is |
|---|---|
| `PASSWORD_PEPPER` (secret, required) | Long random text. If you lose it, nobody can log in with a password. Keep a copy somewhere safe. |
| `GOOGLE_CLIENT_ID` (secret) | From Google Cloud Console (OAuth client of type *Web application*) |
| `GOOGLE_CLIENT_SECRET` (secret) | From the same place |
| `FOUNDER_KEY_SHA256` (secret) | SHA-256 of a founder key only you know. Lets you claim `Hytyei` + badge with a password-like key |
| `FOUNDER_EMAIL_SHA256` (secret, optional) | SHA-256 of your lower-case Google e-mail. Then signing in with that Google account gives you `Hytyei` + badge automatically |
| `FOUNDER_USERNAME` (variable, optional) | Defaults to `Hytyei` |
| `REGISTRATION_OPEN`, `REGISTER_PER_IP_DAILY`, `REGISTER_GLOBAL_DAILY`, `LOGIN_PER_IP_HOURLY`, `LOGIN_FAILS_HOURLY`, `USERNAME_CHECK_HOURLY`, `GOOGLE_START_HOURLY`, `SIGNUP_SALT` | Optional limits (defaults in `backend/src/auth.js`) |

Without `GOOGLE_CLIENT_ID/SECRET` the Google button shows "not set up on the server yet" and everything else works.

## Google Cloud Console, step by step (free, no card)

1. Open <https://console.cloud.google.com>, create a project called *Kobel*.
2. **APIs & Services › OAuth consent screen**: user type *External*, app name *Kobel*, your e-mail as support and developer contact. Scopes: only `openid` and `email`. Then click **Publish app** so the status is **In production** (otherwise only 100 listed test users can sign in and the login expires after 7 days). Because the scopes are not sensitive, no Google review is needed.
3. **Credentials › Create credentials › OAuth client ID**, type **Web application**. Under *Authorized redirect URIs* add exactly:
   `https://kobel-api.thehdv7.workers.dev/v1/auth/google/callback`
4. Copy the client ID and secret into the Worker secrets (GO_LIVE.md).
5. Nothing to register for the APK (package name / SHA-1 are only needed for the native Google SDK, which Kobel does not use).

## Android side

* `AndroidManifest.xml`: `MainActivity` is `singleTask` and handles `kobel://auth`.
* `MainActivity` reads the code (only `[A-Za-z0-9_-]{16,128}`), hands it to the page (`window.kobelAuth(code)` or `KobelAndroid.takeAuth()` when the app was closed).
* `KobelBridge.openUrl(url)` opens **only** `https://accounts.google.com/...` in the browser.

## Google sign-in: how the app gets the result back

1. `POST /v1/auth/google/start` returns `{ url, ref }`. The app opens `url` in the browser and keeps its secret verifier and `ref`.
2. After you choose your account, Google calls the Worker, which stores a one-time result and sends the browser to `kobel://auth?code=...`.
3. The app exchanges the code with `POST /v1/auth/exchange { code, verifier }`.
4. Backup: when you come back to the app and no code arrived, it asks `POST /v1/auth/google/poll { ref, verifier }`. The answer is `{ pending: true }` until the sign-in finished, then the session token (once). No auth header; the verifier is the proof. Errors: 400 `invalid_request`, 401 `invalid_code`.

Results are kept for 10 minutes, the start of a sign-in for 30.
