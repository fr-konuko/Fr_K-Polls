import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { addAspirantToPoll } from "@/lib/admin-polls";
import { apiError, enforceSameOrigin, HttpError } from "@/lib/http";
import { aspirantCreateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    enforceSameOrigin(request);
    if (!(await requireAdminApi())) throw new HttpError(401, "Authentication required.");
    const input = aspirantCreateSchema.parse(await request.json());
    const id = await addAspirantToPoll(getAdminDb(), input);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
