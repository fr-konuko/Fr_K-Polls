import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/PageIntro";
import { ChartIcon, CheckIcon, LockIcon } from "@/components/Icons";

export const metadata: Metadata = { title: "Platform & services" };

export default function ServicesPage() {
  return (
    <main id="main-content" className="shell page">
      <PageIntro section="Platform & services" title="A straightforward way to hear from people" description="Public opinion polls, clear results, and reports you can share. Explore what is available on JR Africa." />
      <div className="feature-grid services-grid">
        <article><span className="feature-icon"><CheckIcon /></span><h2>Public opinion polls</h2><p>Participants sign in with Google, choose a candidate for each position, and confirm their vote. Recorded selections are available when they sign in on another device.</p><Link href="/vote">Explore open polls</Link></article>
        <article><span className="feature-icon"><ChartIcon /></span><h2>Results & reporting</h2><p>See candidate rankings, vote counts, and percentage shares. Print a poll report or save it as a PDF using your browser.</p><Link href="/reports">Explore reports</Link></article>
        <article><span className="feature-icon"><LockIcon /></span><h2>Managed publication</h2><p>Poll administrators prepare draft ballots, add candidates, publish polls, and close voting from a protected workspace.</p><Link href="/contact">Discuss your project</Link></article>
      </div>
      <section className="split-section">
        <div><p className="eyebrow">Before you begin</p><h2>The right context for every result</h2><p>Open participation makes it easy to hear from a community. It does not establish a representative sample or verify a participant’s eligibility.</p></div>
        <div className="method-note"><h3>How participation works</h3><ul><li>Anyone can browse polls, results, and reports</li><li>A verified Google sign-in is required to submit a vote</li><li>One vote per account, per position, per poll</li><li>Multiple Google accounts can still belong to one person</li><li>Polls are for opinion gathering, not official elections</li></ul><Link href="/blog">Read the participation guide</Link></div>
      </section>
      <section className="home-contact"><div><h2>Have a polling project in mind?</h2><p>Tell us your audience, the question, and what you want to learn.</p></div><Link className="button contact-cta" href="/contact">Let’s talk <span aria-hidden="true">↗</span></Link></section>
    </main>
  );
}
