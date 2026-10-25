# The web app calls these methods by name, so R8 must not rename or remove them.
-keepclassmembers class app.kobel.KobelBridge {
    @android.webkit.JavascriptInterface <methods>;
}
