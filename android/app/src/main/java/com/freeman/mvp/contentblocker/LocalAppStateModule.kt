package com.freeman.mvp.contentblocker

import android.content.Context
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class LocalAppStateModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "LocalAppState"

  @ReactMethod
  fun load(promise: Promise) {
    try {
      val snapshot = getPreferences().getString(KEY_SNAPSHOT, null)
      promise.resolve(snapshot)
    } catch (exception: Exception) {
      Log.e(TAG, "Failed to load local app state", exception)
      promise.reject("LOCAL_APP_STATE_LOAD_FAILED", exception)
    }
  }

  @ReactMethod
  fun save(snapshotJson: String, promise: Promise) {
    try {
      getPreferences()
        .edit()
        .putString(KEY_SNAPSHOT, snapshotJson)
        .apply()
      promise.resolve(true)
    } catch (exception: Exception) {
      Log.e(TAG, "Failed to save local app state", exception)
      promise.reject("LOCAL_APP_STATE_SAVE_FAILED", exception)
    }
  }

  @ReactMethod
  fun clear(promise: Promise) {
    try {
      getPreferences()
        .edit()
        .remove(KEY_SNAPSHOT)
        .apply()
      promise.resolve(true)
    } catch (exception: Exception) {
      Log.e(TAG, "Failed to clear local app state", exception)
      promise.reject("LOCAL_APP_STATE_CLEAR_FAILED", exception)
    }
  }

  private fun getPreferences() = reactContext.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

  companion object {
    private const val TAG = "LocalAppState"
    private const val PREFERENCES_NAME = "freeman_local_app_state"
    private const val KEY_SNAPSHOT = "snapshot_json"
  }
}
