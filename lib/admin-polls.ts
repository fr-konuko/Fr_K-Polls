import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { HttpError } from "@/lib/http";
import { POSITIONS, type Position } from "@/lib/types";

export async function addAspirantToPoll(
  db: Firestore,
  input: { pollId: string; name: string; position: Position; imageUrl: string },
) {
  const pollRef = db.collection("polls").doc(input.pollId);
  const aspirantRef = db.collection("aspirants").doc();

  await db.runTransaction(async (transaction) => {
    const poll = await transaction.get(pollRef);
    if (!poll.exists || poll.get("status") !== "draft") {
      throw new HttpError(400, "Aspirants can only be added to draft polls.");
    }

    const storedPosition = POSITIONS.find((position) => position === poll.get("position"));
    if (storedPosition) {
      if (storedPosition !== input.position) {
        throw new HttpError(400, "Aspirant position must match the poll position.");
      }
    } else {
      const existingAspirants = await transaction.get(
        db.collection("aspirants").where("pollId", "==", input.pollId).limit(500),
      );
      const existingPositions = [
        ...new Set(
          existingAspirants.docs
            .map((document) => document.get("position"))
            .filter((position): position is Position => POSITIONS.some((valid) => valid === position)),
        ),
      ];

      if (existingPositions.length === 1) {
        if (existingPositions[0] !== input.position) {
          throw new HttpError(400, "Aspirant position must match the poll position.");
        }
        transaction.update(pollRef, { position: existingPositions[0] });
      } else if (existingPositions.length === 0) {
        transaction.update(pollRef, { position: input.position });
      }
    }

    transaction.create(aspirantRef, {
      ...input,
      votes: 0,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return aspirantRef.id;
}
