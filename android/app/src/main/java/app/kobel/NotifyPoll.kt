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
        // a goal was scored today: take down the "final whistle" reminder that may still be showing
        val t = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
        if (j.optString("last") == t) try { (ctx.getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager).cancel(7001) } catch (_: Exception) { }
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
        // each part on its own: a network failure in one (for example the friends feed) must never skip the others,
        // that used to stop the "new version" notification from ever being reached
        try { alerts(ctx, p) } catch (_: Exception) { }
        try { if (p.streakOn) streak(ctx, p) } catch (_: Exception) { }
        try { updates(ctx, p) } catch (_: Exception) { }
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
            "friend" -> if (de) "Neuzugang" to "$name ist jetzt in deinem Kader." else "New signing" to "$name joined your squad as a friend."
            "duel_invite" -> {
                val g = game(a.optString("game"), de)
                if (de) "Anstoß-Anfrage" to "$name fordert dich heraus: $g." else "Kick-off request" to "$name challenges you: $g."
            }
            "duel_result" -> {
                val g = a.optJSONArray("goals")
                val s = if (g != null && g.length() == 2) "${g.optInt(0)}–${g.optInt(1)}" else ""
                if (de) "Abpfiff" to "Du gegen $name: $s." else "Full time" to "You vs $name: $s."
            }
            "group_added" -> if (de) "Kader-Berufung" to "Du wurdest in $group berufen." else "Squad call-up" to "You were called up to $group."
            "group_round" -> if (de) "Spieltag in $group" to "$name hat eine Runde angepfiffen." else "Matchday in $group" to "$name has kicked off a round."
            "group_ping" -> {
                val kind = a.optString("kind")
                val msg = a.optString("text").take(60)
                if (de) {
                    "Zuruf von $name" to when (kind) {
                        "custom" -> "$group: $msg"
                        "round" -> "In $group wartet eine Runde."
                        "streak" -> "Halten wir heute die Serie von $group am Leben."
                        else -> "$group: Zeit zum Üben!"
                    }
                } else {
                    "Shout from the bench: $name" to when (kind) {
                        "custom" -> "$group: $msg"
                        "round" -> "A round is waiting in $group."
                        "streak" -> "Let's keep the $group streak alive today."
                        else -> "$group: time to practise!"
                    }
                }
            }
            "group_result" -> if (de) "Schlusspfiff" to "Die Ergebnisse für $group sind da." else "Final whistle" to "The results are in for $group."
            else -> null
        }
    }

    /**
     * The streak as a football match: the day is the match, midnight is the final whistle.
     * While your streak is alive from yesterday and you have not practised today you get up to five calls,
     * each shown once per day (a later one replaces the earlier one): second half (17:00), 75th minute (20:30),
     * 85th minute (22:00), 90th minute / final whistle incoming (23:00) and injury time (23:40).
     */
    private fun streak(ctx: Context, p: SharedPreferencesView) {
        val now = Calendar.getInstance()
        val mins = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE)
        if (p.streak < 1) return
        val today = day()
        val yesterday = day(System.currentTimeMillis() - 86400000L)
        if (p.last != yesterday) return        // already practised today (a goal was scored), or the streak is gone
        val stage = when {
            mins >= 23 * 60 + 40 -> 5
            mins >= 23 * 60 -> 4
            mins >= 22 * 60 -> 3
            mins >= 20 * 60 + 30 -> 2
            mins >= 17 * 60 -> 1
            else -> 0
        }
        if (stage == 0) return
        val sp = NotifyPrefs.raw(ctx)
        val told = sp.getString("streakStage", "") ?: ""
        val doneToday = if (told.startsWith("$today:")) told.substringAfter(':').toIntOrNull() ?: 0 else 0
        if (stage <= doneToday) return
        sp.edit().putString("streakStage", "$today:$stage").apply()
        val n = p.streak
        val run = if (p.de) "$n Tage ungeschlagen" else "$n-day unbeaten run"
        val (title, body) = when (stage) {
            1 -> if (p.de) "Zweite Halbzeit läuft" to "Dein Spiel gegen die Uhr: $run. Ein Tor (eine Übung) reicht." else "Second half is under way" to "Your match against the clock: $run. One goal (one session) is enough."
            2 -> if (p.de) "75. Minute: Zeit für ein Tor" to "$run steht auf dem Spiel. Ein kurzes Training bringt den Sieg." else "75th minute: time for a goal" to "Your $run is on the line. One short session wins it."
            3 -> if (p.de) "85. Minute: Es wird eng" to "Nur noch kurz bis zum Schlusspfiff. Rette $run jetzt." else "85th minute: it is getting tight" to "Not long until the final whistle. Save your $run now."
            4 -> if (p.de) "90. Minute: Abpfiff naht!" to "Gleich ist Schluss. Ein paar Fragen retten $run." else "90th minute: final whistle incoming!" to "Time is almost up. A few questions save your $run."
            else -> if (p.de) "Nachspielzeit!" to "Letzte Chance: Jetzt spielen, sonst ist $run vorbei." else "Injury time!" to "Last chance: play now or your $run ends."
        }
        Notifier.show(ctx, 7001, if (stage >= 3) Notifier.CH_WHISTLE else Notifier.CH_STREAK, title, body)
    }

    /** A new release on GitHub (checked at most twice a day, same numeric version rule as the in-app updater). */
    private fun updates(ctx: Context, p: SharedPreferencesView) {
        val sp = NotifyPrefs.raw(ctx)
        val nowMs = System.currentTimeMillis()
        if (nowMs - sp.getLong("updAt", 0L) < 12 * 3600000L) return
        sp.edit().putLong("updAt", nowMs).apply()
        val repo = BuildConfig.GITHUB_REPO
        if (!repo.matches(Regex("[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+")) || repo.startsWith("YOUR_")) return
        val c = URL("https://api.github.com/repos/$repo/releases?per_page=15").openConnection() as HttpURLConnection
        try {
            c.connectTimeout = 15000; c.readTimeout = 20000
            c.setRequestProperty("User-Agent", "Kobel-Notify")
            c.setRequestProperty("Accept", "application/vnd.github+json")
            if (c.responseCode != 200) { sp.edit().putLong("updAt", 0L).apply(); return }
            val list = org.json.JSONArray(c.inputStream.bufferedReader().use { it.readText() })
            var tag = ""
            var code = -1
            for (k in 0 until list.length()) {
                val r = list.getJSONObject(k)
                if (r.optBoolean("draft")) continue
                val arr = r.optJSONArray("assets") ?: continue
                var has = false
                for (x in 0 until arr.length()) if (arr.getJSONObject(x).optString("name").endsWith(".apk")) has = true
                if (!has) continue
                val m = Regex("(\\d+)(?:\\.(\\d+))?(?:\\.(\\d+))?").find(r.optString("tag_name")) ?: continue
                val n = m.groupValues.drop(1).map { it.toIntOrNull() ?: 0 }
                val cd = n[0] * 10000 + n[1] * 100 + n[2]
                if (cd > code) { code = cd; tag = r.optString("tag_name") }
            }
            val cur = ctx.packageManager.getPackageInfo(ctx.packageName, 0).versionName ?: ""
            val cm = Regex("(\\d+)(?:\\.(\\d+))?(?:\\.(\\d+))?").find(cur)
            val curCode = if (cm != null) cm.groupValues.drop(1).map { it.toIntOrNull() ?: 0 }.let { it[0] * 10000 + it[1] * 100 + it[2] } else BuildConfig.VERSION_CODE
            if (code <= curCode || sp.getInt("updTold", 0) >= code) return
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
