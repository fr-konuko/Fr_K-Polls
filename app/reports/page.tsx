import type { Metadata } from "next";
import { ReportsClient } from "@/components/ReportsClient";
import { PageIntro } from "@/components/PageIntro";

export const metadata: Metadata = { title: "Reports" };

export default function Page() {
  return (
    <main id="main-content" className="shell page reports-page">
      <PageIntro section="Publications" title="Poll reports" description="A detailed record of each published poll. Review the numbers, then print or save a PDF for reference." />

      <ReportsClient />
    </main>
  );
}
