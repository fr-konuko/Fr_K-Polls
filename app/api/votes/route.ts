import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { ballotId } from "@/lib/ballot";
import { getAdminDb } from "@/lib/firebase/admin";
import { apiError, enforceSameOrigin, HttpError } from "@/lib/http";
import { voteSchema } from "@/lib/validation";
import { accountVoterId } from "@/lib/voter-identity";
import { requireVoterSession } from "@/lib/voter-session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    enforceSameOrigin(request);
    const voter = await requireVoterSession();
    const input = voteSchema.parse(await request.json());
    const voterId = accountVoterId(voter.uid);

    const db = getAdminDb();
    const pollRef = db.collection("polls").doc(input.pollId);
    const aspirantRef = db.collection("aspirants").doc(input.aspirantId);

    const position = await db.runTransaction(async (transaction) => {
      const [pollDocument, aspirantDocument] = await Promise.all([
        transaction.get(pollRef),
        transaction.get(aspirantRef),
      ]);
      if (!pollDocument.exists || pollDocument.get("status") !== "active") {
        throw new HttpError(409, "This poll is no longer open.");
      }
      if (!aspirantDocument.exists || aspirantDocument.get("pollId") !== input.pollId) {
        throw new HttpError(400, "The selected aspirant does not belong to this poll.");
      }

      const candidatePosition = String(aspirantDocument.get("position") ?? "");
      if (!candidatePosition) throw new HttpError(400, "Aspirant position is invalid.");
      const voteRef = db.collection("votes").doc(ballotId(input.pollId, candidatePosition, voterId));
      const voteDocument = await transaction.get(voteRef);
      if (voteDocument.exists) {
        throw new HttpError(409, `You already voted for ${candidatePosition} in this poll.`);
      }

      transaction.create(voteRef, {
        pollId: input.pollId,
        aspirantId: input.aspirantId,
        position: candidatePosition,
        createdAt: FieldValue.serverTimestamp(),
        identityVersion: "firebase-v1",
      });
      transaction.update(aspirantRef, { votes: FieldValue.increment(1) });
      return candidatePosition;
    });

    return NextResponse.json({ ok: true, position }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
