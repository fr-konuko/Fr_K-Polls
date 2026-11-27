import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ voter: vi.fn(), getDb: vi.fn(), getAll: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase/admin", () => ({ getAdminDb: mocks.getDb }));
vi.mock("@/lib/voter-session", () => ({ getVoterSession: mocks.voter }));

import { GET } from "./route";
import { accountVoterId } from "@/lib/voter-identity";
import { ballotId } from "@/lib/ballot";

describe("account ballot status", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.voter.mockResolvedValue({ uid: "verified-user" });
    mocks.getDb.mockReturnValue({
      collection: (collection: string) => ({
        doc: (id: string) => ({ collection, id }),
        where: () => ({ limit: () => ({ get: async () => ({ docs: [{ get: () => "MCA" }, { get: () => "MCA" }] }) }) }),
      }),
      getAll: mocks.getAll,
    });
    mocks.getAll.mockResolvedValue([{ exists: true, get: () => "my-candidate" }]);
  });

  it("returns no personal ballot data to signed-out visitors", async () => {
    mocks.voter.mockResolvedValue(null);
    const response = await GET(new NextRequest("http://localhost:3000/api/votes/status?pollId=poll"));
    expect(await response.json()).toEqual({ votedPositions: [], votedAspirants: {} });
    expect(mocks.getDb).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("reads only the verified account's ballot, ignoring supplied account IDs", async () => {
    const response = await GET(new NextRequest("http://localhost:3000/api/votes/status?pollId=poll&uid=someone-else"));
    expect(mocks.getAll).toHaveBeenCalledWith({ collection: "votes", id: ballotId("poll", "MCA", accountVoterId("verified-user")) });
    expect(await response.json()).toEqual({ votedPositions: ["MCA"], votedAspirants: { MCA: "my-candidate" } });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
