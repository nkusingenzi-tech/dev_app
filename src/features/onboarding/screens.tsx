import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Pressable, Text, TextInput, View } from 'react-native'

import { reminderTimeOptions, riskyAppOptions, triggerTimeOptions } from '../../domain/constants'
import { appStyles } from '../../theme/styles'
import { ChipGrid, FieldLabel, OptionGroup, ScreenShell, SectionCard, SummaryCard } from '../../ui/components'
import { useAppSession } from '../../app/AppSessionContext'
import { parseRiskyApps } from '../../app/services/appHelpers'
import type { OnboardingStackParamList } from '../../navigation/types'

function OnboardingLayout({
  step,
  title,
  detail,
  children,
}: {
  step: number
  title: string
  detail: string
  children: React.ReactNode
}) {
  return (
    <ScreenShell subtitle="Onboarding" title="steady.path">
      <View style={appStyles.heroPanel}>
        <Text style={appStyles.eyebrow}>Step {step} of 5</Text>
        <Text style={appStyles.heroTitle}>{title}</Text>
        <Text style={appStyles.heroText}>{detail}</Text>
      </View>
      <View style={appStyles.progressRow}>
        {[1, 2, 3, 4, 5].map((progressStep) => (
          <View
            key={`onboarding-progress-${progressStep}`}
            style={[
              appStyles.progressDot,
              progressStep <= step ? appStyles.progressDotActive : null,
            ]}
          />
        ))}
      </View>
      {children}
    </ScreenShell>
  )
}

export function GoalSetupScreen({
  navigation,
}: NativeStackScreenProps<OnboardingStackParamList, 'GoalSetup'>) {
  const { data, updateField } = useAppSession()
  const valid = data.primaryGoal.trim().length > 5 && data.motivation.trim().length > 5

  return (
    <OnboardingLayout
      step={1}
      title="Define the main goal"
      detail="Start with the behavior you want to change first."
    >
      <SectionCard eyebrow="Goal" title="Recovery target">
        <FieldLabel label="Primary goal" />
        <TextInput
          style={appStyles.input}
          value={data.primaryGoal}
          placeholder="Example: Reduce late-night porn use"
          placeholderTextColor="#8a98a4"
          onChangeText={(value) => updateField('primaryGoal', value)}
        />
        <FieldLabel label="Why this matters" />
        <TextInput
          style={[appStyles.input, appStyles.textArea]}
          value={data.motivation}
          placeholder="Example: Better focus, less shame, better sleep"
          placeholderTextColor="#8a98a4"
          multiline
          onChangeText={(value) => updateField('motivation', value)}
        />
        <View style={appStyles.buttonRow}>
          <Pressable
            style={[appStyles.button, valid ? appStyles.primaryButton : appStyles.disabledButton]}
            disabled={!valid}
            onPress={() => navigation.navigate('TriggerSetup')}
          >
            <Text style={appStyles.primaryButtonLabel}>Next</Text>
          </Pressable>
        </View>
      </SectionCard>
    </OnboardingLayout>
  )
}

export function TriggerSetupScreen({
  navigation,
}: NativeStackScreenProps<OnboardingStackParamList, 'TriggerSetup'>) {
  const { data, updateField } = useAppSession()

  return (
    <OnboardingLayout
      step={2}
      title="Identify the riskiest time"
      detail="Choose the pattern that needs the strongest protection."
    >
      <SectionCard eyebrow="Pattern" title="High-risk window">
        <FieldLabel label="High-risk time" />
        <OptionGroup
          options={triggerTimeOptions}
          value={data.triggerTime}
          onSelect={(value) => updateField('triggerTime', value)}
        />
        <View style={appStyles.buttonRow}>
          <Pressable
            style={[appStyles.button, appStyles.secondaryButton]}
            onPress={() => navigation.goBack()}
          >
            <Text style={appStyles.secondaryButtonLabel}>Back</Text>
          </Pressable>
          <Pressable
            style={[appStyles.button, appStyles.primaryButton]}
            onPress={() => navigation.navigate('RiskAppsSetup')}
          >
            <Text style={appStyles.primaryButtonLabel}>Next</Text>
          </Pressable>
        </View>
      </SectionCard>
    </OnboardingLayout>
  )
}

export function RiskAppsSetupScreen({
  navigation,
}: NativeStackScreenProps<OnboardingStackParamList, 'RiskAppsSetup'>) {
  const { data, toggleRiskyApp } = useAppSession()
  const selectedApps = parseRiskyApps(data.riskyApps)
  const valid = selectedApps.length > 0

  return (
    <OnboardingLayout
      step={3}
      title="Choose risky apps and sites"
      detail="Pick the apps that most often lead into the loop."
    >
      <SectionCard eyebrow="Triggers" title="Likely trigger apps">
        <FieldLabel label="Likely trigger apps" />
        <ChipGrid options={riskyAppOptions} selected={selectedApps} onToggle={toggleRiskyApp} />
        <View style={appStyles.buttonRow}>
          <Pressable
            style={[appStyles.button, appStyles.secondaryButton]}
            onPress={() => navigation.goBack()}
          >
            <Text style={appStyles.secondaryButtonLabel}>Back</Text>
          </Pressable>
          <Pressable
            style={[appStyles.button, valid ? appStyles.primaryButton : appStyles.disabledButton]}
            disabled={!valid}
            onPress={() => navigation.navigate('SupportSetup')}
          >
            <Text style={appStyles.primaryButtonLabel}>Next</Text>
          </Pressable>
        </View>
      </SectionCard>
    </OnboardingLayout>
  )
}

export function SupportSetupScreen({
  navigation,
}: NativeStackScreenProps<OnboardingStackParamList, 'SupportSetup'>) {
  const { data, updateField } = useAppSession()
  const valid = data.accountabilityContact.trim().length > 1 && data.reminderTime.length > 0

  return (
    <OnboardingLayout
      step={4}
      title="Set support and reminders"
      detail="Finish the plan with one person and one check-in time."
    >
      <SectionCard eyebrow="Support" title="Accountability setup">
        <FieldLabel label="Accountability contact" />
        <TextInput
          style={appStyles.input}
          value={data.accountabilityContact}
          placeholder="Example: Sam - brother"
          placeholderTextColor="#8a98a4"
          onChangeText={(value) => updateField('accountabilityContact', value)}
        />
        <FieldLabel label="Nightly check-in reminder" />
        <OptionGroup
          options={reminderTimeOptions}
          value={data.reminderTime}
          onSelect={(value) => updateField('reminderTime', value)}
        />
        <View style={appStyles.buttonRow}>
          <Pressable
            style={[appStyles.button, appStyles.secondaryButton]}
            onPress={() => navigation.goBack()}
          >
            <Text style={appStyles.secondaryButtonLabel}>Back</Text>
          </Pressable>
          <Pressable
            style={[appStyles.button, valid ? appStyles.primaryButton : appStyles.disabledButton]}
            disabled={!valid}
            onPress={() => navigation.navigate('OnboardingReview')}
          >
            <Text style={appStyles.primaryButtonLabel}>Review plan</Text>
          </Pressable>
        </View>
      </SectionCard>
    </OnboardingLayout>
  )
}

export function OnboardingReviewScreen({
  navigation,
}: NativeStackScreenProps<OnboardingStackParamList, 'OnboardingReview'>) {
  const { data, completeOnboarding } = useAppSession()

  return (
    <OnboardingLayout
      step={5}
      title="Review the plan"
      detail="Save the current setup and move into the daily app flow."
    >
      <SectionCard eyebrow="Summary" title="Current recovery plan">
        <View style={appStyles.stack}>
          <SummaryCard label="Main goal" value={data.primaryGoal} highlighted />
          <SummaryCard label="Why it matters" value={data.motivation} />
          <SummaryCard label="High-risk time" value={data.triggerTime} />
          <SummaryCard label="Risky apps" value={data.riskyApps || 'None selected'} />
          <SummaryCard label="Contact" value={data.accountabilityContact} />
          <SummaryCard label="Reminder" value={data.reminderTime} />
        </View>
        <View style={appStyles.buttonRow}>
          <Pressable
            style={[appStyles.button, appStyles.secondaryButton]}
            onPress={() => navigation.goBack()}
          >
            <Text style={appStyles.secondaryButtonLabel}>Back</Text>
          </Pressable>
          <Pressable
            style={[appStyles.button, appStyles.primaryButton]}
            onPress={() => void completeOnboarding()}
          >
            <Text style={appStyles.primaryButtonLabel}>Save plan</Text>
          </Pressable>
        </View>
      </SectionCard>
    </OnboardingLayout>
  )
}
