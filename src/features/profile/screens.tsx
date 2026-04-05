import { Pressable, Text, View } from 'react-native'

import { useAppSession } from '../../app/AppSessionContext'
import { appStyles } from '../../theme/styles'
import { NavigationCard, ScreenShell, SectionCard, SummaryCard } from '../../ui/components'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ProfileStackParamList } from '../../navigation/types'

export function ProfileOverviewScreen({
  navigation,
}: NativeStackScreenProps<ProfileStackParamList, 'ProfileOverview'>) {
  const { data, reminderStatus } = useAppSession()

  return (
    <ScreenShell subtitle="Profile" title="steady.path">
      <View style={appStyles.heroPanel}>
        <Text style={appStyles.eyebrow}>Profile</Text>
        <Text style={appStyles.heroTitle}>{data.accountabilityContact}</Text>
        <Text style={appStyles.heroText}>
          Current plan owner for reminders, nightly reset, and support outreach.
        </Text>
      </View>

      <SectionCard eyebrow="Device storage" title="Saved settings">
        <View style={appStyles.stack}>
          <SummaryCard label="Goal" value={data.primaryGoal} highlighted />
          <SummaryCard label="Risky apps" value={data.riskyApps} />
          <SummaryCard label="Check-in reminder" value={data.reminderTime} />
          <SummaryCard label="Reminder status" value={reminderStatus} />
        </View>
      </SectionCard>

      <SectionCard eyebrow="Settings" title="Profile actions">
        <NavigationCard
          eyebrow="Native features"
          title="Reminder settings"
          body="Manage reminder status and re-enable the daily reminder from its own screen."
          actionLabel="Open reminder settings"
          onPress={() => navigation.navigate('ReminderSettings')}
        />
        <NavigationCard
          eyebrow="Reset"
          title="Reset app"
          body="Clear the saved onboarding data on a dedicated confirmation surface."
          actionLabel="Open reset screen"
          onPress={() => navigation.navigate('ResetApp')}
        />
      </SectionCard>
    </ScreenShell>
  )
}

export function ReminderSettingsScreen() {
  const { data, reminderStatus, enableReminder } = useAppSession()

  return (
    <ScreenShell subtitle="Reminder settings" title="steady.path">
      <SectionCard eyebrow="Native features" title="Reminders">
        <View style={appStyles.stack}>
          <SummaryCard label="Reminder status" value={reminderStatus} highlighted />
          <SummaryCard label="Daily reminder time" value={data.reminderTime} />
        </View>
        <View style={appStyles.buttonRow}>
          <Pressable
            style={[appStyles.button, appStyles.primaryButton]}
            onPress={() => void enableReminder()}
          >
            <Text style={appStyles.primaryButtonLabel}>Enable reminder</Text>
          </Pressable>
        </View>
      </SectionCard>
    </ScreenShell>
  )
}

export function ResetAppScreen() {
  const { resetApp } = useAppSession()

  return (
    <ScreenShell subtitle="Reset" title="steady.path">
      <View style={appStyles.footerBanner}>
        <Text style={appStyles.eyebrow}>Reset</Text>
        <Text style={appStyles.sectionTitle}>Clear the saved onboarding data.</Text>
        <Text style={appStyles.bodyText}>
          This removes the local plan, content-filter settings, reminder identifier, and check-in history from the device.
        </Text>
        <View style={appStyles.buttonRow}>
          <Pressable
            style={[appStyles.button, appStyles.secondaryButton]}
            onPress={() => void resetApp()}
          >
            <Text style={appStyles.secondaryButtonLabel}>Reset app</Text>
          </Pressable>
        </View>
      </View>
    </ScreenShell>
  )
}
