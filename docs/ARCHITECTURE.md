# Architecture

## 1. Proposed architecture

```
┌─────────────────────────────┐        HTTPS (only for sync)        ┌──────────────────────┐      ┌─────────────┐
│ Android APK                 │ ──────────────────────────────────▶ │ Cloudflare Worker     │ ───▶ │ Cloudflare  │
│  Compose Activity           │   Authorization: Bearer <code>      │  src/index.js         │      │ D1 (SQLite) │
│  └ WebView (bundled UI)     │ ◀────────────────────────────────── │  auth + validation    │ ◀─── │ 4 tables    │
│     localStorage = the data │                                     └──────────────────────┘      └─────────────┘
│  └ KobelBridge (German TTS, │
│    save/open files)         │
└─────────────────────────────┘
```

**Offline first.** The phone is the source of truth and works without internet. Sync is a background courtesy:
on app start, when the app comes back to the foreground, and a few seconds after you finish studying.

**Why a WebView inside a Compose app instead of rewriting the UI natively?** The UI (animations, 7 minigames,
spaced repetition, stats) already exists and is tested. A native rewrite would be thousands of lines that could not be
compile-tested in the environment this was built in. The Compose activity hosts the page, serves it from the APK
(works offline, no hosting needed) and provides what a web page cannot do well on its own: **reliable German
text-to-speech** and **saving/opening files**. If you later want a fully native UI, the API and database stay the same.

**Is authentication necessary?** Only for sync. With one device you can skip the backend completely (the app saves
everything locally and has file backups). With sync, each user needs a private identity, so the design is the smallest
thing that works: a random **access code** per user (like an API key), entered once in the app. The server stores only
its SHA-256 hash. No passwords, emails, OAuth or sessions.

## 2. Database schema (D1 / SQLite) — `database/migrations/0001_init.sql`

| Table | Purpose | Key columns |
| --- | --- | --- |
| `users` | One row per person | `id`, `name`, `token_hash` (unique), `created_at` |
| `cards` | Vocabulary words (`type='w'`) and grammar gap sentences (`type='g'`) with their study progress | PK `(user_id, id)`; content (`de, art, pl, forms, en, ex, ex_en, note`, `sentence, topic, hint`), lesson, progress (`due, iv, ease, reps, lapses, seen, ok, bad, susp, bury`), sync (`updated_at, synced_at, deleted`) |
| `rules` | Grammar and pronunciation rules from class | PK `(user_id, id)`; `topic, lesson, text`, sync columns |
| `profiles` | XP, streak, badges, minigame records, settings (small JSON) | PK `user_id`; `data`, `updated_at`, `synced_at` |

* `ON DELETE CASCADE` from `users` removes all of a user's data.
* Indexes `(user_id, synced_at)` on `cards` and `rules` make "what changed since my last sync?" cheap.
* `CHECK` constraints enforce allowed values (type, article, flags).
* **Conflict rule:** newest edit wins per card (`updated_at`, the client clock). Deletes are kept as tombstones.

## 3. API design — see [API.md](API.md)

`GET /v1/health` · `GET /v1/me` · `POST /v1/sync` · `GET /v1/export` · `DELETE /v1/data`

`POST /v1/sync` does a push and a pull in one call. At most 40 changed items per request (the app sends several
requests when needed), which also keeps each request within D1's free limit of 50 queries per Worker invocation.

## 4. Android architecture

* Single module `app`, package `app.kobel`, `minSdk 26` (Android 8.0), `targetSdk 35`.
* `MainActivity` (Compose): hosts the WebView, handles Back (closes sheets/sessions first), the file picker and save dialogs.
* `KobelBridge`: JavaScript interface exposed to the page as `KobelAndroid`:
  `hasGerman()`, `speak(text, rate)`, `stopSpeak()`, `openTtsSettings()`, `saveFile(name, text)`, `pickFile()`.
* The page is served from the APK by `WebViewAssetLoader` at `https://appassets.androidplatform.net/assets/www/index.html`
  (a real https origin, so `localStorage` is reliable). Navigation to any other site is blocked.
* Release builds are HTTPS-only; debug builds also allow `http://` so you can test against your own computer.
* No secrets in the APK. The access code is typed by the user and kept only in the app's private storage.

## 5. Cloudflare services used

| Service | Used? | Why |
| --- | --- | --- |
| Workers (Free plan) | Yes | The API |
| D1 (Free plan) | Yes | The database |
| R2 | **No** | No files are stored on the server. Backups are files on the phone. |
| Pages | **No** | No web admin is needed. The UI ships inside the APK. |
| KV, Queues, Durable Objects, AI | No | Not needed |

## 6. Free-tier confirmation (checked against Cloudflare's documentation, October 2026)

| Limit (Free plan) | Value | Expected use for 2–3 users |
| --- | --- | --- |
| Worker requests | 100,000 / day | roughly 100–300 / day |
| Worker CPU time | 10 ms per invocation | validating ≤ 40 items and running SQL is a few ms |
| D1 rows read | 5 million / day | a few thousand / day (indexed queries only read changed rows) |
| D1 rows written | 100,000 / day | roughly 1,000–3,000 / day (index writes also count) |
| D1 storage | 500 MB per database, 5 GB per account | well under 5 MB |
| D1 queries per invocation | 50 | at most 46 (checked by a test) |

* Since **1 September 2026** D1 refuses queries once a daily limit is exceeded, until midnight UTC. The Worker then answers
  `503 free_tier_limit`; the app keeps working offline and syncs later. Nothing is lost.
* The Free plans need **no credit card** (R2, which is not used, would). Nothing in this design needs a paid plan.
* The CPU and request estimates are calculations, not measurements from a live account. Cloudflare's dashboard shows real
  usage under Workers & Pages and D1.
