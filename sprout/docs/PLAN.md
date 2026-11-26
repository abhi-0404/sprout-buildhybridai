# Sprout: the AI you can hand your kid (#BuildHybridAI 2026 plan)

## Context
Goal: win #BuildHybridAI 2026 (Google/Firebase on Devpost, $30k, deadline **Mon Nov 30 2026, 2:00 PM PT**; we submit Nov 29). Target: Grand Prize plus one "Best of" platform prize, shipping on Web, Android and iOS. The user rejected niche/health ideas and chose a broad consumer product: **Sprout**.

**Rules that drive the design (from the official Devpost rules):** Firebase AI Logic hybrid inference must be imported and called at runtime. App Check is required (a debug token is fine). Judging uses 4 equally weighted criteria, each scored 1-5: Tech Implementation (ties broken on this first), Design (a complete product), Potential Impact (a specific real problem for a real audience), and Quality of Idea (creative, non-obvious hybrid use). Multi-platform gets strong Grand Prize consideration. Stage 1 (pass/fail) requires: a public repo with an Apache-2.0 license visible in its About panel, a YouTube video of 3 minutes or less in English, a text description, a hosted demo (encouraged), and no secrets or PII in the repo. Judges may score from the video alone.

**Research summary (6 agents, about 40 events audited):**
- Grand-prize winners share four traits: a scenario built around a person, an on-device step that is *essential*, routing between device and cloud that the user can see, and hard numbers. Cloud escalation is an explicit decision.
- Saturated categories to avoid: feed filters (CleanX and Slopguard already use Nano), summarizers, chat-with-page, label scanners, study tools.
- Still open: hybrid apps across several platforms, a user-facing cost/privacy meter, a "privacy airlock" for individuals (only enterprise versions exist, e.g. cloudNein), demos on devices without an on-device model, and refinement that is visibly improved later.

## The product
**One line:** a Gemini-powered assistant a parent can safely hand to a 6-12 year old. The on-device model acts as the child's guardian. It strips identity before anything leaves the tablet, answers simple questions offline, checks every cloud answer for age-fit, and catches distress. The cloud model ("the big brain") answers the hard *why* questions but only ever sees a sanitized question.

**Problem evidence:**
- Nearly 90% of children use AI (Common Sense Media).
- Oct 7 2026: Common Sense rated ChatGPT for Teens an "unacceptable risk". It missed more than 1 in 4 warranted crisis referrals, and its parental controls can't show conversations (Axios, AP).
- Gemini for under-13s requires Family Link; there is no on-device privacy layer.
- California's Parents & Kids Safe AI Act and the FTC's 2025 chatbot inquiry show regulatory pull.

**Audience:** parents of children aged 6-12 (about 45M US children, 250M+ in India). The buyer is the parent, the user is the child.

**Business model:** $4.99/month family plan. Unit cost stays tiny because most turns run on-device (the cost meter proves it). Second channel: licensing to schools and edtech as a "safe AI layer".

### Why hybrid is the core, not decoration
| Job | Where it runs | Why |
|---|---|---|
| PII strip (name, school, address, phone, friends' names) | Device: deterministic list from the parent's setup plus regex, then a Nano pass | A child's identity must never reach any cloud |
| Safety and intent guard on every message | Device (Nano, JSON schema) | Runs on every message, so it must be free, instant and private |
| Simple answers, spelling, "what is" questions | Device | Offline in the car, zero cost |
| Deep "why/how" answers, stories, homework explanations | Cloud (gemini-3.5-flash), sanitized text only | Needs a bigger model |
| Referee: is the cloud answer age-appropriate? | Device | The guardian checks the big brain before the child sees anything |
| Distress (sad, scared, being hurt) | Deterministic calm script plus a "talk to a trusted adult" prompt plus a parent alert; no generation | Lesson from past winners: keep critical paths deterministic |
| Weekly parent digest | Cloud, built from on-device topic labels and counts only, never transcripts | Respects the child's privacy too |

**Privacy guarantee that does not depend on model quality:** the parent's setup supplies the known identifiers (child's name, school, city, siblings). They are redacted deterministically before Nano even runs. Nano catches the rest. The test harness proves 0 known-identifier leaks.

### Signature demo moments (video)
1. **"What the big brain saw":** the child types *"I'm Aarav from Green Park School, why do volcanoes explode?"*. A split view shows the cloud received only *"why do volcanoes explode?"*. The answer comes back in the child's own context.
2. **Badges on every answer:** 🌱 *answered on your tablet* vs ☁️ *asked the big brain*, taken from `inferenceSource`. The parent sees the full Safety Ledger.
3. **Airplane mode in the car:** still answers; the hard question queues with "I'll ask the big brain when we're online".
4. **Referee catch:** the cloud answer to a war-history question gets rewritten for a 7-year-old before display.
5. **Distress moment:** *"kids at school say I'm stupid and I don't want to go"* triggers a warm scripted reply plus a gentle alert on the parent's phone or web.
6. **Same app, no on-device model:** on a device without Nano, a banner says "Safety checks: cloud-safe mode". Deterministic redaction still runs, so the child's identity never leaks.
7. **Parent dashboard totals:** *"212 questions this week, 171 answered on the tablet, 0 personal details sent, cloud cost $0.004"*.

### Scoring map
- **Tech:** a different role for device and cloud; on-device referee loop; deterministic plus model redaction; `inferenceSource` ledger; Remote Config age-band policies; App Check; Firestore sync; offline queue; an evaluation harness with published numbers. Built on 3 platforms with 1 backend.
- **Design:** separate kid and parent experiences. Kid: big type, voice input, friendly character. Parent: dashboard, alerts. Includes onboarding and pairing.
- **Impact:** a timely, cited crisis (Oct 2026), a huge audience, and a clear buyer and cost model.
- **Idea:** the small model guards the big model *for a child*, a non-obvious inversion of "fallback".

## Platform strategy (Windows laptop, no phones, no Mac)
**One codebase:** React + TypeScript + Vite UI, wrapped with **Capacitor** for Android and iOS. A single `ai/` adapter interface `generate(task, input) -> {text, json, inferenceSource, latencyMs}` has three implementations:
- **Web:** Firebase JS SDK 13.x `getGenerativeModel` with `InferenceMode.PREFER_ON_DEVICE` / `ONLY_ON_DEVICE` / `PREFER_IN_CLOUD` per task. `initializeDeviceModel()` runs on the first tap. Hosted on Firebase Hosting; this is the main judge-testable build.
- **Android:** a custom Capacitor plugin in Kotlin (~150-200 lines) using `firebase-ai` 18.2.0 plus `firebase-ai-ondevice` 16.0.0-beta08 (`OnDeviceConfig`, `FirebaseAIOnDevice.checkStatus()/download()`), returning `inferenceSource`. It is built on Windows in Android Studio. The emulator exercises the cloud path, and a real Nano phone is needed for filming.
- **iOS:** a custom Capacitor plugin in Swift using Firebase Apple SDK pinned to **12.x (>=12.13, <13)**, `HybridModel(primary: SystemLanguageModel.default, secondary: geminiModel)`, with `rawResponse.modelVersion` as the source. Text-only on-device, which suits Sprout's text and speech input. Built and run on a **rented bare-metal M4 Mac** (Scaleway, about €5/day, 24h minimum) for 2 days in week 2. Codemagic (free 500 min) is the CI fallback for builds.

**On-device speech-to-text:**
- Android: `SpeechRecognizer` with offline preferred.
- iOS: `SFSpeechRecognizer` with `requiresOnDeviceRecognition`.
- Web: on-device speech recognition where Chrome offers it, otherwise a typing fallback (the cloud speech service would break the privacy promise).

**Hardware actions (user):**
- Day 1: check Chrome Nano on this laptop. The RTX 3050 is exactly 4 GB and Chrome needs more than 4 GB, so try the CPU path or the BypassPerfRequirement flag.
- Borrow a Pixel 10 or Galaxy S25 for one filming day.
- Rent the Mac for 2 days. If Apple Intelligence won't enable on it, borrow an iPhone 15 Pro or newer for one day.
- Optional: Apple Developer account ($99) for a TestFlight link.

**Priority:** Web first, Android second, iOS last. If iOS slips, ship Web and Android as one polished product and keep the iOS code in the repo.

## Architecture
```
Kid app (Web / Android / iOS via Capacitor)                 Parent app (web dashboard + parent mode in app)
 input (type | on-device STT)
  -> Redactor: known-identifier list + regex  -> tokens [NAME] [SCHOOL] ...
  -> Guard (device, JSON): {category: ok|sensitive|distress|unsafe, needsBigBrain, topic, ageFit}
  -> Router (policy from Remote Config):
       distress  -> scripted reply + alert doc in Firestore
       unsafe    -> gentle refusal
       simple    -> device answer
       complex   -> cloud answer on sanitized text  -> Referee (device) -> pass | simplify | retry
  -> Re-personalize locally ("Great question, Aarav!")
  -> Ledger entry {topic, route, inferenceSource, latency, redactions, estCost}  (stays local; counts synced)
Firebase: Auth (parent Google sign-in; kid device paired via 6-digit family code) | Firestore (family, kid alias,
  age band, settings, alerts, weekly topic counts, offline persistence = queue) | Remote Config (age-band policies,
  prompts, JSON schemas, model names, routing thresholds) | App Check (reCAPTCHA Enterprise web, Play Integrity /
  App Attest + debug provider) | Hosting
```
The child's real identifiers and transcripts never go to Firestore by default. Only the alias, topic labels, counts and alerts are synced.

### Repo layout (new): `d:\personal\hackathons\BuildHybridAI 2026\sprout\`
- `app/`: Vite React TS. Holds `src/ai/` (adapter + web impl), `src/pipeline/` (redact, guard, router, referee, ledger), `src/kid/`, `src/parent/`, plus the Capacitor config.
- `app/android/` and `app/ios/`: generated by Capacitor, plus `plugins/sprout-ai/` (Kotlin and Swift).
- `shared/`: prompts, JSON schemas, age-band policies, distress scripts, and `eval/questions.jsonl` (~200 synthetic kid questions with PII, distress and edge cases).
- `firebase/`: `firestore.rules`, `remoteconfig.template.json`, `firebase.json`.
- `docs/`: `HANDOFF.md`, `ARCHITECTURE.md`, `EVAL.md`, `DEMO_SCRIPT.md`, `SUBMISSION.md`. Plus `LICENSE` (Apache-2.0) and a README.

**Dependencies (to confirm with the user, then run find-dep.ps1 first):**
- JS: `firebase`, `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `typescript`, `@capacitor/core|cli|android|ios`, `vitest`.
- Native: Firebase Android libs, and firebase-ios-sdk 12.x via SPM.

## Schedule (Nov 14 - Nov 29)
| Day | Work |
|---|---|
| D1 Nov 14-15 | Risk spikes: Chrome Nano availability on the laptop; Firebase project, App Check, Remote Config; a 50-line web hybrid spike printing `inferenceSource`; Android Studio set up with the official `gemini-hybrid` sample in the emulator. Start the phone-borrow and Mac-rental search. |
| D2-D3 | `shared/`: prompts, schemas, policies, eval set. Redactor plus guard on web, and an eval runner (`pnpm eval`) reporting leak rate, guard accuracy, % on-device and latency. |
| D4-D7 | Web kid app end to end (guard, router, referee, distress, offline queue, ledger) plus parent dashboard (Auth, pairing, alerts, digest). Deploy to Hosting. |
| D8-D10 | Capacitor Android plus Kotlin plugin; on-device STT; emulator run of the cloud path. |
| D11-D12 | Rent the Mac: iOS Swift plugin, Simulator run, attempt Apple Intelligence, capture iOS footage. Polish the kid UI (character, voice, big type). |
| D13 | Reviewer pass (Opus reviewer agent plus `/code-review`), security review (Firestore rules, no keys or debug tokens committed), fixes. Film Android on the borrowed Nano phone. |
| D14-D15 | Video (script below), README with eval numbers, Devpost text, screenshots, architecture diagram. |
| D16 Nov 29 | Buffer. Submit and freeze the repo. |

**Agent use during the build:** I lead and integrate. Sonnet builder agents work in parallel once `shared/` contracts are frozen (web pipeline, parent dashboard, Android plugin). The Opus reviewer runs on D13. A Haiku doc-writer drafts the README and Devpost text.

## 3-minute video outline
- **0:00-0:20.** Hook: a parent's dilemma, citing the Oct 2026 Common Sense finding.
- **0:20-1:15.** Kid on tablet: the redaction split view, badges, airplane mode, referee catch.
- **1:15-1:40.** Distress moment and the parent alert on the web dashboard.
- **1:40-2:05.** The same question on Web, Android and iOS. A device without Nano runs in cloud-safe mode.
- **2:05-2:35.** Parent dashboard totals, eval numbers (0 leaks / N questions), architecture diagram.
- **2:35-3:00.** Impact, business model, close.

## Risks
| Risk | Mitigation |
|---|---|
| Laptop fails Chrome Nano | Check on D1. Fallbacks: CPU path or flag, another machine for filming, or lead the video with Android. |
| No Nano phone or Mac with Apple Intelligence | Borrow early. Otherwise show the cloud path honestly and keep Web as the hero. |
| Nano misclassifies distress | Deterministic keyword layer as well as Nano; err toward a gentle check-in; publish recall in EVAL.md. |
| Child-safety liability perception | Frame as an assistant under parent supervision, not a counselor. Crisis scripts point to trusted adults and helplines. |
| Android ondevice beta or iOS 12.x API drift | Pin versions; follow official samples. |
| Scope creep | Must-haves: redactor, guard, router, referee, ledger, parent alerts, web. Stretch: photo questions, iOS on a real device, TestFlight. |

## Verification
- `pnpm build`, `pnpm test` (Vitest: redactor, router, referee), and `pnpm eval` (must report **0 known-identifier leaks** across the eval set) in `app/`. Android: `gradlew assembleDebug`. iOS: `xcodebuild` on the rented Mac or Codemagic.
- Manual end-to-end on the hosted URL in a fresh Chrome profile: badges show ON_DEVICE for simple questions and IN_CLOUD for complex ones; airplane-mode queue; parent alert arrives; pairing works.
- Stage-1 checklist: public repo, Apache-2.0 visible in About, AI Logic imported and called, no secrets or tokens, public YouTube video under 3:00 with English captions, hosted URL, test instructions.
- Update `docs/HANDOFF.md` every session.
