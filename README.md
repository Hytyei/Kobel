# Kobel

**Another way to learn German: built around the class notes of one learner.**

Most language apps start from a fixed course and ask you to follow it. Kobel starts from a person. It was made for one individual learning German at A1 level (with the textbook *Momente A1*), and everything inside it comes from the notes that learner wrote in class: the words, the plural forms, the example sentences, the grammar rules, the family, numbers, jobs and furniture lessons. Nothing is imported from a generic word list.

The idea is simple: **your own notes are the best curriculum you will ever have**, because they are exactly what your teacher chose to teach you, in the order you met it. Kobel's job is to make those notes stick.

## What it does with the notes
- **Spaced repetition.** Each word and grammar item is a flashcard that comes back just before you would forget it (about 80% vocabulary, 20% grammar).
- **Practice by subject.** Drill only family, numbers, jobs, furniture or any lesson you pick.
- **Seven minigames** built from the same cards, with football-style statistics (xG, clean sheets, minutes played).
- **Tactics Room.** A manager explains each lesson on a whiteboard, with spoken German dialogues you can follow line by line.
- **A football season for motivation.** Weekly matchdays, leagues from 3. Liga to the Champions League, promotion and relegation, season exams, a trophy cabinet, and a career path of small stages and goals so progress is visible every few days.
- **Records.** Personal bests, streaks and unusual statistics.
- **Friends.** Add friends with an invite code, see their public profile, and play minigames against them: live at the same time, or turn-based within 24 hours.
- **Cloud sync and auto-save.** Optional, free, and automatic at the interval you choose.
- **Works offline.** The app is yours; nothing needs an account or a form.

Languages: English or German menus. German speech only.

## Install (Android)
Download `kobelapp.apk` from the latest [release](https://github.com/Hytyei/Kobel/releases/latest) and open it. Later updates are offered inside the app. (There is no Google Play version.)

## Using it for your own notes
The built-in content is one learner's notes. Anyone can add their own: see [docs/ADDING_NOTES.md](docs/ADDING_NOTES.md).

## For developers
| Folder | What is in it |
|---|---|
| `/android` | Kotlin app shell that hosts the bundled web UI |
| `/backend` | Cloudflare Worker (free tier) for sync, league table, friends and duels |
| `/database` | D1 migrations, schema and the class notes content |
| `/docs` | Guides |

Guides: [build the APK](docs/BUILD_APK.md) · [go live](docs/GO_LIVE.md) · [local development](docs/LOCAL_DEVELOPMENT.md) · [architecture](docs/ARCHITECTURE.md) · [API](docs/API.md) · [security](docs/SECURITY.md) · [leagues](docs/LEAGUES.md) · [friends and duels](docs/FRIENDS_AND_DUELS.md) · [Tactics Room](docs/TACTICS_ROOM.md)

Made by **Hytyei**, built with Claude (Anthropic).
