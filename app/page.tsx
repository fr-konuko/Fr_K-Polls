import Image from "next/image";
import Link from "next/link";
import { CheckIcon, ChartIcon, LockIcon } from "@/components/Icons";
import { OpenPolls } from "@/components/OpenPolls";
import "./landing.css";

// A rounded, slanted silhouette keeps the background and wrist crop aligned.
const heroShape = "M.22 .11C.43 .035 .73 .015 .88 .105C.98 .165 .96 .36 .94 .53L.91 .8C.89 .95 .77 .99 .58 .975L.24 .95C.1 .94 .035 .83 .055 .66L.1 .3C.11 .21 .135 .145 .22 .11Z";

const steps = [
  { icon: <CheckIcon />, title: "Find your poll", copy: "Choose a conversation that matters to you. Review the candidates and take a moment to consider your choice." },
  { icon: <LockIcon />, title: "Make your choice", copy: "Sign in with Google, review your selection, and confirm your vote. One account, one vote for each position." },
  { icon: <ChartIcon />, title: "See the bigger picture", copy: "Explore the vote counts and percentages. Share the poll and invite your community into the conversation." },
];

export default function HomePage() {
  return (
    <main id="main-content" className="landing-page">
      <section className="shell landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">Research rooted in people</p>
          <h1 id="landing-title">Every <span className="landing-underlined">voice.</span><br />A clearer<br />perspective.</h1>
          <p className="landing-hero-description">Your community has something to say. Take part in a poll, explore the results, and help build a clearer picture of what matters.</p>
          <div className="landing-hero-actions">
            <Link className="button landing-primary" href="/vote">Explore the polls</Link>
            <a className="landing-how-link" href="#how-it-works"><span aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14m-5-5 5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg></span>How it works</a>
          </div>
          <p className="landing-hero-note"><CheckIcon />Open to everyone. Google sign-in to vote.</p>
        </div>
        <figure className="landing-phone">
          <div className="landing-phone-art">
            <svg className="landing-phone-backdrop" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true" focusable="false">
              <defs><clipPath id="survey-hero-wrist-clip" clipPathUnits="objectBoundingBox"><path transform="translate(.011385 .022185) scale(.9775)" d={heroShape} /></clipPath></defs>
              <path transform="scale(1000)" d={heroShape} />
            </svg>
            <div className="landing-phone-cutout">
              <Image src="/jr-africa-survey-phone-hand-angled.png" alt="A hand holding a phone at an angle, displaying a JR Africa community survey asking which local issue should be prioritised." width={1254} height={1254} sizes="(max-width: 740px) 110vw, (max-width: 1100px) 55vw, 640px" preload className="landing-phone-image" />
            </div>
          </div>
          <figcaption>Illustrative survey preview</figcaption>
        </figure>
      </section>

      <div className="shell">
        <div className="landing-access-strip" aria-label="Platform features">
          <p>Good conversations start<br /> <strong>with a little participation.</strong></p>
          <span><CheckIcon />Open to the public</span><span><LockIcon />Account-based voting</span><span><ChartIcon />Published results</span>
        </div>
      </div>

      <section className="shell landing-section landing-polls-section" id="open-polls" aria-labelledby="current-polls-title">
        <div className="landing-section-copy">
          <p className="landing-eyebrow">Have your say</p>
          <h2 id="current-polls-title">Be part of the<br />conversation.</h2>
          <p>Explore the polls currently accepting votes. Each one has its own ballot, direct voting link, and published results.</p>
          <Link className="landing-text-link" href="/vote">See all open polls <span aria-hidden="true">↗</span></Link>
        </div>
        <OpenPolls />
      </section>

      <section className="landing-process" id="how-it-works" aria-labelledby="process-title">
        <div className="shell landing-section">
          <header className="landing-section-heading"><p className="landing-eyebrow">Simple from the start</p><h2 id="process-title">Your perspective. Three easy steps.</h2><p>A clear path from the first question to the full result.</p></header>
          <div className="landing-step-grid">{steps.map((step, index) => (
            <article className="landing-step" key={step.title}>
              <div className="landing-step-top"><span className={"landing-step-icon landing-step-icon-" + index}>{step.icon}</span><span className="landing-step-number">{"0" + (index + 1)}</span></div>
              <h3>{step.title}</h3><p>{step.copy}</p>
            </article>
          ))}</div>
        </div>
      </section>

      <section className="shell landing-section landing-insight" aria-labelledby="insight-title">
        <div className="landing-section-copy"><p className="landing-eyebrow">More than a percentage</p><h2 id="insight-title">See the result.<br />Understand the context.</h2><p>Useful results show the whole picture: the poll, the positions, and the choices people made. Follow the live counts or keep a report for later.</p><p className="landing-method-note">These are voluntary opinion polls. Results reflect participating accounts, not necessarily the wider population or an official election outcome.</p></div>
        <div className="landing-resource-list">
          <Link className="landing-resource" href="/results"><span className="landing-resource-icon"><ChartIcon /></span><div><h3>Follow published results</h3><p>Vote counts, rounded percentages, and rankings for each position. Results refresh every 10 seconds.</p><span className="landing-resource-link">Explore results <span aria-hidden="true">↗</span></span></div></Link>
          <Link className="landing-resource" href="/reports"><span className="landing-resource-icon"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 3h7l4 4v14H6V3h1Zm7 0v5h4M9 12h6m-6 4h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></span><div><h3>A report you can keep</h3><p>Review each position in detail. Print the report or save it as a PDF straight from your browser.</p><span className="landing-resource-link">View poll reports <span aria-hidden="true">↗</span></span></div></Link>
        </div>
      </section>

      <section className="shell landing-section landing-faq" aria-labelledby="faq-title">
        <div className="landing-section-copy"><p className="landing-eyebrow">A few useful answers</p><h2 id="faq-title">Before you<br />take part.</h2><Link className="landing-text-link" href="/blog">Read the participation guide <span aria-hidden="true">↗</span></Link></div>
        <div className="landing-faq-list">
          <details><summary>Do I need an account to view a poll?</summary><p>No. Everyone can browse the website, candidates, results, and reports. You only need to sign in with Google when you want to submit a vote.</p></details>
          <details><summary>Can I change my vote after confirming?</summary><p>Recorded votes cannot be changed. You will review your candidate before confirming. You can still vote for other available positions.</p></details>
          <details><summary>Can I vote again on another device?</summary><p>Your selections are linked to your account. Signing in to the same account on another device does not reset them. The limit is one vote per account, per position, per poll.</p></details>
        </div>
      </section>

      <section className="shell landing-contact-wrap">
        <div className="landing-contact">
          <div><p className="landing-eyebrow">Let’s start a conversation</p><h2>Have a question for<br />your community?</h2><p>Tell us who you want to hear from and what you want to understand.</p></div>
          <Link className="button contact-cta" href="/contact">Let’s talk <span aria-hidden="true">↗</span></Link>
        </div>
      </section>
    </main>
  );
}
