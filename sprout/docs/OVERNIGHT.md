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
- [ ] 5. Third blind eval set (HANDOFF "Still open"): write it, run `pnpm eval`, record results in docs/EVAL.md and EVAL-HISTORY.md.
- [ ] 6. Submission prep: refresh README, docs/SUBMISSION.md and docs/DEMO_SCRIPT.md with the live URL, the new UI and current numbers.
- [ ] 7. Final: update docs/HANDOFF.md with the night's work, final screenshots, morning summary below.

## Needs you
- Dev tool upgrade (Vite 6.4.4+, Vitest 4.1.12+): a dependency change, so it waits for your OK.

## Log
- 01:30 Task 1 done: redesign fixes (contrast, tab focus, hover on touch, font weights, Welcome a11y). 76/76 unit, 53/53 e2e. Pushed 46ae217, Hosting deployed.
- 01:38 Task 2 done: dark --sun #e6b84f (ink 7.41:1), step bars visible. 76/76 unit, 53/53 e2e. Pushed c0795ce, deployed.
- 01:42 Task 3 done: 44 screenshots (360px + 1366px, light + dark, all tabs), no sideways scroll. Fixed parent header wrapping on phones, replaced developer copy in Family sync. 76/76, 53/53.
- 01:44 Task 4 done: 24 new unit tests (ledger, JSON parsers, big-brain view helpers, Remote Config merge). 100/100 unit, tsc clean. No bugs found in those modules. Pushed, no deploy needed (tests only).
