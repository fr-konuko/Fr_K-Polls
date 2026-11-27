import type { DecodedIdToken } from "firebase-admin/auth";

// Keep account-based ballots in a distinct namespace from legacy browser IDs.
export function accountVoterId(uid: string) {
  return `firebase:${uid}`;
}

export function isGoogleVoter(token: DecodedIdToken) {
  return token.firebase?.sign_in_provider === "google.com" && token.email_verified === true;
}

export function publicVoterProfile(token: DecodedIdToken) {
  let photoURL: string | undefined;
  if (typeof token.picture === "string") {
    try {
      const url = new URL(token.picture);
      if (url.protocol === "https:" && (url.hostname.endsWith(".googleusercontent.com") || url.hostname.endsWith(".ggpht.com"))) {
        photoURL = url.href;
      }
    } catch { /* Missing or invalid photos use the voter's initial. */ }
  }
  return { uid: token.uid, email: token.email ?? "", name: String(token.name ?? token.email ?? "Voter"), ...(photoURL ? { photoURL } : {}) };
}
