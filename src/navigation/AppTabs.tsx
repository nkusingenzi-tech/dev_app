import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import { useAppSession } from '../app/AppSessionContext'
import { CoachSessionProvider } from '../features/coach/context'
import { CoachHubScreen, TextCoachScreen, VoiceCoachScreen } from '../features/coach/screens'
import { CheckInHistoryScreen, NewCheckInScreen } from '../features/checkins/screens'
import {
  InsightsOverviewScreen,
  MoodDistributionScreen,
  OutcomeSummaryScreen,
  UrgeTrendScreen,
} from '../features/insights/screens'
import { ProfileOverviewScreen, ReminderSettingsScreen, ResetAppScreen } from '../features/profile/screens'
import {
  ContentFilterSettingsScreen,
  ContentFilterStatusScreen,
  ProtectionOverviewScreen,
  TriggerAppsScreen,
} from '../features/protection/screens'
import {
  DailyPlanScreen,
  HomeDashboardScreen,
  ProgressSnapshotScreen,
  UrgencyToolsScreen,
} from '../features/today/screens'
import { appStyles } from '../theme/styles'
import { TabIcon } from '../ui/components'
import type {
  AppTabsParamList,
  CheckInStackParamList,
  CoachStackParamList,
  InsightsStackParamList,
  ProfileStackParamList,
  ProtectionStackParamList,
  TodayStackParamList,
} from './types'

const Tab = createBottomTabNavigator<AppTabsParamList>()
const TodayStack = createNativeStackNavigator<TodayStackParamList>()
const CheckInStack = createNativeStackNavigator<CheckInStackParamList>()
const InsightsStack = createNativeStackNavigator<InsightsStackParamList>()
const CoachStack = createNativeStackNavigator<CoachStackParamList>()
const ProtectionStack = createNativeStackNavigator<ProtectionStackParamList>()
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>()

function TodayStackNavigator() {
  return (
    <TodayStack.Navigator screenOptions={{ headerShown: false }}>
      <TodayStack.Screen name="HomeDashboard" component={HomeDashboardScreen} />
      <TodayStack.Screen name="UrgencyTools" component={UrgencyToolsScreen} />
      <TodayStack.Screen name="DailyPlan" component={DailyPlanScreen} />
      <TodayStack.Screen name="ProgressSnapshot" component={ProgressSnapshotScreen} />
    </TodayStack.Navigator>
  )
}

function CheckInStackNavigator() {
  return (
    <CheckInStack.Navigator screenOptions={{ headerShown: false }}>
      <CheckInStack.Screen name="NewCheckIn" component={NewCheckInScreen} />
      <CheckInStack.Screen name="CheckInHistory" component={CheckInHistoryScreen} />
    </CheckInStack.Navigator>
  )
}

function InsightsStackNavigator() {
  return (
    <InsightsStack.Navigator screenOptions={{ headerShown: false }}>
      <InsightsStack.Screen name="InsightsOverview" component={InsightsOverviewScreen} />
      <InsightsStack.Screen name="UrgeTrend" component={UrgeTrendScreen} />
      <InsightsStack.Screen name="OutcomeSummary" component={OutcomeSummaryScreen} />
      <InsightsStack.Screen name="MoodDistribution" component={MoodDistributionScreen} />
    </InsightsStack.Navigator>
  )
}

function CoachStackNavigator() {
  const { data } = useAppSession()

  return (
    <CoachSessionProvider data={data}>
      <CoachStack.Navigator screenOptions={{ headerShown: false }}>
        <CoachStack.Screen name="CoachHub" component={CoachHubScreen} />
        <CoachStack.Screen name="TextCoach" component={TextCoachScreen} />
        <CoachStack.Screen name="VoiceCoach" component={VoiceCoachScreen} />
      </CoachStack.Navigator>
    </CoachSessionProvider>
  )
}

function ProtectionStackNavigator() {
  return (
    <ProtectionStack.Navigator screenOptions={{ headerShown: false }}>
      <ProtectionStack.Screen name="ProtectionOverview" component={ProtectionOverviewScreen} />
      <ProtectionStack.Screen name="TriggerApps" component={TriggerAppsScreen} />
      <ProtectionStack.Screen name="ContentFilterSettings" component={ContentFilterSettingsScreen} />
      <ProtectionStack.Screen name="ContentFilterStatus" component={ContentFilterStatusScreen} />
    </ProtectionStack.Navigator>
  )
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileOverview" component={ProfileOverviewScreen} />
      <ProfileStack.Screen name="ReminderSettings" component={ReminderSettingsScreen} />
      <ProfileStack.Screen name="ResetApp" component={ResetAppScreen} />
    </ProfileStack.Navigator>
  )
}

export function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: appStyles.tabBar,
        tabBarActiveTintColor: '#ff2f6d',
        tabBarInactiveTintColor: '#80838c',
        tabBarLabelStyle: appStyles.tabBarLabel,
      }}
    >
      <Tab.Screen
        name="Today"
        component={TodayStackNavigator}
        options={{ tabBarIcon: ({ color }) => <TabIcon label="T" color={color} /> }}
      />
      <Tab.Screen
        name="CheckIn"
        component={CheckInStackNavigator}
        options={{ title: 'Check-in', tabBarIcon: ({ color }) => <TabIcon label="C" color={color} /> }}
      />
      <Tab.Screen
        name="Insights"
        component={InsightsStackNavigator}
        options={{ tabBarIcon: ({ color }) => <TabIcon label="I" color={color} /> }}
      />
      <Tab.Screen
        name="Coach"
        component={CoachStackNavigator}
        options={{ tabBarIcon: ({ color }) => <TabIcon label="A" color={color} /> }}
      />
      <Tab.Screen
        name="Protection"
        component={ProtectionStackNavigator}
        options={{ title: 'Plan', tabBarIcon: ({ color }) => <TabIcon label="P" color={color} /> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{ tabBarIcon: ({ color }) => <TabIcon label="U" color={color} /> }}
      />
    </Tab.Navigator>
  )
}
