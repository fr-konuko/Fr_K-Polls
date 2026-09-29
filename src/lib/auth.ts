import { cookies } from "next/headers";

const COOKIE_NAME = process.env.ADMIN_SESSION_COOKIE || "jopa_admin_auth";
const ADMIN_PASSCODE = process.env.ADMIN_PORTAL_PASSCODE || "Frank";
const SECRET = process.env.ADMIN_SECRET_KEY || "jopa_default_dev_secret_key_89237498237";

// Helper to create HMAC signature using Web Crypto API
async function signMessage(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createAdminSession(): Promise<string> {
  const timestamp = Date.now().toString();
  const payload = `jopa_admin_${timestamp}`;
  const signature = await signMessage(payload, SECRET);
  return `${payload}.${signature}`;
}

export async function verifyAdminSession(rawToken: string | undefined): Promise<boolean> {
  if (!rawToken) return false;
  const token = decodeURIComponent(rawToken);
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, signature] = parts;
  if (!payload.startsWith("jopa_admin_") && !payload.startsWith("jopa_admin:")) return false;

  const expectedSignature = await signMessage(payload, SECRET);
  if (signature !== expectedSignature) return false;

  const timeStr = payload.replace("jopa_admin_", "").replace("jopa_admin:", "");
  const createdTime = parseInt(timeStr, 10);
  const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
  if (Date.now() - createdTime > maxAgeMs) return false;

  return true;
}

export async function isAuthenticatedAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return verifyAdminSession(token);
}

export function validatePasscode(passcode: string): boolean {
  if (!passcode || !ADMIN_PASSCODE) return false;
  return passcode.trim() === ADMIN_PASSCODE.trim();
}

export { COOKIE_NAME };
