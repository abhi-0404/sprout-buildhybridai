# Prior art: Google on-device AI challenges

## Status of this hackathon's own pages
- The #BuildHybridAI project gallery was not published as of Nov 13-14.
- The /discussions page returned a 404.

## Past winners
| Event | Winner | What it does | Why it likely won |
|---|---|---|---|
| Chrome AI 2025 | Nutshell | Hands-free browsing (head and mouth tracking) | Specific disability, no special hardware |
| Chrome AI 2025 | AAC Board AI | Communication board for non-speaking users | Tested Prompt API reliability and used only APIs that were reliable |
| Chrome AI 2025 | Phonaify | Pronunciation feedback | Audio input |
| Chrome AI 2025 | Pet Shelter App | Photo to adoption profile | Full-stack product, cost argument |
| Chrome AI 2025 | Mentelo (Best Hybrid, extension) | Broad on-page toolkit | |
| Chrome AI 2025 | Trail (Best Hybrid, web) | Offline hiking PWA | The hybrid reason is obvious: no signal |
| Chrome AI (first) | WP On-Device AI, Mochi, Crooked Tankard, Opale, Orma, BrowseGraph | | |
| Gemini API Comp 2024 | Jayu (overall), Vite Vere (impact), Gaze Link (Android), Outdraw, Pen Apple, Trippy (Firebase), Viddyscribe | | |
| Gemma 3n Impact 2025 | Gemma Vision, Vite Vere Offline, 3VA | All accessibility | |
| Gemma 4 Good 2026 | GEM-4, Trido, PenguinAgent | | |

## Lessons
1. Accessibility wins often, but only when it is specific.
2. Best Hybrid went to a use case with an obvious reason for hybrid.
3. Complete products beat proofs of concept.
4. Winners work around model limits.

## Inspiration projects on the Resources page
- Finnish IT (YKI exam coach, Gemini TTS)
- Jojo Apps (meal planner TTS)
- Karrot (translation banner: 1 in 3 users used it, and they were 2.4x more likely to start a chat; on-device was rejected)

## Saturated ideas (avoid)
- Summarizers, tab or history memory
- Writing assistants
- Sidebar chat
- Generic ADHD or dyslexia readers
- Translators, privacy-policy checkers
- Study tools
- Text adventure games
- Generic accessibility kits
- Pure on-device apps

## Gaps (inference)
- Native iOS and Android hybrid: there is little prior art.
- Device and cloud with *different roles*.
- Regulated or sensitive domains.
- Offline field work.
- Mobile multimodal capture.
- A visible cost angle.
- Underserved languages.
- Full use of the Firebase stack.

## What Google says it wants
- On-device is private, fast and free; the cloud covers the long tail ("reach 100% of your audience").
- Use custom routing (language, connectivity, battery).
- The App Check requirement signals production-grade expectations.

## Sources
- https://developer.chrome.com/blog/ai-challenge-winners-2025
- https://developer.chrome.com/blog/ai-challenge-winners
- https://developers.googleblog.com/en/announcing-the-winners-of-the-gemini-api-developer-competition/
- https://blog.google/innovation-and-ai/technology/developers-tools/developers-changing-lives-with-gemma-3n/
- https://blog.google/innovation-and-ai/technology/developers-tools/winning-entries-gemma-4-good-challenge/
- https://firebase.blog/posts/2026/09/ai-logic-text-to-speech/
- https://developer.android.com/blog/posts/gemini-and-firebase-ai-logic-enabled-karrot-to-increase-sales-with-a-translation-feature
- https://firebase.blog/posts/2025/10/understand-ai-logic-hybrid-inference/
- https://android-developers.googleblog.com/2026/07/build-intelligent-android-apps-cloud-hybrid-inference.html
