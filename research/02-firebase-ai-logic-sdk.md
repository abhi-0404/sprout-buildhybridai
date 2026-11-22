# Firebase AI Logic hybrid inference: technical brief (as of 2026-11-13)

Research agent findings. Verified points are noted in the "Verified locally" section at the end.

## Critical findings
1. **iOS:** Firebase Apple SDK 13.0.0 (Oct 7 2026) **removed** `HybridModel`, `SystemLanguageModel` and `generativeModelSession`.
   - The replacement, `ai.geminiLanguageModel(name:)` inside Apple's `LanguageModelSession`, needs iOS 27 / Xcode 27, is in preview, and has **no automatic fallback**.
   - Pin 12.x (12.13 or later, below 13) to use `HybridModel`.
   - Sources: https://firebase.google.com/support/release-notes/ios and https://github.com/firebase/firebase-ios-sdk/pull/16693
2. **App Check:** enforcement became mandatory for AI Logic on Nov 2 2026. The debug provider is allowed.
3. **Chrome version:** the docs conflict. Firebase says Chrome 139 or later plus a flag; the Chrome docs say the Prompt API has been stable on the web since Chrome 148.

## API by platform
**Web** (firebase 13.x; modes PREFER_ON_DEVICE, ONLY_ON_DEVICE, PREFER_IN_CLOUD, ONLY_IN_CLOUD):
```js
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode } from "firebase/ai";
const ai = getAI(app, { backend: new GoogleAIBackend() });
const model = getGenerativeModel(ai, {
  mode: InferenceMode.PREFER_ON_DEVICE,
  inCloudParams: { model: "gemini-3.8-flash", generationConfig: {...} },
  onDeviceParams: { createOptions: { expectedInputs:[{type:"text",languages:["en"]}] },
                    promptOptions: { responseConstraint: jsonSchema } } });
model.initializeDeviceModel(p => ...);   // must follow a user gesture (breaking change, PR 9800)
const r = await model.generateContent(prompt);
r.response.inferenceSource;              // "on_device" | "in_cloud"
```

**Android** (`firebase-ai:18.2.0`, `firebase-ai-ondevice:16.0.0-beta08` which is not in the BoM, API level 26 or later, experimental):
```kotlin
val model = Firebase.ai(backend = GenerativeBackend.googleAI()).generativeModel(
  modelName = "gemini-3.8-flash",
  onDeviceConfig = OnDeviceConfig(mode = InferenceMode.PREFER_ON_DEVICE, maxOutputTokens = 200,
      modelOption = OnDeviceModelOption.PREVIEW))
FirebaseAIOnDevice.checkStatus()  // UNAVAILABLE | DOWNLOADABLE | DOWNLOADING | AVAILABLE
FirebaseAIOnDevice.download().collect { ... }   // the SDK never downloads the model by itself
r.inferenceSource                 // ON_DEVICE | IN_CLOUD
```
Structured output uses `generateObject()` with KSP `@Generable`.

**iOS** (12.x, Swift Package Manager only):
```swift
let session = ai.generativeModelSession(model: .hybridModel(
    primary: FirebaseAI.SystemLanguageModel.default,
    secondary: ai.geminiModel(name: "gemini-3.8-flash")))
let r = try await session.respond(to: "...")
r.rawResponse.modelVersion  // "apple-foundation-models-system-language-model" or the Gemini model name
```

## What runs on-device
| Capability | Web | Android | iOS 12.x |
|---|---|---|---|
| Text in/out, streaming | yes | yes | yes |
| Image input | JPEG/PNG | 1 bitmap | no |
| Audio, video, PDF | cloud | cloud | cloud |
| Structured JSON | yes | yes (KSP) | yes |
| Function calling | no | merged in PR 8758 (release not confirmed) | yes |
| Multi-turn chat | no | no | yes |
| Token limit | 9,216 | 4,000 | 4,096 |
| Languages | en, es, ja, de, fr | en, ko validated | per Apple Intelligence |

- **Never on-device, and not in hybrid at all:** Live API, server prompt templates, countTokens.
- **Never on-device:** image generation, and tools (Search grounding, URL context).
- The Firebase console does **not** show on-device calls.
- Android and iOS on-device inference runs in the **foreground only**.
- Android AICore enforces a per-app quota: `BUSY` and `PER_APP_BATTERY_USE_QUOTA_EXCEEDED`.

## Hardware
- **Chrome:**
  - Windows, macOS 13 or later, Linux, or ChromeOS Plus.
  - 22 GB free disk.
  - GPU with **strictly more than 4 GB VRAM**, or CPU with 16 GB RAM and 4 or more cores.
  - Check status at `chrome://on-device-internals`.
- **Android, Nano 4:** Pixel 10/11, Galaxy S25/S26, Z Fold/Flip 7/8, OnePlus 13/15, and others. The Pixel 9 has Nano 3. Preview models require enrolling in the AICore Developer Preview.
- **iOS:** iPhone 15 Pro, 16 and 17, with Apple Intelligence on and iOS 26 or later.
- **Emulators:** no official support. The cloud path works in emulators, and App Check needs the debug provider there.

## Cloud models
| Tier | Models |
|---|---|
| Free (Spark) | gemini-4-hydrogen, gemini-3.8-flash, gemini-3.5-flash-lite, TTS models, Live preview |
| Billing required | gemini-4-argon / carbon, image models |

- Search grounding: 1,500 requests per day by default.
- The AI Logic gateway allows 100 requests per minute per user by default.

## Samples and skills
- **Agent skills:** https://github.com/firebase/agent-skills.
- **Android sample:** https://github.com/android/ai-samples/tree/main/ai-sample-catalog/samples/gemini-hybrid
- **Quickstarts:** quickstart-android `firebase-ai` (has a `feature/hybrid` folder), quickstart-js `ai`, quickstart-ios `firebaseai`.
- **Community:** peterfriese/HybridAITalk and Idadelveloper/mind-the-ai-gap.

## Verified locally (2026-11-14, installed firebase 13.3.0 / @firebase/ai 3.1.0)
- `InferenceMode` = `prefer_on_device | only_on_device | only_in_cloud | prefer_in_cloud`.
- `InferenceSource` = `on_device | in_cloud`, returned on the response.
- `GenerativeModel.initializeDeviceModel(onDownloadProgress?)` exists.
- `OnDeviceParams.promptOptions.responseConstraint` exists.
- `GenerationConfig.responseJsonSchema` exists.

## Sources
- https://firebase.google.com/docs/ai-logic/hybrid
- https://firebase.google.com/docs/ai-logic/hybrid/web/get-started
- https://firebase.google.com/docs/ai-logic/hybrid/android/get-started
- https://firebase.google.com/docs/ai-logic/hybrid/ios/get-started
- https://firebase.google.com/docs/ai-logic/production-checklist
- https://developer.chrome.com/docs/ai/prompt-api
- https://developers.google.com/ml-kit/genai
