import android.graphics.Canvas
import android.graphics.Typeface
import app.kobel.WData
import app.kobel.WidgetArt
import java.awt.Color
import java.awt.Font
import java.awt.image.BufferedImage
import java.io.File
import javax.imageio.ImageIO

/** args: <out dir> [fonts dir] [raw]   (raw = transparent widget_preview_*.png for res/drawable-nodpi)
 *    -> writes small.png, wide.png, big.png (English) and *_de.png (German) at 3x density. */
fun face(dir: String?, name: String): Typeface {
    val f = dir?.let { File(it, name) }
    if (f != null && f.exists()) return Typeface(Font.createFont(Font.TRUETYPE_FONT, f))
    return Typeface(Font("SansSerif", Font.BOLD, 12))
}

fun sample(de: Boolean) = WData(
    de = de, streak = 23, today = 45, goal = 60, due = 38, fresh = 12, tier = if (de) "2. Bundesliga" else "2. Bundesliga", tierLv = "B1", tierPct = 64, lp = 3190,
    next = "Bundesliga", left = 1210, zone = "safe", season = 3, md = 2, mdTore = 212, mdTarget = 300, mdDays = 3, mdNeed = 4, mdLeft = 4,
    form = listOf("W", "W", "D", "W", "L"), gold = 2, silver = 3, bronze = 5, goals = 184, xg = 161.4, cs = 12, dow = 3,
    xp7 = listOf(80, 55, 120, 45, 0, 0, 0),
    heat = listOf(0,1,2,0,3,2,1, 1,2,3,2,1,0,2, 3,3,2,1,2,3,3, 0,1,1,2,3,2,0, 2,3,1,2,3,0,0).let { it.take(35) },
    fc = listOf(38, 22, 31, 18, 25, 40, 12), cnt = listOf(120, 64, 98, 187),
)

fun main(args: Array<String>) {
    val out = File(args[0]); out.mkdirs()
    val fonts = args.getOrNull(1)
    val art = WidgetArt(3f, face(fonts, "DFL_Sans_Condensed_Bold.otf"), face(fonts, "DFL_Sans.otf"))
    for (de in listOf(false, true)) {
        val sfx = if (de) "_de" else ""
        val sizes = mapOf("small" to (160 to 160), "wide" to (330 to 150), "big" to (330 to 360))
        for ((name, wh) in sizes) {
            val w = (wh.first * 3); val h = (wh.second * 3)
            val img = BufferedImage(w, h, BufferedImage.TYPE_INT_ARGB)
            val c = Canvas(img)
            when (name) { "small" -> art.small(c, w.toFloat(), h.toFloat(), sample(de)); "wide" -> art.wide(c, w.toFloat(), h.toFloat(), sample(de)); else -> art.big(c, w.toFloat(), h.toFloat(), sample(de)) }
            if (args.getOrNull(2) == "raw") { if (!de) ImageIO.write(img, "png", File(out, "widget_preview_$name.png")); continue }
            val bg = BufferedImage(w + 60, h + 60, BufferedImage.TYPE_INT_RGB)
            val g = bg.createGraphics(); g.color = Color(0x3a4a5a); g.fillRect(0, 0, bg.width, bg.height); g.drawImage(img, 30, 30, null)
            ImageIO.write(bg, "png", File(out, "$name$sfx.png"))
        }
    }
    println("done")
}
