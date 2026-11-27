import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/PageIntro";

export const metadata: Metadata = { title: "Polling guide", description: "How to participate in JR Africa and interpret the results." };

const guides = [
  { title: "How do I vote?", text: "Open the Vote page or follow a direct poll link. Choose a candidate and sign in with Google when prompted. You will return to the same poll to review and confirm your choice. Signing in alone never submits a vote. Recorded selections stay linked to your account across devices.", link: "/vote", label: "Find an open poll" },
  { title: "Can I change a recorded vote?", text: "Recorded selections cannot be changed in this platform. Review the candidate’s name and position in the confirmation before submitting. You can still vote for other positions in the poll." },
  { title: "How is repeat voting limited?", text: "The server permits one vote per Firebase account for each position in a poll. Clearing cookies or changing devices does not reset your selections when you sign in to the same account. A person may hold several Google accounts, so this is not proof of one vote per person. Older anonymous votes remain in the totals but cannot reliably be linked to an account." },
  { title: "Is my account shown in the results?", text: "Your name and email are not displayed in public poll results or reports. Your Google identity is used by the server to check your voting eligibility for each position. Account-based voting is not a promise of anonymous voting to the platform operator." },
  { title: "What do the percentages mean?", text: "Each percentage is the candidate’s share of all votes recorded for that position. Percentages are rounded to whole numbers, so they may not add to exactly 100%. A poll with several positions counts selections separately for each position.", link: "/results", label: "Explore results" },
  { title: "Are the results representative?", text: "These are voluntary, open opinion polls. They describe the people who chose to participate, not necessarily the wider population. They should not be interpreted as official election results or a forecast." },
  { title: "How do I share a poll or save a report?", text: "Use Share poll below the candidates to copy the direct voting link or choose a sharing app. On Reports, select a poll and use Print or save as PDF to create a reference copy.", link: "/reports", label: "Open poll reports" },
];

export default function BlogPage() {
  return (
    <main id="main-content" className="shell page">
      <PageIntro section="Resources" title="A guide to taking part" description="Practical answers about voting, sharing a poll, and understanding what the results can tell you." />
      <div className="guide-layout">
        <aside className="guide-aside"><h2>In this guide</h2><nav aria-label="Guide sections">{guides.map((guide, index) => <a key={guide.title} href={"#guide-" + index}>{guide.title}</a>)}</nav><p>Need help with something else?</p><Link href="/contact">Contact the team</Link></aside>
        <div className="guide-articles">{guides.map((guide, index) => (
          <article id={"guide-" + index} key={guide.title}><p className="eyebrow">{"0" + (index + 1)}</p><h2>{guide.title}</h2><p>{guide.text}</p>{guide.link && <Link href={guide.link}>{guide.label}</Link>}</article>
        ))}</div>
      </div>
    </main>
  );
}
