# Kobel

**Kobel is a gamified German learning app with a new approach: it is built from your own class notes.**

Instead of generic word decks, you add what you learned in class and Kobel turns it into spaced-repetition flashcards, minigames and grammar practice. Your progress plays out like a football season: weekly matchdays, leagues from the 3. Liga up to the Champions League, promotion and relegation, season exams and a trophy cabinet.

- Anki-style spaced repetition, about 80% vocabulary and 20% grammar
- 7 minigames with statistics (xG, clean sheets and more)
- Practise by subject: family, numbers, jobs, furniture and so on
- Works offline. Optional free cloud sync and a friends league table
- Android app, installed directly from [GitHub releases](https://github.com/Hytyei/Kobel/releases) (no Google Play)

Made by **Hytyei**, built with Claude (Anthropic).

## Install
Download `kobelapp.apk` from the latest [release](https://github.com/Hytyei/Kobel/releases/latest) and open it on your phone. Later updates arrive inside the app.

## For developers
`/android` Kotlin + Compose shell with the bundled web UI · `/backend` Cloudflare Worker · `/database` D1 migrations and class notes · `/docs` guides ([build](docs/BUILD_APK.md), [go live](docs/GO_LIVE.md), [leagues](docs/LEAGUES.md), [API](docs/API.md)).
