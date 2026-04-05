import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Platform, Pressable, Text, View } from 'react-native'

import { useAppSession } from '../../app/AppSessionContext'
import { parseRiskyApps } from '../../app/services/appHelpers'
import { contentCategoryOptions } from '../../domain/constants'
import { appStyles } from '../../theme/styles'
import {
  ChipGrid,
  EmptyStateCard,
  FieldLabel,
  NavigationCard,
  OptionGroup,
  ScreenShell,
  SectionCard,
  SummaryCard,
} from '../../ui/components'
import type { ProtectionStackParamList } from '../../navigation/types'

function getFilterCopy({
  available,
  vpnPermissionGranted,
  serviceRunning,
  blockedRequestCount,
  lastBlockedDomain,
}: {
  available: boolean
  vpnPermissionGranted: boolean
  serviceRunning: boolean
  blockedRequestCount: number
  lastBlockedDomain?: string | null
}) {
  const isAndroid = Platform.OS === 'android'

  const statusTitle = isAndroid
    ? serviceRunning
      ? 'Android DNS filter running'
      : vpnPermissionGranted
        ? 'VPN permission granted'
        : 'VPN permission needed'
    : 'iOS native entitlement path required'

  const statusBody = isAndroid
    ? serviceRunning
      ? `Whole-phone DNS filtering is active. ${blockedRequestCount} requests blocked${lastBlockedDomain ? `, last: ${lastBlockedDomain}` : ''}.`
      : available
        ? 'This filter protects the whole phone. When started, Android routes DNS into Steady Path and blocked domains are answered locally.'
        : 'This installed build does not expose the native Android filter module, so the controls below will not work until a newer development build is installed.'
    : 'iOS requires Apple Network Extension and content-filter entitlements. The shared settings UI is ready, but native enforcement must be added from a macOS/Xcode environment.'

  return { statusTitle, statusBody }
}

export function ProtectionOverviewScreen({
  navigation,
}: NativeStackScreenProps<ProtectionStackParamList, 'ProtectionOverview'>) {
  const { data, contentFilterStatus } = useAppSession()
  const selectedApps = parseRiskyApps(data.riskyApps)

  return (
    <ScreenShell subtitle="Protection" title="steady.path">
      <View style={appStyles.heroPanel}>
        <Text style={appStyles.eyebrow}>Protection map</Text>
        <Text style={appStyles.heroTitle}>Build defenses around the risky window.</Text>
        <Text style={appStyles.heroText}>
          Protection concerns are now split into overview, triggers, settings, and status screens.
        </Text>
      </View>

      <SectionCard eyebrow="Overview" title="Current protection map">
        <View style={appStyles.stack}>
          <SummaryCard label="Main goal" value={data.primaryGoal} highlighted />
          <SummaryCard label="Reminder time" value={data.reminderTime} />
          <SummaryCard label="Risky apps" value={selectedApps.join(', ') || 'No apps selected'} />
          <SummaryCard label="Detected platform" value={contentFilterStatus.platformLabel} />
        </View>
      </SectionCard>

      <SectionCard eyebrow="Screens" title="Protection surfaces">
        <NavigationCard
          eyebrow="Triggers"
          title="Known triggers"
          body="Open the risky app and trigger list on its own screen."
          actionLabel="Open triggers"
          onPress={() => navigation.navigate('TriggerApps')}
        />
        <NavigationCard
          eyebrow="Settings"
          title="Content filter settings"
          body="Open the whole-phone filter controls without mixing them with recovery-map copy."
          actionLabel="Open filter settings"
          onPress={() => navigation.navigate('ContentFilterSettings')}
        />
        <NavigationCard
          eyebrow="Status"
          title="Content filter status"
          body="Open the native bridge status and start/stop actions as a dedicated screen."
          actionLabel="Open filter status"
          onPress={() => navigation.navigate('ContentFilterStatus')}
        />
      </SectionCard>
    </ScreenShell>
  )
}

export function TriggerAppsScreen() {
  const { data } = useAppSession()
  const selectedApps = parseRiskyApps(data.riskyApps)

  return (
    <ScreenShell subtitle="Triggers" title="steady.path">
      <SectionCard eyebrow="Pattern tracking" title="Known triggers">
        {selectedApps.length === 0 ? (
          <EmptyStateCard
            title="No trigger apps selected."
            body="Go back to onboarding if you want to define a risk-app list."
          />
        ) : (
          <>
            <View style={appStyles.triggerWrap}>
              {selectedApps.map((app) => (
                <View key={app} style={appStyles.triggerChip}>
                  <Text style={appStyles.triggerText}>{app}</Text>
                </View>
              ))}
            </View>
            <Text style={appStyles.supportCopy}>
              High-risk time currently set to {data.triggerTime.toLowerCase()}.
            </Text>
          </>
        )}
      </SectionCard>
    </ScreenShell>
  )
}

export function ContentFilterSettingsScreen() {
  const { contentFilterConfig, updateContentFilterConfig } = useAppSession()

  function toggleBlockedCategory(category: string) {
    const next = contentFilterConfig.blockedCategories.includes(category)
      ? contentFilterConfig.blockedCategories.filter((item) => item !== category)
      : [...contentFilterConfig.blockedCategories, category]

    void updateContentFilterConfig({
      ...contentFilterConfig,
      blockedCategories: next,
    })
  }

  return (
    <ScreenShell subtitle="Filter settings" title="steady.path">
      <SectionCard eyebrow="Whole-phone protection" title="Content filter settings">
        <FieldLabel label="Whole-phone filter" />
        <OptionGroup
          options={['Off', 'On']}
          value={contentFilterConfig.enabled ? 'On' : 'Off'}
          onSelect={(value) =>
            void updateContentFilterConfig({
              ...contentFilterConfig,
              enabled: value === 'On',
            })
          }
        />

        <FieldLabel label="Blocked categories" />
        <ChipGrid
          options={contentCategoryOptions}
          selected={contentFilterConfig.blockedCategories}
          onToggle={toggleBlockedCategory}
        />

        <FieldLabel label="Safe search" />
        <OptionGroup
          options={['Off', 'On']}
          value={contentFilterConfig.safeSearch ? 'On' : 'Off'}
          onSelect={(value) =>
            void updateContentFilterConfig({
              ...contentFilterConfig,
              safeSearch: value === 'On',
            })
          }
        />

        <FieldLabel label="Strict mode" />
        <OptionGroup
          options={['Off', 'On']}
          value={contentFilterConfig.strictMode ? 'On' : 'Off'}
          onSelect={(value) =>
            void updateContentFilterConfig({
              ...contentFilterConfig,
              strictMode: value === 'On',
            })
          }
        />
      </SectionCard>
    </ScreenShell>
  )
}

export function ContentFilterStatusScreen() {
  const {
    contentFilterConfig,
    contentFilterStatus,
    startNativeContentFilter,
    stopNativeContentFilter,
    openNativeContentFilterSettings,
    refreshContentFilterStatus,
  } = useAppSession()
  const isAndroid = Platform.OS === 'android'
  const filterRunning = contentFilterStatus.serviceRunning
  const nativeReady = contentFilterStatus.available
  const { statusTitle, statusBody } = getFilterCopy(contentFilterStatus)

  return (
    <ScreenShell subtitle="Filter status" title="steady.path">
      <SectionCard eyebrow="Platform" title="Native status">
        <View style={appStyles.focusTimerCard}>
          <Text style={appStyles.microLabel}>Detected platform</Text>
          <Text style={appStyles.goalText}>{contentFilterStatus.platformLabel}</Text>
          <Text style={appStyles.bodyText}>
            This filter applies across the whole phone. It is not limited to selected apps.
          </Text>
        </View>
        <View style={appStyles.focusTimerCard}>
          <Text style={appStyles.microLabel}>Native status</Text>
          <Text style={appStyles.goalText}>{statusTitle}</Text>
          <Text style={appStyles.bodyText}>{statusBody}</Text>
        </View>
      </SectionCard>

      <SectionCard eyebrow="Runtime" title="Filter counters">
        <View style={appStyles.stack}>
          <SummaryCard
            label="Filter mode"
            value={contentFilterConfig.strictMode ? 'Strict filtering' : 'Balanced filtering'}
            highlighted
          />
          <SummaryCard
            label="Safe search"
            value={contentFilterConfig.safeSearch ? 'Enabled' : 'Disabled'}
          />
          <SummaryCard
            label="Blocked categories"
            value={
              contentFilterStatus.blockedCategories.length === 0
                ? 'No categories selected yet'
                : contentFilterStatus.blockedCategories.join(', ')
            }
          />
          <SummaryCard label="Blocked requests" value={`${contentFilterStatus.blockedRequestCount}`} />
          <SummaryCard
            label="Last blocked domain"
            value={contentFilterStatus.lastBlockedDomain || 'Nothing blocked yet'}
          />
        </View>
        <View style={appStyles.buttonRow}>
          {isAndroid ? (
            <>
              <Pressable
                style={[
                  appStyles.button,
                  !nativeReady || filterRunning || !contentFilterConfig.enabled
                    ? appStyles.disabledButton
                    : appStyles.primaryButton,
                ]}
                disabled={!nativeReady || filterRunning || !contentFilterConfig.enabled}
                onPress={() => void startNativeContentFilter()}
              >
                <Text style={appStyles.primaryButtonLabel}>
                  {contentFilterConfig.enabled ? 'Start Android filter' : 'Enable filter in settings first'}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  appStyles.button,
                  !nativeReady || !filterRunning
                    ? appStyles.disabledButton
                    : appStyles.secondaryButton,
                ]}
                disabled={!nativeReady || !filterRunning}
                onPress={() => void stopNativeContentFilter()}
              >
                <Text style={appStyles.secondaryButtonLabel}>Stop Android filter</Text>
              </Pressable>
              <Pressable
                style={[
                  appStyles.button,
                  !nativeReady ? appStyles.disabledButton : appStyles.secondaryButton,
                ]}
                disabled={!nativeReady}
                onPress={openNativeContentFilterSettings}
              >
                <Text style={appStyles.secondaryButtonLabel}>Open VPN settings</Text>
              </Pressable>
            </>
          ) : null}
          <Pressable
            style={[appStyles.button, appStyles.secondaryButton]}
            onPress={() => void refreshContentFilterStatus()}
          >
            <Text style={appStyles.secondaryButtonLabel}>Refresh filter status</Text>
          </Pressable>
        </View>
      </SectionCard>
    </ScreenShell>
  )
}
