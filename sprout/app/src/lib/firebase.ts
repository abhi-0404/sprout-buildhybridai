import { initializeApp, type FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

// Firebase config comes from Vite env vars (see .env.example). These web config values are
// public identifiers, not secrets; access is protected by App Check and Firestore rules.
// Always read them as import.meta.env.X, never the whole import.meta.env object: using the
// whole object makes Vite inline every VITE_ variable, including the dev-only debug token.

import { firebaseConfigured } from './firebaseEnv';
export { firebaseConfigured };

let app: FirebaseApp | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (app) return app;
  if (!firebaseConfigured) throw new Error('Firebase is not configured: copy .env.example to .env.local');
  app = initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  });

  // App Check is required by Firebase AI Logic. In development, a debug token is used:
  // the browser console prints it once; register it in the Firebase console (App Check > Apps).
  const debugHost = self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN: boolean | string };
  if (import.meta.env.DEV) {
    // Dead code in production builds, so the fixed dev token never reaches a public bundle.
    debugHost.FIREBASE_APPCHECK_DEBUG_TOKEN = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN || true;
  } else if (import.meta.env.VITE_APPCHECK_DEBUG === 'true') {
    // Production debug builds get a fresh token printed to the console, never the fixed one.
    debugHost.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  if (import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY) {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  }
  return app;
}
