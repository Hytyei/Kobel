package app.kobel

import android.app.job.JobInfo
import android.app.job.JobParameters
import android.app.job.JobScheduler
import android.app.job.JobService
import android.content.ComponentName
import android.content.Context
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

/**
 * Settings the web page hands over (setNotify) so the background job knows what to do.
 * The access code stays in this app's private storage only (never in the APK, never in GitHub).
 */
object NotifyPrefs {
    private fun sp(ctx: Context) = ctx.getSharedPreferences("kobel_notify", Context.MODE_PRIVATE)
    fun save(ctx: Context, j: JSONObject) {
        val url = j.optString("url").trim().trimEnd('/')
        sp(ctx).edit()
            .putBoolean("on", j.optBoolean("on", true))
            .putBoolean("streakOn", j.optBoolean("streakOn", true))
            .putString("url", if (url.startsWith("https://") && url.length < 200) url else "")
            .putString("code", j.optString("code").take(80))
            .putBoolean("de", j.optBoolean("de", false))
            .putInt("streak", j.optInt("streak", 0))
            .putString("last", j.optString("last").take(10))
            .apply()
    }
    fun get(ctx: Context): SharedPreferencesView = SharedPreferencesView(sp(ctx))
    fun raw(ctx: Context) = sp(ctx)
}

class SharedPreferencesView(private val p: android.content.SharedPreferences) {
    val on get() = p.getBoolean("on", true)
    val streakOn get() = p.getBoolean("streakOn", true)
    val url get() = p.getString("url", "") ?: ""
    val code get() = p.getString("code", "") ?: ""
    val de get() = p.getBoolean("de", false)
    val streak get() = p.getInt("streak", 0)
    val last get() = p.getString("last", "") ?: ""
}

/** Runs about every 15 to 30 minutes (Android decides), reads the alert feed and shows phone notifications. */
class NotifyPollJob : JobService() {
    override fun onStartJob(params: JobParameters): Boolean {
        val ctx = applicationContext
        Thread {
            try { NotifyWork.run(ctx) } catch (_: Exception) { }
            jobFinished(params, false)
        }.start()
        return true
    }

    override fun onStopJob(params: JobParameters): Boolean = true

    companion object {
        private const val JOB_ID = 4711
        fun schedule(ctx: Context, on: Boolean) {
            val js = ctx.getSystemService(Context.JOB_SCHEDULER_SERVICE) as JobScheduler
            if (!on) { js.cancel(JOB_ID); return }
            if (js.allPendingJobs.any { it.id == JOB_ID }) return
            js.schedule(
                JobInfo.Builder(JOB_ID, ComponentName(ctx, NotifyPollJob::class.java))
                    .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                    .setPeriodic(15 * 60 * 1000L)
                    .setPersisted(true)
                    .build(),
            )
        }
    }
}

object NotifyWork {
    private fun day(t: Long = System.currentTimeMillis()) = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date(t))

    fun run(ctx: Context) {
        val p = NotifyPrefs.get(ctx)
        if (!p.on) return
        Notifier.ensureChannels(ctx)
        alerts(ctx, p)
        if (p.streakOn) streak(ctx, p)
        updates(ctx, p)
    }

    /** The server feed: friend requests, match requests, study groups. */
    private fun alerts(ctx: Context, p: SharedPreferencesView) {
        if (p.url.isEmpty() || p.code.isEmpty()) return
        val sp = NotifyPrefs.raw(ctx)
        val since = sp.getLong("since", 0L).let { if (it == 0L) System.currentTimeMillis() else it }
        val c = URL("${p.url}/v1/alerts?since=$since").openConnection() as HttpURLConnection
        try {
            c.connectTimeout = 15000; c.readTimeout = 20000
            c.setRequestProperty("Authorization", "Bearer ${p.code}")
            c.setRequestProperty("User-Agent", "Kobel-Notify")
            if (c.responseCode != 200) return
            val j = JSONObject(c.inputStream.bufferedReader().use { it.readText() })
            val list = j.optJSONArray("alerts")
            if (list != null) for (i in list.length() - 1 downTo 0) {
                val a = list.getJSONObject(i)
                val (title, text) = text(a, p.de) ?: continue
                Notifier.show(ctx, a.optString("id").hashCode(), Notifier.CH_SOCIAL, title, text)
            }
            sp.edit().putLong("since", j.optLong("now", System.currentTimeMillis())).apply()
        } finally {
            c.disconnect()
        }
    }

    private fun game(id: String, de: Boolean) = when (id) {
        "sprint" -> "Sprint"; "dash" -> "Elfmeter"; "plural" -> "Mehrzahl"; "scramble" -> "Aufstellung"; "gap" -> "Taktiktafel"
        else -> id
    }

    private fun text(a: JSONObject, de: Boolean): Pair<String, String>? {
        val name = a.optString("name").take(40)
        val group = a.optString("groupName").take(40)
        return when (a.optString("type")) {
            "friend" -> if (de) "Neuer Freund" to "$name hat dich als Freund hinzugefügt." else "New friend" to "$name added you as a friend."
            "duel_invite" -> {
                val g = game(a.optString("game"), de)
                if (de) "Spielanfrage" to "$name fordert dich heraus: $g." else "Match request" to "$name challenges you: $g."
            }
            "duel_result" -> {
                val g = a.optJSONArray("goals")
                val s = if (g != null && g.length() == 2) "${g.optInt(0)}–${g.optInt(1)}" else ""
                if (de) "Abpfiff" to "Du gegen $name: $s." else "Full time" to "You vs $name: $s."
            }
            "group_added" -> if (de) "Lerngruppe" to "Du wurdest zu $group hinzugefügt." else "Study group" to "You were added to $group."
            "group_round" -> if (de) "Neue Runde" to "$name hat in $group eine Runde gestartet." else "New round" to "$name started a round in $group."
            "group_result" -> if (de) "Runde beendet" to "Die Ergebnisse für $group sind da." else "Round over" to "The results are in for $group."
            else -> null
        }
    }

    /** Evening reminder (18:00 to 22:59): your streak is alive from yesterday but you have not practised today. */
    private fun streak(ctx: Context, p: SharedPreferencesView) {
        val now = Calendar.getInstance()
        val h = now.get(Calendar.HOUR_OF_DAY)
        if (h < 18 || h > 22 || p.streak < 1) return
        val today = day()
        val yesterday = day(System.currentTimeMillis() - 86400000L)
        if (p.last != yesterday) return        // already practised today, or the streak is gone
        val sp = NotifyPrefs.raw(ctx)
        if (sp.getString("streakDay", "") == today) return
        sp.edit().putString("streakDay", today).apply()
        val n = p.streak
        Notifier.show(
            ctx, 7001, Notifier.CH_STREAK,
            if (p.de) "Deine Serie endet heute" else "Your streak ends tonight",
            if (p.de) "$n Tage in Folge. Ein kurzes Training rettet sie." else "$n days in a row. One short session keeps it alive.",
        )
    }

    /** A new release on GitHub (checked at most twice a day, same numeric version rule as the in-app updater). */
    private fun updates(ctx: Context, p: SharedPreferencesView) {
        val sp = NotifyPrefs.raw(ctx)
        val nowMs = System.currentTimeMillis()
        if (nowMs - sp.getLong("updAt", 0L) < 12 * 3600000L) return
        sp.edit().putLong("updAt", nowMs).apply()
        val repo = BuildConfig.GITHUB_REPO
        if (!repo.matches(Regex("[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+")) || repo.startsWith("YOUR_")) return
        val c = URL("https://api.github.com/repos/$repo/releases/latest").openConnection() as HttpURLConnection
        try {
            c.connectTimeout = 15000; c.readTimeout = 20000
            c.setRequestProperty("User-Agent", "Kobel-Notify")
            c.setRequestProperty("Accept", "application/vnd.github+json")
            if (c.responseCode != 200) return
            val tag = JSONObject(c.inputStream.bufferedReader().use { it.readText() }).optString("tag_name")
            val m = Regex("(\\d+)(?:\\.(\\d+))?(?:\\.(\\d+))?").find(tag) ?: return
            val n = m.groupValues.drop(1).map { it.toIntOrNull() ?: 0 }
            val code = n[0] * 10000 + n[1] * 100 + n[2]
            if (code <= BuildConfig.VERSION_CODE || sp.getInt("updTold", 0) >= code) return
            sp.edit().putInt("updTold", code).apply()
            Notifier.show(
                ctx, 7002, Notifier.CH_UPDATE,
                if (p.de) "Neue Kobel-Version" else "New Kobel version",
                if (p.de) "Version $tag ist da. Öffne Einstellungen → Update." else "Version $tag is available. Open Settings → Update.",
            )
        } finally {
            c.disconnect()
        }
    }
}
