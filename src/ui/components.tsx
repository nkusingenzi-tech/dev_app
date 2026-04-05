import type { ReactNode } from 'react'
import { useNavigation } from '@react-navigation/native'
import { Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native'

import { appStyles } from '../theme/styles'

type ScreenShellProps = {
  subtitle: string
  title: string
  children: ReactNode
}

export function ScreenShell({ subtitle, title, children }: ScreenShellProps) {
  return (
    <SafeAreaView style={appStyles.safeArea}>
      <ScrollView contentContainerStyle={appStyles.content} showsVerticalScrollIndicator={false}>
        <TopBar subtitle={subtitle} title={title} />
        {children}
      </ScrollView>
    </SafeAreaView>
  )
}

export function TopBar({ subtitle, title }: { subtitle: string; title: string }) {
  const navigation = useNavigation()
  const canGoBack = navigation.canGoBack()

  return (
    <View style={appStyles.topBar}>
      <View style={appStyles.topBarMeta}>
        {canGoBack ? (
          <Pressable style={appStyles.backButton} onPress={() => navigation.goBack()}>
            <Text style={appStyles.backButtonLabel}>Back</Text>
          </Pressable>
        ) : null}
        <View>
          <Text style={appStyles.topBarTitle}>{title}</Text>
          <Text style={appStyles.topBarSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <View style={appStyles.topBarBadge}>
        <Text style={appStyles.topBarBadgeText}>LIVE</Text>
      </View>
    </View>
  )
}

export function TabIcon({ label, color }: { label: string; color: string }) {
  return (
    <View style={appStyles.tabIcon}>
      <Text style={[appStyles.tabIconText, { color }]}>{label}</Text>
    </View>
  )
}

export function SectionCard({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children: ReactNode
}) {
  return (
    <View style={appStyles.card}>
      <Text style={appStyles.eyebrow}>{eyebrow}</Text>
      <Text style={appStyles.sectionTitle}>{title}</Text>
      <View style={appStyles.sectionContent}>{children}</View>
    </View>
  )
}

export function SummaryCard({
  label,
  value,
  highlighted = false,
}: {
  label: string
  value: string
  highlighted?: boolean
}) {
  return (
    <View style={[appStyles.goalCard, highlighted ? appStyles.goalCardActive : null]}>
      <Text style={appStyles.microLabel}>{label}</Text>
      <Text style={appStyles.goalText}>{value}</Text>
    </View>
  )
}

export function EmptyStateCard({ title, body }: { title: string; body: string }) {
  return (
    <View style={appStyles.goalCard}>
      <Text style={appStyles.goalText}>{title}</Text>
      <Text style={appStyles.bodyText}>{body}</Text>
    </View>
  )
}

export function FieldLabel({ label }: { label: string }) {
  return <Text style={appStyles.fieldLabel}>{label}</Text>
}

export function StoryChip({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <View style={appStyles.storyChip}>
      <View style={[appStyles.storyAvatar, active ? appStyles.storyAvatarActive : null]}>
        <Text style={appStyles.storyAvatarText}>{label.slice(0, 1).toUpperCase()}</Text>
      </View>
      <Text style={appStyles.storyChipLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

export function OptionGroup({
  options,
  value,
  onSelect,
}: {
  options: string[]
  value: string
  onSelect: (value: string) => void
}) {
  return (
    <View style={appStyles.optionGroup}>
      {options.map((option) => (
        <Pressable
          key={option}
          style={[appStyles.optionCard, option === value ? appStyles.optionCardSelected : null]}
          onPress={() => onSelect(option)}
        >
          <Text style={[appStyles.optionLabel, option === value ? appStyles.optionLabelSelected : null]}>
            {option}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}

export function ChipGrid({
  options,
  selected,
  onToggle,
}: {
  options: string[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  return (
    <View style={appStyles.triggerWrap}>
      {options.map((option) => {
        const isSelected = selected.includes(option)
        return (
          <Pressable
            key={option}
            style={[appStyles.choiceChip, isSelected ? appStyles.choiceChipSelected : null]}
            onPress={() => onToggle(option)}
          >
            <Text style={[appStyles.choiceChipText, isSelected ? appStyles.choiceChipTextSelected : null]}>
              {option}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export function NavigationCard({
  eyebrow,
  title,
  body,
  actionLabel,
  onPress,
}: {
  eyebrow: string
  title: string
  body: string
  actionLabel: string
  onPress: () => void
}) {
  return (
    <View style={appStyles.navigationCard}>
      <Text style={appStyles.eyebrow}>{eyebrow}</Text>
      <Text style={appStyles.sectionTitle}>{title}</Text>
      <Text style={appStyles.bodyText}>{body}</Text>
      <Pressable style={[appStyles.button, appStyles.secondaryButton]} onPress={onPress}>
        <Text style={appStyles.secondaryButtonLabel}>{actionLabel}</Text>
      </Pressable>
    </View>
  )
}
