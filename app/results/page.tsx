import type { Metadata } from "next";
import { ResultsClient } from "@/components/ResultsClient";
import { PageIntro } from "@/components/PageIntro";

export const metadata: Metadata = { title: "Results" };

export default function Page() {
  return (
    <main id="main-content" className="shell page app-page">
      <PageIntro section="Published polls" title="Poll results" description="See the vote counts, compare candidates, and follow each position as votes are recorded." />

      <ResultsClient />
    </main>
  );
}
