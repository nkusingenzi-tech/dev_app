export type HabitStatus = 'Done' | 'In progress' | 'Next'

export type OnboardingData = {
  primaryGoal: string
  motivation: string
  triggerTime: string
  riskyApps: string
  accountabilityContact: string
  reminderTime: string
}

export type Habit = {
  name: string
  status: HabitStatus
  note: string
}

export type Insight = {
  label: string
  value: string
  change: string
}

export type UrgeTool = {
  title: string
  action: string
  detail: string
}

export type CheckInEntry = {
  id: string
  createdAt: string
  mood: string
  urgeLevel: number
  trigger: string
  outcome: 'No slip' | 'Slip'
  notes: string
}

export type CheckInOutcome = CheckInEntry['outcome']

export type AnalyticsBundle = {
  urgeLabels: string[]
  urgeValues: number[]
  moods: Array<{
    name: string
    count: number
    color: string
    legendFontColor: string
    legendFontSize: number
  }>
  slips: Array<{
    label: string
    value: number
  }>
}

export type ReminderStatus = 'Not enabled' | 'Scheduled' | 'Permission denied'

export type ProgressBundle = {
  currentNoSlipStreak: number
  bestNoSlipStreak: number
  checkInsThisWeek: number
  slipRatePercent: number
  lastSevenDayAverageUrge: number
}

export type CoachMessage = {
  id: string
  role: 'coach' | 'user'
  text: string
}

export type ContentFilterConfig = {
  enabled: boolean
  safeSearch: boolean
  strictMode: boolean
  blockedCategories: string[]
}

export type ContentFilterStatus = {
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

export type ContentFilterStartResult =
  | { kind: 'unavailable' }
  | { kind: 'permission_requested' }
  | { kind: 'started' }

export type ContentFilterStopResult =
  | { kind: 'unavailable' }
  | { kind: 'stopped' }

export type NativeContentFilterModule = {
  updateConfig: (
    enabled: boolean,
    safeSearch: boolean,
    strictMode: boolean,
    blockedCategories: string[],
  ) => Promise<void>
  getStatus: () => Promise<ContentFilterStatus>
  requestVpnPermissionAndStart: () => Promise<'permission_requested' | 'started'>
  stopFiltering: () => Promise<void>
  openVpnSettings: () => void
}

export type RealtimeSessionPayload = {
  client_secret?: {
    value?: string
  }
}

export type CoachMode = 'Text' | 'Voice'

export type SessionBootstrap = {
  done: boolean
  data: OnboardingData
  checkIns: CheckInEntry[]
  reminderStatus: ReminderStatus
  contentFilterConfig: ContentFilterConfig
  contentFilterStatus: ContentFilterStatus
}

export type AppBootstrapState = SessionBootstrap

export type DailyReminderScheduleResult = {
  status: ReminderStatus
}
