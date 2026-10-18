# DFL Sans fonts (not stored in git)

Kobel's look uses **DFL Sans**, the official Bundesliga typeface (© Rosetta Type Foundry, DFL, MUTABOR).
The font files are licensed, so they are listed in `.gitignore` and are **not** committed to this public repository.

Put these seven files into this folder before you build the APK:

```
DFL_Sans.otf            DFL_Sans_Light.otf       DFL_Sans_Italic.otf
DFL_Sans_Bold.otf       DFL_Sans_Extrabold.otf
DFL_Sans_Condensed.otf  DFL_Sans_Condensed_Bold.otf
```

Without them the app still works: it falls back to the system condensed and sans-serif fonts.
Note: an APK that contains the fonts also distributes them. Keep that in mind before publishing a release
(GitHub releases of this public repository are public) and check the licence you received with the files.
