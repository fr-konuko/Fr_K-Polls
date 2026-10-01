import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Frk Polls about polls, research, and partnerships.",
};

export default function ContactPage() {
  return (
    <main className="shell page app-page contact-page">
      <header className="page-masthead">
        <div>
          <span className="overline"><i /> Get in touch</span>
          <h1>Let’s talk about<br /><span>your next question.</span></h1>
          <p>Tell us what you’re working on. We’ll help you find a clear way to ask it.</p>
        </div>
        <div className="masthead-mark" aria-hidden="true">05</div>
      </header>

      <section className="contact-page-content" aria-labelledby="contact-intro-title">
        <div className="contact-page-copy">
          <span className="eyebrow">Start a conversation</span>
          <h2 id="contact-intro-title">What would you like to understand?</h2>
          <p>
            Share a little about your poll, research project, or community
            engagement idea. Include the context that will help us point you in
            the right direction.
          </p>
          <ul className="contact-topics" aria-label="Topics we can discuss">
            <li>Planning a poll or survey</li>
            <li>Understanding results and reporting</li>
            <li>Research or partnership enquiries</li>
          </ul>
        </div>
        <ContactForm />
      </section>
    </main>
  );
}