import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { apiError, HttpError } from "@/lib/http";
import { serializeAspirant, serializePoll } from "@/lib/serialize";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ pollId: string }> },
) {
  try {
    const { pollId } = await context.params;
    const db = getAdminDb();
    const [pollDocument, aspirantsSnapshot] = await Promise.all([
      db.collection("polls").doc(pollId).get(),
      db.collection("aspirants").where("pollId", "==", pollId).limit(500).get(),
    ]);

    if (!pollDocument.exists) throw new HttpError(404, "Poll not found.");
    const poll = serializePoll(pollDocument);
    if (poll.status === "archived") throw new HttpError(404, "Poll not found.");

    const aspirants = aspirantsSnapshot.docs.map(serializeAspirant);
    return NextResponse.json({ poll, aspirants });
  } catch (error) {
    return apiError(error);
  }
}
