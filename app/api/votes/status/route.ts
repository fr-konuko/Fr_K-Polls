import { NextRequest, NextResponse } from "next/server";
import { ballotId } from "@/lib/ballot";
import { getAdminDb } from "@/lib/firebase/admin";
import { apiError } from "@/lib/http";
import { currentVoterId } from "@/lib/voter";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const pollId = request.nextUrl.searchParams.get("pollId")?.trim();
    const voterId = await currentVoterId();
    if (!pollId || !voterId) return NextResponse.json({ votedPositions: [] });

    const db = getAdminDb();
    const candidates = await db.collection("aspirants").where("pollId", "==", pollId).limit(500).get();
    const positions = [...new Set(candidates.docs.map((doc) => String(doc.get("position") ?? "")).filter(Boolean))];
    const references = positions.map((position) =>
      db.collection("votes").doc(ballotId(pollId, position, voterId)),
    );
    const ballots = references.length ? await db.getAll(...references) : [];
    return NextResponse.json({
      votedPositions: ballots
        .map((document, index) => (document.exists ? positions[index] : null))
        .filter(Boolean),
    });
  } catch (error) {
    return apiError(error);
  }
}
