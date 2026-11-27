import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";
import { getAdminDb } from "@/lib/firebase/admin";
import { HttpError } from "@/lib/http";
import { serializeAspirant, serializePoll } from "@/lib/serialize";
import type { Poll, PollResults } from "@/lib/types";

const PUBLIC_POLLS_TAG = "public-polls";
const project = process.env.FIREBASE_PROJECT_ID ?? "default";
const resultTag = (pollId: string) => `public-poll:${pollId}`;
const pendingResults = new Map<string, Promise<PollResults>>();
let pendingPolls: Promise<Poll[]> | undefined;

// Next's Data Cache is shared across requests and Vercel function instances.
// Keep cookies, account details, and vote submission out of these functions.
const readPublicPolls = unstable_cache(async () => {
  if (pendingPolls) return pendingPolls;
  pendingPolls = (async () => {
    const snapshot = await getAdminDb().collection("polls").orderBy("createdAt", "desc").limit(100).get();
    return snapshot.docs.map(serializePoll).filter((poll) => poll.status === "active" || poll.status === "closed");
  })();
  try { return await pendingPolls; }
  finally { pendingPolls = undefined; }
}, ["public-polls-v1", project], { revalidate: 10, tags: [PUBLIC_POLLS_TAG] });

export async function getPublicPolls(includeClosed: boolean) {
  const polls = await readPublicPolls();
  return includeClosed ? polls : polls.filter((poll) => poll.status === "active");
}

async function readPublicPollResults(pollId: string) {
  const pending = pendingResults.get(pollId);
  if (pending) return pending;
  const result = (async () => {
    const db = getAdminDb();
    const pollDocument = await db.collection("polls").doc(pollId).get();
    if (!pollDocument.exists) throw new HttpError(404, "Poll not found.");
    const poll = serializePoll(pollDocument);
    if (poll.status !== "active" && poll.status !== "closed") throw new HttpError(404, "Poll not found.");
    const aspirants = await db.collection("aspirants").where("pollId", "==", pollId).limit(500).get();
    return { poll, aspirants: aspirants.docs.map(serializeAspirant) };
  })();
  // Collapse cold requests and background refreshes within an instance.
  pendingResults.set(pollId, result);
  try { return await result; }
  finally { if (pendingResults.get(pollId) === result) pendingResults.delete(pollId); }
}

export async function getPublicPollResults(pollId: string) {
  // Bind the poll to both the cache key and tag, so polls never share totals.
  return unstable_cache(async () => readPublicPollResults(pollId),
    ["public-poll-results-v1", project, pollId], { revalidate: 10, tags: [resultTag(pollId)] })();
}

export function invalidatePublicPolls(pollId?: string) {
  // Publication, closure, and deletion must expire public data immediately.
  revalidateTag(PUBLIC_POLLS_TAG, { expire: 0 });
  if (pollId) revalidateTag(resultTag(pollId), { expire: 0 });
}
