package com.steadypath.app

import android.content.Intent
import android.net.VpnService
import android.provider.Settings
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray

class ContentFilterModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "ContentFilterModule"

  @ReactMethod
  fun updateConfig(
    enabled: Boolean,
    safeSearch: Boolean,
    strictMode: Boolean,
    blockedCategories: ReadableArray,
    promise: Promise,
  ) {
    try {
      val parsedCategories = mutableListOf<String>()
      for (index in 0 until blockedCategories.size()) {
        val value = blockedCategories.getString(index)
        if (!value.isNullOrBlank()) {
          parsedCategories.add(value)
        }
      }

      ContentFilterPrefs.writeConfig(
        reactContext,
        enabled,
        safeSearch,
        strictMode,
        parsedCategories,
      )
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("CONTENT_FILTER_UPDATE_FAILED", error)
    }
  }

  @ReactMethod
  fun getStatus(promise: Promise) {
    try {
      val config = ContentFilterPrefs.readConfig(reactContext)
      val result = Arguments.createMap().apply {
        putBoolean("available", true)
        putString("platformLabel", "Android DNS content filter")
        putBoolean("vpnPermissionGranted", config.vpnPermissionGranted)
        putBoolean("serviceRunning", config.serviceRunning)
        putBoolean("safeSearch", config.safeSearch)
        putBoolean("strictMode", config.strictMode)
        putArray("blockedCategories", Arguments.fromList(config.blockedCategories.toList()))
        putInt("blockedRequestCount", config.blockedRequestCount)
        putString("lastBlockedDomain", config.lastBlockedDomain)
      }
      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("CONTENT_FILTER_STATUS_FAILED", error)
    }
  }

  @ReactMethod
  fun requestVpnPermissionAndStart(promise: Promise) {
    try {
      val prepareIntent = VpnService.prepare(reactContext)

      if (prepareIntent != null) {
        prepareIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        reactContext.startActivity(prepareIntent)
        ContentFilterPrefs.markVpnPermissionGranted(reactContext, false)
        promise.resolve("permission_requested")
        return
      }

      ContentFilterPrefs.markVpnPermissionGranted(reactContext, true)
      val serviceIntent = Intent(reactContext, ContentFilterVpnService::class.java)
      ContextCompat.startForegroundService(reactContext, serviceIntent)
      promise.resolve("started")
    } catch (error: Exception) {
      promise.reject("CONTENT_FILTER_START_FAILED", error)
    }
  }

  @ReactMethod
  fun stopFiltering(promise: Promise) {
    try {
      val serviceIntent = Intent(reactContext, ContentFilterVpnService::class.java)
      reactContext.stopService(serviceIntent)
      ContentFilterPrefs.markServiceRunning(reactContext, false)
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("CONTENT_FILTER_STOP_FAILED", error)
    }
  }

  @ReactMethod
  fun openVpnSettings() {
    val intent = Intent(Settings.ACTION_VPN_SETTINGS).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    reactContext.startActivity(intent)
  }
}
