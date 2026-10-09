# Icon and first-launch screen

The launcher icon is now your eagle artwork (adaptive icon: white eagle on a red gradient, plus round and themed variants). To replace it later, use Android Studio: right-click `app` > New > Image Asset. `assets/www/brand/logo.png` is the same logo for the welcome and About screens, and `brand/welcome.png` (optional, 1080 x 2400) is full-screen art behind the welcome screen.

# Your own icon and first-launch screen

## App icon
1. Design a square logo, 1024 x 1024 px (PNG). Keep the important part inside the middle 66% (Android crops the edges into a circle/squircle).
2. Android Studio: right-click `app` > **New > Image Asset**.
   * Icon type: *Launcher Icons (Adaptive and Legacy)*. Name: `ic_launcher`.
   * Foreground layer: choose your PNG. Background layer: a colour (for example `#0B0B0B`) or a second image.
   * Click **Next > Finish**. If it asks to overwrite existing files, say yes.
3. Rebuild the APK. (The current icon is only a placeholder.)

## First-launch (welcome) screen
The welcome screen is already built: logo, name, a language choice (English / Deutsch) and a **Kick off** button. It shows once.
To use your own artwork put files in `android/app/src/main/assets/www/brand/`:
* `welcome.png`: full-screen background, portrait, 1080 x 2400 px. Keep the middle clear for the logo and the bottom for the button.
* `logo.png`: square logo with transparent background, 512 x 512 px. It is also shown on the About page.

Then rebuild. To see the welcome screen again on your phone: Settings > Apps > Kobel > Storage > Clear data (this erases local progress, so save a backup file first).

## Android's own start-up splash
Android 12+ shows your app icon on a dark background for a moment before the app opens. It uses your launcher icon automatically, so step 1 covers it too.

## About page text
Edit the story in `android/app/src/main/assets/www/index.html`: search for `function vAbout` (English text first, German second).
The credit lines ("Made by Hytyei", "Built with Claude") are in the same function.
