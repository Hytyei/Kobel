# Go live: GitHub and Cloudflare, step by step

Nothing here costs money and no credit card is needed. Do the steps in order. Each step tells you **what you need**, **what to do** and **what to write down**. Keep one text file called `kobel-info.txt` on your computer for the things you write down (never upload it).

The app works without any of this. GitHub gives you **updates inside the app**. Cloudflare gives you **sync between your phones and the league table with friends**.

---
## Part A: Tools on your computer (once)
Need: a Windows/Mac computer.
1. Install **Node.js** (LTS): https://nodejs.org
2. Install **GitHub Desktop**: https://desktop.github.com (this lets you upload code without typing git commands)
3. Android Studio is already installed if you built the APK.

---
## Part B: GitHub (where your app updates live)

### B1. Create your account
Need: an email address.
Go to https://github.com/signup, pick a username, confirm your email.
**Write down:** your GitHub username (`Hytyei`). Your repository is https://github.com/Hytyei/Kobel .

### B2. Create the repository (the project folder on GitHub)
1. Click the **+** (top right) > **New repository**.
2. Name: `kobel`. Choose **Public**. Do not tick "Add a README".
3. Click **Create repository**.

Why public: the app downloads updates without a login, which only works for public repositories. Your class notes are part of the code, so they are public too. If that bothers you, remove the notes from `database/content` and from the app's built-in lessons before uploading, and import them in the app instead.

**Write down:** `Hytyei/Kobel`.

### B3. Upload the project
1. Unzip `kobel-repo.zip` to a folder, for example `Documents/kobel`.
2. Open GitHub Desktop, sign in, then **File > Add local repository**, choose the folder. If it says "not a repository", click **create a repository** and accept.
3. Type a summary like `First upload`, click **Commit to main**, then **Publish repository** (untick "Keep this code private").

Safe by design: the secret files (`*.jks`, `keystore.properties`, `.dev.vars`) are in `.gitignore`, so they are never uploaded.

### B4. Tell the app where to look for updates
Open `android/gradle.properties` and change the line to your name:
```
kobelRepo=Hytyei/Kobel
```
Save, then in GitHub Desktop commit again.

### B5. Make your signing key (once, very important)
Follow `docs/BUILD_APK.md` step 4 ("Make the real APK"). Android Studio makes a `.jks` file and asks for a password.
**Write down:** the password and key alias. **Copy the `.jks` file to a USB stick or cloud drive.** If you lose it you can never update the installed app, only reinstall.

### B6. Publish version 2.10
1. Build the signed release APK (BUILD_APK.md). Rename the file to `kobelapp.apk` (always this exact name).
2. On GitHub open your repository > **Releases** > **Draft a new release**.
3. Choose a tag: type `v2.10`, click **Create new tag**. Title: `Kobel 2.10`.
4. Drag `kobelapp.apk` into the box. Click **Publish release**.

### B7. Every later update
1. Change `versionCode` (e.g. 211) and `versionName` (e.g. `2.11`) in `android/app/build.gradle.kts`.
2. Build, sign with the same key, release with tag `v2.11` and the new APK.
3. On your phone: Kobel > Settings > **Nach Update suchen**, then download and install.

---
## Part C: Cloudflare (sync and league table)

### C1. Create your account
Need: an email address. https://dash.cloudflare.com/sign-up, free plan, confirm the email.

### C2. Log in from your computer
Open a terminal (Windows: search "PowerShell"; Mac: "Terminal"):
```
cd path/to/kobel/backend
npm install
npx wrangler login
```
A browser tab opens, click **Allow**.

### C3. Create the database
```
npx wrangler d1 create kobel-db
```
It prints a block containing `database_id = "xxxxxxxx-..."`.
Open `backend/wrangler.toml` in a text editor, replace `REPLACE_WITH_YOUR_DATABASE_ID` with that id, save.
**Write down:** the database id. (It is an address, not a password; it is safe on GitHub.)

### C4. Create the tables
```
npx wrangler d1 migrations apply kobel-db --remote
```
Type `y` when asked.

### C5. Put the server online
```
npx wrangler deploy
```
The first time it asks you to choose a free subdomain name; choose anything. It then prints your server address:
`https://kobel-api.YOURSUBDOMAIN.workers.dev`
**Write down:** that address.
Test: open `https://kobel-api.YOURSUBDOMAIN.workers.dev/v1/health` in a browser. You should see `{"ok":true,...}`.

### C6. Make a Kobel ID for each person
```
node scripts/create-user.mjs "Hadi" --remote
```
It shows a code starting with `kb_`. It is shown **once**. Write it down. Repeat with each friend's name and give them their own code (privately, not in a public chat).

### C7. Connect the app
On the phone: Kobel > Settings > **Cloud sync**. Tap **Enter my ID**, type the server address and the Kobel ID, tap **Load my data**.
On a second phone enter the same two things and your words and progress appear. Friends use their own code and then see each other in the Table > League table.

### C8. Free limits (so nothing surprises you)
Cloudflare's free plan allows about 100,000 requests per day and generous database use. Three people use a tiny fraction. If a limit is ever hit, the app says so and works again after midnight UTC. Nothing ever charges you because no card is attached.

---
## Adding new lessons later (sessions)
1. After class, write your notes in the Kobel format (see `docs/ADDING_NOTES.md`; Claude can convert raw notes for you).
2. Save them as a new file in `database/content/`, for example `005-your-topic.notes`.
3. **Inside the app:** copy the notes into the app's built-in lessons list and publish a new version (Part B7). Everyone who updates gets the lesson, and it works offline because it is inside the app.
4. **Quick way without a new APK:** in the app open Squad (Kader) > Import and paste the notes. Known words keep their progress; sync sends them to your other phones.
Your progress is tied to each word's fixed id, so adding lessons never deletes or changes earlier ones.

---
## Your information sheet (keep it private)
| Thing | Where it is used | Example |
| --- | --- | --- |
| GitHub username | `kobelRepo` in `android/gradle.properties` | `hytyei/kobel` |
| Keystore file + password + alias | signing the APK | `kobel.jks` |
| Cloudflare database id | `backend/wrangler.toml` | `a1b2c3...` |
| Server address | app > Settings > Cloud sync | `https://kobel-api.xxx.workers.dev` |
| Kobel IDs | app > Profile (or Settings > Cloud sync) | `KB-...` |

---
## Notifications for your users
Updates found on GitHub appear in the app's inbox (bell icon) automatically, with your release notes. To send your own message (news, tips, update details) to everyone connected to your server:
```
cd backend
node scripts/post-notice.mjs "Kobel 2.11 is out" "New lessons and a faster Sprint game." --remote --kind update
```
Kinds: `news`, `update`, `tip`. Users see it the next time the app opens. (Phone-style pop-up notifications would need Google's Firebase service; the in-app inbox needs nothing extra.)

## Changing a username
Users change it in the app: Profile > Edit. It only edits the display name on your server (names must be unique). Progress is stored by an internal id, so nothing is lost.

## Using the same account on a second phone (Kobel ID)

Your **Kobel ID** is your account. It is shown in the app under **Profile** (tap *Show* or *Copy*).

1. Install Kobel on the new phone.
2. On the first screen tap **I already have an ID** (later: Settings > Cloud sync > Enter my ID).
3. Enter the server address and your Kobel ID, then **Load my data**.

Your words, progress, league, trophies and profile come back. If you set `kobelApi=https://kobel-api.yourname.workers.dev` in `android/gradle.properties` before building the APK, the server address is built in and the phone only asks for the ID. The address is not a secret; the ID is, so keep it private. IDs from older versions (`kb_...`) still work.

## Practice: what avoids repeats

* A card is never asked twice in a row; a missed card comes back a few cards later in a different exercise type.
* The same exercise type does not appear three times in a row.
* Timed games draw from a shuffled deck: a card only returns after the other cards were shown.
* Wrong options in multiple choice and gap exercises look like the right one: same word type and subject, similar spelling, other forms of the same word (komme / kommst / kommt / kommen, der / die / das / dem).
