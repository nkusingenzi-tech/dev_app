import { describe, expect, test } from 'bun:test'

import { defaultContentFilterConfig, defaultOnboardingData } from '../../domain/constants'
import type { ContentFilterStatus, OnboardingData } from '../../domain/models'
import type { AppSessionDependencies } from './appSessionService'
import {
  completeOnboarding,
  enableDailyReminderForTime,
  loadAppSession,
  resetAppSession,
  saveCheckInEntry,
  updateContentFilterState,
} from './appSessionService'

function createDependencies(overrides: Partial<AppSessionDependencies> = {}): AppSessionDependencies {
  let profile: OnboardingData | null = null
  let checkIns: Awaited<ReturnType<typeof saveCheckInEntry>> = []
  let reminderIdentifier: string | null = null
  let storedFilter = { ...defaultContentFilterConfig }
  const status: ContentFilterStatus = {
    available: true,
    platformLabel: 'Android DNS content filter',
    vpnPermissionGranted: true,
    serviceRunning: true,
    safeSearch: storedFilter.safeSearch,
    strictMode: storedFilter.strictMode,
    blockedCategories: storedFilter.blockedCategories,
    blockedRequestCount: 3,
    lastBlockedDomain: 'example.com',
  }

  return {
    profileRepository: {
      async load() {
        return profile
      },
      async save(data) {
        profile = data
      },
      async clear() {
        profile = null
      },
    },
    checkInRepository: {
      async load() {
        return checkIns
      },
      async save(entries) {
        checkIns = entries
      },
      async clear() {
        checkIns = []
      },
    },
    contentFilterRepository: {
      async load() {
        return storedFilter
      },
      async save(config) {
        storedFilter = config
      },
      async clear() {
        storedFilter = { ...defaultContentFilterConfig }
      },
    },
    reminderRepository: {
      async loadIdentifier() {
        return reminderIdentifier
      },
      async saveIdentifier(identifier) {
        reminderIdentifier = identifier
      },
      async clear() {
        reminderIdentifier = null
      },
    },
    contentFilterBridge: {
      async syncConfig(config) {
        storedFilter = config
      },
      async refreshStatus(config) {
        return {
          ...status,
          safeSearch: config.safeSearch,
          strictMode: config.strictMode,
          blockedCategories: config.blockedCategories,
        }
      },
      async start() {
        return { kind: 'started' as const }
      },
      async stop() {
        return { kind: 'stopped' as const }
      },
      openSettings() {},
    },
    async clearStorage() {
      profile = null
      checkIns = []
      reminderIdentifier = null
      storedFilter = { ...defaultContentFilterConfig }
    },
    async scheduleReminder(time) {
      return {
        identifier: `reminder-${time}`,
        result: { status: 'Scheduled' as const },
      }
    },
    async cancelReminder() {
      reminderIdentifier = null
    },
    ...overrides,
  }
}

describe('appSessionService', () => {
  test('loadAppSession hydrates defaults and content filter state', async () => {
    const deps = createDependencies()

    const state = await loadAppSession(deps)

    expect(state.data).toEqual(defaultOnboardingData)
    expect(state.done).toBe(false)
    expect(state.reminderStatus).toBe('Not enabled')
    expect(state.contentFilterConfig).toEqual(defaultContentFilterConfig)
    expect(state.contentFilterStatus.serviceRunning).toBe(true)
  })

  test('completeOnboarding persists the profile and schedules the reminder', async () => {
    const deps = createDependencies()
    const profile: OnboardingData = {
      ...defaultOnboardingData,
      primaryGoal: 'Reduce doom scrolling',
      motivation: 'Sleep better',
      accountabilityContact: 'Sam',
    }

    const result = await completeOnboarding(deps, profile)
    const reloaded = await loadAppSession(deps)

    expect(result).toEqual({
      done: true,
      reminderStatus: 'Scheduled',
    })
    expect(reloaded.data).toEqual(profile)
    expect(reloaded.done).toBe(true)
    expect(reloaded.reminderStatus).toBe('Scheduled')
  })

  test('saveCheckInEntry prepends the latest entry and caps history at 20', async () => {
    const deps = createDependencies()
    const existing = Array.from({ length: 20 }, (_, index) => ({
      id: `${index}`,
      createdAt: new Date(2025, 0, index + 1).toISOString(),
      mood: 'Calm',
      urgeLevel: 3,
      trigger: 'Late night',
      outcome: 'No slip' as const,
      notes: '',
    }))

    const next = await saveCheckInEntry(
      deps,
      existing,
      {
        mood: 'Stressed',
        urgeLevel: 8,
        trigger: 'When alone',
        outcome: 'Slip',
        notes: 'Opened reels',
      },
      new Date('2026-01-05T10:15:00.000Z'),
    )

    expect(next).toHaveLength(20)
    expect(next[0]).toEqual(
      expect.objectContaining({
        id: '1767608100000',
        mood: 'Stressed',
        outcome: 'Slip',
      }),
    )
  })

  test('enableDailyReminderForTime returns the scheduler result', async () => {
    const deps = createDependencies()

    await completeOnboarding(deps, {
      ...defaultOnboardingData,
      primaryGoal: 'Reduce porn use',
      motivation: 'Protect focus',
      accountabilityContact: 'Sam',
    })

    const result = await enableDailyReminderForTime(deps, '22:00')

    expect(result).toBe('Scheduled')
  })

  test('updateContentFilterState stores and returns the refreshed native status', async () => {
    const deps = createDependencies()
    const nextConfig = {
      enabled: true,
      safeSearch: false,
      strictMode: false,
      blockedCategories: ['Adult content', 'Gambling'],
    }

    const nextState = await updateContentFilterState(deps, nextConfig)

    expect(nextState.contentFilterConfig).toEqual(nextConfig)
    expect(nextState.contentFilterStatus.blockedCategories).toEqual(['Adult content', 'Gambling'])
    expect(nextState.contentFilterStatus.safeSearch).toBe(false)
  })

  test('resetAppSession clears persisted state and returns defaults', async () => {
    const deps = createDependencies()

    await completeOnboarding(deps, {
      ...defaultOnboardingData,
      primaryGoal: 'Reduce porn use',
      motivation: 'Protect focus',
      accountabilityContact: 'Sam',
    })

    const resetState = await resetAppSession(deps)

    expect(resetState.data).toEqual(defaultOnboardingData)
    expect(resetState.done).toBe(false)
    expect(resetState.checkIns).toEqual([])
    expect(resetState.reminderStatus).toBe('Not enabled')
    expect(resetState.contentFilterConfig).toEqual(defaultContentFilterConfig)
  })
})
