# What wins grand prizes: audit of 18+ similar events

Research agent output, 2026-11-14. Archetype labels are the agent's own.

## Hybrid / edge events
| Event | 1st place | Notes |
|---|---|---|
| DeepMind x Cactus 2026 | CactusRoute: 7-layer router between on-device FunctionGemma and Gemini Flash | Explicit escalation logic |
| Same event, 2nd | cloudNein: "privacy airlock" for CFOs. A local model masks PII before the cloud, then unmasks the reply | Source badges in the UI |
| Gemma 4 Good 2026 | GEM-4 (care robot); 2nd Trido (offline voice whiteboard); 3rd PenguinAgent | Judges: "deep user empathy, robust offline fallback" |
| Gemma 4 Good special prizes | Gilbeot (offline walking guide for elderly users), KawanIsyarat (offline sign-language translator) | Praised for memory-aware model routing |
| MedGemma 2026 | EpiCast (community health worker reports to WHO signals) | |
| ExecuTorch 2026 | SafeScreen AI (on-device harmful-media blur); 2nd SixthSense | "Why local execution matters" |
| Arm AI Dev Challenge 2026 | Chuck'it (on-device semantic search over screenshots and notes) | |
| Qualcomm Edge AI Bengaluru 2025 | GameSense (small model narrates VR cricket) | |
| Nexa x Qualcomm 2026 | Health Passport (report photos to records) | |
| Cactus x Nothing 2025 | InnerSense (local keystroke emotion classifier) | |
| Swift Student Challenge 2026 | Pitch Coach (Foundation Models) | |

## Cloud-heavy events (contrast)
| Event | Winner |
|---|---|
| Gemini Live Agent Challenge 2026 | ORION (voice copilot for robotic surgeons) |
| Gemini 3 Hackathon | Globot (multi-agent supply chain); 3rd Netra |
| ADK Hackathon | SalesShortcut |
| ElevenLabs 2025 | Gibberlink |
| Solution Challenge 2025 | Medicall (Top 3) |

## Archetypes
- Accessibility for a named disability: 4. Wins grand at edge events, but never above 3rd at cloud events.
- Field or offline professional tool: 6.
- Private personal-data vault: 3.
- Enterprise agent swarm: 3.
- Safety: 1.
- Play or viral: 2.

## Judge psychology
- A scenario built around a person (ORION: the surgeon's hands are locked on the controls).
- Voice or camera that frees the hands.
- "Local execution is essential, not decorative."
- **Visible routing**: source badges and an explicit escalation decision.
- **Hard numbers on constrained hardware**, for example WER 32.7% to 19.0%, or 7.5 tokens/s on a Pi 5.
- Non-obvious means a cheap mechanism applied to an unexpected user.
- The problem can be stated in one sentence.
- It feels like a product, not a hackathon project.

## What lost
- Generic developer tools and dashboards: 12 of the 50 Gemini 3 winners, none in the top 3.
- Self-hyped pages.
- Summarizers and chat wrappers.
- A local model that is decorative.
- Cloud-only demos at edge events.
- Speed claims with no named user.

## White space
1. One codebase across Web, Android and iOS, with the same routing log.
2. Deferred refinement: an offline draft, upgraded later with a visible diff.
3. A privacy airlock for individuals (only an enterprise version exists: cloudNein).
4. A demo on a device without Nano, showing a quality indicator.
5. A user-facing cost and carbon routing meter.
6. A named-disability tool with human escalation.
7. A low-literacy regional-language field form.

## Sources
- https://sf.aitinkerers.org/hackathons/h_DRGnrtIWaG8/results
- https://sf.aitinkerers.org/hackathons/h_DRGnrtIWaG8/entries/ht_JxrxLBma8D0
- https://blog.google/innovation-and-ai/technology/developers-tools/winning-entries-gemma-4-good-challenge/
- https://blog.google/innovation-and-ai/technology/health/med-gemma-impact-challenge/
- https://pytorch.org/blog/building-the-future-of-on-device-ai-at-the-executorch-hackathon/
- https://newsroom.arm.com/blog/arm-ai-dev-challenge
- https://aihub.qualcomm.com/genai/bounty
- https://securitybrief.co.uk/story/global-hackathon-champions-private-on-device-personal-ai-apps
- https://www.apple.com/au/newsroom/2026/05/ai-meets-accessibility-in-this-years-swift-student-challenge/
- https://cloud.google.com/blog/topics/developers-practitioners/winners-and-highlights-of-the-gemini-live-agent-challenge
- https://gemini3.devpost.com/updates
- https://cloud.google.com/blog/products/ai-machine-learning/adk-hackathon-results-winners-and-highlights
- https://elevenlabs.io/blog/announcing-the-winners-of-the-elevenlabs-worldwide-hackathon
- https://dev.to/jsb-securedme/what-ai-hackathon-winners-actually-have-in-common-1kla
