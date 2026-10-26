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


---

## Friends (version 2.4.0)

All friends endpoints need the Bearer header. Being friends is mutual. Only friends can see each other's public profile.

### POST /v1/friends/code
Makes (or replaces) your invite code. Single use, valid 7 days.
* **Response 200:** `{ "code": "ABCD-2345", "expiresAt": 1790907743000 }`

### POST /v1/friends
Adds the person who made the code.
* **Body:** `{ "code": "ABCD-2345" }` (case and dash do not matter)
* **Response 200:** `{ "friend": { "id": 7, "name": "Anna", ... } }`
* **Errors:** `400 invalid_request`, `400 own_code`, `404 code_not_found` (wrong or expired), `409 already_friends`, `409 friend_limit` (30 friends), `429 too_many_attempts` (20 tries per day).

### GET /v1/friends
* **Response 200:** `{ "friends": [ { "id", "name", "avatar", "xp", "streak", "week", "tier", "stage", "seen" } ] }`

### GET /v1/friends/{id}
A friend's public profile: whitelisted numbers only (XP, streak, league, career stage, records, minigame bests) plus `duels` (their overall record) and `versus` (your record against them).
* **Errors:** `404 not_found` (not your friend)

### DELETE /v1/friends/{id}
Removes the friendship for both people. Open duels between you are closed.
* **Response 200:** `{ "ok": true }`

## Duels (turn-based since 2.5.0)

Multiplayer minigames: `sprint`, `dash`, `plural`, `gap`, `scramble`. Since 2.5.0 duels are turn-based only (each player plays when they like, within 24 hours); `mode: "live"` is rejected with `400 invalid_request` on field `mode`. A duel has 9 questions and the score is goals: the number of correct answers, 0 to 9. Details: `docs/FRIENDS_AND_DUELS.md`.

### POST /v1/duels
* **Body:** `{ "friend": 7, "game": "sprint", "mode": "turn", "deck": [ ...9 questions... ] }`. The challenger builds the deck from their own cards.
* **Response 200:** `{ "duel": { id, game, mode, status, role, n, opponent, my, their, startAt, expiresAt, result, now }, "deck": [...] }` (right answers are never in the deck the client receives)
* **Errors:** `400 invalid_request` (names the field), `404 not_found` (not a friend), `409 already_open`, `409 too_many_open` (8), `429 too_many_duels` (40 per day)

### GET /v1/duels
Your open and recent duels. 

### GET /v1/duels/{id}
One duel (with the deck if you may play it).

### POST /v1/duels/{id}/accept, /decline
Only the challenged friend. `409 not_open` if it expired or was already answered.

### POST /v1/duels/{id}/start
Turn-based games only: starts your own clock.

### POST /v1/duels/{id}/answer
* **Body:** `{ "i": 0, "v": 2 }` where `i` is the question number (in order, no skipping) and `v` is an option number, short text, or `null` for "no answer".
* **Response 200:** `{ "correct": true, "goals": 4, "points": 130, "answer": "der Tisch", "duel": {...} }`
* **Errors:** `409 out_of_order`, `409 not_started`, `409 already_done`, `409 not_open`

Points are decided by the server from its own clock; the phone only says what was chosen.

## Streaks (version 2.5.0)
The app publishes its practice days in `stats.pub.days` (up to 90 local day numbers, whole numbers between 15000 and 40000) through `POST /v1/sync`. The server never receives times of day.

`GET /v1/friends` and `GET /v1/friends/{id}` add `streak2: { n, best, today }`: the run of consecutive days on which you and that friend both practised. It is alive while the latest shared day is today or yesterday. `today` says whether both of you have practised today.

## Study groups (version 2.5.0)
Up to 8 people, only friends can be added, you can be in up to 5 groups, 10 groups can be created per day. All routes need the Bearer access code and group membership.

### POST /v1/groups
* **Body:** `{ "name": "Sunday League", "members": [7, 9] }` (name 2 to 30 letters, numbers, spaces, `_ . ' & -`)
* **Response 200:** `{ "group": { id, name, owner, members: [...], streak: {n, best, today}, table: [...], rounds: [...] } }`
* **Errors:** `400 invalid_request`, `404 not_found` (not a friend), `409 group_full`, `409 too_many_groups`, `429`

### GET /v1/groups
Your groups (short form).

### GET /v1/groups/{id}
One group with members, group streak, the table and recent rounds. The table has P, W-D-L, GF:GA, GD, Pts (3 for a win, 1 for a draw, a missed round counts as a loss) and the last 5 results.

### PATCH /v1/groups/{id}
Owner only. Body `{ "name": "..." }`.

### DELETE /v1/groups/{id}
Owner only: deletes the group.

### POST /v1/groups/{id}/members
Owner only. Body `{ "user": 12 }` (a friend id). `409 group_full`.

### DELETE /v1/groups/{id}/members/{userId}
The owner can remove anyone; everyone can remove themselves. When the owner leaves, the group moves to the longest member; when the last member leaves the group is deleted.

### POST /v1/groups/{id}/games
Starts a round. Body `{ "game": "sprint", "deck": [ ...9 questions... ] }`. A round lasts 24 hours; at most 3 rounds are open at once. Round results stay hidden until you have finished it or the round has ended.

### GET /v1/groups/{id}/games/{gid}, POST .../start, POST .../answer
Same shape as duels (`i`, `v`; response includes `goals`).

### POST /v1/groups/{id}/ping (version 3.2.0, migration 0006)
Any member sends a notification to the other members ("time to practise"). Auth: Bearer access code, members only.
* **Body:** `{ "kind": "practise" | "round" | "streak" | "custom", "text": "..." }`. `text` is only used (and required) for `custom`: 1 to 60 characters, `<` `>` and control characters are removed, links are refused.
* **Response 201:** `{ "ok": true, "sent": 2, "next_at": 1760000600000 }` (`sent` = other members).
* **Errors:** `400 invalid_request` (kind/text), `401`, `404 not_found` (not a member), `409 group_too_small`, `429 ping_cooldown` (one ping per group every 10 minutes per member), `429 too_many_pings` (5 a day).
* Members receive it as an alert of type `group_ping` (`{ group, groupName, name, kind, text }`); the sender does not.

## Alerts (version 2.5.0)

### GET /v1/alerts?since=<ms>
The feed the phone polls for notifications. `since` is clamped to the last 7 days, at most 50 items are returned, and only your own data appears.
* **Response 200:** `{ "alerts": [ { id, type, ts, ... } ], "now": 1760000000000, "since": 1759990000000 }`
* **Types:** `friend` (someone added you), `duel_invite`, `duel_turn`, `duel_result`, `group_added`, `group_round`, `group_result`, `group_ping` (3.2.0). The `id` is stable so the phone can show each alert once.


## Accounts (version 3.4.0, migration 0007)
See `docs/AUTH.md` for the idea. Every endpoint below returns the same user shape:
`{ "id": 7, "name": "Maren_K", "username": "Maren_K", "badge": null, "visible": true, "hasPassword": true, "google": null, "legacy": false }`
(`badge` is `"founder"` only for the owner; `google` is a masked e-mail such as `ma***@gmail.com` or `null`; `legacy` is true while the account has neither username nor Google). All endpoints accept a **session token** (`kbs_…`) or an old Kobel ID as `Authorization: Bearer …`.

### POST /v1/auth/signup
* **Auth:** none (rate limited per connection per day and overall per day)
* **Body:** `{ "username": "Maren_K", "password": "<64 hex chars: the key the app derives from the password>", "label": "Pixel 8" (optional), "founderKey": "…" (only to claim the founder name) }`
* **Response 201:** `{ "token": "kbs_…", "user": { … } }`
* **Errors:** `400 invalid_username` / `invalid_password` / `invalid_request`, `403 reserved` / `registration_closed`, `409 taken`, `429 rate_limited`

### POST /v1/auth/login
* **Auth:** none
* **Body:** `{ "username": "Maren_K", "password": "<64 hex>", "label": "…" }`
* **Response 200:** `{ "token": "kbs_…", "user": { … } }`
* **Errors:** `401 invalid_credentials` (the same message for a wrong name and a wrong password), `429 rate_limited` (too many connections per hour, or 8 wrong tries per username per hour)

### POST /v1/auth/logout
* **Auth:** required. Ends this session. **Response 200:** `{ "ok": true }`

### GET /v1/auth/username?u=Maren_K
Live "is it free?" check while typing.
* **Auth:** none (limited per connection per hour)
* **Response 200:** `{ "available": true }` or `{ "available": false, "reason": "taken" | "reserved" | "invalid_username" }`
* **Errors:** `429 rate_limited`

### POST /v1/me/username
* **Auth:** required
* **Body:** `{ "username": "Maren_K", "founderKey": "…" (optional) }`. Allowed once a week (not for the founder key).
* **Response 200:** `{ "user": { … } }` · **Errors:** `400 invalid_username`, `403 reserved`, `409 taken`, `429 cooldown`

### POST /v1/me/password
* **Auth:** required (needs a username first)
* **Body:** `{ "password": "<64 hex>", "current": "<64 hex>" (required when a password already exists) }`
* **Response 200:** `{ "ok": true }`. Other devices are signed out. · **Errors:** `400 username_first` / `invalid_password`, `403 wrong_password`

### GET /v1/me
Now returns the account: `{ "user": { … } }` (same shape as above).

### POST /v1/auth/google/start
* **Auth:** none for sign-in, required for `"intent":"link"`
* **Body:** `{ "intent": "signin" | "link", "challenge": "<SHA-256 hex of a secret the app keeps>" }`
* **Response 200:** `{ "ref": "<64 hex>", "url": "https://accounts.google.com/o/oauth2/v2/auth?..." }` (the app opens it in the browser)
* **Errors:** `401 unauthorized` (link without being signed in), `400 invalid_request`, `429 rate_limited`, `503 google_not_configured`

### GET /v1/auth/google/callback
Called by Google, not by the app. Shows a small page that opens `kobel://auth?code=…` (or `?error=failed`).

### POST /v1/auth/google/poll
Backup way to finish Google sign-in when the `kobel://` link did not reach the app. Auth: none (the verifier is the proof).
Body: `{ "ref": "<64 hex from google/start>", "verifier": "<app secret>", "label": "Pixel 8" }`.
Response: `{ "pending": true }` while the sign-in is not finished, otherwise the same as `/v1/auth/exchange` (once).
Errors: 400 `invalid_request`, 401 `invalid_code`, 429 `rate_limited`.

### POST /v1/auth/exchange
* **Auth:** none
* **Body:** `{ "code": "<from kobel://auth>", "verifier": "<the secret the app kept>", "label": "…" }`
* **Response 200:** `{ "token": "kbs_…", "user": { … }, "isNew": true|false, "linked": true|false }`
* **Errors:** `401 invalid_code` (wrong, used or older than 2 minutes: codes work once)

### DELETE /v1/me/google
* **Auth:** required. Unlinks Google. **Response 200:** `{ "ok": true }` · **Errors:** `409 only_sign_in` (set a username and password first)

Users also carry `"badge": "founder" | null` in the rows of `/v1/leaderboard`, `/v1/friends`, `/v1/groups…` and `/v1/duels…`.
