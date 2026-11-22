# Android: SproutAi Capacitor plugin

Kotlin plugin that calls Firebase AI Logic **hybrid inference** (Gemini Nano on the device, Gemini in the cloud) and tells the web layer where each request ran. It implements the `SproutAiPlugin` interface in `app/src/ai/capacitorAi.ts`.

Status: source only, not built on the machine that wrote it (no JDK or Android Studio there). Lines marked `VERIFY:` in `SproutAiPlugin.kt` are API names that the official page does not print; let Android Studio resolve them and fix as needed.

Docs: https://firebase.google.com/docs/ai-logic/hybrid/android/get-started

## Requirements
- Android Studio with a JDK 17+.
- `minSdk 26` (`firebase-ai-ondevice` needs API 26 or later; `firebase-ai` alone needs 24).
- A Gemini Nano device (for example Pixel 10, Galaxy S25) to see `device` results. Emulators have no AICore, so they only exercise the cloud path.
- A Firebase project with AI Logic (Gemini Developer API) and App Check set up (see `docs/SETUP.md`).

## Steps
Run from `app/` (pnpm only):

1. Add the Capacitor Android platform and create the project:
   ```
   pnpm add @capacitor/android
   pnpm exec cap add android
   ```
   (`capacitor.config.ts` needs `appId` and `appName`; the build output folder is `dist`.)
2. Build the web app and sync it: `pnpm build` then `pnpm exec cap sync android`.
3. Copy `native/android/SproutAiPlugin.kt` to `app/android/app/src/main/java/<your/package/path>/SproutAiPlugin.kt` and fix the `package` line to match.
4. Register the plugin in `MainActivity` **before** `super.onCreate`:
   ```kotlin
   import android.os.Bundle
   import com.getcapacitor.BridgeActivity

   class MainActivity : BridgeActivity() {
       override fun onCreate(savedInstanceState: Bundle?) {
           registerPlugin(SproutAiPlugin::class.java)
           super.onCreate(savedInstanceState)
       }
   }
   ```
5. Add the Google services plugin:
   - `app/android/build.gradle` (project level): `classpath 'com.google.gms:google-services:<latest 4.x>'` (VERIFY the version in the Firebase console instructions).
   - `app/android/app/build.gradle`: `apply plugin: 'com.google.gms.google-services'`.
6. Place `google-services.json` (from Firebase console, Android app) in `app/android/app/`. Do **not** commit it if it holds anything private; `.gitignore` it.
7. Add Gradle dependencies in `app/android/app/build.gradle`:
   ```gradle
   android {
       defaultConfig { minSdk 26 }
   }
   dependencies {
       implementation 'com.google.firebase:firebase-ai:18.2.0'
       // Not in the Firebase BoM: always pin the version.
       implementation 'com.google.firebase:firebase-ai-ondevice:16.0.0-beta08'

       // App Check: Play Integrity for release builds, debug provider for emulators and dev.
       implementation 'com.google.firebase:firebase-appcheck-playintegrity'
       debugImplementation 'com.google.firebase:firebase-appcheck-debug:20.1.0'

       // Coroutines used by the plugin (usually already present transitively).
       implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1' // VERIFY latest
   }
   ```
   If you use the Firebase BoM for other libraries, `firebase-appcheck-playintegrity` takes its version from it; the two artifacts above with explicit versions do not.
   Capacitor projects are Java by default: enable Kotlin by adding `org.jetbrains.kotlin.android` to the project and app Gradle files (Android Studio offers "Configure Kotlin in project").
8. App Check (required by AI Logic; enforcement is on since Nov 2 2026). In `MainActivity` (or a custom `Application` class), install the provider before any AI call:
   ```kotlin
   FirebaseApp.initializeApp(this)
   FirebaseAppCheck.getInstance().installAppCheckProviderFactory(
       if (BuildConfig.DEBUG) DebugAppCheckProviderFactory.getInstance()
       else PlayIntegrityAppCheckProviderFactory.getInstance()
   )
   ```
   For the **emulator** use the debug provider: run the app once, read the debug secret from Logcat (filter `DebugAppCheckProvider`), and add it in Firebase console under App Check > Apps > your Android app > Manage debug tokens. For release, register Play Integrity in the same screen and link the Play Console app.
9. Run: `pnpm exec cap run android` (or open `app/android` in Android Studio and press Run).
10. In the app, switch the AI client to `CapacitorAi` when `isNativePlatform()` is true (done in `src/state.tsx`).

## Behaviour notes
- Modes map one to one: `only_device` = `ONLY_ON_DEVICE`, `prefer_device` = `PREFER_ON_DEVICE`, `prefer_cloud` = `PREFER_IN_CLOUD`, `only_cloud` = `ONLY_IN_CLOUD`.
- The SDK never downloads the on-device model by itself. The web layer calls `prepareDevice()` (which runs `FirebaseAIOnDevice.download()`), and listens to `downloadProgress`.
- On-device requests are single-turn, limited to 4000 tokens, and run only while the app is in the foreground.
- Structured output: on-device Android does not take a manual JSON schema, so for JSON tasks the plugin appends the schema to the prompt and asks for JSON only. The TypeScript pipeline already validates and repairs JSON (`src/pipeline/json.ts`).
- AICore enforces a per-app quota; heavy use can return `BUSY` or `PER_APP_BATTERY_USE_QUOTA_EXCEEDED`. The router should fall back to the cloud for non-private work.
- The Firebase console does not show on-device calls.
