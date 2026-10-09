# Build the Kobel APK with Android Studio

You only need this once. Afterwards updates arrive inside the app (see "Updates" below).

## 1. Open the project
1. Install **Android Studio** (current stable). Start it and let it install the Android SDK when asked.
2. `File > Open` and choose the **`android`** folder of this repo (not the repo root).
3. Wait for "Gradle sync" to finish (first time: a few minutes, needs internet).

## 2. Tell the app where your releases live
Open `android/gradle.properties` and set your GitHub repo (public), for example:
```
kobelRepo=hadi/kobel
```
Click "Sync Now". (Without this the in-app update check shows "Set your GitHub repository first".)

## 3. Run it on your phone (debug build)
1. Phone: Settings > About phone > tap "Build number" 7 times, then Settings > Developer options > turn on **USB debugging**.
2. Plug the phone in, accept the prompt on the phone.
3. Pick your phone in the device list at the top of Android Studio and press the green **Run** button.

The debug app is installed as "Kobel" with the id `app.kobel.german.debug`, next to any release build.

## 4. Make the real APK to share / install
1. `Build > Generate Signed App Bundle or APK > APK`.
2. **Create new** keystore (save the `.jks` file and its passwords somewhere safe, e.g. a password manager). Never commit it to GitHub. **If you lose this key you cannot update the installed app, you would have to uninstall it first.**
3. Choose `release`, finish. The file is `android/app/release/app-release.apk`.
4. Copy it to your phone and open it (allow "install unknown apps" when Android asks).

Optional, so the command line can sign too: create `android/keystore.properties` (git-ignored):
```
storeFile=../kobel.jks
storePassword=...
keyAlias=...
keyPassword=...
```

## 5. Updates through GitHub (no Google Play)
1. Raise the version when you build: `./gradlew assembleRelease -PversionCode=2 -PversionName=1.1.0` (or edit `versionCode`/`versionName` in `app/build.gradle.kts`). Always sign with the **same key**.
2. On GitHub: `Releases > Draft a new release`, tag `v1.1.0`, attach the APK (any file name ending in `.apk`).
   Optional: also attach `<name>.apk.sha256` containing the file's SHA-256 (`sha256sum app-release.apk`); the app then verifies the download.
3. In the app: **Einstellungen > App-Update > Nach Update suchen**, then Download, then Install. The app also checks silently about every 12 hours when opened.
Android itself refuses an APK that was not signed with your key, so nobody can swap in a fake update.

## Home-screen widget
Long-press the home screen > Widgets > **Kobel**: streak, daily goal, cards due, league progress. It refreshes whenever you use the app.

## Troubleshooting
- "SDK location not found": Android Studio creates `local.properties` itself; re-open the `android` folder.
- Gradle sync fails on versions: accept Android Studio's suggestion to update the Android Gradle Plugin.
- Update says "Could not check": repo must be public and contain at least one release.

## Widgets
Long-press the home screen → Widgets → Kobel. Three sizes: 4×2 (week + due), 2×2 (league and streak, e.g. "Bundesliga · 22 Weeks") and 4×4 (all-in-one: league, streak, form, statistics, trophies). They refresh whenever you open the app.
