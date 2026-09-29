export type Position =
  | "President"
  | "Governor"
  | "Senator"
  | "Women Rep"
  | "Member of Parliament"
  | "MCA";

export const POSITION_ORDER: Position[] = [
  "President",
  "Governor",
  "Senator",
  "Women Rep",
  "Member of Parliament",
  "MCA"
];

export interface Poll {
  id: string;
  name: string;
  description?: string;
  status: "active" | "closed";
  createdAt?: any;
  closedAt?: any;
}

export interface Aspirant {
  id: string;
  pollId: string;
  name: string;
  position: Position;
  imageUrl?: string;
  votes: number;
  createdAt?: any;
}

export interface VoteRecord {
  id?: string;
  pollId: string;
  position: Position;
  aspirantId: string;
  browserToken: string;
  createdAt?: any;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  service: string;
  message: string;
  status: "new" | "read";
  source?: string;
  createdAt?: any;
}

export interface PollResultsSummary {
  poll: Poll;
  totalVotes: number;
  totalAspirants: number;
  leadingAspirant?: Aspirant;
  positions: {
    position: Position;
    totalVotes: number;
    aspirants: (Aspirant & { percentage: number; rank: number })[];
  }[];
}
