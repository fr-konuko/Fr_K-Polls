import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ verify: vi.fn(), create: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase/admin", () => ({ getAdminAuth: () => ({ verifyIdToken: mocks.verify, createSessionCookie: mocks.create }) }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

import { POST } from "./route";

const token = { uid: "google-admin", admin: true, auth_time: Math.floor(Date.now() / 1_000), firebase: { sign_in_provider: "google.com" } };
const request = (origin = "http://localhost:3000") => new NextRequest("http://localhost:3000/api/auth/session", {
  method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ idToken: "signed-id-token" }),
});

describe("administrator sessions", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.verify.mockResolvedValue(token); mocks.create.mockResolvedValue("admin-session"); });

  it.each(["google.com", "password"])("accepts recent %s authentication with an admin claim", async (provider) => {
    mocks.verify.mockResolvedValue({ ...token, firebase: { sign_in_provider: provider } });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mocks.verify).toHaveBeenCalledWith("signed-id-token", true);
    expect(response.cookies.get("__session")?.value).toBe("admin-session");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.cookies.get("jr_voter_session")).toBeUndefined();
  });

  it("denies an ordinary Google voter administrator access", async () => {
    mocks.verify.mockResolvedValue({ ...token, admin: undefined });
    const response = await POST(request());
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "This account is not an administrator." });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("requires fresh authentication", async () => {
    mocks.verify.mockResolvedValue({ ...token, auth_time: token.auth_time - 600 });
    expect((await POST(request())).status).toBe(401);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects a cross-origin session request", async () => {
    expect((await POST(request("https://another-site.example"))).status).toBe(403);
    expect(mocks.verify).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
