# Overnight run: Nov 27-28 (user back at 6:00 am)

Approved by the user tonight: commit and push to origin/main, and redeploy Firebase Hosting, after the
tests pass and a reviewer has checked the change. No new dependencies, no deleted files, no force-push.
Before each wake-up's work: read this file, do the first unchecked task, tick it, add one line to the log.

## Rules for each task
- Keep it small. Run build + `pnpm test` + `pnpm e2e` in `app/` (stop the leftover preview on port 4174 afterwards).
- Code changes: one reviewer agent pass (Opus) before commit. Docs-only changes: no reviewer.
- Commit (no AI credit), push, `pnpm hosting` when app code changed.
- If something needs the user (a dependency, a download, a decision), write it under "Needs you" and move on.
- Never use em or en dashes.

## Queue
- [x] 1. Apply reviewer fixes to the redesign, test, push, deploy (46ae217, live).
- [x] 2. Dark mode comfort: soften --sun in dark mode, make the unfinished Welcome step bars visible.
- [x] 3. UI polish pass: screenshot every kid and parent screen at 360px and 1280px, light and dark. Fix overflow, spacing, contrast, empty states.
- [x] 4. Bugs and coverage: list modules in `app/src` without unit tests, add tests for the most important ones, fix bugs found.
- [x] 5. Third blind eval set: written blind by a separate agent, measured once (f09fd3f). 18 of 65 details leaked (deterministic layer), urgent 12/16, concern 7/24, 1 false alarm.
- [x] 5b. Fix the v3 misses by category (fuzzy profile names, unlisted names after relation words, flat/pincode/roll no/route, handles, running away, threats, bullying, Hinglish). Reviewer pass required (safety code). Then update the claims in README and SUBMISSION honestly.
- [x] 6. Submission prep: refresh README, docs/SUBMISSION.md and docs/DEMO_SCRIPT.md with the live URL, the new UI and current numbers.
- [x] 8. Live smoke test of https://buildhybridai-c1694.web.app in real Chrome: welcome, sample family, kid question, parent gate, console errors.
- [x] 9. Performance: split the large first-load JS chunk (Vite warns over 500 kB) so phones open the app faster. Tests + reviewer.
- [x] 7. Final: update docs/HANDOFF.md with the night's work, final screenshots, morning summary below.

## Needs you
- **Live cloud answers fail in automated Chrome** (Nov 27 smoke test): App Check reCAPTCHA exchange returns 403, every Gemini call 401, the kid sees "I couldn't double-check that question". Config is correct (key domains, site key, App Check registration all match), so the likely cause is a reCAPTCHA score under the 0.5 minimum for a fresh automated profile. Check: open https://buildhybridai-c1694.web.app in your normal Chrome, Try a sample family, ask "Why is the sky blue?". If it fails there too, lower App Check > Apps > Sprout web > reCAPTCHA Enterprise > minimum score (for example 0.3). Note: after one 403 the SDK blocks that browser for 24 h, so test in a different profile after changing it.
- Record the demo video (docs/DEMO_SCRIPT.md) and paste its YouTube link into docs/SUBMISSION.md.
- Pick the Devpost platforms: Web is live; Android (debug APK) and iOS (simulator build) only build in CI so far.
- Dev tool upgrade (Vite 6.4.4+, Vitest 4.1.12+): a dependency change, so it waits for your OK.

## Log
- 01:30 Task 1 done: redesign fixes (contrast, tab focus, hover on touch, font weights, Welcome a11y). 76/76 unit, 53/53 e2e. Pushed 46ae217, Hosting deployed.
- 01:38 Task 2 done: dark --sun #e6b84f (ink 7.41:1), step bars visible. 76/76 unit, 53/53 e2e. Pushed c0795ce, deployed.
- 01:42 Task 3 done: 44 screenshots (360px + 1366px, light + dark, all tabs), no sideways scroll. Fixed parent header wrapping on phones, replaced developer copy in Family sync. 76/76, 53/53.
- 01:44 Task 4 done: 24 new unit tests (ledger, JSON parsers, big-brain view helpers, Remote Config merge). 100/100 unit, tsc clean. No bugs found in those modules. Pushed, no deploy needed (tests only).
- 02:03 Task 5b done: v3 misses fixed by category; Opus review found 3 must-fix (jk filter, game filter, false urgent) + address-order leak + over-redaction, all fixed with regression tests. All 4 sets: 0 leaks, all distress caught, 0 false alarms (optimistic, labelled). 139/139 unit, 53/53 e2e. README, SUBMISSION, WINNING-PLAN claims updated honestly.
- 02:03 Task 6 done: live link, GitHub link, test counts and honest eval claims in README/SUBMISSION/DEMO_SCRIPT; root README fixed (no long dashes, pnpm); checklist verified (public repo, Apache-2.0, AI Logic import, no secrets).
- Nov 27 17:40 Task 8 done: live smoke test in headless and visible Chrome. Welcome, sample family, kid view, parent gate, all 6 parent tabs work, no sideways scroll at 390px, no JS exceptions. Cloud answers fail (App Check 403, see Needs you).
- Nov 27 17:45 Task 9 closed without code change: first load is one 364 kB JS file, 100 kB over the wire (brotli). The 696 kB chunk Vite warns about is Firestore, already lazy-loaded. Not worth the risk before the deadline.
- Nov 27 17:50 Task 7 done: HANDOFF.md updated.
- Nov 27 17:50 IST App Check minimum score lowered to 0.3 (user approved). Automated Chrome still 403. Waiting on the user's own Chrome test.
