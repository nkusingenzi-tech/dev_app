import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Audio } from 'expo-av'
import * as Speech from 'expo-speech'

import type { CoachMessage, OnboardingData } from '../../domain/models'
import { createRealtimeSession, getCoachReply, isCoachBackendConfigured, transcribeAudio } from './service'

type CoachSessionContextValue = {
  messages: CoachMessage[]
  voiceTranscript: string
  isCoachLoading: boolean
  isRecording: boolean
  realtimeStatus: string
  isBackendConfigured: boolean
  setVoiceTranscript: (value: string) => void
  sendMessage: (
    text: string,
    options?: { speakReply?: boolean; clearVoiceTranscript?: boolean },
  ) => Promise<void>
  startVoiceRecording: () => Promise<void>
  stopVoiceRecording: () => Promise<void>
  initializeRealtimeVoice: () => Promise<void>
  disconnectRealtimeVoice: () => Promise<void>
  teardownVoiceSession: (options?: { clearTranscript?: boolean }) => Promise<void>
}

const CoachSessionContext = createContext<CoachSessionContextValue | null>(null)

export function CoachSessionProvider({
  data,
  children,
}: {
  data: OnboardingData
  children: ReactNode
}) {
  const [messages, setMessages] = useState<CoachMessage[]>([
    {
      id: 'coach-welcome',
      role: 'coach',
      text: `I can help with urge interruption, relapse recovery, and planning around ${data.triggerTime.toLowerCase()}.`,
    },
  ])
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [isCoachLoading, setIsCoachLoading] = useState(false)
  const [recording, setRecording] = useState<Audio.Recording | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [realtimeStatus, setRealtimeStatus] = useState('Not initialized')
  const recordingRef = useRef<Audio.Recording | null>(null)
  const peerConnectionRef = useRef<any>(null)
  const dataChannelRef = useRef<any>(null)
  const localStreamRef = useRef<any>(null)

  useEffect(() => {
    recordingRef.current = recording
  }, [recording])

  useEffect(() => {
    return () => {
      void teardownVoiceSession()
    }
  }, [])

  async function sendMessage(
    text: string,
    options?: { speakReply?: boolean; clearVoiceTranscript?: boolean },
  ) {
    const clean = text.trim()
    if (!clean) {
      return
    }

    setMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        text: clean,
      },
    ])
    setIsCoachLoading(true)

    try {
      const reply = await getCoachReply(clean, data)

      setMessages((current) => [
        ...current,
        {
          id: `coach-${Date.now() + 1}`,
          role: 'coach',
          text: reply,
        },
      ])

      if (options?.clearVoiceTranscript) {
        setVoiceTranscript('')
      }

      if (options?.speakReply) {
        Speech.stop()
        Speech.speak(reply)
      }
    } finally {
      setIsCoachLoading(false)
    }
  }

  async function startVoiceRecording() {
    if (recordingRef.current) {
      return
    }

    const permission = await Audio.requestPermissionsAsync()
    if (!permission.granted) {
      return
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    })

    const nextRecording = new Audio.Recording()
    await nextRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY)
    await nextRecording.startAsync()

    recordingRef.current = nextRecording
    setRecording(nextRecording)
    setIsRecording(true)
  }

  async function stopVoiceRecording() {
    const activeRecording = recordingRef.current
    if (!activeRecording) {
      return
    }

    try {
      setIsRecording(false)
      await activeRecording.stopAndUnloadAsync()
      const uri = activeRecording.getURI()

      recordingRef.current = null
      setRecording(null)

      if (!uri) {
        return
      }

      const transcript = await transcribeAudio(uri)
      if (!transcript) {
        return
      }

      setVoiceTranscript(transcript)
      await sendMessage(transcript, {
        speakReply: true,
        clearVoiceTranscript: true,
      })
    } catch {
      recordingRef.current = null
      setRecording(null)
      setIsRecording(false)
    }
  }

  async function closeRealtimeConnection(nextStatus: string) {
    dataChannelRef.current?.close()
    dataChannelRef.current = null

    peerConnectionRef.current?.close()
    peerConnectionRef.current = null

    localStreamRef.current?.getTracks().forEach((track: any) => {
      track.stop()
    })
    localStreamRef.current = null

    setRealtimeStatus(nextStatus)
  }

  async function initializeRealtimeVoice() {
    await disconnectRealtimeVoice()

    const sessionPayload = await createRealtimeSession()
    if (!sessionPayload) {
      setRealtimeStatus(
        isCoachBackendConfigured() ? 'Realtime session request failed' : 'Backend URL not configured',
      )
      return
    }

    const clientSecret = sessionPayload.client_secret?.value
    if (!clientSecret) {
      setRealtimeStatus('Realtime client secret missing')
      return
    }

    try {
      setRealtimeStatus('Requesting session token')

      // The native WebRTC module only exists in development builds, so keep the
      // module load inside the action instead of importing it at module scope.
      const { mediaDevices, RTCPeerConnection, RTCSessionDescription } = require('react-native-webrtc')
      const localStream = await mediaDevices.getUserMedia({
        audio: true,
        video: false,
      })

      localStreamRef.current = localStream

      const peerConnection = new RTCPeerConnection()
      peerConnectionRef.current = peerConnection

      localStream.getTracks().forEach((track: any) => {
        peerConnection.addTrack(track, localStream)
      })

      ;(peerConnection as any).onconnectionstatechange = () => {
        setRealtimeStatus(`Connection ${peerConnection.connectionState}`)
      }

      const dataChannel = peerConnection.createDataChannel('oai-events')
      dataChannelRef.current = dataChannel

      ;(dataChannel as any).onopen = () => {
        setRealtimeStatus('Realtime connected')
      }

      ;(dataChannel as any).onmessage = (event: { data?: string }) => {
        try {
          const payload = JSON.parse(String(event.data)) as {
            type?: string
            transcript?: string
            item?: { content?: Array<{ transcript?: string }> }
            response?: { output?: Array<{ content?: Array<{ transcript?: string; text?: string }> }> }
          }

          if (payload.type === 'conversation.item.input_audio_transcription.completed') {
            const transcript =
              payload.transcript ??
              payload.item?.content?.find((item) => item.transcript)?.transcript

            if (transcript) {
              setVoiceTranscript(transcript)
              setMessages((current) => [
                ...current,
                {
                  id: `user-rt-${Date.now()}`,
                  role: 'user',
                  text: transcript,
                },
              ])
            }
          }

          if (
            payload.type === 'response.output_text.done' ||
            payload.type === 'response.audio_transcript.done'
          ) {
            const transcript =
              payload.transcript ??
              payload.response?.output
                ?.flatMap((item) => item.content ?? [])
                .find((item) => item.transcript || item.text)?.transcript ??
              payload.response?.output
                ?.flatMap((item) => item.content ?? [])
                .find((item) => item.text)?.text

            if (transcript) {
              setMessages((current) => [
                ...current,
                {
                  id: `coach-rt-${Date.now()}`,
                  role: 'coach',
                  text: transcript,
                },
              ])
            }
          }
        } catch {
          // Ignore non-JSON or unsupported realtime events.
        }
      }

      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
      })
      await peerConnection.setLocalDescription(offer)

      const sdpResponse = await fetch('https://api.openai.com/v1/realtime?model=gpt-realtime', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${clientSecret}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp ?? '',
      })

      if (!sdpResponse.ok) {
        setRealtimeStatus('Realtime SDP negotiation failed')
        await disconnectRealtimeVoice()
        return
      }

      const answerSdp = await sdpResponse.text()
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription({
          type: 'answer',
          sdp: answerSdp,
        }),
      )
    } catch {
      setRealtimeStatus('Realtime session request failed')
      await disconnectRealtimeVoice()
    }
  }

  async function disconnectRealtimeVoice() {
    try {
      await closeRealtimeConnection('Disconnected')
    } catch {
      setRealtimeStatus('Disconnect failed')
    }
  }

  async function teardownVoiceSession(options?: { clearTranscript?: boolean }) {
    Speech.stop()

    const activeRecording = recordingRef.current
    if (activeRecording) {
      try {
        await activeRecording.stopAndUnloadAsync()
      } catch {
        // Ignore cleanup failures during screen or provider teardown.
      } finally {
        recordingRef.current = null
        setRecording(null)
        setIsRecording(false)
      }
    }

    try {
      await closeRealtimeConnection('Not initialized')
    } catch {
      setRealtimeStatus('Disconnect failed')
    }

    if (options?.clearTranscript) {
      setVoiceTranscript('')
    }
  }

  const value = useMemo<CoachSessionContextValue>(
    () => ({
      messages,
      voiceTranscript,
      isCoachLoading,
      isRecording,
      realtimeStatus,
      isBackendConfigured: isCoachBackendConfigured(),
      setVoiceTranscript,
      sendMessage,
      startVoiceRecording,
      stopVoiceRecording,
      initializeRealtimeVoice,
      disconnectRealtimeVoice,
      teardownVoiceSession,
    }),
    [messages, voiceTranscript, isCoachLoading, isRecording, realtimeStatus],
  )

  return <CoachSessionContext.Provider value={value}>{children}</CoachSessionContext.Provider>
}

export function useCoachSession() {
  const value = useContext(CoachSessionContext)
  if (!value) {
    throw new Error('useCoachSession must be used within CoachSessionProvider')
  }

  return value
}
