# Question experience (3.1.0)

Source modules (merged into `index.html` by `python3 web/apply.py`):

| Module | What it does |
|---|---|
| `web/modules/qx.js`, `qx.css` | Slide-in and answer animations, minimal Bundesliga-style animated backdrop, progress dots, combo chip and milestones, letter tiles (spelling game and sentence builder), logo splash and kick-off wipe, result stamp |
| `web/modules/qv.js` | `du` / `Sie` / `ihr` and `er` / `sie` / `es` tags on the English side, sentence variants (country, name, job, number, colour...), new question types `reg`, `odd`, `fix`, `tsen`, helpers for the path builder |
| `web/modules/snd.js` | Sound engine: `tone()` and `sfx(kind, n)` through a compressor and low-pass; kinds `ok` (climbs a pentatonic step per combo), `bad`, `close`, `tick`, `slot`, `back`, `hint`, `whoosh`, `stamp`, `combo`, `win`, `lose` |

Rules worth knowing:

* The first time a sentence is shown it is exactly as in the class notes. From the second time on, small details change (`QX_V`, `qvVary`); add a new set in `QV_SETS` to vary more.
* Every card whose German contains du/Sie/ihr gets "(informal)", "(formal)" or "(you all)" added to its English once, at load and whenever notes are merged (`regFix`). Sentences with `it` get "(masculine/feminine/neuter it)".
* Letter tiles: tap a tile to place it in the next free slot, tap a placed tile to take it back, Backspace/Enter/letters work on a keyboard. The first wrong try keeps the right letters (green) and lets you fix the rest.
* The background and all motion switch off with the system setting "reduce motion". Sound follows the existing Settings > Sound switch.

## 3.2.0: no typing, more games

* There are no text fields in questions any more. `askType()` in `web/modules/games.js` turns every old typed question into a tile game (letter crumble with decoy letters, listen and spell, build the sentence). The streak Play-Off is tile-based too.
* Games: `wsearch` (word search), `snake` (cut a row of letters into words), `gapl` (missing letters), `memo` (memory pairs), `bubble` (bubble pop). They appear in Path levels 2 to 5 and as Minigames (Wortsuche, Wortschlange, Gedächtnis, Blasenjagd).
* Settings and Profile live in `web/modules/settings.js` and `settings.css`. Squad (the word library) is reached from Settings > General and from the Profile tiles.
* Study group nudge: `gpNudgeSheet()` in `social25.js` calls `POST /v1/groups/{id}/ping` (see `docs/API.md`). It needs migration `0006` and a Worker deploy.
