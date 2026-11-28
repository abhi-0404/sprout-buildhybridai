# Sprout: handoff

Last updated: 2026-11-28 afternoon IST. Deadline: Mon Nov 30 2026, 2:00 PM PT (Dec 1, 3:30 AM IST). Target submission: Nov 30, 10 PM IST.

## Nov 28 afternoon: what is left (only the user can do these)
- **Remote Config published** (version 1, values equal to the app defaults, so no behaviour change). Emergency during judging: Firebase console > Remote Config > `cloud_model` = `gemini-3.5-flash-lite` > Publish (open browsers pick it up within an hour). Published with a temporary config file; `firebase/firebase.json` still has no remoteconfig entry, so `pnpm hosting` never overwrites console edits.
- **Android kept in Demo mode on purpose:** a real-Firebase APK needs a debug App Check token from a real phone (Logcat), otherwise every cloud call from a judge's phone fails.
- **User to do:** (1) ask 2 questions on the live site in your own Chrome; (2) record the video after 1:30 PM IST (quota reset), per `docs/DEMO_SCRIPT.md`, upload public to YouTube; (3) paste `docs/SUBMISSION.md` into Devpost, add the video URL, tick the last box, submit by Nov 30 10 PM IST. Optional: borrowed Android phone; Appetize upload of the iOS simulator zip (needs a free Appetize account).

## Nov 28 midday: "thinking got tangled up" in Chrome with Gemini Nano (committed 6873d7a, deployed)
- **Cause (reproduced):** the user's Chrome has Gemini Nano, so the app runs hybrid. Nano is slow on this laptop (5-30 s per call; 20 s limit per call), slowest while the Kokoro voice loads (wasm, CPU heavy; it preloaded 4 s after chat open). A failed on-device *answer* was thrown out of ask() and shown as "tangled up". Fresh visitors without Nano were fine (cloud path works; 3.5-flash hits its daily 429 and flash-lite takes over).
- **Fixes:** (1) `pipeline/sprout.ts`: a failed device answer while online goes to the cloud on the same guarded, sanitized text, refereed in the cloud (`referee(..., onDevice)`, `bigAnswer(..., deviceFallback=false)`); offline it still fails. (2) `kid/speech.ts` + `KidApp.tsx`: the voice loads only after the first answer of the visit, when no question is pending (`useReadAloud(idle)`); a tap before that still loads it on demand. (3) calmer failure text "I couldn't reach my thinking just now..." and the error is logged with `console.warn('[sprout] question failed:', e)` (it was swallowed).
- **Verified:** Opus review (no privacy issue; its referee point applied), unit 187/187, tsc, eval, e2e 53/53.
- **Live:** deployed and the live bundle checked. Note: Nano availability() can hang when two Chrome instances share the model folder (seen in testing only).

## Nov 28 morning: natural read-aloud voice (committed 5147944, deployed)
- **Why:** the user found the live voice robotic. The first "Read to me" used the Windows system voice (pitch 1.2) while Kokoro was still downloading, and Kokoro itself was played about 9% fast to lift the pitch.
- **Changes** (`app/src/kid/speech.ts`, `app/src/kid/neuralVoice.ts`): Kokoro always reads; while it loads the button shows "Warming up my voice... N%". The system voice is used only where Kokoro cannot run or fails to load. On the web Kokoro preloads about 4 s after chat opens (about 90 MB, cached by the browser). Natural pitch, a touch slower. Fallback picks the most natural English system voice at pitch 1.
- **Verified:** unit 186/186, tsc, e2e 53/53, headless Chrome capture (first tap went to Kokoro). Live site serves the new bundle; android-build and ios-build CI green.
- **Left:** if the voice still is not warm enough, try other Kokoro voices and let the user pick from samples.

## Nov 28 night (overnight, user asleep): quota safety for judging, docs
- **Why:** judging (Dec 10-16) uses the live site on the free Gemini tier (20 requests/day on 3.5-flash, about 3 calls per question without Nano). A judge-style review (Opus) scored about 4/5 overall and named running out of quota as the top risk.
- **Model probe (Nov 28):** `gemini-flash-lite-latest` works (text and JSON, 1-2 s) and is now the second fallback. Not used: `gemini-flash-latest` (54-73 s), `gemini-3.8-flash` (20-99 s), `gemma-4-31b-it` (19 s, JSON overloaded, and its text included its own reasoning). Gemma 3 names: 404. Listing models with the web key is not allowed (403).
- **Fallback chain:** 3.5-flash -> 3.5-flash-lite -> flash-lite-latest. Each request has an 18 s budget across models (8 s per non-last model, the rest for the last). When every model is out of quota, overloaded or out of time, the error is tagged and the child sees "The big brain is taking a rest right now..." instead of "couldn't double-check" or "couldn't find a good kid-friendly answer". A pipeline timeout on a cloud call counts as busy too. Never an unchecked answer.
- **Remote Config:** new `cloud_fallbacks`; `cloud_model` is now actually used by the web client (lazyFirebase applies it when it arrives). Defaults are empty = keep the build's own models, so nothing changes until someone sets a value in the console. **Not published:** publishing the template was blocked by a permission check; to use it, publish `firebase/remoteconfig.template.json` from the console or run `pnpm firebase deploy --only remoteconfig` after re-adding `"remoteconfig": {"template": "remoteconfig.template.json"}` to `firebase/firebase.json` (left out on purpose so a plain deploy can never overwrite console edits). Open browsers fetch at most once an hour.
- **Docs:** README platform table and Remote Config line corrected (Android/iOS compile in CI, not run on a phone; cloud-safe mode explained; free-tier capacity). SUBMISSION text: voice, cloud-safe mode, fallback, 186 tests, platform-selection guidance. DEMO_SCRIPT rewritten for the judges' reality (cloud-safe, record after 1:30 PM IST quota reset, warm the voice first, honesty rules, CI shot for Android/iOS).
- **Secret check panel** (`app/src/kid/SeenPanel.tsx`): the grown-ups list now starts with the two rule steps that always run on the device (hid private details, checked for upset feelings), names the cloud model per step, and marks a thrown-away early answer "started early, not used" (`Step.unused`). Judges without Gemini Nano now see what ran locally.
- **Video kit** (`docs/video/`): hook, title and end cards (1920x1080 PNG, from `card.html`), `captions.srt` timed to the script (about 240 words).
- **Verified:** two Opus reviews (no path shows an unchecked answer; all fixes applied), unit 186/186, eval pass, e2e 53/53, panel screenshot at 360px.
- **Committed in db3c0a3** and deployed on Nov 28 morning.
- **Not done (ideas, need a decision):** merging the cloud guard and answer into one call would cut quota use from 3 to 2 calls per question, but changes how the guard classifies (no eval measures the cloud guard), so it was left for the user. A "60-second tour" autoplay was judged lower value than the above.

## Nov 27 late night: faster answers (committed 67055cd, deployed)
- **Why:** the user found "Thinking it over" too slow. A cloud-safe question was guard, answer, referee and often simplify, one after another (about 9 s live).
- **Changes:** (1) in cloud-safe mode (no device model) the cloud answer starts at the same time as the cloud guard, on the same redacted text; used only for an ok or sensitive verdict with no extra guard-found names, otherwise discarded without waiting and recorded as sent; with a device model nothing changes. (2) cloud answers are 2-4 sentences and the referee is told short answers and a question back are fine, so needless simplify calls stop. (3) the model quota skip (429/404, 10 min) is saved in localStorage `sprout.modelSkip`, so each visit no longer loses about 2 s on an exhausted model. (4) the privacy ledger counts a private detail once per question.
- **Trade-off (told the user):** in cloud-safe mode an unsafe question is now also sent to the answer model (the same redacted text the cloud guard already sees); the answer is thrown away, never shown. Costs one extra quota call for unsafe questions.
- **Measured with real models:** about 6.2 s from question to answer (was about 9 s); referee passed first time.
- **Verified:** Opus review (no path shows an early answer wrongly; its fixes applied), unit 174/174, eval pass, e2e 53/53.

## Nov 27 night: voice and sounds (committed 1919968, deployed)
- **User asked** for a good voice and fun, child-friendly sounds at every stage. Choices (user picked): Kokoro on-device voice, howler.js with CC0 sounds. New deps: `howler` 2.2.4, `kokoro-js` 1.2.1, dev `@types/howler`. `pnpm-workspace.yaml` marks `onnxruntime-node` and `sharp` builds as not allowed (node-only deps of kokoro-js; the browser uses onnxruntime-web).
- **Voice** (`app/src/kid/kokoro.worker.ts`, `neuralVoice.ts`, `voiceText.ts`, `speech.ts`): Kokoro-82M q8 on WASM in a worker, voice `af_heart`, made at speed 0.86 and played at 1.09x for a brighter, younger sound. One job at a time; "speak now" beats background preparation. State on `<html data-neural-voice>` (loading, ready, speaking, broken).
- **Measured on this laptop (Core 5 210H, no cross-origin isolation, so one thread):** model download about 35-45 s once; a sentence takes 2-6x its length to make (5-17 s for 2.5 s of audio, depending on load). WebGPU fp32 and WASM fp32 were no faster. Hence: prepare the newest answer in the background (tap on it: starts at 0.0 s), older unprepared answers wait about 5-7 s with "Warming up my voice…". First tap on a fresh device uses the system voice while Kokoro loads. Threads would need COOP/COEP headers, which risk breaking the reCAPTCHA App Check iframe: not done.
- **Sounds** (`app/src/kid/sounds.ts`, `app/public/sounds/`): open (pizzicato jingle), send (bubbly bloop), thinking (water drop, on each thinking step after the first), answer (steel-drum flourish), care (soft level pizzicato, for distress and errors), coin (badge jingle), tap (tiny pop on every button). Each .ogg has a .wav copy (decoded by Chrome) for older iPhones. Mute toggle in the kid header, remembered in localStorage `sprout.sounds`.
- **Android/iOS:** both are Capacitor shells of the same build, so they get this with the next CI build. Android WebView has no speechSynthesis, so Kokoro is its only voice (devices with 4 GB+ RAM). In the phone apps the model loads only after the first "Read to me" (memory, battery). The speech engine (onnxruntime-web wasm, 21 MB) is served by the app itself via aliases in `app/vite.config.ts`, never from a CDN.
- **Opus review fixes:** local engine instead of jsdelivr; a failed model load hides the button where there is no system voice and retries after 60 s; one failed sentence fails only that answer; the playing answer is never evicted from the audio cache; background preparation does the newest answer and stops older half-made ones; the system voice is used only when the voice list shows an installed voice (never a possible network voice); iOS audio session set to playback (silent switch); download percent shown in "Warming up my voice… 40%"; tap sound also on buttons without a type attribute.
- **Verified after the fixes:** tsc clean, unit 164/164, eval pass, e2e 53/53, no requests to cdn.jsdelivr.net, headless Chrome voice runs (prepared answer starts instantly), header at 360px fits with no sideways scroll.

## Nov 27 evening: live smoke test (read this first)
- **UI on the live site works:** https://buildhybridai-c1694.web.app in headless and visible Chrome at 390px: welcome, Try a sample family, kid view, question submit, parent gate, all 6 parent tabs, no sideways scroll, no JS exceptions. Load about 0.7-2 s.
- **Cloud answers fail on the live domain in automated Chrome.** App Check `exchangeRecaptchaEnterpriseToken` returns 403, then every `gemini-3.5-flash:generateContent` call returns 401 (App Check is enforced). The kid sees the fail-closed message "I couldn't double-check that question just now". The Firebase SDK then throttles App Check in that browser for 24 h.
- **Config checked by read-only API calls, all correct:** reCAPTCHA key "Sprout web App Check" (score type) allows `buildhybridai-c1694.web.app` and `.firebaseapp.com`; App Check web app uses the same site key; minimum valid score 0.5; enforcement only on `firebaseml.googleapis.com`.
- **Likely cause:** reCAPTCHA scores a fresh, automation-driven Chrome profile below 0.5. Not proven: reading the key's score metrics was blocked by a permission check.
- **Nov 27 12:15 UTC: minimum score lowered 0.5 -> 0.3** (user approved, App Check REST PATCH). The automated visible Chrome still got 403 ten minutes later, so either automation scores under 0.3 or there is another cause. Next decider: one question in the user's normal Chrome. If that fails too, try 0.1 (user's call) and look at the key's score metrics in the reCAPTCHA console.
- **To do (user):** test in your own Chrome (sample family, ask "Why is the sky blue?"). If it also fails, lower the App Check minimum score (Firebase console > App Check > Apps > Sprout web > reCAPTCHA Enterprise), for example to 0.3, and retest in a fresh profile (because of the 24 h throttle). Judges open the link in ordinary browsers, so this decides whether the live demo answers.
- **Bundle size checked:** first load is one JS file, 364 kB raw, 100 kB brotli. The 696 kB chunk Vite warns about is Firestore, already lazy. No change made.
- **Real cause of the live failures: the free Gemini quota, not App Check.** After the score change App Check passed (200), but Gemini returned 429 `GenerateRequestsPerDayPerProjectPerModel-FreeTier`, limit **20 requests/day for gemini-3.5-flash** (resets midnight Pacific, 1:30 PM IST). The old sample family alone made about 15 cloud calls per visitor.
- **Model probe (2026-11-27, this project):** gemini-3.5-flash-lite works (text and JSON, 1-2 s); gemini-2.5-flash and 2.5-flash-lite are retired for new users (404); gemini-3.8-flash returned 500 "high demand" after 96 s; gemini-3.8-flash-lite does not exist.
- **Fix shipped (user approved, deployed, live-verified):** web client falls back gemini-3.5-flash -> gemini-3.5-flash-lite on 429/404/500/503 or an 8 s per-attempt limit, for every cloud task including the guard and referee (user decision); skip 10 min after quota, 1 min after overload; a fallback 400 is passed over without skipping. Each cloud step records the model; Activity shows it. README says so; the published evals measure the rules alone. Empty answers (device, cloud, simplify) now fail instead of showing an empty bubble.
- **Sample family is scripted now:** real pipeline code with DemoAi replies, zero cloud calls, kid view opens in about 1 s (was 23-45 s). Labelled "sample, scripted answer" in the kid badge, "(sample)" in parent route badges, and a note on the Overview.
- **Live check after deploy:** kid view 1.0 s, "Why is the sky blue?" answered by gemini-3.5-flash-lite in about 7 s (guard, answer, referee). Tests: 160/160 unit, eval pass, 53/53 e2e. Two Opus reviews, no must-fix.
- **Capacity:** about 20 calls/day on 3.5-flash plus flash-lite's own free limit (unknown; check https://aistudio.google.com/rate-limit). A question costs about 3 calls without on-device Nano. Avoid burning quota with repeated live tests before judging.
- **Smoke script** (not in the repo): headless Chrome over CDP, same approach as the screenshot helper; records console errors and HTTP >= 400.

## "Seed packet" UI redesign (2026-11-26 night)
- **Why:** the user found the live UI bland (system font, flat grey-green panels after the minimalist pass). Chosen direction (user picked it): "seed packet", a garden notebook for curious kids.
- **Tokens** (`app/src/styles.css`): meadow paper #f0f6e8, forest ink #173a29, leaf #1f7f45, sunflower #ffc83d (send, stars, guardian stamp), sky #2a6fb8 (cloud), honey (care). Dark = night garden #0e2218, not grey-black. Sticker look = `--sticker-edge` (2px ink) + `--lift` (hard offset drop), used only on things a child taps, the privacy hero and primary buttons. Care/distress cards stay soft with no drop on purpose.
- **Fonts** (user approved, bundled so they work offline in the native apps): `@fontsource-variable/bricolage-grotesque` for headings and big numbers, `@fontsource/atkinson-hyperlegible-next` (latin 400/600/700) for body. Imported in `main.tsx`.
- **Welcome step 1** (`parent/Welcome.tsx`): the old sideways SVG is replaced by `Journey`, a vertical three-sticker story: the child's sentence with name and school highlighted, the guardian stamp, then the exact cloud text with the real tokens `[CHILD]` and `[SCHOOL_1]`. One reveal animation on load, skipped with reduced motion. Side by side with the headline from 900px. "Try a sample family" is now the primary button (fastest path for judges).
- **Kid side:** topic cards are seed packets (coloured top with icon, question below, slight tilt), sticker answer bubbles, plant-tag source badges, sunflower send button, Today's wonder on a sun card.
- **Parent side:** same type, calm hairlines; privacy hero is the one sticker with a big display number; desktop sidebar active tab is a leaf pill; gate lock is a sun stamp.
- Class names unchanged, so e2e assertions still hold. Screenshots helper used during design lived in the session scratchpad (not in the repo); `pnpm e2e` still writes `app/e2e/screenshots/`.
- **Verified:** `tsc -b` clean, unit 76/76, e2e 53/53 (axe light + dark, 360/390/1280px no sideways scroll).

## Firebase setup (2026-11-26, live cloud verified, read this first)
- **Project:** `buildhybridai-c1694` ("BuildHybridAI", Spark plan, user's personal Google account). Linked in `firebase/.firebaserc`. Firebase CLI: `pnpm firebase <cmd>` from `app/` (firebase-tools 15.37.0, logged in as the user).
- **Done:** web app "Sprout web" registered; Firestore `(default)` in `asia-south1` (permanent); `firestore.rules` deployed; AI Logic on with the Gemini Developer API (free); Google sign-in on.
- **App Check is ENFORCED for AI Logic** (turned on with AI Logic). Without a token every cloud call fails with 401. Set up: reCAPTCHA Enterprise score key (domains localhost, 127.0.0.1, `buildhybridai-c1694.web.app`, `.firebaseapp.com`) registered as the web app's App Check provider, plus a debug token "Sprout local dev" used by dev builds. Both are in `app/.env.local` (git-ignored). The reCAPTCHA Enterprise API needed no billing.
- **Verified live:** the app's own `FirebaseWebAi` in headless Chrome on the dev server: App Check token 200, Remote Config 200, `gemini-3.5-flash` answered "why is the sky blue" in 3.3 s, `source=cloud`, full answer.
- **Model change: gemini-3.8-flash -> gemini-3.5-flash** everywhere (web, Remote Config template and defaults, Android, iOS, docs). On the free tier 3.8-flash timed out, returned 500 "high demand", then 429 quota; 3.5-flash answered.
- **Bug fixed:** thinking tokens count against `maxOutputTokens`. With default thinking the model used 383 of 400 tokens thinking and the kid's answer was cut off. Web text answers now send a thinking level picked per model by `answerThinkingLevel()` (MINIMAL; LOW for gemini-3.8; none for Gemini 2.5), override with `VITE_CLOUD_THINKING` (invalid values ignored). The JSON safety checks (guard, referee) keep the model's default thinking: they have no token cap. Android and iOS set no cloud token cap, so no cut-off there, but they use default thinking (slower, more quota).
- **e2e now builds itself in demo mode into `dist-e2e/`** (blanks the Firebase keys), so `pnpm e2e` passes with a filled `.env.local` and never overwrites `dist/` (which Capacitor and Hosting ship). It also refuses to run if port 4174 is taken and now kills its preview server tree: an orphaned `vite preview` from an earlier run had been answering e2e on 4174 and serving whatever was in `dist/`.
- **Known gap (pre-existing):** Remote Config `cloud_model` is fetched but no client uses it (web `new FirebaseWebAi()` takes the env/default, Android hardcodes, iOS gets no `cloudModel` from JS). Do not claim runtime model switching in the pitch until it is wired.
- **Watch out:** free-tier rate limits (429) are real; the first live attempt hit one and the retry 20 s later worked. On-device first keeps cloud use low; for the demo, avoid rapid-fire cloud questions. Remote Config template is not published to the project yet (app uses its defaults).
- **Hosting live (2026-11-26 night):** https://buildhybridai-c1694.web.app (index and SPA routes return 200). Redeploy with `pnpm hosting` from `app/`: it builds, copies `dist/` to `firebase/public/` (git-ignored; Firebase refuses a public dir outside `firebase/`) and deploys.
- **Security fix before deploy:** `lib/firebase.ts` used `const env = import.meta.env`, which made Vite inline every VITE_ variable, so the fixed App Check debug token was in the production bundle. Now each variable is read directly and the token only in a DEV branch; verified the token is absent from `dist/` and the deployed files. Never read the whole `import.meta.env` object.
- **Not yet verified:** a cloud answer on the live domain (reCAPTCHA Enterprise path, not the debug token). Check in a real browser: ask a question that falls back to cloud and confirm it answers.
- **Next:** live-domain cloud check above; Android `google-services.json` + Play Integrity, iOS plist (user does these in the consoles); delete empty GCP project `sprout-hybrid-0553` only if the user asks.

## Nov 27 session: zero-install builds and the $0 iOS path (read this first)
- **Firebase Studio is closed to new users** (sign-ups disabled 2026-06-22, shutdown 2027-03-22). The zero-install loop is now: push to GitHub, free Actions runners build, view in the browser. See `research/overnight/android-cloud-dev.md`.
- **New `android-build` workflow**: debug APK as a run artifact, and attached to a GitHub Release on a `v*` tag. Demo mode unless the `GOOGLE_SERVICES_JSON_BASE64` and `VITE_FIREBASE_*` secrets are set.
- **`ios-build` workflow extended**: zipped simulator app (Appetize format), optional Appetize upload (secret `APPETIZE_API_TOKEN`, then `APPETIZE_PUBLIC_KEY`), and an unsigned IPA for Sideloadly. See `research/overnight/ios-free-path.md`.
- **$99 is optional**: Appetize free (30 min/month, public link) + Sideloadly with a free Apple ID on a borrowed iPhone (7 days) + video. Only TestFlight/App Store links need $99.
- **History cleaned locally**: all mentions of the coding assistant removed from every commit, the local agents folder untracked (ignored via `.git/info/exclude`), root LICENSE added, build cache untracked. The old history is kept locally under `refs/original/` (never push it).
- **Pushed**: `main` is on `abhi-0404/sprout-buildhybridai` and in sync with origin.
- **Both cloud builds pass.** The iOS build first failed on a Swift syntax error (missing space before `=` in `SproutAiPlugin.swift` `makeSession`), fixed in `0f53f87`. iOS run 45797991446 is green, with artifacts kept until 24 Feb 2027:
  - `Sprout-simulator-app` (4 MB): zip to upload to Appetize.
  - `Sprout-unsigned-ipa` (1 MB): install with Sideloadly.
  - TestFlight step skipped: the Apple signing secrets are not set.
- **Not proven yet**: the Firebase `HybridModel` calls in the Swift plugin compile, but no run has shown they work. That needs the app open and a real request sent.
- **Next**: (1) upload the simulator zip to Appetize and check the app opens and answers; (2) add the Apple signing secrets so the TestFlight step runs.
- **Approved downloads done** (Android debug APK builds and release Java compiles locally):
  - Android App Check wired: `AppCheckSetup.install` runs in `MainActivity` before the plugin. Debug builds use the debug provider (`app/android/app/src/debug/`), release builds use Play Integrity (`src/release/`). It skips itself when there is no `google-services.json`, so Demo mode is unchanged. Register the debug token from Logcat in Firebase console > App Check.
  - Firebase BoM 34.6.0 to 35.2.0.
  - `firebase-tools@15.37.0` via `pnpm dlx` (not a dependency, so CI installs stay small): `pnpm firebase <cmd>` and `pnpm hosting` (build + Hosting deploy) in `app/`. Run `pnpm firebase login` first.
- **Standing permission**: failing Sprout cloud builds may be fixed, pushed and rerun without asking (no force-push; other commits still need a request).

## Overnight run (Nov 26-27)
**The master plan is [WINNING-PLAN.md](WINNING-PLAN.md)**: the solution per platform, the architecture diagrams, the phase map Nov 27-30, your checklist, and the Stage 1 checklist.

- **Agents**: chrome-expert, android-expert, ios-expert, competitor-scout, hackathon-winner, architect, reviewer. Reports are in `research/overnight/`, and the strategy is in `research/overnight/judge-verdict.md`.
- **Strategy:** the Grand Prize, with **Best Android as the main "Best of" target**. iOS is a bonus, and Web is the fallback. Lead the pitch with the child as the user, the referee and the distress path. Do not lead with "privacy airlock": about 8 rivals already redact names.
- **Commits (local only, not pushed):**
  - `1f33623`: Device check gating, polling while downloading, the `prefer_device` cloud retry behind the privacy gate, Android `allowBackup=false`, iOS plugin guards (iOS 26, safe call handling, no crash without Firebase), and the iOS GitHub Actions workflow (`.github/workflows/ios-build.yml` and `.github/scripts/prepare-ios.sh`, never run yet).
  - `2d65ded`: research reports and agent definitions.
  - `3b86285`: the referee before/after view (grown-ups only) and an offline service worker (`app/public/sw.js`).
- **Waiting for your approval** (each is a download or a new dependency):
  1. Android App Check library. Without it, Android cloud calls fail, because App Check enforcement is on.
  2. Bumping the Android Firebase BoM to 35.2.0.
  3. `firebase-tools`, for the Hosting deploy.
  4. Copying LICENSE to the repo root, so GitHub's About panel shows Apache.
  5. Pushing the repo public. The free iOS cloud build needs this.
- **Known nit:** on Windows, `pnpm e2e` passes but leaves its `vite preview` server on port 4174 running. Stop it afterwards.
- **First thing in the morning:** enroll in the Apple Developer Program (it can take up to 48 hours), message friends for a Galaxy S25 / OnePlus 13 class phone and an iPhone 15 Pro or newer, then do the Firebase setup in [SETUP.md](SETUP.md).

## Try it now (no Firebase needed)
```
cd app
pnpm install
pnpm dev            # open http://localhost:5173
```
Without Firebase keys the app runs in **Demo mode**. The AI is simulated, but the real safety pipeline runs: redaction, guard, routing, referee, distress replies and the ledger. On the welcome screen, click **Try a sample family** to see a full conversation. Then try:

- **Ask your own questions.** Include a name or school, for example "I'm Aarav from Green Park School, why do volcanoes explode?". Tap the "Asked the big brain" chip to open **What the big brain saw**.
- **Go offline.** In DevTools > Network choose Offline, ask "why is the sky blue?", then go back online and watch "✨ The big brain added more".
- **Open the parent area.** Hold the **Grown-ups** button for about 1.5 seconds, then solve the math gate. You get Overview, Alerts, Activity, Weekly note, Settings and Family sync.
- **Simulate a device without an on-device model.** Turn this on in Parent > Settings > "Simulate on-device model" to see cloud-safe mode.

## Done
### Product
- **Kid experience** (`app/src/kid/`):
  - Mascot, greeting, and a status pill showing device, cloud-safe or offline.
  - Suggestion chips and large-type chat.
  - Source chips (🌱 device, ☁️ big brain, 💛 care) and the "What the big brain saw" split view.
  - Deferred refinement: an offline quick answer, upgraded when back online.
  - Care card for distress, a non-shaming blocked card, and the press-and-hold Grown-ups button.
  - Voice input only when on-device speech is available, and read-aloud only with local voices.
- **Parent experience** (`app/src/parent/`):
  - 3-step onboarding, plus "Try a sample family".
  - Math gate.
  - Dashboard: privacy hero, KPIs, device vs cloud, cost saved, and topics.
  - Alerts with guidance and helplines (US and India).
  - Activity view: private by default, with an expandable "What the big brain saw" panel.
  - Weekly note: the cloud gets counts only, and the parent sees exactly what was sent.
  - Settings and a device check.
  - Family sync (Google sign-in, family code, owner approval, alerts with no text).
- **PWA:** installable, with a manifest and icon.

### Engine (`app/src/pipeline/`, pure TypeScript, shared by web, Android and iOS)
- **Redaction** (`redact.ts`): deterministic. It covers profile terms, school initials, address variants, emails, phones, birthdays, self-introductions, relation names and titles.
- **Hard pre-cloud gate:** it checks only the child-derived text.
- **Distress detection** (`distress.ts`): deterministic. It covers English and Hinglish, and handles indirect abuse and grooming, sibling play and threats. Replies are fixed, with helplines.
- **Normalisation:** curly apostrophes from phone keyboards are folded before any rule runs.
- **Orchestrator** (`sprout.ts`): fails **closed** everywhere.
  - A failed guard means the message is blocked.
  - A failed referee or simplify means the answer is not shown.
  - Distress replies instantly, with no model call.
  - A question queued offline is guarded before it ever reaches the cloud.
  - Every AI call has a 20-second timeout.
  - A cloud failure falls back to the device answer.
  - Each turn records `cloudSaw`, the exact child text that left the device.
- **AI clients:**
  - `ai/firebaseWeb.ts`: Firebase AI Logic hybrid, with the source taken from `inferenceSource`.
  - `ai/demoAi.ts`: scripted demo.
  - `ai/capacitorAi.ts`: native bridge.
- **Integration:**
  - Remote Config can only tighten parent settings (`lib/config.ts`, `mergePolicy`).
  - Alerts sync immediately when a family is linked; sample turns never sync.
- **Firestore rules** (`firebase/firestore.rules`):
  - Owner-only membership changes; the owner can't be removed.
  - Alerts are append-only and validated.
  - Join requests are validated.

### Native (not compiled here: no JDK or Xcode on this laptop)
- `native/android/SproutAiPlugin.kt` and `native/ios/SproutAiPlugin.swift` plugin sources, each with a setup README.
- iOS pins Firebase 12.x, because 13.x removed `HybridModel`.
- Items marked `VERIFY:` need checking against the real SDKs.

### Quality
- **Tests:** 43 unit tests pass. That includes 11 regression tests from the independent code review.
- **Eval:** `pnpm eval` runs 3 synthetic sets (473 questions in total).
  - Current results: 0 leaks, every distress case caught, and 0 false alarms on every set.
  - Honest baselines from the first blind measurements are in `docs/EVAL-HISTORY.md`.
- **Independent review:** an Opus reviewer found 17 issues. Every high and medium one is fixed, as listed below.
- **Visual check:** every screen was screenshot at phone (390 px) and desktop sizes in light and dark mode. Layout bugs were fixed, and there is no horizontal overflow.
- **Docs:** README written for judges, `docs/SETUP.md`, `docs/EVAL.md`, `docs/EVAL-HISTORY.md` and `docs/PLAN.md`. Research is in `../research/`.

## Needs you (in order)
1. **Firebase setup** (`docs/SETUP.md`, about 20 minutes):
   - Create the project, enable AI Logic, fill in `app/.env.local`.
   - Set up App Check (reCAPTCHA Enterprise plus a debug token).
   - Enable Auth (Google) and Firestore.
2. **Chrome on-device check:**
   - Run the app, then go to Parent > Settings > Device check > Check availability.
   - The RTX 3050 (exactly 4 GB) is borderline. Send me the log.
3. **Hardware:**
   - Borrow a Pixel 10 or Galaxy S25 for one filming day.
   - Decide on a Mac rental (Scaleway M4, about €5/day) for Days 11-12.
   - Optional: Apple Developer account ($99) for TestFlight.
4. **When ready, ask me to:**
   - create the git repo and the first commit;
   - deploy to Firebase Hosting;
   - install the Android toolchain (JDK and Android Studio need your OK).

## Test and audit pass (2026-11-14)
- **Unit tests:** 60, up from 43. New coverage: JSON parsing, the ledger (the leak metric is real), the Remote Config merge (can't loosen parent choices), weekly-note privacy (no text or names sent), kid helpers, alert ordering, demo AI routing and the parent PIN.
- **End-to-end:** `pnpm e2e` runs 53 checks in headless Chrome against the production build, and all pass. It covers every screen, routing, the offline upgrade, distress (including curly apostrophes), the PIN flow, alerts surviving "clear history", axe in light and dark mode, 3 screen widths, and zero console errors.
- **Improvements from the audit:**
  - Parent PIN: salted SHA-256 hash on the device, with a 1-minute lockout after 5 wrong tries. The math gate is now only a fallback, with a hint to set a PIN.
  - Contrast: the child's chat bubbles were just under the 4.5:1 minimum, and the colour is now darkened.
  - Landmarks for screen readers: main, header, footer, aside. Axe moderate notes went from 13 to 1.
  - Screen readers now announce repeated identical answers.
  - Failed big-brain upgrades retry with backoff (30 s, doubling up to 5 min), with a 15-second tick. Before, they waited for the next offline/online change.
  - Firebase is lazy-loaded: demo mode downloads no Firebase code, and the main bundle went from 430 KB to 310 KB.
  - Demo AI no longer crashes where `navigator` is missing. A unit test caught this.
- **Dependency audit** (`pnpm audit`):
  - 0 issues in the code shipped to browsers.
  - 2 in `@grpc/grpc-js`, which only runs under Node.js (not in the web bundle).
  - 15 in dev tools only (Vite 5 dev server, Vitest 2). Fixing them means upgrading to Vite 6.4.4+ and Vitest 4.1.12+, a new download that needs your OK.

## Kid UI redesign (2026-11-15, done)
Done:
- Picture-card start screen.
- Kid-friendly status ("Ready to help!") and a stars counter.
- The grown-ups lock is icon-only on phones.
- One badge per answer ("Sprout knew this!" / "Asked the big brain", plus "secrets kept").
- Big "Read to me" / "Tell me more" / "Easier please" buttons.
- Simple "Secret check" panel, with the technical steps folded under "For grown-ups".
- Short demo ribbon.

## Minimalist UI pass (2026-11-26, done, pushed in 760f8e7)
- Guided by Anthropic's `frontend-design` skill (installed in `.claude/skills/`, git-ignored, guidance only).
- Every emoji replaced by `lucide-react@0.525.0` line icons (was already on disk). Kid icon map: `app/src/kid/icons.tsx`; parent icons: `Icon` and `TOPIC_ICON` in `app/src/parent/shared.tsx`.
- Shared tokens (paper, ink, moss; cloud = sky, care = honey) in `app/src/styles.css`; kid, clay and parent CSS rewritten on top of them. Safety flows (crisis card, helplines, PIN gate, privacy counters) unchanged.
- Reviewer fixes applied: parent margin reset lowered to `:where()` so spacing classes work; light `--warm` darkened to #8f5a0d for 4.5:1 contrast; global focus keeps a real outline; unknown topic falls back to a chat icon instead of crashing; zero cost shows `$0.00`; welcome step not announced twice; dark-mode mic icon contrast; dead CSS and icon names removed.
- Verified: `tsc -b` clean, 73/73 unit tests, build OK, e2e 53/53 (axe, dark mode, 360/390/1280px).
- Note: `pnpm e2e` can hang after finishing on Windows (vite preview not killed). Workaround: `pnpm build` then `node --experimental-websocket e2e/run.mjs`.
- Parent tabs on phones (under 900px) now fit as icon-over-label, no sideways scroll (uncommitted follow-up). Left as-is (low): legacy unused `.card/.banner/.bubble/.composer` in `styles.css`; Settings history lost its red "danger zone" border.

## Clay 3D + safe gamification (2026-11-15, done)
- **Clay-3D look:** the mascot has radial lighting, gloss and rim shading, plus a party mood. Topic cards are clay with depth, tilt and squish.
- **Curiosity garden** (`kid/Garden.tsx`): clay pots grow sprout → bud → flower per topic.
- **Explorer badges:** 8 gold clay coins, earned for breadth and curiosity, not time spent.
- **Celebrations:** confetti and the mascot dance on a new badge (`kid/Celebrate.tsx`).
- **Daily wonder:** one question of the day on the start screen.
- **Safety rules** (`kid/game.ts`, tested in `game.test.ts`):
  - no streaks to lose;
  - distress and blocked turns never earn rewards;
  - rewards pause after the parent's daily limit (default 20), and the mascot suggests a break;
  - everything is derived from the history, so there is no separate score to game.
- **Parent controls:** Settings > Learning games (on/off, daily limit).
- **Verification:** 66 unit tests pass, e2e 53/53, build OK.

## Submission prep (2026-11-15, done)
- `docs/DEMO_SCRIPT.md`: a 3-minute shot-by-shot video script, with timings, what to click and the exact narration, plus recording setup and honesty rules (label Demo mode if it's used).
- `docs/SUBMISSION.md`: Devpost text for every form section, plus the Stage-1 checklist. Fill in the `[ ]` links when known.
- `firebase/remoteconfig.template.json`: Remote Config parameters (cloud_model, allow_cloud, referee_cloud_answers, max_device_chars). Import it in the Firebase console during setup.
- Verified after other edits landed on disk: tsc clean, 66 unit tests pass, build OK.

## Android (2026-11-15)
- **Toolchain:** all on D:\dev, with no system installs and no PATH changes.
  - JDK 21 (`D:\dev\jdk`) and the Android SDK (`D:\dev\android-sdk`).
  - Portable Node 22 for the Capacitor CLI (`D:\dev\node22`).
  - Gradle cache (`D:\dev\gradle`) and the emulator image (`D:\dev\android-avd`).
  - About 7 GB in total.
- **Project:** `app/android` (Capacitor 8, appId `dev.sprout.kids`, minSdk 26).
  - The Kotlin plugin `SproutAiPlugin.kt` is registered in `MainActivity`.
  - Dependencies: firebase-ai 18.2.0, firebase-ai-ondevice 16.0.0-beta08, App Check, and the Kotlin 2.4.0 plugin.
- **Build:** `powershell -File scripts\android.ps1 build` gives **BUILD SUCCESSFUL** and produces `app/android/app/build/outputs/apk/debug/app-debug.apk`. That is the first compile of the plugin, after fixing 3 import packages (`OnDeviceConfig`, `InferenceMode` and `InferenceSource` live in `com.google.firebase.ai`).
- **Mode:** the phone app runs in Demo mode until it is built with `VITE_NATIVE_FIREBASE=true` and `google-services.json` is in `app/android/app/`.
- **Emulator:** it booted (WHPX works), but Android's system service crash-looped. The laptop had only about 1.8 GB of free RAM while VS Code, two browsers, WSL and the emulator were all running, so I stopped it to protect the laptop. To retry, close the browsers and run `wsl --shutdown` first. Or, the better option, install the APK on any real Android 8+ phone over USB (`scripts\android.ps1 install`).
- **Helper:** `scripts/android.ps1` with `build | emulator | install | stop`.

## Still open
- **Dev tool upgrade:** Vite 6.4.4+ and Vitest 4.1.12+, to clear the dev-only audit warnings. Needs your OK.
- **Join codes:** 6-digit codes are guessable at scale (owner approval is still required). Production fix: random expiring codes via a Cloud Function, plus App Check enforcement.
- **Firestore rules:** run them against the Firebase emulator once Firebase is set up.
- **Native plugins:** the Kotlin and Swift sources are uncompiled. Items marked `VERIFY:` need checking against the real SDKs.
- **Final blind eval:** write and measure a third blind eval set before submission.

## Next (plan)
- **D2-D3:**
  - Real Firebase run.
  - Live Nano guard eval: accuracy, latency and % on-device.
  - Parent PIN.
  - Deploy to Hosting.
- **D4-D7:**
  - Polish from your feedback.
  - Remote Config template.
  - Rules emulator tests.
- **D8-D10:** Capacitor Android build with the Kotlin plugin on a real device.
- **D11-D12:** iOS on the rented Mac.
- **D13:**
  - Third blind eval set; publish those numbers.
  - Final review.
- **D14-D16:**
  - Video (see `docs/PLAN.md` for the outline).
  - Devpost text.
  - Submit by Nov 29.

## Commands
```
cd app
pnpm test          # 60 unit tests
pnpm eval          # privacy + distress eval -> docs/EVAL.md
pnpm e2e           # 53 end-to-end checks in headless Chrome
pnpm exec tsc --noEmit -p .
pnpm build
pnpm dev
```

## Notes
- There is no git repo yet. Commits and the GitHub repo will be created only when you ask.
- All eval data is synthetic. Never put real child data in the repo.
- Session rule: if the usage limit is reached, stop at a clean state and do not use extra credit.
