# Sprout: handoff

Last updated: 2026-11-26 night IST, after the Hosting deploy (build OK, 76/76 unit tests, e2e 53/53 earlier today). Target submission: Nov 30, 10 PM IST.

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
