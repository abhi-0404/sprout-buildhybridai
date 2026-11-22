// Whether Firebase keys are present. Kept apart from lib/firebase.ts so that checking this flag
// never pulls the Firebase SDK into the first bundle (demo mode loads no Firebase code at all).
export const firebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID,
);
