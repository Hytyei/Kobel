package app.kobel

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

/** Phone notifications. Channels let you silence one kind in Android's settings (social, streak, updates). */
object Notifier {
    const val CH_SOCIAL = "social"
    const val CH_STREAK = "streak"
    // "update2": the first channel was created as silent (IMPORTANCE_LOW) and Android never lets an app raise an existing channel,
    // so updates use a new id with a pop-up (heads-up) importance
    const val CH_UPDATE = "update2"

    fun ensureChannels(ctx: Context) {
        if (Build.VERSION.SDK_INT < 26) return
        val nm = ctx.getSystemService(NotificationManager::class.java) ?: return
        fun ch(id: String, name: String, desc: String, imp: Int) {
            if (nm.getNotificationChannel(id) == null) nm.createNotificationChannel(NotificationChannel(id, name, imp).apply { description = desc })
        }
        ch(CH_SOCIAL, "Friends and study groups", "Friend requests, match requests, study group news", NotificationManager.IMPORTANCE_DEFAULT)
        ch(CH_STREAK, "Streak reminder", "An evening reminder when your streak is about to end", NotificationManager.IMPORTANCE_DEFAULT)
        ch(CH_UPDATE, "App updates", "A new Kobel version is available", NotificationManager.IMPORTANCE_HIGH)
        if (nm.getNotificationChannel("update") != null) nm.deleteNotificationChannel("update")
    }

    /** Android 13+ asks the user once; before that notifications are allowed by default. */
    fun canPost(ctx: Context): Boolean =
        Build.VERSION.SDK_INT < 33 || ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

    fun show(ctx: Context, id: Int, channel: String, title: String, text: String) {
        if (!canPost(ctx)) return
        ensureChannels(ctx)
        val open = PendingIntent.getActivity(
            ctx, 0, Intent(ctx, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val n = NotificationCompat.Builder(ctx, channel)
            .setSmallIcon(R.drawable.ic_stat_kobel)
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(text))
            .setAutoCancel(true)
            .setContentIntent(open)
            .setColor(0xFFD20515.toInt())
            .setPriority(if (channel == CH_UPDATE) NotificationCompat.PRIORITY_HIGH else NotificationCompat.PRIORITY_DEFAULT)
            .build()
        try {
            (ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).notify(id, n)
        } catch (_: SecurityException) {
        }
    }
}
