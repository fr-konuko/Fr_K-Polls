export const POSITIONS = [
  "President",
  "Governor",
  "Senator",
  "Women Representative",
  "Member of Parliament",
  "MCA",
] as const;

export type Position = (typeof POSITIONS)[number];
export type PollStatus = "active" | "closed" | "archived";

export interface Poll {
  id: string;
  name: string;
  description: string;
  status: PollStatus;
  createdAt: string | null;
  closedAt?: string | null;
}

export interface Aspirant {
  id: string;
  pollId: string;
  name: string;
  position: Position;
  imageUrl: string;
  votes: number;
  createdAt: string | null;
}

export interface PollResults {
  poll: Poll;
  aspirants: Aspirant[];
}
