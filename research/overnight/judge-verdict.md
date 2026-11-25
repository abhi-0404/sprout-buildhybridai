# Judge verdict and win plan (2026-11-26 night IST)

Role: strict judge panel watching only the 3-minute video, plus win strategist. Sources are repo files unless a URL is given. [U] = unverified estimate or judgment.
Clock: deadline Nov 30 2 PM PT = Dec 1 3:30 AM IST. Target submit: **Nov 30, 10 PM IST** (5.5 h buffer for YouTube processing and Devpost form).

## 1. Scores (1-5, strict, equal weight; Tech breaks ties: research/01-hackathon-rules-summary.md)

"Now" = what a judge would see if we submitted tonight: Demo mode (simulated AI), no Firebase project, no hosted URL, nothing run on any real Nano / Apple Intelligence device (sprout/docs/HANDOFF.md "Needs you"). "Plan" = section 3 must-build list executed.

| Prize | Tech now / plan | Design now / plan | Impact now / plan | Idea now / plan | Avg now / plan |
|---|---|---|---|---|---|
| Grand Prize | 2 / 4 | 4 / 4 | 4 / 4 | 3 / 4 | 3.25 / **4.0** (4.5 if Android + iOS real-device footage both land) |
| Best Web | 2 / 4 (3 if laptop Nano fails) | 4 / 4 | 4 / 4 | 3 / 4 | 3.25 / 4.0 |
| Best Android | 1 / 4 | 2 / 4 | 4 / 4 | 3 / 4 | 2.5 / 4.0 |
| Best iOS | 1 / 3 | 1 / 3 | 4 / 4 | 3 / 4 | 2.25 / 3.5 |

Why "now" is harsh:
- Tech 2: the pipeline is real and well tested (66 unit, 53 e2e, 0/473 leaks: sprout/docs/EVAL.md), but no Firebase AI Logic call has ever run, so "how effectively it uses hybrid inference" has zero evidence. Stage 1 also requires AI Logic "actually called at runtime" (research/01). As of tonight Sprout would risk failing Stage 1.
- Idea 3: "strip PII on device" is now the common pattern; 8+ entries do mask/send/restore (research/overnight/competitors.md section 2). Sprout's unique parts (age-fit referee, deterministic distress + parent alert) are under-shown: the referee only prints "rewritten to be gentler" with no before/after (sprout/app/src/kid/SeenPanel.tsx:19; sprout.ts:194 discards the original cloud text).
- Android: APK compiles but never ran; no App Check install, so every cloud call is rejected under enforcement (research/overnight/android.md section 4, risks 1-4).
- iOS: `app/ios` does not exist and the Swift plugin has never compiled (research/overnight/ios.md section 2 and 6).

**Primary "Best of" target: Best Android.** Reasons: the APK already builds (HANDOFF "BUILD SUCCESSFUL"); one borrowed Nano 4 phone evening gives real `inferenceSource: ON_DEVICE` footage plus measured numbers; Android rivals are mostly PII airlocks (CloakBridge, PII-Zero, Clause Guard, Plainly) that Sprout beats on referee + distress (competitors.md section 3). Best iOS is the **opportunistic secondary**: the field is thin and Travel Copilot never tested on an Apple Intelligence phone (competitors.md row 17), but our iOS path stacks three unknowns (never-compiled Swift, Apple enrollment up to 48 h [U], Beta App Review 1-3+ days: ios.md section 3). iOS work is still worth doing because a working third platform drives the Grand Prize "strong consideration" for multi-platform (research/01). Best Web is the fallback target only if no Android phone appears (web is the most crowded track: competitors.md section 3).

## 2. Top 8 gaps, ranked by points gained per hour

| # | Gap | Hours | Points (criterion) | Why it ranks here |
|---|---|---|---|---|
| 1 | Firebase project + `.env.local` + App Check debug token + deploy to Hosting (docs/SETUP.md) | 1.5 (user AM) + 0.5 | Stage 1 gate; Tech +1 on all | Nothing else counts without a real AI Logic call and a hosted URL |
| 2 | Chrome Nano on the laptop via `optimization-guide-on-device-model` = BypassPerfRequirement (chrome.md section 2) | 0.5 + download | Web Tech +1 | Cheapest possible real `on_device` badge; also fixes DeviceCheck button bug (chrome.md section 3 bug 1, 15 min) |
| 3 | Referee before/after card: keep the raw cloud answer in `Turn.referee.original`, show "Big brain said / Guardian made it right for age 7" in SeenPanel and parent Activity | 1.5 | Idea +1, Tech +0.5 | The one thing no competitor has (competitors.md "How Sprout should differentiate" 1) and currently invisible |
| 4 | Android pre-flight: App Check in MainActivity, `google-services.json`, `VITE_NATIVE_FIREBASE=true`, `allowBackup=false`, BoM 35.2.0 (needs user OK), `DeviceCheck` reason strings (android.md risks 1-4, 6) | 2.5 | Android Tech +1 (enabler) | Without it the phone evening films nothing but errors |
| 5 | Phone evening: Nano 4 footage + mini on-device eval (50 questions: guard agreement with deterministic layer, median latency, % on-device) with AICore "Bypass quota limits" on (android.md section 1) | 3-4 (borrowed phone) | Tech +1, Android best +1 | "Hard numbers on constrained hardware" is a winner trait (research/04 judge psychology) |
| 6 | Live parent alert across devices: distress on phone -> alert appears on laptop dashboard via Firestore (code exists: HANDOFF "Family sync") | 1 (test + fix) | Design +0.5, Impact +0.5 | Most emotional, cross-device, uses Auth + Firestore on camera |
| 7 | iOS CI compile: `cap add ios` (SPM), local SPM plugin, `macos-26` GitHub workflow green (ios.md steps 3-7) | 5-7 (iterations) | Grand multi-platform +0.5, iOS Tech +2 | A green archive is itself a deliverable; unlocks device footage |
| 8 | Offline service worker so "airplane mode, reload, still answers" works on web (chrome.md idea 1) | 2.5 | Web Tech +0.5 | Only valuable if gap 2 succeeds; otherwise film offline on Android instead |

## 3. Must-build vs cut

Must-build (in order; owner):
1. Nov 27 AM IST, user: Firebase setup (gap 1); Apple Developer enrollment if not already active; ask two friends for the phones (Galaxy S25 / OnePlus 13 / iQOO 13, and iPhone 15 Pro+ on iOS 26 with Apple Intelligence on).
2. Nov 27, agent: deploy Hosting; gap 2 attempt; gap 3 referee before/after; gap 4 Android pre-flight; start gap 7 iOS CI in parallel (builder agent).
3. Nov 28 evening: Android phone (gap 5 + gap 6 filmed). Publish measured numbers in README and EVAL.md.
4. Nov 29: iPhone evening (internal TestFlight or paid-team Sideloadly install [U], App Check debug provider); 20-30 s of real Foundation Models footage with the `modelVersion` badge. Record all web scenes. Rough cut.
5. Nov 30: final cut with captions, README judge quickstart, Devpost text with real numbers and only the platforms actually shown, Stage 1 checklist (sprout/docs/SUBMISSION.md), repo public + Apache in About, secret scan. Submit by 10 PM IST.
6. Reviewer pass on every code change before it is called done (global rule), but scoped to the diff.

Cut (do not touch before submission):
- Chrome extension variant, streaming answers, native Android voice (5-7 h), Hindi, Remote Config UI work.
- Vite/Vitest upgrade, Cloud Function join codes, Firestore rules emulator tests, deprecated `FirebaseAIOnDevice` migration (works as is; fix only if it fails on device).
- Garden / badges / confetti in the video (keep in app, show 3 s max). Weekly digest in the video.
- Rented Mac (budget is $99 only), iOS native polish (haptics, Dynamic Type), Sideloadly free-account path unless paid signing fails.
- "Privacy airlock" wording anywhere in the pitch: redaction is the mechanism, not the headline (competitors.md recommendation 4).
- Any second blind eval set: the existing blind held-out numbers (0 leaks, 25/25 distress, 0/126 false alarms: EVAL.md) are enough.

## 4. Video beat sheet (180 s hard cap; judges stop at 3:00: research/01)

Hero device: borrowed Android phone as "the kid's device" (screen-recorded with `adb shell screenrecord` or the phone recorder), laptop Chrome as the parent dashboard, iPhone for the cross-platform beat. Every routing claim must have a badge on screen at that moment.

| Time | Platform / device | On screen | Killer moment |
|---|---|---|---|
| 0:00-0:08 | Title card | "9 in 10 kids use AI." Common Sense Oct 2026 "unacceptable risk" headline (PLAN.md problem evidence) | Stakes in one line |
| 0:08-0:20 | Android phone in a child's hands (hands only, no face) | Sprout start screen, mascot, status pill "Ready to help" | Pitch line (section 5) |
| 0:20-0:45 | Android | Child types "I'm Aarav from Green Park School, why do volcanoes explode?" -> answer "Great question, Aarav!" -> tap "Asked the big brain" -> **What the big brain saw** split: "why do volcanoes explode?" | **K1: name in, name never out** |
| 0:45-1:00 | Android | "Why do cats purr?" -> "Sprout knew this!" chip with ON_DEVICE + latency ms; Device check card shows Gemini Nano 4 status | Real on-device inference, named model |
| 1:00-1:15 | Android | Pull down quick settings, airplane mode ON, ask "what is the moon made of?" -> on-device answer; harder "why" question queues -> airplane off -> "The big brain added more" | **K2: works in the car** |
| 1:15-1:40 | Android | War-history question -> Secret check shows **Big brain said** (raw) vs **Guardian rewrote for age 7** | **K3: the small model referees the big one** (nobody else has it) |
| 1:40-2:05 | Android + laptop side by side | "kids at school say I'm stupid and I don't want to go" -> calm scripted care card with helplines; 2 s later the laptop parent dashboard shows the alert (kind and time, no text) | **K4: alerts, not transcripts** |
| 2:05-2:25 | iPhone, then laptop | Same volcano question on iPhone: badge with `apple-foundation-models-system-language-model`; then laptop Chrome: banner "cloud-safe mode" (or on-device if gap 2 worked) and split view still shows no name | **K5: one safety pipeline, three platforms, even without a local model** |
| 2:25-2:45 | Laptop | Parent Overview: 0 private details sent, % on device, cost saved; then a numbers card: 0 of 473 leaks, 25/25 blind distress caught, 0 false alarms, measured phone latency and % on-device | Hard numbers |
| 2:45-2:55 | Diagram | Architecture strip: Redact -> Guard (device) -> Route -> Cloud (sanitized) -> Referee (device) -> Child; logos: AI Logic hybrid, App Check, Auth, Firestore, Remote Config, Hosting | Tech checklist in 10 s |
| 2:55-3:00 | End card | "Sprout: the AI you can hand your kid." repo + live URL | Close at 2:58 |

If no iPhone: 2:05-2:25 becomes the laptop only (cloud-safe banner) plus a 3 s shot of the green iOS CI run, labelled "iOS build compiles; not filmed on device". Never show a platform state that did not happen (DEMO_SCRIPT.md honesty rules).

## 5. Positioning

One sentence: **"Sprout is the AI you can hand your kid: a small AI on the device guards a big AI in the cloud, so your child's name never leaves the phone, every cloud answer is checked for their age, and if they are hurting, you hear about it, not a server."**

First 20 seconds (narration, about 50 words):
> "Nine in ten kids already use AI. Last month, Common Sense Media rated ChatGPT for Teens an unacceptable risk. So here is Aarav's phone. Sprout puts a small AI on the device to guard a big AI in the cloud. Watch what the cloud actually hears."

Rules: lead with the child and the referee, never with "PII redaction"; name why hybrid is essential (privacy and safety checks must run on every message, free, offline) inside the first 20 s (competitors.md recommendation 3).

## 6. Risk register

| Risk | Likelihood [U] | Impact | Fallback |
|---|---|---|---|
| No Android Nano phone borrowed | Medium | Lose Best Android, Grand Tech -0.5 | Android Device Streaming in Android Studio, 30 free min (catalog has Pixel 9 = Nano 3 and partner Samsung/OnePlus units) and Samsung Remote Test Lab S26 Ultra, both AICore-unverified (android.md section 3). If both fail: switch primary to Best Web, film Android in cloud-safe mode honestly, lead video with laptop |
| Chrome on-device fails on the laptop (4 GB GPU, 15.7 GB RAM: chrome.md section 2) | High | Web Tech 3 not 4 | Use it as the planned "no local model -> cloud-safe mode" beat (PLAN.md moment 6); on-device proof comes from the phones; read `chrome://on-device-internals` Broker State; optional: friend's laptop with GPU over 4 GB for one 5-minute web take |
| TestFlight / Apple enrollment / Beta Review delay | High | No judge-installable iOS build | Judges may score from video and text alone (ios.md section 3); film via internal build or paid-team direct install on the borrowed iPhone; link the green CI run; Devpost says exactly what was verified on iOS |
| Swift plugin fails to compile in CI after 3 iterations | Medium | No iOS at all | Stop iOS by Nov 29 noon IST; keep code + CI log in repo; Devpost lists Web + Android only. Do not let iOS eat the video day |
| Firebase quota / rate limit on Spark during filming | Low-medium | Failed takes | Record each scene separately; Remote Config `cloud_model` to a lighter model; App Check debug token registered for each device; Demo mode as last resort with on-screen label "simulated AI" (DEMO_SCRIPT.md) |
| App Check enforcement rejects native calls | Medium | Cloud path dead on phone | Debug provider + token registered before the phone evening; test on emulator-free path: one cloud call from APK over Wi-Fi before arriving at the friend's |
| Borrowed phone time runs out mid-shoot | Medium | Missing scenes | Shot list printed; install APK and download Nano model first (1-3 GB [U]); film K1, K2, K3, K4 in that order |
| Video over 3:00 or Stage 1 miss (repo private, no Apache in About, secrets) | Low | Disqualification | Hard cut at 2:58; checklist in SUBMISSION.md run on Nov 30 by 8 PM IST; secret scan of the repo |
| India night deadline fatigue | Medium | Sloppy submit | Submit by 10 PM IST Nov 30; nothing new is built after Nov 30 noon IST |

Bottom line: tonight Sprout scores about 3.25 and would risk Stage 1. Executed, it is a credible 4.0-4.5 Grand Prize contender with the strongest child-safety story in the visible field, and Best Android is the most reachable "Best of". The referee before/after and the cross-device distress alert are the two moments that separate Sprout from the crowd of redaction apps.
