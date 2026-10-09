package app.kobel

import android.content.Intent
import android.speech.tts.TextToSpeech
import android.webkit.JavascriptInterface
import org.json.JSONObject
import java.util.Locale

/**
 * The only door between the web UI and Android. The web app calls these methods as `KobelAndroid.xxx(...)`.
 * Only our own bundled page is ever loaded in the WebView (see MainActivity), so exposing this is safe.
 *
 * Why it exists:
 *  - German speech: uses the phone's text-to-speech engine and ONLY speaks if a German voice is installed,
 *    so words are never read out in English.
 *  - Saving and opening backup files through Android's file picker.
 */
class KobelBridge(private val activity: MainActivity) {

    private var tts: TextToSpeech? = null
    @Volatile private var germanReady = false

    init {
        tts = TextToSpeech(activity.applicationContext) { status ->
            if (status == TextToSpeech.SUCCESS) germanReady = checkGerman()
        }
    }

    private fun checkGerman(): Boolean {
        val engine = tts ?: return false
        val r = engine.setLanguage(Locale.GERMANY)
        return r != TextToSpeech.LANG_MISSING_DATA && r != TextToSpeech.LANG_NOT_SUPPORTED
    }

    /** Called when the app returns to the foreground (the user may just have installed a voice). */
    fun recheck() {
        if (tts != null) germanReady = checkGerman()
    }

    fun shutdown() {
        tts?.stop()
        tts?.shutdown()
        tts = null
    }

    @JavascriptInterface
    fun hasGerman(): Boolean = germanReady

    @JavascriptInterface
    fun speak(text: String, rate: Double) {
        val engine = tts ?: return
        if (!germanReady) return
        engine.language = Locale.GERMANY
        engine.setSpeechRate(rate.toFloat().coerceIn(0.3f, 1.5f))
        engine.speak(text.take(500), TextToSpeech.QUEUE_FLUSH, null, "kobel")
    }

    @JavascriptInterface
    fun stopSpeak() {
        tts?.stop()
    }

    @JavascriptInterface
    fun openTtsSettings() {
        activity.runOnUiThread {
            try {
                activity.startActivity(Intent(TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA))
            } catch (e: Exception) {
                try {
                    activity.startActivity(Intent("com.android.settings.TTS_SETTINGS"))
                } catch (_: Exception) {
                }
            }
        }
    }

    /** Version info for the Settings screen. */
    @JavascriptInterface
    fun config(): String = JSONObject()
        .put("version", activity.updater.versionName())
        .put("code", BuildConfig.VERSION_CODE)
        .put("repo", BuildConfig.GITHUB_REPO).toString()

    @JavascriptInterface
    fun checkUpdate() = activity.updater.check()

    @JavascriptInterface
    fun downloadUpdate() = activity.updater.download()

    @JavascriptInterface
    fun installUpdate() = activity.runOnUiThread { activity.updater.install() }

    /** Numbers for the home-screen widget (JSON, a few hundred bytes). */
    @JavascriptInterface
    fun setWidgetData(json: String) = WidgetCore.store(activity.applicationContext, json)

    @JavascriptInterface
    fun saveFile(name: String, text: String) {
        activity.runOnUiThread { activity.startSave(name, text) }
    }

    @JavascriptInterface
    fun pickFile() {
        activity.runOnUiThread { activity.startPick() }
    }
}
