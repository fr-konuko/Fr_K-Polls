import { NextRequest, NextResponse } from "next/server";
import { ballotId } from "@/lib/ballot";
import { getAdminDb } from "@/lib/firebase/admin";
import { apiError } from "@/lib/http";
import { accountVoterId } from "@/lib/voter-identity";
import { getVoterSession } from "@/lib/voter-session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const pollId = request.nextUrl.searchParams.get("pollId")?.trim();
    const voter = await getVoterSession();
    if (!pollId || !voter) {
      return NextResponse.json({ votedPositions: [], votedAspirants: {} }, { headers: { "cache-control": "no-store" } });
    }
    const voterId = accountVoterId(voter.uid);

    const db = getAdminDb();
    const candidates = await db.collection("aspirants").where("pollId", "==", pollId).limit(500).get();
    const positions = [...new Set(candidates.docs.map((doc) => String(doc.get("position") ?? "")).filter(Boolean))];
    const references = positions.map((position) =>
      db.collection("votes").doc(ballotId(pollId, position, voterId)),
    );
    const ballots = references.length ? await db.getAll(...references) : [];
    const votedPositions: string[] = [];
    const votedAspirants: Record<string, string> = {};
    ballots.forEach((document, index) => {
      if (!document.exists) return;
      const position = positions[index];
      const aspirantId = String(document.get("aspirantId") ?? "");
      votedPositions.push(position);
      if (aspirantId) votedAspirants[position] = aspirantId;
    });

    return NextResponse.json({ votedPositions, votedAspirants }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
