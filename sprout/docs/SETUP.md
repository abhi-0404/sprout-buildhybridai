# Setup: Firebase project and Chrome on-device model

These steps need your Google login, so they are done by hand once, in about 20 minutes.

## 1. Create the Firebase project
1. Open https://console.firebase.google.com and click **Create a project**. Name it `sprout-hybrid` (any name works). Google Analytics is optional.
2. Go to **Build > AI Logic** and click **Get started**. Choose the **Gemini Developer API**, which is the free Spark tier with no billing.
3. Go to **Project settings > General > Your apps**, add a **Web app** called "Sprout web", and copy its config values.
4. In `app/`, copy `.env.example` to `.env.local` and fill in the `VITE_FIREBASE_*` values. `.env.local` is git-ignored.

## 2. App Check (required by AI Logic)
1. Go to https://console.cloud.google.com/security/recaptcha in the same project and create a **reCAPTCHA Enterprise** key. Use type: Website, domains: your Firebase Hosting domain (`<project>.web.app`). Do **not** add `localhost`.
2. Back in Firebase, open **Build > App Check > Apps > Web app**. Register **reCAPTCHA Enterprise** with that site key.
3. Put the site key in `.env.local` as `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY`.
4. For local development, run `pnpm dev` and open the app. The browser console prints an **App Check debug token**. Add it under **App Check > Apps > Web app > Manage debug tokens**.

## 3. Auth and Firestore (needed for the parent dashboard, Day 4+)
1. **Build > Authentication > Get started**, then enable **Google** sign-in.
2. **Build > Firestore Database > Create database** in production mode, choosing a nearby region.

## 4. Chrome on-device model (Gemini Nano)
1. Use the latest Chrome desktop (Chrome 157 is installed).
2. Run `pnpm dev`, open http://localhost:5173, and go to the **Device check** tab.
3. Click **Check availability**:
   - `available`: done.
   - `downloadable`: click **Download / prepare model** and wait. It is several GB.
   - `unavailable`: open `chrome://on-device-internals` to see why. This laptop has an RTX 3050 with exactly 4 GB of VRAM, and Chrome wants more than 4 GB, so it may refuse the GPU. Things to try:
     - `chrome://flags/#optimization-guide-on-device-model` set to **Enabled BypassPerfRequirement**, then relaunch. This is unofficial.
     - `chrome://flags/#prompt-api-for-gemini-nano` set to **Enabled**.
     - Keep at least 22 GB free on the drive that holds the Chrome profile.
4. Click **Run on device**, **Run hybrid** and **Run in cloud**. The log should show `source=device` and `source=cloud` respectively.

Send me the Device check log after these steps and I will continue from there.
