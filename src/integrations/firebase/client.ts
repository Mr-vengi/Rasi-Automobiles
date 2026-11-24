import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

// Your web app's Firebase configuration for Rasi Automobiles
export const firebaseConfig = {
  apiKey: "AIzaSyAmJi6G8K1qAlKYKXZK3yhPSsrqnH3jTF4",
  authDomain: "rasiautomobile.firebaseapp.com",
  projectId: "rasiautomobile",
  storageBucket: "rasiautomobile.firebasestorage.app",
  messagingSenderId: "911531875895",
  appId: "1:911531875895:web:e4b0d635620cb36085e9b2",
  measurementId: "G-5MLEFFY00J",
};

// Initialize Firebase safely for SSR and browser
export const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

let analyticsInstance: Analytics | null = null;
if (typeof window !== "undefined") {
  isSupported()
    .then((yes) => {
      if (yes) {
        analyticsInstance = getAnalytics(app);
      }
    })
    .catch(() => {
      // Analytics unsupported or disabled in private browsing
    });
}

export function getFirebaseAnalytics(): Analytics | null {
  return analyticsInstance;
}
