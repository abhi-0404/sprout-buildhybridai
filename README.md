# Sprout — Google #BuildHybridAI 2026 entry

**Sprout is an AI assistant a parent can safely hand to a 6–12 year old.** A small on-device model acts as
the child's guardian: it strips identity before anything leaves the tablet, answers simple questions offline,
checks every cloud answer for age fit and catches distress. The big cloud model only ever sees a sanitized
question.

Built for Google's [#BuildHybridAI 2026](https://firebasehybridaihackathon.devpost.com) hackathon with
**Firebase AI Logic hybrid inference** (Gemini Nano / Apple on-device model + Gemini in the cloud).
Submission deadline: Nov 30 2026.

## Repository layout

```
sprout/          the app — see sprout/README.md for the full design
  app/           React + Vite + Capacitor (web and Android), Firebase AI Logic, tests and evals
  firebase/      Firebase config, rules and App Check setup
  native/        native (Android / iOS) bridge code
  shared/        prompts and safety rules shared across platforms
  docs/          architecture and build notes
research/        hackathon research: rules, SDK findings, prior art, idea pool, final decision
```

## Run the app

```bash
cd sprout/app
npm install
npm run dev        # web, http://localhost:5173
npm test           # unit tests (Vitest)
npm run eval       # safety / quality evals
npm run build && npx cap sync android   # Android build via Capacitor
```

Firebase project settings and App Check debug tokens are needed for cloud calls; see `sprout/README.md`
and `sprout/docs/`. No secrets are stored in this repository.

## Research trail

Start with `research/README.md`, then `08-shortlist-and-decision.md` for why Sprout was chosen.
