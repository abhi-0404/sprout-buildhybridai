# iOS: SproutAi Capacitor plugin

Swift plugin that calls Firebase AI Logic **hybrid inference** on iOS (Apple's on-device model, with Gemini in the cloud as the other side) and reports where each request ran. It implements the `SproutAiPlugin` interface in `app/src/ai/capacitorAi.ts`.

Status: source only, not built on the machine that wrote it (no Xcode there). Lines marked `VERIFY:` in `SproutAiPlugin.swift` are API names the official page does not print; fix them against the compiler.

Docs: https://firebase.google.com/docs/ai-logic/hybrid/ios/get-started

## Why Firebase 12.x and not 13
Firebase Apple SDK 13.0.0 (Oct 7 2026) **removed** `HybridModel`, `FirebaseAI.SystemLanguageModel` and `generativeModelSession`. The replacement (`ai.geminiLanguageModel(name:)` used inside Apple's `LanguageModelSession`) needs iOS 27 and Xcode 27, is in preview, and has no automatic fallback between device and cloud. Hybrid routing only exists in 12.x, so the package is pinned to `12.13.0 ..< 13.0.0`.
Sources: https://firebase.google.com/support/release-notes/ios and https://github.com/firebase/firebase-ios-sdk/pull/16693

## Requirements
- A Mac with Xcode 26 or newer. Hybrid is Swift Package Manager only (no CocoaPods).
- Device: iPhone 15 Pro or newer with iOS 26+ and Apple Intelligence turned on, to see `device` results. The Simulator forwards model calls to the host Mac, so the host Mac needs macOS Tahoe or later with Apple Intelligence enabled. Without it, only the cloud path runs.
- On-device inference is text only and runs in the foreground only.

## Steps
Run from `app/` (pnpm only; run the Xcode steps on the Mac):

1. Add the Capacitor iOS platform:
   ```
   pnpm add @capacitor/ios
   pnpm exec cap add ios
   ```
2. Build and sync the web app: `pnpm build` then `pnpm exec cap sync ios`.
3. Open `app/ios/App/App.xcodeproj` in Xcode (VERIFY: recent Capacitor versions may default to Swift Package Manager; if the project uses CocoaPods, open `App.xcworkspace` instead, and still add Firebase through SPM).
4. Add the Firebase package: File > Add Package Dependencies > `https://github.com/firebase/firebase-ios-sdk`, Dependency Rule **Range** from `12.13.0` to `13.0.0` (exclusive), or **Up to Next Major Version** with `12.13.0`. In `Package.swift` form: `.package(url: "https://github.com/firebase/firebase-ios-sdk", "12.13.0"..<"13.0.0")`. Never let it resolve to 13.x. Add the products to the App target: `FirebaseAILogic`, `FirebaseAppCheck`, `FirebaseCore`. VERIFY the product name `FirebaseAILogic` in the package product list.
5. Copy `native/ios/SproutAiPlugin.swift` into `app/ios/App/App/` and add it to the App target.
6. Register the plugin. With Capacitor 8 a plugin that is part of the app target is registered from a custom bridge view controller:
   ```swift
   import Capacitor

   class ViewController: CAPBridgeViewController {
       override open func capacitorDidLoad() {
           bridge?.registerPluginInstance(SproutAiPlugin())
       }
   }
   ```
   Set this class as the Custom Class of the view controller in `Main.storyboard`. VERIFY against the Capacitor docs for your version: https://capacitorjs.com/docs/ios/custom-code
7. Firebase config: download `GoogleService-Info.plist` from the Firebase console (iOS app, bundle id must match) and add it to the App target. Do not commit it if it holds anything private; `.gitignore` it.
8. App Check (required by AI Logic; enforcement is on since Nov 2 2026). In `AppDelegate.application(_:didFinishLaunchingWithOptions:)`, set the provider factory **before** `FirebaseApp.configure()`:
   ```swift
   #if DEBUG
   AppCheck.setAppCheckProviderFactory(AppCheckDebugProviderFactory())
   #else
   AppCheck.setAppCheckProviderFactory(AppAttestProviderFactory()) // VERIFY: custom factory class per Firebase docs
   #endif
   FirebaseApp.configure()
   ```
   For App Attest, enable the **App Attest** capability in Signing & Capabilities and register the app under Firebase console > App Check. For the Simulator and development, use the debug provider: run once, copy the debug token from the Xcode console, and add it under App Check > Apps > your iOS app > Manage debug tokens.
9. Run: `pnpm exec cap run ios` or press Run in Xcode, on a real iPhone or a Simulator.
10. In the app, switch the AI client to `CapacitorAi` when `isNativePlatform()` is true (done in `src/state.tsx`).

## Running without owning a Mac
- **Rented Mac (recommended for filming):** a bare-metal Scaleway Mac mini M4 (about 5 EUR per day, 24 hour minimum). Connect with Screen Sharing or VNC, install Xcode, clone the repo, `pnpm install`, then follow the steps above. In System Settings turn on **Apple Intelligence** on the host so the Simulator can reach the on-device model. Whether Apple Intelligence can be enabled on a rented Mac is **unverified**; if it cannot, borrow an iPhone 15 Pro or newer for one day and run on the device.
- **Codemagic (CI fallback):** 500 free macOS minutes per month. Use it to prove the project **builds** and to produce a TestFlight or ad hoc build. Hosted macOS VMs cannot run Apple Intelligence (availability reports `.deviceNotEligible`), so they only exercise the cloud path.
- TestFlight needs the $99/year Apple Developer Program.

## Behaviour notes
- Mode mapping: `prefer_device` = `HybridModel(primary: system model, secondary: Gemini)`, `prefer_cloud` = the two swapped, `only_device` = system model only, `only_cloud` = Gemini only.
- A new `GenerativeModelSession` is created for every request, because a session keeps chat history and Sprout is single-turn.
- The source is read from `response.rawResponse.modelVersion`: `apple-foundation-models-system-language-model` means the request ran on the device, anything else is a Gemini model name (cloud).
- `deviceStatus` comes from `SystemLanguageModel.default.availability`. Apple downloads the model itself, so `prepareDevice` only waits for it to be ready.
- On-device token limit is about 4096. Structured output: the plugin appends the JSON schema to the prompt; the TypeScript pipeline validates the result.
