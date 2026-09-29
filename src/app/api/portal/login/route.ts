import { NextResponse } from "next/server";
import { validatePasscode, createAdminSession, COOKIE_NAME } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { passcode } = body;

    if (!passcode || !validatePasscode(passcode)) {
      return NextResponse.json(
        { error: "Invalid administrative passcode." },
        { status: 401 }
      );
    }

    const sessionToken = await createAdminSession();
    const response = NextResponse.json({ success: true });

    // Set secure HTTP-only cookie (only set Secure flag if https)
    const isHttps = request.url.startsWith("https://") || request.headers.get("x-forwarded-proto") === "https";
    response.cookies.set({
      name: COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (err: any) {
    console.error("Portal login error:", err);
    return NextResponse.json(
      { error: "Internal server error during authentication." },
      { status: 500 }
    );
  }
}
