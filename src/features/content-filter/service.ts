import { Alert, NativeModules, Platform } from 'react-native'

import { defaultContentFilterConfig } from '../../domain/constants'
import type {
  ContentFilterConfig,
  ContentFilterStartResult,
  ContentFilterStatus,
  ContentFilterStopResult,
  NativeContentFilterModule,
} from '../../domain/models'

const nativeContentFilter =
  Platform.OS === 'android'
    ? (NativeModules.ContentFilterModule as NativeContentFilterModule | undefined)
    : undefined

export type ContentFilterBridge = {
  syncConfig: (config: ContentFilterConfig) => Promise<void>
  refreshStatus: (config: ContentFilterConfig) => Promise<ContentFilterStatus>
  start: () => Promise<ContentFilterStartResult>
  stop: () => Promise<ContentFilterStopResult>
  openSettings: () => void
}

function createUnavailableStatus(config: ContentFilterConfig): ContentFilterStatus {
  return {
    available: false,
    platformLabel:
      Platform.OS === 'android' ? 'Android DNS content filter' : 'iOS content filter path',
    vpnPermissionGranted: false,
    serviceRunning: false,
    safeSearch: config.safeSearch,
    strictMode: config.strictMode,
    blockedCategories: config.blockedCategories,
    blockedRequestCount: 0,
    lastBlockedDomain: null,
  }
}

export function createContentFilterBridge(): ContentFilterBridge {
  return {
    async syncConfig(config) {
      if (!nativeContentFilter) {
        return
      }

      try {
        await nativeContentFilter.updateConfig(
          config.enabled,
          config.safeSearch,
          config.strictMode,
          config.blockedCategories,
        )
      } catch {
        // Keep the local config as the source of truth when the bridge is unavailable.
      }
    },
    async refreshStatus(config) {
      if (!nativeContentFilter) {
        return createUnavailableStatus(config)
      }

      try {
        return await nativeContentFilter.getStatus()
      } catch {
        return createUnavailableStatus(config)
      }
    },
    async start() {
      if (!nativeContentFilter) {
        return { kind: 'unavailable' }
      }

      const result = await nativeContentFilter.requestVpnPermissionAndStart()
      if (result === 'permission_requested') {
        return { kind: 'permission_requested' }
      }

      return { kind: 'started' }
    },
    async stop() {
      if (!nativeContentFilter) {
        return { kind: 'unavailable' }
      }

      await nativeContentFilter.stopFiltering()
      return { kind: 'stopped' }
    },
    openSettings() {
      if (!nativeContentFilter) {
        Alert.alert(
          'Filter unavailable',
          'This build does not include the native Android content filter. Install the latest development build to use these controls.',
        )
        return
      }

      nativeContentFilter.openVpnSettings()
    },
  }
}

export function getDefaultContentFilterStatus() {
  return createUnavailableStatus(defaultContentFilterConfig)
}
