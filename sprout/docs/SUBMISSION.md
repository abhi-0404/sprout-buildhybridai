# Devpost submission text (draft)

Paste each section into the Devpost form. Fill the `[ ]` placeholders before submitting.

**Project name:** Sprout
**Tagline:** The AI you can hand your kid: a small on-device AI guards a big cloud AI, so a child's identity never leaves the tablet.
**Platforms (select):** Web (Chrome) [+ Android] [+ iOS], only the ones that are actually built.
**Links:**
- Demo: https://buildhybridai-c1694.web.app
- Code: https://github.com/abhi-0404/sprout-buildhybridai
- Video: [YouTube URL]

## Inspiration
Nearly 9 in 10 children already use AI. In October 2026, Common Sense Media rated ChatGPT for Teens an "unacceptable risk": it missed more than 1 in 4 situations where a child needed crisis help, and its parental controls can't show what kids ask. Parents are left with a bad choice: ban AI, or hand their child's words, name, school and fears to a company's servers. We wanted a third option.

## What it does
Sprout is an AI helper for 6 to 12 year olds. Its core idea flips "hybrid inference" around: the on-device model is not a fallback, it is the child's **guardian**.

- **Hides identity before anything leaves.** The child's name, school, address and friends are replaced on the device: first by deterministic rules built from the parent's profile, then by Gemini Nano. The cloud only ever sees the sanitized question, and a hard gate blocks any cloud call that still contains a known identifier.
- **Guards every message on the device.** Safety classification runs on every message, so it has to be free, instant and private.
- **Answers simple questions on the device,** offline in the car, at zero cost.
- **Sends hard "why" questions to Gemini in the cloud,** sanitized, and the on-device model **referees the answer** before the child sees it.
- **Handles distress safely.** Sadness, bullying, abuse or online danger get a calm, pre-written reply (never generated) and a parent alert.
- **Gives parents alerts, not transcripts.** The dashboard proves the privacy promise with numbers: private details sent to the cloud (0), the share of AI work done on the device, and the estimated cloud cost saved.
- **Rewards curiosity, not screen time.** A curiosity garden and explorer badges, with no streaks, a parent-set daily limit, and no rewards for safety moments.

## How we built it
- **Firebase AI Logic hybrid inference:**
  - Web: `getGenerativeModel` with `InferenceMode` per task.
  - Each response's `inferenceSource` drives the visible "device or cloud" badges and the ledger.
  - Structured JSON output is used on both paths (`responseConstraint` on the device, `responseJsonSchema` in the cloud).
  - Gemini Nano runs the guard, the identity check, simple answers and the referee. Gemini runs the deep answers and the weekly parent note, which uses counts only.
- **Firebase products:**
  - App Check (reCAPTCHA Enterprise; debug provider in development).
  - Auth (Google sign-in for the family).
  - Firestore, offline-persistent: family alerts carry only kind, level and time, never text. Rules are append-only and members-only.
  - Remote Config: it can tighten policy but never loosen a parent's choice.
  - Hosting.
- **One codebase:** the platform-neutral TypeScript safety pipeline runs on web and inside Capacitor. Android uses `firebase-ai-ondevice` and iOS uses `HybridModel` through small native plugins.
- **Fails closed:** if any guard, referee or rewrite step fails, the child gets a safe fixed reply, never an unchecked model answer.

## Challenges we ran into
- **Small on-device context windows** (4-9k tokens) and single-turn limits. We designed the pipeline as short, structured, single-turn steps.
- **Model quality must not be a single point of failure.** Known identifiers and crisis phrases are caught deterministically first, with the model as a second layer.
- **Real phone input breaks naive rules:** curly apostrophes from phone keyboards and Hinglish phrasing slipped past the first version. Blind evaluation found these gaps and we fixed them by category.
- **Firebase Apple SDK 13 removed `HybridModel`,** so iOS pins 12.x.

## Accomplishments we're proud of
- **Measured, not claimed:** 623 synthetic test questions, run in a worst case that forces every question to the cloud with no help from the model. Three sets were written blind by separate authors; on the newest one, the rules alone (before any fix) kept 47 of 65 private details on the device and caught 12 of 16 urgent cases with 1 false alarm in 110. Fixing the misses by category brought every set to 0 leaks, every distress case caught and 0 false alarms, an optimistic number we label as such. The on-device model adds its own name detection on top of the rules. Results: `docs/EVAL.md`, first blind measurements: `docs/EVAL-HISTORY.md`.
- **Testing:** 139 unit tests and 53 end-to-end browser checks, including accessibility (axe) in light and dark mode.
- **An independent code review** found 3 serious fail-open bugs, and all are fixed with regression tests.

## What we learned
The best use of a small on-device model is not as a weaker copy of the cloud model, but as a different role: a privacy firewall and a referee that sits between a child and a powerful model.

## What's next
- A pilot with parent groups and schools.
- More languages (Hindi first).
- A Chrome extension so Sprout can guard other kids' apps.
- Clinician review of the distress replies.

## Built with
firebase-ai-logic, gemini-nano, gemini, firebase-app-check, firestore, firebase-auth, remote-config, firebase-hosting, react, typescript, vite, capacitor

## Text-description checklist (Stage 1)
- [ ] Says how Firebase AI Logic is used (above).
- [ ] Summarises features and value proposition (above).
- [ ] The repo is public with Apache-2.0 shown in About.
- [ ] Firebase AI Logic is imported and called at runtime (`app/src/ai/firebaseWeb.ts`).
- [ ] The video is public on YouTube, 3:00 or shorter, in English.
- [ ] No keys or debug tokens are committed.
