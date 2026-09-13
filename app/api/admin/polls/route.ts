import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { apiError, enforceSameOrigin, HttpError } from "@/lib/http";
import { serializePoll } from "@/lib/serialize";
import { pollCreateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET() {
  try {
    if (!(await requireAdminApi())) throw new HttpError(401, "Authentication required.");
    const snapshot = await getAdminDb().collection("polls").orderBy("createdAt", "desc").limit(100).get();
    return NextResponse.json({ polls: snapshot.docs.map(serializePoll) });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    enforceSameOrigin(request);
    if (!(await requireAdminApi())) throw new HttpError(401, "Authentication required.");
    const input = pollCreateSchema.parse(await request.json());
    const reference = await getAdminDb().collection("polls").add({
      ...input,
      createdAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ id: reference.id }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
