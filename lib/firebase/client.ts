"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { browserPopupRedirectResolver, getAuth, initializeAuth, inMemoryPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function getClientAuth() {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getAuth(app);
}

// Voter login never replaces an administrator's client-side auth state.
export function getVoterClientAuth() {
  const existing = getApps().find((app) => app.name === "voters");
  if (existing) return getAuth(existing);
  return initializeAuth(initializeApp(firebaseConfig, "voters"), {
    persistence: inMemoryPersistence,
    popupRedirectResolver: browserPopupRedirectResolver,
  });
}
