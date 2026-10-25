// A tiny stand-in for the android.graphics classes WidgetArt uses, drawn with Java2D, so the widgets can be rendered to PNG on a
// normal computer (see README.md). Not part of the app.
package android.graphics

import java.awt.BasicStroke
import java.awt.Color as AwtColor
import java.awt.Font
import java.awt.GradientPaint
import java.awt.RenderingHints
import java.awt.font.TextAttribute
import java.awt.geom.Arc2D
import java.awt.geom.Ellipse2D
import java.awt.geom.Line2D
import java.awt.geom.RoundRectangle2D
import java.awt.image.BufferedImage

class RectF { var l = 0f; var t = 0f; var r = 0f; var b = 0f; fun set(l: Float, t: Float, r: Float, b: Float) { this.l = l; this.t = t; this.r = r; this.b = b } }

class Typeface(val font: Font) {
    companion object { val DEFAULT_BOLD = Typeface(Font("SansSerif", Font.BOLD, 12)) }
}

class Shader { enum class TileMode { CLAMP } }
class LinearGradient(val x0: Float, val y0: Float, val x1: Float, val y1: Float, val c0: Int, val c1: Int, val tile: Shader.TileMode)

class Paint(flags: Int = 0) {
    companion object { const val ANTI_ALIAS_FLAG = 1 }
    enum class Style { FILL, STROKE }
    enum class Cap { BUTT, ROUND }
    enum class Align { LEFT, CENTER, RIGHT }
    var color = 0; var style = Style.FILL; var strokeWidth = 1f; var strokeCap = Cap.BUTT
    var textSize = 12f; var typeface: Typeface = Typeface.DEFAULT_BOLD; var textAlign = Align.LEFT
    var letterSpacing = 0f; var shader: LinearGradient? = null
    fun derived(): Font {
        val attrs = HashMap<TextAttribute, Any>(); attrs[TextAttribute.TRACKING] = letterSpacing.toDouble()
        return typeface.font.deriveFont(textSize).deriveFont(attrs)
    }
    fun measureText(s: String): Float {
        val f = derived(); val frc = java.awt.font.FontRenderContext(null, true, true)
        return f.createGlyphVector(frc, s).logicalBounds.width.toFloat()
    }
}

class Canvas(val img: BufferedImage) {
    val g = img.createGraphics().also {
        it.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
        it.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON)
        it.setRenderingHint(RenderingHints.KEY_FRACTIONALMETRICS, RenderingHints.VALUE_FRACTIONALMETRICS_ON)
        it.setRenderingHint(RenderingHints.KEY_STROKE_CONTROL, RenderingHints.VALUE_STROKE_PURE)
    }
    private fun argb(c: Int) = AwtColor(c, true)
    private fun apply(p: Paint) {
        val sh = p.shader
        if (sh != null && p.style == Paint.Style.FILL) g.paint = GradientPaint(sh.x0, sh.y0, argb(sh.c0), sh.x1, sh.y1, argb(sh.c1)) else g.paint = argb(p.color)
        if (p.style == Paint.Style.STROKE) g.stroke = BasicStroke(p.strokeWidth, if (p.strokeCap == Paint.Cap.ROUND) BasicStroke.CAP_ROUND else BasicStroke.CAP_BUTT, BasicStroke.JOIN_ROUND)
    }
    fun drawRoundRect(r: RectF, rx: Float, ry: Float, p: Paint) {
        apply(p); val s = RoundRectangle2D.Float(r.l, r.t, r.r - r.l, r.b - r.t, rx * 2, ry * 2)
        if (p.style == Paint.Style.FILL) g.fill(s) else g.draw(s)
    }
    fun drawArc(r: RectF, start: Float, sweep: Float, useCenter: Boolean, p: Paint) {
        apply(p); val s = Arc2D.Float(r.l, r.t, r.r - r.l, r.b - r.t, -start, -sweep, Arc2D.OPEN)
        if (p.style == Paint.Style.FILL) g.fill(s) else g.draw(s)
    }
    fun drawCircle(cx: Float, cy: Float, rad: Float, p: Paint) {
        apply(p); val s = Ellipse2D.Float(cx - rad, cy - rad, rad * 2, rad * 2)
        if (p.style == Paint.Style.FILL) g.fill(s) else g.draw(s)
    }
    fun save() { saved.add(g.transform) }
    fun restore() { if (saved.isNotEmpty()) g.transform = saved.removeAt(saved.size - 1) }
    fun scale(x: Float, y: Float) { g.scale(x.toDouble(), y.toDouble()) }
    private val saved = ArrayList<java.awt.geom.AffineTransform>()
    fun drawLine(x0: Float, y0: Float, x1: Float, y1: Float, p: Paint) { apply(p); g.draw(Line2D.Float(x0, y0, x1, y1)) }
    fun drawText(s: String, x: Float, y: Float, p: Paint) {
        apply(p); g.paint = argb(p.color); g.font = p.derived()
        val w = p.measureText(s); val xx = when (p.textAlign) { Paint.Align.CENTER -> x - w / 2; Paint.Align.RIGHT -> x - w; else -> x }
        g.drawString(s, xx, y)
    }
}
