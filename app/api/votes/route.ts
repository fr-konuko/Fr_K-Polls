import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { ballotId } from "@/lib/ballot";
import { getAdminDb } from "@/lib/firebase/admin";
import { apiError, enforceSameOrigin, HttpError } from "@/lib/http";
import { voteSchema } from "@/lib/validation";
import {
  issueVoterCookie,
  verifyVoterCookie,
  VOTER_COOKIE,
  voterCookieOptions,
} from "@/lib/voter";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    enforceSameOrigin(request);
    const input = voteSchema.parse(await request.json());
    const existingCookie = request.cookies.get(VOTER_COOKIE)?.value;
    const existingVoterId = verifyVoterCookie(existingCookie);
    const cookieValue = existingVoterId ? existingCookie! : issueVoterCookie();
    const voterId = verifyVoterCookie(cookieValue);
    if (!voterId) throw new HttpError(500, "Could not establish voter session.");

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
      });
      transaction.update(aspirantRef, { votes: FieldValue.increment(1) });
      return candidatePosition;
    });

    const response = NextResponse.json({ ok: true, position }, { status: 201 });
    if (!existingVoterId) response.cookies.set(VOTER_COOKIE, cookieValue, voterCookieOptions);
    return response;
  } catch (error) {
    return apiError(error);
  }
}
