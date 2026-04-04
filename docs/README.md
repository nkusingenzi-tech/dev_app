# Platform and Runtime Notes

This document describes the technical changes that were added to make the repo Bun-based and iOS-prebuild-capable, and it documents the current runtime limits with direct references to the implementation.

## Source of truth

- `package.json:5-18` defines the run scripts.
- `package.json:43-52` contains the relevant dependency changes: `react-native-webrtc`, `@config-plugins/react-native-webrtc`, and `packageManager: bun@1.3.11`.
- `app.json:13-31` defines the Expo plugins and iOS app metadata that feed Expo prebuild.
- `App.tsx:123-126` gates the native content-filter bridge to Android only.
- `App.tsx:163` reads `EXPO_PUBLIC_COACH_API_URL`.
- `App.tsx:1154-1294` implements the Realtime WebRTC path.
- `App.tsx:2012-2068` implements the text and transcription HTTP calls.
- `server/index.mjs:17-195` exposes the local coach API surface.
- `ios/Podfile:19-63` is the generated iOS native target configuration produced by Expo prebuild.
- `ios/SteadyPath/SteadyPath.entitlements` currently contains only `aps-environment`; there is no Network Extension entitlement in the generated iOS target.

## Dependency and prebuild changes

The repo now declares Bun as the package manager:

```json
{
  "packageManager": "bun@1.3.11"
}
```

Relevant dependency changes in `package.json`:

```json
{
  "dependencies": {
    "react-native-webrtc": "^124.0.7"
  },
  "devDependencies": {
    "@config-plugins/react-native-webrtc": "^13.0.0"
  }
}
```

Why the extra config plugin exists:

- The app already imports `react-native-webrtc` dynamically in `App.tsx:1179`.
- Expo prebuild needs the config plugin declared in `app.json:13-17` so the generated native iOS project is configured correctly.
- Without that plugin, `expo prebuild` can generate an incomplete iOS native project for the WebRTC path.

The generated iOS project was created from the current Expo config, not handwritten:

```bash
bunx expo prebuild --platform ios --no-install
```

## Command reference

Install dependencies:

```bash
cd /Users/macbook/Desktop/workspace/collabs/dev_app
bun install
```

Start the backend:

```bash
cd /Users/macbook/Desktop/workspace/collabs/dev_app
export OPENAI_API_KEY="sk-..."
export PORT=8787
bun run api
```

Technical note:

- `bun run api` does not run the server with the Bun runtime.
- `package.json:6` still maps `api` to `node server/index.mjs`.

Start Expo Go for shared UI checks:

```bash
cd /Users/macbook/Desktop/workspace/collabs/dev_app
export EXPO_PUBLIC_COACH_API_URL="http://<host-ip>:8787"
bunx expo start --go --lan -c
```

Start Expo dev-client mode:

```bash
cd /Users/macbook/Desktop/workspace/collabs/dev_app
export EXPO_PUBLIC_COACH_API_URL="http://<host-ip>:8787"
bun run start:dev
```

Start a local iOS native build after CocoaPods is available:

```bash
cd /Users/macbook/Desktop/workspace/collabs/dev_app/ios
pod install

cd /Users/macbook/Desktop/workspace/collabs/dev_app
bun run ios
```

If Xcode is installed but Expo or `xcrun` still resolves to Command Line Tools, point the active developer directory at full Xcode:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
```

Install CocoaPods if it is missing:

```bash
brew install cocoapods
```

## Runtime wiring

The app/server boundary is not implicit. It is an explicit HTTP dependency.

Environment variable read by the app:

```ts
const coachApiUrl = process.env.EXPO_PUBLIC_COACH_API_URL?.replace(/\/$/, '')
```

Implementation reference: `App.tsx:163`.

The app talks to the backend in three places:

1. Text coach

```ts
await fetch(`${coachApiUrl}/api/coach/text`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: input, profile: data }),
})
```

Reference: `App.tsx:2012-2038`

2. Voice transcription

```ts
await fetch(`${coachApiUrl}/api/coach/transcribe`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ audioBase64: base64 }),
})
```

Reference: `App.tsx:2040-2068`

3. Realtime session bootstrap

```ts
await fetch(`${coachApiUrl}/api/coach/realtime/session`, {
  method: 'POST',
})
```

Reference: `App.tsx:1154-1177`

The backend exposes the matching endpoints here:

- `GET /health` in `server/index.mjs:17-19`
- `POST /api/coach/text` in `server/index.mjs:21-89`
- `POST /api/coach/transcribe` in `server/index.mjs:91-136`
- `POST /api/coach/realtime/session` in `server/index.mjs:138-195`

Verify backend reachability before debugging the app:

```bash
curl http://<host-ip>:8787/health
```

Expected response:

```json
{"ok":true}
```

## iOS support that now exists

What was actually added:

- `app.json:13-31` now describes a valid iOS app target with `bundleIdentifier`, `buildNumber`, microphone permission text, and notification permission text.
- `ios/Podfile:19-63` defines a generated Expo/RN iOS target with Expo module autolinking.
- `ios/SteadyPath/Info.plist` contains the generated iOS bundle metadata, local-networking allowance, microphone usage description, notification usage description, and URL schemes.
- `ios/SteadyPath.xcodeproj/project.pbxproj` and `ios/SteadyPath.xcodeproj/xcshareddata/xcschemes/SteadyPath.xcscheme` are now commit-worthy project artifacts.

What this means in practice:

- The repo can now be opened in Xcode as a generated native iOS project.
- The shared React Native UI can be rendered on iOS.
- iOS builds can request microphone and notification permissions because the generated plist contains those usage descriptions.
- The generated iOS app allows local HTTP access on the local network because `ios/SteadyPath/Info.plist` includes `NSAllowsLocalNetworking = true`.

## Current technical limitations

### 1. The content-filter implementation is Android-only

This is not just a product statement. It is visible in the implementation.

The React Native bridge is only bound on Android:

```ts
const nativeContentFilter =
  Platform.OS === 'android'
    ? (NativeModules.ContentFilterModule as NativeContentFilterModule | undefined)
    : undefined
```

Reference: `App.tsx:123-126`

The state model also defaults the feature to unavailable off Android:

```ts
available: Platform.OS === 'android',
platformLabel: Platform.OS === 'android'
  ? 'Android DNS content filter'
  : 'iOS content filter path'
```

Reference: `App.tsx:190-199`

The plan screen explicitly exposes Android-only actions:

- Start Android filter
- Stop Android filter
- Open VPN settings

References:

- `App.tsx:1462-1476`
- `App.tsx:1597-1638`

The Android implementation is concrete and already wired:

- `android/app/src/main/java/com/steadypath/app/ContentFilterPackage.kt:8-13`
- `android/app/src/main/java/com/steadypath/app/MainApplication.kt:24-27`
- `android/app/src/main/java/com/steadypath/app/ContentFilterModule.kt:17-110`
- `android/app/src/main/java/com/steadypath/app/ContentFilterVpnService.kt:21-199`

Technically, the Android path is a DNS-filter VPN service, not a per-app blocker:

- `ContentFilterModule.kt:71-86` requests VPN permission and starts the service.
- `ContentFilterVpnService.kt:32-38` creates a VPN interface and routes DNS through it.
- `ContentFilterVpnService.kt:105-112` blocks or forwards DNS queries based on category and strictness settings.

On iOS there is no equivalent bridge, no Network Extension target, and no entitlement for packet filtering. The generated entitlements file currently contains only:

```xml
<key>aps-environment</key>
<string>development</string>
```

That means the current iOS target is a UI/client shell, not an iOS content-filter implementation.

### 2. Expo Go is not feature-complete for this repo

The repo contains native-only functionality:

- `react-native-webrtc` is used in `App.tsx:1179-1289`
- `expo-dev-client` is configured in `app.json:13-17`
- `package.json:8` starts Expo with `--dev-client`

That means:

- Expo Go is acceptable for checking shared JS/TS UI flows.
- Expo Go is not the target runtime for the full app.
- Realtime voice and any custom native module path should be tested in a development build.

If the goal is only to see layout and shared logic on a phone, use:

```bash
bunx expo start --go --lan
```

If the goal is to exercise native-only paths, use:

```bash
bun run start:dev
```

and install a matching development build first.

### 3. Expo QR scanning does not expose the backend automatically

Expo serves the bundle. The backend is a separate Express process.

The app never discovers the backend from the QR code. It always uses `EXPO_PUBLIC_COACH_API_URL`, read from `App.tsx:163`, and then performs absolute `fetch()` calls to that URL.

That is why the following pattern is required:

```bash
export OPENAI_API_KEY="sk-..."
export PORT=8787
bun run api
```

```bash
export EXPO_PUBLIC_COACH_API_URL="http://<host-ip>:8787"
bunx expo start --go --lan
```

If `EXPO_PUBLIC_COACH_API_URL` is missing:

- text coach falls back to local deterministic replies in `App.tsx:2013-2037`
- transcription returns an empty string in `App.tsx:2041-2067`
- realtime voice reports `Backend URL not configured` in `App.tsx:1155-1157`

### 4. Local iOS builds still depend on Xcode health and CocoaPods

The repo now contains an iOS project, but that does not remove the machine-level prerequisites.

Required local tooling:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
brew install cocoapods
cd ios && pod install
```

Implementation references:

- `ios/Podfile:19` sets the iOS deployment target to `15.1` unless overridden in Podfile properties.
- `ios/Podfile:23-63` uses Expo module autolinking and React Native pod integration.
- `ios/Podfile.properties.json` enables Hermes and Expo dev-client network inspector.

### 5. The transcription path has a known request-size constraint

The client currently sends transcription audio as base64 JSON:

```ts
body: JSON.stringify({ audioBase64: base64 })
```

Reference: `App.tsx:2045-2057`

The server currently uses:

```ts
app.use(express.json())
app.use(express.raw({ type: 'audio/*', limit: '25mb' }))
```

Reference: `server/index.mjs:13-15`

This means the raw-audio path is available on the server, but the app is not using it. Larger recordings can fail at the JSON parser before the transcription handler gets useful input.

## Commit boundary

Files meant to stay in git:

- `.specifications/`
- `bun.lock`
- `app.json`
- `package.json`
- the generated iOS project files under `ios/`
- this document

Files intentionally kept out of git:

- `maintainers-review/`
- `node_modules/`
- `.expo/`
- `ios/Pods/`
- `ios/build/`
- `xcuserdata`
- `.xcode.env.local`
- `.xcresult`
