# Path roadmap (3.3.0)

The Path turns your class notes into a guided course. Units follow the order of the notes; each unit has chapters of up to 8 words, then grammar chapters, then a review checkpoint.

## Stages

Units are split evenly into four stages. The stage changes how hard the nodes are.

| Stage | Name | Focus |
|---|---|---|
| 1 | Arrive | Short words, recognising meaning, no writing at all |
| 2 | Everyday German | Articles, plurals, small sentences, one short fill-in word in tests |
| 3 | Build up | Word order, gaps, polite forms (du/Sie), one short word to unscramble in tests |
| 4 | Confident | Mixed review, longer sentences, test pace |

## Levels inside a chapter

1. **Discover**: meet the new words (cards), then easy choice and true/false.
2. **Recognise**: choose the translation, listen and choose, pick the article, matching game, bubble pop. A few review words from earlier units join in.
3. **Apply**: drag matching, sort der/die/das, word search, memory, snake, plurals, gaps, odd one out.
4. **Sentences**: build sentences from blocks, fill sentence gaps, spot the mistake, snake and bubble games. At most one short fill-in word.
5. **Chapter test**: everything at test pace; needs 80%.

**Review checkpoint** (end of every unit): words of the unit mixed with earlier units, needs 75%.

## How freshness works (no blind repetition)

* **Spiral review.** Each node adds words from earlier units. They are picked round-robin: the least used first (`S.stats.pcy`), words that are due in the spaced-repetition schedule first.
* **Sentences rotate.** Sentence exercises are drawn from the whole path and counted as used, so the next node shows other sentences. Repeated sentences still change small details (country, name, number) through the sentence-variant engine.
* **No same exercise twice in a row for a word** (`S.stats.pkh` remembers the last kind per word).
* **At most two appearances of a word per node** (not counting the intro card and the game items).
* **Writing is capped at 12%** of a node (type, listen-and-spell, spell, missing letters). Levels 1 to 3 have none; tests use one or two short words (up to 6 letters, 7 for unscrambling).

## Answer options

`web/modules/distract.js` picks wrong answers of the same word class, similar length and word count, from nearby lessons, with plausible plural forms and look-alike gap options. On the 300-word benchmark the average length difference dropped from 3.1 to 2.8 characters and options from the same lesson or neighbours are preferred.

## Simulation (whole path, 409 nodes)

Writing share 1.8% overall, 11.8% in the busiest node; average 6.5 uses per word across the whole path, at most 16.
