import "server-only";

import { createHash } from "node:crypto";

export function ballotId(pollId: string, position: string, voterId: string) {
  return createHash("sha256")
    .update(`${pollId}:${position}:${voterId}`)
    .digest("hex");
}
