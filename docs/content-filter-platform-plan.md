# Content Filter Platform Plan

## Shared app layer

- React Native `Plan` tab stores:
  - enabled
  - safe search
  - strict mode
  - blocked categories
- Same UX is used on Android and iOS.

## Android path

- Native bridge: `ContentFilterModule.kt`
- Native config store: `ContentFilterPrefs.kt`
- Native service entry point: `ContentFilterVpnService.kt`
- Current state:
  - config sync is implemented
  - VPN permission flow is implemented
  - service controls are implemented
  - a split-tunnel DNS VPN is implemented
  - DNS requests are proxied through Steady Path
  - blocked domains are answered locally with a blocked DNS response
  - runtime stats are exposed back to the app (`blockedRequestCount`, `lastBlockedDomain`)
  - current category enforcement is domain-list based, not a third-party classification engine

## iOS path

- Shared settings UI is implemented in React Native.
- Native enforcement still requires:
  - Apple Network Extension entitlement approval
  - content-filter provider implementation from macOS/Xcode
  - device provisioning and signing for that entitlement

## Current limitation

The repo now contains real Android DNS filtering, but iOS still needs Apple Network Extension entitlements and native implementation from a macOS/Xcode environment.
