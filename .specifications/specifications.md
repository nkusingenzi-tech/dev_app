# Steady Path Inferred Technical Specifications

This document describes the current implementation as it exists in the repo today. It is not a greenfield wishlist. It is the working specification that future changes should align with or explicitly update.

Evidence labels used in this document:

- `Observed`: directly implemented in the repo or explicitly declared in config.
- `Strong Inference`: strongly implied by the implementation shape and current runtime wiring.
- `Weak Inference`: plausible direction, but not locked by the code.

## Documentation and source-of-truth map

- `Observed`: `AGENTS.md` is the repo operating guide for coding agents and should be read before substantial modifications.
- `Observed`: `README.md` is the quick-start entry point for humans running the project locally.
- `Observed`: `docs/README.md` is the runtime and platform note companion to this file.
- `Observed`: `docs/content-filter-platform-plan.md` documents the Android DNS-filter implementation and the current iOS native gap.

## System topology

- `Observed`: The product is a single Expo React Native application with a thin root export in `App.tsx` and modular source under `src/`.
- `Observed`: The app bootstrap path is `App.tsx` -> `src/app/AppRoot.tsx` -> `src/app/AppSessionContext.tsx` -> onboarding navigator or main tab shell.
- `Observed`: The main post-onboarding app shell is a six-tab navigator implemented in `src/navigation/AppTabs.tsx`.
- `Observed`: The onboarding flow is a multi-screen native-stack flow implemented in `src/navigation/OnboardingNavigator.tsx`.
- `Observed`: The backend is a Bun-native strict TypeScript HTTP API implemented under `server/src/`.
- `Observed`: Android includes custom native code for content filtering via a DNS-filter VPN service. Evidence: `android/app/src/main/java/com/steadypath/app/ContentFilterModule.kt`, `ContentFilterPackage.kt`, `ContentFilterPrefs.kt`, `ContentFilterVpnService.kt`.
- `Observed`: iOS includes a generated Expo native project under `ios/`, but there is no iOS-native content-filter implementation or Network Extension target.
- `Observed`: The app and the backend are separately started processes. The app talks to the backend through an explicit environment-configured base URL rather than automatic Expo discovery.

## Current code organization

### Mobile application layout

- `Observed`: `src/app/` owns bootstrap, session state, app-level orchestration, and app-level tests.
- `Observed`: `src/navigation/` owns route param lists and the navigator trees.
- `Observed`: `src/features/` owns feature-specific screens and services.
- `Observed`: `src/domain/` owns shared data models and storage constants.
- `Observed`: `src/theme/` owns shared styles and navigation theme configuration.
- `Observed`: `src/ui/` owns reusable UI primitives.

### Feature boundaries

- `Observed`: `src/features/onboarding/screens.tsx` owns onboarding steps for goal setup, trigger time, risky apps, support, and review.
- `Observed`: `src/features/today/screens.tsx` owns dashboard, urgency tools, daily plan, and progress snapshot screens.
- `Observed`: `src/features/checkins/screens.tsx` owns new check-in and history flows.
- `Observed`: `src/features/insights/screens.tsx` owns insights overview and charts.
- `Observed`: `src/features/coach/screens.tsx` owns coach feature screens.
- `Observed`: `src/features/coach/context.tsx` owns voice session state, realtime session setup, transcript flow, and teardown behavior.
- `Observed`: `src/features/coach/service.ts` owns backend fetches and text fallback behavior.
- `Observed`: `src/features/protection/screens.tsx` owns trigger-app and content-filter settings/status UI.
- `Observed`: `src/features/reminders/reminderService.ts` owns local reminder scheduling.
- `Observed`: `src/features/storage/repositories.ts` owns persistence adapters for local app data.

### Server layout

- `Observed`: `server/src/index.ts` is the server entrypoint.
- `Observed`: `server/src/app/createServer.ts` is the composition root.
- `Observed`: `server/src/routes/router.ts` owns path/method dispatch.
- `Observed`: `server/src/handlers/` owns request/response mapping.
- `Observed`: `server/src/services/` owns typed business logic.
- `Observed`: `server/src/repositories/OpenAIRepository.ts` owns OpenAI SDK integration.
- `Observed`: `server/src/repositories/AudioUploadRepository.ts` owns transcription input decoding.
- `Observed`: `server/src/models/` owns DTOs and server-side types.
- `Observed`: `server/src/lib/` owns shared HTTP helpers, limits, and errors.

## Runtime modes

### Expo Go mode

- `Observed`: Expo Go can render the shared JavaScript/TypeScript UI when started with `expo start --go`.
- `Observed`: Expo Go is not the intended runtime for native-only features because the repo depends on `expo-dev-client` and `react-native-webrtc`.
- `Strong Inference`: Expo Go is appropriate for navigation, styling, onboarding, check-ins, insights, profile flows, protection UI review, and text fallback checks, but not for the full native feature set.

### Development build mode

- `Observed`: `package.json` defines `start:dev` as `expo start --dev-client`.
- `Observed`: The Expo config declares `expo-dev-client` and `@config-plugins/react-native-webrtc`.
- `Observed`: Development builds are required to exercise `react-native-webrtc` and the Android content-filter native bridge.

### Local iOS native build mode

- `Observed`: Expo prebuild generated a local iOS native project with an Expo/RN Podfile and app target.
- `Observed`: The generated iOS target exposes microphone permission text, notification permission text, and local networking allowance.
- `Strong Inference`: The current iOS target is suitable for rendering the shared UI, local reminders, and backend-driven coach flows, but not for iOS-native content filtering.

## Functional modules

### 1. Onboarding and profile state

- `Observed`: `OnboardingData` includes `primaryGoal`, `motivation`, `triggerTime`, `riskyApps`, `accountabilityContact`, and `reminderTime`. Evidence: `src/domain/models.ts`.
- `Observed`: The app persists onboarding/profile state locally and restores it on launch. Evidence: `src/app/AppSessionContext.tsx`, `src/app/services/appSessionService.ts`.
- `Observed`: The app uses explicit storage keys defined in `src/domain/constants.ts` and implemented through repositories in `src/features/storage/repositories.ts`.
- `Strong Inference`: The current product is single-user and device-local. There is no account or cloud identity layer.

### 2. Check-ins and local analytics

- `Observed`: `CheckInEntry` contains `id`, `createdAt`, `mood`, `urgeLevel`, `trigger`, `outcome`, and `notes`.
- `Observed`: Check-ins are persisted locally and restored into app session state.
- `Observed`: Analytics such as streaks, slip rates, mood distribution, and urge trends are computed locally from device-stored check-ins. Evidence: `src/app/services/appHelpers.ts`, `src/features/insights/screens.tsx`.
- `Strong Inference`: Analytics are entirely client-side today.

### 3. Reminders

- `Observed`: The app can schedule a daily reminder based on onboarding/profile reminder time. Evidence: `src/features/reminders/reminderService.ts`, `src/app/AppSessionContext.tsx`.
- `Observed`: Reminder state is persisted locally, including the scheduled notification identifier. Evidence: `src/features/storage/repositories.ts`, `src/domain/constants.ts`.
- `Strong Inference`: Reminder behavior is local-device only and not coordinated with any backend.

### 4. Coach subsystem

- `Observed`: The coach feature is separated into coach hub, text coach, and voice coach screens. Evidence: `src/navigation/AppTabs.tsx`, `src/features/coach/screens.tsx`.
- `Observed`: Text coach uses a backend if `EXPO_PUBLIC_COACH_API_URL` is configured. Evidence: `src/features/coach/service.ts`.
- `Observed`: If the backend URL is missing or the text request fails, the app falls back to deterministic local response generation. Evidence: `src/features/coach/service.ts`, `src/app/services/appHelpers.ts`.
- `Observed`: Voice transcription depends on the backend and returns an empty string when no backend is configured or the request fails.
- `Observed`: Realtime voice depends on a backend-generated client secret and client-side WebRTC negotiation from `src/features/coach/context.tsx`.
- `Observed`: The backend uses the OpenAI SDK for text generation, transcription, and realtime client-secret creation. Evidence: `server/src/repositories/OpenAIRepository.ts`.
- `Strong Inference`: Text coaching is designed to degrade gracefully, while transcription and realtime voice are not.

### 5. Content-filter subsystem

- `Observed`: `ContentFilterConfig` includes `enabled`, `safeSearch`, `strictMode`, and `blockedCategories`.
- `Observed`: `ContentFilterStatus` includes runtime availability, permission/service state, blocked category config, blocked request count, and last blocked domain.
- `Observed`: The JavaScript bridge contract is defined in `src/features/content-filter/service.ts` and includes config sync, status refresh, start, stop, and settings open behavior.
- `Observed`: The native content-filter bridge is only created when `Platform.OS === 'android'`.
- `Observed`: Non-Android platforms receive an unavailable/no-op implementation from the shared service layer.
- `Observed`: Protection UI still renders shared settings on iOS even though native enforcement is not available.
- `Observed`: Android implements DNS-filter VPN enforcement rather than an AccessibilityService app blocker or a Family Controls equivalent.
- `Strong Inference`: On iOS, the content-filter UI is currently a shared config model and product placeholder, not a native enforcement feature.

## Session, persistence, and state management

- `Observed`: `src/app/AppSessionContext.tsx` is the canonical state owner for:
  - onboarding/profile data
  - onboarding completion flag
  - check-in history
  - reminder status
  - content-filter config
  - content-filter runtime status
- `Observed`: `src/app/services/appSessionService.ts` centralizes orchestration logic for bootstrap, onboarding completion, reset, reminder enablement, content-filter updates, and content-filter refresh.
- `Observed`: App state is loaded once during bootstrap and then refreshed selectively, including on app foreground transitions for content-filter status.
- `Strong Inference`: The current architecture prefers a single app-session context plus feature modules rather than a separate state management library.

## Interface contracts

### Client environment contract

- `Observed`: The client reads `EXPO_PUBLIC_COACH_API_URL` from `process.env` in `src/features/coach/service.ts`.
- `Observed`: If `EXPO_PUBLIC_COACH_API_URL` is unset:
  - text coach uses local fallback
  - transcription returns an empty string
  - realtime session creation returns `null`

Expected value shape:

```env
EXPO_PUBLIC_COACH_API_URL=http://<reachable-host>:8787
```

### Backend environment contract

- `Observed`: The backend reads `PORT`, `OPENAI_API_KEY`, and `CORS_ALLOW_ORIGIN` in `server/src/config/env.ts`.
- `Observed`: `PORT` defaults to `8787`.
- `Observed`: `CORS_ALLOW_ORIGIN` defaults to `*`.
- `Observed`: Missing `OPENAI_API_KEY` produces server-side configuration errors for OpenAI-backed endpoints.

Expected value shape:

```env
OPENAI_API_KEY=sk-...
PORT=8787
CORS_ALLOW_ORIGIN=*
```

### HTTP API contract

`GET /health`

- `Observed`: Returns `{ ok: true }`. Evidence: `server/src/handlers/getHealthHandler.ts`.

`POST /api/coach/text`

- `Observed`: Request payload contains `message` and `profile`. Evidence: `src/features/coach/service.ts`, `server/src/models/coach.ts`.
- `Observed`: Response payload is `{ reply: string }`. Evidence: `server/src/handlers/postCoachTextHandler.ts`.

`POST /api/coach/transcribe`

- `Observed`: The client currently sends JSON with `audioBase64`.
- `Observed`: The server accepts either raw `audio/*` bodies or JSON `{ audioBase64 }`.
- `Observed`: Response payload is `{ text: string }`. Evidence: `server/src/handlers/postCoachTranscriptionHandler.ts`.

`POST /api/coach/realtime/session`

- `Observed`: The response includes `client_secret.value`, `client_secret.expires_at`, and `session`. Evidence: `server/src/repositories/OpenAIRepository.ts`, `src/features/coach/context.tsx`.
- `Observed`: The client uses the returned secret to negotiate WebRTC directly with OpenAI.

## Platform capability matrix

### Android

- `Observed`: Supports the shared React Native UI, local reminders, backend coach calls, voice recording, realtime voice transport in dev builds, and a native DNS-filter VPN service.
- `Observed`: The content-filter bridge is packaged through `ContentFilterPackage` and registered in `MainApplication`.
- `Strong Inference`: Android is the only platform in this repo with real content-filter enforcement today.

### iOS

- `Observed`: Supports the generated Expo/RN app shell, shared UI, notifications, microphone permission text, local-network access allowance, and backend-driven coach flows.
- `Observed`: The generated entitlements file does not include a Network Extension entitlement.
- `Observed`: Shared protection UI is present, but native content-filter enforcement is not.
- `Strong Inference`: iOS is currently a shared app shell plus coach/reminder client, not a native filter-enforcement platform.

### Web

- `Observed`: `package.json` exposes `expo start --web`.
- `Weak Inference`: Web remains an Expo baseline convenience target and not a primary product platform.

## Build and tooling requirements

- `Observed`: The repo is Bun-oriented. `packageManager` is set to `bun@1.3.11`, and the backend scripts run through Bun.
- `Observed`: CI uses Bun for install, lint, typecheck, and tests.
- `Observed`: Linting is configured through Biome.
- `Observed`: Local iOS native builds require full Xcode and CocoaPods.
- `Observed`: The iOS Podfile currently targets iOS `15.1`.

## Testing and verification

- `Observed`: The repo includes app-level tests for app helpers and app-session orchestration.
- `Observed`: The repo includes server tests for server creation and HTTP e2e startup.
- `Observed`: CI verifies:
  - `bun install --frozen-lockfile`
  - `bun run lint`
  - `bun run typecheck`
  - `bun test`
- `Strong Inference`: Changes to app services, server contracts, or runtime wiring are expected to maintain or extend automated coverage.

## Non-functional constraints inferred from the implementation

- `Observed`: The app must tolerate backend absence for text coaching by falling back to local reply generation.
- `Observed`: The app assumes the backend is reachable through a real URL; Expo QR scanning does not satisfy backend reachability automatically.
- `Observed`: The current transcription client uses base64 JSON, which is convenient but less efficient than raw audio upload.
- `Observed`: The server explicitly enforces body-size limits and supports both JSON base64 and raw audio upload paths.
- `Strong Inference`: Request-size pressure still exists for larger recordings because the client does not yet use the raw-audio upload path.
- `Strong Inference`: Privacy and security matter materially because stored and transmitted data includes behavioral-health-adjacent notes, urges, slips, reminder preferences, and accountability-contact data.

## Explicitly unsupported or unimplemented today

- `Observed`: There is no user authentication, account model, or cloud sync.
- `Observed`: There is no backend auth, tenancy model, or rate limiting.
- `Observed`: There is no iOS-native content-filter bridge or Network Extension-based implementation.
- `Observed`: There is no AccessibilityService-based Android app blocker in the current codebase.
- `Observed`: There is no cloud persistence for onboarding, check-ins, or reminders.

## Open questions that remain architectural, not implementation facts

- `Strong Inference`: Should the coach backend remain a thin local proxy or become a real authenticated backend?
- `Strong Inference`: Should transcription move from base64 JSON to raw audio upload for better efficiency and fewer body-size issues?
- `Strong Inference`: Is Android DNS filtering the long-term protection strategy, or a transitional enforcement layer?
- `Strong Inference`: Does iOS need native content-filter parity, or is it acceptable as a shared shell plus coach client?
- `Weak Inference`: Should the product continue to balance recovery tracking, coaching, and device-level protection equally, or should one become the dominant product surface?
