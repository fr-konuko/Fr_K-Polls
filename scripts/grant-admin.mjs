import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const uid = process.argv[2];
if (!uid) {
  console.error("Usage: npm run grant-admin -- <firebase-user-uid>");
  process.exitCode = 1;
} else {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const credential = raw ? cert(JSON.parse(raw)) : applicationDefault();
  const app =
    getApps()[0] ??
    initializeApp({ credential, projectId: process.env.FIREBASE_PROJECT_ID });
  await getAuth(app).setCustomUserClaims(uid, { admin: true });
  console.log("Admin claim granted. The user must sign in again.");
}
