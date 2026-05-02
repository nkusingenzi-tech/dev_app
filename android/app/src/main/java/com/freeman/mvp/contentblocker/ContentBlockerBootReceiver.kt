package com.freeman.mvp.contentblocker

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.VpnService
import android.os.Build
import android.util.Log

class ContentBlockerBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_BOOT_COMPLETED) {
      return
    }

    if (!ContentBlockerPrefs.isEnabled(context)) return
    if (VpnService.prepare(context) != null) {
      Log.i(TAG, "VPN permission missing; content blocker cannot auto-start")
      ContentBlockerPrefs.setEnabled(context, false)
      return
    }

    val serviceIntent = Intent(context, ContentBlockerVpnService::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      context.startForegroundService(serviceIntent)
    } else {
      context.startService(serviceIntent)
    }
  }

  companion object {
    private const val TAG = "ContentBlockerBoot"
  }
}
