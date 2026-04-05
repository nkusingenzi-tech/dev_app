import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Alert, Linking, Pressable, Text, View } from 'react-native'

import { useAppSession } from '../../app/AppSessionContext'
import { buildDailyHabits, buildInsights, buildProgress, parseRiskyApps } from '../../app/services/appHelpers'
import { urgeTools } from '../../domain/constants'
import { appStyles, statusStyleMap, statusTextStyleMap } from '../../theme/styles'
import {
  NavigationCard,
  ScreenShell,
  SectionCard,
  StoryChip,
  SummaryCard,
} from '../../ui/components'
import type { AppTabsParamList, TodayStackParamList } from '../../navigation/types'

export function HomeDashboardScreen({
  navigation,
}: NativeStackScreenProps<TodayStackParamList, 'HomeDashboard'>) {
  const { data, checkIns, resetApp, enableReminder } = useAppSession()
  const selectedApps = parseRiskyApps(data.riskyApps)
  const progress = buildProgress(checkIns)
  const tabs = navigation.getParent<BottomTabNavigationProp<AppTabsParamList>>()

  return (
    <ScreenShell subtitle="Daily reset" title="steady.path">
      <View style={appStyles.heroPanel}>
        <Text style={appStyles.eyebrow}>Recovery plan</Text>
        <Text style={appStyles.heroTitle}>{data.primaryGoal}</Text>
        <Text style={appStyles.heroText}>{data.motivation}</Text>
        <View style={appStyles.buttonRow}>
          <Pressable
            style={[appStyles.button, appStyles.primaryButton]}
            onPress={() => tabs?.navigate('CheckIn', { screen: 'NewCheckIn' })}
          >
            <Text style={appStyles.primaryButtonLabel}>Start today's reset</Text>
          </Pressable>
          <Pressable
            style={[appStyles.button, appStyles.secondaryButton]}
            onPress={() => void resetApp()}
          >
            <Text style={appStyles.secondaryButtonLabel}>Edit onboarding</Text>
          </Pressable>
        </View>
      </View>

      <View style={appStyles.storyRow}>
        <StoryChip label={data.triggerTime} active />
        <StoryChip label={data.reminderTime} />
        <StoryChip label={`${selectedApps.length} apps`} />
        <StoryChip label={data.accountabilityContact} />
      </View>

      <View style={[appStyles.card, appStyles.snapshotCard]}>
        <Text style={appStyles.snapshotLabel}>Today's momentum</Text>
        <Text style={appStyles.snapshotValue}>Protected plan active</Text>
        <Text style={appStyles.snapshotText}>
          High-risk window: {data.triggerTime}. Reminder set for {data.reminderTime}.
        </Text>
      </View>

      <SectionCard eyebrow="Actions" title="Isolated feature screens">
        <NavigationCard
          eyebrow="Support"
          title="Urgency tools"
          body="Open the intervention tools on their own screen instead of burying them in the dashboard."
          actionLabel="Open urgency tools"
          onPress={() => navigation.navigate('UrgencyTools')}
        />
        <NavigationCard
          eyebrow="Execution"
          title="Daily plan"
          body="View the habit execution plan as a dedicated mobile screen."
          actionLabel="Open daily plan"
          onPress={() => navigation.navigate('DailyPlan')}
        />
        <NavigationCard
          eyebrow="Review"
          title="Progress snapshot"
          body="See the weekly recovery summary without mixing it into the home dashboard."
          actionLabel="Open progress snapshot"
          onPress={() => navigation.navigate('ProgressSnapshot')}
        />
      </SectionCard>

      <SectionCard eyebrow="Shortcuts" title="Quick actions">
        <View style={appStyles.buttonRow}>
          <Pressable
            style={[appStyles.button, appStyles.primaryButton]}
            onPress={() => tabs?.navigate('Coach', { screen: 'CoachHub' })}
          >
            <Text style={appStyles.primaryButtonLabel}>Open coach</Text>
          </Pressable>
          <Pressable
            style={[appStyles.button, appStyles.secondaryButton]}
            onPress={() => void enableReminder()}
          >
            <Text style={appStyles.secondaryButtonLabel}>Enable reminder</Text>
          </Pressable>
        </View>
      </SectionCard>

      <SectionCard eyebrow="Snapshot" title="Current metrics">
        <View style={appStyles.stack}>
          {buildInsights(data, progress).map((insight) => (
            <SummaryCard key={insight.label} label={insight.label} value={`${insight.value} · ${insight.change}`} />
          ))}
        </View>
      </SectionCard>
    </ScreenShell>
  )
}

export function UrgencyToolsScreen({
  navigation,
}: NativeStackScreenProps<TodayStackParamList, 'UrgencyTools'>) {
  const { data } = useAppSession()
  const tabs = navigation.getParent<BottomTabNavigationProp<AppTabsParamList>>()

  function handleUrgeToolPress(title: string) {
    if (title === '90-second reset') {
      Alert.alert(
        '90-second reset',
        'Put the phone down, inhale for 4 seconds, hold for 4, exhale for 6. Repeat 5 times before making the next choice.',
      )
      return
    }

    if (title === 'Leave the trigger') {
      Alert.alert(
        'Leave the trigger',
        'Stand up, leave the room, and switch to a safer activity for 10 minutes. Go to Check-in if you need to log the urge.',
        [
          { text: 'Stay here', style: 'cancel' },
          {
            text: 'Open check-in',
            onPress: () => tabs?.navigate('CheckIn', { screen: 'NewCheckIn' }),
          },
        ],
      )
      return
    }

    const message = encodeURIComponent(
      `Checking in. I hit a risky moment around ${data.triggerTime.toLowerCase()} and need accountability right now.`,
    )

    void Linking.openURL(`sms:?body=${message}`).catch(() => {
      Alert.alert(
        'Support contact',
        `Reach out to ${data.accountabilityContact}. If SMS is unavailable on this device, use your normal messaging app.`,
      )
    })
  }

  return (
    <ScreenShell subtitle="Urgency tools" title="steady.path">
      <View style={appStyles.heroPanel}>
        <Text style={appStyles.eyebrow}>Emergency support</Text>
        <Text style={appStyles.heroTitle}>Interrupt the loop quickly.</Text>
        <Text style={appStyles.heroText}>
          These tools were previously embedded inside Home. They now live on their own screen.
        </Text>
      </View>
      <SectionCard eyebrow="Tools" title="Interventions">
        <View style={appStyles.stack}>
          {urgeTools.map((tool) => (
            <Pressable
              key={tool.title}
              style={appStyles.toolCard}
              onPress={() => handleUrgeToolPress(tool.title)}
            >
              <Text style={appStyles.microLabel}>{tool.title}</Text>
              <Text style={appStyles.toolTitle}>{tool.action}</Text>
              <Text style={appStyles.bodyText}>{tool.detail}</Text>
            </Pressable>
          ))}
        </View>
      </SectionCard>
    </ScreenShell>
  )
}

export function DailyPlanScreen() {
  const { data } = useAppSession()

  return (
    <ScreenShell subtitle="Daily plan" title="steady.path">
      <View style={appStyles.heroPanel}>
        <Text style={appStyles.eyebrow}>Execution</Text>
        <Text style={appStyles.heroTitle}>Today's plan</Text>
        <Text style={appStyles.heroText}>
          The habit plan is isolated here so the dashboard stays lighter.
        </Text>
      </View>
      <SectionCard eyebrow="Habits" title="Execution list">
        <View style={appStyles.stack}>
          {buildDailyHabits(data).map((habit) => (
            <View key={habit.name} style={appStyles.habitRow}>
              <View style={[appStyles.statusPill, statusStyleMap[habit.status]]}>
                <Text style={[appStyles.statusText, statusTextStyleMap[habit.status]]}>
                  {habit.status}
                </Text>
              </View>
              <View style={appStyles.habitCopy}>
                <Text style={appStyles.habitTitle}>{habit.name}</Text>
                <Text style={appStyles.bodyText}>{habit.note}</Text>
              </View>
            </View>
          ))}
        </View>
      </SectionCard>
    </ScreenShell>
  )
}

export function ProgressSnapshotScreen() {
  const { data, checkIns } = useAppSession()
  const progress = buildProgress(checkIns)

  return (
    <ScreenShell subtitle="Progress snapshot" title="steady.path">
      <View style={appStyles.heroPanel}>
        <Text style={appStyles.eyebrow}>Weekly review</Text>
        <Text style={appStyles.heroTitle}>Recovery summary</Text>
        <Text style={appStyles.heroText}>
          This snapshot keeps the review surface separate from the action surfaces.
        </Text>
      </View>
      <SectionCard eyebrow="Metrics" title="Current progress">
        <View style={appStyles.stack}>
          {buildInsights(data, progress).map((insight) => (
            <View key={insight.label} style={appStyles.insightCard}>
              <Text style={appStyles.microLabel}>{insight.label}</Text>
              <Text style={appStyles.insightValue}>{insight.value}</Text>
              <Text style={appStyles.bodyText}>{insight.change}</Text>
            </View>
          ))}
        </View>
      </SectionCard>
    </ScreenShell>
  )
}
