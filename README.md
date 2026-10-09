# Kobel: a German vocabulary trainer built from your own class notes

> **Status:** the Android app (Bundesliga-style UI, lesson scope, widgets, GitHub updater) is ready: see [docs/BUILD_APK.md](docs/BUILD_APK.md). The backend in `backend/` + `database/` is the older sync version and is the next thing to redesign (append-only lessons, leaderboard).
League/season/trophy rules: docs/LEAGUES.md

An Android app (APK, installed directly, no Google Play) with an optional free cloud backend on Cloudflare.

```
Android APK  (Kotlin + Jetpack Compose host, bundled offline UI)
     │  HTTPS, only for the optional cloud sync
     ▼
Cloudflare Worker  (backend/, free plan)
     │
     ▼
Cloudflare D1  (database/, free plan)
```

* The app works **fully offline**. Words and progress are stored on the phone.
* **Cloud sync is optional**: it keeps your words and progress in your own free Cloudflare database and shares them between your devices (2–3 users supported, each with a private account).
* Nothing here needs a paid service, a server, or a credit card.

## Folders

| Folder | What is in it |
| --- | --- |
| `android/` | Android Studio project (Kotlin, Jetpack Compose, Gradle). The UI is `android/app/src/main/assets/www/index.html`. |
| `backend/` | Cloudflare Worker (the API), its tests, and a script that creates users. |
| `database/` | SQL schema and migrations for Cloudflare D1. |
| `docs/` | Architecture, API reference, deployment, local development, security, adding class notes. |

## Start here

1. Want to read the design first? → [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
2. Want it running on your phone and Cloudflare? → [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
3. Want to run everything on your computer first? → [docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md)
4. Got new class notes? → [docs/ADDING_NOTES.md](docs/ADDING_NOTES.md)

## What was tested, and what was not

* **Tested:** the Worker API (10 automated tests: auth, validation, last-write-wins, deletes, user isolation, SQL-injection safety, free-tier query budget, CORS) and a two-device sync run through a real browser against the Worker code on SQLite.
* **Not tested:** the Android project and the real Cloudflare deployment. They were written without access to the Android SDK or a Cloudflare account, so expect to fix small things on the first build (Android Studio will point to them). Run `npm test` in `backend/` any time to re-check the API.
