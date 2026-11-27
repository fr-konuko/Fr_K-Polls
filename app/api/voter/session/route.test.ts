import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ verify: vi.fn(), create: vi.fn(), getUser: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase/admin", () => ({ getAdminAuth: () => ({ verifyIdToken: mocks.verify, createSessionCookie: mocks.create, getUser: mocks.getUser }) }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

import { DELETE, GET, POST } from "./route";

const token = { uid: "google-user", email: "voter@example.com", name: "A Voter", email_verified: true, auth_time: Math.floor(Date.now() / 1_000), firebase: { sign_in_provider: "google.com" } };
const request = (method = "POST", origin = "http://localhost:3000") => new NextRequest("http://localhost:3000/api/voter/session", {
  method, headers: { origin, "content-type": "application/json" }, ...(method === "POST" ? { body: JSON.stringify({ idToken: "signed-id-token" }) } : {}),
});

describe("voter login and logout", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.verify.mockResolvedValue(token); mocks.create.mockResolvedValue("signed-session"); mocks.getUser.mockResolvedValue({ customClaims: {} }); });

  it.each([true, false])("does not create a voter session for an admin even with a token admin claim of %s", async (claim) => {
    mocks.verify.mockResolvedValue({ ...token, admin: claim });
    mocks.getUser.mockResolvedValue({ customClaims: { admin: true } });
    const response = await POST(request());
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Administrator accounts cannot vote. You can still browse polls and results." });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("allows public session checks without exposing another user's profile", async () => {
    const response = await GET();
    expect(await response.json()).toEqual({ user: null });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("creates a separate HTTP-only voter cookie only after verifying a recent Google token", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mocks.verify).toHaveBeenCalledWith("signed-id-token", true);
    expect(response.cookies.get("jr_voter_session")?.value).toBe("signed-session");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.cookies.get("__session")).toBeUndefined();
    expect(await response.json()).toEqual({ user: { uid: token.uid, email: token.email, name: token.name } });
  });

  it.each([
    { ...token, firebase: { sign_in_provider: "password" }, admin: true },
    { ...token, email_verified: false },
  ])("does not accept admin/password credentials or unverified email as Google login", async (value) => {
    mocks.verify.mockResolvedValue(value);
    expect((await POST(request())).status).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects stale Google authentication", async () => {
    mocks.verify.mockResolvedValue({ ...token, auth_time: token.auth_time - 600 });
    expect((await POST(request())).status).toBe(401);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects invalid or forged tokens", async () => {
    mocks.verify.mockRejectedValue(new Error("invalid signature"));
    expect((await POST(request())).status).toBe(401);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("logs out only the voter session", async () => {
    const response = await DELETE(request("DELETE"));
    expect(response.status).toBe(200);
    expect(response.cookies.get("jr_voter_session")?.maxAge).toBe(0);
    expect(response.cookies.get("__session")).toBeUndefined();
  });

  it.each(["POST", "DELETE"])("rejects cross-origin %s", async (method) => {
    const response = await (method === "POST" ? POST : DELETE)(request(method, "https://another-site.example"));
    expect(response.status).toBe(403);
    expect(mocks.verify).not.toHaveBeenCalled();
  });
});
