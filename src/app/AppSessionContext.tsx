import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Alert, AppState } from 'react-native'
import * as Notifications from 'expo-notifications'

import { defaultContentFilterConfig, defaultOnboardingData } from '../domain/constants'
import type {
  CheckInEntry,
  ContentFilterConfig,
  ContentFilterStatus,
  OnboardingData,
  ReminderStatus,
} from '../domain/models'
import {
  completeOnboarding,
  createDefaultSessionDependencies,
  enableDailyReminderForTime,
  loadAppSession,
  refreshContentFilterState,
  resetAppSession,
  saveCheckInEntry,
  updateContentFilterState,
} from './services/appSessionService'
import { parseRiskyApps } from './services/appHelpers'
import { createContentFilterBridge, getDefaultContentFilterStatus } from '../features/content-filter/service'
import {
  createCheckInRepository,
  createContentFilterRepository,
  createProfileRepository,
  createReminderRepository,
} from '../features/storage/repositories'
import { scheduleDailyReminder } from '../features/reminders/reminderService'

type AppSessionContextValue = {
  loading: boolean
  done: boolean
  data: OnboardingData
  checkIns: CheckInEntry[]
  reminderStatus: ReminderStatus
  contentFilterConfig: ContentFilterConfig
  contentFilterStatus: ContentFilterStatus
  updateField: <Key extends keyof OnboardingData>(key: Key, value: OnboardingData[Key]) => void
  toggleRiskyApp: (app: string) => void
  completeOnboarding: () => Promise<void>
  resetApp: () => Promise<void>
  saveCheckIn: (entry: Omit<CheckInEntry, 'id' | 'createdAt'>) => Promise<void>
  enableReminder: (time?: string) => Promise<void>
  updateContentFilterConfig: (next: ContentFilterConfig) => Promise<void>
  refreshContentFilterStatus: () => Promise<void>
  startNativeContentFilter: () => Promise<void>
  stopNativeContentFilter: () => Promise<void>
  openNativeContentFilterSettings: () => void
}

const AppSessionContext = createContext<AppSessionContextValue | null>(null)

export function AppSessionProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState(false)
  const [data, setData] = useState<OnboardingData>(defaultOnboardingData)
  const [checkIns, setCheckIns] = useState<CheckInEntry[]>([])
  const [reminderStatus, setReminderStatus] = useState<ReminderStatus>('Not enabled')
  const [contentFilterConfig, setContentFilterConfig] = useState<ContentFilterConfig>(
    defaultContentFilterConfig,
  )
  const [contentFilterStatus, setContentFilterStatus] = useState<ContentFilterStatus>(
    getDefaultContentFilterStatus(),
  )

  const dependencies = useMemo(
    () =>
      createDefaultSessionDependencies({
        profileRepository: createProfileRepository(),
        checkInRepository: createCheckInRepository(),
        contentFilterRepository: createContentFilterRepository(),
        reminderRepository: createReminderRepository(),
        contentFilterBridge: createContentFilterBridge(),
        scheduleReminder: (time, existingIdentifier) =>
          scheduleDailyReminder({ time, existingIdentifier }),
        cancelReminder: (identifier) => Notifications.cancelScheduledNotificationAsync(identifier),
      }),
    [],
  )

  useEffect(() => {
    void bootstrap()
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

  async function bootstrap() {
    setLoading(true)

    try {
      const state = await loadAppSession(dependencies)
      setData(state.data)
      setDone(state.done)
      setCheckIns(state.checkIns)
      setReminderStatus(state.reminderStatus)
      setContentFilterConfig(state.contentFilterConfig)
      setContentFilterStatus(state.contentFilterStatus)
    } catch (error) {
      console.error(error)
      Alert.alert(
        'Startup issue',
        'The app could not load saved data cleanly. Default local state will be used for now.',
      )
      setData(defaultOnboardingData)
      setDone(false)
      setCheckIns([])
      setReminderStatus('Not enabled')
      setContentFilterConfig(defaultContentFilterConfig)
      setContentFilterStatus(getDefaultContentFilterStatus())
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

  async function completeOnboardingFlow() {
    const result = await completeOnboarding(dependencies, data)
    setDone(result.done)
    setReminderStatus(result.reminderStatus)
  }

  async function resetAppFlow() {
    const nextState = await resetAppSession(dependencies)
    setData(nextState.data)
    setDone(nextState.done)
    setCheckIns(nextState.checkIns)
    setReminderStatus(nextState.reminderStatus)
    setContentFilterConfig(nextState.contentFilterConfig)
    setContentFilterStatus(nextState.contentFilterStatus)
  }

  async function saveCheckInFlow(entry: Omit<CheckInEntry, 'id' | 'createdAt'>) {
    const nextEntries = await saveCheckInEntry(dependencies, checkIns, entry)
    setCheckIns(nextEntries)
  }

  async function enableReminderFlow(time = data.reminderTime) {
    const nextStatus = await enableDailyReminderForTime(dependencies, time)
    setReminderStatus(nextStatus)
  }

  async function updateContentFilterConfigFlow(next: ContentFilterConfig) {
    const nextState = await updateContentFilterState(dependencies, next)
    setContentFilterConfig(nextState.contentFilterConfig)
    setContentFilterStatus(nextState.contentFilterStatus)
  }

  async function refreshContentFilterStatus() {
    const nextStatus = await refreshContentFilterState(dependencies, contentFilterConfig)
    setContentFilterStatus(nextStatus)
  }

  async function startNativeContentFilter() {
    const result = await dependencies.contentFilterBridge.start()

    if (result.kind === 'unavailable') {
      Alert.alert(
        'Filter unavailable',
        'This build does not include the native Android content filter. Install the latest development build to use these controls.',
      )
    }

    if (result.kind === 'permission_requested') {
      Alert.alert(
        'VPN permission required',
        'Android will show a VPN permission prompt. Accept it to enable the whole-phone content filter.',
      )
    }

    await refreshContentFilterStatus()
  }

  async function stopNativeContentFilter() {
    const result = await dependencies.contentFilterBridge.stop()
    if (result.kind === 'unavailable') {
      Alert.alert(
        'Filter unavailable',
        'This build does not include the native Android content filter. Install the latest development build to use these controls.',
      )
      return
    }

    await refreshContentFilterStatus()
  }

  function openNativeContentFilterSettings() {
    dependencies.contentFilterBridge.openSettings()
  }

  const value = useMemo<AppSessionContextValue>(
    () => ({
      loading,
      done,
      data,
      checkIns,
      reminderStatus,
      contentFilterConfig,
      contentFilterStatus,
      updateField,
      toggleRiskyApp,
      completeOnboarding: completeOnboardingFlow,
      resetApp: resetAppFlow,
      saveCheckIn: saveCheckInFlow,
      enableReminder: enableReminderFlow,
      updateContentFilterConfig: updateContentFilterConfigFlow,
      refreshContentFilterStatus,
      startNativeContentFilter,
      stopNativeContentFilter,
      openNativeContentFilterSettings,
    }),
    [
      loading,
      done,
      data,
      checkIns,
      reminderStatus,
      contentFilterConfig,
      contentFilterStatus,
    ],
  )

  return <AppSessionContext.Provider value={value}>{children}</AppSessionContext.Provider>
}

export function useAppSession() {
  const value = useContext(AppSessionContext)
  if (!value) {
    throw new Error('useAppSession must be used within AppSessionProvider')
  }

  return value
}
