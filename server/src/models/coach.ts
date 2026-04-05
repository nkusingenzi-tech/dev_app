export type CoachProfile = {
  primaryGoal: string
  motivation: string
  triggerTime: string
  riskyApps: string
  accountabilityContact: string
  reminderTime: string
}

export type CoachTextRequest = {
  message?: unknown
  profile?: unknown
}

export type CoachTextInput = {
  message: string
  profile: CoachProfile
}

export type CoachTextResponse = {
  reply: string
}

export const emptyCoachProfile: CoachProfile = {
  primaryGoal: '',
  motivation: '',
  triggerTime: '',
  riskyApps: '',
  accountabilityContact: '',
  reminderTime: '',
}
