# Adding new class notes

The app is built around **your** lessons. Two ways to add the notes from a new class:

## A. Inside the app (no rebuild, works today)

1. **Words → Import → Copy prompt for Claude**, paste the prompt into a chat, add your raw class notes under it.
2. Paste Claude's reply into the import box → **Add to library**.
   Known words are updated and keep their progress; new words appear as acorns. With cloud sync on, your other devices get them too.
3. During class you can also use **Words → Quick add** for single lines.

## B. Built into the app file (for the developer path)

In `android/app/src/main/assets/www/index.html` find `const BATCHES=[SEED];` and add each new class as another string:

```js
const NOTES_7 = `@lesson Session 7 · Class title
@subject Family
@date 2026-10-08
der Job (Pl. -s) = job | Ich habe zwei {{Jobs}}. | I have two jobs.`;
const BATCHES=[SEED, N4, N5, N6, NOTES_7];
```
On the next start, every installed copy merges the new batch automatically (existing progress is untouched, nothing is added twice).

## Notes format

```
@lesson Session 7 · Title          start of a class (kept for your records)
@subject Family                     the subject the lines below belong to (this is what the app groups by)
@date 2026-10-08                    class date (so lessons sort correctly)
german (details) = english | example | example translation | note
der Job (Pl. -s) = job | Ich habe zwei {{Jobs}}. | I have two jobs.
gehen (geht, ging, ist gegangen) = to go
@grammar Verb haben                 a grammar topic
! ich habe · du hast · er/sie/es hat       a rule (shown in the Grammar tab)
Ich {{habe}} zwei Jobs. | I have two jobs. | ich → habe     gap sentence | translation | hint
```
* Nouns start with `der/die/das`. Put the plural in parentheses: `(Pl. -e)`, `(Pl. -"e)`, `(Pl. -n)`, `(Pl. -er)`, `(Pl. -s)`, `(Pl. -)` or the whole word.
* Verb forms go in parentheses without `Pl.`.
* `{{ }}` marks the gap word for fill-in games.
* Only the first two fields (German, English) are required.

## Matchday clock (notifications and widgets, 3.5.0)

The day is a match: kick-off 00:00, half-time 12:00, final whistle at midnight. While your streak is alive from yesterday and you have not practised today, the phone shows up to five calls (each once per day, a later one replaces the earlier one):

| Time | Call |
|---|---|
| 17:00 | Second half is under way |
| 20:30 | 75th minute: time for a goal |
| 22:00 | 85th minute: it is getting tight |
| 23:00 | 90th minute: final whistle incoming! (pop-up channel "Final whistle") |
| 23:40 | Injury time! |

Practising cancels the call that is still showing. Android decides when the background job runs (about every 15 to 30 minutes, later in battery saver), so a call can arrive a little late. The widgets draw the match clock (minute, time to the whistle, a kick-off to full-time line with a half-time mark; green "full time" once you played today) and refresh about every 30 minutes and whenever the app pushes new numbers.
