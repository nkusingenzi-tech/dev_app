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
OPENROUTER_MODELS=openrouter/free,google/gemma-4-26b-a4b-it:free,openai/gpt-oss-20b:free
PRIVACY_CONTACT_EMAIL=support@freemanapp.online
```

## Endpoints

```txt
GET /health
HEAD /health
GET /privacy
HEAD /privacy
GET /terms
HEAD /terms
GET /delete-account
HEAD /delete-account
POST /delete-account
POST /api/chat
```

`GET /health` returns whether the backend has an OpenRouter key configured.

The mobile app expects:

```txt
https://www.freemanapp.online/api/chat
```

The Render subdomain can remain enabled as a fallback, but production app
builds should use the custom domain.

## Production behavior

- Chat is limited to recovery support for porn/sexual-content addiction.
- "Gooning" is defined for the AI as masturbating with heavy porn consumption.
- Network failures and free-model timeouts retry the next model.
- If all providers are slow/down, the backend returns a short recovery-safe
  fallback instead of leaving the app with an empty response.
