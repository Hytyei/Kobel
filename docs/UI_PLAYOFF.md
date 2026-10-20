# UI layer, celebrations and the streak Play-Off (2.5.0)

All UI code lives in `web/modules/` and is merged into `android/app/src/main/assets/www/index.html` by `python3 web/apply.py`
(idempotent: run it again after editing a module).

| File | What it does |
|---|---|
| `ui3.css`, `ui3.js` | The design: sticky top bar with scrolling nav, club hero banner, league ticker, fixture rows, stat tiles, comparison bars, standings tables with left stripe. Replaces the old shell, home and table views. |
| `fx3.css`, `fx3.js` | Full-screen celebrations: promotion/relegation, streak (with milestones), level up, daily goal, matchday result, promotion zone, career stage, path level/chapter/unit. Queue, sounds, vibration, confetti; respects reduced-motion. |
| `playoff.js` | Streak Play-Off. |
| `patches.py` | Small in-place hooks (addXP, careerCheck, closeMatchday, path finish, boot). |

## Play-Off rules
- Offered when the streak is 2+ days and either (a) it is after 17:00 and nothing was practised today, or (b) a day was missed and no joker is left.
- One attempt per day. Opening it commits you (no re-rolling the question).
- Question comes from the words, sentences and grammar gaps you miss most. You must **type** the answer: no options, no hints, no hear-it button, a running clock (100 s sentence, 45 s noun + plural, 35 s gap).
- Win: the streak is kept (case b: the missed day is covered). Loss: the streak resets to 0.
- Local test: `node backend/test/local-server.mjs 8799 android/app/src/main/assets/www/index.html`, open `http://127.0.0.1:8799/#debug`.

## Fonts
DFL Sans files go in `android/app/src/main/assets/www/fonts/` (git-ignored, see the README there).
