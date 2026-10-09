# Deployment: from zero to an APK on your phone

You will not need a credit card. Allow about 30 minutes the first time.
Commands are typed in a terminal (Windows: PowerShell; Mac/Linux: Terminal).

> **You can skip steps 1–7 and still use the app.** It works offline without the cloud. Do them when you want sync between devices.

## 0. Install the tools (once)

1. **Node.js 22 or newer**: https://nodejs.org (choose the LTS download). Check: `node --version`
2. **Android Studio**: https://developer.android.com/studio (for the APK, step 8)
3. **Git** (optional but recommended): https://git-scm.com

## 1. Create the Cloudflare account and project

1. Go to https://dash.cloudflare.com/sign-up and create a **free** account (email + password; no card).
2. In a terminal:
   ```
   cd backend
   npm install
   npx wrangler login
   ```
   A browser tab opens. Click **Allow**. (`wrangler` is Cloudflare's command-line tool; `npx` runs it for you.)
   The "project" is the Worker described by `backend/wrangler.toml` (name `kobel-api`); it is created in step 4.

## 2. Create the D1 database

```
npx wrangler d1 create kobel-db
```
The output contains a block like:
```
[[d1_databases]]
binding = "DB"
database_name = "kobel-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```
Open `backend/wrangler.toml` and replace `REPLACE_WITH_YOUR_DATABASE_ID` with that `database_id`.
(The id is an address, not a password, so it is safe in GitHub.)

## 3. Apply the database migrations

```
npx wrangler d1 migrations apply kobel-db --remote
```
Answer `y` when asked. This creates the tables from `database/migrations/0001_init.sql`.

## 4. Deploy the Worker

```
npx wrangler deploy
```
The first time it asks you to pick a free `workers.dev` subdomain. At the end it prints your API address:
```
https://kobel-api.<your-subdomain>.workers.dev
```
Check that it is alive (the second command should print `{"ok":true,...}`):
```
curl https://kobel-api.<your-subdomain>.workers.dev/v1/health
```

## 5. Configure environment variables and secrets

**There are no secrets to configure.** Kobel IDs are random and only their hashes live in the database.
The only setting is `ALLOWED_ORIGINS` in `wrangler.toml` (already correct for the Android app). Do not add secrets to the APK or to GitHub.

## 6. Create your user and Kobel ID

Still in `backend/`:
```
node scripts/create-user.mjs "Hadi" --remote
```
It prints a **Kobel ID** once (looks like `KB-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX`). Copy it somewhere safe. Repeat with another name for each person (2–3 users).
Test it:
```
curl -H "Authorization: Bearer kb_YOUR_CODE" https://kobel-api.<your-subdomain>.workers.dev/v1/me
```
Lost a code? Create a new user (or run `npx wrangler d1 execute kobel-db --remote --command "DELETE FROM users WHERE name='Hadi'"` first; this also deletes that user's synced data).

## 7. Connect the app to the production API

You do this inside the app, nothing is compiled in: **Settings → Cloud sync → server address + Kobel ID → Connect and sync.**
Use the `workers.dev` address from step 4. On a second device, enter the same address and the same code: your words and progress appear.

## 8. Build the APK

1. Open Android Studio → **Open** → choose the `android/` folder. Wait for "Gradle sync" to finish (first time downloads a lot; accept any "install missing SDK" prompts).
2. **Quick test build:** menu **Build → Build Bundle(s) / APK(s) → Build APK(s)**. When done click **locate**:
   `android/app/build/outputs/apk/debug/app-debug.apk`. This one is signed with a debug key and installs fine on your phone.
3. **Release build (smaller, recommended for daily use):**
   1. Create a signing key once (keep the file and passwords safe, and **never commit them**):
      ```
      keytool -genkeypair -v -keystore kobel-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias kobel
      ```
   2. Create `android/keystore.properties` (it is git-ignored):
      ```
      storeFile=../kobel-release.jks
      storePassword=YOUR_PASSWORD
      keyAlias=kobel
      keyPassword=YOUR_PASSWORD
      ```
      (Place `kobel-release.jks` in the `android/` folder's parent, or adjust the path.)
   3. **Build → Build Bundle(s) / APK(s) → Build APK(s)**, choose the **release** variant (Build Variants panel), or run `./gradlew assembleRelease` in `android/`.
      Output: `android/app/build/outputs/apk/release/app-release.apk`.
   You must always sign updates with the same key, or Android will refuse to update the installed app.

## 9. Install and test on a physical phone

1. On the phone: **Settings → Apps → Special access → Install unknown apps**, and allow the app you will use to open the APK (e.g. Files or Chrome).
2. Get the APK onto the phone: send it to yourself (Telegram "Saved Messages", Drive, email) or connect USB and copy it.
3. Tap the APK → **Install**. (With USB debugging on you can instead run `adb install app-debug.apk`.)
4. Open Kobel. Check:
   * the Nest screen shows your lessons and words;
   * **Settings → Speak German aloud**: it should say "German voice ready". Tap **Play**. If it says no German voice, tap **Install voice** and install German in the text-to-speech settings;
   * Settings → Cloud sync → Connect, then change something, sync, and look at it on a second device;
   * Settings → Save backup file works (pick a folder).

## Updating later

* **Backend change:** `cd backend && npx wrangler deploy` (and `npx wrangler d1 migrations apply kobel-db --remote` if you added a migration).
* **App change:** increase `versionCode`/`versionName` in `android/app/build.gradle.kts`, rebuild the APK with the same key, and install it over the old one (your data stays).
