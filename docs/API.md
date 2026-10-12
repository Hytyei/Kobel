# API reference

Base URL: your Worker, e.g. `https://kobel-api.<your-subdomain>.workers.dev`. All responses are JSON.
Protected endpoints need the header `Authorization: Bearer <Kobel ID>`.

**Error shape (all endpoints)**

```json
{ "error": { "code": "invalid_request", "message": "cards[0].de: is required", "field": "cards[0].de" } }
```

Common errors: `401 unauthorized`, `429 rate_limited`, `404 not_found`, `405 method_not_allowed`, `500 internal`,
`503 free_tier_limit` (today's free D1 quota is used up; try again after midnight UTC).

---

## GET /v1/health
* **Auth:** none
* **Response 200:** `{ "ok": true, "time": 1790907743462 }`

## POST /v1/register
Creates a new, empty, private account and returns its Kobel ID. This is how the app signs people up automatically.
It is the only endpoint that needs no ID, so it is limited (see SECURITY.md).

* **Auth:** none
* **Body (optional):** `{ "name": "Hytyei" }`. If the name is missing, invalid or already taken, a free one such as `Player-K3M9` is generated.
* **Response 201:** `{ "id": "KB-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX", "user": { "name": "Player-K3M9", "visible": false } }`
  The ID is shown **only in this response**; the database keeps just its SHA-256 hash. New accounts are hidden from the league table until the owner of the account opts in (`PATCH /v1/me`).
* **Errors:** `400 invalid_request` / `invalid_json`, `403 registration_closed`, `413 too_large`, `429 rate_limited` (per caller and per day, and an overall daily cap), `503 try_again`

## GET /v1/me
* **Auth:** required
* **Response 200:** `{ "user": { "name": "Hadi", "visible": true } }` (`visible`: shown on other players' league tables)
* **Errors:** `401 unauthorized`

## GET /v1/leaderboard?range=week|month|all
League table for the "Table" screen.

* **Auth:** required
* **Response 200:** `{ "range": "week", "rows": [ { "name": "Sara", "points": 120, "streak": 3, "avatar": "owl", "isMe": false } ] }` (sorted, best first)
* **Notes:** `range` defaults to `week`; any other value is treated as `week`. Only name, avatar, points and streak are returned, and only for players who chose to be visible (plus you).
* **Errors:** `401 unauthorized`

## PATCH /v1/me
Changes the display name and/or the league-table visibility. Progress is not affected (data is linked by user id, not by name).

* **Auth:** required
* **Body:** `{ "name": "Hytyei", "visible": true }`: both optional, at least one required. Name: 2 to 24 characters, letters, numbers, space, `.` `-` `_`; unique ignoring upper/lower case
* **Response 200:** `{ "user": { "name": "Hytyei", "visible": true } }`
* **Errors:** `400 invalid_request`, `401 unauthorized`, `409 name_taken`

## GET /v1/notices
Newest 30 notices for the app's notification inbox.

* **Auth:** required
* **Response 200:** `{ "notices": [ { "id": 3, "kind": "update", "title": "Kobel 2.11", "body": "…", "t": 1790907743000 } ] }`
* **Errors:** `401 unauthorized`

## POST /v1/sync
Sends changes and receives changes in one call.

* **Auth:** required
* **Request body**

```json
{
  "since": 1790907000000,
  "cards":   [ { "id": "w4k2uoakhjr", "type": "w", "lesson": "Session 1", "date": "2026-10-01", "u": 1790907743000,
                 "de": "Hund", "art": "der", "pl": "-e", "forms": "", "en": "dog", "ex": "Der {{Hund}} schläft.", "exEn": "The dog sleeps.",
                 "note": "", "sentence": "", "topic": "", "hint": "",
                 "due": 0, "iv": 0, "ease": 2.5, "reps": 0, "lapses": 0, "seen": 0, "ok": 0, "bad": 0, "susp": 0, "bury": 0 } ],
  "rules":   [ { "id": "r1", "topic": "Akkusativ", "lesson": "Session 2", "text": "der → den", "u": 1790907743000 } ],
  "deleted": [ { "id": "w123", "k": "c", "u": 1790907743000 } ],
  "profile": { "u": 1790907743000, "data": { "stats": {}, "games": {}, "settings": {} } }
}
```

| Field | Rules |
| --- | --- |
| `since` | whole number ≥ 0: the `serverTime` from the previous sync (0 = everything) |
| `cards` / `rules` / `deleted` | optional lists; **together at most 40 items** |
| `cards[].id`, `rules[].id` | 1–40 characters: letters, digits, `-`, `_` |
| `cards[].type` | `"w"` (vocabulary) or `"g"` (grammar gap sentence) |
| `cards[].u`, `rules[].u`, `deleted[].u`, `profile.u` | the client's edit time in ms; the newest edit wins |
| text fields | trimmed; `lesson` required (≤ 80), `de` ≤ 120, `en` ≤ 200, `ex`/`exEn`/`note`/`sentence` ≤ 300 |
| `type="w"` | needs `de` and `en`; `art` is `""`, `der`, `die` or `das` |
| `type="g"` | `sentence` must contain a gap like `{{den}}` |
| `ease` 1–4, `iv` 0–36500, `susp` 0/1, counters ≥ 0 | other numeric fields are range-checked |
| `deleted[].k` | `"c"` card or `"r"` rule |
| `profile.data` | only the keys `stats`, `games`, `settings` (objects), ≤ 200 KB |

* **Response 200**

```json
{
  "serverTime": 1790907743462,
  "cards": [ /* same shape as above, changed since `since` */ ],
  "rules": [ ],
  "deleted": [ { "id": "w123", "k": "c" } ],
  "profile": { "u": 1790907743000, "data": { "stats": {}, "games": {}, "settings": {} } }
}
```
`profile` is `null` if it did not change. Save `serverTime` as the next `since` (the app subtracts 5 s as a safety margin).

* **Errors:** `400 invalid_json`, `400 invalid_request` (names the field), `401 unauthorized`,
  `413 too_large` (body > 256 KB), `413 too_many_items` (> 40 items), `503 free_tier_limit`.

## GET /v1/export
* **Auth:** required
* **Response 200:** `{ "exportedAt": …, "user": {"name": …}, "cards": [...], "rules": [...], "profile": {...} | null }`:
  everything that is not deleted. Handy as a server-side backup.

## DELETE /v1/data
Deletes **all** of the caller's cards, rules and profile (the user itself remains).
* **Auth:** required
* **Response 200:** `{ "ok": true }`

## CORS
Browsers/WebViews may call the API only from origins listed in `ALLOWED_ORIGINS` (`wrangler.toml`).
The Android app's origin `https://appassets.androidplatform.net` is allowed by default. The Kobel ID, not CORS, is what protects the data.
