import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/ContactForm";
import { PageIntro } from "@/components/PageIntro";

export const metadata: Metadata = { title: "Contact", description: "Contact JR Africa about participation, results, and polling projects." };

export default function ContactPage() {
  return (
    <main id="main-content" className="shell page contact-page">
      <PageIntro section="Contact" title="How can we help?" description="Questions about a poll, a result, or a project? Send the team a message." />
      <section className="contact-page-content" aria-labelledby="contact-intro-title">
        <div className="contact-page-copy">
          <h2 id="contact-intro-title">Start with a little context</h2>
          <p>Include the poll name or link if your message is about a specific ballot. For a new project, tell us about your audience and what you want to understand.</p>
          <div className="contact-support-note"><h3>Looking for a quick answer?</h3><p>Our participation guide explains how votes are recorded, how sharing works, and how to read the results.</p><Link href="/blog">Read the polling guide</Link></div>
          <p className="muted">Please do not include passwords or private account credentials.</p>
        </div>
        <ContactForm />
      </section>
    </main>
  );
}
