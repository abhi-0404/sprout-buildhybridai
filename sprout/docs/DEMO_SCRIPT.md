# Sprout: 3-minute demo video script

Judges may score from this video alone. **Hard limit: 3:00** (anything after is ignored; aim to end by 2:55). Upload to YouTube as **Public**, in English, with captions on.

Ready-made cards and captions: [`video/`](video/README.md) (`card-hook.png`, `card-title.png`, `card-end.png`, `captions.srt`).

## Before recording (15 minutes)
1. **When:** record just after the free Gemini quota resets (midnight Pacific = **1:30 PM IST**), so live answers work. The take uses only 3-4 real questions (about 3 cloud calls each). Do a dry run with the sample family only, never with real questions.
2. **Where:** the live app, https://buildhybridai-c1694.web.app, in your normal Chrome (not a fresh automated profile: Google's bot check can block those). Zoom 110%.
3. **Window:** 1920x1080. Chrome device mode "iPad Air" for the kid screens. Turn the laptop sound on: the sounds and the read-aloud voice are part of the demo.
4. **Warm the voice once before recording:** open the kid view, tap "Read to me" on any answer and let it finish. The voice model (about 90 MB) is now cached, so in the take it starts instantly.
5. **Recorder:** OBS Studio or the Windows Snipping Tool video recorder, 1080p 30 fps, system audio on.
6. **Reset before each take:** DevTools > Application > Local storage > Clear, then reload. (This also clears the saved model-skip list, which is fine.)
7. **Narration:** record separately and slowly. The narration is about 240 words (`docs/video/captions.srt`), so there is room to pause on each screen.

## Scene list
| Time | Screen | What you do | What you say |
|---|---|---|---|
| 0:00-0:12 | Title card, then the news headline | "Nearly 9 in 10 kids use AI" and the Common Sense Media, Oct 2026 headline | "Nearly nine in ten kids already use AI. Every chatbot sends a child's words, name and school to the cloud, and parents can't see what's asked." |
| 0:12-0:25 | Welcome screen, step 1 (the journey stickers) | Let the reveal play | "Sprout is an AI you can hand your kid. A guardian on the device hides who they are before anything goes online." |
| 0:25-0:50 | Kid view (after "Try a sample family" or your own short profile) | Type: *I'm Aarav from Green Park School, why do volcanoes explode?* Hear the send "bloop" and the thinking drops | "Watch the name and the school. Before anything leaves the laptop, Sprout swaps them for placeholders." |
| 0:50-1:10 | The answer, then tap the badge "Asked the big brain" to open the "Secret check" panel ("The big brain only heard") | Open the panel; point at `[CHILD]` and `[SCHOOL_1]` | "The big brain only heard: I'm [child] from [school]. The answer comes back, a second AI checks it before my child sees it, and the real name is put back on the device." |
| 1:10-1:25 | Same answer | Tap "Read to me" | "And it reads aloud with a natural voice made on the laptop itself, so even the spoken answer never goes to a cloud speech service." |
| 1:25-1:45 | Distress | Type: *kids at school say I'm stupid and I don't want to go* | "When a child is hurting, Sprout never improvises. The care message is written in advance and reviewed, it appears instantly, and the parent gets an alert, not a transcript." |
| 1:45-2:00 | Garden | Show the badge celebration, open the garden | "Kids earn badges for curiosity, not screen time: no streaks, and a daily limit that suggests a break." |
| 2:00-2:30 | Parent area | Hold Grown-ups, enter the PIN. Overview: **0 private details sent to the cloud**, details kept on the device. Then Activity: each step, where it ran, and the model name. Then Alerts | "Parents see proof, not promises: zero private details sent to the cloud, every step and where it ran, and alerts for the moments that matter." |
| 2:30-2:45 | Split: the parent Device check + a 3 s shot of the green Android and iOS GitHub Actions runs | Caption: "Android and iOS: same app, compiled in CI (not yet run on a phone)" | "With Gemini Nano in Chrome, or on Android and iOS, the guard, simple answers and the referee move onto the device. Built with Firebase AI Logic hybrid inference, App Check, Remote Config, Firestore and Auth." |
| 2:45-2:55 | End card | Logo, "Sprout: the AI you can hand your kid", GitHub link | "Sprout. The AI you can hand your kid." |

## Honesty rules (they protect us at Stage 1)
- **Cloud-safe mode:** your laptop has no Gemini Nano, so the kid view shows "Safety checks are running in cloud-safe mode". Keep it on screen; do not say "this answer was made on the device" unless the badge says "Sprout knew this!".
- **Sample family:** its answers are scripted and labelled "sample, scripted answer". If a sample turn is on screen, the label must be visible or captioned.
- **Platforms:** never show or say Android or iOS are "working" or "on a phone". The CI shot plus the caption above is the honest version.
- **If a live answer says "the big brain is resting":** the day's free quota is used up. Stop and record after the next reset (1:30 PM IST) rather than faking it.

## Tips
- **Show, don't tell:** every claim in the narration appears on screen at the same moment.
- **Sound:** keep the app sounds in; lower them a little in the edit under the narration.
- **Captions:** use YouTube auto-captions, then fix wrong words (Sprout, Gemini Nano, Firebase, Kokoro).
