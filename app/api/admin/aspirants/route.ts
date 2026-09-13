import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { apiError, enforceSameOrigin, HttpError } from "@/lib/http";
import { aspirantCreateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    enforceSameOrigin(request);
    if (!(await requireAdminApi())) throw new HttpError(401, "Authentication required.");
    const input = aspirantCreateSchema.parse(await request.json());
    const db = getAdminDb();
    const poll = await db.collection("polls").doc(input.pollId).get();
    if (!poll.exists || poll.get("status") === "archived") {
      throw new HttpError(400, "Select a valid, non-archived poll.");
    }
    const reference = await db.collection("aspirants").add({
      ...input,
      votes: 0,
      createdAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ id: reference.id }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
