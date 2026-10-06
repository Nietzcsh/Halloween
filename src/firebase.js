import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

export const firebaseConfigured = Boolean(config.apiKey && config.projectId);

export const app = firebaseConfigured ? initializeApp(config) : null;
export const auth = app ? getAuth(app) : null;

// Offline cache: club signal is bad, so the app keeps working with the last data it saw.
export const db = app
  ? initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
  : null;

// Every visitor gets a silent anonymous Firebase account that stays on their phone.
// That account is what remembers "this phone = Ana" so they never retype their name.
let signingIn = null;
export function ensureSignedIn() {
  if (!signingIn) {
    signingIn = signInAnonymously(auth).catch((e) => {
      signingIn = null;
      throw e;
    });
  }
  return signingIn;
}
