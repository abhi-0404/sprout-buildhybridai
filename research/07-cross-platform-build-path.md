# Cross-platform build path (Windows-only developer)

## Hardware check (2026-11-14)
| Item | Value |
|---|---|
| CPU | Intel Core 5 210H, 8 cores |
| RAM | 15.7 GB |
| GPU | RTX 3050 Laptop, **4.0 GB VRAM** |
| Free disk | C: 78 GB, D: 145 GB |
| Chrome | 157 |

Chrome requires a GPU with **strictly more than 4 GB** of VRAM, so this GPU fails that rule. The CPU path (16 GB RAM) is borderline. To check:
- open `chrome://on-device-internals`
- run `await LanguageModel.availability()`

The `chrome://flags/#optimization-guide-on-device-model` setting "Enabled BypassPerfRequirement" may work around the check, but this is unverified.

## Frameworks
- Firebase hybrid is documented only for native Swift, native Kotlin and Web JS.
- No hybrid support exists in Flutter `firebase_ai`, React Native, or KMP (community wrappers only).
- **Capacitor gives the best reuse with web code.** Write a thin custom plugin (about 100-200 lines each) in Kotlin (`OnDeviceConfig`) and Swift (Firebase 12.x `HybridModel`).
- Ionic `@capacitor/local-llm` and `@capgo/capacitor-llm` wrap the on-device models, but not Firebase.

## iOS without a Mac
- Hosted VMs (GitHub Actions, Codemagic, EAS) cannot run Apple Intelligence: availability returns `.deviceNotEligible`. Use them for building only.
- The iOS Simulator forwards model calls to the host Mac, which needs macOS Tahoe or later with Apple Intelligence enabled.
- Bare-metal rental options:
  - Scaleway M4: about €5.28/day, 24-hour minimum.
  - AWS mac-m4.metal: about $30/day, and you must request quota first.
  - Whether Apple Intelligence can be enabled on these is **unverified**.
- Codemagic: 500 free macOS minutes.
- TestFlight needs the $99/year Apple Developer Program.

## Android without a phone
- Emulators do **not** run AICore / Gemini Nano. Only the cloud path works there.
- Nano 4 devices: Pixel 10/11, Galaxy S25/S26, Z Fold/Flip 7/8.
- Samsung Remote Test Lab is free and offers the S26, but whether AICore works there is unverified.
- pCloudy claims Pixel 9 with Nano (vendor marketing).

## Recommended
- One Vite + TypeScript web app wrapped by Capacitor, with a single `generate()` adapter.
- Order of work: Web, then Android, then iOS.
- To film real on-device inference:
  - Web: your own laptop, if the check passes.
  - Android: a borrowed Pixel 10 or Galaxy S25 for one day.
  - iOS: a rented M4 for 1-2 days, or a borrowed iPhone 15 Pro or newer.

## Sources
- https://firebase.google.com/docs/ai-logic/hybrid
- https://pub.dev/packages/firebase_ai/changelog
- https://dev.to/malik_chohra/firebase-hybrid-inference-gemini-nano-what-changed-for-react-native-at-io-2026-1935
- https://capacitorjs.com/docs/apis/local-llm
- https://capgo.app/blog/gemini-nano-capacitor-app/
- https://developer.apple.com/forums/thread/790860
- https://developer.apple.com/forums/thread/787199
- https://developers.google.com/ml-kit/genai
- https://developer.chrome.com/docs/ai/get-started
