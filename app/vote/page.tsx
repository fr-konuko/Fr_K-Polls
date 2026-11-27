import type { Metadata } from "next";
import { VoteClient } from "@/components/VoteClient";
import { PageIntro } from "@/components/PageIntro";

export const metadata: Metadata = { title: "Vote" };

export default function Page() {
  return (
    <main id="main-content" className="shell page app-page">
      <PageIntro section="Public polls" title="Make your choice" description="Choose an open poll, review the candidates, and confirm one selection for each position." />
      <aside className="context-note" aria-label="About these polls"><strong>Opinion polling</strong><p>Participation is voluntary. These results are not official election results.</p></aside>
      <VoteClient />
    </main>
  );
}
