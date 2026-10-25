# Widget preview (developer tool)

The home-screen widgets are drawn with plain `android.graphics` calls in `app/src/main/java/app/kobel/WidgetArt.kt`.
This folder renders the same code on a normal computer so you can see a widget without a phone:

```
./build.sh <out dir> [fonts dir]          # writes small.png, wide.png, big.png (+ *_de.png in German)
./build.sh <out dir> [fonts dir] raw      # writes transparent widget_preview_*.png (the pictures shown in the widget picker)
```

It needs a JDK and the Kotlin compiler jars (Gradle ships them in `$GRADLE_LIB`, default `/opt/gradle-8.14.3/lib`).
`src/AndroidGraphicsStubs.kt` is a tiny Java2D stand-in for the Android classes; it is not part of the app.
Pass the folder with the DFL Sans `.otf` files as `[fonts dir]` to see the real typeface (otherwise a system font is used and text is wider).
