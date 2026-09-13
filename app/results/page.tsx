import type { Metadata } from "next";
import { ResultsClient } from "@/components/ResultsClient";

export const metadata: Metadata = { title: "Results" };

export default function ResultsPage() {
  return (
    <main className="shell page app-page">
      <header className="page-masthead">
        <div>
          <span className="overline"><i /> Live signal</span>
          <h1>Results without<br /><span>the guesswork.</span></h1>
          <p>Follow totals, percentages, and rank within every position.</p>
        </div>
        <div className="masthead-mark" aria-hidden="true">02</div>
      </header>
      <ResultsClient />
    </main>
  );
}
