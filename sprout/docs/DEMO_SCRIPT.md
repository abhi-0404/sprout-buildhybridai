# Sprout: 3-minute demo video script

Judges may score from this video alone. **Hard limit: 3:00** (anything after is ignored). Upload to YouTube as **Public**, in English, with captions on.

## Before recording (10 minutes)
1. **App state:**
   - Run `pnpm build && pnpm preview` in `sprout/app` (or use the hosted URL once deployed).
   - Open Chrome in a clean profile. Zoom to 110% so text reads well on video.
   - If Firebase is connected and Gemini Nano is available, the demo uses real AI. Otherwise it runs in Demo mode, and the video must say so honestly.
2. **Window:** 1920x1080. Use Chrome device mode set to "iPad Air" for the kid screens: it looks like a child's tablet.
3. **Recorder:** OBS Studio or the Windows Snipping Tool video recorder, at 1080p and 30 fps.
4. **Voice:** record the narration separately, and slowly. One take per scene is fine.
5. **Reset before each take:** in DevTools, Application > Local storage > Clear. Then reload.

## Scene list
| Time | Screen | What you do | What you say (narration) |
|---|---|---|---|
| 0:00-0:15 | Black title card, then a news headline screenshot | Show the title "Nearly 9 in 10 kids use AI" and the Common Sense Media, Oct 2026 headline | "Nearly nine in ten kids already use AI. In October, Common Sense Media rated ChatGPT for Teens an unacceptable risk. Parents can't see what kids ask, and every chatbot sends a child's words to the cloud." |
| 0:15-0:30 | Welcome screen | Show the headline and the device-vs-cloud picture | "Sprout is an AI you can hand your kid. A small AI on the device guards a big AI in the cloud." |
| 0:30-0:55 | Kid start screen | Tap the "Today's wonder" card, or type: *I'm Aarav from Green Park School, why do volcanoes explode?* | "Here's the trick. The child types their name and school. Before anything leaves the tablet, the on-device model hides who they are." |
| 0:55-1:15 | Answer, then open the badge's **Secret check** | Tap "Asked the big brain", then open "For grown-ups" | "The big brain only heard: 'I'm [your name] from [your school]'. The answer comes back, and the device checked it first. Every step shows where it ran: on the device, or in the cloud." |
| 1:15-1:30 | Simple question | Tap "Why do cats purr?" or ask "what is the moon made of?" | "Simple questions never leave the device at all. Instant, free, private." |
| 1:30-1:50 | Offline | DevTools > Network > Offline. Ask "why is the sky blue?". Go back online and wait for "✨ The big brain added more" | "No internet in the car? Sprout still answers on the device, and the big brain adds more when we're back online." |
| 1:50-2:10 | Distress | Type *kids at school say I'm stupid and I don't want to go* | "When a child is hurting, Sprout never improvises. It gives a calm, reviewed message, and the parent is told. Alerts, not transcripts." |
| 2:10-2:30 | Garden and badge | Show the confetti moment, then open the 🌻 garden | "Kids earn badges for curiosity, not screen time. No streaks, and after the parent's daily limit Sprout suggests a break." |
| 2:30-2:50 | Parent dashboard | Hold Grown-ups, enter the PIN. Show the Overview: 0 details sent, % on-device, cost saved. Then show Alerts | "Parents see the proof: zero private details sent to the cloud, most AI work done on the device, and the cost saved. Built with Firebase AI Logic hybrid inference, App Check, Firestore, Auth and Remote Config." |
| 2:50-3:00 | End card | Logo, "Sprout: the AI you can hand your kid", GitHub link | "Sprout. The AI you can hand your kid." |

## Tips
- **Show, don't tell:** every claim in the narration appears on screen at the same moment.
- **Platforms:** if Android or iOS footage exists, add a 5-second split screen: "The same app on Android and iOS". Never show a platform that wasn't built.
- **Demo mode:** if the video uses Demo mode, add a caption: "Demo shown with simulated AI; the privacy and safety pipeline is real." Honesty protects us at Stage 1.
- **Captions:** use YouTube auto-captions, then fix any wrong words.
