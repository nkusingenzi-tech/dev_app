# Platform and Runtime Notes

This document is the technical runtime guide for the repo as it exists today. It explains the current Bun-based server, the modular `src/` app layout, the mobile/backend contract, the native platform boundaries, and the commit/run/test rules that matter during implementation work.

## Documentation map

Read the repo documents in this order:

1. `AGENTS.md`
   - Operating guide for coding agents.
   - Explains repo layout, ownership, invariants, and verification expectations.
2. `.specifications/specifications.md`
   - Implementation-level specification derived from the codebase.
   - Defines the current product surface, data contracts, and platform capability matrix.
3. `docs/content-filter-platform-plan.md`
   - Documents the Android DNS-filter path and the current iOS gap.
4. `README.md`
   - Quick-start entry point for humans running the app locally.

## Source of truth

These files are the main implementation anchors:

- `App.tsx`
  - Thin root export. Future work should keep it thin.
- `src/app/AppRoot.tsx`
  - App bootstrap, loading gate, notification presentation behavior, and handoff to onboarding vs main tabs.
- `src/app/AppSessionContext.tsx`
  - Persisted session state, onboarding completion, reset flow, reminder status, content-filter config/status, and app bootstrap wiring.
- `src/app/services/appSessionService.ts`
  - App-level orchestration around repositories, reminders, and the content-filter bridge.
- `src/navigation/AppTabs.tsx`
  - Main six-tab app shell and per-feature stack ownership.
- `src/navigation/OnboardingNavigator.tsx`
  - Multi-screen onboarding flow.
- `src/domain/models.ts`
  - Shared TS models for onboarding, check-ins, reminders, content-filter state, and realtime payloads.
- `src/domain/constants.ts`
  - Stable AsyncStorage keys and defaults. Treat these as migration-sensitive.
- `src/features/coach/service.ts`
  - Client/backend HTTP contract and local fallback behavior.
- `src/features/coach/context.tsx`
  - Voice session lifecycle, realtime WebRTC negotiation, and teardown logic.
- `src/features/content-filter/service.ts`
  - Android bridge boundary and non-Android no-op behavior.
- `server/src/index.ts`
  - Bun server entrypoint.
- `server/src/app/createServer.ts`
  - Server composition root.
- `server/src/routes/router.ts`
  - Typed route dispatch and method handling.
- `server/src/handlers/`
  - HTTP request/response mapping.
- `server/src/services/`
  - Business logic for coach text, transcription, and realtime session creation.
- `server/src/repositories/OpenAIRepository.ts`
  - OpenAI SDK adapter. The server uses the SDK, not ad hoc REST calls.
- `server/src/repositories/AudioUploadRepository.ts`
  - Transcription upload parsing and size enforcement.
- `.github/workflows/ci.yml`
  - Required CI verification.

## Current repo layout

### Mobile app

- `src/app/`
  - Bootstrap, persisted session provider, app-level services, and app-level tests.
- `src/navigation/`
  - Navigator definitions and route param types.
- `src/features/onboarding/`
  - Goal setup, trigger setup, risky-app setup, support setup, and onboarding review screens.
- `src/features/today/`
  - Dashboard, urgency tools, daily plan, and progress screens.
- `src/features/checkins/`
  - Check-in entry and history screens.
- `src/features/insights/`
  - Charts and analytics screens derived from device-local check-ins.
- `src/features/coach/`
  - Text coach, voice coach, realtime session handling, and backend calls.
- `src/features/protection/`
  - Trigger apps and content-filter settings/status screens.
- `src/features/reminders/`
  - Local reminder scheduling.
- `src/features/storage/`
  - Persistence repositories used by the app session layer.
- `src/domain/`
  - Shared models and storage constants.
- `src/theme/`
  - Navigation theme and shared app styles.
- `src/ui/`
  - Shared cards, screen containers, navigation affordances, and small UI primitives.

### Server

- `server/src/index.ts`
  - Loads env and starts the Bun server.
- `server/src/config/`
  - Parses `PORT`, `OPENAI_API_KEY`, and `CORS_ALLOW_ORIGIN`.
- `server/src/app/`
  - Server creation and network listener startup.
- `server/src/routes/`
  - Route registry and method/path dispatch.
- `server/src/handlers/`
  - HTTP request validation and response shaping.
- `server/src/services/`
  - Typed use-case logic.
- `server/src/repositories/`
  - OpenAI SDK access and audio upload decoding.
- `server/src/models/`
  - DTOs for coach, transcription, realtime, and HTTP helpers.
- `server/src/lib/`
  - Shared response helpers, request reading, limits, and error classes.
- `server/src/test-utils/`
  - Fake repositories for tests.

### Native platform code

- `android/app/src/main/java/com/steadypath/app/`
  - `ContentFilterModule.kt`
  - `ContentFilterPackage.kt`
  - `ContentFilterPrefs.kt`
  - `ContentFilterVpnService.kt`
  - `MainApplication.kt`
  - `MainActivity.kt`
- `ios/`
  - Generated Expo native iOS project.
  - Commit-worthy project files live here, but local Pod outputs and Xcode user state should stay untracked.

## Command reference

Install dependencies:

```bash
cd /Users/macbook/Desktop/workspace/collabs/dev_app
bun install
```

Start the Bun backend:

```bash
cd /Users/macbook/Desktop/workspace/collabs/dev_app
export OPENAI_API_KEY="sk-..."
export PORT=8787
bun run api
```

Watch the backend during server work:

```bash
cd /Users/macbook/Desktop/workspace/collabs/dev_app
bun run api:watch
```

Start Expo Go for shared UI validation:

```bash
cd /Users/macbook/Desktop/workspace/collabs/dev_app
export EXPO_PUBLIC_COACH_API_URL="http://<host-ip>:8787"
bunx expo start --go --lan -c
```

Start Expo dev-client mode for native-only paths:

```bash
cd /Users/macbook/Desktop/workspace/collabs/dev_app
export EXPO_PUBLIC_COACH_API_URL="http://<host-ip>:8787"
bun run start:dev
```

Run the local iOS native target after Pods are installed:

```bash
cd /Users/macbook/Desktop/workspace/collabs/dev_app/ios
pod install

cd /Users/macbook/Desktop/workspace/collabs/dev_app
bun run ios
```

Run the local Android target:

```bash
cd /Users/macbook/Desktop/workspace/collabs/dev_app
bun run android
```

Run verification:

```bash
cd /Users/macbook/Desktop/workspace/collabs/dev_app
bun run lint
bun run typecheck
bun test
```

## Client and server contracts

### App-side environment contract

The app reads:

```env
EXPO_PUBLIC_COACH_API_URL=http://<reachable-host>:8787
```

Implementation anchor: `src/features/coach/service.ts`

Behavior:

- Text coach calls `POST /api/coach/text` if the URL exists.
- Voice transcription calls `POST /api/coach/transcribe` if the URL exists.
- Realtime session bootstrap calls `POST /api/coach/realtime/session` if the URL exists.
- If the URL is missing or the text request fails, text coach falls back to `generateCoachReply()` from `src/app/services/appHelpers.ts`.
- If the URL is missing, transcription returns an empty string and realtime session creation returns `null`.

### Server-side environment contract

The backend reads:

```env
OPENAI_API_KEY=sk-...
PORT=8787
CORS_ALLOW_ORIGIN=*
```

Implementation anchor: `server/src/config/env.ts`

Behavior:

- `PORT` defaults to `8787`.
- `CORS_ALLOW_ORIGIN` defaults to `*`.
- Missing `OPENAI_API_KEY` causes OpenAI-backed flows to return configuration errors.

### HTTP API surface

`GET /health`

- Response: `{ "ok": true }`
- Handler: `server/src/handlers/getHealthHandler.ts`

`POST /api/coach/text`

- Request:

```json
{
  "message": "I want to watch porn right now",
  "profile": {
    "primaryGoal": "Reduce porn use",
    "motivation": "Sleep better",
    "triggerTime": "Late night",
    "riskyApps": "Chrome, Reddit",
    "accountabilityContact": "Alex",
    "reminderTime": "21:30"
  }
}
```

- Response:

```json
{
  "reply": "..."
}
```

`POST /api/coach/transcribe`

- Current client request:

```json
{
  "audioBase64": "<base64>"
}
```

- Response:

```json
{
  "text": "..."
}
```

- Server also accepts raw `audio/*` bodies through `server/src/repositories/AudioUploadRepository.ts`.

`POST /api/coach/realtime/session`

- Response shape includes:

```json
{
  "client_secret": {
    "value": "...",
    "expires_at": 1234567890
  },
  "session": {}
}
```

- The client then uses that short-lived secret from `src/features/coach/context.tsx` to negotiate WebRTC with OpenAI.

## iOS support that now exists

What is implemented:

- `app.json` declares the iOS bundle target, usage descriptions, and Expo plugin configuration.
- `@config-plugins/react-native-webrtc` is configured so Expo prebuild can wire WebRTC correctly.
- `ios/` contains a generated Expo/RN native project that can render the shared UI and participate in backend-driven coach flows.
- `ios/SteadyPath/Info.plist` contains microphone, notification, and local-networking permissions used by the current app shell.

What that means:

- The shared React Native UI can run on iOS.
- Development builds can use iOS native modules included by Expo prebuild and installed Pods.
- The repo can be opened in Xcode and run as a generated native app.

## Current technical limitations

### 1. The content-filter implementation is Android-only

This is enforced in code, not just in documentation.

- `src/features/content-filter/service.ts` only binds the native module on Android.
- `src/features/protection/screens.tsx` still renders shared settings UI on iOS, but runtime actions remain platform dependent.
- Android native implementation lives in:
  - `android/app/src/main/java/com/steadypath/app/ContentFilterModule.kt`
  - `android/app/src/main/java/com/steadypath/app/ContentFilterPackage.kt`
  - `android/app/src/main/java/com/steadypath/app/ContentFilterPrefs.kt`
  - `android/app/src/main/java/com/steadypath/app/ContentFilterVpnService.kt`
- The current Android implementation is DNS-filter VPN enforcement, not a per-app blocker and not an AccessibilityService flow.
- The generated iOS app does not have a Network Extension target or corresponding entitlements.

### 2. Expo Go is not feature-complete for this repo

The repo includes native-only functionality:

- `react-native-webrtc`
- `expo-dev-client`
- the Android content-filter bridge

Use Expo Go for:

- navigation checks
- styling/layout validation
- onboarding/check-in/profile/protection UI review
- local text-coach fallback review

Use a development build for:

- realtime voice
- native Android content-filter controls
- full native behavior testing

### 3. Expo QR scanning does not expose the backend automatically

The QR code only points the device at the Metro bundle. The backend is a separate Bun process, and the client always uses `EXPO_PUBLIC_COACH_API_URL`.

That means mobile testing still needs a reachable backend URL such as:

```env
EXPO_PUBLIC_COACH_API_URL=http://172.20.10.9:8787
```

### 4. Local iOS builds still depend on Xcode health and CocoaPods

The repo contains the iOS project, but local machine setup is still required:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
brew install cocoapods
cd ios && pod install
```

### 5. The transcription path still uses base64 JSON on the client

Current state:

- The app sends base64 JSON from `src/features/coach/service.ts`.
- The server accepts both base64 JSON and raw `audio/*`.
- Larger recordings can still be constrained by JSON body size before the raw-audio path is used.

## CI and verification

GitHub Actions runs the required checks on every push and pull request:

- `bun install --frozen-lockfile`
- `bun run lint`
- `bun run typecheck`
- `bun test`

Implementation anchor: `.github/workflows/ci.yml`

## Commit boundary

Commit these:

- `src/`
- `server/src/`
- `android/` native source changes when intentional
- generated `ios/` project files that define the shared native target
- `.specifications/`
- `docs/`
- `AGENTS.md`
- `bun.lock`
- `package.json`
- `app.json`
- CI/workflow files

Do not commit these:

- `.env`
- `.env.local`
- `.env.*` except `.env.example`
- `.envrc`
- `.direnv/`
- `.expo/`
- `node_modules/`
- `ios/Pods/`
- `ios/build/`
- `xcuserdata`
- `.xcode.env.local`
- `.xcresult`
- `maintainers-review/`
