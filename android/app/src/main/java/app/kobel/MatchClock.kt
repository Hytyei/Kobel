package app.kobel

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import java.util.Calendar

/**
 * The day as a match: 0' is 00:00, 90' is 23:45, and the last quarter of an hour is +90'. So one match minute lasts about
 * 16 real minutes. Widgets redraw on that beat, and the streak calls fire on fixed match minutes.
 */
object MatchClock {
    const val FULL = 1425

    fun minsNow(): Int = Calendar.getInstance().let { it.get(Calendar.HOUR_OF_DAY) * 60 + it.get(Calendar.MINUTE) }
    fun minute(mins: Int): Int = (mins * 90 / FULL).coerceIn(0, 90)
    fun label(mins: Int): String = if (mins > FULL) "+90'" else "${minute(mins)}'"

    /** Minute of the day on which a match minute starts. */
    fun startOf(matchMinute: Int): Int = (matchMinute * FULL + 89) / 90

    /** Epoch ms of the next midnight: the moment an open streak ends. */
    fun midnight(): Long = Calendar.getInstance().apply {
        add(Calendar.DAY_OF_YEAR, 1)
        set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
    }.timeInMillis

    private fun at(minOfDay: Int, tomorrow: Boolean): Long = Calendar.getInstance().apply {
        if (tomorrow) add(Calendar.DAY_OF_YEAR, 1)
        set(Calendar.HOUR_OF_DAY, minOfDay / 60); set(Calendar.MINUTE, minOfDay % 60); set(Calendar.SECOND, 2); set(Calendar.MILLISECOND, 0)
    }.timeInMillis

    private fun pending(ctx: Context, action: String, code: Int) = PendingIntent.getBroadcast(
        ctx, code, Intent(ctx, ClockReceiver::class.java).setAction(action),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    /** The next redraw. Not a wake-up alarm: a dark screen shows no widget, so it fires when the phone is next awake. */
    fun scheduleTick(ctx: Context) {
        if (!WidgetCore.hasWidgets(ctx)) return
        val now = minsNow()
        val next = (0..90).map { startOf(it) }.plus(FULL + 1).firstOrNull { it > now }
        val am = ctx.getSystemService(AlarmManager::class.java) ?: return
        am.setWindow(AlarmManager.RTC, if (next != null) at(next, false) else at(0, true), WINDOW, pending(ctx, ACTION_TICK, 1))
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at(0, true), pending(ctx, ACTION_TICK, 4))   // a new day must never wait for the next redraw
    }

    /**
     * The next streak call. A plain inexact alarm can land 75% of the wait late, so hours for the evening calls: the window
     * alarm keeps it on time while the phone is awake, and the while-idle one still gets through Doze. Neither needs a
     * special permission, and a call is only ever shown once.
     */
    fun scheduleStreak(ctx: Context) {
        val p = NotifyPrefs.get(ctx)
        val am = ctx.getSystemService(AlarmManager::class.java) ?: return
        val pi = pending(ctx, ACTION_STREAK, 2); val idle = pending(ctx, ACTION_STREAK, 3)
        if (!p.on || !p.streakOn) { am.cancel(pi); am.cancel(idle); return }
        val now = minsNow()
        val next = NotifyWork.STAGES.firstOrNull { it > now }
        val whenMs = if (next != null) at(next, false) else at(NotifyWork.STAGES[0], true)
        am.setWindow(AlarmManager.RTC_WAKEUP, whenMs, WINDOW, pi)
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, whenMs, idle)
    }

    private const val WINDOW = 10 * 60 * 1000L   // the shortest window Android grants without the exact-alarm permission
    const val ACTION_TICK = "app.kobel.TICK"
    const val ACTION_STREAK = "app.kobel.STREAK"
}

class ClockReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        when (intent.action) {
            MatchClock.ACTION_TICK -> { WidgetCore.refreshAll(ctx); MatchClock.scheduleTick(ctx) }
            MatchClock.ACTION_STREAK -> {
                try { NotifyWork.streakCall(ctx) } catch (_: Exception) { }
                MatchClock.scheduleStreak(ctx)
            }
            Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED -> {
                WidgetCore.refreshAll(ctx); NotifyPollJob.schedule(ctx); MatchClock.scheduleTick(ctx); MatchClock.scheduleStreak(ctx)
            }
        }
    }
}
