import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

import type { DailyReminderScheduleResult, ReminderStatus } from '../../domain/models'

export type NotificationClient = {
  cancelScheduledNotificationAsync: (identifier: string) => Promise<void>
  getPermissionsAsync: () => Promise<{ status: string }>
  requestPermissionsAsync: () => Promise<{ status: string }>
  scheduleNotificationAsync: (
    request: Notifications.NotificationRequestInput,
  ) => Promise<string>
  setNotificationChannelAsync: (
    channelId: string,
    channel: Notifications.NotificationChannelInput,
  ) => Promise<Notifications.NotificationChannel | null>
}

export async function requestNotificationPermissions(
  notifications: NotificationClient = Notifications,
): Promise<boolean> {
  if (Platform.OS === 'android') {
    await notifications.setNotificationChannelAsync('daily-reminders', {
      name: 'Daily reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    })
  }

  if (!Device.isDevice) {
    return false
  }

  const current = await notifications.getPermissionsAsync()
  let finalStatus = current.status

  if (finalStatus !== 'granted') {
    const requested = await notifications.requestPermissionsAsync()
    finalStatus = requested.status
  }

  return finalStatus === 'granted'
}

export async function scheduleDailyReminder({
  time,
  existingIdentifier,
  notifications = Notifications,
}: {
  time: string
  existingIdentifier?: string | null
  notifications?: NotificationClient
}): Promise<{ identifier?: string; result: DailyReminderScheduleResult }> {
  const permitted = await requestNotificationPermissions(notifications)
  if (!permitted) {
    return { result: { status: 'Permission denied' } }
  }

  const [hourString, minuteString] = time.split(':')
  const hour = Number(hourString)
  const minute = Number(minuteString)

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return { result: { status: 'Permission denied' } }
  }

  if (existingIdentifier) {
    await notifications.cancelScheduledNotificationAsync(existingIdentifier)
  }

  const identifier = await notifications.scheduleNotificationAsync({
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

  return {
    identifier,
    result: { status: 'Scheduled' satisfies ReminderStatus },
  }
}
