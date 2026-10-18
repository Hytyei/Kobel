package app.kobel

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import org.json.JSONObject

/**
 * Home-screen widgets. The web UI pushes fresh numbers through KobelAndroid.setWidgetData(json); they are stored in
 * SharedPreferences and drawn here by three providers: 4x2 (KobelWidget), 2x2 (KobelWidgetSmall), 4x4 (KobelWidgetBig).
 * No network involved.
 */
object WidgetCore {
    private const val PREFS = "kobel_widget"
    private val DOTS = intArrayOf(R.id.d0, R.id.d1, R.id.d2, R.id.d3, R.id.d4, R.id.d5, R.id.d6)
    
    private fun data(ctx: Context): JSONObject {
        val raw = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("data", null)
        return try { JSONObject(raw ?: "{}") } catch (e: Exception) { JSONObject() }
    }

    fun store(ctx: Context, json: String) {
        if (json.length > 6000) return
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("data", json).apply()
        refreshAll(ctx)
    }

    fun refreshAll(ctx: Context) {
        val mgr = AppWidgetManager.getInstance(ctx)
        for (cls in listOf(KobelWidget::class.java, KobelWidgetSmall::class.java, KobelWidgetBig::class.java)) {
            val ids = mgr.getAppWidgetIds(ComponentName(ctx, cls))
            ids.forEach { mgr.updateAppWidget(it, build(ctx, cls)) }
        }
    }

    fun build(ctx: Context, cls: Class<*>): RemoteViews = when (cls) {
        KobelWidgetSmall::class.java -> small(ctx)
        KobelWidgetBig::class.java -> big(ctx)
        else -> wide(ctx)
    }

    private fun de(j: JSONObject) = j.optString("lang", "en") == "de"

    /** Streak shown as a number plus a unit label; a full week or more is shown in weeks ("22 / WEEKS"). */
    private fun streakNum(j: JSONObject): String { val s = j.optInt("streak"); return (if (s >= 7) s / 7 else s).toString() }
    private fun streakUnit(j: JSONObject): String {
        val s = j.optInt("streak"); val g = de(j); val n = if (s >= 7) s / 7 else s
        return if (s >= 7) { if (g) (if (n == 1) "WOCHE" else "WOCHEN") else (if (n == 1) "WEEK" else "WEEKS") }
        else if (g) (if (n == 1) "TAG" else "TAGE") else (if (n == 1) "DAY" else "DAYS")
    }

    private fun open(ctx: Context, v: RemoteViews, id: Int) {
        v.setOnClickPendingIntent(id, PendingIntent.getActivity(
            ctx, 0, Intent(ctx, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
    }

    private fun weekDots(v: RemoteViews, j: JSONObject) {
        val week = j.optJSONArray("week"); val dow = j.optInt("dow", -1)
        val letters = if (de(j)) "MDMDFSS" else "MTWTFSS"
        DOTS.forEachIndexed { i, id ->
            val on = week != null && week.optInt(i) == 1
            v.setTextViewText(id, letters[i].toString())
            v.setInt(id, "setBackgroundResource", if (on) R.drawable.dot_on else R.drawable.dot_off)
            v.setTextColor(id, if (on || i == dow) 0xFFFFFFFF.toInt() else 0xFF8C8C92.toInt())
        }
    }

    private fun lp(j: JSONObject) = "${j.optInt("lp")} LP"
    private fun tier(j: JSONObject) = j.optString("tier", "3. Liga")

    private fun wide(ctx: Context): RemoteViews {
        val v = RemoteViews(ctx.packageName, R.layout.widget_kobel); val j = data(ctx); val g = de(j)
        v.setTextViewText(R.id.w_streak, streakNum(j))
        v.setTextViewText(R.id.w_streak_lab, if (g) "SERIE · ${streakUnit(j)}" else "STREAK · ${streakUnit(j)}")
        v.setTextViewText(R.id.w_due, j.optInt("due").toString())
        v.setTextViewText(R.id.w_new, j.optInt("fresh").toString())
        v.setTextViewText(R.id.w_l_due, if (g) "FÄLLIG" else "DUE")
        v.setTextViewText(R.id.w_l_new, if (g) "NEU" else "NEW")
        v.setTextViewText(R.id.w_tier, tier(j))
        v.setTextViewText(R.id.w_lp, lp(j))
        v.setProgressBar(R.id.w_prog, 100, j.optInt("tierPct").coerceIn(0, 100), false)
        open(ctx, v, R.id.w_root); return v
    }

    private fun small(ctx: Context): RemoteViews {
        val v = RemoteViews(ctx.packageName, R.layout.widget_small); val j = data(ctx)
        v.setTextViewText(R.id.s_tier, tier(j))
        v.setTextViewText(R.id.s_streak, streakNum(j))
        v.setTextViewText(R.id.s_unit, (if (de(j)) "SERIE · " else "STREAK · ") + streakUnit(j))
        v.setProgressBar(R.id.s_prog, 100, j.optInt("tierPct").coerceIn(0, 100), false)
        open(ctx, v, R.id.s_root); return v
    }

    private fun big(ctx: Context): RemoteViews {
        val v = RemoteViews(ctx.packageName, R.layout.widget_big); val j = data(ctx); val g = de(j)
        v.setTextViewText(R.id.b_tier, tier(j))
        v.setTextViewText(R.id.b_sub, j.optString("tierLv"))
        v.setTextViewText(R.id.b_lp, lp(j))
        v.setProgressBar(R.id.b_prog, 100, j.optInt("tierPct").coerceIn(0, 100), false)
        v.setTextViewText(R.id.b_streak, streakNum(j))
        v.setTextViewText(R.id.b_l_streak, if (g) "SERIE · ${streakUnit(j)}" else "STREAK · ${streakUnit(j)}")
        v.setTextViewText(R.id.b_due, j.optInt("due").toString())
        v.setTextViewText(R.id.b_new, j.optInt("fresh").toString())
        v.setTextViewText(R.id.b_l_due, if (g) "FÄLLIG" else "DUE")
        v.setTextViewText(R.id.b_l_new, if (g) "NEU" else "NEW")
        weekDots(v, j)
        val st = j.optJSONObject("st") ?: JSONObject()
        v.setTextViewText(R.id.b_goals, st.optInt("g").toString())
        v.setTextViewText(R.id.b_xg, String.format(java.util.Locale.US, "%.1f", st.optDouble("xg", 0.0)))
        v.setTextViewText(R.id.b_cs, st.optInt("cs").toString())
        v.setTextViewText(R.id.b_l_goals, if (g) "TORE" else "GOALS")
        v.setTextViewText(R.id.b_l_cs, if (g) "WEISSE WESTEN" else "CLEAN SHEETS")
        val tr = j.optJSONObject("tr") ?: JSONObject()
        v.setTextViewText(R.id.b_tro, (if (g) "Trophäen  " else "Trophies  ") + "${tr.optInt("g")} · ${tr.optInt("s")} · ${tr.optInt("b")}")
        open(ctx, v, R.id.b_root); return v
    }
}

class KobelWidget : AppWidgetProvider() {
    override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) {
        ids.forEach { mgr.updateAppWidget(it, WidgetCore.build(ctx, KobelWidget::class.java)) }
    }
}

class KobelWidgetSmall : AppWidgetProvider() {
    override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) {
        ids.forEach { mgr.updateAppWidget(it, WidgetCore.build(ctx, KobelWidgetSmall::class.java)) }
    }
}

class KobelWidgetBig : AppWidgetProvider() {
    override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) {
        ids.forEach { mgr.updateAppWidget(it, WidgetCore.build(ctx, KobelWidgetBig::class.java)) }
    }
}
