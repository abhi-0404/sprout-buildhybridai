# iOS free path for judges (2026-11-26)

[V] verified, [U] unverified.

## 1. Appetize and alternatives
- Free plan exists: 30 min/month, 3 min per session, 2 active devices, throttled capacity (queue). Starter is $59/mo, out of budget. [V] https://appetize.io/pricing
- Billing counts total streaming time for all your apps, so every judge session drains the same 30 min (about 10 sessions total). [V] same page.- Anyone with a build link can run the app by default; the "latest build" link is org-only, so share the build link. [V] https://docs.appetize.io/platform/sharing-apps.md . Free plan allowing public links is not stated [U].
- Upload: zip or tar.gz of a simulator .app only; device .ipa unsupported; ARM simulator build recommended. [V] https://docs.appetize.io/platform/app-management/uploading-apps/ios.md
- iOS 26.0 and 27.2 offered on all listed iPhones (15 Pro to 17 Pro). [V] https://docs.appetize.io/features/devices-and-os-versions.md
- CI upload: `curl -X POST https://api.appetize.io/v1/apps -H "X-API-KEY: $KEY" -F file=@App.zip -F platform=ios -F appPermissions.run=public`; update via `/v1/apps/PUBLICKEY`. [V] https://docs.appetize.io/rest-api/v1/direct-file-uploads.md
- Alternatives: Expo Simulators is paid only [V] https://docs.expo.dev/eas/simulators/reference/usage-and-billing/ . BrowserStack, LambdaTest, Corellium: no verified free public share link [U]. Treat Appetize as the only option.

## 2. Build commands (macos-26, after `pnpm build` and `cap sync ios`)
Flags adapted from https://docs.codemagic.io/yaml-code-signing/ios-simulator-builds.md [V]. Project path, scheme `App`, ARCHS, derivedDataPath are [U]. Capacitor SPM projects have no workspace [V] https://capacitorjs.com/docs/ios/spm
```
xcodebuild build -project ios/App/App.xcodeproj -scheme App -sdk iphonesimulator \
  -configuration Debug -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath build ARCHS=arm64 ONLY_ACTIVE_ARCH=NO \
  CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO CODE_SIGNING_ALLOWED=NO
cd build/Build/Products/Debug-iphonesimulator && zip -r -y App.zip App.app
```
Unsigned IPA for Sideloadly (pattern per https://dev.to/oivoodoo/build-unsigned-ios-ipa-to-install-via-sideloadly-236f [V], exact flags [U]):
```
xcodebuild archive -project ios/App/App.xcodeproj -scheme App -configuration Release \
  -sdk iphoneos -archivePath build/App.xcarchive \
  CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO CODE_SIGNING_ALLOWED=NO
mkdir Payload && cp -R build/App.xcarchive/Products/Applications/App.app Payload/ && zip -r App.ipa Payload
```

## 3. What works in the simulator
- Foundation Models in Simulator needs a host Mac on Tahoe with Apple Intelligence on; VMs report `.deviceNotEligible`. [V forum] https://developer.apple.com/forums/thread/787199 . Appetize does not document it [U]; expect unavailable.
- Prefer-on-device mode falls back to the cloud model automatically. [V] https://firebase.google.com/docs/ai-logic/hybrid/ios/configuration-options . Appetize therefore shows the cloud Gemini path, never the on-device chip.
- App Check: use `AppCheckDebugProviderFactory` before `FirebaseApp.configure()` and register the debug token. [V] https://firebase.google.com/docs/app-check/ios/debug-provider . A token in a public build is exposed: leave App Check unenforced during judging, or revoke the token after.
- Outbound network from Appetize: not stated; its traffic monitor captures app API calls, so likely yes. [U] https://docs.appetize.io/features/network-traffic-monitor.md . Smoke test in the first session.

## 4. Free Apple ID signing (Sideloadly, Windows)
Works from Windows (web iTunes, Developer Mode on). 7-day expiry, 3 apps, 10 new App IDs per 7 days. [V] https://sideloadly.io/faq . No push or iCloud on free teams [V-secondary] https://expo.dev/blog/apple-developer-program-explained-free-vs-paid . App Attest on a free team: unconfirmed [U]. Needs an iPhone you own or borrow; judges cannot install it.

## 5. Ranking
1. Appetize public build link uploaded by CI, plus a 3 min video. Record once, state the minute limit in Devpost.
2. Public repo with green macos-26 run and downloadable simulator .app and unsigned IPA artifacts (proves the Swift plugin compiles).
3. Borrow an iPhone 15 Pro or newer, Sideloadly the IPA, film the real on-device chip.

Needs $99: TestFlight or App Store links judges can install, production App Attest, judges running the on-device model themselves. With enrollment plus Beta App Review (see ios.md) this likely misses Nov 30 anyway. Rules allow judging on text, images and video alone (ios.md), so $0 is credible. Whether Best iOS weighs a real install is [U].
