package app.kobel

import android.content.Intent
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
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
        // Tactics Room dialogues: tell the page when a spoken line has finished so it can play the next one.
        tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(utteranceId: String?) {}
            override fun onDone(utteranceId: String?) = lineDone(utteranceId)
            @Deprecated("Deprecated in Java")
            override fun onError(utteranceId: String?) = lineDone(utteranceId)
            override fun onStop(utteranceId: String?, interrupted: Boolean) = lineDone(utteranceId)
        })
    }

    private fun lineDone(utteranceId: String?) {
        // Only ids we created ourselves (letters and digits) are ever passed on to the page.
        if (utteranceId == null || !utteranceId.matches(Regex("t[0-9]{1,9}"))) return
        activity.runJs("window.onKobelSpeakDone&&window.onKobelSpeakDone('$utteranceId')")
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
        engine.setPitch(1.0f) // dialogue lines may have changed it
        engine.speak(text.take(500), TextToSpeech.QUEUE_FLUSH, null, "kobel")
    }

    /** Like speak(), but with a pitch and an id; the page is told when this line is finished (see lineDone). */
    @JavascriptInterface
    fun speakLine(text: String, rate: Double, pitch: Double, id: String) {
        val engine = tts ?: return
        if (!germanReady || !id.matches(Regex("t[0-9]{1,9}"))) return
        engine.language = Locale.GERMANY
        engine.setSpeechRate(rate.toFloat().coerceIn(0.3f, 1.5f))
        engine.setPitch(pitch.toFloat().coerceIn(0.7f, 1.4f))
        engine.speak(text.take(500), TextToSpeech.QUEUE_FLUSH, null, id)
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
        .put("repo", BuildConfig.GITHUB_REPO)
        .put("api", BuildConfig.API_URL).toString()

    @JavascriptInterface
    fun checkUpdate() = activity.updater.check()

    @JavascriptInterface
    fun downloadUpdate() = activity.updater.download()

    @JavascriptInterface
    fun installUpdate() = activity.runOnUiThread { activity.updater.install() }

    /** Numbers for the home-screen widget (JSON, a few hundred bytes). */
    @JavascriptInterface
    fun setWidgetData(json: String) = WidgetCore.store(activity.applicationContext, json)

    /** Notification settings from the page (JSON). Starts or stops the background check. */
    @JavascriptInterface
    fun setNotify(json: String) {
        try {
            val j = JSONObject(json)
            NotifyPrefs.save(activity.applicationContext, j)
            NotifyPollJob.schedule(activity.applicationContext, j.optBoolean("on", true))
        } catch (_: Exception) {
        }
    }

    /** Android 13+: asks for the notification permission once. */
    @JavascriptInterface
    fun askNotifyPermission() {
        activity.runOnUiThread {
            if (android.os.Build.VERSION.SDK_INT >= 33 && !Notifier.canPost(activity)) {
                activity.requestPermissions(arrayOf(android.Manifest.permission.POST_NOTIFICATIONS), 41)
            }
        }
    }

    @JavascriptInterface
    fun saveFile(name: String, text: String) {
        activity.runOnUiThread { activity.startSave(name, text) }
    }

    @JavascriptInterface
    fun pickFile() {
        activity.runOnUiThread { activity.startPick() }
    }
}
