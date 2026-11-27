import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { getPublicPollResults } from "@/lib/public-polls";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ pollId: string }> },
) {
  try {
    const { pollId } = await context.params;
    const results = await getPublicPollResults(pollId);
    // Share database data on the server, without adding a second browser/CDN TTL.
    return NextResponse.json(results, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
