# Steady Path

Steady Path is an Expo React Native recovery app with a Bun-native TypeScript coach backend. The mobile app now lives under `src/`, the local API lives under `server/src/`, and the repo contains Android native DNS-filter code plus a generated iOS project for rendering the shared app shell.

## Read this first

- `AGENTS.md`: repo operating guide for coding agents, architecture boundaries, invariants, and verification rules.
- `docs/README.md`: technical runtime notes, commands, backend wiring, iOS notes, and commit boundaries.
- `.specifications/specifications.md`: current implementation-level product and system specification.
- `docs/content-filter-platform-plan.md`: Android DNS-filter path vs current iOS limitation.

## Current architecture

- `App.tsx` is intentionally thin and forwards to `src/app/AppRoot.tsx`.
- `src/app/` owns bootstrap, persisted session state, and app-level services.
- `src/navigation/` owns the onboarding navigator and the six-tab app shell.
- `src/features/` owns isolated screens and feature logic for onboarding, today, check-ins, insights, coach, protection, reminders, and storage.
- `src/domain/` owns shared models and storage constants.
- `src/ui/` owns reusable mobile UI primitives.
- `server/src/` owns the Bun server, typed handlers, services, repositories, DTOs, and tests.
- `android/app/src/main/java/com/steadypath/app/` owns the Android DNS-filter bridge and VPN service.
- `ios/` is the generated Expo native iOS project used for local iOS builds and development builds.

## Runtime requirements

- Bun `1.3.11` is the package manager and runtime expected by this repo.
- Expo CLI is used for the app shell.
- Full Xcode and CocoaPods are required for local iOS native builds.
- Android Studio / Android SDK are required for local Android native builds.

## Install

```bash
cd /Users/macbook/Desktop/workspace/collabs/dev_app
bun install
```

Only `.env.example` should be committed. Keep real secrets in `.env`, `.env.local`, or shell exports.

## Run the backend

```bash
cd /Users/macbook/Desktop/workspace/collabs/dev_app
export OPENAI_API_KEY="sk-..."
export PORT=8787
bun run api
```

Optional:

```bash
export CORS_ALLOW_ORIGIN="*"
```

Health check:

```bash
curl http://127.0.0.1:8787/health
```

## Run the app

Shared UI in Expo Go:

```bash
cd /Users/macbook/Desktop/workspace/collabs/dev_app
export EXPO_PUBLIC_COACH_API_URL="http://<your-host-ip>:8787"
bunx expo start --go --lan -c
```

Development build for native-only paths:

```bash
cd /Users/macbook/Desktop/workspace/collabs/dev_app
export EXPO_PUBLIC_COACH_API_URL="http://<your-host-ip>:8787"
bun run start:dev
```

Local iOS native run:

```bash
cd /Users/macbook/Desktop/workspace/collabs/dev_app/ios
pod install

cd /Users/macbook/Desktop/workspace/collabs/dev_app
bun run ios
```

Local Android native run:

```bash
cd /Users/macbook/Desktop/workspace/collabs/dev_app
bun run android
```

## Verification

```bash
cd /Users/macbook/Desktop/workspace/collabs/dev_app
bun run lint
bun run typecheck
bun test
```

CI runs the same checks on every push and pull request.

## Current platform status

- Text coach, reminders, onboarding, check-ins, and insights are shared React Native features.
- The coach backend is a separate Bun server. Expo QR scanning does not expose that server automatically; the app still needs a reachable `EXPO_PUBLIC_COACH_API_URL`.
- Text coach falls back to deterministic local replies when the backend is unavailable.
- Voice transcription and realtime voice depend on the backend.
- Android has a real native DNS-filter VPN implementation.
- iOS can render the shared app and run coach/reminder flows, but it does not have a native content-filter implementation or Network Extension target.
- Expo Go is useful for shared UI validation. Native-only features such as `react-native-webrtc` and the Android content-filter bridge require a development build.
