import "server-only";

import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase/admin";
import { HttpError } from "@/lib/http";
import { isGoogleVoter } from "@/lib/voter-identity";

export const VOTER_SESSION_COOKIE = "jr_voter_session";
export const VOTER_SESSION_DURATION = 5 * 24 * 60 * 60 * 1_000;
export const voterSessionOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: VOTER_SESSION_DURATION / 1_000,
};

const invalidSessionCodes = new Set([
  "auth/session-cookie-expired", "auth/session-cookie-revoked", "auth/invalid-session-cookie",
  "auth/invalid-id-token", "auth/id-token-expired", "auth/argument-error", "auth/user-disabled", "auth/user-not-found",
]);

export async function getVoterSession() {
  const cookie = (await cookies()).get(VOTER_SESSION_COOKIE)?.value;
  if (!cookie) return null;
  try {
    const token = await getAdminAuth().verifySessionCookie(cookie, true);
    return isGoogleVoter(token) ? token : null;
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
    if (invalidSessionCodes.has(code)) return null;
    throw error;
  }
}

export async function requireVoterSession() {
  const voter = await getVoterSession();
  if (!voter) throw new HttpError(401, "Sign in with Google before submitting your vote.");
  return voter;
}
