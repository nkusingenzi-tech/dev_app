package com.freeman.mvp.contentblocker

import android.content.Context

object ContentBlockerPrefs {
  private const val PREFERENCES_NAME = "freeman_content_blocker"
  private const val KEY_ENABLED = "enabled"
  private const val KEY_AGREEMENT_ACCEPTED = "agreement_accepted"

  fun isEnabled(context: Context): Boolean {
    return context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
      .getBoolean(KEY_ENABLED, false)
  }

  fun setEnabled(context: Context, enabled: Boolean) {
    context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
      .edit()
      .putBoolean(KEY_ENABLED, enabled)
      .apply()
  }

  fun hasAcceptedAgreement(context: Context): Boolean {
    return context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
      .getBoolean(KEY_AGREEMENT_ACCEPTED, false)
  }

  fun setAgreementAccepted(context: Context, accepted: Boolean) {
    context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
      .edit()
      .putBoolean(KEY_AGREEMENT_ACCEPTED, accepted)
      .apply()
  }
}
