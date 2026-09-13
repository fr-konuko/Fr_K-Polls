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
    const reference = getAdminDb().collection("polls").doc(pollId);
    if (!(await reference.get()).exists) throw new HttpError(404, "Poll not found.");
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
