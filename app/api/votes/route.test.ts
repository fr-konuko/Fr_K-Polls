import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ requireVoter: vi.fn(), getDb: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), runTransaction: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase/admin", () => ({ getAdminDb: mocks.getDb }));
vi.mock("@/lib/voter-session", () => ({ requireVoterSession: mocks.requireVoter }));

import { POST } from "./route";
import { HttpError } from "@/lib/http";
import { ballotId } from "@/lib/ballot";
import { accountVoterId } from "@/lib/voter-identity";

function request(extra = {}, origin = "http://localhost:3000") {
  return new NextRequest("http://localhost:3000/api/votes", {
    method: "POST", headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ pollId: "poll-1", aspirantId: "candidate-1", ...extra }),
  });
}

describe("account-based voting", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireVoter.mockResolvedValue({ uid: "real-voter" });
    mocks.getDb.mockReturnValue({ collection: (collection: string) => ({ doc: (id: string) => ({ collection, id }) }), runTransaction: mocks.runTransaction });
    mocks.runTransaction.mockImplementation((callback) => callback({ get: mocks.get, create: mocks.create, update: mocks.update }));
    mocks.get.mockImplementation(async (ref) => {
      if (ref.collection === "polls") return { exists: true, get: () => "active" };
      if (ref.collection === "aspirants") return { exists: true, get: (key: string) => key === "pollId" ? "poll-1" : "MCA" };
      return { exists: false };
    });
  });

  it("rejects signed-out requests before reading or writing the database", async () => {
    mocks.requireVoter.mockRejectedValue(new HttpError(401, "Sign in with Google before submitting your vote."));
    expect((await POST(request())).status).toBe(401);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("rejects cross-origin requests before checking credentials", async () => {
    expect((await POST(request({}, "https://another-site.example"))).status).toBe(403);
    expect(mocks.requireVoter).not.toHaveBeenCalled();
  });

  it("uses the verified account identity and ignores client-supplied identity or position", async () => {
    expect((await POST(request({ uid: "forged", voterId: "forged", position: "Governor" }))).status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith(
      { collection: "votes", id: ballotId("poll-1", "MCA", accountVoterId("real-voter")) },
      expect.objectContaining({ pollId: "poll-1", aspirantId: "candidate-1", position: "MCA", identityVersion: "firebase-v1" }),
    );
    expect(mocks.update).toHaveBeenCalledTimes(1);
    const record = mocks.create.mock.calls[0][1];
    expect(record).not.toHaveProperty("email"); expect(record).not.toHaveProperty("name");
  });

  it("rejects an existing account ballot inside the same transaction without incrementing totals", async () => {
    const original = mocks.get.getMockImplementation()!;
    mocks.get.mockImplementation((ref) => ref.collection === "votes" ? { exists: true } : original(ref));
    expect((await POST(request())).status).toBe(409);
    expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled();
  });

  it("still rejects closed polls", async () => {
    mocks.get.mockResolvedValue({ exists: true, get: () => "closed" });
    expect((await POST(request())).status).toBe(409);
    expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled();
  });

  it("still rejects candidates from another poll", async () => {
    const original = mocks.get.getMockImplementation()!;
    mocks.get.mockImplementation((ref) => ref.collection === "aspirants" ? { exists: true, get: () => "other-poll" } : original(ref));
    expect((await POST(request())).status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled();
  });
});
