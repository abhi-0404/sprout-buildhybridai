# Competitor scan: #BuildHybridAI 2026 (as of 2026-11-26)

Method: web search plus page fetches. The Devpost gallery and updates pages return HTTP 403 to automated fetch, so the official gallery could NOT be read and the true entry count is unknown. Everything below comes from public GitHub repos found by search (a sample, not the full field; Devpost showed 1,981 participants on 2026-11-13). Counts and claims are from each README and are unverified beyond that. No X, LinkedIn or YouTube entry posts were found (search returned nothing relevant; X is paywalled to fetch).

## 1. Public entries seen (platform: W=web/Chrome, A=Android, I=iOS)

| Entry | Plat | Idea | State | URL |
|---|---|---|---|---|
| Clause Guard | W A I | Contract review, PII masked on device, restored locally. Shared React UI + thin bridges | in dev | https://github.com/lgudip-01/-BuildHybridAI |
| CloakBridge | W A | "On-device AI as privacy firewall for cloud AI": placeholders, zero-leak gate, Firestore rules | 4 commits, live web | https://github.com/romilp619/cloakbridge-hybrid-ai |
| PII-Zero | W A | Clinical/legal airlock: scrub, leak check, cloud review, restore (Chrome MV3, Fold7 layout) | 23 commits, APK | https://github.com/gil906/devpost-buildhybridai-2026-31808 |
| Chaukas (Anushka180712) | W A I | Family scam shield; cloud only after PII removal; 83 web tests | 16 commits | https://github.com/Anushka180712/Build-HybridAI |
| Plainly | W A I | Lab results/watch data explained on device; cloud opt-in, sends only test name+numbers | v0.1.7 APK; iOS simulator only | https://github.com/Aditya-galaxy/plainly/releases/tag/buildhybridai-2026 |
| GrassVault | W A I | Personal vault, Nano/Foundation Models, cloud for heavy synthesis | 4 commits | https://github.com/sparklenetengine-create/GrassVault |
| FieldScribe | W I | Clinical/accessibility intake, mask PII before opt-in cloud | 5 commits | https://github.com/jaharoni/fieldscribe-hybrid-ai |
| KnowMe | W A | Passport for non-verbal children (parent notes, carer Q&A offline); redaction, medical never sent | 3 commits | https://github.com/Duaezehra1/knowme |
| Travel Copilot | I only | Offline trip companion, SwiftUI, Wallet, 146 tests; TestFlight 1.0 uploaded, iPhone SE (no Apple Intelligence) | most polished iOS | https://github.com/dhsdb010/buildHybridAi |
| Rounds Companion | I (+W stretch) | Golf shot notes on device, cloud debrief | early | https://github.com/Luh-Labs-LLC/rounds-companion |
| TIROIR "Fiche express" | W I | Photo to item sheet, on-device badge vs cloud badge | Swift never compiled | https://github.com/sirools/TIROIR-app-V2/pull/124 |
| Repro Offline | W | QA notes to bug report; local-only mode for secrets | 75 commits | https://github.com/RealCloudyPanda/BuildHybridAI |
| CubiSlot 3D | W | Warehouse/home slotting digital twin | v1.1.0, submit Nov 28 | https://github.com/lightgo-la/BuildHybridAI-2026 |
| Relay (moruku36) | W | Workboard, inspected-prompt dispatch, Rust/WASM | 89 tests | https://github.com/moruku36/buildhybridai-2026 |
| Bill Saathi | A (Flutter) | Multilingual banking help, not yet validated on device | early | https://github.com/MuhammadTayyabNasir/BuildHybridAI |
| DongengKu | W | Children's bilingual story companion | submit checklist unchecked | https://github.com/trapjack212-spec/dongengku |
| Maodou Companion | W | Daily companion for school-avoidant kids, localStorage only | 12 commits | https://github.com/qiangsi/maodou-companion-web |
| Others (all W, Chrome ext/web, "summarize/study/notes/scam"): HybridNotes, NanoDesk, Briefly, Lentera, QuizForge, Hybrid Study, Veye, SpoilerVeil, Citeready, Tutorial Time Machine, PayShield, Privacy Relay, VeilAI | W | Mostly summarizers, study tools, scam/spoiler filters | | e.g. https://github.com/KLe518314/hybridnotes , https://github.com/bastien509/veye , https://github.com/py950313/buildhybridai-privacy-relay , https://github.com/Weoxx62/VeilAI-BuildHybridAI |

Typical quality: 0 stars, few commits, many README-only claims, several unverified on a real device. Most are solo or small, built in the last two weeks.

## 2. Kid-safety / parental overlap with Sprout

- No entry found that is a kid-facing chat assistant with on-device PII redaction plus an age-fit referee (searched "kid/child/parent/family" with the hashtag). Sprout's exact combination looks unclaimed. Caveat: Devpost gallery unreadable; a private or late entry could exist.
- Adjacent children entries: KnowMe (carer tool, parent is the author, redaction, parent consent gate), DongengKu (story generator, no stated PII or content filter), Maodou (mood check-in, local storage, no referee). Chaukas is family-oriented but about scams.
- The "privacy airlock" idea is NOT white space any more. Doc 04 said only enterprise versions exist (cloudNein); at least eight entries now do mask, send, restore: Clause Guard, CloakBridge, PII-Zero, Chaukas, FieldScribe, KnowMe, Privacy Relay, VeilAI. A judge may see "strip PII on device" as the common pattern. Redaction alone will not differentiate Sprout.
- Outside the hackathon: on-device child safety exists commercially (SafeToNet HarmBlock https://safetonet.com/harmblock/how-harmblock-works/ , CyberGuardian https://www.ischool.berkeley.edu/projects/2025/cyberguardian). Neither is a chat assistant for children.

How Sprout should differentiate (what nobody else shows):
1. Lead with the child as the user and the referee loop: device model checks the cloud answer for age-fit and rewrites it. Other entries only protect inputs. Show "cloud answer for a 7-year-old, before vs after".
2. Lead with distress handling as deterministic, not generated (scripted reply plus parent alert). Strong human stakes; no competitor has it.
3. Show numbers: leak-test harness (0 known-identifier leaks), referee catch rate, share of turns answered on device, cloud cost per week. Competitors report unit-test counts, not safety metrics.
4. Show the "what the big brain saw" split view and per-answer inferenceSource badges (NanoDesk and TIROIR also badge; keep the child/parent framing).
5. Show the no-Nano device banner ("cloud-safe mode") so redaction still holds. Only Plainly and Travel Copilot show graceful non-Nano behaviour.
6. Do not market it as "a privacy airlock". Market it as "the AI you can hand your kid", with the airlock as a mechanism.

## 3. Category crowding

- Web/Chrome: crowded. Roughly 25+ of the repos found are web or Chrome extensions; the dominant themes are summarizers, study companions, notes, scam/spoiler shields, and text studios (NanoDesk, Briefly, Lentera, HybridNotes). Easiest platform to enter, hardest to stand out in. Past evidence: Chrome Built-in AI Challenge 2025 had 14,000+ registrants and 1,300+ submissions (https://developer.chrome.com/blog/ai-challenge-winners-2025). Expect the web prize to be won on polish and purpose, not novelty.
- Android: moderate. Found: Clause Guard, CloakBridge, PII-Zero, Plainly, KnowMe, Chaukas, GrassVault, Bill Saathi. Gemini Nano 4 plus the beta firebase-ai-ondevice dependency limits who can demo it; several repos ship debug APKs only.
- iOS: thin but not empty. About 9 repos list iOS (Travel Copilot, Rounds Companion, Plainly, Clause Guard, Chaukas, GrassVault, FieldScribe, TIROIR, Fiche express). Only Travel Copilot is iOS-only with a real build (TestFlight 1.0 uploaded; its README says on-device AI not yet tested on an Apple Intelligence phone). Plainly iOS runs in the simulator only (README). TIROIR's Swift module has never been compiled (PR text). Others show no device results. Reasons it stays thin: needs a Mac, an Apple Intelligence phone, and SDK 12.13+ (https://firebase.google.com/docs/ai-logic/hybrid/ios/get-started). Evidence is a sample of search hits, not the gallery; treat "thin" as likely, not proven.
- Implication: Best iOS prize ($3k) is most contestable for a real-device build. Travel Copilot is the one to beat: SwiftUI-native, 146 tests, Wallet, Live Activities. Sprout's iOS (Capacitor, rented Mac) will look less native; the video must show a genuine on-device Foundation Models answer and the `inferenceSource` badge on a real iPhone.

## 4. Organizer and judge signals (all from official or Google pages)

- Judging criteria equal weights, Tech wins ties (doc 01). Official wording: "how effectively it uses hybrid inference".
- Multi-platform gets "strong consideration" for the Grand Prize (doc 01; official text at research/00-hackathon-official/devpost-rules.txt).
- Chrome Built-in AI Challenge 2025 winners post: hybrid winners "seamlessly integrate client-side and server-side AI", state a clear reason for the hybrid approach, and address a significant need. Winners were Mentelo (extension) and Trail (offline trail companion). https://developer.chrome.com/blog/ai-challenge-winners-2025 . Judging there used functionality, purpose, content, UX, technical execution. No judge quotes were published.
- Organizer updates (local copy research/00-hackathon-official/devpost-updates.txt): only two posts found, the Nov 12 Build Session (Cynthia Jiang, Firebase; 30 min code, 15 min Q&A; recording to be shared) and the Nov 11 open notice. No FAQ answers about what judges want were visible. Unverified: later updates or Discord answers (#hackathon-help, tag #BuildHybridAI) may exist; not readable.
- Resources page "Inspiration" lists Finnish IT, Jojo Apps and Karrot (apps) and free-tier ideas: realtime voice and camera coach (Gemini Live), PDF reader, multiplayer AI tabletop game master (devpost-resources.txt). Signals that production-grade, consumer apps and voice/camera are welcome.
- Technical signals: Android hybrid blog (https://android-developers.googleblog.com/2026/07/build-intelligent-android-apps-cloud-hybrid-inference.html) shows custom routing logic as the "complex case", and a DEV post warns PREFER_ON_DEVICE silently falls back to cloud on unsupported hardware (https://dev.to/bolgercarol/on-device-or-cloud-building-hybrid-ai-inference-into-your-android-app-with-firebase-ai-logic-3p1i). Showing the actual route taken is therefore a differentiator. App Check enforcement for AI Logic starts Nov 2 2026 (Firebase docs).
- Third-party aggregators disagree on prize ($10k vs $30k) and dates; Devpost text (doc 01) governs.

## Recommendations (3 days left)
1. Keep Sprout's lead: referee loop, deterministic distress path, and safety numbers. Add one slide comparing "sanitize input only" (common) against "sanitize input, check output, escalate distress" (Sprout).
2. Put real-device footage first for iOS if at all possible; a simulator or no-Nano iPhone is what most iOS rivals have.
3. Make routing visible in every frame (badges, ledger); name the reason for hybrid in the first 20 seconds.
4. Avoid copy that says only "PII stays on device"; it now reads as the default pattern.
