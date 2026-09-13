import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth";
import { getAdminAuth } from "@/lib/firebase/admin";
import { apiError, enforceSameOrigin, HttpError } from "@/lib/http";
import { sessionSchema } from "@/lib/validation";

export const runtime = "nodejs";

const SESSION_DURATION = 60 * 60 * 24 * 5 * 1_000;

export async function POST(request: NextRequest) {
  try {
    enforceSameOrigin(request);
    const { idToken } = sessionSchema.parse(await request.json());
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(idToken, true);
    if (decoded.admin !== true) throw new HttpError(403, "This account is not an administrator.");
    if (Date.now() / 1_000 - decoded.auth_time > 5 * 60) {
      throw new HttpError(401, "Please sign in again.");
    }

    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn: SESSION_DURATION });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_DURATION / 1_000,
    });
    return response;
  } catch (error) {
    return apiError(error);
  }
}
