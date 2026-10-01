import type { Metadata } from "next";
import { VoteClient } from "@/components/VoteClient";

export const metadata: Metadata = { title: "Vote" };

export default function VotePage() {
  return (
    <main className="shell page app-page">
      <header className="page-masthead">
        <div>
          <span className="overline"><i /> Active ballots</span>
          <h1>Your voice,<br /><span>clearly expressed.</span></h1>
          <p>Choose one aspirant for every position available in the poll.</p>
        </div>
        <div className="masthead-mark" aria-hidden="true">01</div>
      </header>
      <aside className="context-note" aria-label="Poll disclaimer">
        <p>This is an opinion poll. Results are not official election results.</p>
      </aside>
      <VoteClient />
    </main>
  );
}
