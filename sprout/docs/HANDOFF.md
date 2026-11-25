# Sprout: handoff

Last updated: 2026-11-27 early morning IST, after the overnight multi-agent run (tsc clean, 73/73 unit tests, e2e 53/53, build OK). Deadline: Mon Nov 30 2026, 2:00 PM PT (Dec 1, 3:30 AM IST). Target submission: Nov 30, 10 PM IST.

## Overnight run (Nov 26-27): read this first
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

## Kid UI redesign (2026-11-15, in progress)
Done:
- Picture-card start screen.
- Kid-friendly status ("Ready to help!") and a stars counter.
- The grown-ups lock is icon-only on phones.
- One badge per answer ("Sprout knew this!" / "Asked the big brain", plus "secrets kept").
- Big "Read to me" / "Tell me more" / "Easier please" buttons.
- Simple "Secret check" panel, with the technical steps folded under "For grown-ups".
- Short demo ribbon.

Tests: 60 unit tests pass. e2e was 51/53 because two test strings still used the old labels. Both are now fixed, but the suite hasn't been re-run since.

Next (user request): replace every emoji (they render as 3D on Windows) with Lucide line icons (`lucide-react@0.525.0`, already on disk, awaiting OK). Then a professional, thin "MacBook Air" style pass across all pages (kid, parent, welcome, gate), and a re-run of the e2e suite.

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
