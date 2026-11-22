# Shortlist and final decision (2026-11-14)

## User direction
- Rejected the earlier ideas as "too niche / boring".
- Wants a **consumer everyday app**.

## Candidates checked against prior art
- **AI feed filter (ragebait, slop, spoilers): dropped as saturated.** Several Chrome extensions already use Gemini Nano for this:
  - CleanX
  - Slopguard (rules plus Nano)
  - HateBlocker
  - FeedShield
  - Bouncer (open source)
  - FocusTube
  - SentryFeed
- **Honest Cart (fake reviews and dark patterns after Fakespot shut down in July 2025):** viable, but checkers of this kind already appeared in past Chrome challenges, and the mobile flow would be share-only.
- **Stealth (private job hunt):** crowded market (Simplify, Teal, Jobright).

## Decision: **Sprout, the AI you can hand your kid** (chosen by the user)

### Evidence
- **Kids already use AI:** nearly 90% of children use it (Common Sense Media). https://www.commonsensemedia.org/articles/nearly-90-of-children-are-using-ai-are-we-prepared-for-what-this-means
- **Teen safeguards are failing:** on Oct 7 2026, Common Sense rated ChatGPT for Teens an "unacceptable risk". It missed more than 1 in 4 warranted crisis referrals, and its parental controls cannot show conversations.
  - https://axios.com/2026/10/07/chatgpt-teens-safety-risk-common-sense-media
  - https://abc30.com/story/guardrails-openais-chatgpt-teens-dont-work-promised-watchdog-group-says/19922264/
- **Teens use AI companions:** more than 70% have used one, and half use them regularly.
- **Gemini for under-13s** requires a parent to enable it in Family Link. https://notebookcheck.net/chatgpt-gemini-meta-ai-what-parents-can-control-in-ai-chatbots.1445374.0.html
- **Policy momentum:** Common Sense and OpenAI back the Parents & Kids Safe AI Act. https://www.commonsensemedia.org/press-releases/common-sense-media-openai-join-forces-on-strongest-youth-ai-safety-measure-in-us
- **No on-device or hybrid kid-safe AI was found.** A Chrome AI challenge entry called "Safe Mode" exists, but its content was not verified.

### Why it fits
- **Hybrid is the core of the product:**
  - On the device: deterministic identity redaction, then a Nano guard and NER pass, simple answers offline, a referee that checks cloud answers, and deterministic distress scripts.
  - In the cloud: hard "why" questions (sanitized text only) and a weekly digest built from counts only.
- **It fills the white space found in the winners audit:**
  - a privacy airlock for individuals;
  - visible routing;
  - a cost meter;
  - a demo on a device without an on-device model;
  - multi-platform.

The full plan is in `sprout/docs/PLAN.md`.
