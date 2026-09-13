import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminAuth } from "@/lib/firebase/admin";

export const ADMIN_SESSION_COOKIE = "__session";

export async function getAdminSession() {
  const sessionCookie = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!sessionCookie) return null;

  try {
    const decoded = await getAdminAuth().verifySessionCookie(sessionCookie, true);
    return decoded.admin === true ? decoded : null;
  } catch {
    return null;
  }
}

export async function requireAdminPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin-login");
  return session;
}

export async function requireAdminApi() {
  return getAdminSession();
}
