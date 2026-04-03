import AsyncStorage from '@react-native-async-storage/async-storage'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useMemo, useRef, useState } from 'react'
import { NavigationContainer, DefaultTheme, useNavigation } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import * as Device from 'expo-device'
import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system'
import * as Notifications from 'expo-notifications'
import * as Speech from 'expo-speech'
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit'
import {
  ActivityIndicator,
  Alert,
  AppState,
  Dimensions,
  Linking,
  NativeModules,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

type HabitStatus = 'Done' | 'In progress' | 'Next'
type OnboardingData = {
  primaryGoal: string
  motivation: string
  triggerTime: string
  riskyApps: string
  accountabilityContact: string
  reminderTime: string
}
type Habit = { name: string; status: HabitStatus; note: string }
type Insight = { label: string; value: string; change: string }
type UrgeTool = { title: string; action: string; detail: string }
type TabParamList = {
  Home: undefined
  CheckIn: undefined
  Insights: undefined
  Coach: undefined
  Plan: undefined
  Profile: undefined
}
type CheckInEntry = {
  id: string
  createdAt: string
  mood: string
  urgeLevel: number
  trigger: string
  outcome: 'No slip' | 'Slip'
  notes: string
}
type AnalyticsBundle = {
  urgeLabels: string[]
  urgeValues: number[]
  moods: Array<{ name: string; count: number; color: string; legendFontColor: string; legendFontSize: number }>
  slips: Array<{ label: string; value: number }>
}
type ReminderStatus = 'Not enabled' | 'Scheduled' | 'Permission denied'
type ProgressBundle = {
  currentNoSlipStreak: number
  bestNoSlipStreak: number
  checkInsThisWeek: number
  slipRatePercent: number
  lastSevenDayAverageUrge: number
}
type CoachMessage = {
  id: string
  role: 'coach' | 'user'
  text: string
}
type ContentFilterConfig = {
  enabled: boolean
  safeSearch: boolean
  strictMode: boolean
  blockedCategories: string[]
}
type ContentFilterStatus = {
  available: boolean
  platformLabel: string
  vpnPermissionGranted: boolean
  serviceRunning: boolean
  safeSearch: boolean
  strictMode: boolean
  blockedCategories: string[]
  blockedRequestCount: number
  lastBlockedDomain?: string | null
}
type RealtimeSessionPayload = {
  client_secret?: {
    value?: string
  }
}
type NativeContentFilterModule = {
  updateConfig: (
    enabled: boolean,
    safeSearch: boolean,
    strictMode: boolean,
    blockedCategories: string[],
  ) => Promise<void>
  getStatus: () => Promise<ContentFilterStatus>
  requestVpnPermissionAndStart: () => Promise<string>
  stopFiltering: () => Promise<void>
  openVpnSettings: () => void
}

const Tab = createBottomTabNavigator<TabParamList>()
const STORAGE_KEY = 'steady-path-onboarding'
const CHECK_IN_STORAGE_KEY = 'steady-path-check-ins'
const REMINDER_ID_STORAGE_KEY = 'steady-path-reminder-id'
const CONTENT_FILTER_STORAGE_KEY = 'steady-path-content-filter'
const defaultContentFilterConfig: ContentFilterConfig = {
  enabled: false,
  safeSearch: true,
  strictMode: true,
  blockedCategories: ['Adult content', 'Explicit search'],
}
const nativeContentFilter =
  Platform.OS === 'android'
    ? (NativeModules.ContentFilterModule as NativeContentFilterModule | undefined)
    : undefined

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#090909',
    card: '#090909',
    text: '#f5f5f5',
    border: '#1d1d1f',
    primary: '#ff2f6d',
  },
}

const defaultData: OnboardingData = {
  primaryGoal: '',
  motivation: '',
  triggerTime: 'Late night',
  riskyApps: '',
  accountabilityContact: '',
  reminderTime: '21:30',
}

const triggerTimeOptions = ['Late night', 'After work', 'When alone', 'During stress']
const reminderTimeOptions = ['20:00', '21:30', '22:00']
const riskyAppOptions = ['Chrome', 'Instagram', 'TikTok', 'X', 'Reddit', 'YouTube']
const contentCategoryOptions = [
  'Adult content',
  'Explicit search',
  'Social reels',
  'Clickbait sites',
  'Gambling',
]
const moodOptions = ['Calm', 'Stressed', 'Lonely', 'Bored', 'Focused']
const outcomeOptions: Array<CheckInEntry['outcome']> = ['No slip', 'Slip']
const chartWidth = Math.max(Dimensions.get('window').width - 56, 240)
const moodColors = ['#ff5b7f', '#b785ff', '#5ac8fa', '#ffb347', '#7ee081']
const coachApiUrl = process.env.EXPO_PUBLIC_COACH_API_URL?.replace(/\/$/, '')

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

const urgeTools: UrgeTool[] = [
  { title: '90-second reset', action: 'Pause and breathe', detail: 'Slow the body down before making the next choice.' },
  { title: 'Leave the trigger', action: 'Move away from the device', detail: 'Stand up, change rooms, and break the loop quickly.' },
  { title: 'Message support', action: 'Reach out now', detail: 'Send a short check-in to your accountability contact.' },
]

export default function App() {
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [data, setData] = useState<OnboardingData>(defaultData)
  const [checkIns, setCheckIns] = useState<CheckInEntry[]>([])
  const [reminderStatus, setReminderStatus] = useState<ReminderStatus>('Not enabled')
  const [contentFilterConfig, setContentFilterConfig] = useState<ContentFilterConfig>(
    defaultContentFilterConfig,
  )
  const [contentFilterStatus, setContentFilterStatus] = useState<ContentFilterStatus>({
    available: Platform.OS === 'android',
    platformLabel: Platform.OS === 'android' ? 'Android DNS content filter' : 'iOS content filter path',
    vpnPermissionGranted: false,
    serviceRunning: false,
    safeSearch: defaultContentFilterConfig.safeSearch,
    strictMode: defaultContentFilterConfig.strictMode,
    blockedCategories: defaultContentFilterConfig.blockedCategories,
    blockedRequestCount: 0,
    lastBlockedDomain: null,
  })

  useEffect(() => {
    void loadStoredPlan()
  }, [])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void refreshContentFilterStatus()
      }
    })

    return () => {
      subscription.remove()
    }
  }, [contentFilterConfig])

  async function loadStoredPlan() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY)
      const storedCheckIns = await AsyncStorage.getItem(CHECK_IN_STORAGE_KEY)
      const storedContentFilter = await AsyncStorage.getItem(CONTENT_FILTER_STORAGE_KEY)
      if (stored) {
        setData(JSON.parse(stored) as OnboardingData)
        setDone(true)
      }
      if (storedCheckIns) {
        setCheckIns(JSON.parse(storedCheckIns) as CheckInEntry[])
      }
      if (storedContentFilter) {
        const parsed = normalizeContentFilterConfig(
          JSON.parse(storedContentFilter) as Partial<ContentFilterConfig>,
        )
        setContentFilterConfig(parsed)
        await syncNativeContentFilterConfig(parsed)
      } else {
        await syncNativeContentFilterConfig(defaultContentFilterConfig)
      }
      const storedReminderId = await AsyncStorage.getItem(REMINDER_ID_STORAGE_KEY)
      if (storedReminderId) {
        setReminderStatus('Scheduled')
      }
      await refreshContentFilterStatus()
    } finally {
      setLoading(false)
    }
  }

  function updateField<Key extends keyof OnboardingData>(key: Key, value: OnboardingData[Key]) {
    setData((current) => ({ ...current, [key]: value }))
  }

  function toggleRiskyApp(app: string) {
    const selected = parseRiskyApps(data.riskyApps)
    const next = selected.includes(app)
      ? selected.filter((item) => item !== app)
      : [...selected, app]
    updateField('riskyApps', next.join(', '))
  }

  async function finishOnboarding() {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    await enableDailyReminder(data.reminderTime)
    setDone(true)
  }

  async function resetPlan() {
    const storedReminderId = await AsyncStorage.getItem(REMINDER_ID_STORAGE_KEY)
    if (storedReminderId) {
      await Notifications.cancelScheduledNotificationAsync(storedReminderId)
    }
    await AsyncStorage.multiRemove([
      STORAGE_KEY,
      CHECK_IN_STORAGE_KEY,
      REMINDER_ID_STORAGE_KEY,
      CONTENT_FILTER_STORAGE_KEY,
      'steady-path-focus-plan',
      'steady-path-focus-session-history',
    ])
    setData(defaultData)
    setCheckIns([])
    setReminderStatus('Not enabled')
    setContentFilterConfig(defaultContentFilterConfig)
    await syncNativeContentFilterConfig(defaultContentFilterConfig)
    await refreshContentFilterStatus()
    setStepIndex(0)
    setDone(false)
  }

  async function saveCheckIn(entry: Omit<CheckInEntry, 'id' | 'createdAt'>) {
    const nextEntry: CheckInEntry = {
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...entry,
    }

    const next = [nextEntry, ...checkIns].slice(0, 20)
    setCheckIns(next)
    await AsyncStorage.setItem(CHECK_IN_STORAGE_KEY, JSON.stringify(next))
  }

  async function enableDailyReminder(time: string) {
    const permitted = await requestNotificationPermissions()
    if (!permitted) {
      setReminderStatus('Permission denied')
      return
    }

    const [hourString, minuteString] = time.split(':')
    const hour = Number(hourString)
    const minute = Number(minuteString)

    const existingId = await AsyncStorage.getItem(REMINDER_ID_STORAGE_KEY)
    if (existingId) {
      await Notifications.cancelScheduledNotificationAsync(existingId)
    }

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Steady Path check-in',
        body: 'Review your urge level before the risky window starts.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    })

    await AsyncStorage.setItem(REMINDER_ID_STORAGE_KEY, identifier)
    setReminderStatus('Scheduled')
  }

  async function updateContentFilterConfig(next: ContentFilterConfig) {
    setContentFilterConfig(next)
    await AsyncStorage.setItem(CONTENT_FILTER_STORAGE_KEY, JSON.stringify(next))
    await syncNativeContentFilterConfig(next)
    await refreshContentFilterStatus()
  }

  async function syncNativeContentFilterConfig(next: ContentFilterConfig) {
    if (!nativeContentFilter) {
      return
    }

    try {
      await nativeContentFilter.updateConfig(
        next.enabled,
        next.safeSearch,
        next.strictMode,
        next.blockedCategories,
      )
    } catch {
      // Keep local config if the native bridge is unavailable.
    }
  }

  async function refreshContentFilterStatus() {
    if (!nativeContentFilter) {
      setContentFilterStatus({
        available: false,
        platformLabel: Platform.OS === 'android' ? 'Android DNS content filter' : 'iOS content filter path',
        vpnPermissionGranted: false,
        serviceRunning: false,
        safeSearch: contentFilterConfig.safeSearch,
        strictMode: contentFilterConfig.strictMode,
        blockedCategories: contentFilterConfig.blockedCategories,
        blockedRequestCount: 0,
        lastBlockedDomain: null,
      })
      return
    }

    try {
      const status = await nativeContentFilter.getStatus()
      setContentFilterStatus(status)
    } catch {
      setContentFilterStatus({
        available: false,
        platformLabel: Platform.OS === 'android' ? 'Android DNS content filter' : 'iOS content filter path',
        vpnPermissionGranted: false,
        serviceRunning: false,
        safeSearch: contentFilterConfig.safeSearch,
        strictMode: contentFilterConfig.strictMode,
        blockedCategories: contentFilterConfig.blockedCategories,
        blockedRequestCount: 0,
        lastBlockedDomain: null,
      })
    }
  }

  async function startNativeContentFilter() {
    if (!nativeContentFilter) {
      Alert.alert(
        'Filter unavailable',
        'This build does not include the native Android content filter. Install the latest development build to use these controls.',
      )
      return
    }

    try {
      const result = await nativeContentFilter.requestVpnPermissionAndStart()
      if (result === 'permission_requested') {
        Alert.alert(
          'VPN permission required',
          'Android will show a VPN permission prompt. Accept it to enable the whole-phone content filter.',
        )
      }
    } finally {
      await refreshContentFilterStatus()
    }
  }

  async function stopNativeContentFilter() {
    if (!nativeContentFilter) {
      Alert.alert(
        'Filter unavailable',
        'This build does not include the native Android content filter. Install the latest development build to use these controls.',
      )
      return
    }

    try {
      await nativeContentFilter.stopFiltering()
    } finally {
      await refreshContentFilterStatus()
    }
  }

  function openNativeContentFilterSettings() {
    if (!nativeContentFilter) {
      Alert.alert(
        'Filter unavailable',
        'This build does not include the native Android content filter. Install the latest development build to use these controls.',
      )
      return
    }

    nativeContentFilter.openVpnSettings()
  }

  async function requestNotificationPermissions() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('daily-reminders', {
        name: 'Daily reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
      })
    }

    if (!Device.isDevice) {
      return false
    }

    const current = await Notifications.getPermissionsAsync()
    let finalStatus = current.status

    if (finalStatus !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync()
      finalStatus = requested.status
    }

    return finalStatus === 'granted'
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#ff2f6d" />
        <Text style={styles.loadingText}>Loading saved plan...</Text>
      </SafeAreaView>
    )
  }

  if (!done) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <OnboardingScreen
          data={data}
          stepIndex={stepIndex}
          onStepChange={setStepIndex}
          onFieldChange={updateField}
          onToggleRiskyApp={toggleRiskyApp}
          onComplete={() => void finishOnboarding()}
        />
      </SafeAreaView>
    )
  }

  return (
    <NavigationContainer theme={theme}>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: '#ff2f6d',
          tabBarInactiveTintColor: '#80838c',
          tabBarLabelStyle: styles.tabBarLabel,
        }}
      >
        <Tab.Screen name="Home" options={{ tabBarIcon: ({ color }) => <TabIcon label="H" color={color} /> }}>
          {() => (
            <HomeScreen
              data={data}
              entries={checkIns}
              onEnableReminder={() => void enableDailyReminder(data.reminderTime)}
              onReset={() => void resetPlan()}
            />
          )}
        </Tab.Screen>
        <Tab.Screen name="CheckIn" options={{ title: 'Check-in', tabBarIcon: ({ color }) => <TabIcon label="C" color={color} /> }}>
          {() => <CheckInScreen data={data} entries={checkIns} onSave={(entry) => void saveCheckIn(entry)} />}
        </Tab.Screen>
        <Tab.Screen name="Insights" options={{ tabBarIcon: ({ color }) => <TabIcon label="I" color={color} /> }}>
          {() => <InsightsScreen entries={checkIns} />}
        </Tab.Screen>
        <Tab.Screen name="Coach" options={{ tabBarIcon: ({ color }) => <TabIcon label="A" color={color} /> }}>
          {() => <CoachScreen data={data} />}
        </Tab.Screen>
        <Tab.Screen name="Plan" options={{ tabBarIcon: ({ color }) => <TabIcon label="P" color={color} /> }}>
          {() => (
            <PlanScreen
              data={data}
              contentFilterConfig={contentFilterConfig}
              contentFilterStatus={contentFilterStatus}
              onUpdateContentFilterConfig={(next) => void updateContentFilterConfig(next)}
              onStartNativeContentFilter={() => void startNativeContentFilter()}
              onStopNativeContentFilter={() => void stopNativeContentFilter()}
              onOpenFilterSettings={openNativeContentFilterSettings}
              onRefreshContentFilter={() => void refreshContentFilterStatus()}
            />
          )}
        </Tab.Screen>
        <Tab.Screen name="Profile" options={{ tabBarIcon: ({ color }) => <TabIcon label="U" color={color} /> }}>
          {() => (
            <ProfileScreen
              data={data}
              reminderStatus={reminderStatus}
              onEnableReminder={() => void enableDailyReminder(data.reminderTime)}
              onReset={() => void resetPlan()}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  )
}

function OnboardingScreen({
  data,
  stepIndex,
  onStepChange,
  onFieldChange,
  onToggleRiskyApp,
  onComplete,
}: {
  data: OnboardingData
  stepIndex: number
  onStepChange: (index: number) => void
  onFieldChange: <Key extends keyof OnboardingData>(key: Key, value: OnboardingData[Key]) => void
  onToggleRiskyApp: (app: string) => void
  onComplete: () => void
}) {
  const selectedApps = parseRiskyApps(data.riskyApps)
  const steps = [
    {
      eyebrow: 'Step 1 of 4',
      title: 'Define the main goal',
      detail: 'Start with the behavior you want to change first.',
      valid: data.primaryGoal.trim().length > 5 && data.motivation.trim().length > 5,
      body: (
        <>
          <FieldLabel label="Primary goal" />
          <TextInput
            style={styles.input}
            value={data.primaryGoal}
            placeholder="Example: Reduce late-night porn use"
            placeholderTextColor="#8a98a4"
            onChangeText={(value) => onFieldChange('primaryGoal', value)}
          />
          <FieldLabel label="Why this matters" />
          <TextInput
            style={[styles.input, styles.textArea]}
            value={data.motivation}
            placeholder="Example: Better focus, less shame, better sleep"
            placeholderTextColor="#8a98a4"
            multiline
            onChangeText={(value) => onFieldChange('motivation', value)}
          />
        </>
      ),
    },
    {
      eyebrow: 'Step 2 of 4',
      title: 'Identify the riskiest time',
      detail: 'Choose the pattern that needs the strongest protection.',
      valid: data.triggerTime.length > 0,
      body: (
        <>
          <FieldLabel label="High-risk time" />
          <OptionGroup options={triggerTimeOptions} value={data.triggerTime} onSelect={(value) => onFieldChange('triggerTime', value)} />
        </>
      ),
    },
    {
      eyebrow: 'Step 3 of 4',
      title: 'Choose risky apps and sites',
      detail: 'Pick the apps that most often lead into the loop.',
      valid: selectedApps.length > 0,
      body: (
        <>
          <FieldLabel label="Likely trigger apps" />
          <ChipGrid options={riskyAppOptions} selected={selectedApps} onToggle={onToggleRiskyApp} />
        </>
      ),
    },
    {
      eyebrow: 'Step 4 of 4',
      title: 'Set support and reminders',
      detail: 'Finish the plan with one person and one check-in time.',
      valid: data.accountabilityContact.trim().length > 1 && data.reminderTime.length > 0,
      body: (
        <>
          <FieldLabel label="Accountability contact" />
          <TextInput
            style={styles.input}
            value={data.accountabilityContact}
            placeholder="Example: Sam - brother"
            placeholderTextColor="#8a98a4"
            onChangeText={(value) => onFieldChange('accountabilityContact', value)}
          />
          <FieldLabel label="Nightly check-in reminder" />
          <OptionGroup options={reminderTimeOptions} value={data.reminderTime} onSelect={(value) => onFieldChange('reminderTime', value)} />
        </>
      ),
    },
  ]

  const current = steps[stepIndex]

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <TopBar subtitle="Onboarding" title="steady.path" />
      <View style={styles.heroPanel}>
        <Text style={styles.eyebrow}>Steady Path</Text>
        <Text style={styles.heroTitle}>Set up the first recovery plan.</Text>
        <Text style={styles.heroText}>This onboarding flow captures the inputs needed for reminders, blockers, and daily check-ins.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>{current.eyebrow}</Text>
        <Text style={styles.sectionTitle}>{current.title}</Text>
        <Text style={styles.stepDetail}>{current.detail}</Text>
        <View style={styles.sectionContent}>{current.body}</View>
        <View style={styles.progressRow}>
          {steps.map((_, index) => (
            <View key={`progress-${index}`} style={[styles.progressDot, index === stepIndex ? styles.progressDotActive : null]} />
          ))}
        </View>
        <View style={styles.buttonRow}>
          {stepIndex > 0 ? (
            <Pressable style={[styles.button, styles.secondaryButton]} onPress={() => onStepChange(stepIndex - 1)}>
              <Text style={styles.secondaryButtonLabel}>Back</Text>
            </Pressable>
          ) : null}
          {stepIndex < steps.length - 1 ? (
            <Pressable
              style={[styles.button, current.valid ? styles.primaryButton : styles.disabledButton]}
              disabled={!current.valid}
              onPress={() => onStepChange(stepIndex + 1)}
            >
              <Text style={styles.primaryButtonLabel}>Next</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.button, current.valid ? styles.primaryButton : styles.disabledButton]}
              disabled={!current.valid}
              onPress={onComplete}
            >
              <Text style={styles.primaryButtonLabel}>Save plan</Text>
            </Pressable>
          )}
        </View>
      </View>
    </ScrollView>
  )
}

function HomeScreen({
  data,
  entries,
  onEnableReminder,
  onReset,
}: {
  data: OnboardingData
  entries: CheckInEntry[]
  onEnableReminder: () => void
  onReset: () => void
}) {
  const navigation = useNavigation<any>()
  const selectedApps = parseRiskyApps(data.riskyApps)
  const progress = buildProgress(entries)

  function startDailyReset() {
    navigation.navigate('CheckIn')
  }

  function handleUrgeToolPress(tool: UrgeTool) {
    if (tool.title === '90-second reset') {
      Alert.alert(
        '90-second reset',
        'Put the phone down, inhale for 4 seconds, hold for 4, exhale for 6. Repeat 5 times before making the next choice.',
      )
      return
    }

    if (tool.title === 'Leave the trigger') {
      Alert.alert(
        'Leave the trigger',
        'Stand up, leave the room, and switch to a safer activity for 10 minutes. Go to Check-in if you need to log the urge.',
        [
          { text: 'Stay here', style: 'cancel' },
          {
            text: 'Open check-in',
            onPress: () => navigation.navigate('CheckIn'),
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
    <ScreenShell subtitle="Daily reset" title="steady.path">
      <View style={styles.heroPanel}>
        <Text style={styles.eyebrow}>Recovery plan</Text>
        <Text style={styles.heroTitle}>{data.primaryGoal}</Text>
        <Text style={styles.heroText}>{data.motivation}</Text>
        <View style={styles.buttonRow}>
          <Pressable style={[styles.button, styles.primaryButton]} onPress={startDailyReset}>
            <Text style={styles.primaryButtonLabel}>Start today's reset</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.secondaryButton]} onPress={onReset}>
            <Text style={styles.secondaryButtonLabel}>Edit onboarding</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.storyRow}>
        <StoryChip label={data.triggerTime} active />
        <StoryChip label={data.reminderTime} />
        <StoryChip label={`${selectedApps.length} apps`} />
        <StoryChip label={data.accountabilityContact} />
      </View>
      <View style={[styles.card, styles.snapshotCard]}>
        <Text style={styles.snapshotLabel}>Today's momentum</Text>
        <Text style={styles.snapshotValue}>Protected plan active</Text>
        <Text style={styles.snapshotText}>High-risk window: {data.triggerTime}. Reminder set for {data.reminderTime}.</Text>
        <View style={styles.snapshotList}>
          <Text style={styles.snapshotItem}>- Risk pattern: {data.triggerTime}</Text>
          <Text style={styles.snapshotItem}>- Apps to watch: {data.riskyApps}</Text>
          <Text style={styles.snapshotItem}>- Accountability: {data.accountabilityContact}</Text>
        </View>
      </View>
      <Section title="Urgency tools" eyebrow="Emergency support">
        <View style={styles.stack}>
          {urgeTools.map((tool) => (
            <Pressable key={tool.title} style={styles.toolCard} onPress={() => handleUrgeToolPress(tool)}>
              <Text style={styles.microLabel}>{tool.title}</Text>
              <Text style={styles.toolTitle}>{tool.action}</Text>
              <Text style={styles.bodyText}>{tool.detail}</Text>
            </Pressable>
          ))}
        </View>
      </Section>
      <Section title="Quick actions" eyebrow="Recovery shortcuts">
        <View style={styles.buttonRow}>
          <Pressable style={[styles.button, styles.primaryButton]} onPress={() => navigation.navigate('Coach')}>
            <Text style={styles.primaryButtonLabel}>Open coach</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.secondaryButton]} onPress={onEnableReminder}>
            <Text style={styles.secondaryButtonLabel}>Enable reminder</Text>
          </Pressable>
        </View>
      </Section>
      <Section title="Today's plan" eyebrow="Daily execution">
        <View style={styles.stack}>
          {buildDailyHabits(data).map((habit) => (
            <View key={habit.name} style={styles.habitRow}>
              <View style={[styles.statusPill, statusStyleMap[habit.status]]}>
                <Text style={[styles.statusText, statusTextStyleMap[habit.status]]}>{habit.status}</Text>
              </View>
              <View style={styles.habitCopy}>
                <Text style={styles.habitTitle}>{habit.name}</Text>
                <Text style={styles.bodyText}>{habit.note}</Text>
              </View>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Progress snapshot" eyebrow="Weekly review">
        <View style={styles.stack}>
          {buildInsights(data, progress).map((insight) => (
            <View key={insight.label} style={styles.insightCard}>
              <Text style={styles.microLabel}>{insight.label}</Text>
              <Text style={styles.insightValue}>{insight.value}</Text>
              <Text style={styles.bodyText}>{insight.change}</Text>
            </View>
          ))}
        </View>
      </Section>
    </ScreenShell>
  )
}

function CheckInScreen({
  data,
  entries,
  onSave,
}: {
  data: OnboardingData
  entries: CheckInEntry[]
  onSave: (entry: Omit<CheckInEntry, 'id' | 'createdAt'>) => void
}) {
  const [mood, setMood] = useState(moodOptions[0])
  const [urgeLevel, setUrgeLevel] = useState(5)
  const [trigger, setTrigger] = useState(data.triggerTime)
  const [outcome, setOutcome] = useState<CheckInEntry['outcome']>('No slip')
  const [notes, setNotes] = useState('')

  function submitCheckIn() {
    onSave({ mood, urgeLevel, trigger, outcome, notes })
    setNotes('')
    setOutcome('No slip')
    setMood(moodOptions[0])
    setUrgeLevel(5)
    setTrigger(data.triggerTime)
  }

  return (
    <ScreenShell subtitle="Check-in" title="steady.path">
      <View style={styles.heroPanel}>
        <Text style={styles.eyebrow}>Daily check-in</Text>
        <Text style={styles.heroTitle}>Interrupt the loop quickly.</Text>
        <Text style={styles.heroText}>Log the current state, the trigger, and whether a slip happened. Entries stay saved on device.</Text>
      </View>

      <Section title="New check-in" eyebrow="Capture state">
        <FieldLabel label="Mood" />
        <ChipGrid options={moodOptions} selected={[mood]} onToggle={setMood} />

        <FieldLabel label="Urge intensity" />
        <View style={styles.levelRow}>
          {Array.from({ length: 10 }, (_, index) => index + 1).map((level) => (
            <Pressable
              key={`urge-${level}`}
              style={[styles.levelChip, urgeLevel === level ? styles.levelChipActive : null]}
              onPress={() => setUrgeLevel(level)}
            >
              <Text style={[styles.levelChipText, urgeLevel === level ? styles.levelChipTextActive : null]}>
                {level}
              </Text>
            </Pressable>
          ))}
        </View>

        <FieldLabel label="Trigger" />
        <OptionGroup options={triggerTimeOptions} value={trigger} onSelect={setTrigger} />

        <FieldLabel label="Outcome" />
        <OptionGroup options={outcomeOptions} value={outcome} onSelect={(value) => setOutcome(value as CheckInEntry['outcome'])} />

        <FieldLabel label="Notes" />
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          placeholder="What happened right before the urge or slip?"
          placeholderTextColor="#8a98a4"
          multiline
          onChangeText={setNotes}
        />

        <View style={styles.buttonRow}>
          <Pressable style={[styles.button, styles.primaryButton]} onPress={submitCheckIn}>
            <Text style={styles.primaryButtonLabel}>Save check-in</Text>
          </Pressable>
        </View>
      </Section>

      <Section title="Current support" eyebrow="Personalized context">
        <View style={styles.stack}>
          <SummaryCard label="High-risk time" value={data.triggerTime} highlighted />
          <SummaryCard label="Reminder" value={data.reminderTime} />
          <SummaryCard label="Contact" value={data.accountabilityContact} />
        </View>
      </Section>

      <Section title="Recent entries" eyebrow="History">
        <View style={styles.stack}>
          {entries.length === 0 ? (
            <View style={styles.goalCard}>
              <Text style={styles.goalText}>No check-ins saved yet.</Text>
              <Text style={styles.bodyText}>Start with one entry to create a usable recovery log.</Text>
            </View>
          ) : (
            entries.slice(0, 5).map((entry) => (
              <View key={entry.id} style={styles.insightCard}>
                <Text style={styles.microLabel}>
                  {formatCheckInDate(entry.createdAt)} · {entry.outcome}
                </Text>
                <Text style={styles.goalText}>
                  {entry.mood} · urge {entry.urgeLevel}/10
                </Text>
                <Text style={styles.bodyText}>
                  Trigger: {entry.trigger}
                  {entry.notes ? `\n${entry.notes}` : ''}
                </Text>
              </View>
            ))
          )}
        </View>
      </Section>
    </ScreenShell>
  )
}

function InsightsScreen({ entries }: { entries: CheckInEntry[] }) {
  const analytics = buildAnalytics(entries)
  const progress = buildProgress(entries)

  return (
    <ScreenShell subtitle="Insights" title="steady.path">
      <View style={styles.heroPanel}>
        <Text style={styles.eyebrow}>Analytics</Text>
        <Text style={styles.heroTitle}>Pattern review from saved check-ins.</Text>
        <Text style={styles.heroText}>
          This tab holds the detailed charts so the rest of the app can stay focused
          on action and logging.
        </Text>
      </View>

      {entries.length === 0 ? (
        <Section title="No analytics yet" eyebrow="Insights">
          <EmptyStateCard
            title="No data available."
            body="Add a few check-ins first. Charts will populate automatically from saved entries."
          />
        </Section>
      ) : (
        <>
          <Section title="Recovery metrics" eyebrow="Progress engine">
            <View style={styles.stack}>
              <View style={styles.insightCard}>
                <Text style={styles.microLabel}>Current no-slip streak</Text>
                <Text style={styles.insightValue}>{progress.currentNoSlipStreak}</Text>
                <Text style={styles.bodyText}>Consecutive no-slip check-ins from the latest entry backward.</Text>
              </View>
              <View style={styles.insightCard}>
                <Text style={styles.microLabel}>Best no-slip streak</Text>
                <Text style={styles.insightValue}>{progress.bestNoSlipStreak}</Text>
                <Text style={styles.bodyText}>Longest run of no-slip check-ins recorded on this device.</Text>
              </View>
              <View style={styles.insightCard}>
                <Text style={styles.microLabel}>Check-ins this week</Text>
                <Text style={styles.insightValue}>{progress.checkInsThisWeek}</Text>
                <Text style={styles.bodyText}>Entries created in the last 7 days.</Text>
              </View>
              <View style={styles.insightCard}>
                <Text style={styles.microLabel}>Slip rate</Text>
                <Text style={styles.insightValue}>{progress.slipRatePercent}%</Text>
                <Text style={styles.bodyText}>Percentage of saved check-ins marked as slips.</Text>
              </View>
            </View>
          </Section>

          <Section title="Urge trend" eyebrow="Recent pattern">
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Recent urge levels</Text>
              <LineChart
                data={{
                  labels: analytics.urgeLabels,
                  datasets: [{ data: analytics.urgeValues }],
                }}
                width={chartWidth}
                height={220}
                withInnerLines={false}
                withOuterLines={false}
                withShadow={false}
                withDots
                bezier
                fromZero
                chartConfig={chartConfig}
                style={styles.chart}
              />
            </View>
          </Section>

          <Section title="Outcome summary" eyebrow="Slip rate">
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Slip vs no-slip</Text>
              <BarChart
                data={{
                  labels: analytics.slips.map((item) => item.label),
                  datasets: [{ data: analytics.slips.map((item) => item.value) }],
                }}
                width={chartWidth}
                height={220}
                fromZero
                yAxisLabel=""
                yAxisSuffix=""
                showValuesOnTopOfBars
                withInnerLines={false}
                chartConfig={chartConfig}
                style={styles.chart}
              />
            </View>
          </Section>

          <Section title="Mood mix" eyebrow="Emotional pattern">
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Mood distribution</Text>
              <PieChart
                data={analytics.moods}
                width={chartWidth}
                height={220}
                accessor="count"
                backgroundColor="transparent"
                chartConfig={chartConfig}
                paddingLeft="0"
                hasLegend
              />
            </View>
          </Section>
        </>
      )}
    </ScreenShell>
  )
}

function CoachScreen({ data }: { data: OnboardingData }) {
  const [mode, setMode] = useState<'Text' | 'Voice'>('Text')
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<CoachMessage[]>([
    {
      id: 'coach-welcome',
      role: 'coach' as const,
      text: `I can help with urge interruption, relapse recovery, and planning around ${data.triggerTime.toLowerCase()}.`,
    },
  ])
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [isCoachLoading, setIsCoachLoading] = useState(false)
  const [recording, setRecording] = useState<Audio.Recording | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [realtimeStatus, setRealtimeStatus] = useState('Not initialized')
  const isBackendConfigured = Boolean(coachApiUrl)
  const peerConnectionRef = useRef<any>(null)
  const dataChannelRef = useRef<any>(null)
  const localStreamRef = useRef<any>(null)

  useEffect(() => {
    return () => {
      void disconnectRealtimeVoice()
    }
  }, [])

  async function sendMessage(text: string) {
    const clean = text.trim()
    if (!clean) {
      return
    }

    const nextUser = {
      id: `user-${Date.now()}`,
      role: 'user' as const,
      text: clean,
    }

    setMessages((current) => [...current, nextUser])
    setDraft('')
    setVoiceTranscript('')
    setIsCoachLoading(true)

    const reply = await getCoachReply(clean, data)

    const nextCoach = {
      id: `coach-${Date.now() + 1}`,
      role: 'coach' as const,
      text: reply,
    }

    setMessages((current) => [...current, nextCoach])
    setIsCoachLoading(false)

    if (mode === 'Voice') {
      Speech.stop()
      Speech.speak(reply)
    }
  }

  async function startVoiceRecording() {
    const permission = await Audio.requestPermissionsAsync()
    if (!permission.granted) {
      return
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    })

    const nextRecording = new Audio.Recording()
    await nextRecording.prepareToRecordAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY,
    )
    await nextRecording.startAsync()
    setRecording(nextRecording)
    setIsRecording(true)
  }

  async function stopVoiceRecording() {
    if (!recording) {
      return
    }

    setIsRecording(false)
    await recording.stopAndUnloadAsync()
    const uri = recording.getURI()
    setRecording(null)

    if (!uri) {
      return
    }

    const transcript = await transcribeAudio(uri)
    if (!transcript) {
      return
    }

    setVoiceTranscript(transcript)
    await sendMessage(transcript)
  }

  async function initializeRealtimeVoice() {
    if (!coachApiUrl) {
      setRealtimeStatus('Backend URL not configured')
      return
    }

    try {
      setRealtimeStatus('Requesting session token')
      const response = await fetch(`${coachApiUrl}/api/coach/realtime/session`, {
        method: 'POST',
      })

      if (!response.ok) {
        setRealtimeStatus('Realtime session request failed')
        return
      }

      const sessionPayload = (await response.json()) as RealtimeSessionPayload
      const clientSecret = sessionPayload.client_secret?.value

      if (!clientSecret) {
        setRealtimeStatus('Realtime client secret missing')
        return
      }

      const { mediaDevices, RTCPeerConnection, RTCSessionDescription } = require('react-native-webrtc')
      const localStream = await mediaDevices.getUserMedia({
        audio: true,
        video: false,
      })

      localStreamRef.current = localStream

      const peerConnection = new RTCPeerConnection()
      peerConnectionRef.current = peerConnection

      localStream.getTracks().forEach((track: any) => {
        peerConnection.addTrack(track, localStream)
      })

      ;(peerConnection as any).onconnectionstatechange = () => {
        setRealtimeStatus(`Connection ${peerConnection.connectionState}`)
      }

      const dataChannel = peerConnection.createDataChannel('oai-events')
      dataChannelRef.current = dataChannel

      ;(dataChannel as any).onopen = () => {
        setRealtimeStatus('Realtime connected')
      }

      ;(dataChannel as any).onmessage = (event: { data?: string }) => {
        try {
          const payload = JSON.parse(String(event.data)) as {
            type?: string
            transcript?: string
            item?: { content?: Array<{ transcript?: string }> }
            response?: { output?: Array<{ content?: Array<{ transcript?: string; text?: string }> }> }
          }

          if (payload.type === 'conversation.item.input_audio_transcription.completed') {
            const transcript =
              payload.transcript ??
              payload.item?.content?.find((item) => item.transcript)?.transcript

            if (transcript) {
              setVoiceTranscript(transcript)
              setMessages((current) => [
                ...current,
                {
                  id: `user-rt-${Date.now()}`,
                  role: 'user',
                  text: transcript,
                },
              ])
            }
          }

          if (
            payload.type === 'response.output_text.done' ||
            payload.type === 'response.audio_transcript.done'
          ) {
            const transcript =
              payload.transcript ??
              payload.response?.output
                ?.flatMap((item) => item.content ?? [])
                .find((item) => item.transcript || item.text)?.transcript ??
              payload.response?.output
                ?.flatMap((item) => item.content ?? [])
                .find((item) => item.text)?.text

            if (transcript) {
              setMessages((current) => [
                ...current,
                {
                  id: `coach-rt-${Date.now()}`,
                  role: 'coach',
                  text: transcript,
                },
              ])
            }
          }
        } catch {
          // Ignore non-JSON or unsupported event payloads.
        }
      }

      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
      })
      await peerConnection.setLocalDescription(offer)

      const sdpResponse = await fetch(
        'https://api.openai.com/v1/realtime?model=gpt-realtime',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${clientSecret}`,
            'Content-Type': 'application/sdp',
          },
          body: offer.sdp ?? '',
        },
      )

      if (!sdpResponse.ok) {
        setRealtimeStatus('Realtime SDP negotiation failed')
        await disconnectRealtimeVoice()
        return
      }

      const answerSdp = await sdpResponse.text()
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription({
          type: 'answer',
          sdp: answerSdp,
        }),
      )
    } catch {
      setRealtimeStatus('Realtime session request failed')
    }
  }

  async function disconnectRealtimeVoice() {
    try {
      dataChannelRef.current?.close()
      dataChannelRef.current = null

      peerConnectionRef.current?.close()
      peerConnectionRef.current = null

      localStreamRef.current?.getTracks().forEach((track: any) => track.stop())
      localStreamRef.current = null

      setRealtimeStatus('Disconnected')
    } catch {
      setRealtimeStatus('Disconnect failed')
    }
  }

  return (
    <ScreenShell subtitle="Coach" title="steady.path">
      <View style={styles.heroPanel}>
        <Text style={styles.eyebrow}>AI coach</Text>
        <Text style={styles.heroTitle}>Text and voice support.</Text>
        <Text style={styles.heroText}>
          Text coaching is backend-backed. Voice mode now supports recording plus a
          dev-build Realtime WebRTC path.
        </Text>
      </View>

      <Section title="Coach mode" eyebrow="Input">
        <OptionGroup
          options={['Text', 'Voice']}
          value={mode}
          onSelect={(value) => setMode(value as 'Text' | 'Voice')}
        />
      </Section>

      <Section title="Conversation" eyebrow="Coach session">
        <View style={styles.stack}>
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.chatBubble,
                message.role === 'coach' ? styles.chatBubbleCoach : styles.chatBubbleUser,
              ]}
            >
              <Text style={styles.microLabel}>
                {message.role === 'coach' ? 'Coach' : 'You'}
              </Text>
              <Text style={styles.bodyText}>{message.text}</Text>
            </View>
          ))}
          {isCoachLoading ? (
            <View style={[styles.chatBubble, styles.chatBubbleCoach]}>
              <Text style={styles.microLabel}>Coach</Text>
              <Text style={styles.bodyText}>Thinking...</Text>
            </View>
          ) : null}
        </View>
      </Section>

      {mode === 'Text' ? (
        <Section title="Text coach" eyebrow="Message">
          <TextInput
            style={[styles.input, styles.textArea]}
            value={draft}
            placeholder="Type what is happening right now..."
            placeholderTextColor="#8a98a4"
            multiline
            onChangeText={setDraft}
          />
          <View style={styles.buttonRow}>
            <Pressable style={[styles.button, styles.primaryButton]} onPress={() => sendMessage(draft)}>
              <Text style={styles.primaryButtonLabel}>Send</Text>
            </Pressable>
          </View>
        </Section>
      ) : (
        <Section title="Voice coach" eyebrow="Speech path">
          <View style={styles.focusTimerCard}>
            <Text style={styles.microLabel}>Voice session</Text>
            <Text style={styles.goalText}>Microphone capture enabled</Text>
            <Text style={styles.bodyText}>
              Record audio, send it to the backend transcription endpoint, then route the transcript through the coach.
            </Text>
          </View>
          <View style={styles.focusTimerCard}>
            <Text style={styles.microLabel}>Realtime voice beta</Text>
            <Text style={styles.goalText}>{realtimeStatus}</Text>
            <Text style={styles.bodyText}>
              This path requires a development build. Expo Go cannot load the native WebRTC module.
            </Text>
          </View>
          <View style={styles.buttonRow}>
            <Pressable style={[styles.button, styles.secondaryButton]} onPress={() => void initializeRealtimeVoice()}>
              <Text style={styles.secondaryButtonLabel}>Connect realtime</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.secondaryButton]} onPress={() => void disconnectRealtimeVoice()}>
              <Text style={styles.secondaryButtonLabel}>Disconnect</Text>
            </Pressable>
            {!isRecording ? (
              <Pressable style={[styles.button, styles.primaryButton]} onPress={() => void startVoiceRecording()}>
                <Text style={styles.primaryButtonLabel}>Start recording</Text>
              </Pressable>
            ) : (
              <Pressable style={[styles.button, styles.primaryButton]} onPress={() => void stopVoiceRecording()}>
                <Text style={styles.primaryButtonLabel}>Stop and transcribe</Text>
              </Pressable>
            )}
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={voiceTranscript}
            placeholder="Temporary transcript field until live voice capture is wired..."
            placeholderTextColor="#8a98a4"
            multiline
            onChangeText={setVoiceTranscript}
          />
          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.button, styles.primaryButton]}
              onPress={() => void sendMessage(voiceTranscript)}
            >
              <Text style={styles.primaryButtonLabel}>Send transcript</Text>
            </Pressable>
          </View>
        </Section>
      )}

      <Section title="Integration note" eyebrow="Backend">
        <EmptyStateCard
          title={isBackendConfigured ? 'Backend AI is configured.' : 'Backend AI is not configured.'}
          body={
            isBackendConfigured
              ? 'Text responses should come from the backend coach endpoint. Voice can use transcription or the WebRTC Realtime path in a development build.'
              : 'Right now the text coach falls back to built-in local recovery replies. To get non-fixed AI responses, run the backend and set EXPO_PUBLIC_COACH_API_URL plus OPENAI_API_KEY.'
          }
        />
      </Section>
    </ScreenShell>
  )
}

function PlanScreen({
  data,
  contentFilterConfig,
  contentFilterStatus,
  onUpdateContentFilterConfig,
  onStartNativeContentFilter,
  onStopNativeContentFilter,
  onOpenFilterSettings,
  onRefreshContentFilter,
}: {
  data: OnboardingData
  contentFilterConfig: ContentFilterConfig
  contentFilterStatus: ContentFilterStatus
  onUpdateContentFilterConfig: (next: ContentFilterConfig) => void
  onStartNativeContentFilter: () => void
  onStopNativeContentFilter: () => void
  onOpenFilterSettings: () => void
  onRefreshContentFilter: () => void
}) {
  const selectedApps = parseRiskyApps(data.riskyApps)
  const isAndroid = Platform.OS === 'android'
  const nativeReady = !isAndroid || contentFilterStatus.available
  const filterRunning = contentFilterStatus.serviceRunning
  const statusTitle = isAndroid
    ? filterRunning
      ? 'Android DNS filter running'
      : contentFilterStatus.vpnPermissionGranted
        ? 'VPN permission granted'
        : 'VPN permission needed'
    : 'iOS native entitlement path required'
  const statusBody = isAndroid
    ? filterRunning
      ? `Whole-phone DNS filtering is active. ${contentFilterStatus.blockedRequestCount} requests blocked${contentFilterStatus.lastBlockedDomain ? `, last: ${contentFilterStatus.lastBlockedDomain}` : ''}.`
      : nativeReady
        ? 'This filter protects the whole phone. When started, Android routes DNS into Steady Path and blocked domains are answered locally.'
        : 'This installed build does not expose the native Android filter module, so the controls below will not work until a newer development build is installed.'
    : 'iOS requires Apple Network Extension and content-filter entitlements. The shared settings UI is ready, but native enforcement must be added from a macOS/Xcode environment.'

  function toggleBlockedCategory(category: string) {
    const next = contentFilterConfig.blockedCategories.includes(category)
      ? contentFilterConfig.blockedCategories.filter((item) => item !== category)
      : [...contentFilterConfig.blockedCategories, category]

    onUpdateContentFilterConfig({
      ...contentFilterConfig,
      blockedCategories: next,
    })
  }

  return (
    <ScreenShell subtitle="Plan" title="steady.path">
      <View style={styles.heroPanel}>
        <Text style={styles.eyebrow}>Protection map</Text>
        <Text style={styles.heroTitle}>Build defenses around the risky window.</Text>
        <Text style={styles.heroText}>This screen isolates the user's triggers, risky apps, and support plan in one place.</Text>
      </View>
      <Section title="Personal recovery map" eyebrow="Onboarding">
        <View style={styles.stack}>
          <SummaryCard label="Main goal" value={data.primaryGoal} highlighted />
          <SummaryCard label="Why it matters" value={data.motivation} />
          <SummaryCard label="Reminder time" value={data.reminderTime} />
        </View>
      </Section>
      <Section title="Known triggers" eyebrow="Pattern tracking">
        <View style={styles.triggerWrap}>
          {selectedApps.map((app) => (
            <View key={app} style={styles.triggerChip}>
              <Text style={styles.triggerText}>{app}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.supportCopy}>High-risk time currently set to {data.triggerTime.toLowerCase()}.</Text>
      </Section>

      <Section title="Content filter" eyebrow="Whole-phone protection">
        <View style={styles.focusTimerCard}>
          <Text style={styles.microLabel}>Detected platform</Text>
          <Text style={styles.goalText}>{contentFilterStatus.platformLabel}</Text>
          <Text style={styles.bodyText}>
            This filter applies across the whole phone. It is not limited to selected apps.
          </Text>
        </View>

        <FieldLabel label="Whole-phone filter" />
        <OptionGroup
          options={['Off', 'On']}
          value={contentFilterConfig.enabled ? 'On' : 'Off'}
          onSelect={(value) =>
            onUpdateContentFilterConfig({
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
            onUpdateContentFilterConfig({
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
            onUpdateContentFilterConfig({
              ...contentFilterConfig,
              strictMode: value === 'On',
            })
          }
        />

        <View style={styles.focusTimerCard}>
          <Text style={styles.microLabel}>Native status</Text>
          <Text style={styles.goalText}>{statusTitle}</Text>
          <Text style={styles.bodyText}>{statusBody}</Text>
        </View>
        <View style={styles.stack}>
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
          <SummaryCard
            label="Blocked requests"
            value={`${contentFilterStatus.blockedRequestCount}`}
          />
          <SummaryCard
            label="Last blocked domain"
            value={contentFilterStatus.lastBlockedDomain || 'Nothing blocked yet'}
          />
        </View>
        <View style={styles.buttonRow}>
          {isAndroid ? (
            <>
              <Pressable
                style={[
                  styles.button,
                  !nativeReady || filterRunning || !contentFilterConfig.enabled
                    ? styles.disabledButton
                    : styles.primaryButton,
                ]}
                disabled={!nativeReady || filterRunning || !contentFilterConfig.enabled}
                onPress={onStartNativeContentFilter}
              >
                <Text style={styles.primaryButtonLabel}>
                  {contentFilterConfig.enabled ? 'Start Android filter' : 'Enable filter in plan first'}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.button,
                  !nativeReady || !filterRunning ? styles.disabledButton : styles.secondaryButton,
                ]}
                disabled={!nativeReady || !filterRunning}
                onPress={onStopNativeContentFilter}
              >
                <Text style={styles.secondaryButtonLabel}>Stop Android filter</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.button,
                  !nativeReady ? styles.disabledButton : styles.secondaryButton,
                ]}
                disabled={!nativeReady}
                onPress={onOpenFilterSettings}
              >
                <Text style={styles.secondaryButtonLabel}>Open VPN settings</Text>
              </Pressable>
            </>
          ) : null}
          <Pressable style={[styles.button, styles.secondaryButton]} onPress={onRefreshContentFilter}>
            <Text style={styles.secondaryButtonLabel}>Refresh filter status</Text>
          </Pressable>
        </View>
      </Section>
    </ScreenShell>
  )
}

function ProfileScreen({
  data,
  reminderStatus,
  onEnableReminder,
  onReset,
}: {
  data: OnboardingData
  reminderStatus: ReminderStatus
  onEnableReminder: () => void
  onReset: () => void
}) {
  return (
    <ScreenShell subtitle="Profile" title="steady.path">
      <View style={styles.heroPanel}>
        <Text style={styles.eyebrow}>Profile</Text>
        <Text style={styles.heroTitle}>{data.accountabilityContact}</Text>
        <Text style={styles.heroText}>Current plan owner for reminders, nightly reset, and support outreach.</Text>
      </View>
      <Section title="Saved settings" eyebrow="Device storage">
        <View style={styles.stack}>
          <SummaryCard label="Goal" value={data.primaryGoal} highlighted />
          <SummaryCard label="Risky apps" value={data.riskyApps} />
          <SummaryCard label="Check-in reminder" value={data.reminderTime} />
        </View>
      </Section>
      <Section title="Reminders" eyebrow="Native features">
        <View style={styles.stack}>
          <SummaryCard label="Reminder status" value={reminderStatus} highlighted />
          <SummaryCard label="Daily reminder time" value={data.reminderTime} />
        </View>
        <View style={styles.buttonRow}>
          <Pressable style={[styles.button, styles.primaryButton]} onPress={onEnableReminder}>
            <Text style={styles.primaryButtonLabel}>Enable reminder</Text>
          </Pressable>
        </View>
      </Section>
      <View style={styles.footerBanner}>
        <Text style={styles.eyebrow}>Reset</Text>
        <Text style={styles.sectionTitle}>Clear the saved onboarding data.</Text>
        <Text style={styles.bodyText}>This removes the local plan and returns the app to onboarding.</Text>
        <View style={styles.buttonRow}>
          <Pressable style={[styles.button, styles.secondaryButton]} onPress={onReset}>
            <Text style={styles.secondaryButtonLabel}>Reset app</Text>
          </Pressable>
        </View>
      </View>
    </ScreenShell>
  )
}

function ScreenShell({
  subtitle,
  title,
  children,
}: {
  subtitle: string
  title: string
  children: React.ReactNode
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TopBar subtitle={subtitle} title={title} />
        {children}
      </ScrollView>
    </SafeAreaView>
  )
}

function TopBar({ subtitle, title }: { subtitle: string; title: string }) {
  return (
    <View style={styles.topBar}>
      <View>
        <Text style={styles.topBarTitle}>{title}</Text>
        <Text style={styles.topBarSubtitle}>{subtitle}</Text>
      </View>
      <View style={styles.topBarBadge}>
        <Text style={styles.topBarBadgeText}>LIVE</Text>
      </View>
    </View>
  )
}

function TabIcon({ label, color }: { label: string; color: string }) {
  return (
    <View style={styles.tabIcon}>
      <Text style={[styles.tabIconText, { color }]}>{label}</Text>
    </View>
  )
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children: React.ReactNode
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  )
}

function SummaryCard({
  label,
  value,
  highlighted = false,
}: {
  label: string
  value: string
  highlighted?: boolean
}) {
  return (
    <View style={[styles.goalCard, highlighted ? styles.goalCardActive : null]}>
      <Text style={styles.microLabel}>{label}</Text>
      <Text style={styles.goalText}>{value}</Text>
    </View>
  )
}

function EmptyStateCard({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.goalCard}>
      <Text style={styles.goalText}>{title}</Text>
      <Text style={styles.bodyText}>{body}</Text>
    </View>
  )
}

function FieldLabel({ label }: { label: string }) {
  return <Text style={styles.fieldLabel}>{label}</Text>
}

function StoryChip({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <View style={styles.storyChip}>
      <View style={[styles.storyAvatar, active ? styles.storyAvatarActive : null]}>
        <Text style={styles.storyAvatarText}>{label.slice(0, 1).toUpperCase()}</Text>
      </View>
      <Text style={styles.storyChipLabel} numberOfLines={1}>{label}</Text>
    </View>
  )
}

function OptionGroup({
  options,
  value,
  onSelect,
}: {
  options: string[]
  value: string
  onSelect: (value: string) => void
}) {
  return (
    <View style={styles.optionGroup}>
      {options.map((option) => (
        <Pressable
          key={option}
          style={[styles.optionCard, option === value ? styles.optionCardSelected : null]}
          onPress={() => onSelect(option)}
        >
          <Text style={[styles.optionLabel, option === value ? styles.optionLabelSelected : null]}>
            {option}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}

function ChipGrid({
  options,
  selected,
  onToggle,
}: {
  options: string[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  return (
    <View style={styles.triggerWrap}>
      {options.map((option) => {
        const isSelected = selected.includes(option)
        return (
          <Pressable
            key={option}
            style={[styles.choiceChip, isSelected ? styles.choiceChipSelected : null]}
            onPress={() => onToggle(option)}
          >
            <Text style={[styles.choiceChipText, isSelected ? styles.choiceChipTextSelected : null]}>
              {option}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function parseRiskyApps(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

function normalizeContentFilterConfig(
  config: Partial<ContentFilterConfig> | null | undefined,
): ContentFilterConfig {
  return {
    enabled: Boolean(config?.enabled),
    safeSearch:
      typeof config?.safeSearch === 'boolean'
        ? config.safeSearch
        : defaultContentFilterConfig.safeSearch,
    strictMode:
      typeof config?.strictMode === 'boolean'
        ? config.strictMode
        : defaultContentFilterConfig.strictMode,
    blockedCategories:
      Array.isArray(config?.blockedCategories) && config.blockedCategories.length > 0
        ? config.blockedCategories
        : defaultContentFilterConfig.blockedCategories,
  }
}

function buildDailyHabits(data: OnboardingData): Habit[] {
  return [
    { name: 'Morning check-in', status: 'Done', note: `Review the main goal: ${data.primaryGoal}.` },
    { name: 'Risk awareness', status: 'In progress', note: `Treat ${data.triggerTime.toLowerCase()} as the highest-risk time today.` },
    { name: 'Contact support', status: 'Next', note: `Send a quick check-in to ${data.accountabilityContact} at ${data.reminderTime}.` },
  ]
}

function buildInsights(
  data: OnboardingData,
  progress: ProgressBundle = {
    currentNoSlipStreak: 0,
    bestNoSlipStreak: 0,
    checkInsThisWeek: 0,
    slipRatePercent: 0,
    lastSevenDayAverageUrge: 0,
  },
): Insight[] {
  return [
    {
      label: 'Current streak',
      value: String(progress.currentNoSlipStreak),
      change: `Best streak: ${progress.bestNoSlipStreak}.`,
    },
    {
      label: 'Slip rate',
      value: `${progress.slipRatePercent}%`,
      change: `${progress.checkInsThisWeek} check-ins in the last 7 days.`,
    },
    {
      label: 'Average urge',
      value: String(progress.lastSevenDayAverageUrge),
      change: `Main trigger: ${data.triggerTime}. Reminder: ${data.reminderTime}.`,
    },
  ]
}

function buildAnalytics(entries: CheckInEntry[]): AnalyticsBundle {
  const recent = entries.slice(0, 7).reverse()
  const urgeLabels = recent.map((entry) =>
    new Date(entry.createdAt).toLocaleDateString([], { month: 'numeric', day: 'numeric' }),
  )
  const urgeValues = recent.map((entry) => entry.urgeLevel)

  const moodMap = new Map<string, number>()
  for (const entry of entries) {
    moodMap.set(entry.mood, (moodMap.get(entry.mood) ?? 0) + 1)
  }

  const moods = Array.from(moodMap.entries()).map(([name, count], index) => ({
    name,
    count,
    color: moodColors[index % moodColors.length],
    legendFontColor: '#d7d8dd',
    legendFontSize: 12,
  }))

  const slips = outcomeOptions.map((label) => ({
    label,
    value: entries.filter((entry) => entry.outcome === label).length,
  }))

  return { urgeLabels, urgeValues, moods, slips }
}

function buildProgress(entries: CheckInEntry[]): ProgressBundle {
  const sorted = [...entries].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  )

  let currentNoSlipStreak = 0
  for (const entry of sorted) {
    if (entry.outcome === 'No slip') {
      currentNoSlipStreak += 1
    } else {
      break
    }
  }

  let bestNoSlipStreak = 0
  let running = 0
  for (const entry of [...sorted].reverse()) {
    if (entry.outcome === 'No slip') {
      running += 1
      bestNoSlipStreak = Math.max(bestNoSlipStreak, running)
    } else {
      running = 0
    }
  }

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const recent = sorted.filter((entry) => new Date(entry.createdAt).getTime() >= sevenDaysAgo)
  const checkInsThisWeek = recent.length
  const slipCount = sorted.filter((entry) => entry.outcome === 'Slip').length
  const slipRatePercent =
    sorted.length === 0 ? 0 : Math.round((slipCount / sorted.length) * 100)
  const lastSevenDayAverageUrge =
    recent.length === 0
      ? 0
      : Math.round(
          recent.reduce((sum, entry) => sum + entry.urgeLevel, 0) / recent.length,
        )

  return {
    currentNoSlipStreak,
    bestNoSlipStreak,
    checkInsThisWeek,
    slipRatePercent,
    lastSevenDayAverageUrge,
  }
}

function formatCheckInDate(value: string) {
  const date = new Date(value)
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

function generateCoachReply(input: string, data: OnboardingData) {
  const normalized = input.toLowerCase()

  if (normalized.includes('slip')) {
    return `Reset fast. Stop the spiral, log what led up to it, and protect the next ${data.triggerTime.toLowerCase()} window. Message ${data.accountabilityContact} if you need accountability.`
  }

  if (normalized.includes('urge')) {
    return `Treat this as a short-wave problem. Move away from the trigger, breathe for 90 seconds, and commit to getting through the next 10 minutes without opening risky apps.`
  }

  if (normalized.includes('tonight') || normalized.includes('plan')) {
    return `Tonight's plan: keep ${data.riskyApps || 'risky apps'} out of reach, start a focus block before ${data.reminderTime}, and front-load one safe replacement activity before ${data.triggerTime.toLowerCase()}.`
  }

  return `Start with one concrete action: remove access to the trigger, reduce friction around your goal, and make the next safe choice easier than the bad one.`
}

async function getCoachReply(input: string, data: OnboardingData) {
  if (!coachApiUrl) {
    return generateCoachReply(input, data)
  }

  try {
    const response = await fetch(`${coachApiUrl}/api/coach/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: input,
        profile: data,
      }),
    })

    if (!response.ok) {
      return generateCoachReply(input, data)
    }

    const payload = (await response.json()) as { reply?: string }
    return payload.reply?.trim() || generateCoachReply(input, data)
  } catch {
    return generateCoachReply(input, data)
  }
}

async function transcribeAudio(uri: string) {
  if (!coachApiUrl) {
    return ''
  }

  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    })

    const response = await fetch(`${coachApiUrl}/api/coach/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audioBase64: base64,
      }),
    })

    if (!response.ok) {
      return ''
    }

    const payload = (await response.json()) as { text?: string }
    return payload.text?.trim() || ''
  } catch {
    return ''
  }
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#090909' },
  loadingScreen: { flex: 1, backgroundColor: '#090909', alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { fontSize: 15, color: '#c4c7ce' },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32, gap: 14 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2, paddingTop: 4 },
  topBarTitle: { color: '#f5f5f5', fontSize: 24, fontWeight: '800', letterSpacing: -0.6 },
  topBarSubtitle: { marginTop: 4, color: '#9ea1aa', fontSize: 13, fontWeight: '600' },
  topBarBadge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#191919', borderWidth: 1, borderColor: '#2b2b2b' },
  topBarBadgeText: { color: '#ff5b7f', fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  heroPanel: { padding: 20, borderRadius: 22, backgroundColor: '#121212', borderWidth: 1, borderColor: '#262626' },
  eyebrow: { fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#ff8fab', fontWeight: '700', marginBottom: 10 },
  heroTitle: { fontSize: 28, lineHeight: 31, color: '#f5f5f5', fontWeight: '800' },
  heroText: { marginTop: 12, fontSize: 15, lineHeight: 22, color: '#b3b3b8' },
  card: { padding: 18, borderRadius: 20, backgroundColor: '#121212', borderWidth: 1, borderColor: '#262626' },
  snapshotCard: { backgroundColor: '#111217' },
  snapshotLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, color: '#b785ff' },
  snapshotValue: { marginTop: 8, fontSize: 28, lineHeight: 30, fontWeight: '800', color: '#ffffff' },
  snapshotText: { marginTop: 8, fontSize: 14, lineHeight: 21, color: '#c7cad4' },
  snapshotList: { marginTop: 12, gap: 6 },
  snapshotItem: { fontSize: 13, lineHeight: 19, color: '#b3b8c4' },
  sectionTitle: { fontSize: 21, lineHeight: 24, color: '#f5f5f5', fontWeight: '800' },
  sectionContent: { marginTop: 14 },
  stepDetail: { marginTop: 8, fontSize: 14, lineHeight: 21, color: '#b3b3b8' },
  fieldLabel: { marginBottom: 8, fontSize: 13, fontWeight: '700', color: '#d0d2d8' },
  input: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: '#2a2a2f', backgroundColor: '#0f1014', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#f5f5f5', marginBottom: 14 },
  textArea: { minHeight: 102, textAlignVertical: 'top' },
  optionGroup: { gap: 8 },
  optionCard: { minHeight: 46, justifyContent: 'center', borderRadius: 14, backgroundColor: '#0f1014', paddingHorizontal: 14, borderWidth: 1, borderColor: '#26262c' },
  optionCardSelected: { backgroundColor: '#2a1220', borderWidth: 1, borderColor: '#ff5b7f' },
  optionLabel: { fontSize: 14, color: '#d7d8dd', fontWeight: '600' },
  optionLabelSelected: { color: '#ff9bb1' },
  triggerWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choiceChip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999, backgroundColor: '#191919', borderWidth: 1, borderColor: '#262626' },
  choiceChipSelected: { backgroundColor: '#2a1220', borderColor: '#ff5b7f' },
  choiceChipText: { color: '#d2d3d8', fontSize: 13, fontWeight: '700' },
  choiceChipTextSelected: { color: '#ff9bb1' },
  levelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  levelChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelChipActive: {
    backgroundColor: '#2a1220',
    borderColor: '#ff5b7f',
  },
  levelChipText: { color: '#d2d3d8', fontSize: 13, fontWeight: '700' },
  levelChipTextActive: { color: '#ff9bb1' },
  progressRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  progressDot: { flex: 1, height: 6, borderRadius: 999, backgroundColor: '#26262c' },
  progressDotActive: { backgroundColor: '#ff5b7f' },
  buttonRow: { flexDirection: 'column', alignItems: 'stretch', gap: 12, marginTop: 22 },
  button: { minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, width: '100%' },
  primaryButton: { backgroundColor: '#ff2f6d' },
  secondaryButton: { backgroundColor: '#191919', borderWidth: 1, borderColor: '#2c2c2c' },
  disabledButton: { backgroundColor: '#5b2e3b' },
  primaryButtonLabel: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  secondaryButtonLabel: { color: '#f5f5f5', fontSize: 15, fontWeight: '700' },
  storyRow: { flexDirection: 'row', gap: 10 },
  storyChip: { width: 72, alignItems: 'center', gap: 7 },
  storyAvatar: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', backgroundColor: '#151515', borderWidth: 1, borderColor: '#2b2b2b' },
  storyAvatarActive: { borderColor: '#ff5b7f', backgroundColor: '#24111a' },
  storyAvatarText: { color: '#f5f5f5', fontSize: 18, fontWeight: '800' },
  storyChipLabel: { color: '#d7d8dd', fontSize: 11, fontWeight: '600', maxWidth: 70 },
  stack: { gap: 10 },
  goalCard: { padding: 16, borderRadius: 18, backgroundColor: '#16171b', borderWidth: 1, borderColor: '#24252b' },
  goalCardActive: { backgroundColor: '#21131b', borderColor: '#ff5b7f' },
  microLabel: { fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: '#ff8fab', fontWeight: '700', marginBottom: 8 },
  goalText: { fontSize: 16, lineHeight: 22, color: '#f3f4f6', fontWeight: '700' },
  toolCard: { padding: 16, borderRadius: 18, backgroundColor: '#15161a', borderWidth: 1, borderColor: '#26272c' },
  toolTitle: { fontSize: 16, lineHeight: 22, color: '#f5f5f5', fontWeight: '700', marginBottom: 4 },
  bodyText: { fontSize: 14, lineHeight: 20, color: '#b3b3b8' },
  habitRow: { padding: 15, borderRadius: 18, backgroundColor: '#16171b', borderWidth: 1, borderColor: '#24252b', gap: 10 },
  habitCopy: { gap: 6 },
  habitTitle: { fontSize: 16, lineHeight: 21, color: '#f5f5f5', fontWeight: '700' },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999 },
  statusText: { fontSize: 12, fontWeight: '800' },
  triggerChip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999, backgroundColor: '#16171b', borderWidth: 1, borderColor: '#24252b' },
  triggerText: { color: '#e1e2e6', fontSize: 13, fontWeight: '700' },
  supportCopy: { marginTop: 14, fontSize: 14, lineHeight: 20, color: '#b3b3b8' },
  insightCard: { padding: 16, borderRadius: 18, backgroundColor: '#16171b', borderWidth: 1, borderColor: '#24252b' },
  insightValue: { fontSize: 24, lineHeight: 28, color: '#f5f5f5', fontWeight: '800', marginBottom: 4 },
  chartCard: { padding: 12, borderRadius: 18, backgroundColor: '#16171b', borderWidth: 1, borderColor: '#24252b', overflow: 'hidden' },
  chartTitle: { color: '#f5f5f5', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  chart: { alignSelf: 'center', borderRadius: 16 },
  chatBubble: { padding: 14, borderRadius: 16, borderWidth: 1 },
  chatBubbleCoach: { backgroundColor: '#16171b', borderColor: '#24252b' },
  chatBubbleUser: { backgroundColor: '#2a1220', borderColor: '#ff5b7f' },
  focusTimerCard: { padding: 16, borderRadius: 18, backgroundColor: '#16171b', borderWidth: 1, borderColor: '#24252b', marginTop: 14 },
  focusTimerValue: { color: '#f5f5f5', fontSize: 28, fontWeight: '800', marginBottom: 6 },
  footerBanner: { padding: 18, borderRadius: 20, backgroundColor: '#111217', borderWidth: 1, borderColor: '#26262c' },
  tabBar: { backgroundColor: '#090909', borderTopColor: '#1d1d1f', height: 74, paddingBottom: 10, paddingTop: 6 },
  tabBarLabel: { fontSize: 10, fontWeight: '700' },
  tabIcon: { width: 24, alignItems: 'center' },
  tabIconText: { fontSize: 13, fontWeight: '800' },
})

const chartConfig = {
  backgroundGradientFrom: '#16171b',
  backgroundGradientTo: '#16171b',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(255, 91, 127, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(215, 216, 221, ${opacity})`,
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: '#ff2f6d',
  },
  propsForBackgroundLines: {
    stroke: '#24252b',
  },
  fillShadowGradientFrom: '#ff2f6d',
  fillShadowGradientTo: '#ff2f6d',
  fillShadowGradientFromOpacity: 0.24,
  fillShadowGradientToOpacity: 0.04,
  barPercentage: 0.6,
}

const statusStyleMap = StyleSheet.create({
  Done: { backgroundColor: 'rgba(77, 144, 94, 0.15)' },
  'In progress': { backgroundColor: 'rgba(230, 154, 78, 0.18)' },
  Next: { backgroundColor: 'rgba(44, 73, 92, 0.12)' },
})

const statusTextStyleMap = StyleSheet.create({
  Done: { color: '#2f6b3d' },
  'In progress': { color: '#d67d2b' },
  Next: { color: '#88a5b8' },
})
