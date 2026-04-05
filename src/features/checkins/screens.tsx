import { useState } from 'react'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Pressable, Text, TextInput, View } from 'react-native'

import { useAppSession } from '../../app/AppSessionContext'
import { formatCheckInDate } from '../../app/services/appHelpers'
import { moodOptions, outcomeOptions, triggerTimeOptions } from '../../domain/constants'
import type { CheckInOutcome } from '../../domain/models'
import { appStyles } from '../../theme/styles'
import {
  ChipGrid,
  EmptyStateCard,
  FieldLabel,
  OptionGroup,
  ScreenShell,
  SectionCard,
  SummaryCard,
} from '../../ui/components'
import type { CheckInStackParamList } from '../../navigation/types'

export function NewCheckInScreen({
  navigation,
}: NativeStackScreenProps<CheckInStackParamList, 'NewCheckIn'>) {
  const { data, checkIns, saveCheckIn } = useAppSession()
  const [mood, setMood] = useState(moodOptions[0] ?? 'Calm')
  const [urgeLevel, setUrgeLevel] = useState(5)
  const [trigger, setTrigger] = useState(data.triggerTime)
  const [outcome, setOutcome] = useState<CheckInOutcome>('No slip')
  const [notes, setNotes] = useState('')

  async function submitCheckIn() {
    await saveCheckIn({ mood, urgeLevel, trigger, outcome, notes })
    setNotes('')
    setOutcome('No slip')
    setMood(moodOptions[0] ?? 'Calm')
    setUrgeLevel(5)
    setTrigger(data.triggerTime)
  }

  return (
    <ScreenShell subtitle="Check-in" title="steady.path">
      <View style={appStyles.heroPanel}>
        <Text style={appStyles.eyebrow}>Daily check-in</Text>
        <Text style={appStyles.heroTitle}>Interrupt the loop quickly.</Text>
        <Text style={appStyles.heroText}>
          Logging is now isolated from history so the capture flow stays focused.
        </Text>
      </View>

      <SectionCard eyebrow="Capture state" title="New check-in">
        <FieldLabel label="Mood" />
        <ChipGrid options={moodOptions} selected={[mood]} onToggle={setMood} />

        <FieldLabel label="Urge intensity" />
        <View style={appStyles.levelRow}>
          {Array.from({ length: 10 }, (_, index) => index + 1).map((level) => (
            <Pressable
              key={`urge-${level}`}
              style={[appStyles.levelChip, urgeLevel === level ? appStyles.levelChipActive : null]}
              onPress={() => setUrgeLevel(level)}
            >
              <Text
                style={[
                  appStyles.levelChipText,
                  urgeLevel === level ? appStyles.levelChipTextActive : null,
                ]}
              >
                {level}
              </Text>
            </Pressable>
          ))}
        </View>

        <FieldLabel label="Trigger" />
        <OptionGroup options={triggerTimeOptions} value={trigger} onSelect={setTrigger} />

        <FieldLabel label="Outcome" />
        <OptionGroup
          options={[...outcomeOptions]}
          value={outcome}
          onSelect={(value) => setOutcome(value as CheckInOutcome)}
        />

        <FieldLabel label="Notes" />
        <TextInput
          style={[appStyles.input, appStyles.textArea]}
          value={notes}
          placeholder="What happened right before the urge or slip?"
          placeholderTextColor="#8a98a4"
          multiline
          onChangeText={setNotes}
        />

        <View style={appStyles.buttonRow}>
          <Pressable style={[appStyles.button, appStyles.primaryButton]} onPress={() => void submitCheckIn()}>
            <Text style={appStyles.primaryButtonLabel}>Save check-in</Text>
          </Pressable>
          <Pressable
            style={[appStyles.button, appStyles.secondaryButton]}
            onPress={() => navigation.navigate('CheckInHistory')}
          >
            <Text style={appStyles.secondaryButtonLabel}>Open history</Text>
          </Pressable>
        </View>
      </SectionCard>

      <SectionCard eyebrow="Personalized context" title="Current support">
        <View style={appStyles.stack}>
          <SummaryCard label="High-risk time" value={data.triggerTime} highlighted />
          <SummaryCard label="Reminder" value={data.reminderTime} />
          <SummaryCard label="Contact" value={data.accountabilityContact} />
          <SummaryCard label="Saved entries" value={`${checkIns.length}`} />
        </View>
      </SectionCard>
    </ScreenShell>
  )
}

export function CheckInHistoryScreen() {
  const { checkIns } = useAppSession()

  return (
    <ScreenShell subtitle="History" title="steady.path">
      <View style={appStyles.heroPanel}>
        <Text style={appStyles.eyebrow}>Recovery log</Text>
        <Text style={appStyles.heroTitle}>Recent entries</Text>
        <Text style={appStyles.heroText}>
          Check-in history is isolated here so the logging screen stays fast and uncluttered.
        </Text>
      </View>

      <SectionCard eyebrow="History" title="Saved entries">
        <View style={appStyles.stack}>
          {checkIns.length === 0 ? (
            <EmptyStateCard
              title="No check-ins saved yet."
              body="Start with one entry to create a usable recovery log."
            />
          ) : (
            checkIns.map((entry) => (
              <View key={entry.id} style={appStyles.insightCard}>
                <Text style={appStyles.microLabel}>
                  {formatCheckInDate(entry.createdAt)} · {entry.outcome}
                </Text>
                <Text style={appStyles.goalText}>
                  {entry.mood} · urge {entry.urgeLevel}/10
                </Text>
                <Text style={appStyles.bodyText}>
                  Trigger: {entry.trigger}
                  {entry.notes ? `\n${entry.notes}` : ''}
                </Text>
              </View>
            ))
          )}
        </View>
      </SectionCard>
    </ScreenShell>
  )
}
