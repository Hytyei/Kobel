package app.kobel

import android.graphics.Canvas
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface

/** Everything a widget shows. Parsed from the JSON the web UI pushes (see WidgetCore). */
class WData(
    val de: Boolean = false,
    val streak: Int = 0, val today: Int = 0, val goal: Int = 60, val due: Int = 0, val fresh: Int = 0,
    val tier: String = "3. Liga", val tierLv: String = "A1", val tierPct: Int = 0, val lp: Int = 0, val next: String = "", val left: Int = 0,
    val zone: String = "safe", val season: Int = 1, val md: Int = 1,
    val mdTore: Int = 0, val mdTarget: Int = 300, val mdDays: Int = 0, val mdNeed: Int = 4, val mdLeft: Int = 7,
    val form: List<String> = emptyList(), val gold: Int = 0, val silver: Int = 0, val bronze: Int = 0,
    val goals: Int = 0, val xg: Double = 0.0, val cs: Int = 0,
    val dow: Int = 0,
    val xp7: List<Int> = List(7) { 0 }, val heat: List<Int> = List(35) { 0 }, val fc: List<Int> = List(7) { 0 },
    val cnt: List<Int> = listOf(0, 0, 0, 0),
)

/**
 * Draws the three widgets with plain android.graphics calls (no Views, no network). Each draw function paints a whole
 * widget onto a canvas of [w] x [h] pixels; [u] is pixels per dp. Bundesliga broadcast look: near-black navy,
 * red accent, condensed heavy type, thin dividers.
 */
class WidgetArt(private val u: Float, private val cond: Typeface, private val body: Typeface) {
    companion object {
        const val BG1 = 0xFF121C27.toInt()
        const val BG2 = 0xFF060A0F.toInt()
        const val CARD = 0xFF1A2531.toInt()
        const val RED = 0xFFD20515.toInt()
        const val RED_HI = 0xFFFF3B47.toInt()
        const val WHITE = 0xFFFFFFFF.toInt()
        const val MUTE = 0xFF8C97A3.toInt()
        const val GREEN = 0xFF00C46A.toInt()
        const val AMBER = 0xFFFFB020.toInt()
        const val BLUE = 0xFF3D8BFF.toInt()
        const val GOLD = 0xFFF2C230.toInt()
        const val SILVER = 0xFFC3CAD3.toInt()
        const val BRONZE = 0xFFCD7F32.toInt()
        const val GREY = 0xFF5B6672.toInt()
        fun alpha(c: Int, a: Float): Int = ((a * 255).toInt() shl 24) or (c and 0x00FFFFFF)
    }

    private val p = Paint(Paint.ANTI_ALIAS_FLAG)
    private val rf = RectF()
    private fun dp(v: Float) = v * u

    private fun t(d: WData, en: String, de: String) = if (d.de) de else en

    // ───────── primitives ─────────
    private fun fill(c: Canvas, l: Float, tp: Float, r: Float, b: Float, rad: Float, color: Int) {
        p.style = Paint.Style.FILL; p.shader = null; p.color = color
        rf.set(l, tp, r, b); c.drawRoundRect(rf, rad, rad, p)
    }

    private fun stroke(c: Canvas, l: Float, tp: Float, r: Float, b: Float, rad: Float, color: Int, wpx: Float) {
        p.style = Paint.Style.STROKE; p.shader = null; p.color = color; p.strokeWidth = wpx
        rf.set(l, tp, r, b); c.drawRoundRect(rf, rad, rad, p)
        p.style = Paint.Style.FILL
    }

    /** align: 0 left, 1 center, 2 right. Returns the text width. */
    private fun text(c: Canvas, s: String, x: Float, y: Float, sizeDp: Float, color: Int, face: Typeface = cond, align: Int = 0, spacingDp: Float = 0f): Float {
        p.style = Paint.Style.FILL; p.shader = null; p.color = color; p.typeface = face; p.textSize = dp(sizeDp)
        p.textAlign = when (align) { 1 -> Paint.Align.CENTER; 2 -> Paint.Align.RIGHT; else -> Paint.Align.LEFT }
        p.letterSpacing = spacingDp / sizeDp
        c.drawText(s, x, y, p)
        val w = p.measureText(s)
        p.letterSpacing = 0f
        return w
    }

    private fun measure(s: String, sizeDp: Float, face: Typeface = cond, spacingDp: Float = 0f): Float {
        p.typeface = face; p.textSize = dp(sizeDp); p.letterSpacing = spacingDp / sizeDp
        val w = p.measureText(s); p.letterSpacing = 0f; return w
    }

    private fun ring(c: Canvas, cx: Float, cy: Float, r: Float, strokeDp: Float, frac: Float, color: Int) {
        val sw = dp(strokeDp)
        p.style = Paint.Style.STROKE; p.shader = null; p.strokeWidth = sw; p.strokeCap = Paint.Cap.ROUND
        p.color = alpha(WHITE, 0.10f); rf.set(cx - r, cy - r, cx + r, cy + r); c.drawArc(rf, 0f, 360f, false, p)
        val f = frac.coerceIn(0f, 1f)
        if (f > 0.004f) { p.color = color; c.drawArc(rf, -90f, 360f * f, false, p) }
        p.style = Paint.Style.FILL; p.strokeCap = Paint.Cap.BUTT
    }

    private fun background(c: Canvas, w: Float, h: Float) {
        val rad = dp(22f)
        p.style = Paint.Style.FILL; p.color = WHITE
        p.shader = LinearGradient(0f, 0f, 0f, h, BG1, BG2, Shader.TileMode.CLAMP)
        rf.set(0f, 0f, w, h); c.drawRoundRect(rf, rad, rad, p); p.shader = null
        stroke(c, dp(0.5f), dp(0.5f), w - dp(0.5f), h - dp(0.5f), rad, alpha(WHITE, 0.10f), dp(1f))
    }

    private fun title(c: Canvas, s: String, x: Float, y: Float, color: Int = WHITE, size: Float = 13f) {
        fill(c, x, y - dp(size * 0.78f), x + dp(3f), y + dp(2f), dp(1.5f), RED)
        text(c, s.uppercase(), x + dp(9f), y, size, color, cond, 0, 0.6f)
    }

    private fun pill(c: Canvas, s: String, x: Float, cy: Float, sizeDp: Float, fg: Int, bg: Int, align: Int = 0): Float {
        val tw = measure(s.uppercase(), sizeDp, cond, 0.5f); val padX = dp(7f); val hh = dp(sizeDp + 7f)
        val l = if (align == 2) x - tw - 2 * padX else x
        fill(c, l, cy - hh / 2, l + tw + 2 * padX, cy + hh / 2, hh / 2, bg)
        text(c, s.uppercase(), l + padX, cy + dp(sizeDp * 0.36f), sizeDp, fg, cond, 0, 0.5f)
        return tw + 2 * padX
    }

    private fun zoneColor(z: String) = when (z) { "up" -> GREEN; "down" -> RED_HI; "warn" -> AMBER; else -> MUTE }
    private fun zoneText(d: WData) = when (d.zone) {
        "up" -> t(d, "Promotion spot", "Aufstiegsplatz"); "down" -> t(d, "Relegation zone", "Abstiegszone")
        "warn" -> t(d, "Danger zone", "Gefahrenzone"); else -> t(d, "Safe", "Klassenerhalt")
    }

    private fun letters(d: WData) = if (d.de) "MDMDFSS" else "MTWTFSS"

    /** Seven bars, the day with index [hi] highlighted, an optional dashed goal line. */
    private fun bars(c: Canvas, l: Float, tp: Float, r: Float, b: Float, vals: List<Int>, labels: List<String>, hi: Int, on: Int, off: Int, goal: Int, labelSizeDp: Float = 9f, showValues: Boolean = false) {
        val n = vals.size; val labH = dp(labelSizeDp + 5f); val top = tp; val bot = b - labH
        val mx = maxOf(1, goal, vals.maxOrNull() ?: 1).toFloat()
        val gap = dp(5f); val bw = ((r - l) - gap * (n - 1)) / n
        for (i in 0 until n) {
            val x = l + i * (bw + gap)
            val v = vals[i]; val hgt = if (v <= 0) dp(3f) else maxOf(dp(4f), (bot - top) * v / mx)
            val col = if (i == hi) on else if (v > 0) alpha(WHITE, 0.55f) else alpha(WHITE, 0.12f)
            fill(c, x, bot - hgt, x + bw, bot, minOf(dp(4f), bw / 2), if (i == hi) on else col)
            if (showValues && v > 0) text(c, v.toString(), x + bw / 2, bot - hgt - dp(3f), 8f, MUTE, cond, 1)
            text(c, labels[i], x + bw / 2, b - dp(1f), labelSizeDp, if (i == hi) WHITE else MUTE, cond, 1)
        }
        if (goal > 0) {
            val y = bot - (bot - top) * goal / mx
            p.style = Paint.Style.STROKE; p.color = alpha(WHITE, 0.35f); p.strokeWidth = dp(1f)
            var x = l; while (x < r) { c.drawLine(x, y, minOf(x + dp(4f), r), y, p); x += dp(8f) }
            p.style = Paint.Style.FILL
        }
    }

    private fun formDots(c: Canvas, d: WData, x: Float, cy: Float, size: Float) {
        val last = d.form.takeLast(5)
        for (i in 0 until 5) {
            val res = last.getOrNull(i)
            val col = when (res) { "W" -> GREEN; "D" -> AMBER; "L", "X" -> RED_HI; else -> alpha(WHITE, 0.14f) }
            val cx = x + i * (size + dp(4f)) + size / 2
            p.style = Paint.Style.FILL; p.shader = null; p.color = col; c.drawCircle(cx, cy, size / 2, p)
            if (res != null) text(c, if (res == "X") "L" else res, cx, cy + dp(3.2f), 8.5f, 0xFF081018.toInt(), cond, 1)
        }
    }

    private fun trophies(c: Canvas, d: WData, xRight: Float, cy: Float) {
        var x = xRight
        for ((n, col) in listOf(d.bronze to BRONZE, d.silver to SILVER, d.gold to GOLD)) {
            val s = n.toString(); val tw = measure(s, 12f)
            text(c, s, x, cy + dp(4f), 12f, WHITE, cond, 2); x -= tw + dp(4f)
            p.style = Paint.Style.FILL; p.shader = null; p.color = col; c.drawCircle(x - dp(3.5f), cy, dp(4.5f), p); x -= dp(16f)
        }
    }

    // ───────── 2x2 ─────────
    fun small(c: Canvas, w: Float, h: Float, d: WData) {
        background(c, w, h)
        val pad = dp(13f)
        text(c, d.tier.uppercase(), pad, pad + dp(9f), 11f, MUTE, cond, 0, 0.8f)
        val cx = w / 2; val cy = h * 0.5f + dp(2f); val r = minOf(w, h) * 0.30f
        ring(c, cx, cy, r, 9f, d.today.toFloat() / maxOf(1, d.goal), if (d.today >= d.goal) GREEN else RED_HI)
        val s = d.streak.toString()
        text(c, s, cx, cy + dp(5f), if (s.length > 2) 26f else 32f, WHITE, cond, 1)
        text(c, t(d, "DAY STREAK", "TAGE SERIE"), cx, cy + dp(18f), 7.5f, MUTE, cond, 1, 0.6f)
        text(c, "${d.today}/${d.goal} XP", cx, cy + dp(30f), 8.5f, if (d.today >= d.goal) GREEN else RED_HI, cond, 1, 0.3f)
        // bottom: due + progress to next tier
        val by = h - pad
        fill(c, pad, by - dp(4f), w - pad, by, dp(2f), alpha(WHITE, 0.12f))
        fill(c, pad, by - dp(4f), pad + (w - 2 * pad) * d.tierPct.coerceIn(0, 100) / 100f, by, dp(2f), RED_HI)
        text(c, "${d.due}", pad, by - dp(11f), 14f, WHITE, cond, 0)
        text(c, t(d, "DUE", "FÄLLIG"), pad + measure("${d.due}", 14f) + dp(4f), by - dp(11f), 8.5f, MUTE, cond, 0, 0.6f)
        text(c, "${d.lp} LP", w - pad, by - dp(11f), 10f, WHITE, cond, 2)
    }

    // ───────── 4x2 ─────────
    fun wide(c: Canvas, w: Float, h: Float, d: WData) {
        background(c, w, h)
        val pad = dp(14f)
        // left: goal ring with the streak inside
        val rr = minOf(h * 0.30f, dp(46f)); val cx = pad + rr + dp(4f); val cy = h / 2 - dp(2f)
        ring(c, cx, cy, rr, 9f, d.today.toFloat() / maxOf(1, d.goal), if (d.today >= d.goal) GREEN else RED_HI)
        val s = d.streak.toString()
        text(c, s, cx, cy + dp(9f), if (s.length > 2) 26f else 32f, WHITE, cond, 1)
        text(c, t(d, "DAY STREAK", "TAGE SERIE"), cx, cy + dp(22f), 7.5f, MUTE, cond, 1, 0.6f)
        text(c, "${d.today}/${d.goal} XP", cx, cy + rr + dp(16f), 9f, if (d.today >= d.goal) GREEN else MUTE, cond, 1, 0.3f)
        // divider
        val x0 = cx + rr + dp(16f)
        fill(c, x0 - dp(8f), pad, x0 - dp(7f), h - pad, 0f, alpha(WHITE, 0.08f))
        // right column
        val xr = w - pad
        title(c, d.tier, x0, pad + dp(11f))
        text(c, "${d.lp} LP", xr, pad + dp(11f), 14f, WHITE, cond, 2)
        // tier progress
        val py = pad + dp(24f)
        fill(c, x0, py, xr, py + dp(5f), dp(2.5f), alpha(WHITE, 0.12f))
        fill(c, x0, py, x0 + (xr - x0) * d.tierPct.coerceIn(0, 100) / 100f, py + dp(5f), dp(2.5f), RED_HI)
        val sub = d.tierLv + " · " + (if (d.next.isNotEmpty()) "${d.left} LP ${t(d, "to", "bis")} ${d.next}" else zoneText(d))
        text(c, sub, x0, py + dp(17f), 9f, MUTE, cond, 0, 0.2f)
        // week bars
        val bt = py + dp(26f); val bb = h - pad - dp(24f)
        val cw = (xr - x0)
        bars(c, x0, bt, x0 + cw * 0.58f, bb + dp(8f), d.xp7, letters(d).map { it.toString() }, d.dow, RED_HI, WHITE, d.goal, 8.5f)
        // chips
        val chx = x0 + cw * 0.64f; val chw = (xr - chx - dp(6f)) / 2
        chip(c, chx, bt, chx + chw, bb + dp(8f), d.due.toString(), t(d, "DUE", "FÄLLIG"), if (d.due > 0) AMBER else WHITE)
        chip(c, chx + chw + dp(6f), bt, xr, bb + dp(8f), d.fresh.toString(), t(d, "NEW", "NEU"), BLUE)
        // bottom row: form + matchday
        val fy = h - pad - dp(5f)
        formDots(c, d, x0, fy, dp(13f))
        val md = "${t(d, "MD", "ST")} ${d.md} · ${(d.mdTore * 100 / maxOf(1, d.mdTarget)).coerceAtMost(999)}%"
        text(c, md, xr, fy + dp(4f), 10f, WHITE, cond, 2, 0.4f)
    }

    private fun chip(c: Canvas, l: Float, tp: Float, r: Float, b: Float, value: String, label: String, accent: Int) {
        fill(c, l, tp, r, b, dp(10f), CARD)
        fill(c, l, tp + dp(8f), l + dp(3f), b - dp(8f), dp(1.5f), accent)
        text(c, value, (l + r) / 2 + dp(1f), (tp + b) / 2 + dp(4f), 19f, WHITE, cond, 1)
        text(c, label, (l + r) / 2 + dp(1f), b - dp(7f), 7.5f, MUTE, cond, 1, 0.6f)
    }

    // ───────── 4x4 ─────────
    /** Height the 4x4 layout needs (dp). A shorter widget is scaled down to fit; a taller one spreads the spare room. */
    private val bigNeed = 394f

    fun big(c: Canvas, w: Float, h: Float, d: WData) {
        val need = dp(bigNeed)
        if (h < need) {
            val k = h / need
            c.save(); c.scale(k, k); bigBody(c, w / k, need, d); c.restore()
        } else bigBody(c, w, h, d)
    }

    private fun bigBody(c: Canvas, w: Float, h: Float, d: WData) {
        background(c, w, h)
        val pad = dp(15f); val xr = w - pad; val inner = xr - pad
        val extra = maxOf(0f, h - dp(bigNeed)) / 5f   // five gaps above the footer
        var y = pad

        // header: league, points, progress to the next league
        title(c, d.tier, pad, y + dp(15f), WHITE, 17f)
        text(c, "${d.lp} LP", xr, y + dp(15f), 17f, WHITE, cond, 2)
        text(c, "${d.tierLv} · ${t(d, "SEASON", "SAISON")} ${d.season} · ${t(d, "MATCHDAY", "SPIELTAG")} ${d.md}", pad + dp(9f), y + dp(30f), 8.5f, MUTE, cond, 0, 0.6f)
        val zc = zoneColor(d.zone); pill(c, zoneText(d), xr, y + dp(29f), 8f, zc, alpha(zc, 0.16f), 2)
        y += dp(40f)
        fill(c, pad, y, xr, y + dp(6f), dp(3f), alpha(WHITE, 0.12f))
        fill(c, pad, y, pad + inner * d.tierPct.coerceIn(0, 100) / 100f, y + dp(6f), dp(3f), RED_HI)
        val sub = if (d.next.isNotEmpty()) "${d.left} LP ${t(d, "to", "bis")} ${d.next}" else t(d, "Top league reached", "Höchste Liga erreicht")
        text(c, sub, pad, y + dp(19f), 9f, MUTE, cond, 0, 0.2f)
        text(c, "${d.tierPct}%", xr, y + dp(19f), 9f, WHITE, cond, 2)
        y += dp(30f) + extra

        // three stat tiles
        val tw = (inner - dp(16f)) / 3; val th = dp(52f)
        tile(c, pad, y, tw, th, d.streak.toString(), t(d, "DAY STREAK", "TAGE SERIE"), RED_HI)
        tile(c, pad + tw + dp(8f), y, tw, th, d.due.toString(), t(d, "DUE", "FÄLLIG"), if (d.due > 0) AMBER else GREEN)
        tile(c, pad + 2 * (tw + dp(8f)), y, tw, th, d.fresh.toString(), t(d, "NEW WORDS", "NEUE WÖRTER"), BLUE)
        y += th + dp(12f) + extra

        // this week's XP and matchday progress
        val colW = inner * 0.60f
        text(c, t(d, "THIS WEEK · XP", "DIESE WOCHE · XP"), pad, y + dp(8f), 8.5f, MUTE, cond, 0, 0.7f)
        bars(c, pad, y + dp(26f), pad + colW, y + dp(88f), d.xp7, letters(d).map { it.toString() }, d.dow, RED_HI, WHITE, d.goal, 8.5f, true)
        val rx = pad + colW + dp(18f); val rw = xr - rx; val rc = rx + rw / 2; val rr = minOf(rw / 2 - dp(4f), dp(24f))
        text(c, t(d, "MATCHDAY", "SPIELTAG"), rc, y + dp(8f), 8.5f, MUTE, cond, 1, 0.7f)
        val cy = y + dp(24f) + rr + dp(2f)
        ring(c, rc, cy, rr, 7f, d.mdTore.toFloat() / maxOf(1, d.mdTarget), if (d.mdTore >= d.mdTarget) GREEN else BLUE)
        text(c, "${(d.mdTore * 100 / maxOf(1, d.mdTarget)).coerceAtMost(999)}%", rc, cy + dp(5f), 15f, WHITE, cond, 1)
        text(c, "${d.mdDays}/${d.mdNeed} ${t(d, "DAYS", "TAGE")} · ${d.mdLeft}${t(d, "d left", "T übrig")}", rc, cy + rr + dp(15f), 8f, MUTE, cond, 1, 0.2f)
        y += dp(94f) + extra

        // activity heatmap and review forecast
        val hw = inner * 0.50f
        text(c, t(d, "LAST 5 WEEKS", "LETZTE 5 WOCHEN"), pad, y + dp(8f), 8.5f, MUTE, cond, 0, 0.7f)
        val hx = heat(c, d, pad, y + dp(15f), hw, dp(50f)) + dp(14f)
        val active = d.heat.count { it > 0 }
        text(c, active.toString(), hx, y + dp(42f), 24f, WHITE, cond, 0)
        text(c, t(d, "OF 35 DAYS", "VON 35 TAGEN"), hx, y + dp(54f), 7.5f, MUTE, cond, 0, 0.5f)
        text(c, t(d, "ACTIVE", "AKTIV"), hx, y + dp(63f), 7.5f, MUTE, cond, 0, 0.5f)
        val fx = pad + hw + dp(20f)
        text(c, t(d, "REVIEWS AHEAD", "WIEDERHOLUNGEN"), fx, y + dp(8f), 8.5f, MUTE, cond, 0, 0.7f)
        val lab = List(7) { letters(d)[(d.dow + it) % 7].toString() }
        bars(c, fx, y + dp(15f), xr, y + dp(66f), d.fc, lab, 0, BLUE, WHITE, 0, 8f, false)
        y += dp(74f) + extra

        // squad / mastery
        masteryBar(c, d, pad, y, inner)
        y += dp(38f)

        // footer: form, season numbers, trophies
        val fy = y + dp(17f)
        fill(c, pad, y, xr, y + dp(1f), 0f, alpha(WHITE, 0.08f))
        formDots(c, d, pad, fy, dp(15f))
        text(c, "${d.goals} ${t(d, "G", "T")} · xG ${"%.1f".format(java.util.Locale.US, d.xg)} · ${d.cs} CS", pad + dp(102f), fy + dp(4f), 10f, MUTE, cond, 0, 0.3f)
        trophies(c, d, xr, fy)
    }

    private fun tile(c: Canvas, x: Float, y: Float, w: Float, h: Float, value: String, label: String, accent: Int) {
        fill(c, x, y, x + w, y + h, dp(11f), CARD)
        fill(c, x, y + dp(9f), x + dp(3f), y + h - dp(9f), dp(1.5f), accent)
        text(c, value, x + dp(12f), y + dp(30f), 28f, WHITE, cond, 0)
        text(c, label, x + dp(12f), y + h - dp(8f), 7.5f, MUTE, cond, 0, 0.6f)
    }

    private fun heat(c: Canvas, d: WData, x: Float, y: Float, w: Float, h: Float): Float {
        val cols = 7; val rows = 5; val gap = dp(3f)
        val cs = minOf((w - gap * (cols - 1)) / cols, (h - gap * (rows - 1)) / rows)
        for (i in 0 until cols * rows) {
            val lv = d.heat.getOrNull(i) ?: 0
            val col = when (lv) { 0 -> alpha(WHITE, 0.07f); 1 -> alpha(RED_HI, 0.38f); 2 -> alpha(RED_HI, 0.70f); else -> RED_HI }
            val cx = x + (i % cols) * (cs + gap); val cy = y + (i / cols) * (cs + gap)
            fill(c, cx, cy, cx + cs, cy + cs, dp(2.5f), col)
            if (i == cols * rows - 1) stroke(c, cx - dp(1f), cy - dp(1f), cx + cs + dp(1f), cy + cs + dp(1f), dp(3f), WHITE, dp(1.2f))
        }
        return x + cols * (cs + gap) - gap
    }

    private fun masteryBar(c: Canvas, d: WData, x: Float, y: Float, w: Float) {
        val names = listOf(t(d, "New", "Neu"), t(d, "Learning", "Lernen"), t(d, "Young", "Jung"), t(d, "Mastered", "Gemeistert"))
        val cols = listOf(GREY, AMBER, BLUE, GREEN)
        val total = maxOf(1, d.cnt.sum())
        text(c, t(d, "YOUR SQUAD · ${d.cnt.sum()} WORDS", "DEIN KADER · ${d.cnt.sum()} WÖRTER"), x, y + dp(8f), 8.5f, MUTE, cond, 0, 0.7f)
        var cx = x; val by = y + dp(14f); val bh = dp(7f)
        fill(c, x, by, x + w, by + bh, dp(3.5f), alpha(WHITE, 0.07f))
        for (i in 0 until 4) {
            val sw = w * d.cnt[i] / total
            if (sw > 0) { fill(c, cx, by, minOf(x + w, cx + sw - dp(1.5f)), by + bh, dp(3.5f), cols[i]); cx += sw }
        }
        var lx = x; val ly = by + bh + dp(12f)
        for (i in 0 until 4) {
            p.style = Paint.Style.FILL; p.shader = null; p.color = cols[i]; c.drawCircle(lx + dp(3f), ly - dp(3f), dp(3f), p)
            val tw = text(c, "${names[i]} ${d.cnt[i]}", lx + dp(9f), ly, 8.5f, WHITE, cond, 0, 0.2f)
            lx += tw + dp(20f)
        }
    }
}
