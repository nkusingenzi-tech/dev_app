import { useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Pressable, Text, TextInput, View } from 'react-native'

import { appStyles } from '../../theme/styles'
import { EmptyStateCard, NavigationCard, ScreenShell, SectionCard } from '../../ui/components'
import { useCoachSession } from './context'
import type { CoachStackParamList } from '../../navigation/types'

function ConversationFeed() {
  const { messages, isCoachLoading } = useCoachSession()

  return (
    <View style={appStyles.stack}>
      {messages.map((message) => (
        <View
          key={message.id}
          style={[
            appStyles.chatBubble,
            message.role === 'coach' ? appStyles.chatBubbleCoach : appStyles.chatBubbleUser,
          ]}
        >
          <Text style={appStyles.microLabel}>{message.role === 'coach' ? 'Coach' : 'You'}</Text>
          <Text style={appStyles.bodyText}>{message.text}</Text>
        </View>
      ))}
      {isCoachLoading ? (
        <View style={[appStyles.chatBubble, appStyles.chatBubbleCoach]}>
          <Text style={appStyles.microLabel}>Coach</Text>
          <Text style={appStyles.bodyText}>Thinking...</Text>
        </View>
      ) : null}
    </View>
  )
}

export function CoachHubScreen({
  navigation,
}: NativeStackScreenProps<CoachStackParamList, 'CoachHub'>) {
  const { isBackendConfigured } = useCoachSession()

  return (
    <ScreenShell subtitle="Coach" title="steady.path">
      <View style={appStyles.heroPanel}>
        <Text style={appStyles.eyebrow}>AI coach</Text>
        <Text style={appStyles.heroTitle}>Text and voice support.</Text>
        <Text style={appStyles.heroText}>
          The coach has been split into dedicated text and voice surfaces instead of one mixed page.
        </Text>
      </View>

      <SectionCard eyebrow="Modes" title="Coach surfaces">
        <NavigationCard
          eyebrow="Text"
          title="Text coach"
          body="Open the text conversation surface with its own composer."
          actionLabel="Open text coach"
          onPress={() => navigation.navigate('TextCoach')}
        />
        <NavigationCard
          eyebrow="Voice"
          title="Voice coach"
          body="Open microphone capture, transcription, and realtime controls on a separate screen."
          actionLabel="Open voice coach"
          onPress={() => navigation.navigate('VoiceCoach')}
        />
      </SectionCard>

      <SectionCard eyebrow="Backend" title="Integration note">
        <EmptyStateCard
          title={isBackendConfigured ? 'Backend AI is configured.' : 'Backend AI is not configured.'}
          body={
            isBackendConfigured
              ? 'Text responses should come from the backend coach endpoint. Voice can use transcription or the WebRTC Realtime path in a development build.'
              : 'The text coach currently falls back to local recovery replies. To get backend AI, run the server and set EXPO_PUBLIC_COACH_API_URL plus OPENAI_API_KEY.'
          }
        />
      </SectionCard>
    </ScreenShell>
  )
}

export function TextCoachScreen() {
  const { sendMessage } = useCoachSession()
  const [draft, setDraft] = useState('')

  return (
    <ScreenShell subtitle="Text coach" title="steady.path">
      <SectionCard eyebrow="Conversation" title="Coach session">
        <ConversationFeed />
      </SectionCard>

      <SectionCard eyebrow="Message" title="Text coach">
        <TextInput
          style={[appStyles.input, appStyles.textArea]}
          value={draft}
          placeholder="Type what is happening right now..."
          placeholderTextColor="#8a98a4"
          multiline
          onChangeText={setDraft}
        />
        <View style={appStyles.buttonRow}>
          <Pressable
            style={[appStyles.button, appStyles.primaryButton]}
            onPress={() => {
              void sendMessage(draft)
              setDraft('')
            }}
          >
            <Text style={appStyles.primaryButtonLabel}>Send</Text>
          </Pressable>
        </View>
      </SectionCard>
    </ScreenShell>
  )
}

export function VoiceCoachScreen() {
  const {
    voiceTranscript,
    setVoiceTranscript,
    sendMessage,
    isRecording,
    realtimeStatus,
    startVoiceRecording,
    stopVoiceRecording,
    initializeRealtimeVoice,
    disconnectRealtimeVoice,
    teardownVoiceSession,
  } = useCoachSession()

  useFocusEffect(() => {
    return () => {
      void teardownVoiceSession()
    }
  })

  return (
    <ScreenShell subtitle="Voice coach" title="steady.path">
      <SectionCard eyebrow="Conversation" title="Coach session">
        <ConversationFeed />
      </SectionCard>

      <SectionCard eyebrow="Speech path" title="Voice coach">
        <View style={appStyles.focusTimerCard}>
          <Text style={appStyles.microLabel}>Voice session</Text>
          <Text style={appStyles.goalText}>Microphone capture enabled</Text>
          <Text style={appStyles.bodyText}>
            Record audio, send it to the backend transcription endpoint, then route the transcript through the coach.
          </Text>
        </View>
        <View style={appStyles.focusTimerCard}>
          <Text style={appStyles.microLabel}>Realtime voice beta</Text>
          <Text style={appStyles.goalText}>{realtimeStatus}</Text>
          <Text style={appStyles.bodyText}>
            This path requires a development build. Expo Go cannot load the native WebRTC module.
          </Text>
        </View>
        <View style={appStyles.buttonRow}>
          <Pressable
            style={[appStyles.button, appStyles.secondaryButton]}
            onPress={() => void initializeRealtimeVoice()}
          >
            <Text style={appStyles.secondaryButtonLabel}>Connect realtime</Text>
          </Pressable>
          <Pressable
            style={[appStyles.button, appStyles.secondaryButton]}
            onPress={() => void disconnectRealtimeVoice()}
          >
            <Text style={appStyles.secondaryButtonLabel}>Disconnect</Text>
          </Pressable>
          {!isRecording ? (
            <Pressable
              style={[appStyles.button, appStyles.primaryButton]}
              onPress={() => void startVoiceRecording()}
            >
              <Text style={appStyles.primaryButtonLabel}>Start recording</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[appStyles.button, appStyles.primaryButton]}
              onPress={() => void stopVoiceRecording()}
            >
              <Text style={appStyles.primaryButtonLabel}>Stop and transcribe</Text>
            </Pressable>
          )}
        </View>
        <TextInput
          style={[appStyles.input, appStyles.textArea]}
          value={voiceTranscript}
          placeholder="Review or edit the captured transcript before sending it."
          placeholderTextColor="#8a98a4"
          multiline
          onChangeText={setVoiceTranscript}
        />
        <View style={appStyles.buttonRow}>
          <Pressable
            style={[appStyles.button, appStyles.primaryButton]}
            onPress={() =>
              void sendMessage(voiceTranscript, {
                speakReply: true,
                clearVoiceTranscript: true,
              })
            }
          >
            <Text style={appStyles.primaryButtonLabel}>Send transcript</Text>
          </Pressable>
        </View>
      </SectionCard>
    </ScreenShell>
  )
}
