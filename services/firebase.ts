import { initializeApp, getApps, getApp } from "firebase/app";
import { Auth, getAuth, GoogleAuthProvider, initializeAuth, browserLocalPersistence, browserPopupRedirectResolver } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration from your Firebase project
// IMPORTANT: Replace these values with your own from the Firebase Console if you haven't already.
const firebaseConfig = {
  apiKey: "AIzaSyAlaiLRO88tO2s3XjHr8OXMa7LhNxRwDU8",
  authDomain: "ajinkya-novel-helper.firebaseapp.com",
  projectId: "ajinkya-novel-helper",
  storageBucket: "ajinkya-novel-helper.firebasestorage.app",
  messagingSenderId: "516566960316",
  appId: "1:516566960316:web:91aa2f792ba69d3e7ba8b9",
  measurementId: "G-EKBPL1QSGF"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase services
// Use initializeAuth to avoid "Component auth has not been registered yet" errors
let auth: Auth;
try {
  auth = getAuth(app);
} catch (e) {
  auth = initializeAuth(app, {
    persistence: browserLocalPersistence,
    popupRedirectResolver: browserPopupRedirectResolver
  });
}

auth.useDeviceLanguage(); // Use device language for auth flow

const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
    prompt: 'select_account'
});

export { app, auth, db, googleProvider };