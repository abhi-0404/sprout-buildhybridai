import { initializeApp, type FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

// Firebase config comes from Vite env vars (see .env.example). These web config values are
// public identifiers, not secrets; access is protected by App Check and Firestore rules.

const env = import.meta.env;

import { firebaseConfigured } from './firebaseEnv';
export { firebaseConfigured };

let app: FirebaseApp | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (app) return app;
  if (!firebaseConfigured) throw new Error('Firebase is not configured: copy .env.example to .env.local');
  app = initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  });

  // App Check is required by Firebase AI Logic. In development, a debug token is used:
  // the browser console prints it once; register it in the Firebase console (App Check > Apps).
  if (env.DEV || env.VITE_APPCHECK_DEBUG === 'true') {
    (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN: boolean | string }).FIREBASE_APPCHECK_DEBUG_TOKEN =
      env.VITE_APPCHECK_DEBUG_TOKEN || true;
  }
  if (env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY) {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  }
  return app;
}
