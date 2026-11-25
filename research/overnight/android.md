# Android track research (2026-11-26, 4 days to the Nov 30 2 PM PT deadline)

Legend: [V] verified from a fetched page (URL given), [R] verified in the repo (file:line), [U] unverified or from memory. Nothing was built or downloaded.
Plugin paths: APP = sprout/app/android/app/src/main/java/dev/sprout/kids/SproutAiPlugin.kt, NATIVE = sprout/native/android/SproutAiPlugin.kt. Line numbers are identical in both (the only diff is line 1, the package).

## 1. firebase-ai-ondevice status vs what the project pins

| Item | Latest (Nov 26) | Project pin | Verdict |
|---|---|---|---|
| firebase-ai | 18.2.0, Nov 11 2026, BoM 35.2.0 [V] firebase.google.com/support/release-notes/android | 18.2.0 (APP build.gradle:47) [R] | up to date |
| firebase-ai-ondevice | 16.0.0-beta08, Nov 11 2026 (still beta, no stable) [V] same page | 16.0.0-beta08 (build.gradle:48) [R] | up to date |
| BoM | 35.2.0 [V] | 34.6.0 (build.gradle:46) [R] | STALE, see below |

- Status: experimental, "no SLA or deprecation policy, could change in backwards-incompatible ways" [V] firebase.google.com/docs/ai-logic/hybrid/android/get-started. Docs say on-device needs SDK 17.10.0+ (BoM 34.10.0+) [V]. The project BoM 34.6.0 is below that, while the explicit firebase-ai:18.2.0 overrides only that one artifact. firebase-common, app-check and others stay at 34.6.0 versions, a mixed set that compiled but is untested at runtime. Fix: BoM 35.2.0 (one new download, needs the user's OK).
- DEPRECATED API in use: reference pages mark `FirebaseAIOnDevice`, `DownloadStatus`, `OnDeviceModelStatus` as deprecated, "use GenerativeModel.OnDeviceExtension from firebase-ai" [V] firebase.google.com/docs/reference/android/com/google/firebase/ai/ondevice/package-summary and .../FirebaseAIOnDevice. `GenerativeModel.onDeviceExtension` is a nullable `@PublicPreviewAPI` property [V] .../kotlin/com/google/firebase/ai/GenerativeModel. The OnDeviceExtension method names (checkStatus, download, warmUp) are only implied by the 18.0.0 release note "use onDeviceExtension?.warmUp()" [V]; exact signatures [U]. The plugin still compiles (HANDOFF "BUILD SUCCESSFUL"), but it is on the deprecated path.
- Changes since the project research (research/02) that matter [V release notes]:
  - ondevice beta05: on-device `generateObject` (structured output, needs `@Generable` + KSP). beta07 / firebase-ai 18.1.0: `systemInstruction` and `enableThinking` for on-device and hybrid. beta08 / 18.2.0: on-device function calling and multiple Text/Image parts.
  - firebase-ai 18.0.0: minSdk 24, `GenerativeBackend.vertexAI` removed (project uses `googleAI()`, fine). ondevice beta06 minSdk 24, so README line "needs API 26" is stale (project minSdk 26 is fine).
- OnDeviceConfig fields [V] firebase.google.com/docs/reference/kotlin/com/google/firebase/ai/OnDeviceConfig: mode (required), maxOutputTokens, temperature, topK, seed, candidateCount=1, modelOption (null), enableThinking. `modelOption` values STABLE (default), PREVIEW, PREVIEW_FAST; preview needs AICore Developer Preview [V] .../hybrid/android/configuration-options. The plugin sets only mode and maxOutputTokens.
- `GenerateContentResponse.inferenceSource: InferenceSource` exists, package `com.google.firebase.ai`, values ON_DEVICE / IN_CLOUD [V] reference page + configuration-options page. So the old "VERIFY" in plugin L129-130 is resolved.
- Limits [V get-started page]: single-turn only, 4000 tokens in, avoid outputs over 256 tokens, foreground only, English and Korean validated, per-app quota errors `BUSY` and `PER_APP_BATTERY_USE_QUOTA_EXCEEDED`, no console monitoring of on-device calls, SDK never auto-downloads the model.
- AICore Developer Preview: Settings > Developer options > AICore Settings > toggle; "Bypass quota limits" in the AICore app Settings tab (turn off afterwards, affects all apps) [V] developers.google.com/ml-kit/genai/aicore-dev-preview. Use it for filming so quota errors do not ruin a take.

## 2. Gemini Nano capable phones (Nov 2026)

Source for the whole list [V]: developers.google.com/ml-kit/genai (Prompt API device list). Availability "varies with RAM, OS version, AICore update status"; runtime check is `getBaseModelName()`.
Hackathon text says "Gemini Nano 4" (research/00 devpost-rules.txt:53), so target Nano 4 devices to be safe. Whether a Nano 2/3 phone is accepted by judges is [U].

- Nano 4: Pixel 10, 10 Pro, 10 Pro XL, 10 Pro Fold, Pixel 11 family; Samsung Galaxy S25, S25+, S25 Edge, S25 Ultra, S26, S26+, S26 FE, S26 Ultra, Z Flip7/Flip8, Z Fold7/Fold8/Fold8 Ultra, Z TriFold, Tab S12+/S12 Ultra; OnePlus 13, 13s, 15, 15R, Pad 3; iQOO 13, 15; vivo X200, X200 Pro, X200T, X300 (+FE, Pro, Ultra), X500 Pro/Pro Max, X Fold3 Pro/Fold5/Fold6; OPPO Find X8, X8 Pro, X9 series, Find N5/N6, X10; realme GT 7 Pro, GT 8 Pro; Motorola Edge 70 Pro/Pro+, Razr 60 Ultra, Razr Ultra 2025, Razr Fold; Honor Magic 7/7 Pro/8 Pro/V5/V6; POCO F9 Pro, X8 Pro Max; Sony Xperia 1 VIII; Sharp AQUOS R11; Xiaomi 15T Pro, 17T Pro; Lenovo tablets.
- Nano 3: Pixel 9, 9 Pro, 9 Pro XL, 9 Pro Fold; OPPO Reno 14 Pro, Reno 15 Pro series, Reno 16 Pro; realme GT 7T; Googlebooks.
- Nano 2: Xiaomi 15, 15 Ultra, 15T, 17 series; POCO F7 Ultra, F8 Pro/Ultra, X7 Pro, X8 Pro; Redmi Turbo 5; vivo T4 Ultra, X200 FE; realme GT 7.
- Note: the ML Kit overview page and older cached copies disagree on tiers for S25/OnePlus 13 (search result summary), the fetched current page above is the one used.

Borrowable in India (sold widely in India is [U], from memory; list membership is [V]):
1. Samsung Galaxy S25 / S25 Ultra / Z Flip7 (very common among students' families, Nano 4). Best first ask.
2. OnePlus 13 / 13s, iQOO 13 (popular enthusiast phones, Nano 4). iQOO 15, OnePlus 15R if anyone has the newest.
3. vivo X200 / X200 FE / X300, OPPO Find X8 / X9 (Nano 4, FE variants are Nano 2).
4. Pixel 10 (Nano 4; official India sale since Aug 2025 [U]; GSMArena pre-launch price INR 79,999 for 256 GB; Cashify lists refurbished units [V search result], prices change daily). Pixel 9 is Nano 3 only.
5. Avoid Xiaomi/Honor China-ROM units: AICore comes through Google Play services, so a phone without Play may not get the model [U].
Ask-script: need the phone for about 2 hours, Wi-Fi, one APK install (USB debugging on, the owner can turn it off after), model download is 1-3 GB [U size].

## 3. Free real-device options

| Option | Nano / AICore works? | Record the screen? | Notes |
|---|---|---|---|
| Samsung Remote Test Lab (developer.samsung.com/remote-test-lab) | UNVERIFIED. Page lists Galaxy Z Fold8, Z Flip8, S26 Ultra (all on the Nano 4 list), Tab S11, QLED TV; S25 not listed [V]. No source says AICore or model download works on those units. | Old Java client has Screen > Capture and Record [V] developer.samsung.com/sdp/blog/en/2021/02/18/get-started-with-remote-test-lab-for-mobile-app-testing. Current web client: not covered [U]. Fallback: record your own monitor with Xbox Game Bar. | Free, Samsung account needed, credit-based time (anecdotally 2 credits per 30 min, [U], forum). APK drag and drop [V]. ADB not available in the web client as of 2021 [V]. Wi-Fi and Google sign-in limits [U]. Loan devices are wiped, so a Nano download may need Play account and be slow. |
| Android Device Streaming (Android Studio > Device Manager > Firebase) | UNVERIFIED. Catalog shows Pixel 9a, 9, 9 Pro, 9 Pro XL, 9 Pro Fold (Nano 3, not Nano 4) plus partner-lab Samsung, OnePlus, vivo, OPPO, Xiaomi devices [V] developer.android.com/studio/run/android-device-streaming. Pixel 10 not listed there [V]. | Real adb over SSL, so `adb install`, logcat and `adb shell screenrecord` work [inferred, U]. | Spark: 30 free min per project per month [V] firebase.google.com/docs/test-lab/usage-quotas-pricing. Needs Android Studio (installed per HANDOFF on D:\dev). Best option to see `inferenceSource` in logcat. Check the catalog for a partner S25/OnePlus 13. |
| Firebase Test Lab (Robo or instrumentation) | UNVERIFIED, no source on AICore in Test Lab. | Test runs produce video [U]. Not interactive. | Spark: 5 physical + 10 virtual runs/day, no Blaze needed [V] same quota page. Device list via console or `gcloud firebase test android models list` [V]. Low value for a live Nano demo. |
| AWS Device Farm / BrowserStack / pCloudy free trials | pCloudy claims Pixel 9 with Nano, vendor marketing (research/07) [U]. | Usually yes [U]. | Trials need sign-up, some need a card. Lowest priority. |
| Borrow a phone | Yes, by definition. | `adb shell screenrecord` or the phone's recorder. | Only reliable path. Do this first, use remote labs as backup evidence. |

Plan: ask for a Galaxy S25 / OnePlus 13 / iQOO 13 today; in parallel try Device Streaming (30 min) and RTL S26 Ultra to learn if AICore status becomes `downloadable`. Emulators have no AICore (research/07).

## 4. Plugin and registration review

Registration is correct: MainActivity.java:10 `registerPlugin(SproutAiPlugin.class)` before `super.onCreate` [R], same package, name "SproutAi" matches capacitorAi.ts:25 [R] and the Capacitor docs [V] capacitorjs.com/docs/android/custom-code.

High risk
1. No App Check installation anywhere in app/android (grep for AppCheck/FirebaseApp found nothing) [R]. README step 8 says enforcement is on since Nov 2, so every cloud call (prefer_device fallback, referee, simplify) will be rejected until `installAppCheckProviderFactory` runs in MainActivity before the first call. Debug builds need the debug provider and a registered token. Fix location: MainActivity.java before super.onCreate.
2. Build.gradle:46 BoM 34.6.0 vs firebase-ai 18.2.0 (section 1). Runtime NoSuchMethodError possible. Not run-tested.
3. AndroidManifest.xml:5 `android:allowBackup="true"` [R]. For a kid-safe app that promises data stays on the device, Android auto-backup can copy WebView localStorage/IndexedDB (chat history, parent PIN hash) to Google Drive. Set false and add data extraction rules. Contradicts the privacy pitch otherwise.
4. google-services.json is absent [R: file missing], and build.gradle:60-67 silently skips the plugin. Without it `Firebase.ai(...)` (plugin L158) throws at the first generate; deviceStatus still works. The phone app is Demo mode until `VITE_NATIVE_FIREBASE=true` (state.tsx:45), so the first real device run must be built with both.

Medium
5. L58 and L15-18: deprecated `FirebaseAIOnDevice` / `DownloadStatus` / `OnDeviceModelStatus`; migrate to `onDeviceExtension` (nullable) when convenient. A null `onDeviceExtension` is itself a useful "unavailable" signal.
6. L65-67: deviceStatus swallows every exception into "unavailable", hiding the cause (missing AICore, old OS). Return a `reason` string for the Device check screen. Also status is checked against the default STABLE model, not the `modelOption` you may later set, [U] if they differ.
7. L75-96 prepareDevice: no guard against a second concurrent download (double tap launches two collectors); no `AVAILABLE` short-circuit; no throttle on progress events (every chunk calls notifyListeners, L100); `DownloadFailed` message is dropped (L88, the event likely carries an exception, [U]); no `warmUp()` after completion so the first guard call pays model load time. Docs: download is never automatic [V].
8. L173 and L158-160: cloud model name is a constant, so Remote Config `cloud_model` cannot change it (README says keep in sync by hand). Pass it from JS or read it in the plugin.
9. L148-168 JSON tasks: schema is only appended to the prompt (L118-121). On the cloud path no `responseMimeType = application/json`, so replies may arrive in code fences (JS repair exists, pipeline/json.ts per README). Also no `temperature` (guard and referee should be deterministic): `OnDeviceConfig` accepts `temperature`, `topK`, `seed` [V]. Consider `systemInstruction` for the safety rules (supported on-device since firebase-ai 18.1.0 [V]) instead of prompt concatenation, and `enableThinking = false` for the guard to cut latency (default [U]).
10. L142-144 / L93-94: all errors become plain messages. JS cannot tell `BUSY` / quota (retry or fall back to cloud for non-private work) from a real failure. Use `call.reject(msg, code)` and map the Firebase error code [V names: BUSY, PER_APP_BATTERY_USE_QUOTA_EXCEEDED]. Also `catch (e: Exception)` catches `CancellationException` (rethrow it).

Low
11. L42 `Dispatchers.Main`: Capacitor runs @PluginMethod on its own handler thread [U, from memory], and the plugin hops to Main. Works because the SDK calls are suspend and non-blocking; there are no heavy CPU steps. Cleaner: `Dispatchers.Default`. The `models` HashMap (L43) is only touched from Main, so it is safe today.
12. L45-48: `handleOnDestroy` cancels the scope, so in-flight JS promises never settle. Activity recreation is suppressed by `configChanges` (Manifest:13), so this only matters on a real destroy.
13. L131-135 inferenceSource: correct and fail-safe (unknown value counts as "cloud" unless only_device). With the enum having exactly two values the `else` is dead code. Note the SDK can silently fall back to cloud under PREFER_ON_DEVICE, so the redaction gate in TS must stay; 18.0.0 fixed a fallback bug [V release notes].
14. L26 `import kotlinx.coroutines.flow.collect` is unnecessary on current coroutines (1.10.2, build.gradle:51).
15. Two copies drift: NATIVE:1 still says `package app.sprout.ai` and stale `VERIFY` comments (L13-14, 56, 80, 115-116, 129, 160), while the compiled APP copy has dev.sprout.kids [R diff]. README step 7 omits the BoM. Re-sync NATIVE from APP before submission (judges read the repo).
16. No timeout or cancel for native calls; the TS 20 s timeout leaves the native request running. Not a leak on Android, just wasted quota.

## 5. Android ideas that raise judge scores (all zero cost)

1. "Prove it is offline" panel (2-3 h). In Parent > Device check show live: airplane mode / connectivity (navigator.onLine or ConnectivityManager), model status, the `source: device` chip and latencyMs per answer; the demo video shows airplane mode on, an answer arriving with a green "ran on this phone" chip. Needs only plugin fields already returned plus a JS panel.
2. Voice input for kids who cannot type (5-7 h). Native `SpeechRecognizer` (`createOnDeviceSpeechRecognizer`, API 31+, EXTRA_PREFER_OFFLINE [U]) wrapped in 2 more plugin methods with RECORD_AUDIO via Capacitor `@Permission`. The WebView has no reliable Web Speech API [U], so a native method is needed. A community plugin would be a new dependency, ask first. Caveat: Nano is validated for English and Korean only [V]; Hindi speech should route to cloud-safe mode and say so honestly.
3. Model transparency card (2 h). Show AICore status, `getOnDeviceModelName` (added in beta04 per search result [V-ish]) or `getBaseModelName()` (ML Kit page [V]) and the download progress with a "Wi-Fi recommended" hint; call warmUp after download. Pairs with the existing DEVICE check screen and gives judges proof that real Nano 4 ran.
4. Measured on-device numbers (3-4 h, needs the borrowed phone). Run the existing 473-question eval through the plugin on the phone and publish guard accuracy, median latency and % served on-device, per research/PLAN D2-D3. Real hardware numbers are the strongest "hybrid" evidence in the video and Devpost text.
5. Privacy hardening shown in the README (2 h): `allowBackup=false` + data extraction rules, `usesCleartextTraffic=false`, FLAG_SECURE only on the parent PIN screen (toggle it off while filming), App Check on. Gives a concrete Android "privacy by design" slide and fixes risk 3 above.
6. Bonus (1 h): error-code mapping (risk 10) plus a friendly "Sprout is resting, trying the big brain" state for BUSY/quota; before filming enable AICore "Bypass quota limits".

Immediate order of work (4 days): fix risks 1-4 (App Check, BoM, allowBackup, google-services + `VITE_NATIVE_FIREBASE`), get a Nano 4 phone, run risks 7-10 fixes while filming prep, then ideas 1, 3, 4.

Sources: firebase.google.com/docs/ai-logic/hybrid/android/get-started; .../hybrid/android/configuration-options; firebase.google.com/support/release-notes/android; firebase.google.com/docs/reference/kotlin/com/google/firebase/ai/OnDeviceConfig, .../GenerateContentResponse, .../GenerativeModel; firebase.google.com/docs/reference/android/com/google/firebase/ai/ondevice/FirebaseAIOnDevice; developers.google.com/ml-kit/genai; developers.google.com/ml-kit/genai/aicore-dev-preview; developer.samsung.com/remote-test-lab; developer.samsung.com/sdp/blog/en/2021/02/18/get-started-with-remote-test-lab-for-mobile-app-testing; developer.android.com/studio/run/android-device-streaming; firebase.google.com/docs/test-lab/usage-quotas-pricing; capacitorjs.com/docs/android/custom-code.
