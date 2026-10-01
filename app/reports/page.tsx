import type { Metadata } from "next";
import { ReportsClient } from "@/components/ReportsClient";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <main className="shell page app-page reports-page">
      <header className="page-masthead">
        <div>
          <span className="overline"><i /> Poll summaries</span>
          <h1>Reports for<br /><span>clear decisions.</span></h1>
          <p>Review poll results by position and print a shareable report.</p>
        </div>
        <div className="masthead-mark" aria-hidden="true">04</div>
      </header>
      <ReportsClient />
    </main>
  );
}