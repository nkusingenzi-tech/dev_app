import AsyncStorage from '@react-native-async-storage/async-storage'

import {
  CHECK_IN_STORAGE_KEY,
  CONTENT_FILTER_STORAGE_KEY,
  LEGACY_STORAGE_KEYS,
  REMINDER_ID_STORAGE_KEY,
  STORAGE_KEY,
} from '../../domain/constants'
import type { CheckInEntry, ContentFilterConfig, OnboardingData } from '../../domain/models'

export type KeyValueStore = {
  getItem: (key: string) => Promise<string | null>
  setItem: (key: string, value: string) => Promise<void>
  multiRemove: (keys: string[]) => Promise<void>
}

export type ProfileRepository = {
  load: () => Promise<OnboardingData | null>
  save: (data: OnboardingData) => Promise<void>
  clear: () => Promise<void>
}

export type CheckInRepository = {
  load: () => Promise<CheckInEntry[]>
  save: (entries: CheckInEntry[]) => Promise<void>
  clear: () => Promise<void>
}

export type ContentFilterRepository = {
  load: () => Promise<ContentFilterConfig | null>
  save: (config: ContentFilterConfig) => Promise<void>
  clear: () => Promise<void>
}

export type ReminderRepository = {
  loadIdentifier: () => Promise<string | null>
  saveIdentifier: (identifier: string) => Promise<void>
  clear: () => Promise<void>
}

function createJsonRepository<T>(store: KeyValueStore, key: string) {
  return {
    async load(): Promise<T | null> {
      const stored = await store.getItem(key)
      return stored ? (JSON.parse(stored) as T) : null
    },
    async save(value: T) {
      await store.setItem(key, JSON.stringify(value))
    },
    async clear() {
      await store.multiRemove([key])
    },
  }
}

export function createProfileRepository(store: KeyValueStore = AsyncStorage): ProfileRepository {
  return createJsonRepository<OnboardingData>(store, STORAGE_KEY)
}

export function createCheckInRepository(store: KeyValueStore = AsyncStorage): CheckInRepository {
  return {
    async load() {
      return (await createJsonRepository<CheckInEntry[]>(store, CHECK_IN_STORAGE_KEY).load()) ?? []
    },
    async save(entries) {
      await createJsonRepository<CheckInEntry[]>(store, CHECK_IN_STORAGE_KEY).save(entries)
    },
    async clear() {
      await createJsonRepository<CheckInEntry[]>(store, CHECK_IN_STORAGE_KEY).clear()
    },
  }
}

export function createContentFilterRepository(
  store: KeyValueStore = AsyncStorage,
): ContentFilterRepository {
  return createJsonRepository<ContentFilterConfig>(store, CONTENT_FILTER_STORAGE_KEY)
}

export function createReminderRepository(store: KeyValueStore = AsyncStorage): ReminderRepository {
  return {
    async loadIdentifier() {
      return store.getItem(REMINDER_ID_STORAGE_KEY)
    },
    async saveIdentifier(identifier) {
      await store.setItem(REMINDER_ID_STORAGE_KEY, identifier)
    },
    async clear() {
      await store.multiRemove([REMINDER_ID_STORAGE_KEY])
    },
  }
}

export async function clearAppStorage(store: KeyValueStore = AsyncStorage) {
  await store.multiRemove([
    STORAGE_KEY,
    CHECK_IN_STORAGE_KEY,
    REMINDER_ID_STORAGE_KEY,
    CONTENT_FILTER_STORAGE_KEY,
    ...LEGACY_STORAGE_KEYS,
  ])
}
