package com.freeman.mvp.contentblocker

import android.content.Intent
import android.net.VpnService
import android.os.Build
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ContentBlockerModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "ContentBlocker"

  @ReactMethod
  fun start(promise: Promise) {
    try {
      Log.i(TAG, "Content blocker start requested")
      val prepareIntent = VpnService.prepare(reactContext)
      if (prepareIntent != null) {
        Log.i(TAG, "VPN permission is required; launching consent screen")
        val activity = getCurrentActivity()
        if (activity == null) {
          prepareIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          reactContext.startActivity(prepareIntent)
        } else {
          activity.runOnUiThread {
            activity.startActivityForResult(prepareIntent, VPN_PERMISSION_REQUEST_CODE)
          }
        }
        ContentBlockerPrefs.setEnabled(reactContext, false)
        promise.resolve("permission_required")
        return
      }

      Log.i(TAG, "VPN already prepared; starting service")
      val serviceIntent = Intent(reactContext, ContentBlockerVpnService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        reactContext.startForegroundService(serviceIntent)
      } else {
        reactContext.startService(serviceIntent)
      }

      ContentBlockerPrefs.setEnabled(reactContext, true)
      promise.resolve("started")
    } catch (exception: Exception) {
      Log.e(TAG, "Failed to start content blocker", exception)
      ContentBlockerPrefs.setEnabled(reactContext, false)
      promise.reject("CONTENT_BLOCKER_START_FAILED", exception)
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    try {
      val stopIntent = Intent(reactContext, ContentBlockerVpnService::class.java)
        .setAction(ContentBlockerVpnService.ACTION_STOP)
      reactContext.startService(stopIntent)
      ContentBlockerPrefs.setEnabled(reactContext, false)
      promise.resolve("stopped")
    } catch (exception: Exception) {
      promise.reject("CONTENT_BLOCKER_STOP_FAILED", exception)
    }
  }

  @ReactMethod
  fun isEnabled(promise: Promise) {
    promise.resolve(ContentBlockerPrefs.isEnabled(reactContext))
  }

  @ReactMethod
  fun isRunning(promise: Promise) {
    promise.resolve(ContentBlockerVpnService.isRunning(reactContext))
  }

  @ReactMethod
  fun hasAcceptedAgreement(promise: Promise) {
    promise.resolve(ContentBlockerPrefs.hasAcceptedAgreement(reactContext))
  }

  @ReactMethod
  fun setAgreementAccepted(accepted: Boolean, promise: Promise) {
    ContentBlockerPrefs.setAgreementAccepted(reactContext, accepted)
    promise.resolve(ContentBlockerPrefs.hasAcceptedAgreement(reactContext))
  }

  @ReactMethod
  fun openVpnSettings(promise: Promise) {
    try {
      val intent = Intent(Settings.ACTION_VPN_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactContext.startActivity(intent)
      promise.resolve("opened")
    } catch (exception: Exception) {
      promise.reject("VPN_SETTINGS_FAILED", exception)
    }
  }

  companion object {
    private const val TAG = "ContentBlockerModule"
    private const val VPN_PERMISSION_REQUEST_CODE = 4021
  }
}
