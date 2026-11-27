import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { getPublicPolls } from "@/lib/public-polls";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const scope = request.nextUrl.searchParams.get("scope");
    const polls = await getPublicPolls(scope === "results");
    return NextResponse.json({ polls }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
