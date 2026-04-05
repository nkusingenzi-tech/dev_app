# AGENTS Guide

This file is the repo operating guide for coding agents. Read it before changing code. The goal is to prevent the same recurring mistakes: re-monolithing the app, breaking client/server contracts, assuming iOS has native filter parity, using the wrong runtime, or changing state/storage contracts without understanding the consequences.

## Read order

Read these files in order before substantial work:

1. `AGENTS.md`
   - Repo layout, ownership, invariants, and verification rules.
2. `.specifications/specifications.md`
   - Current implementation-level product and system specification.
3. `docs/README.md`
   - Runtime notes, commands, backend wiring, platform limits, and commit boundary.
4. `docs/content-filter-platform-plan.md`
   - Android DNS filter vs current iOS limitation.

If a change affects architecture or contracts, update the relevant docs in the same change.

## Project summary

Steady Path is:

- a modular Expo React Native app under `src/`
- a Bun-native TypeScript local API under `server/src/`
- an Android app with a real native DNS-filter VPN implementation
- an iOS app shell generated via Expo prebuild, suitable for shared UI and backend-driven flows but not native content filtering

The root `App.tsx` is intentionally thin. Do not rebuild a monolith there.

## Top-level layout

- `App.tsx`
  - Thin export to `src/app/AppRoot.tsx`.
- `README.md`
  - Quick-start guide for humans.
- `AGENTS.md`
  - Repo operations guide for coding agents.
- `docs/`
  - Technical notes and platform-specific documentation.
- `.specifications/`
  - Inferred current implementation specifications.
- `src/`
  - Mobile app source.
- `server/src/`
  - Bun server source.
- `android/`
  - Native Android app and content-filter code.
- `ios/`
  - Generated native iOS project.
- `.github/workflows/`
  - CI definitions.

## App architecture

### Root flow

- `App.tsx`
  - Exports the real app root.
- `src/app/AppRoot.tsx`
  - Configures notification presentation behavior.
  - Mounts `AppSessionProvider`.
  - Decides between onboarding and the main tab shell.
- `src/app/AppSessionContext.tsx`
  - Loads local state at startup.
  - Owns the canonical in-memory session state.
  - Exposes the mutation API used by screens.

### Navigation

- `src/navigation/OnboardingNavigator.tsx`
  - Five-screen onboarding stack:
    - `GoalSetup`
    - `TriggerSetup`
    - `RiskAppsSetup`
    - `SupportSetup`
    - `OnboardingReview`
- `src/navigation/AppTabs.tsx`
  - Six-tab post-onboarding shell:
    - `Today`
    - `CheckIn`
    - `Insights`
    - `Coach`
    - `Protection`
    - `Profile`
- `src/navigation/types.ts`
  - Route param lists. Keep these in sync with any screen moves or renames.

### Feature ownership

- `src/features/onboarding/`
  - Onboarding screens and field collection.
- `src/features/today/`
  - Home dashboard, urgency tools, daily plan, progress snapshot.
- `src/features/checkins/`
  - Check-in capture and check-in history.
- `src/features/insights/`
  - Device-local analytics and chart screens.
- `src/features/coach/`
  - `screens.tsx`: coach UI
  - `service.ts`: backend calls and local fallback
  - `context.tsx`: voice session state, realtime session lifecycle, cleanup
- `src/features/protection/`
  - Shared protection/settings UI, trigger apps, content-filter settings/status.
- `src/features/reminders/`
  - Daily reminder scheduling.
- `src/features/storage/`
  - Local repositories for onboarding/profile, check-ins, reminders, and content-filter config.

### Shared layers

- `src/domain/models.ts`
  - Shared data model definitions. Update this when contracts change.
- `src/domain/constants.ts`
  - Stable storage keys and defaults. Treat these as migration-sensitive.
- `src/theme/`
  - Colors, navigation theme, and reusable style constants.
- `src/ui/components.tsx`
  - Shared UI building blocks and navigation affordances.
- `src/app/services/`
  - App-level pure helpers and orchestration.

## Server architecture

### Entry and composition

- `server/src/index.ts`
  - Loads env and starts the Bun server.
- `server/src/app/createServer.ts`
  - Wires handlers, services, repositories, and route table.
- `server/src/app/startServer.ts`
  - Wraps `Bun.serve`.

### Layers

- `server/src/routes/router.ts`
  - Path/method dispatch and `OPTIONS` handling.
- `server/src/handlers/`
  - Translates HTTP requests into typed service calls.
- `server/src/services/`
  - Use-case/business logic.
- `server/src/repositories/OpenAIRepository.ts`
  - OpenAI SDK adapter for:
    - text responses
    - transcription
    - realtime client-secret creation
- `server/src/repositories/AudioUploadRepository.ts`
  - Parses JSON base64 uploads and raw `audio/*` uploads.
- `server/src/models/`
  - Server-side request/response DTOs.
- `server/src/lib/`
  - HTTP helpers, request-size limits, error types.

### Current HTTP endpoints

- `GET /health`
  - Liveness check.
- `POST /api/coach/text`
  - Text coach reply generation.
- `POST /api/coach/transcribe`
  - Audio transcription.
- `POST /api/coach/realtime/session`
  - Returns a short-lived realtime client secret.

## Native platform ownership

### Android

Native content-filter implementation lives in:

- `android/app/src/main/java/com/steadypath/app/ContentFilterModule.kt`
- `android/app/src/main/java/com/steadypath/app/ContentFilterPackage.kt`
- `android/app/src/main/java/com/steadypath/app/ContentFilterPrefs.kt`
- `android/app/src/main/java/com/steadypath/app/ContentFilterVpnService.kt`

Important:

- This is a DNS-filter VPN implementation.
- It is not an AccessibilityService app blocker.
- JavaScript code must continue to gate this bridge to Android only.

### iOS

Current iOS status:

- The shared React Native app can run through the generated `ios/` project.
- WebRTC and other native dependencies are wired through Expo prebuild and Pods.
- There is no iOS-native content-filter implementation.
- There is no Network Extension target or entitlement-driven packet filter.

Do not document or imply iOS content-filter parity unless the codebase actually gains that native implementation.

## Stable contracts you must not break casually

### 1. Storage keys

The keys in `src/domain/constants.ts` are current persisted app contracts. Changing them without migration will orphan existing local data.

Examples:

- onboarding/profile storage key
- check-in history storage key
- reminder identifier storage key
- content-filter config storage key

If you must change storage shape:

- preserve key compatibility when possible
- add a migration path
- update tests
- update `.specifications/specifications.md`

### 2. Client/server payload shapes

The app depends on these response shapes:

- `/api/coach/text` -> `{ reply: string }`
- `/api/coach/transcribe` -> `{ text: string }`
- `/api/coach/realtime/session` -> `{ client_secret: { value, expires_at }, session }`

If the server changes:

- update `src/features/coach/service.ts`
- update `src/features/coach/context.tsx`
- update server tests
- update docs/specs

### 3. Text-coach fallback behavior

Text coach currently degrades gracefully when the backend is unavailable. That fallback lives in `src/features/coach/service.ts` and `src/app/services/appHelpers.ts`.

Do not remove this behavior casually. It is part of current runtime expectations.

### 4. Android-only native bridge boundary

`src/features/content-filter/service.ts` must keep the native content-filter bridge platform-gated. Do not import or invoke Android-only native modules from shared code paths without a platform guard.

### 5. Thin app root

Do not move feature logic back into `App.tsx`. If a change needs app-level state, put it in:

- `src/app/`
- the relevant feature module
- shared domain/theme/ui layers

## Environment and secret handling

Use Bun. Do not default to `npm` or `node` scripts when working in this repo.

App env:

```env
EXPO_PUBLIC_COACH_API_URL=http://<reachable-host>:8787
```

Server env:

```env
OPENAI_API_KEY=sk-...
PORT=8787
CORS_ALLOW_ORIGIN=*
```

Rules:

- Never commit real `.env` files.
- Only `.env.example` should be tracked.
- Do not hardcode secrets into TS, TSX, Kotlin, JSON, or docs.
- Do not claim Expo QR scanning exposes the backend automatically. It does not.

## Runtime rules

### Bun is the authoritative runtime

- Package manager: Bun
- Lockfile of record: `bun.lock`
- Server runtime: Bun

Avoid reintroducing parallel `npm` workflows in docs or scripts unless the repo intentionally changes package-manager strategy.

### Expo Go vs dev build

Expo Go is acceptable for:

- shared UI review
- layout validation
- navigation checks
- local storage flow checks
- text-coach fallback checks

Dev builds are required for:

- `react-native-webrtc`
- realtime voice
- Android native content-filter controls

### iOS prerequisites

Local iOS work still requires:

- full Xcode selected with `xcode-select`
- CocoaPods installed
- Pods installed in `ios/`

## Testing and verification

Minimum verification for meaningful code changes:

```bash
bun run lint
bun run typecheck
bun test
```

Relevant test locations:

- `src/app/services/appHelpers.test.ts`
- `src/app/services/appSessionService.test.ts`
- `server/src/app/createServer.test.ts`
- `server/src/app/startServer.e2e.test.ts`

When changing:

- app state orchestration: update/add app service tests
- server handlers or services: update/add server tests
- endpoint behavior: update integration/e2e coverage

## Where to make changes

If you need to change onboarding fields:

- `src/domain/models.ts`
- `src/domain/constants.ts`
- `src/features/onboarding/screens.tsx`
- `src/app/AppSessionContext.tsx`
- `src/app/services/appSessionService.ts`

If you need to change reminder behavior:

- `src/features/reminders/reminderService.ts`
- `src/app/AppSessionContext.tsx`
- `src/app/services/appSessionService.ts`

If you need to change check-in analytics:

- `src/app/services/appHelpers.ts`
- `src/features/checkins/screens.tsx`
- `src/features/insights/screens.tsx`

If you need to change coach API behavior:

- `src/features/coach/service.ts`
- `src/features/coach/context.tsx`
- `server/src/models/`
- `server/src/handlers/`
- `server/src/services/`
- `server/src/repositories/OpenAIRepository.ts`

If you need to change content-filter UX:

- `src/features/protection/screens.tsx`
- `src/features/content-filter/service.ts`
- and, if Android native behavior changes, the Kotlin files under `android/app/src/main/java/com/steadypath/app/`

If you need to change persisted storage:

- `src/features/storage/repositories.ts`
- `src/domain/constants.ts`
- `src/app/services/appSessionService.ts`

## Common mistakes to avoid

- Do not reintroduce a 2000-line `App.tsx`.
- Do not switch docs or scripts back to `npm`.
- Do not assume Expo QR scanning exposes the backend.
- Do not describe the Android filter as an AccessibilityService blocker.
- Do not describe iOS content filtering as implemented when it is not.
- Do not change DTOs, storage keys, or env names without updating both sides and tests.
- Do not commit `.env`, `.env.local`, or other secret-bearing env files.
- Do not leave docs/specs stale after architecture or contract changes.

## Commit hygiene

Commit:

- source code
- tests
- docs/specs
- `bun.lock`
- workflow updates
- intentional native project changes

Do not commit:

- `.env*` except `.env.example`
- `node_modules/`
- `.expo/`
- `ios/Pods/`
- `ios/build/`
- Xcode user state
- `maintainers-review/`

## Definition of done for architecture or contract changes

Before considering the work complete:

1. Update the code.
2. Update tests.
3. Update `.specifications/specifications.md` if contracts or platform behavior changed.
4. Update `docs/README.md` and `README.md` if run instructions, runtime boundaries, or platform notes changed.
5. Run:

```bash
bun run lint
bun run typecheck
bun test
```

6. Confirm that the change did not silently break:
   - local state restoration
   - onboarding completion
   - check-in persistence
   - text-coach fallback
   - Android content-filter bridge behavior
   - current endpoint payload shapes
