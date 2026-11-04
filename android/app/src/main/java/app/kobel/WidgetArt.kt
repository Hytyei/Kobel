package app.kobel

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
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
    val stage: String = "", val tierI: Int = 0, val games: String = "",
)

/**
 * Draws the three widgets with plain android.graphics calls (no Views, no network). Each draw function paints a whole
 * widget onto a canvas of [w] x [h] pixels; [u] is pixels per dp. Bundesliga broadcast look (4.0): near-black navy,
 * hard square blocks, condensed heavy type, and the score bug: time cell, your run, today's points, club ticks on top.
 */
class WidgetArt(private val u: Float, private val cond: Typeface, private val body: Typeface) {
    companion object {
        const val BG2 = 0xFF020B12.toInt()
        const val CARD = 0xFF0F1A22.toInt()
        const val BUG = 0xFFC9CDD1.toInt()
        const val INK = 0xFF14181C.toInt()
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
        rf.set(l, tp, r, b); c.drawRect(rf, p)
    }

    private fun stroke(c: Canvas, l: Float, tp: Float, r: Float, b: Float, rad: Float, color: Int, wpx: Float) {
        p.style = Paint.Style.STROKE; p.shader = null; p.color = color; p.strokeWidth = wpx
        rf.set(l, tp, r, b); c.drawRect(rf, p)
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

    private fun background(c: Canvas, w: Float, h: Float) {
        val rad = dp(8f)
        p.style = Paint.Style.FILL; p.shader = null; p.color = BG2
        rf.set(0f, 0f, w, h); c.drawRoundRect(rf, rad, rad, p)
    }

    /**
     * The score bug: match minute, your streak, today's points. Five ticks on top fill towards the daily goal, the strip
     * under it runs with the day. Same object as the question screen in the app.
     */
    private fun scoreBug(c: Canvas, x: Float, y: Float, w: Float, h: Float, d: WData, k: Clock) {
        val tw = w * 0.30f; val cw = (w - tw) / 2
        val hx = x + tw; val ax = hx + cw; val r = x + w
        fill(c, x, y, hx, y + h, 0f, BUG)
        val mins = k.label
        text(c, mins, x + tw / 2, y + h / 2 + dp(6f), 18f, INK, cond, 1)
        fill(c, hx, y, ax, y + h, 0f, RED)
        fill(c, ax, y, r, y + h, 0f, WHITE)
        text(c, t(d, "DAYS", "TAGE"), hx + cw / 2, y + dp(12f), 8.5f, alpha(WHITE, 0.85f), cond, 1, 0.4f)
        text(c, d.streak.toString(), hx + cw / 2, y + h - dp(7f), 22f, WHITE, cond, 1)
        text(c, "XP", ax + cw / 2, y + dp(12f), 8.5f, alpha(INK, 0.7f), cond, 1, 0.4f)
        text(c, d.today.toString(), ax + cw / 2, y + h - dp(7f), 22f, INK, cond, 1)
        val on = (d.today * 5 / maxOf(1, d.goal)).coerceIn(0, 5)
        val tick = (w - tw - dp(8f)) / 5
        for (i in 0 until 5) {
            val l = hx + i * (tick + dp(2f))
            fill(c, l, y - dp(5f), l + tick, y - dp(1f), 0f, if (i < on) RED else alpha(WHITE, 0.14f))
        }
        fill(c, x, y + h, r, y + h + dp(4f), 0f, alpha(WHITE, 0.14f))
        fill(c, x, y + h, x + w * k.frac, y + h + dp(4f), 0f, clockColor(k))
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

    // ───────── the day as a football match: kick-off 00:00, half-time 12:00, final whistle at midnight ─────────
    private class Clock(val minute: Int, val label: String, val safe: Boolean, val left: String, val frac: Float, val streak: Boolean)

    private fun clock(d: WData): Clock {
        val mins = MatchClock.minsNow()
        val rest = 1440 - mins
        val left = if (d.de) (if (rest >= 60) "${rest / 60} Std ${rest % 60} Min" else "$rest Min") else (if (rest >= 60) "${rest / 60}h ${rest % 60}m" else "${rest}m")
        return Clock(MatchClock.minute(mins), MatchClock.label(mins), d.today > 0, left, mins / 1440f, d.streak > 0)
    }

    /** "78'" while the streak is on the line, "FULL TIME" once you have played today (the streak is safe). */
    private fun clockText(d: WData, k: Clock): String = when {
        k.safe -> t(d, "FULL TIME · STREAK SAFE", "ABPFIFF · SERIE SICHER")
        !k.streak -> t(d, "KICK-OFF · START A RUN", "ANSTOSS · NEUE SERIE")
        else -> "${k.label} · ${t(d, "WHISTLE IN ", "ABPFIFF IN ")}${k.left}"
    }
    private fun clockColor(k: Clock) = if (k.safe) GREEN else if (!k.streak) BLUE else if (k.minute >= 80) RED_HI else if (k.minute >= 62) AMBER else WHITE

    /** The match line: elapsed time in colour, a tick at half-time. */
    private fun matchBar(c: Canvas, x: Float, y: Float, w: Float, k: Clock) {
        fill(c, x, y, x + w, y + dp(4f), dp(2f), alpha(WHITE, 0.12f))
        fill(c, x, y, x + maxOf(dp(4f), w * k.frac), y + dp(4f), dp(2f), clockColor(k))
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
            fill(c, cx - size / 2, cy - size / 2, cx + size / 2, cy + size / 2, 0f, col)
            if (res != null) text(c, if (res == "X") "L" else res, cx, cy + dp(3.2f), 8.5f, 0xFF081018.toInt(), cond, 1)
        }
    }

    private fun trophies(c: Canvas, d: WData, xRight: Float, cy: Float) {
        var x = xRight
        for ((n, col) in listOf(d.bronze to BRONZE, d.silver to SILVER, d.gold to GOLD)) {
            val s = n.toString(); val tw = measure(s, 12f)
            text(c, s, x, cy + dp(4f), 12f, WHITE, cond, 2); x -= tw + dp(4f)
            fill(c, x - dp(8f), cy - dp(4.5f), x + dp(1f), cy + dp(4.5f), 0f, col); x -= dp(16f)
        }
    }

    // ───────── form widgets: league, the match clock, the last seven games ─────────
    /**
     * The match clock as a stadium ring: the track fills from 0' at the top round to 90', a tick marks half-time and the
     * ball sits at the current minute. White on the dark card; only the ball changes, to green once today's game is won.
     */
    private fun clockRing(c: Canvas, cx: Float, cy: Float, r: Float, d: WData, k: Clock) {
        val sw = r * 0.12f
        val frac = (MatchClock.minsNow() / MatchClock.FULL.toFloat()).coerceIn(0f, 1f)
        p.shader = null; p.style = Paint.Style.STROKE; p.strokeCap = Paint.Cap.BUTT; p.strokeWidth = sw
        rf.set(cx - r, cy - r, cx + r, cy + r)
        p.color = alpha(WHITE, 0.12f); c.drawArc(rf, 0f, 360f, false, p)
        p.color = WHITE; c.drawArc(rf, -90f, 360f * frac, false, p)
        p.strokeWidth = maxOf(dp(1.2f), sw * 0.22f); p.color = alpha(WHITE, 0.55f)   // half-time, at the bottom
        c.drawLine(cx, cy + r - sw * 1.1f, cx, cy + r + sw * 1.1f, p)
        p.style = Paint.Style.FILL
        val a = Math.toRadians((-90.0 + 360.0 * frac)); val bx = cx + r * Math.cos(a).toFloat(); val by = cy + r * Math.sin(a).toFloat()
        p.color = BG2; c.drawCircle(bx, by, sw * 1.15f, p)
        p.color = if (k.safe) GREEN else WHITE; c.drawCircle(bx, by, sw * 0.82f, p)
        // the minute large, a short status under it
        var size = r / u * 0.62f
        while (measure(k.label, size) > r * 1.45f && size > 10f) size -= 1f
        text(c, k.label, cx, cy + dp(size * 0.30f), size, WHITE, cond, 1)
        val cap = if (k.safe) t(d, "SAFE", "SICHER") else if (!k.streak) t(d, "NEW RUN", "NEUE SERIE") else t(d, "${k.left} LEFT", "NOCH ${k.left}").uppercase()
        var cs = maxOf(7.5f, r / u * 0.16f)
        while (measure(cap, cs, cond, 0.3f) > r * 1.5f && cs > 6.5f) cs -= 0.5f
        text(c, cap, cx, cy + dp(size * 0.30f) + dp(cs + 4f), cs, if (k.safe) GREEN else MUTE, cond, 1, 0.3f)
    }

    private fun formRow(c: Canvas, d: WData, l: Float, r: Float, top: Float, rowH: Float, letterDp: Float) {
        val list = d.games.takeLast(7).padStart(7, 'N')
        val gp = dp(3f); val cw = (r - l - 6 * gp) / 7
        list.forEachIndexed { i, ch ->
            val x = l + i * (cw + gp)
            val col = when (ch) { 'W' -> GREEN; 'D' -> AMBER; 'L' -> RED_HI; else -> alpha(WHITE, 0.08f) }
            fill(c, x, top, x + cw, top + rowH, 0f, col)
            val letter = when (ch) { 'W' -> t(d, "W", "S"); 'D' -> t(d, "D", "U"); 'L' -> t(d, "L", "N"); else -> "" }
            if (letter.isNotEmpty()) text(c, letter, x + cw / 2, top + rowH / 2 + dp(letterDp * 0.36f), letterDp, 0xFF081018.toInt(), cond, 1)
        }
    }

    private fun drawLogo(c: Canvas, logo: Bitmap?, x: Float, y: Float, hgt: Float): Float {
        if (logo == null) return 0f
        val lw = hgt * logo.width / logo.height
        rf.set(x, y, x + lw, y + hgt); p.isFilterBitmap = true; p.shader = null; p.alpha = 255
        c.drawBitmap(logo, null, rf, p)
        return lw
    }

    /** 4x2: logo and league on the left, the clock ring on the right, the form along the bottom. */
    fun form(c: Canvas, w: Float, h: Float, d: WData, logo: Bitmap?) {
        background(c, w, h)
        val pad = dp(14f); val ck = clock(d); val rowH = minOf(dp(30f), h * 0.22f); val gap = dp(12f)
        val topB = h - pad - rowH - gap; val topH = topB - pad
        val r = minOf(topH / 2 - dp(2f), w * 0.17f); val cx = w - pad - r - dp(2f); val cy = pad + topH / 2
        clockRing(c, cx, cy, r, d, ck)
        val lh = minOf(topH, dp(62f))
        val lw = drawLogo(c, logo, pad, pad + (topH - lh) / 2, lh)
        val tx = pad + (if (lw > 0) lw + dp(11f) else 0f)
        val room = cx - r - dp(14f) - tx; val mid = pad + topH / 2
        text(c, fit(d.tier.uppercase(), 17f, room), tx, mid - dp(1f), 17f, WHITE, cond, 0, 0.2f)
        text(c, fit(d.stage, 12f, room, body), tx, mid + dp(15f), 12f, MUTE, body, 0)
        formRow(c, d, pad, w - pad, h - pad - rowH, rowH, 14f)
    }

    /** 2x2: the same three facts stacked. Logo and clock side by side, then league and stage, then the form. */
    fun formSmall(c: Canvas, w: Float, h: Float, d: WData, logo: Bitmap?) {
        background(c, w, h)
        val pad = dp(12f); val ck = clock(d)
        val rowH = minOf(dp(20f), h * 0.13f)
        val textH = dp(34f)
        val topH = h - 2 * pad - rowH - textH - dp(8f)
        val r = minOf(topH / 2, (w - 2 * pad) * 0.29f); val cx = w - pad - r - dp(1f); val cy = pad + topH / 2
        clockRing(c, cx, cy, r, d, ck)
        val lh = minOf(topH * 0.82f, cx - r - pad - dp(6f), dp(54f))
        drawLogo(c, logo, pad, pad + (topH - lh) / 2, lh)
        val ty = pad + topH + dp(6f); val room = w - 2 * pad
        text(c, fit(d.tier.uppercase(), 14f, room), pad, ty + dp(13f), 14f, WHITE, cond, 0, 0.2f)
        text(c, fit(d.stage, 10.5f, room, body), pad, ty + dp(27f), 10.5f, MUTE, body, 0)
        formRow(c, d, pad, w - pad, h - pad - rowH, rowH, 11f)
    }

    private fun fit(s: String, sizeDp: Float, room: Float, face: Typeface = cond): String {
        if (measure(s, sizeDp, face) <= room) return s
        var n = s.length
        while (n > 1 && measure(s.take(n) + "…", sizeDp, face) > room) n--
        return s.take(n).trimEnd() + "…"
    }

    // ───────── 2x2 ─────────
    fun small(c: Canvas, w: Float, h: Float, d: WData) {
        background(c, w, h)
        val pad = dp(11f); val ck = clock(d); val top = pad + dp(5f)
        scoreBug(c, pad, top, w - 2 * pad, dp(44f), d, ck)
        // what is waiting today, large, then the league underneath
        val by = h - pad; val mid = top + dp(48f) + (by - dp(26f) - top - dp(48f)) / 2
        text(c, "${d.due}", pad, mid + dp(14f), 38f, WHITE, cond, 0)
        text(c, t(d, "DUE", "FÄLLIG"), pad + measure("${d.due}", 38f) + dp(6f), mid + dp(14f), 11f, MUTE, cond, 0, 0.6f)
        text(c, d.tier.uppercase(), pad, by - dp(11f), 11f, WHITE, cond, 0, 0.5f)
        text(c, "${d.lp} LP", w - pad, by - dp(11f), 11f, WHITE, cond, 2)
        fill(c, pad, by - dp(5f), w - pad, by, 0f, alpha(WHITE, 0.14f))
        fill(c, pad, by - dp(5f), pad + (w - 2 * pad) * d.tierPct.coerceIn(0, 100) / 100f, by, 0f, RED)
    }

    // ───────── 4x2 ─────────
    fun wide(c: Canvas, w: Float, h: Float, d: WData) {
        background(c, w, h)
        val pad = dp(13f); val ck = clock(d); val xr = w - pad; val top = pad + dp(5f)
        val bw = (xr - pad) * 0.56f
        scoreBug(c, pad, top, bw, dp(44f), d, ck)
        // right of the bug: league, points, progress to the next league
        val rx = pad + bw + dp(12f)
        title(c, d.tier, rx, top + dp(12f))
        text(c, "${d.lp} LP", xr, top + dp(12f), 13f, WHITE, cond, 2)
        val py = top + dp(19f)
        fill(c, rx, py, xr, py + dp(5f), 0f, alpha(WHITE, 0.14f))
        fill(c, rx, py, rx + (xr - rx) * d.tierPct.coerceIn(0, 100) / 100f, py + dp(5f), 0f, RED)
        val sub = if (d.next.isNotEmpty()) "${d.left} LP ${t(d, "to", "bis")} ${d.next}" else zoneText(d)
        text(c, sub, rx, py + dp(18f), 9f, MUTE, cond, 0, 0.2f)
        // the week and what is waiting
        val fy = h - pad - dp(7f)
        val bt = top + dp(58f); val bb = fy - dp(12f)
        bars(c, pad, bt, pad + bw, bb, d.xp7, letters(d).map { it.toString() }, d.dow, RED_HI, WHITE, d.goal, 8.5f)
        val chw = (xr - rx - dp(6f)) / 2
        chip(c, rx, bt, rx + chw, bb, d.due.toString(), t(d, "DUE", "FÄLLIG"), if (d.due > 0) AMBER else WHITE)
        chip(c, rx + chw + dp(6f), bt, xr, bb, d.fresh.toString(), t(d, "NEW", "NEU"), BLUE)
        // bottom row: form and matchday
        formDots(c, d, pad, fy, dp(13f))
        val md = "${t(d, "MD", "ST")} ${d.md} · ${(d.mdTore * 100 / maxOf(1, d.mdTarget)).coerceAtMost(999)}%"
        text(c, md, xr, fy + dp(4f), 10f, WHITE, cond, 2, 0.4f)
        text(c, clockText(d, ck), pad + dp(92f), fy + dp(4f), 8.5f, clockColor(ck), cond, 0, 0.5f)
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

        // the score bug, then what is waiting
        val tw = (inner - dp(16f)) / 3; val th = dp(52f)
        val ck = clock(d)
        scoreBug(c, pad, y + dp(2f), 2 * tw + dp(8f), th - dp(6f), d, ck)
        tile(c, pad + 2 * (tw + dp(8f)), y, tw, th, d.due.toString(), t(d, "DUE", "FÄLLIG"), if (d.due > 0) AMBER else GREEN)
        y += th + dp(12f) + extra

        // this week's XP and matchday progress
        val colW = inner * 0.60f
        text(c, t(d, "THIS WEEK · XP", "DIESE WOCHE · XP"), pad, y + dp(8f), 8.5f, MUTE, cond, 0, 0.7f)
        bars(c, pad, y + dp(26f), pad + colW, y + dp(88f), d.xp7, letters(d).map { it.toString() }, d.dow, RED_HI, WHITE, d.goal, 8.5f, true)
        val rx = pad + colW + dp(18f); val rw = xr - rx; val rc = rx + rw / 2; val rr = minOf(rw / 2 - dp(4f), dp(24f))
        text(c, t(d, "MATCHDAY", "SPIELTAG"), rc, y + dp(8f), 8.5f, MUTE, cond, 1, 0.7f)
        val cy = y + dp(24f) + rr + dp(2f)
        text(c, "${(d.mdTore * 100 / maxOf(1, d.mdTarget)).coerceAtMost(999)}%", rc, cy + dp(8f), 26f, WHITE, cond, 1)
        fill(c, rx, cy + dp(16f), xr, cy + dp(21f), 0f, alpha(WHITE, 0.14f))
        fill(c, rx, cy + dp(16f), rx + rw * (d.mdTore.toFloat() / maxOf(1, d.mdTarget)).coerceIn(0f, 1f), cy + dp(21f), 0f, if (d.mdTore >= d.mdTarget) GREEN else BLUE)
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
            fill(c, lx, ly - dp(6f), lx + dp(6f), ly, 0f, cols[i])
            val tw = text(c, "${names[i]} ${d.cnt[i]}", lx + dp(9f), ly, 8.5f, WHITE, cond, 0, 0.2f)
            lx += tw + dp(20f)
        }
    }
}
