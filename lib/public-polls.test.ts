import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ poll: vi.fn(), candidates: vi.fn(), polls: vi.fn(), cache: vi.fn(), revalidate: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: mocks.cache.mockImplementation((callback) => callback), revalidateTag: mocks.revalidate }));
vi.mock("@/lib/firebase/admin", () => ({ getAdminDb: () => ({ collection: (name: string) => name === "polls" ? {
  doc: (id: string) => ({ get: () => mocks.poll(id) }),
  orderBy: () => ({ limit: () => ({ get: mocks.polls }) }),
} : { where: (_field: string, _op: string, pollId: string) => ({ limit: () => ({ get: () => mocks.candidates(pollId) }) }) } }) }));

import { getPublicPollResults, getPublicPolls, invalidatePublicPolls } from "./public-polls";

const poll = (id: string, status = "active") => ({ id, exists: true, data: () => ({ name: id, status }) });

describe("public poll cache boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.poll.mockImplementation(async (id) => poll(id));
    mocks.candidates.mockImplementation(async (pollId) => ({ docs: [{ id: `${pollId}-candidate`, data: () => ({ name: "Candidate", pollId, position: "MCA", votes: 3 }) }] }));
  });

  it("shares concurrent cold requests for one poll without combining other polls", async () => {
    const results = await Promise.all([
      ...Array.from({ length: 50 }, () => getPublicPollResults("poll-a")),
      getPublicPollResults("poll-b"),
    ]);
    expect(mocks.poll).toHaveBeenCalledTimes(2);
    expect(mocks.candidates).toHaveBeenCalledTimes(2);
    expect(results[0].aspirants[0].pollId).toBe("poll-a");
    expect(results[50].aspirants[0].pollId).toBe("poll-b");
    expect(mocks.cache).toHaveBeenCalledWith(expect.any(Function), expect.arrayContaining(["poll-a"]), { revalidate: 10, tags: ["public-poll:poll-a"] });
  });

  it.each(["draft", "archived", "unknown"])("does not cache or return %s poll details", async (status) => {
    mocks.poll.mockResolvedValue(poll("private", status));
    await expect(getPublicPollResults("private")).rejects.toMatchObject({ status: 404 });
    expect(mocks.candidates).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing poll without loading its candidates", async () => {
    mocks.poll.mockResolvedValue({ exists: false });
    await expect(getPublicPollResults("missing")).rejects.toMatchObject({ status: 404 });
    expect(mocks.candidates).not.toHaveBeenCalled();
  });

  it("allows a retry after a failed database fetch", async () => {
    mocks.poll.mockRejectedValueOnce(new Error("database unavailable"));
    await expect(getPublicPollResults("retry")).rejects.toThrow("database unavailable");
    expect((await getPublicPollResults("retry")).poll.id).toBe("retry");
  });

  it("keeps drafts and archived polls out of public lists and separates voting from results", async () => {
    mocks.polls.mockResolvedValue({ docs: [poll("draft", "draft"), poll("active"), poll("closed", "closed"), poll("archived", "archived")] });
    expect((await getPublicPolls(false)).map((value) => value.id)).toEqual(["active"]);
    expect((await getPublicPolls(true)).map((value) => value.id)).toEqual(["active", "closed"]);
  });

  it("expires a changed poll and shared lists immediately instead of serving stale admin changes", () => {
    invalidatePublicPolls("poll-a");
    expect(mocks.revalidate.mock.calls).toEqual([["public-polls", { expire: 0 }], ["public-poll:poll-a", { expire: 0 }]]);
  });
});
