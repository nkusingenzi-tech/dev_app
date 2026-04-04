# Steady Path Inferred Technical Specifications

Evidence labels used in this document:

- `Observed`: directly implemented in the repo or explicitly declared in config/docs.
- `Strong Inference`: not explicitly specified, but strongly implied by the implementation shape.
- `Weak Inference`: plausible direction, but not yet strongly locked by code.

## System topology

- `Observed`: The product is a single React Native Expo application with one root component in `App.tsx`. The app shell, feature logic, persistence, navigation, charts, coach flows, and content-filter UX are all implemented from that file. Evidence: `index.ts:1-5`, `App.tsx:29-2205`.
- `Observed`: The mobile app is backed by an optional local HTTP API implemented in `server/index.mjs`. Evidence: `server/index.mjs:9-199`.
- `Observed`: Android includes a custom native module and a foreground VPN service for DNS filtering. Evidence: `android/app/src/main/java/com/steadypath/app/ContentFilterPackage.kt:8-13`, `android/app/src/main/java/com/steadypath/app/ContentFilterModule.kt:14-110`, `android/app/src/main/java/com/steadypath/app/ContentFilterVpnService.kt:21-199`.
- `Observed`: iOS now has a generated Expo native project under `ios/`, but there is no iOS-native content-filter implementation. Evidence: `ios/Podfile:19-63`, `ios/SteadyPath/SteadyPath.entitlements`, `App.tsx:123-126`.
- `Observed`: OpenAI is not called directly for the regular text coach path from the client. The client calls the local backend, and the backend calls OpenAI. Evidence: `App.tsx:2012-2038`, `server/index.mjs:21-89`.
- `Observed`: Realtime voice is split into two hops: the client first asks the backend for a Realtime client secret, then the client negotiates SDP directly with OpenAI using `react-native-webrtc`. Evidence: `App.tsx:1154-1294`, `server/index.mjs:138-195`.

## Runtime modes

### Expo Go mode

- `Observed`: Expo Go can run the shared JavaScript UI when started with `expo start --go`. Evidence: `package.json:7`, Expo runtime conventions, and the absence of a custom JS entrypoint.
- `Observed`: Expo Go is not the intended runtime for native-only features because the repo depends on `expo-dev-client` and `react-native-webrtc`. Evidence: `package.json:8`, `package.json:29`, `package.json:43`, `app.json:13-17`, `App.tsx:1179-1289`.
- `Strong Inference`: Expo Go is suitable for checking navigation, storage-driven state, charts, and non-native UI flows, but it is not a valid end-to-end runtime for the full feature set.

### Development build mode

- `Observed`: `package.json:8` defines `start:dev` as `expo start --dev-client`.
- `Observed`: The generated Expo config declares `expo-dev-client` and `@config-plugins/react-native-webrtc`. Evidence: `app.json:13-17`.
- `Observed`: Development builds are required to exercise native-only integrations such as `react-native-webrtc` and the Android content-filter module. Evidence: `App.tsx:123-126`, `App.tsx:1179-1289`.

### Local iOS native build mode

- `Observed`: Expo prebuild generated a local iOS native project with autolinking and React Native pods. Evidence: `ios/Podfile:1-63`.
- `Observed`: The generated iOS target currently exposes microphone and notification permissions plus local-networking allowance. Evidence: `app.json:23-30`, `ios/SteadyPath/Info.plist`.
- `Strong Inference`: The current iOS target is technically capable of rendering the shared UI, running Expo modules, and participating in backend-driven coach flows, but not of performing the Android DNS-filter role.

## Functional modules

### 1. Onboarding and plan state

- `Observed`: `OnboardingData` contains `primaryGoal`, `motivation`, `triggerTime`, `riskyApps`, `accountabilityContact`, and `reminderTime`. Evidence: `App.tsx:30-37`.
- `Observed`: The app persists onboarding state locally and restores it on launch. Evidence: `App.tsx:218-245`.
- `Observed`: The app uses local-only storage keys for onboarding, check-ins, reminders, and content-filter settings. Evidence: `App.tsx:112-116`.
- `Strong Inference`: This is currently a single-user, device-local profile model with no server-side account concept.

### 2. Check-ins and analytics

- `Observed`: `CheckInEntry` contains `id`, `createdAt`, `mood`, `urgeLevel`, `trigger`, `outcome`, and `notes`. Evidence: `App.tsx:49-57`.
- `Observed`: The app computes local analytics such as streaks, slip rate, mood distribution, and urge trends from device-stored check-ins. Evidence: `App.tsx:58-70`, `App.tsx:938-1050`, `App.tsx:1882-1985`.
- `Strong Inference`: Analytics are derived entirely client-side from local data rather than aggregated remotely.

### 3. Coach subsystem

- `Observed`: The coach has text mode and voice mode inside the same feature area. Evidence: `App.tsx:1061-1108`, `App.tsx:1111-1294`.
- `Observed`: The app will send a text coach request to the backend only if `EXPO_PUBLIC_COACH_API_URL` is configured. Evidence: `App.tsx:163`, `App.tsx:2012-2038`.
- `Observed`: If the backend URL is missing or the request fails, the text coach falls back to deterministic local reply generation. Evidence: `App.tsx:2013-2037`.
- `Observed`: Voice transcription has no equivalent local fallback; missing backend URL returns an empty transcription. Evidence: `App.tsx:2040-2068`.
- `Observed`: Realtime voice depends on a backend-generated client secret and `react-native-webrtc` on-device transport. Evidence: `App.tsx:1154-1294`, `server/index.mjs:138-195`.
- `Strong Inference`: The text coach is designed to degrade gracefully offline-ish, but the voice and realtime paths are not.

### 4. Content-filter subsystem

- `Observed`: `ContentFilterConfig` contains `enabled`, `safeSearch`, `strictMode`, and `blockedCategories`. Evidence: `App.tsx:77-82`.
- `Observed`: `ContentFilterStatus` includes runtime availability, VPN permission state, service status, category config, blocked request count, and last blocked domain. Evidence: `App.tsx:83-92`.
- `Observed`: The JavaScript side defines a bridge contract with `updateConfig`, `getStatus`, `requestVpnPermissionAndStart`, `stopFiltering`, and `openVpnSettings`. Evidence: `App.tsx:99-109`.
- `Observed`: The actual JS bridge is only created when `Platform.OS === 'android'`. Evidence: `App.tsx:123-126`.
- `Observed`: When the bridge is missing, the app reports the feature as unavailable and keeps only the configuration UI active. Evidence: `App.tsx:358-389`.
- `Observed`: The plan screen still renders content-filter settings on iOS and labels the platform state as entitlement-dependent. Evidence: `App.tsx:1462-1476`, `App.tsx:1513-1638`.
- `Observed`: Android implements DNS-based whole-device filtering rather than per-app blocking. Evidence: `ContentFilterVpnService.kt:32-38`, `ContentFilterVpnService.kt:105-112`, `ContentFilterVpnService.kt:183-185`.
- `Strong Inference`: The iOS content-filter UI currently acts as a shared config model and future placeholder, not an iOS-native enforcement feature.

## Interface contracts

### Client environment contract

- `Observed`: The client reads `EXPO_PUBLIC_COACH_API_URL` from `process.env`. Evidence: `App.tsx:163`.
- `Observed`: If `EXPO_PUBLIC_COACH_API_URL` is unset, the text path uses local fallback, the transcription path returns empty output, and the realtime path stops before session creation. Evidence: `App.tsx:1155-1157`, `App.tsx:2013-2037`, `App.tsx:2041-2043`.

Expected value shape:

```env
EXPO_PUBLIC_COACH_API_URL=http://<reachable-host>:8787
```

### Backend environment contract

- `Observed`: The server reads `PORT` and `OPENAI_API_KEY`. Evidence: `server/index.mjs:10-11`.
- `Observed`: If `OPENAI_API_KEY` is missing, all OpenAI-backed endpoints return 500-level configuration errors. Evidence: `server/index.mjs:22-27`, `server/index.mjs:92-97`, `server/index.mjs:139-144`.

Expected value shape:

```env
OPENAI_API_KEY=sk-...
PORT=8787
```

### HTTP API contract

`GET /health`

- `Observed`: Returns `{ ok: true }`. Evidence: `server/index.mjs:17-19`.

`POST /api/coach/text`

- `Observed`: Request payload is JSON with `message` and `profile`. Evidence: `App.tsx:2018-2026`, `server/index.mjs:29-33`.
- `Observed`: Response payload is `{ reply: string }`. Evidence: `server/index.mjs:80-82`.

Request shape:

```json
{
  "message": "I want to act out right now",
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

`POST /api/coach/transcribe`

- `Observed`: The client currently sends JSON with `audioBase64`. Evidence: `App.tsx:2045-2057`.
- `Observed`: The server accepts either raw audio bytes or JSON `audioBase64`. Evidence: `server/index.mjs:13-15`, `server/index.mjs:99-105`.
- `Strong Inference`: The intended API shape likely migrated from raw audio support toward JSON for convenience, but the server and client are not fully aligned on the optimal transport.

`POST /api/coach/realtime/session`

- `Observed`: The backend returns a payload containing `client_secret.value`. Evidence: `server/index.mjs:146-188`, `App.tsx:1171-1177`.
- `Observed`: The client then sends the local SDP offer directly to `https://api.openai.com/v1/realtime?model=gpt-realtime`. Evidence: `App.tsx:1266-1289`.

### Android native bridge contract

Bridge surface inferred from `App.tsx:99-109` and implemented in `ContentFilterModule.kt:17-110`:

```ts
type NativeContentFilterModule = {
  updateConfig(enabled, safeSearch, strictMode, blockedCategories): Promise<void>
  getStatus(): Promise<ContentFilterStatus>
  requestVpnPermissionAndStart(): Promise<string>
  stopFiltering(): Promise<void>
  openVpnSettings(): void
}
```

## Platform capability matrix

### Android

- `Observed`: Supports the shared React Native UI, notifications, voice recording, backend coach calls, and a native DNS-filter VPN service. Evidence: `app.json:32-45`, `ContentFilterModule.kt:17-110`, `ContentFilterVpnService.kt:21-199`.
- `Observed`: The native DNS filter is packaged into the app via `ContentFilterPackage` and registered in `MainApplication`. Evidence: `ContentFilterPackage.kt:8-13`, `MainApplication.kt:24-27`.
- `Strong Inference`: Android is the only platform in this repo with an actual enforcement backend for the content-filter settings.

### iOS

- `Observed`: Supports the generated Expo/RN app shell, microphone permission text, notification permission text, local networking allowance, and the shared plan/coach UI. Evidence: `app.json:23-31`, `ios/SteadyPath/Info.plist`, `ios/Podfile:19-63`.
- `Observed`: The generated entitlements file contains only `aps-environment`. There is no Network Extension entitlement and no separate extension target. Evidence: `ios/SteadyPath/SteadyPath.entitlements`.
- `Observed`: The JavaScript layer marks the content-filter bridge unavailable on non-Android platforms. Evidence: `App.tsx:123-126`, `App.tsx:358-389`.
- `Strong Inference`: iOS currently provides UI visibility plus backend-driven coach/reminder paths, but not native enforcement parity with Android.

### Web

- `Observed`: `package.json:18` exposes `expo start --web`, but there is no web-specific specialization in the repo.
- `Weak Inference`: Web support exists only at the Expo baseline level and is not a primary product target.

## Build and tooling requirements

- `Observed`: The repo is now Bun-oriented for dependency installation because `packageManager` is set to `bun@1.3.11`. Evidence: `package.json:52`.
- `Observed`: The `api` script still executes Node directly rather than Bun runtime. Evidence: `package.json:6`.
- `Observed`: Local iOS builds require full Xcode plus CocoaPods because the repo now contains an iOS Podfile and native target. Evidence: `ios/Podfile:1-63`.
- `Observed`: The Podfile defaults the iOS deployment target to `15.1`. Evidence: `ios/Podfile:19`.
- `Observed`: Hermes is enabled in the iOS Podfile properties. Evidence: `ios/Podfile.properties.json`.

## Non-functional constraints inferred from the implementation

- `Observed`: The app must tolerate backend absence for text coaching by falling back to local reply generation. Evidence: `App.tsx:2013-2037`.
- `Observed`: The app currently assumes local network reachability or some other reachable URL for the backend; QR-based Expo discovery does not satisfy that requirement on its own. Evidence: `App.tsx:163`, `App.tsx:1154-1163`, `App.tsx:2018-2026`, `App.tsx:2050-2057`.
- `Observed`: The transcription client currently expands audio into base64 JSON before upload. Evidence: `App.tsx:2045-2057`.
- `Observed`: The server uses default `express.json()` plus a raw-body audio parser. Evidence: `server/index.mjs:13-15`.
- `Strong Inference`: Larger voice uploads can fail at the JSON parser before the transcription handler is reached because the client does not use the raw-audio path.
- `Strong Inference`: Privacy and security requirements are materially important because the stored and transmitted data includes behavioral-health-adjacent recovery content, urges, slips, and accountability-contact information.

## Explicitly unsupported or unimplemented today

- `Observed`: There is no user authentication, account model, or cloud persistence.
- `Observed`: There is no iOS-native content-filter bridge, Network Extension target, or entitlement-driven filter implementation.
- `Observed`: There is no evidence of a current Android AccessibilityService-based app locker in the code, despite some older documentation language elsewhere in the repo.
- `Observed`: There is no backend auth, rate limiting, or multitenant separation on the local coach API.

## Open questions for a clean-room rewrite

- `Strong Inference`: Should the coach backend remain a thin local proxy, or should the product move toward a real application backend with auth and persistence?
- `Strong Inference`: Is Android DNS filtering a core feature or an interim implementation on the way to a broader device-protection architecture?
- `Strong Inference`: Should iOS remain a UI-plus-coach client, or is parity with Android content filtering a real product requirement?
- `Strong Inference`: Should transcription continue using base64 JSON, or should the app move to the raw-audio path the server already accepts?
- `Weak Inference`: Should the product scope remain a combination of coaching, tracking, and device-level filtering, or should one of those become the primary product surface?
