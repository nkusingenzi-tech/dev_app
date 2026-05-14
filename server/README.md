# Freeman AI Proxy

This server keeps the OpenRouter API key out of the mobile app.

## Required environment variables

```txt
OPENROUTER_API_KEY=sk-or-...
```

Optional:

```txt
MODEL_TIMEOUT_MS=12000
OPENROUTER_MODELS=inclusionai/ring-2.6-1t:free,deepseek/deepseek-v4-flash:free
```

## Endpoints

```txt
GET /health
POST /api/chat
```

The mobile app expects:

```txt
https://freeman-ai-proxy.onrender.com/api/chat
```

If Render gives the service a different URL, update `FREEMAN_AI_PROXY_URL` in
`src/screens/AssistantScreen.tsx` and rebuild the APK.
