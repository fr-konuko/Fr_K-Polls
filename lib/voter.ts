import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const VOTER_COOKIE = "frk_voter";

function secret() {
  const value = process.env.VOTER_COOKIE_SECRET;
  if (!value || value.length < 32) {
    throw new Error("VOTER_COOKIE_SECRET must contain at least 32 characters.");
  }
  return value;
}

function signature(id: string) {
  return createHmac("sha256", secret()).update(id).digest("base64url");
}

export function issueVoterCookie() {
  const id = randomUUID();
  return `${id}.${signature(id)}`;
}

export function verifyVoterCookie(value: string | undefined) {
  if (!value) return null;
  const [id, supplied, extra] = value.split(".");
  if (!id || !supplied || extra) return null;

  const expected = signature(id);
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  if (suppliedBuffer.length !== expectedBuffer.length) return null;
  return timingSafeEqual(suppliedBuffer, expectedBuffer) ? id : null;
}

export async function currentVoterId() {
  return verifyVoterCookie((await cookies()).get(VOTER_COOKIE)?.value);
}

export const voterCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
};
