# Steady Path

Steady Path is a cross-platform Expo React Native MVP for a recovery-focused app that helps people reduce porn addiction patterns and compulsive screen use with supportive, non-shaming tools.

## Current MVP

The mobile foundation currently includes:

- A recovery-oriented home screen
- Goal-based onboarding cards
- Emergency urge tools
- A daily habit plan
- Trigger tracking
- Weekly progress insights
- A safety note for future clinical and privacy work

## Run locally

```bash
npm install
npm run start
```

## Development build workflow

This project is now set up to move beyond Expo Go for native-capable features such as notifications, the Android accessibility blocker, and WebRTC voice sessions.

```bash
npm run start:dev
npm run android:dev
npm run ios:dev
```

Notes:

- `npm run android:dev` now builds the native Android debug variant `com.steadypath.app.dev`
- Local Android builds require a working JDK and `JAVA_HOME`
- Expo Go is no longer the target path for the full app feature set

## EAS build profiles

Internal development build:

```bash
npm run build:android:dev
```

Internal preview APK:

```bash
npm run build:android:preview
```

Production Play Store AAB:

```bash
npm run build:android:prod
```

Production submission:

```bash
npm run submit:android:prod
```

`eas.json` now contains separate development, preview, and production profiles.

## Coach backend

The AI coach can use a local backend for real text responses.

1. Copy `.env.example` to `.env`
2. Set `OPENAI_API_KEY`
3. Set `EXPO_PUBLIC_COACH_API_URL` to your computer's local IP, for example `http://192.168.8.124:8787`
4. Run the backend:

```bash
npm run api
```

5. Run the app:

```bash
npm run start:dev
```

Without backend configuration, the coach falls back to local deterministic replies.

## Voice coach

Current voice coach path:

- microphone capture in the app
- backend transcription via OpenAI speech-to-text
- transcript routed through the coach flow
- spoken reply playback on device

Current realtime status:

- backend Realtime session creation is implemented
- mobile Realtime voice transport is implemented for development builds via WebRTC
- Expo Go is not sufficient for the Realtime voice path

## App locker groundwork

Current app-locker status:

- app-side configuration state exists
- Android native bridge exists
- Android accessibility service exists
- targeted apps are synced to Android package names
- the Plan screen can open Accessibility settings and refresh blocker status

Current native enforcement:

- Android: consumer-style accessibility redirection is implemented
- iOS: requires Apple Family Controls entitlements and native work

## Content filter direction

The app now also includes a shared `Content filter` product flow in the `Plan` tab.

- shared React Native config is implemented
- Android DNS-filter VPN path is implemented
- iOS enforcement still requires Apple Network Extension entitlements and native implementation

See `docs/content-filter-platform-plan.md`.

## Launch targets

```bash
npm run android
npm run ios
npm run web
```

## Recommended next steps

1. Set up Java and Android SDK paths locally so `npm run android:dev` can compile.
2. Create an Expo account login and run the EAS build profiles.
3. Add production signing credentials and Play Console metadata.
4. Introduce authentication and encrypted backend storage before handling sensitive user data.
