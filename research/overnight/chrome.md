# Chrome / web track: Gemini Nano, Firebase hybrid JS, adapter review (2026-11-26)

Scope: Chrome desktop on-device path for Sprout. Claims carry a source URL or repo file. "UNVERIFIED" means not confirmed from an official page.

## 1. Status of Gemini Nano / Prompt API and the Firebase JS hybrid API

- Chrome docs list the Prompt API as Chrome 148 for the web and Chrome 138 for extensions. The page does not use the word "stable". Source: https://developer.chrome.com/docs/ai/prompt-api
- A Japanese news report dated 2026-05-27 says the Prompt API became stable in Chrome 148 and mentions no flags. Source: https://forest.watch.impress.co.jp/docs/news/2112093.html . I found no Chrome release note that says it outright, so treat "stable in 148" as likely but not officially confirmed.
- The Firebase hybrid page still says "Chrome 139+, Firebase AI Logic SDK 12.5.0+, flag `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` Enabled". Source: https://firebase.google.com/docs/ai-logic/hybrid/web/get-started . That flag is about multimodal input. Sprout is text-only, so it is probably not needed on 148+ (UNVERIFIED).
- Resolving the conflict noted in research/02: Chrome 148 or later needs no flag for normal hardware. Chrome 139-147 needs flags.
- Chrome sampling parameters (temperature, topK) for the web are only in an origin trial in 148. Source: Chrome Prompt API page above.
- Availability values the SDK handles: `available`, `downloadable`, `downloading`, `unavailable`. User activation is required for the download. `create()` triggers it. Source: Chrome Prompt API page.
- Prompt API is not available in Web Workers, and only in top-level windows or same-origin iframes unless `allow="language-model"` is set. Source: https://developer.chrome.com/docs/ai/prompt-api.md.txt
- Languages: en, es, ja, de, fr for expectedInputs and expectedOutputs. Unsupported ones may throw `NotSupportedError`. Source: same page.
- Firebase on-device limits: single-turn only, 9,216 tokens, JSON and enum structured output, no tools, no countTokens, calls not shown in the Firebase console. Source: the Firebase hybrid page above.
- Version check: `sprout/app/package.json:14` pins `"firebase": "^13.3.0"`. Installed is firebase 13.3.0 with @firebase/ai 3.1.0 (`sprout/app/node_modules/firebase/package.json`, `node_modules/.pnpm/@firebase+ai@3.1.0_*`). That satisfies the docs minimum of 12.5.0. `InferenceMode`, `InferenceSource`, `initializeDeviceModel(onDownloadProgress)`, `responseConstraint` and `responseJsonSchema` all exist in `ai-public.d.ts` (lines 613, 1118, 1668-1678, 1741). No mismatch.
- How the SDK picks the source (`@firebase/ai/dist/esm/index.esm.js:2560-2612`):
  - PREFER_ON_DEVICE: on-device only when `availability()` is `available` and the request is compatible. Otherwise cloud.
  - ONLY_ON_DEVICE: throws if unavailable.
  - PREFER_ON_DEVICE does NOT fall back to cloud if the on-device call itself throws (for example `QuotaExceededError`). The error propagates.
  - Every response carries `inferenceSource`, either `on_device` or `in_cloud`.

## 2. Hardware, bypass flag, 5-minute test

Official requirements (https://developer.chrome.com/docs/ai/get-started and the Prompt API page):
- OS: Windows 10/11, macOS 13+, Linux, ChromeOS on Chromebook Plus. Not Android or iOS.
- Disk: at least 22 GB free on the volume that holds the Chrome profile. The model is far smaller. If free space drops below 10 GB afterwards, the model is removed.
- GPU path: strictly more than 4 GB VRAM.
- CPU path: 16 GB RAM or more AND 4 or more cores. "Built-in models can run with GPU or CPU." Only audio input needs a GPU.
- Unmetered network for the first download.

Your laptop against that:
- A 4 GB GPU fails "strictly more than 4 GB". An Intel integrated GPU reports shared memory, which may or may not pass (UNVERIFIED).
- 15.7 GB shown by Windows is usually 16 GB installed minus reserved memory. Chrome may read it as under 16 GB and fail the CPU check (UNVERIFIED, the exact Chromium threshold is not documented).
- Core 5 210H has 8 cores, so the core count is fine (my recollection, UNVERIFIED).
- So the default probably says `unavailable`, and the bypass flag is the realistic route.

Bypass flag: `chrome://flags/#optimization-guide-on-device-model` set to "Enabled BypassPerfRequirement". Sources: the Chrome AI dev preview group post https://groups.google.com/a/chromium.org/g/chrome-ai-dev-preview-discuss/c/TFVnnmIoJPE and community guides. The official docs do NOT mention any flag or bypass, so this is community-confirmed, not official. Some users reported "NotAllowedError: The device is not eligible", fixed by updating the component in `chrome://components`. It only changes your own browser, so judges will not have it.

Steps (about 5 minutes plus download time):
1. Free space: make sure the drive holding `%LOCALAPPDATA%\Google\Chrome\User Data` has 22 GB or more free.
2. `chrome://settings/help`: confirm Chrome 148 or newer. Relaunch if it updates.
3. `chrome://flags/#optimization-guide-on-device-model` -> "Enabled BypassPerfRequirement".
4. `chrome://flags/#prompt-api-for-gemini-nano` -> Enabled. (Needed on 139-147. On 148+ it may no longer exist, so skip if absent.)
5. Optional: `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` -> Enabled (Firebase page asks for it).
6. Relaunch Chrome.
7. `chrome://components`: find "Optimization Guide On Device Model" and click "Check for update". If it is missing, step 8 usually creates it.
8. Open the Sprout dev page, then Parent area -> Settings -> Device check -> "Download model" (a click is required). Or in DevTools, click the page once, then run `await LanguageModel.availability()` and `await LanguageModel.create()`.
9. Watch `chrome://on-device-internals` (Broker State tab and model status) while it downloads. Expect "downloadable" then "downloading" then "available".
10. Test in DevTools: `await (await LanguageModel.create()).prompt('hi')`. Then use the "Run on device" button in Device check. It should log `ran on device`.
- If it stays `unavailable` after the flag: read the Broker State tab for the reason. Fallback plan is cloud-safe mode and a screen recording made on any machine that passes (borrowed laptop with a dGPU over 4 GB, or a streamed browser).

## 3. Adapter review: `sprout/app/src/ai/firebaseWeb.ts`

Correct:
- Hybrid call (lines 11-16, 33-53, 71-72): the four modes map to `InferenceMode`, `inCloudParams`/`onDeviceParams` are shaped as the SDK expects, and `responseConstraint` is used for JSON on-device.
- Source (lines 72-76): reads `res.response.inferenceSource`, which is the right property.
- `deviceStatus()` (lines 55-63): passes the same expectedInputs/expectedOutputs as the SDK's `createOptions`, which is what Chrome requires.
- `prepareDevice()` (line 66): calls `initializeDeviceModel(onProgress)` and the SDK converts Chrome's `downloadprogress` to `e.loaded`, a 0-1 fraction (index.esm.js:1099-1103). `DeviceCheck.tsx:63-67` renders it with aria.

Bugs and gaps:
1. firebaseWeb.ts:66 + 33-38: every (mode, schema) pair is its own `GenerativeModel` and own ChromeAdapter with its own `downloadPromise` (index.esm.js:1081-1111). `prepareDevice` only warms the `prefer_device|text` one. An `only_device` model created while status is `downloadable` skips waiting (index.esm.js:986-995 awaits a null promise) and then calls `create()` without a gesture, which errors. Low risk today because `sprout.ts:116` only sends device calls when `deviceReady`, but `DeviceCheck.tsx:72` "Run on device" is shown before the download. Fix: disable that button unless `deviceStatus === 'available'`, or call `initializeDeviceModel` on the model used.
2. state.tsx:76-78: `deviceStatus` is refreshed once on mount. If status is `downloading` (page reloaded mid-download, or the user started it in another tab), it never flips to `available` without a manual "Check again". Fix: poll `ai.deviceStatus()` every few seconds while `downloading`.
3. firebaseWeb.ts:42-43 vs 46-47: `temperature: 0` for the guard is a cloud-only setting. On-device sampling params are an origin trial in 148, so the on-device guard is not deterministic. `parseGuard` already fails closed, so this is a quality risk, not a safety hole. Mention it honestly in the README.
4. firebaseWeb.ts:47: `responseConstraint` consumes context window. Chrome offers `omitResponseConstraintInput` to save tokens (https://developer.chrome.com/docs/ai/prompt-api.md.txt). With a 9,216-token limit and long guard prompts, measure with `contextUsage`. Gap, not a bug.
5. firebaseWeb.ts:71: no streaming. `generateContentStream` exists on-device (index.esm.js:~1025) and would make kid answers feel instant. Needs a type change in `types.ts:28-34`. Optional.
6. firebaseWeb.ts:76: the fallback label `req.mode === 'only_device' ? 'device' : 'cloud'` is only hit if `inferenceSource` is undefined. In SDK 3.1.0 it is always set (index.esm.js:1724-1745), so it is dead code. Prefer throwing, so the privacy claim is never guessed.
7. firebaseWeb.ts:18: languages limited to `['en']`. Hinglish typed in Latin script is probably fine, but Hindi script is not supported by Nano (en, es, ja, de, fr only). Requests with other languages get `unavailable` and route to cloud-safe. Worth one line in the docs.
8. firebaseWeb.ts:56: `LanguageModel` is read from `globalThis`. This is correct for 148+. On 139-147 flagged builds it is also `LanguageModel`, but older guides use `window.ai`. No action.
9. No generation-time on-device error fallback: PREFER_ON_DEVICE rethrows (see section 1). `sprout.ts:122` has a 20 s timeout and fails closed, so it is safe. Consider one retry on `only_cloud` for the answer task only if the privacy gate allows it.
10. PWA: `public/manifest.webmanifest` has only an SVG icon, and there is no service worker (grep of `src`, `index.html`, `vite.config.ts` found none). HANDOFF says "PWA: installable". Desktop Chrome installability without a service worker or PNG 192/512 icons is UNVERIFIED. More important: the "go offline" demo only works while the page is already loaded. A reload while offline fails, which weakens the offline proof.

## 4. Web ideas for judge scores (all zero cost)

1. Real offline PWA, about 3 h. Hand-written `public/sw.js` with a cache-first app shell (no new dependency, so no approval needed). Add 192/512 PNG icons and `screenshots` to the manifest. Demo: install, turn on airplane mode, reload, ask a question, get an on-device answer with the device chip. This is the strongest "hybrid" proof. Note that a Vite hashed build needs the SW to cache `index.html` plus its hashed assets, so generate the list at build time or cache at runtime.
2. "Zero bytes left the device" network meter, about 2 h. A small panel using `PerformanceObserver('resource')` that counts requests to `firebaseai.googleapis.com` and `generativelanguage.googleapis.com` per turn. It shows 0 for an on-device turn and N for a cloud turn. It backs up the `cloudSaw` ledger with an independent browser-level measurement.
3. 90-second judged-demo recording protocol, about 1.5 h. One take: `chrome://on-device-internals` showing the model, DevTools Network set to Offline, a question with a name in it, the guard blocking, then back online and "the big brain added more". Judges often cannot run Nano (hardware limits above), so the video is the evidence. Also put a "Judge quickstart" box in the README: Chrome 148+, 22 GB, 16 GB RAM, or just use cloud-safe mode.
4. Streaming answers via `generateContentStream`, about 2-3 h. Makes the on-device path visibly fast, which helps a live demo. Touches `types.ts`, `firebaseWeb.ts`, the kid UI.
5. Chrome extension variant (MV3, Prompt API stable for extensions since 138), about 8-12 h. A side panel that redacts selected page text before sending it anywhere. Low value for the deadline and it duplicates the pipeline packaging. Recommend skipping unless everything else is done.

Suggested order given 4 days left: 3, 1, 2, then fixes 1-2 from section 3 (about 1 h combined).

## Sources
- https://developer.chrome.com/docs/ai/prompt-api
- https://developer.chrome.com/docs/ai/prompt-api.md.txt
- https://developer.chrome.com/docs/ai/get-started
- https://firebase.google.com/docs/ai-logic/hybrid/web/get-started
- https://forest.watch.impress.co.jp/docs/news/2112093.html
- https://groups.google.com/a/chromium.org/g/chrome-ai-dev-preview-discuss/c/TFVnnmIoJPE
- Repo: sprout/app/src/ai/firebaseWeb.ts, types.ts, lazyFirebase.ts, state.tsx, parent/DeviceCheck.tsx, public/manifest.webmanifest, research/02-firebase-ai-logic-sdk.md
