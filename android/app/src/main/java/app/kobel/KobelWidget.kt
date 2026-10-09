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

    /** "22 Wochen" once the streak reaches a full week, otherwise days. */
    private fun streakText(j: JSONObject): String {
        val s = j.optInt("streak"); val g = de(j)
        return if (s >= 7) { val w = s / 7; if (g) "$w ${if (w == 1) "Woche" else "Wochen"}" else "$w ${if (w == 1) "Week" else "Weeks"}" }
        else if (g) "$s ${if (s == 1) "Tag" else "Tage"}" else "$s ${if (s == 1) "Day" else "Days"}"
    }

    private fun open(ctx: Context, v: RemoteViews, id: Int) {
        v.setOnClickPendingIntent(id, PendingIntent.getActivity(
            ctx, 0, Intent(ctx, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
    }

    private fun weekDots(v: RemoteViews, j: JSONObject) {
        val week = j.optJSONArray("week"); val dow = j.optInt("dow", -1)
        DOTS.forEachIndexed { i, id ->
            val on = week != null && week.optInt(i) == 1
            v.setInt(id, "setBackgroundResource", if (on) R.drawable.dot_on else R.drawable.dot_off)
            v.setTextColor(id, if (i == dow) 0xFFFFFFFF.toInt() else 0xFFBBBBBB.toInt())
        }
    }

    private fun wide(ctx: Context): RemoteViews {
        val v = RemoteViews(ctx.packageName, R.layout.widget_kobel); val j = data(ctx); val g = de(j)
        val st = j.optInt("streak")
        v.setTextViewText(R.id.w_streak, st.toString())
        v.setTextViewText(R.id.w_streak_lab, (if (g) (if (st == 1) "TAG SERIE" else "TAGE SERIE") else (if (st == 1) "DAY STREAK" else "DAY STREAK")))
        v.setTextViewText(R.id.w_due, j.optInt("due").toString())
        v.setTextViewText(R.id.w_new, j.optInt("fresh").toString())
        v.setTextViewText(R.id.w_l_due, if (g) "FÄLLIG" else "DUE")
        v.setTextViewText(R.id.w_l_new, if (g) "NEU" else "NEW")
        v.setTextViewText(R.id.w_tier, "${j.optString("tier", "3. Liga")} · ${j.optInt("lp")} LP".uppercase())
        v.setProgressBar(R.id.w_prog, 100, j.optInt("tierPct"), false)
        open(ctx, v, R.id.w_root); return v
    }

    private fun small(ctx: Context): RemoteViews {
        val v = RemoteViews(ctx.packageName, R.layout.widget_small); val j = data(ctx)
        v.setTextViewText(R.id.s_tier, j.optString("tier", "3. Liga").uppercase())
        v.setTextViewText(R.id.s_streak, streakText(j))
        v.setProgressBar(R.id.s_prog, 100, j.optInt("tierPct"), false)
        open(ctx, v, R.id.s_root); return v
    }

    private fun big(ctx: Context): RemoteViews {
        val v = RemoteViews(ctx.packageName, R.layout.widget_big); val j = data(ctx); val g = de(j)
        v.setTextViewText(R.id.b_tier, j.optString("tier", "3. Liga").uppercase())
        v.setTextViewText(R.id.b_sub, "${j.optString("tierLv")} · ${j.optInt("lp")} LP")
        v.setProgressBar(R.id.b_prog, 100, j.optInt("tierPct"), false)
        v.setTextViewText(R.id.b_streak, streakText(j))
        v.setTextViewText(R.id.b_due, j.optInt("due").toString())
        v.setTextViewText(R.id.b_new, j.optInt("fresh").toString())
        v.setTextViewText(R.id.b_l_streak, if (g) "SERIE" else "STREAK")
        v.setTextViewText(R.id.b_l_due, if (g) "FÄLLIG" else "DUE")
        v.setTextViewText(R.id.b_l_new, if (g) "NEU" else "NEW")
        weekDots(v, j)
        val st = j.optJSONObject("st") ?: JSONObject()
        v.setTextViewText(R.id.b_goals, st.optInt("g").toString())
        v.setTextViewText(R.id.b_xg, st.optDouble("xg", 0.0).toString())
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
