package app.kobel

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Typeface
import android.os.Bundle
import android.widget.RemoteViews
import org.json.JSONArray
import org.json.JSONObject

/**
 * Home-screen widgets. The web UI pushes fresh numbers through KobelAndroid.setWidgetData(json); they are stored in
 * SharedPreferences and drawn by WidgetArt (rings, bar charts, heatmap) into a bitmap that fills the widget.
 * Providers: 4x2 (KobelWidget), 2x2 (KobelWidgetSmall), 4x4 (KobelWidgetBig). No network involved.
 */
object WidgetCore {
    private const val PREFS = "kobel_widget"
    private const val MAX_JSON = 12000
    private const val MAX_PIXELS = 1_400_000

    private fun data(ctx: Context): JSONObject {
        val raw = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("data", null)
        return try { JSONObject(raw ?: "{}") } catch (e: Exception) { JSONObject() }
    }

    fun store(ctx: Context, json: String) {
        if (json.length > MAX_JSON) return
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("data", json).apply()
        refreshAll(ctx)
    }

    fun refreshAll(ctx: Context) {
        val mgr = AppWidgetManager.getInstance(ctx)
        for (cls in listOf(KobelWidget::class.java, KobelWidgetSmall::class.java, KobelWidgetBig::class.java)) {
            mgr.getAppWidgetIds(ComponentName(ctx, cls)).forEach { update(ctx, mgr, it, cls) }
        }
    }

    fun update(ctx: Context, mgr: AppWidgetManager, id: Int, cls: Class<*>) {
        mgr.updateAppWidget(id, build(ctx, cls, mgr.getAppWidgetOptions(id)))
    }

    fun build(ctx: Context, cls: Class<*>, opts: Bundle? = null): RemoteViews {
        val dm = ctx.resources.displayMetrics
        val (defW, defH, layout, root) = when (cls) {
            KobelWidgetSmall::class.java -> Spec(160, 160, R.layout.widget_small, R.id.s_root)
            KobelWidgetBig::class.java -> Spec(320, 392, R.layout.widget_big, R.id.b_root)
            else -> Spec(320, 150, R.layout.widget_kobel, R.id.w_root)
        }
        // the launcher tells us the size in dp: width when upright, height when upright (MAX_HEIGHT)
        val wDp = (opts?.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0) ?: 0).let { if (it > 40) it else defW }
        val hDp = (opts?.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0) ?: 0).let { if (it > 40) it else defH }
        var u = dm.density.coerceIn(1f, 3f)
        while (wDp * u * hDp * u > MAX_PIXELS && u > 1f) u -= 0.25f
        val w = (wDp * u).toInt().coerceAtLeast(2); val h = (hDp * u).toInt().coerceAtLeast(2)
        val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
        val art = WidgetArt(u, condFace(ctx), bodyFace(ctx))
        val d = parse(data(ctx)); val c = Canvas(bmp)
        when (cls) {
            KobelWidgetSmall::class.java -> art.small(c, w.toFloat(), h.toFloat(), d)
            KobelWidgetBig::class.java -> art.big(c, w.toFloat(), h.toFloat(), d)
            else -> art.wide(c, w.toFloat(), h.toFloat(), d)
        }
        val v = RemoteViews(ctx.packageName, layout)
        v.setImageViewBitmap(R.id.w_img, bmp)
        v.setOnClickPendingIntent(root, PendingIntent.getActivity(
            ctx, 0, Intent(ctx, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
        return v
    }

    private data class Spec(val w: Int, val h: Int, val layout: Int, val root: Int)

    /** DFL Sans if you put the font files into assets/www/fonts (they are not in the repository); otherwise the system condensed font. */
    private fun face(ctx: Context, file: String, fallback: Typeface): Typeface = try {
        Typeface.createFromAsset(ctx.assets, "www/fonts/$file")
    } catch (e: Exception) { fallback }

    private fun condFace(ctx: Context) = face(ctx, "DFL_Sans_Condensed_Bold.otf", Typeface.create("sans-serif-condensed", Typeface.BOLD))
    private fun bodyFace(ctx: Context) = face(ctx, "DFL_Sans.otf", Typeface.create("sans-serif-medium", Typeface.NORMAL))

    private fun ints(a: JSONArray?, n: Int): List<Int> = List(n) { a?.optInt(it, 0) ?: 0 }

    fun parse(j: JSONObject): WData {
        val st = j.optJSONObject("st") ?: JSONObject(); val tr = j.optJSONObject("tr") ?: JSONObject()
        val md = j.optJSONObject("mdp") ?: JSONObject(); val form = j.optJSONArray("form")
        val cnt = j.optJSONObject("cnt") ?: JSONObject()
        val week = j.optJSONArray("xp7")
        return WData(
            de = j.optString("lang", "en") == "de",
            streak = j.optInt("streak"), today = j.optInt("today"), goal = j.optInt("goal", 60).coerceAtLeast(1),
            due = j.optInt("due"), fresh = j.optInt("fresh"),
            tier = j.optString("tier", "3. Liga"), tierLv = j.optString("tierLv", "A1"), tierPct = j.optInt("tierPct").coerceIn(0, 100),
            lp = j.optInt("lp"), next = j.optString("next", ""), left = j.optInt("left"), zone = j.optString("zoneKey", "safe"),
            season = j.optInt("season", 1), md = j.optInt("md", 1),
            mdTore = md.optInt("tore"), mdTarget = md.optInt("target", 300).coerceAtLeast(1), mdDays = md.optInt("days"),
            mdNeed = md.optInt("need", 4), mdLeft = md.optInt("left", 7),
            form = List(form?.length() ?: 0) { form?.optString(it) ?: "" },
            gold = tr.optInt("g"), silver = tr.optInt("s"), bronze = tr.optInt("b"),
            goals = st.optInt("g"), xg = st.optDouble("xg", 0.0), cs = st.optInt("cs"),
            dow = j.optInt("dow", 0).coerceIn(0, 6),
            xp7 = ints(week, 7), heat = ints(j.optJSONArray("heat"), 35), fc = ints(j.optJSONArray("fc"), 7),
            cnt = listOf(cnt.optInt("n"), cnt.optInt("l"), cnt.optInt("y"), cnt.optInt("m")),
        )
    }
}

abstract class ArtWidget(private val cls: Class<*>) : AppWidgetProvider() {
    override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) {
        ids.forEach { WidgetCore.update(ctx, mgr, it, cls) }
    }

    override fun onAppWidgetOptionsChanged(ctx: Context, mgr: AppWidgetManager, id: Int, newOptions: Bundle) {
        WidgetCore.update(ctx, mgr, id, cls)
    }
}

class KobelWidget : ArtWidget(KobelWidget::class.java)
class KobelWidgetSmall : ArtWidget(KobelWidgetSmall::class.java)
class KobelWidgetBig : ArtWidget(KobelWidgetBig::class.java)
