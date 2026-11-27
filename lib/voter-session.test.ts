import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DecodedIdToken } from "firebase-admin/auth";

const mocks = vi.hoisted(() => ({ getCookie: vi.fn(), verify: vi.fn(), getUser: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.getCookie }) }));
vi.mock("@/lib/firebase/admin", () => ({ getAdminAuth: () => ({ verifySessionCookie: mocks.verify, getUser: mocks.getUser }) }));

import { getVoterSession, requireVoterSession, VOTER_SESSION_COOKIE } from "./voter-session";
import { accountVoterId, publicVoterProfile } from "./voter-identity";
import { ballotId } from "./ballot";

const googleToken: DecodedIdToken = {
  uid: "google-user-1", sub: "google-user-1", aud: "test-project",
  iss: "https://securetoken.google.com/test-project", auth_time: 1_000, iat: 1_000, exp: 2_000,
  email: "voter@example.com", email_verified: true, name: "A Voter",
  firebase: { sign_in_provider: "google.com", identities: { "google.com": ["google-user-1"] } },
};

describe("verified voter sessions", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.getUser.mockResolvedValue({ customClaims: {} }); });

  it.each([true, false])("blocks admins from voting even when the session admin claim is %s", async (claim) => {
    mocks.getCookie.mockReturnValue({ value: "signed-cookie" });
    mocks.verify.mockResolvedValue({ ...googleToken, admin: claim });
    mocks.getUser.mockResolvedValue({ customClaims: { admin: true } });
    await expect(requireVoterSession()).rejects.toMatchObject({ status: 403, message: expect.stringContaining("Administrator accounts cannot vote") });
    if (!claim) expect(mocks.getUser).toHaveBeenCalledWith(googleToken.uid);
  });

  it("allows an ordinary verified Google account to vote", async () => {
    mocks.getCookie.mockReturnValue({ value: "signed-cookie" });
    mocks.verify.mockResolvedValue(googleToken);
    expect(await requireVoterSession()).toEqual(googleToken);
    expect(mocks.getUser).toHaveBeenCalledWith(googleToken.uid);
  });

  it("does not allow voting when current account permissions cannot be checked", async () => {
    mocks.getCookie.mockReturnValue({ value: "signed-cookie" });
    mocks.verify.mockResolvedValue(googleToken);
    mocks.getUser.mockRejectedValue(new Error("network unavailable"));
    await expect(requireVoterSession()).rejects.toThrow("network unavailable");
  });

  it("does not accept a legacy voter cookie or an admin session as voter login", async () => {
    mocks.getCookie.mockImplementation((name) => name === VOTER_SESSION_COOKIE ? undefined : { value: "legacy-or-admin-cookie" });
    await expect(requireVoterSession()).rejects.toMatchObject({ status: 401 });
    expect(mocks.verify).not.toHaveBeenCalled();
  });

  it("checks Firebase signature and revocation before trusting Google identity", async () => {
    mocks.getCookie.mockReturnValue({ value: "signed-cookie" }); mocks.verify.mockResolvedValue(googleToken);
    expect(await getVoterSession()).toEqual(googleToken);
    expect(mocks.verify).toHaveBeenCalledWith("signed-cookie", true);
  });

  it.each([
    { ...googleToken, email_verified: false },
    { ...googleToken, firebase: { sign_in_provider: "password" }, admin: true },
  ])("rejects unverified email or another sign-in provider", async (token) => {
    mocks.getCookie.mockReturnValue({ value: "cookie" }); mocks.verify.mockResolvedValue(token);
    expect(await getVoterSession()).toBeNull();
  });

  it.each(["auth/session-cookie-expired", "auth/session-cookie-revoked", "auth/user-disabled"])("rejects %s", async (code) => {
    mocks.getCookie.mockReturnValue({ value: "cookie" }); mocks.verify.mockRejectedValue({ code });
    await expect(requireVoterSession()).rejects.toMatchObject({ status: 401 });
  });

  it("does not conceal Firebase outages as a successful or anonymous session", async () => {
    mocks.getCookie.mockReturnValue({ value: "cookie" }); mocks.verify.mockRejectedValue(new Error("network unavailable"));
    await expect(getVoterSession()).rejects.toThrow("network unavailable");
  });

  it("uses stable account ballot IDs across browsers, separate from legacy IDs and other positions", () => {
    const id = ballotId("poll", "MCA", accountVoterId("user-1"));
    expect(id).toBe(ballotId("poll", "MCA", accountVoterId("user-1")));
    expect(id).not.toBe(ballotId("poll", "MCA", "user-1"));
    expect(id).not.toBe(ballotId("poll", "MCA", accountVoterId("user-2")));
    expect(id).not.toBe(ballotId("poll", "Governor", accountVoterId("user-1")));
    expect(id).not.toBe(ballotId("another-poll", "MCA", accountVoterId("user-1")));
  });

  it("returns only the voter's own profile, without claims or tokens", () => {
    expect(publicVoterProfile({ ...googleToken, admin: true })).toEqual({ uid: googleToken.uid, name: googleToken.name, email: googleToken.email });
  });

  it("includes the verified Google profile picture in the account profile", () => {
    const picture = "https://lh3.googleusercontent.com/a/test-avatar=s96-c";
    expect(publicVoterProfile({ ...googleToken, picture }).photoURL).toBe(picture);
  });

  it("falls back to the initial for unsupported image URLs", () => {
    expect(publicVoterProfile({ ...googleToken, picture: "javascript:alert(1)" })).not.toHaveProperty("photoURL");
    expect(publicVoterProfile({ ...googleToken, picture: "https://googleusercontent.com.other-site.example/avatar" })).not.toHaveProperty("photoURL");
  });
});
