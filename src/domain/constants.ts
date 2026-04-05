import type { ContentFilterConfig, OnboardingData, UrgeTool } from './models'

export const STORAGE_KEY = 'steady-path-onboarding'
export const CHECK_IN_STORAGE_KEY = 'steady-path-check-ins'
export const REMINDER_ID_STORAGE_KEY = 'steady-path-reminder-id'
export const CONTENT_FILTER_STORAGE_KEY = 'steady-path-content-filter'
export const LEGACY_FOCUS_PLAN_STORAGE_KEY = 'steady-path-focus-plan'
export const LEGACY_FOCUS_SESSION_HISTORY_STORAGE_KEY = 'steady-path-focus-session-history'
export const LEGACY_STORAGE_KEYS = [
  LEGACY_FOCUS_PLAN_STORAGE_KEY,
  LEGACY_FOCUS_SESSION_HISTORY_STORAGE_KEY,
] as const

export const defaultContentFilterConfig: ContentFilterConfig = {
  enabled: false,
  safeSearch: true,
  strictMode: true,
  blockedCategories: ['Adult content', 'Explicit search'],
}

export const defaultOnboardingData: OnboardingData = {
  primaryGoal: '',
  motivation: '',
  triggerTime: 'Late night',
  riskyApps: '',
  accountabilityContact: '',
  reminderTime: '21:30',
}

export const triggerTimeOptions = ['Late night', 'After work', 'When alone', 'During stress']
export const reminderTimeOptions = ['20:00', '21:30', '22:00']
export const riskyAppOptions = ['Chrome', 'Instagram', 'TikTok', 'X', 'Reddit', 'YouTube']
export const contentCategoryOptions = [
  'Adult content',
  'Explicit search',
  'Social reels',
  'Clickbait sites',
  'Gambling',
]
export const moodOptions = ['Calm', 'Stressed', 'Lonely', 'Bored', 'Focused']
export const outcomeOptions: Array<'No slip' | 'Slip'> = ['No slip', 'Slip']
export const moodColors = ['#ff5b7f', '#b785ff', '#5ac8fa', '#ffb347', '#7ee081']
export const defaultProgress = {
  currentNoSlipStreak: 0,
  bestNoSlipStreak: 0,
  checkInsThisWeek: 0,
  slipRatePercent: 0,
  lastSevenDayAverageUrge: 0,
} as const

export const urgeTools: UrgeTool[] = [
  {
    title: '90-second reset',
    action: 'Pause and breathe',
    detail: 'Slow the body down before making the next choice.',
  },
  {
    title: 'Leave the trigger',
    action: 'Move away from the device',
    detail: 'Stand up, change rooms, and break the loop quickly.',
  },
  {
    title: 'Message support',
    action: 'Reach out now',
    detail: 'Send a short check-in to your accountability contact.',
  },
]
