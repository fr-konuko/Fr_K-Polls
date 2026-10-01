import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { apiError, enforceSameOrigin, HttpError } from "@/lib/http";
import { pollUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, context: { params: Promise<{ pollId: string }> }) {
  try {
    enforceSameOrigin(request);
    if (!(await requireAdminApi())) throw new HttpError(401, "Authentication required.");
    const { pollId } = await context.params;
    const { status } = pollUpdateSchema.parse(await request.json());
    const db = getAdminDb();
    const reference = db.collection("polls").doc(pollId);
    const poll = await reference.get();
    if (!poll.exists) throw new HttpError(404, "Poll not found.");
    if (status === "active" && poll.get("status") === "draft") {
      if (!poll.get("position")) throw new HttpError(400, "Add a position before publishing this poll.");
      const aspirants = await db.collection("aspirants").where("pollId", "==", pollId).limit(1).get();
      if (aspirants.empty) throw new HttpError(400, "Add at least one aspirant before publishing this poll.");
    }
    await reference.update({
      status,
      closedAt: status === "closed" ? FieldValue.serverTimestamp() : null,
      archivedAt: status === "archived" ? FieldValue.serverTimestamp() : null,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
