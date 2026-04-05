import { describe, expect, test } from 'bun:test'

import type { CheckInEntry } from '../../domain/models'
import { buildAnalytics, buildProgress, generateCoachReply, parseRiskyApps } from './appHelpers'

const sampleEntries: CheckInEntry[] = [
  {
    id: '3',
    createdAt: new Date().toISOString(),
    mood: 'Focused',
    urgeLevel: 2,
    trigger: 'Late night',
    outcome: 'No slip',
    notes: 'Walked away quickly',
  },
  {
    id: '2',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    mood: 'Stressed',
    urgeLevel: 6,
    trigger: 'When alone',
    outcome: 'No slip',
    notes: '',
  },
  {
    id: '1',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    mood: 'Stressed',
    urgeLevel: 8,
    trigger: 'During stress',
    outcome: 'Slip',
    notes: 'Opened reels',
  },
]

describe('appHelpers', () => {
  test('parseRiskyApps trims and removes empty items', () => {
    expect(parseRiskyApps(' Chrome, , Reddit ,TikTok  ,')).toEqual(['Chrome', 'Reddit', 'TikTok'])
  })

  test('buildProgress calculates streak and weekly metrics from recent entries', () => {
    expect(buildProgress(sampleEntries)).toEqual({
      currentNoSlipStreak: 2,
      bestNoSlipStreak: 2,
      checkInsThisWeek: 3,
      slipRatePercent: 33,
      lastSevenDayAverageUrge: 5,
    })
  })

  test('buildAnalytics groups moods and outcomes for charts', () => {
    const analytics = buildAnalytics(sampleEntries)

    expect(analytics.urgeLabels).toHaveLength(3)
    expect(analytics.urgeValues).toEqual([8, 6, 2])
    expect(analytics.moods).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Stressed', count: 2 }),
        expect.objectContaining({ name: 'Focused', count: 1 }),
      ]),
    )
    expect(analytics.slips).toEqual([
      { label: 'No slip', value: 2 },
      { label: 'Slip', value: 1 },
    ])
  })

  test('generateCoachReply keeps plan-specific guidance', () => {
    const reply = generateCoachReply('Need a plan for tonight', {
      primaryGoal: 'Reduce porn use',
      motivation: 'Better sleep',
      triggerTime: 'Late night',
      riskyApps: 'Chrome, Reddit',
      accountabilityContact: 'Sam',
      reminderTime: '21:30',
    })

    expect(reply).toContain('Chrome, Reddit')
    expect(reply).toContain('21:30')
    expect(reply).toContain('late night')
  })
})
