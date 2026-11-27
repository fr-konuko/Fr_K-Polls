import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { apiError, enforceSameOrigin, HttpError } from "@/lib/http";
import { sessionSchema } from "@/lib/validation";
import { isGoogleVoter, publicVoterProfile } from "@/lib/voter-identity";
import { getVoterSession, VOTER_SESSION_COOKIE, VOTER_SESSION_DURATION, voterSessionOptions } from "@/lib/voter-session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const voter = await getVoterSession();
    return NextResponse.json({ user: voter ? publicVoterProfile(voter) : null }, { headers: { "cache-control": "no-store" } });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    enforceSameOrigin(request);
    const { idToken } = sessionSchema.parse(await request.json());
    const auth = getAdminAuth();
    const token = await auth.verifyIdToken(idToken, true).catch(() => {
      throw new HttpError(401, "Your Google sign-in could not be verified. Please sign in again.");
    });
    if (!isGoogleVoter(token)) throw new HttpError(403, "Use a verified Google account to sign in as a voter.");
    if (Date.now() / 1_000 - token.auth_time > 5 * 60) throw new HttpError(401, "Please sign in with Google again.");
    const cookie = await auth.createSessionCookie(idToken, { expiresIn: VOTER_SESSION_DURATION });
    const response = NextResponse.json({ user: publicVoterProfile(token) }, { headers: { "cache-control": "no-store" } });
    response.cookies.set(VOTER_SESSION_COOKIE, cookie, voterSessionOptions);
    return response;
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: NextRequest) {
  try {
    enforceSameOrigin(request);
    const response = NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
    response.cookies.set(VOTER_SESSION_COOKIE, "", { ...voterSessionOptions, maxAge: 0 });
    return response;
  } catch (error) { return apiError(error); }
}
