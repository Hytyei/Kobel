# Tactics Room (teaching section)

New tab **Taktik**: a manager explains every lesson from your class notes on a whiteboard, in a fixed beginner-friendly order.

## What the learner sees
* 34 talks in four phases: Pre-season, First half, Second half, Extra time. Each phase is drawn as a formation on a tactics board: every talk is one player, and the pass line goes solid as talks are finished.
* A talk is 7 to 15 boards: coach talk, word chips (tap to hear), tables (verb endings), formation boards (sentence shapes), spoken dialogues, quick checks, and a "Full time" board that starts a training session for that subject. Every talk must end on a Full time board: that board is what marks it as finished.
* Dialogues play line by line (two voices: different pitch), with a **Slow** switch. Tap a line to hear only that line.
* Progress is stored in `stats.teach` by talk id, so reordering talks keeps it. Finishing a talk gives +30 XP once.
* Android Back closes the board first.

## Teaching order and why
Each talk only leans on what an earlier talk taught. The order lives in `PHASES` in `build_units.py`.
1. Pre-season: greetings, sounds and articles, introductions, numbers, everyday verbs, questions, asking and thanking, personal details.
2. First half: countries, jobs, family, ja / nein / doch, noun genders, ein / kein, furniture, big numbers, describing and prices.
3. Second half: vowel-change verbs, languages, colours, describing things, everyday objects, business cards, office, plurals, ordering online.
4. Extra time: accusative, phone calls, können, how well, free time and days, telling the time, food, café.

Asking comes early because a beginner needs "how do you say that?" first. ein / kein comes before the first talk that uses it, big numbers before prices, and the vowel-change verbs before sehen and sprechen are used.

## Content rules
* German text comes **only** from your class notes. `database/content/teaching/validate_teaching.py` checks every German word in the lessons against `database/content/*.notes` and `web/modules/notes.js` and fails if a word is missing.
* The explanations are in English (the app menu can be English or German).
* New dialogues are rebuilt from your own example sentences and vocabulary (names such as Sina, Jan, Lydia are from the notes).

## Changing a lesson
1. Edit `database/content/teaching/build_units.py` (semester 1) or `units_a12.json` (semester 2).
2. `python3 build_units.py` (writes `units.json`), then `python3 validate_teaching.py`.
3. The web page is assembled from `units.json` (the file is embedded in `index.html`).

## Android
`KobelBridge.speakLine(text, rate, pitch, id)` is an addition next to the existing `speak`. When a line ends, the app calls `window.onKobelSpeakDone(id)` in the page (ids are checked: only `t` + digits). If an older bridge is installed, the page falls back to a timer.
No backend, database, permission, signing or workflow changes.
