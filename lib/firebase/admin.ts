import "server-only";

import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function credential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) return applicationDefault();

  try {
    return cert(JSON.parse(raw));
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY must be valid one-line JSON.");
  }
}

function getAdminApp() {
  return (
    getApps()[0] ??
    initializeApp({
      credential: credential(),
      projectId: process.env.FIREBASE_PROJECT_ID,
    })
  );
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}
