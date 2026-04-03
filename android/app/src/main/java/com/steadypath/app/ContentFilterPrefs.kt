package com.steadypath.app

import android.content.Context
import org.json.JSONArray

object ContentFilterPrefs {
  private const val PREFS_NAME = "steady_path_content_filter"
  private const val KEY_ENABLED = "enabled"
  private const val KEY_SAFE_SEARCH = "safe_search"
  private const val KEY_STRICT_MODE = "strict_mode"
  private const val KEY_BLOCKED_CATEGORIES = "blocked_categories"
  private const val KEY_VPN_PERMISSION_GRANTED = "vpn_permission_granted"
  private const val KEY_SERVICE_RUNNING = "service_running"
  private const val KEY_BLOCKED_REQUEST_COUNT = "blocked_request_count"
  private const val KEY_LAST_BLOCKED_DOMAIN = "last_blocked_domain"

  data class Config(
    val enabled: Boolean,
    val safeSearch: Boolean,
    val strictMode: Boolean,
    val blockedCategories: Set<String>,
    val vpnPermissionGranted: Boolean,
    val serviceRunning: Boolean,
    val blockedRequestCount: Int,
    val lastBlockedDomain: String?,
  )

  fun writeConfig(
    context: Context,
    enabled: Boolean,
    safeSearch: Boolean,
    strictMode: Boolean,
    blockedCategories: List<String>,
  ) {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    prefs
      .edit()
      .putBoolean(KEY_ENABLED, enabled)
      .putBoolean(KEY_SAFE_SEARCH, safeSearch)
      .putBoolean(KEY_STRICT_MODE, strictMode)
      .putString(KEY_BLOCKED_CATEGORIES, JSONArray(blockedCategories).toString())
      .apply()
  }

  fun readConfig(context: Context): Config {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val rawCategories = prefs.getString(KEY_BLOCKED_CATEGORIES, "[]") ?: "[]"
    val parsedCategories = mutableSetOf<String>()
    val jsonArray = JSONArray(rawCategories)

    for (index in 0 until jsonArray.length()) {
      parsedCategories.add(jsonArray.optString(index))
    }

    return Config(
      enabled = prefs.getBoolean(KEY_ENABLED, false),
      safeSearch = prefs.getBoolean(KEY_SAFE_SEARCH, true),
      strictMode = prefs.getBoolean(KEY_STRICT_MODE, true),
      blockedCategories = parsedCategories,
      vpnPermissionGranted = prefs.getBoolean(KEY_VPN_PERMISSION_GRANTED, false),
      serviceRunning = prefs.getBoolean(KEY_SERVICE_RUNNING, false),
      blockedRequestCount = prefs.getInt(KEY_BLOCKED_REQUEST_COUNT, 0),
      lastBlockedDomain = prefs.getString(KEY_LAST_BLOCKED_DOMAIN, null),
    )
  }

  fun markVpnPermissionGranted(context: Context, granted: Boolean) {
    context
      .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .putBoolean(KEY_VPN_PERMISSION_GRANTED, granted)
      .apply()
  }

  fun markServiceRunning(context: Context, running: Boolean) {
    context
      .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .putBoolean(KEY_SERVICE_RUNNING, running)
      .apply()
  }

  fun resetRuntimeStats(context: Context) {
    context
      .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .putInt(KEY_BLOCKED_REQUEST_COUNT, 0)
      .remove(KEY_LAST_BLOCKED_DOMAIN)
      .apply()
  }

  fun recordBlockedDomain(context: Context, domain: String) {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val nextCount = prefs.getInt(KEY_BLOCKED_REQUEST_COUNT, 0) + 1
    prefs
      .edit()
      .putInt(KEY_BLOCKED_REQUEST_COUNT, nextCount)
      .putString(KEY_LAST_BLOCKED_DOMAIN, domain)
      .apply()
  }
}
