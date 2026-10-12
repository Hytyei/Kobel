# Tactics Room (teaching section)

New tab **Taktik**: a manager explains every lesson from your class notes on a whiteboard, in a fixed beginner-friendly order.

## What the learner sees
* 17 "talks" (Matchday 1 to 17), each 6 to 10 boards: coach talk, word chips (tap to hear), tables (verb endings), formation boards (sentence shapes), spoken dialogues, quick checks, and a "Full time" board that starts a training session for that subject.
* Dialogues play line by line (two voices: different pitch), with a **Slow** switch. Tap a line to hear only that line.
* Progress is stored in `stats.teach` (so it is part of the normal profile sync/backup). Finishing a talk gives +30 XP once.
* Android Back closes the whiteboard first.

## Teaching order and why
1 Greetings, 2 Classroom, 3 Sounds & articles, 4 Introductions (sein, heißen), 5 Numbers, 6 Everyday verbs (regular endings, haben), 7 Questions, 8 Personal details, 9 Countries (aus / in), 10 Jobs, 11 Family (mein / meine), 12 ja / nein / doch, 13 Noun genders, 14 Furniture, 15 Describing & prices, 16 Vowel-change verbs, 17 Languages.
Each talk only uses grammar taught in an earlier talk.

## Content rules
* German text comes **only** from your class notes. `database/content/teaching/validate_teaching.py` checks every German word in the lessons against `database/content/*.notes` and fails if a word is missing.
* The explanations are in English (the app menu can be English or German).
* New dialogues are rebuilt from your own example sentences and vocabulary (names such as Sina, Jan, Lydia are from the notes).

## Changing a lesson
1. Edit `database/content/teaching/build_units.py`.
2. `python3 build_units.py` (writes `units.json`), then `python3 validate_teaching.py`.
3. The web page is assembled from `units.json` (the file is embedded in `index.html`).

## Android
`KobelBridge.speakLine(text, rate, pitch, id)` is an addition next to the existing `speak`. When a line ends, the app calls `window.onKobelSpeakDone(id)` in the page (ids are checked: only `t` + digits). If an older bridge is installed, the page falls back to a timer.
No backend, database, permission, signing or workflow changes.
