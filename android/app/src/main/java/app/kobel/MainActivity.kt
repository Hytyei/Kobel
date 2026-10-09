package app.kobel

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.viewinterop.AndroidView
import androidx.webkit.WebViewAssetLoader
import org.json.JSONObject
import java.io.InputStream

/**
 * Kobel: Jetpack Compose host for the bundled web UI (assets/www/index.html).
 * The UI works fully offline; the network is only used by optional cloud sync and update checks.
 */
class MainActivity : ComponentActivity() {

    private var webView: WebView? = null
    private lateinit var bridge: KobelBridge
    val updater: Updater by lazy { Updater(this) { fn, arg -> js("window.$fn&&window.$fn($arg)") } }
    private var pendingSave: String? = null

    private val saveLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { res ->
        val uri = res.data?.data
        val text = pendingSave
        pendingSave = null
        var ok = false
        if (res.resultCode == RESULT_OK && uri != null && text != null) {
            ok = try {
                contentResolver.openOutputStream(uri, "wt")?.use { it.write(text.toByteArray(Charsets.UTF_8)) } != null
            } catch (e: Exception) {
                false
            }
        }
        js("window.onKobelSaved&&window.onKobelSaved($ok)")
    }

    private val pickLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { res ->
        val uri = res.data?.data
        if (res.resultCode == RESULT_OK && uri != null) {
            val text = try {
                contentResolver.openInputStream(uri)?.use { readLimited(it, MAX_IMPORT_BYTES) }
            } catch (e: Exception) {
                null
            }
            if (text != null) js("window.onKobelPicked&&window.onKobelPicked(${JSONObject.quote(text)})")
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        bridge = KobelBridge(this)
        setContent {
            // Android's Back button first closes sheets/sessions inside the app, then leaves the app.
            BackHandler {
                webView?.evaluateJavascript("(window.onKobelBack&&window.onKobelBack())||false") { r ->
                    if (r != "true") finish()
                }
            }
            Box(
                Modifier
                    .fillMaxSize()
                    .background(Color(0xFF0B0B0B))
                    .systemBarsPadding()
                    .imePadding(),
            ) {
                AndroidView(modifier = Modifier.fillMaxSize(), factory = { ctx -> createWebView(ctx).also { webView = it } })
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun createWebView(ctx: Context): WebView {
        // Serves the bundled files from a fake https origin, so localStorage works and nothing touches file:// URLs.
        val loader = WebViewAssetLoader.Builder()
            .setDomain(APP_HOST)
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(ctx))
            .build()

        return WebView(ctx).apply {
            setBackgroundColor(0xFF0B0B0B.toInt())
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true          // localStorage holds your words and progress
                allowFileAccess = false
                allowContentAccess = false
                mixedContentMode = if (BuildConfig.DEBUG) WebSettings.MIXED_CONTENT_ALWAYS_ALLOW else WebSettings.MIXED_CONTENT_NEVER_ALLOW
                cacheMode = WebSettings.LOAD_DEFAULT
            }
            WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)
            addJavascriptInterface(bridge, "KobelAndroid")
            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                    loader.shouldInterceptRequest(request.url)

                // Never navigate away from our own page.
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean =
                    request.url.host != APP_HOST
            }
            loadUrl("https://$APP_HOST/assets/www/index.html")
        }
    }

    // ---- file save / open (called from KobelBridge) ----
    fun startSave(name: String, text: String) {
        pendingSave = text
        val mime = if (name.endsWith(".json")) "application/json" else "text/plain"
        saveLauncher.launch(
            Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE)
                type = mime
                putExtra(Intent.EXTRA_TITLE, name)
            },
        )
    }

    fun startPick() {
        pickLauncher.launch(
            Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE)
                type = "*/*"
            },
        )
    }

    private fun js(code: String) {
        runOnUiThread { webView?.evaluateJavascript(code, null) }
    }

    private fun readLimited(input: InputStream, max: Int): String? {
        val out = java.io.ByteArrayOutputStream()
        val buf = ByteArray(8192)
        var total = 0
        while (true) {
            val n = input.read(buf)
            if (n < 0) break
            total += n
            if (total > max) return null
            out.write(buf, 0, n)
        }
        return out.toString("UTF-8")
    }

    override fun onResume() {
        super.onResume()
        bridge.recheck()
        js("window.onKobelVoice&&window.onKobelVoice()")
    }

    override fun onDestroy() {
        bridge.shutdown()
        webView?.destroy()
        webView = null
        super.onDestroy()
    }

    companion object {
        private const val APP_HOST = "appassets.androidplatform.net"
        private const val MAX_IMPORT_BYTES = 5_000_000
    }
}
