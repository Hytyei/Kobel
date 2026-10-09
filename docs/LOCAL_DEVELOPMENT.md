# Local development

Everything can run on your computer first: no Cloudflare account is needed for this page.

## Backend + database on your computer

```
cd backend
npm install
npm test                      # 10 automated tests, no network needed
npm run db:migrate:local      # creates a local D1 database (stored in .wrangler/)
node scripts/create-user.mjs "Test" --local    # prints a test Kobel ID
npm run dev                   # API at http://localhost:8787
```
Try it: `curl http://localhost:8787/v1/health`

`wrangler dev` uses a local SQLite copy of D1 (stored in `backend/.wrangler/`, git-ignored). Delete that folder to start over.
Optional: copy `backend/.dev.vars.example` to `backend/.dev.vars` to allow extra origins for browser testing.

## Android emulator

1. Android Studio → **Device Manager** → create a phone → start it.
2. Run the `app` configuration (green ▶). This is a **debug** build, which allows plain `http://` for local testing.
3. In the app: **Settings → Cloud sync**, server address `http://10.0.2.2:8787` (the emulator's name for your computer), and the code from `create-user.mjs`.

## Real phone on the same Wi-Fi

1. `npm run dev:lan` (listens on all network interfaces).
2. Find your computer's IP (Windows: `ipconfig`, Mac/Linux: `ifconfig`/`ip a`), e.g. `192.168.1.20`.
3. Allow port 8787 in your firewall if asked.
4. Install the debug APK and use `http://192.168.1.20:8787` as the server address.

## Development vs production

| | Development | Production |
| --- | --- | --- |
| API address | `http://10.0.2.2:8787` or `http://<PC-IP>:8787` | `https://kobel-api.<sub>.workers.dev` |
| Database | local SQLite in `backend/.wrangler/` | D1 in your Cloudflare account |
| App build | debug (HTTP allowed, WebView debugging on) | release (HTTPS only, signed with your key) |
| Users | made with `--local` | made with `--remote` |

The server address is typed in the app, so the same APK works for both.

## Editing the UI

The whole UI is one file: `android/app/src/main/assets/www/index.html`. You can open it in a desktop browser while editing
(German voice and file saving use the browser's own abilities there), then rebuild the APK to see it in the app.
The Android Chrome tools (`chrome://inspect`) can inspect the WebView of a debug build.

## Running the API tests

`npm test` in `backend/`. They run the real Worker code against an in-memory SQLite database that behaves like D1
(`test/d1-adapter.mjs`), so they are fast and need no network.
