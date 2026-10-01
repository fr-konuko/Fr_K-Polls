import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { apiError } from "@/lib/http";
import { serializePoll } from "@/lib/serialize";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const scope = request.nextUrl.searchParams.get("scope");
    const snapshot = await getAdminDb().collection("polls").orderBy("createdAt", "desc").limit(100).get();
    const polls = snapshot.docs
      .map(serializePoll)
      .filter((poll) =>
        scope === "results"
          ? poll.status === "active" || poll.status === "closed"
          : poll.status === "active",
      );
    return NextResponse.json({ polls });
  } catch (error) {
    return apiError(error);
  }
}
