package app.kobel

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

/**
 * In-app updates from GitHub Releases (no Google Play needed).
 *
 * Flow:  check()  ->  asks api.github.com for the latest release of BuildConfig.GITHUB_REPO
 *        download() -> saves the .apk asset to the app's private cache (never to shared storage)
 *        install()  -> hands the file to Android's own installer; Android refuses it unless it is
 *                      signed with the SAME key as the installed app, so a fake file cannot replace Kobel.
 *
 * Security notes: HTTPS only, only github.com hosts are accepted, an optional <name>.apk.sha256 asset is verified,
 * and no tokens or secrets are used (the repository must be public, or releases must be public).
 */
class Updater(private val ctx: Context, private val report: (String, String) -> Unit) {

    data class Info(val tag: String, val notes: String, val apkUrl: String, val size: Long, val shaUrl: String?)

    @Volatile private var info: Info? = null
    @Volatile private var busy = false

    fun versionName(): String = ctx.packageManager.getPackageInfo(ctx.packageName, 0).versionName ?: "0"

    fun check() {
        if (busy) return
        busy = true
        Thread {
            try {
                val repo = BuildConfig.GITHUB_REPO
                if (!repo.matches(Regex("[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+")) || repo.startsWith("YOUR_")) {
                    send(JSONObject().put("error", "Set your GitHub repository first (see docs/DEPLOYMENT.md)"))
                    return@Thread
                }
                // The newest release that really has an .apk, newest version number first. ("releases/latest" skips
                // pre-releases and could point at an old build, so the list is read instead.)
                val list = org.json.JSONArray(httpGet("https://api.github.com/repos/$repo/releases?per_page=15"))
                var j: JSONObject? = null
                var best = -1
                for (k in 0 until list.length()) {
                    val r = list.getJSONObject(k)
                    if (r.optBoolean("draft")) continue
                    val arr = r.optJSONArray("assets") ?: continue
                    var has = false
                    for (x in 0 until arr.length()) if (arr.getJSONObject(x).optString("name").endsWith(".apk")) has = true
                    if (!has) continue
                    val cd = codeOf(r.optString("tag_name")) ?: codeOf(r.optString("name")) ?: 0
                    if (cd > best) { best = cd; j = r }
                }
                if (j == null) {
                    send(JSONObject().put("ok", true).put("newer", false).put("latest", "").put("current", versionName()).put("noApk", true))
                    return@Thread
                }
                val tag = j.optString("tag_name")
                val assets = j.optJSONArray("assets")
                var apk: JSONObject? = null
                var sha: String? = null
                if (assets != null) for (i in 0 until assets.length()) {
                    val a = assets.getJSONObject(i)
                    val n = a.optString("name")
                    if (n.endsWith(".apk") && apk == null) apk = a
                    if (n.endsWith(".apk.sha256")) sha = a.optString("browser_download_url")
                }
                val cur = versionName()
                val latestCode = codeOf(tag) ?: codeOf(j.optString("name"))
                val curCode = codeOf(cur) ?: BuildConfig.VERSION_CODE
                val newer = apk != null && latestCode != null && latestCode > curCode
                if (apk != null) info = Info(tag, j.optString("body"), apk.optString("browser_download_url"), apk.optLong("size"), sha)
                send(
                    JSONObject().put("ok", true).put("newer", newer).put("latest", tag).put("current", cur)
                        .put("noApk", apk == null).put("badTag", latestCode == null).put("latestCode", latestCode ?: 0).put("currentCode", curCode)
                        .put("notes", j.optString("body")).put("size", apk?.optLong("size") ?: 0),
                )
            } catch (e: Exception) {
                send(JSONObject().put("error", "Could not check for updates (${e.message ?: "offline"})"))
            } finally {
                busy = false
            }
        }.start()
    }

    fun download() {
        val i = info ?: return report("onKobelUpdateError", q("Check for updates first"))
        if (busy) return
        busy = true
        Thread {
            try {
                val dir = File(ctx.cacheDir, "updates").apply { mkdirs() }
                dir.listFiles()?.forEach { it.delete() }
                val out = File(dir, "kobel-update.apk")
                var conn = open(i.apkUrl)
                val total = if (conn.contentLengthLong > 0) conn.contentLengthLong else i.size
                val md = MessageDigest.getInstance("SHA-256")
                var done = 0L
                var last = -1
                conn.inputStream.use { input ->
                    out.outputStream().use { o ->
                        val buf = ByteArray(32 * 1024)
                        while (true) {
                            val n = input.read(buf)
                            if (n < 0) break
                            o.write(buf, 0, n); md.update(buf, 0, n); done += n
                            if (total > 0) {
                                val p = (done * 100 / total).toInt()
                                if (p != last) { last = p; report("onKobelUpdateProgress", p.toString()) }
                            }
                        }
                    }
                }
                conn.disconnect()
                if (i.shaUrl != null) {
                    val want = httpGet(i.shaUrl).trim().split(Regex("\\s+"))[0].lowercase()
                    val got = md.digest().joinToString("") { "%02x".format(it) }
                    if (want != got) { out.delete(); throw IllegalStateException("Checksum does not match") }
                }
                report("onKobelUpdateReady", "")
            } catch (e: Exception) {
                report("onKobelUpdateError", q("Download failed (${e.message ?: "network"})"))
            } finally {
                busy = false
            }
        }.start()
    }

    /** Opens Android's installer. The first time, Android asks you to allow Kobel to install apps. */
    fun install() {
        val f = File(File(ctx.cacheDir, "updates"), "kobel-update.apk")
        if (!f.exists()) return report("onKobelUpdateError", q("Download the update first"))
        if (Build.VERSION.SDK_INT >= 26 && !ctx.packageManager.canRequestPackageInstalls()) {
            ctx.startActivity(
                Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${ctx.packageName}"))
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            )
            return
        }
        val uri = FileProvider.getUriForFile(ctx, "${ctx.packageName}.fileprovider", f)
        ctx.startActivity(
            Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/vnd.android.package-archive")
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK),
        )
    }

    // ---- helpers ----
    private fun send(j: JSONObject) = report("onKobelUpdateInfo", JSONObject.quote(j.toString()))
    private fun q(s: String) = JSONObject.quote(s)

    private fun open(url: String): HttpURLConnection {
        var u = url
        repeat(5) {
            val c = URL(u).openConnection() as HttpURLConnection
            require(c.url.protocol == "https" && allowedHost(c.url.host)) { "Blocked address" }
            c.instanceFollowRedirects = false
            c.connectTimeout = 15000; c.readTimeout = 30000
            c.setRequestProperty("User-Agent", "Kobel-Updater")
            c.setRequestProperty("Accept", "application/vnd.github+json, application/octet-stream")
            val code = c.responseCode
            if (code in 300..399) { u = c.getHeaderField("Location") ?: error("Bad redirect"); c.disconnect() } else {
                if (code != 200) error("HTTP $code")
                return c
            }
        }
        error("Too many redirects")
    }

    private fun httpGet(url: String): String = open(url).let { c -> c.inputStream.bufferedReader().use { it.readText() }.also { c.disconnect() } }

    private fun allowedHost(h: String) =
        h == "api.github.com" || h == "github.com" || h.endsWith(".githubusercontent.com")

    /**
     * "v2.2.1" -> 20201: major*10000 + minor*100 + patch, the same formula build.gradle.kts uses for versionCode.
     * Comparing these numbers (instead of the text) keeps "2.10" from looking newer than "2.2.1".
     */
    private fun codeOf(tag: String): Int? {
        val m = Regex("(\\d+)(?:\\.(\\d+))?(?:\\.(\\d+))?").find(tag) ?: return null
        val n = m.groupValues.drop(1).map { it.toIntOrNull() ?: 0 }
        return n[0] * 10000 + n[1] * 100 + n[2]
    }
}
