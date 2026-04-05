import { defaultContentFilterConfig, defaultOnboardingData } from '../../domain/constants'
import type {
  AppBootstrapState,
  CheckInEntry,
  ContentFilterConfig,
  ContentFilterStatus,
  OnboardingData,
  ReminderStatus,
} from '../../domain/models'
import type { ContentFilterBridge } from '../../features/content-filter/service'
import type {
  CheckInRepository,
  ContentFilterRepository,
  ProfileRepository,
  ReminderRepository,
} from '../../features/storage/repositories'
import { normalizeContentFilterConfig } from './appHelpers'

export type AppSessionDependencies = {
  profileRepository: ProfileRepository
  checkInRepository: CheckInRepository
  contentFilterRepository: ContentFilterRepository
  reminderRepository: ReminderRepository
  contentFilterBridge: ContentFilterBridge
  clearStorage: () => Promise<void>
  scheduleReminder: (
    time: string,
    existingIdentifier: string | null,
  ) => Promise<{ identifier?: string; result: { status: ReminderStatus } }>
  cancelReminder: (identifier: string) => Promise<void>
}

export function createDefaultSessionDependencies({
  profileRepository,
  checkInRepository,
  contentFilterRepository,
  reminderRepository,
  contentFilterBridge,
  scheduleReminder,
  cancelReminder,
}: Omit<AppSessionDependencies, 'clearStorage'>): AppSessionDependencies {
  return {
    profileRepository,
    checkInRepository,
    contentFilterRepository,
    reminderRepository,
    contentFilterBridge,
    scheduleReminder,
    cancelReminder,
    clearStorage: async () => {
      await Promise.all([
        profileRepository.clear(),
        checkInRepository.clear(),
        contentFilterRepository.clear(),
        reminderRepository.clear(),
      ])
    },
  }
}

export async function loadAppSession(
  deps: AppSessionDependencies,
): Promise<AppBootstrapState> {
  const [profile, checkIns, storedFilter, reminderIdentifier] = await Promise.all([
    deps.profileRepository.load(),
    deps.checkInRepository.load(),
    deps.contentFilterRepository.load(),
    deps.reminderRepository.loadIdentifier(),
  ])

  const contentFilterConfig = normalizeContentFilterConfig(storedFilter ?? defaultContentFilterConfig)
  await deps.contentFilterBridge.syncConfig(contentFilterConfig)
  const contentFilterStatus = await deps.contentFilterBridge.refreshStatus(contentFilterConfig)

  return {
    data: profile ?? defaultOnboardingData,
    done: profile !== null,
    checkIns,
    reminderStatus: reminderIdentifier ? 'Scheduled' : 'Not enabled',
    contentFilterConfig,
    contentFilterStatus,
  }
}

export async function completeOnboarding(
  deps: AppSessionDependencies,
  data: OnboardingData,
): Promise<{ done: true; reminderStatus: ReminderStatus }> {
  await deps.profileRepository.save(data)
  const existingIdentifier = await deps.reminderRepository.loadIdentifier()
  const scheduled = await deps.scheduleReminder(data.reminderTime, existingIdentifier)

  if (scheduled.identifier) {
    await deps.reminderRepository.saveIdentifier(scheduled.identifier)
  }

  return {
    done: true,
    reminderStatus: scheduled.result.status,
  }
}

export async function resetAppSession(
  deps: AppSessionDependencies,
): Promise<Pick<AppBootstrapState, 'data' | 'done' | 'checkIns' | 'reminderStatus' | 'contentFilterConfig' | 'contentFilterStatus'>> {
  const existingIdentifier = await deps.reminderRepository.loadIdentifier()
  if (existingIdentifier) {
    await deps.cancelReminder(existingIdentifier)
  }

  await deps.clearStorage()
  await deps.contentFilterBridge.syncConfig(defaultContentFilterConfig)
  const contentFilterStatus = await deps.contentFilterBridge.refreshStatus(defaultContentFilterConfig)

  return {
    data: defaultOnboardingData,
    done: false,
    checkIns: [],
    reminderStatus: 'Not enabled',
    contentFilterConfig: defaultContentFilterConfig,
    contentFilterStatus,
  }
}

export async function saveCheckInEntry(
  deps: AppSessionDependencies,
  currentEntries: CheckInEntry[],
  entry: Omit<CheckInEntry, 'id' | 'createdAt'>,
  now: Date = new Date(),
) {
  const nextEntry: CheckInEntry = {
    id: `${now.getTime()}`,
    createdAt: now.toISOString(),
    ...entry,
  }

  const nextEntries = [nextEntry, ...currentEntries].slice(0, 20)
  await deps.checkInRepository.save(nextEntries)
  return nextEntries
}

export async function enableDailyReminderForTime(
  deps: AppSessionDependencies,
  time: string,
) {
  const existingIdentifier = await deps.reminderRepository.loadIdentifier()
  const scheduled = await deps.scheduleReminder(time, existingIdentifier)

  if (scheduled.identifier) {
    await deps.reminderRepository.saveIdentifier(scheduled.identifier)
  }

  return scheduled.result.status
}

export async function updateContentFilterState(
  deps: AppSessionDependencies,
  next: ContentFilterConfig,
) {
  await deps.contentFilterRepository.save(next)
  await deps.contentFilterBridge.syncConfig(next)
  const contentFilterStatus = await deps.contentFilterBridge.refreshStatus(next)
  return {
    contentFilterConfig: next,
    contentFilterStatus,
  }
}

export async function refreshContentFilterState(
  deps: AppSessionDependencies,
  config: ContentFilterConfig,
): Promise<ContentFilterStatus> {
  return deps.contentFilterBridge.refreshStatus(config)
}
