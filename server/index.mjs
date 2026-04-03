import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import OpenAI from 'openai'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const app = express()
const port = Number(process.env.PORT || 8787)
const apiKey = process.env.OPENAI_API_KEY

app.use(cors())
app.use(express.json())
app.use(express.raw({ type: 'audio/*', limit: '25mb' }))

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/coach/text', async (req, res) => {
  if (!apiKey) {
    res.status(500).json({
      error: 'OPENAI_API_KEY is not configured on the server.',
    })
    return
  }

  const { message, profile } = req.body ?? {}

  if (typeof message !== 'string' || !message.trim()) {
    res.status(400).json({ error: 'message is required' })
    return
  }

  const client = new OpenAI({ apiKey })

  try {
    const response = await client.responses.create({
      model: 'gpt-5',
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text:
                'You are a concise recovery coach for compulsive porn use and doom scrolling. ' +
                'Be supportive, practical, nonjudgmental, and action-focused. ' +
                'Do not claim to be a licensed therapist. ' +
                'If the user describes self-harm or immediate danger, tell them to contact local emergency services or a crisis line immediately.',
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: JSON.stringify({
                profile: {
                  primaryGoal: profile?.primaryGoal ?? '',
                  motivation: profile?.motivation ?? '',
                  triggerTime: profile?.triggerTime ?? '',
                  riskyApps: profile?.riskyApps ?? '',
                  accountabilityContact: profile?.accountabilityContact ?? '',
                  reminderTime: profile?.reminderTime ?? '',
                },
                message,
              }),
            },
          ],
        },
      ],
      text: {
        verbosity: 'low',
      },
    })

    res.json({
      reply: response.output_text?.trim() || 'No response generated.',
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: 'Failed to generate coach response.',
    })
  }
})

app.post('/api/coach/transcribe', async (req, res) => {
  if (!apiKey) {
    res.status(500).json({
      error: 'OPENAI_API_KEY is not configured on the server.',
    })
    return
  }

  let audioBuffer = null

  if (Buffer.isBuffer(req.body) && req.body.length > 0) {
    audioBuffer = req.body
  } else if (typeof req.body?.audioBase64 === 'string' && req.body.audioBase64.length > 0) {
    audioBuffer = Buffer.from(req.body.audioBase64, 'base64')
  }

  if (!audioBuffer || audioBuffer.length === 0) {
    res.status(400).json({ error: 'audio body is required' })
    return
  }

  const client = new OpenAI({ apiKey })
  const tempFilePath = path.join(os.tmpdir(), `steady-path-${Date.now()}.m4a`)

  try {
    fs.writeFileSync(tempFilePath, audioBuffer)

    const transcription = await client.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: 'gpt-4o-mini-transcribe',
    })

    res.json({
      text: transcription.text?.trim() || '',
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: 'Failed to transcribe audio.',
    })
  } finally {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath)
    }
  }
})

app.post('/api/coach/realtime/session', async (_req, res) => {
  if (!apiKey) {
    res.status(500).json({
      error: 'OPENAI_API_KEY is not configured on the server.',
    })
    return
  }

  try {
    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: 'gpt-realtime',
          instructions:
            'You are a concise recovery coach for compulsive porn use and doom scrolling. Be practical, supportive, and nonjudgmental. Do not claim to be a licensed therapist. If the user describes self-harm or immediate danger, tell them to contact local emergency services or a crisis line immediately.',
          audio: {
            input: {
              transcription: {
                model: 'gpt-4o-mini-transcribe',
              },
              turn_detection: {
                type: 'server_vad',
                create_response: true,
                interrupt_response: true,
                silence_duration_ms: 500,
              },
            },
            output: {
              voice: 'marin',
            },
          },
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      res.status(500).json({
        error: `Failed to create realtime session: ${errorText}`,
      })
      return
    }

    const payload = await response.json()
    res.json(payload)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: 'Failed to create realtime session.',
    })
  }
})

app.listen(port, () => {
  console.log(`Coach API listening on http://localhost:${port}`)
})
