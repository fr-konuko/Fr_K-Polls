export const POSITIONS = [
  "President",
  "Governor",
  "Senator",
  "Women Representative",
  "Member of Parliament",
  "MCA",
] as const;

export type Position = (typeof POSITIONS)[number];
export type PollStatus = "draft" | "active" | "closed" | "archived";

export interface Poll {
  id: string;
  name: string;
  description: string;
  position?: Position;
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
