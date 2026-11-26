# Zero-install Android loop (checked 2026-11-26)

[V] verified from a fetched page, [U] unverified or inferred.

## 1. Firebase Studio: not usable, drop it
- Sunset announced 2026-03-19. New workspace creation and sign-up disabled 2026-06-22. Shutdown 2027-03-22, all data deleted. Only existing workspaces keep working [V] https://firebase.google.com/docs/studio/migrating-project
- Docs still say access is at no cost but "new workspace creation and user signup are no longer supported" [V] https://firebase.google.com/docs/studio
- A new account cannot create a workspace. Its docs describe no Android emulator image, build CLI or Gemini Nano support [V, page silent].

## 2. Alternatives and exact free limits
| Service | Free limit | Use here |
|---|---|---|
| Actions, public repo | Standard hosted runners free [V] https://docs.github.com/en/actions/concepts/billing-and-usage | Build debug APK |
| Actions, private repo | $12 compute per month, about 2,000 Linux min [V, computed] https://docs.github.com/en/billing/concepts/product-billing/github-actions | Fallback |
| Actions artifacts | 500 MB shared with Packages [V, same page] | Keep APKs small |
| Codespaces Free plan | 120 core-hours per month (about 60 h on 2 cores), 15 GB-month; blocked after quota without a card [V] https://docs.github.com/en/billing/concepts/product-billing/github-codespaces | Gradle shell only, no emulator screen. `/dev/kvm` there is [U] |
| Appetize Free | 30 min per month, 3 min sessions, 2 concurrent devices, no card [V] https://appetize.io/pricing and https://support.appetize.io/may-i-test-appetize.io-for-free-before-paying-for-an-account. Android on Free and a public-app rule are [U] | Judge-facing clip |
| ApkOnline | No account, under 100 MB, Android 7 to 10 [V via review] https://codersera.com/blog/online-android-emulator-in-browser/amp/ | Last resort |
| BrowserStack trial | 30 min [V via same review] | Skip |

An emulator can also run inside Actions: 2-vCPU Linux runners got KVM acceleration, needing a udev step to open `/dev/kvm` [V] https://github.blog/changelog/2024-04-02-github-actions-hardware-accelerated-android-virtualization-now-available/. A CI job can boot it and upload screenshots. The exact emulator action is [U].

## 3. Recommended loop
One-time (user, about 20 min): make the repo public, supply `google-services.json` and the `VITE_*` flags to CI, create a free Appetize account.

Per iteration:
1. Agent: edit, `pnpm build`, `git push`, `gh run watch`; on failure `gh run view --log-failed` and fix. No local Android Studio.
2. Actions: `./gradlew assembleDebug`, upload the APK artifact; on a tag, `gh release create` gives a stable public APK URL.
3. Agent: `gh run download` pulls the emulator screenshots, its only view of the UI.
4. User: upload the APK to https://appetize.io and click Run in the browser. Only 30 min per month, so save it for checks and one demo clip. Daily UI checks use the web build in a laptop browser.
5. User on a real phone: open the GitHub Release page, download the APK, allow unknown-app install. This is the only path that runs Gemini Nano.

## 4. Gemini Nano without a supported phone
No. AICore needs a supported physical device [V] https://developers.google.com/ml-kit/genai/prompt/android/get-started . A forum thread asking for an emulator workflow shows no answer [V] https://discuss.ai.google.dev/t/is-there-any-official-emulator-simulator-workflow-for-gemini-nano-aicore-prompt-api-testing-on-android/147148 . Emulators must show "unsupported" and use the cloud path. Nano proof needs a borrowed phone or remote lab (android.md section 3).

## Conclusion
Build in Actions, view in Appetize, prove Nano on a borrowed Galaxy S25, OnePlus 13 or similar phone.
