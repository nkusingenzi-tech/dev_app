import type { NavigatorScreenParams } from '@react-navigation/native'

export type OnboardingStackParamList = {
  GoalSetup: undefined
  TriggerSetup: undefined
  RiskAppsSetup: undefined
  SupportSetup: undefined
  OnboardingReview: undefined
}

export type TodayStackParamList = {
  HomeDashboard: undefined
  UrgencyTools: undefined
  DailyPlan: undefined
  ProgressSnapshot: undefined
}

export type CheckInStackParamList = {
  NewCheckIn: undefined
  CheckInHistory: undefined
}

export type InsightsStackParamList = {
  InsightsOverview: undefined
  UrgeTrend: undefined
  OutcomeSummary: undefined
  MoodDistribution: undefined
}

export type CoachStackParamList = {
  CoachHub: undefined
  TextCoach: undefined
  VoiceCoach: undefined
}

export type ProtectionStackParamList = {
  ProtectionOverview: undefined
  TriggerApps: undefined
  ContentFilterSettings: undefined
  ContentFilterStatus: undefined
}

export type ProfileStackParamList = {
  ProfileOverview: undefined
  ReminderSettings: undefined
  ResetApp: undefined
}

export type AppTabsParamList = {
  Today: NavigatorScreenParams<TodayStackParamList>
  CheckIn: NavigatorScreenParams<CheckInStackParamList>
  Insights: NavigatorScreenParams<InsightsStackParamList>
  Coach: NavigatorScreenParams<CoachStackParamList>
  Protection: NavigatorScreenParams<ProtectionStackParamList>
  Profile: NavigatorScreenParams<ProfileStackParamList>
}
