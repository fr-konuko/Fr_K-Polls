import type { DocumentSnapshot, Timestamp } from "firebase-admin/firestore";
import type { Aspirant, Poll, PollStatus, Position } from "@/lib/types";

function iso(value: unknown): string | null {
  if (value && typeof (value as Timestamp).toDate === "function") {
    return (value as Timestamp).toDate().toISOString();
  }
  return null;
}

export function serializePoll(doc: DocumentSnapshot): Poll {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    name: String(data.name ?? "Untitled poll"),
    description: String(data.description ?? ""),
    status: (data.status ?? "active") as PollStatus,
    createdAt: iso(data.createdAt),
    closedAt: iso(data.closedAt),
  };
}

export function serializeAspirant(doc: DocumentSnapshot): Aspirant {
  const data = doc.data() ?? {};
  const rawVotes = Number(data.votes ?? 0);
  return {
    id: doc.id,
    pollId: String(data.pollId ?? ""),
    name: String(data.name ?? "Unnamed aspirant"),
    position: data.position as Position,
    imageUrl: /^https:\/\//i.test(String(data.imageUrl ?? ""))
      ? String(data.imageUrl)
      : "",
    votes: Number.isSafeInteger(rawVotes) && rawVotes >= 0 ? rawVotes : 0,
    createdAt: iso(data.createdAt),
  };
}
