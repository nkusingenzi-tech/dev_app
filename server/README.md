# Freeman AI Backend

This server keeps the OpenRouter API key out of the mobile app and gives the
assistant a stable production endpoint.

## Required environment variables

```txt
OPENROUTER_API_KEY=sk-or-...
```

Optional:

```txt
MODEL_TIMEOUT_MS=9000
AI_OVERALL_TIMEOUT_MS=28000
MAX_REQUESTS_PER_MIN=20
OPENROUTER_MODELS=deepseek/deepseek-v4-flash:free,google/gemma-4-26b-a4b-it:free,openai/gpt-oss-20b:free
```

## Endpoints

```txt
GET /health
POST /api/chat
```

`GET /health` returns whether the backend has an OpenRouter key configured.

The mobile app expects:

```txt
https://freeman-ai-proxy.onrender.com/api/chat
```

If Render gives the service a different URL, update `FREEMAN_AI_PROXY_URL` in
`src/screens/AssistantScreen.tsx` and rebuild the APK.

## Production behavior

- Chat is limited to recovery support for porn/sexual-content addiction.
- "Gooning" is defined for the AI as masturbating with heavy porn consumption.
- Network failures and free-model timeouts retry the next model.
- If all providers are slow/down, the backend returns a short recovery-safe
  fallback instead of leaving the app with an empty response.
