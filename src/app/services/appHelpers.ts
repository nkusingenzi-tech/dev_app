import {
  defaultContentFilterConfig,
  defaultProgress,
  moodColors,
  outcomeOptions,
} from '../../domain/constants'
import type {
  AnalyticsBundle,
  CheckInEntry,
  ContentFilterConfig,
  Habit,
  Insight,
  OnboardingData,
  ProgressBundle,
} from '../../domain/models'

export function parseRiskyApps(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function normalizeContentFilterConfig(
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

export function buildDailyHabits(data: OnboardingData): Habit[] {
  return [
    {
      name: 'Morning check-in',
      status: 'Done',
      note: `Review the main goal: ${data.primaryGoal}.`,
    },
    {
      name: 'Risk awareness',
      status: 'In progress',
      note: `Treat ${data.triggerTime.toLowerCase()} as the highest-risk time today.`,
    },
    {
      name: 'Contact support',
      status: 'Next',
      note: `Send a quick check-in to ${data.accountabilityContact} at ${data.reminderTime}.`,
    },
  ]
}

export function buildInsights(
  data: OnboardingData,
  progress: ProgressBundle = defaultProgress,
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

export function buildAnalytics(entries: CheckInEntry[]): AnalyticsBundle {
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
    color: moodColors[index % moodColors.length] ?? moodColors[0],
    legendFontColor: '#d7d8dd',
    legendFontSize: 12,
  }))

  const slips = outcomeOptions.map((label) => ({
    label,
    value: entries.filter((entry) => entry.outcome === label).length,
  }))

  return { urgeLabels, urgeValues, moods, slips }
}

export function buildProgress(entries: CheckInEntry[]): ProgressBundle {
  const sorted = [...entries].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  )

  let currentNoSlipStreak = 0
  for (const entry of sorted) {
    if (entry.outcome === 'No slip') {
      currentNoSlipStreak += 1
      continue
    }
    break
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
  const slipRatePercent = sorted.length === 0 ? 0 : Math.round((slipCount / sorted.length) * 100)
  const lastSevenDayAverageUrge =
    recent.length === 0
      ? 0
      : Math.round(recent.reduce((sum, entry) => sum + entry.urgeLevel, 0) / recent.length)

  return {
    currentNoSlipStreak,
    bestNoSlipStreak,
    checkInsThisWeek,
    slipRatePercent,
    lastSevenDayAverageUrge,
  }
}

export function formatCheckInDate(value: string) {
  const date = new Date(value)
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

export function generateCoachReply(input: string, data: OnboardingData) {
  const normalized = input.toLowerCase()

  if (normalized.includes('slip')) {
    return `Reset fast. Stop the spiral, log what led up to it, and protect the next ${data.triggerTime.toLowerCase()} window. Message ${data.accountabilityContact} if you need accountability.`
  }

  if (normalized.includes('urge')) {
    return 'Treat this as a short-wave problem. Move away from the trigger, breathe for 90 seconds, and commit to getting through the next 10 minutes without opening risky apps.'
  }

  if (normalized.includes('tonight') || normalized.includes('plan')) {
    return `Tonight's plan: keep ${data.riskyApps || 'risky apps'} out of reach, start a focus block before ${data.reminderTime}, and front-load one safe replacement activity before ${data.triggerTime.toLowerCase()}.`
  }

  return 'Start with one concrete action: remove access to the trigger, reduce friction around your goal, and make the next safe choice easier than the bad one.'
}
